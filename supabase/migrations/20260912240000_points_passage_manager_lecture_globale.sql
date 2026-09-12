-- =============================================================================
-- Retour utilisateur (12/09) : un Manager a besoin de voir l'historique
-- COMPLET (heatmap + compteurs), pas seulement ses propres maraudes, pour
-- s'appuyer dessus lors de la planification d'un circuit — revient sur le
-- scope initial de l'Étape 6 (migration 20260912160000_suivi_terrain.sql),
-- qui restreignait la lecture au Manager de LA maraude concernée. Trop
-- restrictif pour l'usage réel : un Manager qui planifie une nouvelle
-- maraude a besoin des zones repérées par TOUS les managers, pas juste les
-- siennes.
--
-- Toutes les données restées anonymisées (grille ~100m, aucune identité de
-- personne aidée) — élargir la LECTURE à tout Manager (rôle de confiance
-- interne, comme Admin) ne pose pas de problème de confidentialité
-- supplémentaire. L'ÉCRITURE (capture terrain, météo, circuit planifié...)
-- reste scopée à la maraude concernée par les autres policies, inchangées
-- ici — seule la lecture de points_passage (et donc de la vue
-- points_passage_geo qui en hérite via security_invoker) est élargie.
-- =============================================================================

drop policy points_passage_select_admin_or_own_manager on public.points_passage;

create policy points_passage_select_admin_or_manager
on public.points_passage
for select
to authenticated
using (
  public.current_user_has_role('admin')
  or public.current_user_has_role('manager')
);
