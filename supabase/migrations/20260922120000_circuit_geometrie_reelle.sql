-- =============================================================================
-- Tracé réel (suivant les rues) sur circuits_planifies (22/09).
-- points (jsonb, existant) reste la liste ORDONNÉE des points cliqués par le
-- Manager — jamais remplacée, c'est la donnée éditable/source de vérité.
-- geometrie_reelle est un AJOUT à côté : la géométrie retournée par l'API
-- Directions d'OpenRouteService (profil foot-walking) pour ces mêmes points,
-- au format GeoJSON LineString — juste une couche d'affichage dérivée des
-- points, jamais éditée directement, recalculée à chaque enregistrement du
-- circuit (voir src/lib/actions/circuits.ts).
--
-- Nullable : reste NULL quand l'appel à l'API échoue (pas de connexion,
-- quota dépassé, points trop excentrés) ou quand ORS_API_KEY n'est pas
-- configurée — l'UI se replie alors sur l'ancien tracé à vol d'oiseau
-- (Polyline entre les points bruts), jamais d'écran cassé.
-- =============================================================================

alter table public.circuits_planifies
  add column geometrie_reelle jsonb;

comment on column public.circuits_planifies.geometrie_reelle is
  'Géométrie GeoJSON (LineString) du tracé réel suivant les rues, retournée
  par l''API Directions OpenRouteService (profil foot-walking) pour les
  points de la colonne points. NULL si l''appel API a échoué ou n''a pas
  encore été tenté — l''UI se replie alors sur une ligne droite entre les
  points. Recalculée à chaque enregistrement du circuit, jamais éditée
  directement.';
