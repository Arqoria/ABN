-- =============================================================================
-- Étape 10 — Formulaire public de recrutement bénévoles. Contrairement à
-- tout le reste du projet, cette table est écrite par des visiteurs NON
-- authentifiés (anon) — même principe de prudence que la vue
-- points_besoins_publics (migration 20260912270000) : ouvrir un accès public
-- doit rester strictement scopé (ici : uniquement insert, jamais select/
-- update/delete pour anon).
-- =============================================================================

create table public.candidatures_benevolat (
  id uuid primary key default gen_random_uuid(),
  nom_complet text not null,
  email text not null,
  telephone text,
  message text,
  traitee boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.candidatures_benevolat is
  'Candidatures spontanées soumises depuis le site vitrine public (formulaire '
  'sans authentification). Lecture réservée Admin — jamais de select/update/'
  'delete pour anon, uniquement insert.';

alter table public.candidatures_benevolat enable row level security;

-- INSERT ouvert à anon ET authenticated (un visiteur du site vitrine n'a
-- jamais de session, mais rien n'empêche un bénévole déjà connecté de
-- recommander quelqu'un depuis le même formulaire) — aucune restriction de
-- contenu ici, la validation de forme (email, longueur) reste côté Server
-- Action, la BDD ne garde que les NOT NULL essentiels.
create policy candidatures_benevolat_insert_public
on public.candidatures_benevolat
for insert
to anon, authenticated
with check (true);

-- SELECT/UPDATE/DELETE réservés à Admin (traitement des candidatures).
create policy candidatures_benevolat_select_admin
on public.candidatures_benevolat
for select
to authenticated
using (public.current_user_has_role('admin'));

create policy candidatures_benevolat_update_admin
on public.candidatures_benevolat
for update
to authenticated
using (public.current_user_has_role('admin'))
with check (public.current_user_has_role('admin'));

create policy candidatures_benevolat_delete_admin
on public.candidatures_benevolat
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- --- Grants ----------------------------------------------------------------
-- Rappel du piège déjà rencontré (migrations 20260912170000/171500) : RLS ne
-- sert à rien sans les GRANTs de base pour une table créée via migration.
grant insert on public.candidatures_benevolat to anon;
grant select, insert, update, delete on public.candidatures_benevolat to authenticated;
grant select, insert, update, delete on public.candidatures_benevolat to service_role;
