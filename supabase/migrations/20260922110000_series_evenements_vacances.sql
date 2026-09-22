-- =============================================================================
-- Partie B — Récurrence + vacances scolaires (22/09).
-- series_evenements décrit une règle de récurrence ; le calcul des dates
-- concrètes (fréquence hebdomadaire/bimensuelle/nième-jour-du-mois, filtre
-- vacances scolaires) vit côté application (src/lib/recurrence.ts), pas en
-- SQL — trop de logique de calendrier pour rester lisible en PL/pgSQL, et
-- la même fonction doit être appelée à la fois par la génération immédiate
-- (création d'une série) et par la route cron quotidienne.
-- =============================================================================

create type public.frequence_serie as enum (
  'hebdomadaire',
  'toutes_les_2_semaines',
  'mensuelle_nieme_jour'
);

-- --- Table series_evenements ---------------------------------------------------

create table public.series_evenements (
  id uuid primary key default gen_random_uuid(),
  type_evenement_id uuid not null references public.types_evenement (id),
  frequence public.frequence_serie not null,
  -- Convention : 0=dimanche ... 6=samedi (Date.getUTCDay() en JS), pour
  -- correspondre directement au calcul côté application sans conversion.
  jour_semaine smallint not null check (jour_semaine between 0 and 6),
  -- Uniquement pertinent pour frequence='mensuelle_nieme_jour' : 1 à 4 pour
  -- la Nième occurrence du jour dans le mois, -1 pour "la dernière".
  nieme_semaine_du_mois smallint,
  heure time not null,
  -- NOT NULL, même contrainte que maraudes.manager_id (décision Chef de
  -- Produit, 22/09, après discussion sur la conflit avec le NOT NULL déjà
  -- en place) : voir check_serie_manager_role plus bas.
  manager_id_defaut uuid not null references public.profiles (id),
  max_participants_defaut integer not null default 6 check (max_participants_defaut > 0),
  horizon_generation_jours integer not null default 56 check (horizon_generation_jours > 0),
  date_debut date not null,
  date_fin date,
  limiter_aux_vacances_scolaires boolean not null default false,
  actif boolean not null default true,
  cree_par uuid not null references public.profiles (id),
  cree_le timestamptz not null default now(),
  constraint series_date_fin_apres_debut check (date_fin is null or date_fin >= date_debut),
  constraint series_nieme_semaine_coherent check (
    (frequence = 'mensuelle_nieme_jour' and nieme_semaine_du_mois in (1, 2, 3, 4, -1))
    or (frequence <> 'mensuelle_nieme_jour' and nieme_semaine_du_mois is null)
  )
);

comment on table public.series_evenements is
  'Règle de récurrence pour générer automatiquement des lignes maraudes.
  Deux séries peuvent cibler le même type_evenement_id pour cumuler deux
  fréquences (ex. "Maraude des enfants" : une série mensuelle toute l''année
  + une série hebdomadaire limitée aux vacances scolaires) — voir
  docs/Specs.md. Le calcul des dates concrètes vit dans
  src/lib/recurrence.ts, pas en base.';

alter table public.series_evenements enable row level security;

-- Même garde-fou que check_maraude_manager_role (migration 20260912120000),
-- dupliqué à l'identique plutôt que factorisé : convention déjà établie
-- dans ce projet (check_repas_cuisinier_role, check_affectation_maraude_qualification
-- suivent le même principe, une fonction par table plutôt qu'une fonction
-- générique paramétrée).
create function public.check_serie_manager_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profile_roles
    where profile_id = new.manager_id_defaut and role = 'manager'
  ) then
    raise exception 'manager_id_defaut doit désigner un profil Manager.';
  end if;
  return new;
end;
$$;

create trigger check_serie_manager_role
  before insert or update of manager_id_defaut on public.series_evenements
  for each row execute function public.check_serie_manager_role();

create function public.force_serie_cree_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cree_par := auth.uid();
  return new;
end;
$$;

create trigger force_serie_cree_par
  before insert on public.series_evenements
  for each row execute function public.force_serie_cree_par();

-- Lecture large (authenticated), écriture Admin. Pas de policy/grant delete :
-- une série se désactive (actif=false), elle ne se supprime jamais — la
-- génération future s'arrête, les occurrences déjà créées restent intactes.

create policy series_evenements_select_authenticated
on public.series_evenements
for select
to authenticated
using (true);

create policy series_evenements_insert_admin
on public.series_evenements
for insert
to authenticated
with check (
  (select public.current_user_has_role('admin'))
  and (select public.current_user_status()) = 'actif'
);

create policy series_evenements_update_admin
on public.series_evenements
for update
to authenticated
using ((select public.current_user_has_role('admin')))
with check ((select public.current_user_has_role('admin')));

grant select, insert, update on public.series_evenements to authenticated;
grant select, insert, update on public.series_evenements to service_role;

-- --- maraudes.serie_id -----------------------------------------------------
-- Nullable : null pour un événement ponctuel créé manuellement, renseigné
-- pour une occurrence générée automatiquement par une série.

alter table public.maraudes
  add column serie_id uuid references public.series_evenements (id);

create index maraudes_serie_id_idx on public.maraudes (serie_id);

-- --- Table vacances_scolaires ---------------------------------------------------
-- Zone B uniquement (académie de Nice) — l'association n'opère qu'à Nice,
-- pas de gestion multi-zone. Mise à jour manuelle annuelle nécessaire
-- (voir docs/Specs.md) : pas d'automatisation, les dates ne sont publiées
-- par le Ministère que peu à l'avance pour un cron fiable.

create table public.vacances_scolaires (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  date_debut date not null,
  date_fin date not null,
  constraint vacances_date_fin_apres_debut check (date_fin >= date_debut)
);

comment on table public.vacances_scolaires is
  'Périodes de vacances scolaires Zone B (académie de Nice). Alimente
  series_evenements.limiter_aux_vacances_scolaires. Mise à jour manuelle
  annuelle requise (voir docs/Specs.md) — dates réelles importées depuis
  data.education.gouv.fr (fichier ICS Zone B officiel), jamais inventées.';

alter table public.vacances_scolaires enable row level security;

create policy vacances_scolaires_select_authenticated
on public.vacances_scolaires
for select
to authenticated
using (true);

create policy vacances_scolaires_insert_admin
on public.vacances_scolaires
for insert
to authenticated
with check ((select public.current_user_has_role('admin')));

create policy vacances_scolaires_update_admin
on public.vacances_scolaires
for update
to authenticated
using ((select public.current_user_has_role('admin')))
with check ((select public.current_user_has_role('admin')));

create policy vacances_scolaires_delete_admin
on public.vacances_scolaires
for delete
to authenticated
using ((select public.current_user_has_role('admin')));

grant select, insert, update, delete on public.vacances_scolaires to authenticated;
grant select, insert, update, delete on public.vacances_scolaires to service_role;

-- --- Seed : dates réelles, calendrier officiel Zone B -------------------------
-- Source : https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-B.ics
-- (data.education.gouv.fr), récupéré et vérifié le 22/09/2026. date_fin
-- convertie depuis le DTEND ICS (exclusif, RFC 5545) vers une borne
-- inclusive (DTEND - 1 jour). Couvre les années scolaires 2026-2027 et
-- 2027-2028 (Été 2028 pas encore publié par le Ministère à cette date —
-- normal, voir docs/Specs.md sur la mise à jour annuelle).

insert into public.vacances_scolaires (nom, date_debut, date_fin) values
  ('Toussaint 2026', '2026-10-17', '2026-11-01'),
  ('Noël 2026-2027', '2026-12-19', '2027-01-03'),
  ('Hiver 2027', '2027-02-20', '2027-03-07'),
  ('Printemps 2027', '2027-04-17', '2027-05-02'),
  ('Été 2027', '2027-07-03', '2027-09-01'),
  ('Toussaint 2027', '2027-10-23', '2027-11-07'),
  ('Noël 2027-2028', '2027-12-18', '2028-01-02'),
  ('Hiver 2028', '2028-02-05', '2028-02-20'),
  ('Printemps 2028', '2028-04-08', '2028-04-23');
