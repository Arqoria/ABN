-- =============================================================================
-- Checklist de départ + présence confirmée + parcours réel (24/09) — trois
-- ajouts cadrés avec le Chef de Produit autour du moment du départ en
-- maraude. Voir docs/Tasks.md, section du même nom, pour le cadrage complet.
-- =============================================================================

-- =============================================================================
-- PARTIE A — Checklist de départ
-- =============================================================================

create type public.source_checklist_item as enum ('stock', 'don', 'libre');

create table public.checklist_depart_items (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  libelle text not null,
  source public.source_checklist_item not null,
  reference_table text,
  reference_id uuid,
  coche boolean not null default false,
  coche_par uuid references public.profiles (id),
  coche_le timestamptz,
  cree_par uuid not null references public.profiles (id),
  cree_le timestamptz not null default now()
);

comment on table public.checklist_depart_items is
  'Checklist avant départ d''une maraude. Deux origines auto-générées
  (source=''stock''/''don'', régénérées à chaque ouverture de la page via une
  fonction idempotente — voir genererChecklistDepart) et une origine libre
  (source=''libre'', ajoutée à la main par le Manager pour du matériel hors
  stock formel, ex. dons en nature apportés directement par un bénévole).
  reference_table/reference_id tracent l''origine pour les lignes
  stock/don : pour ''don'', reference_id est le vrai id de dons_ponctuels ;
  pour ''stock'', il n''existe pas de ligne unique représentant "le stock
  actuel d''une catégorie" (c''est une somme de mouvements), donc
  reference_id y est un UUID déterministe dérivé de
  (maraude_id, catégorie/denrée) — stable d''une régénération à l''autre,
  mais PAS une vraie clé étrangère vers stock_materiel_mouvements/
  stock_denrees_mouvements (aucune contrainte FK sur reference_id, la table
  d''origine varie). Sert uniquement à empêcher les doublons à la
  régénération (index unique ci-dessous).';

create index checklist_depart_items_maraude_id_idx on public.checklist_depart_items (maraude_id);

-- Empêche les doublons quand la checklist est régénérée (stock/don) : une
-- ligne ''libre'' n''est jamais concernée (predicate), le Manager peut en
-- ajouter autant qu''il veut sans collision.
create unique index checklist_depart_items_auto_unique_idx
  on public.checklist_depart_items (maraude_id, source, reference_table, reference_id)
  where source in ('stock', 'don');

alter table public.checklist_depart_items enable row level security;

-- --- Garde-fous ----------------------------------------------------------------

create function public.force_checklist_item_cree_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cree_par := auth.uid();
  return new;
end;
$$;

create trigger force_checklist_item_cree_par
  before insert on public.checklist_depart_items
  for each row execute function public.force_checklist_item_cree_par();

-- coche_par/coche_le forcés côté serveur, uniquement quand `coche` change
-- réellement de valeur dans l'UPDATE (jamais touchés par la régénération
-- stock/don, qui ne met à jour que `libelle`) — même principe que
-- force_circuit_planifie_meta.
create function public.force_checklist_item_coche_meta()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.coche is distinct from old.coche then
    new.coche_par := auth.uid();
    new.coche_le := case when new.coche then now() else null end;
  end if;
  return new;
end;
$$;

create trigger force_checklist_item_coche_meta
  before update of coche on public.checklist_depart_items
  for each row execute function public.force_checklist_item_coche_meta();

-- --- Policies RLS --------------------------------------------------------------
-- LECTURE : Admin, Manager de cette maraude, ou tout participant inscrit —
-- même population que circuits_planifies/equipe (l'équipe doit pouvoir
-- consulter ce qu'il reste à charger). ÉCRITURE (cocher/décocher, ajouter
-- une ligne libre, régénérer stock/don) : Manager de cette maraude, Admin,
-- OU tout bénévole affecté à cette maraude (affectations_maraude) — décision
-- explicite du Chef de Produit ("Manager ou tout bénévole affecté"), compte
-- actif requis pour tout le monde y compris Admin/Manager (même formulation
-- que dons_ponctuels_insert_admin_manager_cuisinier, la plus récente sur ce
-- point). SUPPRESSION : Admin ou Manager de cette maraude uniquement (corrige
-- une ligne libre ajoutée par erreur), pas ouverte aux simples affectés.

create policy checklist_depart_items_select_participant_or_admin_manager
on public.checklist_depart_items
for select
to authenticated
using (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = checklist_depart_items.maraude_id and m.manager_id = auth.uid()
  )
  or exists (
    select 1 from public.inscriptions_maraude i
    where i.maraude_id = checklist_depart_items.maraude_id
      and i.user_id = auth.uid()
      and i.statut = 'inscrit'
  )
);

create policy checklist_depart_items_insert_manager_ou_affecte
on public.checklist_depart_items
for insert
to authenticated
with check (
  (select public.current_user_status()) = 'actif'
  and (
    (select public.current_user_has_role('admin'))
    or exists (
      select 1 from public.maraudes m
      where m.id = checklist_depart_items.maraude_id and m.manager_id = auth.uid()
    )
    or exists (
      select 1 from public.affectations_maraude a
      where a.maraude_id = checklist_depart_items.maraude_id and a.user_id = auth.uid()
    )
  )
);

create policy checklist_depart_items_update_manager_ou_affecte
on public.checklist_depart_items
for update
to authenticated
using (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = checklist_depart_items.maraude_id and m.manager_id = auth.uid()
  )
  or exists (
    select 1 from public.affectations_maraude a
    where a.maraude_id = checklist_depart_items.maraude_id and a.user_id = auth.uid()
  )
)
with check (
  (select public.current_user_status()) = 'actif'
  and (
    (select public.current_user_has_role('admin'))
    or exists (
      select 1 from public.maraudes m
      where m.id = checklist_depart_items.maraude_id and m.manager_id = auth.uid()
    )
    or exists (
      select 1 from public.affectations_maraude a
      where a.maraude_id = checklist_depart_items.maraude_id and a.user_id = auth.uid()
    )
  )
);

create policy checklist_depart_items_delete_admin_ou_manager
on public.checklist_depart_items
for delete
to authenticated
using (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = checklist_depart_items.maraude_id and m.manager_id = auth.uid()
  )
);

grant select, insert, update, delete on public.checklist_depart_items to authenticated;
grant select, insert, update, delete on public.checklist_depart_items to service_role;

-- =============================================================================
-- PARTIE B — Présence confirmée
-- =============================================================================

alter table public.inscriptions_maraude
  add column presence_confirmee boolean not null default false,
  add column confirmee_par uuid references public.profiles (id),
  add column confirmee_le timestamptz;

comment on column public.inscriptions_maraude.presence_confirmee is
  'Présence réellement confirmée au départ (case cochée par le Manager),
  distincte de l''inscription elle-même. Le jour où une alerte d''effectif
  minimum sera construite (pas encore le cas), elle devra se recalculer sur
  cette colonne plutôt que sur le nombre d''inscrits — voir docs/Specs.md.';

-- confirmee_par/confirmee_le forcés côté serveur — même principe que
-- force_checklist_item_coche_meta ci-dessus. Aucune nouvelle policy RLS
-- nécessaire : inscriptions_update_admin_manager (migration
-- 20260912120000_maraudes_equipes.sql) autorise déjà tout Admin/Manager à
-- mettre à jour n'importe quelle colonne d'une inscription — l'écran dédié
-- restreint côté UI à "Manager de cette maraude ou Admin", cohérent avec le
-- reste du dashboard (ex. equipe-client.tsx), mais la policy sous-jacente
-- reste volontairement globale (déjà le cas avant ce chantier).
create function public.force_inscription_presence_meta()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.presence_confirmee is distinct from old.presence_confirmee then
    new.confirmee_par := auth.uid();
    new.confirmee_le := case when new.presence_confirmee then now() else null end;
  end if;
  return new;
end;
$$;

create trigger force_inscription_presence_meta
  before update of presence_confirmee on public.inscriptions_maraude
  for each row execute function public.force_inscription_presence_meta();

-- =============================================================================
-- PARTIE C — Parcours réel (chrono)
-- =============================================================================

create type public.statut_parcours_reel as enum ('en_cours', 'termine');

create table public.parcours_reels (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  demarre_par uuid not null references public.profiles (id),
  demarre_le timestamptz not null default now(),
  termine_le timestamptz,
  statut public.statut_parcours_reel not null default 'en_cours'
);

comment on table public.parcours_reels is
  'Un "chrono" démarré par le Manager au départ d''une maraude : capture la
  position en direct pendant la marche (distinct des points d''action
  ponctuels de points_passage), pour que la heatmap reflète le territoire
  réellement couvert. Un seul parcours "en_cours" à la fois par maraude
  (index unique partiel ci-dessous).';

create index parcours_reels_maraude_id_idx on public.parcours_reels (maraude_id);

create unique index parcours_reels_un_seul_en_cours_idx
  on public.parcours_reels (maraude_id)
  where statut = 'en_cours';

alter table public.parcours_reels enable row level security;

create table public.parcours_reels_points (
  id uuid primary key default gen_random_uuid(),
  parcours_reel_id uuid not null references public.parcours_reels (id) on delete cascade,
  geo_arrondi extensions.geography(Point, 4326) not null,
  horodatage timestamptz not null default now()
);

comment on table public.parcours_reels_points is
  'Points capturés en direct pendant un parcours réel (chrono), ~30s
  d''intervalle ou ~20m de déplacement côté client. Réutilise EXACTEMENT le
  même mécanisme d''anonymisation que points_passage (trigger
  force_geo_arrondi, fonction arrondir_position_100m, Étape 6) — jamais de
  position GPS exacte stockée, même trigger, aucun nouveau code d''arrondi.';

create index parcours_reels_points_parcours_reel_id_idx on public.parcours_reels_points (parcours_reel_id);
create index parcours_reels_points_geo_arrondi_gix on public.parcours_reels_points using gist (geo_arrondi);

alter table public.parcours_reels_points enable row level security;

-- --- Garde-fous ----------------------------------------------------------------

create function public.force_parcours_reel_demarre_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.demarre_par := auth.uid();
  return new;
end;
$$;

create trigger force_parcours_reel_demarre_par
  before insert on public.parcours_reels
  for each row execute function public.force_parcours_reel_demarre_par();

-- Réutilise TEL QUEL le trigger/la fonction force_geo_arrondi déjà créés
-- pour points_passage (migration 20260912160000_suivi_terrain.sql) — la
-- fonction opère génériquement sur NEW.geo_arrondi, aucune modification
-- nécessaire pour l'attacher à une deuxième table.
create trigger force_geo_arrondi
  before insert or update of geo_arrondi on public.parcours_reels_points
  for each row execute function public.force_geo_arrondi();

-- --- Vue géo (même principe que points_passage_geo) -----------------------------

create view public.parcours_reels_points_geo
with (security_invoker = true)
as
select
  id,
  parcours_reel_id,
  horodatage,
  extensions.st_y(geo_arrondi::extensions.geometry) as lat,
  extensions.st_x(geo_arrondi::extensions.geometry) as lng
from public.parcours_reels_points;

comment on view public.parcours_reels_points_geo is
  'Vue en lecture de parcours_reels_points avec lat/lng extraits — même
  principe que points_passage_geo. security_invoker : mêmes policies RLS que
  la table de base.';

grant select on public.parcours_reels_points_geo to authenticated;

-- --- Policies RLS : parcours_reels ----------------------------------------------
-- LECTURE : Admin, Manager de cette maraude, ou participant inscrit — même
-- population que circuits_planifies (l'équipe voit si un chrono est en
-- cours). ÉCRITURE (démarrer/terminer) : Admin ou Manager de cette maraude
-- uniquement, compte actif requis.

create policy parcours_reels_select_participant_or_admin_manager
on public.parcours_reels
for select
to authenticated
using (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = parcours_reels.maraude_id and m.manager_id = auth.uid()
  )
  or exists (
    select 1 from public.inscriptions_maraude i
    where i.maraude_id = parcours_reels.maraude_id
      and i.user_id = auth.uid()
      and i.statut = 'inscrit'
  )
);

create policy parcours_reels_insert_admin_ou_manager
on public.parcours_reels
for insert
to authenticated
with check (
  (select public.current_user_status()) = 'actif'
  and (
    (select public.current_user_has_role('admin'))
    or exists (
      select 1 from public.maraudes m
      where m.id = parcours_reels.maraude_id and m.manager_id = auth.uid()
    )
  )
);

create policy parcours_reels_update_admin_ou_manager
on public.parcours_reels
for update
to authenticated
using (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = parcours_reels.maraude_id and m.manager_id = auth.uid()
  )
)
with check (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = parcours_reels.maraude_id and m.manager_id = auth.uid()
  )
);

grant select, insert, update on public.parcours_reels to authenticated;
grant select, insert, update on public.parcours_reels to service_role;

-- --- Policies RLS : parcours_reels_points ----------------------------------------
-- LECTURE : Admin ou Manager (rôle global) — même population que
-- points_passage_select_admin_or_manager (migration 20260912240000), les
-- deux alimentent la même heatmap globale de backdrop. ÉCRITURE : Admin ou
-- Manager de LA maraude concernée, ET uniquement pendant qu'un parcours est
-- encore 'en_cours' (jamais d'ajout de point sur un chrono déjà terminé).

create policy parcours_reels_points_select_admin_manager
on public.parcours_reels_points
for select
to authenticated
using (
  (select public.current_user_has_role('admin'))
  or (select public.current_user_has_role('manager'))
);

create policy parcours_reels_points_insert_admin_ou_manager
on public.parcours_reels_points
for insert
to authenticated
with check (
  exists (
    select 1 from public.parcours_reels pr
    join public.maraudes m on m.id = pr.maraude_id
    where pr.id = parcours_reels_points.parcours_reel_id
      and pr.statut = 'en_cours'
      and (
        (select public.current_user_has_role('admin'))
        or m.manager_id = auth.uid()
      )
  )
);

grant select, insert on public.parcours_reels_points to authenticated;
grant select, insert on public.parcours_reels_points to service_role;
