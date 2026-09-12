-- =============================================================================
-- Étape 9 — Heatmap & tracé de circuit.
-- PostgREST expose geography en WKB hexadécimal brut, inexploitable côté
-- client sans lib de parsing dédiée. Cette vue extrait lat/lng en float
-- (ST_Y/ST_X) pour une consommation directe en JS (Leaflet attend [lat,lng]).
-- security_invoker = true (Postgres 15+) : la vue s'exécute avec les droits
-- de l'appelant, donc les policies RLS de points_passage s'appliquent
-- normalement — aucune donnée exposée que la table de base n'autoriserait
-- déjà (toujours réservé Admin/Manager-de-la-maraude, cf. migration
-- 20260912160000_suivi_terrain.sql).
-- =============================================================================

create view public.points_passage_geo
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
  extensions.st_x(geo_arrondi::extensions.geometry) as lng
from public.points_passage;

comment on view public.points_passage_geo is
  'Vue en lecture de points_passage avec lat/lng extraits (ST_Y/ST_X) pour '
  'la heatmap et le tracé de circuit — security_invoker : mêmes policies RLS '
  'que la table de base, jamais de position exacte au-delà de ce que '
  'geo_arrondi contient déjà (grille ~100m).';

grant select on public.points_passage_geo to authenticated;
