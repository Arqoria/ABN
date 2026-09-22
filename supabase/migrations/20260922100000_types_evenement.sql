-- =============================================================================
-- Partie A — Types d'événements (généralisation de "maraude", 22/09).
-- Le nom de table `maraudes` NE CHANGE PAS (décision explicite du Chef de
-- Produit après état des lieux, voir docs/Tasks.md) : une "maraude" devient
-- simplement "un événement de tel type_evenement, de telle nature" plutôt
-- que d'être renommée. nature est un enum fixe à 2 valeurs, non éditable par
-- l'Admin (c'est le NOM du type qui est configurable, pas la nature) ;
-- types_evenement est la table réellement éditable (Admin), un type
-- référence toujours exactement une nature.
-- =============================================================================

create type public.nature_evenement as enum ('maraude', 'evenement_fixe');

-- --- Table types_evenement ---------------------------------------------------

create table public.types_evenement (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  nature public.nature_evenement not null,
  description text,
  actif boolean not null default true,
  -- Nullable : la ligne seed "Maraude classique" plus bas est créée par la
  -- migration elle-même, sans utilisateur authentifié (auth.uid() = null
  -- hors requête HTTP) — jamais de faux créateur attribué à un humain.
  -- Pour toute création réelle depuis l'app, le trigger ci-dessous force la
  -- valeur à auth.uid(), jamais une valeur cliente.
  cree_par uuid references public.profiles (id),
  cree_le timestamptz not null default now()
);

comment on table public.types_evenement is
  'Types d''événements configurables par l''Admin (ex. "Maraude classique",
  "Goûter"), chacun rattaché à une nature fixe (maraude | evenement_fixe).
  Jamais de suppression physique — désactivation via la colonne actif.';

alter table public.types_evenement enable row level security;

create function public.force_type_evenement_cree_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cree_par := auth.uid();
  return new;
end;
$$;

create trigger force_type_evenement_cree_par
  before insert on public.types_evenement
  for each row execute function public.force_type_evenement_cree_par();

-- Lecture large (authenticated) : savoir quels types existent n'est pas
-- sensible. Écriture (création + désactivation) réservée à l'Admin. Pas de
-- policy delete ni de grant delete : suppression physique impossible par
-- construction, pas seulement par convention UI.

create policy types_evenement_select_authenticated
on public.types_evenement
for select
to authenticated
using (true);

create policy types_evenement_insert_admin
on public.types_evenement
for insert
to authenticated
with check (
  (select public.current_user_has_role('admin'))
  and (select public.current_user_status()) = 'actif'
);

create policy types_evenement_update_admin
on public.types_evenement
for update
to authenticated
using ((select public.current_user_has_role('admin')))
with check ((select public.current_user_has_role('admin')));

grant select, insert, update on public.types_evenement to authenticated;
grant select, insert, update on public.types_evenement to service_role;

-- --- Seed : type par défaut pour toutes les maraudes existantes ---------------

insert into public.types_evenement (nom, nature, description)
values ('Maraude classique', 'maraude', 'Maraude hebdomadaire habituelle (vendredi 20h30).');

-- --- maraudes.type_evenement_id -----------------------------------------------
-- Ajout nullable, backfill vers "Maraude classique" pour les lignes
-- existantes, puis contrainte NOT NULL posée seulement après coup — jamais
-- de NOT NULL direct sur une table qui a déjà des lignes.

alter table public.maraudes
  add column type_evenement_id uuid references public.types_evenement (id);

update public.maraudes
set type_evenement_id = (select id from public.types_evenement where nom = 'Maraude classique')
where type_evenement_id is null;

alter table public.maraudes
  alter column type_evenement_id set not null;

create index maraudes_type_evenement_id_idx on public.maraudes (type_evenement_id);

-- --- maraudes.max_participants -------------------------------------------------
-- Remplace la limite "6" codée en dur dans set_inscription_statut (Étape 3).
-- Même principe backfill-puis-contrainte : les maraudes déjà existantes
-- gardent explicitement 6 (comportement inchangé), avant de figer NOT NULL.

alter table public.maraudes
  add column max_participants integer;

update public.maraudes
set max_participants = 6
where max_participants is null;

alter table public.maraudes
  alter column max_participants set not null,
  alter column max_participants set default 6;

alter table public.maraudes
  add constraint maraudes_max_participants_positive check (max_participants > 0);

-- set_inscription_statut lit maintenant maraudes.max_participants au lieu du
-- 6 codé en dur — seule la valeur lue change, la logique (comparaison stricte
-- avant liste d'attente, verrou FOR UPDATE) reste identique.
create or replace function public.set_inscription_statut()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  nb_inscrits int;
  capacite int;
begin
  select max_participants into capacite
  from public.maraudes
  where id = new.maraude_id
  for update;

  select count(*) into nb_inscrits
  from public.inscriptions_maraude
  where maraude_id = new.maraude_id and statut = 'inscrit';

  if nb_inscrits < capacite then
    new.statut := 'inscrit';
  else
    new.statut := 'liste_attente';
  end if;

  return new;
end;
$$;

-- --- Restriction structurelle : circuits_planifies réservé à nature='maraude' --
-- Seule table restreinte par nature (demande explicite) — points_passage et
-- toutes les autres tables (besoins_signales, meteo_benevole_saisies, repas,
-- tickets_depense, affectations_maraude, dons_ponctuels,
-- stock_materiel_mouvements, stock_denrees_mouvements) restent disponibles
-- pour toute nature, sans logique dupliquée nulle part ailleurs.

create function public.check_circuit_nature_maraude()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.maraudes m
    join public.types_evenement t on t.id = m.type_evenement_id
    where m.id = new.maraude_id and t.nature = 'evenement_fixe'
  ) then
    raise exception 'Un événement à point fixe ne peut pas avoir de circuit planifié.';
  end if;
  return new;
end;
$$;

create trigger check_circuit_nature_maraude
  before insert or update of maraude_id on public.circuits_planifies
  for each row execute function public.check_circuit_nature_maraude();
