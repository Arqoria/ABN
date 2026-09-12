-- =============================================================================
-- Étape 6 — Suivi terrain & cartographie (BDD)
-- La capture géoloc en un tap côté client (intégrée à la queue offline) reste
-- pour l'Étape 8, comme déjà noté dans docs/Tasks.md — rien à reporter ici,
-- ce point dépendait déjà explicitement de l'Étape 8 dans le backlog d'origine.
--
-- Anonymisation géographique : AUCUNE coordonnée GPS exacte n'est jamais
-- stockée. Le client peut envoyer n'importe quelle précision (y compris la
-- position GPS brute) dans geo_arrondi — le trigger force_geo_arrondi
-- ci-dessous réécrit systématiquement la valeur sur une grille ~100m avant
-- écriture, quel que soit le chemin d'insertion. Défense en profondeur, même
-- principe que saisi_par/statut d'inscription forcés côté serveur ailleurs
-- dans ce projet : on ne fait jamais confiance à une donnée "déjà nettoyée"
-- fournie par le client.
-- =============================================================================

create extension if not exists postgis with schema extensions;

create type public.type_action_terrain as enum (
  'repas_distribue',
  'personne_aidee',
  'orientation_sociale'
);

-- --- Fonction d'arrondi géographique (grille ~100m) ---------------------------
-- Projection en Lambert-93 (EPSG:2154, référentiel métrique officiel français,
-- précis sur tout le territoire — préférable à un Web Mercator générique pour
-- un projet 100% France) avant de caler sur une grille de 100m, puis retour en
-- WGS84 (EPSG:4326) pour le stockage géographique standard.
create function public.arrondir_position_100m(geom extensions.geometry)
returns extensions.geography
language sql
stable
set search_path = extensions, public
as $$
  select st_transform(
    st_snaptogrid(st_transform(geom, 2154), 100, 100),
    4326
  )::geography;
$$;

-- --- Table points_passage ----------------------------------------------------

create table public.points_passage (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  type_action public.type_action_terrain not null,
  compteur integer not null default 1 check (compteur > 0),
  geo_arrondi extensions.geography(Point, 4326) not null,
  horodatage timestamptz not null default now()
);

comment on table public.points_passage is
  'Point de passage capturé en un tap côté terrain (repas distribué, personne '
  'aidée, orientation sociale...). Alimente les compteurs agrégés, le tracé de '
  'circuit et la heatmap (Étape 9). geo_arrondi est TOUJOURS recalé sur une '
  'grille ~100m côté serveur (trigger force_geo_arrondi, fonction '
  'arrondir_position_100m) — jamais de position GPS exacte stockée, quelle que '
  'soit la précision envoyée par le client. compteur permet de représenter '
  'plusieurs unités en une seule capture (ex. 3 repas distribués d''un coup). '
  'Voir docs/Specs.md.';

create index points_passage_maraude_id_idx on public.points_passage (maraude_id);
create index points_passage_geo_arrondi_gix on public.points_passage using gist (geo_arrondi);

alter table public.points_passage enable row level security;

-- --- Garde-fous ----------------------------------------------------------------

-- user_id doit être un participant réel de la maraude — même principe que
-- check_meteo_user_participant.
create function public.check_points_passage_user_participant()
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

create trigger check_points_passage_user_participant
  before insert or update of maraude_id, user_id on public.points_passage
  for each row execute function public.check_points_passage_user_participant();

-- Anonymisation forcée : voir le commentaire en tête de fichier.
create function public.force_geo_arrondi()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.geo_arrondi := public.arrondir_position_100m(new.geo_arrondi::geometry);
  return new;
end;
$$;

create trigger force_geo_arrondi
  before insert or update of geo_arrondi on public.points_passage
  for each row execute function public.force_geo_arrondi();

-- --- Policies RLS --------------------------------------------------------------
-- ÉCRITURE : ouverte au participant qui capture (lui-même, compte actif) ou à
-- Admin/Manager — indispensable pour la capture en un tap sur le terrain
-- (Étape 8). LECTURE : réservée à Admin/Manager de LA maraude concernée,
-- conforme à docs/Specs.md ("heatmap + circuits + compteurs détaillés
-- réservés à Admin/Manager, Maraudeur/Cuisinier n'ont pas besoin de cette
-- vue") — même bénévole qui capture ne relit pas la table ensuite.

create policy points_passage_select_admin_or_own_manager
on public.points_passage
for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
);

create policy points_passage_insert_self_or_admin_manager
on public.points_passage
for insert
to authenticated
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
  or (user_id = auth.uid() and public.current_user_status() = 'actif')
);

create policy points_passage_update_admin_or_own_manager
on public.points_passage
for update
to authenticated
using (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
)
with check (
  public.current_user_role() = 'admin'
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
);

create policy points_passage_delete_admin
on public.points_passage
for delete
to authenticated
using (public.current_user_role() = 'admin');
