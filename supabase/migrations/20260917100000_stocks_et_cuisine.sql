-- =============================================================================
-- Gestion des stocks (matériel) + Gestion des cuisines (denrées + dons
-- ponctuels) — retour client (17/09) : deux nouveaux domaines depuis
-- l'accueil, à côté de Gestion des adhérents/maraudes/Rapports & KPIs.
--
-- Trois tables, toutes en registre de MOUVEMENTS (jamais de colonne
-- "quantité actuelle" à maintenir à la main) — le stock courant se calcule
-- en sommant les mouvements, même principe que ne jamais stocker un solde
-- bancaire directement. Volume attendu faible (petite association), pas
-- besoin d'une vue matérialisée pour l'instant : agrégation client-side,
-- comme déjà fait pour les rapports (voir docs/Tasks.md).
--
-- Permissions : demande explicite du client d'ouvrir l'écriture à
-- Maraudeur (matériel) et Cuisinier (cuisine) en plus d'Admin/Manager,
-- MAIS présentée comme une initiative perso pas encore validée par
-- l'association ("je veux pouvoir revenir en arrière si c'est pas
-- validé"). Chaque policy d'écriture isole cette clause sur une seule
-- ligne (`or (select public.current_user_has_role('maraudeur'))` /
-- `'cuisinier'`) précisément pour qu'un futur retour en arrière soit une
-- migration d'une ligne par policy, pas un redesign.
-- =============================================================================

-- --- Table stock_materiel_mouvements ------------------------------------------
-- Réutilise categorie_besoin (couvertures, vetements_chauds, hygiene,
-- nourriture_specifique, autre) — mêmes catégories que les besoins
-- signalés, un besoin signalé devrait pouvoir se lire à la lumière du
-- stock réel.

create table public.stock_materiel_mouvements (
  id uuid primary key default gen_random_uuid(),
  categorie public.categorie_besoin not null,
  quantite integer not null check (quantite <> 0),
  motif text,
  maraude_id uuid references public.maraudes (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.stock_materiel_mouvements is
  'Registre des mouvements de stock matériel (couvertures, vêtements,
  hygiène...) : quantite positive = entrée (don reçu), négative = sortie
  (distribué). Le stock actuel par catégorie = somme des mouvements, jamais
  stocké directement. maraude_id optionnel : une sortie est souvent liée à
  une maraude précise, une entrée (don) pas toujours.';

create index stock_materiel_mouvements_categorie_idx on public.stock_materiel_mouvements (categorie);
create index stock_materiel_mouvements_maraude_id_idx on public.stock_materiel_mouvements (maraude_id);

alter table public.stock_materiel_mouvements enable row level security;

-- --- Table stock_denrees_mouvements -------------------------------------------
-- Contrairement au matériel, les denrées alimentaires ne rentrent pas dans
-- un nombre fixe de catégories (riz, conserves, eau...) : nom en texte
-- libre plutôt qu'un enum.

create table public.stock_denrees_mouvements (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  unite text,
  quantite integer not null check (quantite <> 0),
  motif text,
  maraude_id uuid references public.maraudes (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.stock_denrees_mouvements is
  'Registre des mouvements de stock de denrées alimentaires (riz, conserves,
  eau...) : même principe que stock_materiel_mouvements, mais nom en texte
  libre (pas de catégories fixes possibles pour de la nourriture). unite est
  informatif (ex. "kg", "L", "unités"), jamais utilisé pour un calcul.';

create index stock_denrees_mouvements_nom_idx on public.stock_denrees_mouvements (nom);
create index stock_denrees_mouvements_maraude_id_idx on public.stock_denrees_mouvements (maraude_id);

alter table public.stock_denrees_mouvements enable row level security;

-- --- Table dons_ponctuels ------------------------------------------------------
-- Distinct du stock de denrées : un journal de dons ponctuels (snacks/plats
-- offerts par un commerce ou un particulier POUR une maraude précise), pas
-- un inventaire. Objectif explicite du client : qu'un Cuisinier voie qu'un
-- don a déjà été fait pour sa maraude avant de préparer un repas en double
-- de son côté — maraude_id est donc obligatoire ici, contrairement aux
-- mouvements de stock.

create table public.dons_ponctuels (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  donateur text not null,
  description text not null,
  quantite integer,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.dons_ponctuels is
  'Journal des dons ponctuels de repas/snacks pour une maraude précise (un
  commerce ou un particulier offre à manger) — sert à éviter qu''un Cuisinier
  prépare un repas en double sans savoir qu''un don a déjà été fait pour
  cette maraude. quantite nullable : pas toujours un nombre pertinent
  ("plusieurs plateaux de pâtisseries").';

create index dons_ponctuels_maraude_id_idx on public.dons_ponctuels (maraude_id);

alter table public.dons_ponctuels enable row level security;

-- --- Garde-fous : created_by forcé côté serveur --------------------------------
-- Même principe que force_besoin_signale_user_id (jamais confiance dans une
-- valeur cliente pour "qui a fait cette saisie").

create function public.force_stock_materiel_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by := (select auth.uid());
  return new;
end;
$$;

create trigger force_stock_materiel_created_by
  before insert on public.stock_materiel_mouvements
  for each row execute function public.force_stock_materiel_created_by();

create function public.force_stock_denrees_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by := (select auth.uid());
  return new;
end;
$$;

create trigger force_stock_denrees_created_by
  before insert on public.stock_denrees_mouvements
  for each row execute function public.force_stock_denrees_created_by();

create function public.force_don_ponctuel_created_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_by := (select auth.uid());
  return new;
end;
$$;

create trigger force_don_ponctuel_created_by
  before insert on public.dons_ponctuels
  for each row execute function public.force_don_ponctuel_created_by();

-- --- Policies RLS : stock_materiel_mouvements ----------------------------------
-- LECTURE large (authentifié) : même raisonnement que repas_select_authenticated,
-- ce ne sont que des compteurs logistiques, rien de sensible sur des
-- personnes aidées. ÉCRITURE : Admin, Manager, ou Maraudeur (voir note
-- "réversibilité" en tête de fichier). Pas d'UPDATE : un mouvement est un
-- fait, on le corrige en ajoutant un mouvement inverse ou en le supprimant
-- (Admin), jamais en le réécrivant.

create policy stock_materiel_select_authenticated
on public.stock_materiel_mouvements
for select
to authenticated
using (true);

create policy stock_materiel_insert_admin_manager_maraudeur
on public.stock_materiel_mouvements
for insert
to authenticated
with check (
  (select public.current_user_status()) = 'actif'
  and (
    (select public.current_user_has_role('admin'))
    or (select public.current_user_has_role('manager'))
    or (select public.current_user_has_role('maraudeur'))
  )
);

create policy stock_materiel_delete_admin
on public.stock_materiel_mouvements
for delete
to authenticated
using ((select public.current_user_has_role('admin')));

-- --- Policies RLS : stock_denrees_mouvements -----------------------------------
-- Même structure, Cuisinier au lieu de Maraudeur.

create policy stock_denrees_select_authenticated
on public.stock_denrees_mouvements
for select
to authenticated
using (true);

create policy stock_denrees_insert_admin_manager_cuisinier
on public.stock_denrees_mouvements
for insert
to authenticated
with check (
  (select public.current_user_status()) = 'actif'
  and (
    (select public.current_user_has_role('admin'))
    or (select public.current_user_has_role('manager'))
    or (select public.current_user_has_role('cuisinier'))
  )
);

create policy stock_denrees_delete_admin
on public.stock_denrees_mouvements
for delete
to authenticated
using ((select public.current_user_has_role('admin')));

-- --- Policies RLS : dons_ponctuels ----------------------------------------------

create policy dons_ponctuels_select_authenticated
on public.dons_ponctuels
for select
to authenticated
using (true);

create policy dons_ponctuels_insert_admin_manager_cuisinier
on public.dons_ponctuels
for insert
to authenticated
with check (
  (select public.current_user_status()) = 'actif'
  and (
    (select public.current_user_has_role('admin'))
    or (select public.current_user_has_role('manager'))
    or (select public.current_user_has_role('cuisinier'))
  )
);

create policy dons_ponctuels_delete_admin
on public.dons_ponctuels
for delete
to authenticated
using ((select public.current_user_has_role('admin')));

-- --- Grants ----------------------------------------------------------------

grant select, insert, delete on public.stock_materiel_mouvements to authenticated;
grant select, insert, delete on public.stock_materiel_mouvements to service_role;

grant select, insert, delete on public.stock_denrees_mouvements to authenticated;
grant select, insert, delete on public.stock_denrees_mouvements to service_role;

grant select, insert, delete on public.dons_ponctuels to authenticated;
grant select, insert, delete on public.dons_ponctuels to service_role;
