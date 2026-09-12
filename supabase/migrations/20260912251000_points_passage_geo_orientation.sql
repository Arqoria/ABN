-- =============================================================================
-- Ajoute orientation_vers/orientation_vers_autre à la vue points_passage_geo
-- (Étape 9) — nécessaire pour agréger les orientations par organisme dans
-- les rapports. `create or replace view` accepte d'ajouter des colonnes à la
-- fin sans casser la vue existante (mêmes colonnes existantes, même ordre).
-- =============================================================================

create or replace view public.points_passage_geo
with (security_invoker = true)
as
select
  id,
  maraude_id,
  user_id,
  type_action,
  compteur,
  horodatage,
  extensions.st_y(geo_arrondi::extensions.geometry) as lat,
  extensions.st_x(geo_arrondi::extensions.geometry) as lng,
  orientation_vers,
  orientation_vers_autre
from public.points_passage;
