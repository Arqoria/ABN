-- =============================================================================
-- Étape 4 — Sécurité & suivi bénévoles (1/2 : table meteo_benevole_saisies)
-- L'enum public.meteo_benevole existe déjà (migration 20260910043205_init_profiles.sql).
--
-- Nommage : la table s'appelle meteo_benevole_saisies et non meteo_benevole —
-- ce dernier nom est déjà pris par l'enum, et Postgres crée implicitement un
-- type composite du même nom que chaque table (CREATE TABLE meteo_benevole
-- entrerait donc en conflit direct avec le type enum existant).
--
-- Choix de conception : la saisie peut venir soit du bénévole concerné
-- (auto-déclaration en fin de maraude), soit du Manager/Admin (observation).
-- En revanche la LECTURE reste strictement réservée à Admin + Manager de la
-- maraude concernée : le bénévole peut écrire sa propre ligne mais ne peut
-- jamais la relire ensuite, conforme à la règle métier "jamais visible par les
-- autres bénévoles, y compris le concerné lui-même dans l'UI standard"
-- (docs/Specs.md).
-- =============================================================================

create table public.meteo_benevole_saisies (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  valeur public.meteo_benevole not null,
  saisi_par uuid not null references public.profiles (id),
  saisi_le timestamptz not null default now(),
  unique (maraude_id, user_id)
);

comment on table public.meteo_benevole_saisies is
  'Suivi psychologique léger d''un bénévole sur une maraude donnée (vert/jaune/rouge, '
  'voir l''enum public.meteo_benevole). Saisie possible par le bénévole concerné '
  '(auto-déclaration) ou par un Manager/Admin (observation), mais LECTURE '
  'strictement limitée à Admin + Manager de la maraude concernée — jamais le '
  'bénévole concerné lui-même (voir docs/Specs.md). saisi_par est forcé côté '
  'serveur à l''utilisateur courant (trigger set_meteo_saisi_par), jamais '
  'accepté du client.';

create index meteo_benevole_saisies_maraude_id_idx
  on public.meteo_benevole_saisies (maraude_id);

alter table public.meteo_benevole_saisies enable row level security;

-- --- Garde-fous d'intégrité --------------------------------------------------

-- user_id doit être un participant réel de la maraude (une ligne dans
-- inscriptions_maraude, quel qu'en soit le statut) — pas exprimable en simple
-- CHECK (sous-requête sur une autre table), même principe que
-- check_maraude_manager_role.
create function public.check_meteo_user_participant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.inscriptions_maraude
    where maraude_id = new.maraude_id and user_id = new.user_id
  ) then
    raise exception 'user_id doit être inscrit à cette maraude.';
  end if;
  return new;
end;
$$;

create trigger check_meteo_user_participant
  before insert or update of maraude_id, user_id on public.meteo_benevole_saisies
  for each row execute function public.check_meteo_user_participant();

-- saisi_par n'est jamais une valeur fournie par le client : toujours l'auteur
-- réel de la requête, pour une traçabilité fiable.
create function public.set_meteo_saisi_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.saisi_par := auth.uid();
  return new;
end;
$$;

create trigger set_meteo_saisi_par
  before insert on public.meteo_benevole_saisies
  for each row execute function public.set_meteo_saisi_par();

-- --- Policies RLS --------------------------------------------------------------
-- LECTURE strictement réservée à Admin + Manager de LA maraude concernée —
-- le bénévole concerné n'a aucune policy select, donc aucun moyen de relire
-- sa propre ligne (conforme à la règle métier).
--
-- ÉCRITURE (insert) plus large : en plus d'Admin/Manager, le bénévole
-- concerné peut créer SA PROPRE ligne (auto-déclaration en fin de maraude),
-- à condition d'avoir un compte validé ('actif'). Il ne peut ni la relire
-- (pas de policy select) ni la modifier ensuite (pas de policy update pour
-- lui) — seul Admin/Manager peut corriger une saisie après coup.

create policy meteo_admin_or_own_manager_select
on public.meteo_benevole_saisies
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
);

create policy meteo_insert_self_or_admin_manager
on public.meteo_benevole_saisies
for insert
to authenticated
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
  or (user_id = auth.uid() and public.current_user_status() = 'actif')
);

create policy meteo_admin_or_own_manager_update
on public.meteo_benevole_saisies
for update
to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
)
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
);

create policy meteo_admin_delete
on public.meteo_benevole_saisies
for delete
to authenticated
using (public.current_user_role() = 'admin');
