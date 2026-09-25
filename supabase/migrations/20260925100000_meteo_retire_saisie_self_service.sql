-- =============================================================================
-- Refonte Master-Detail /dashboard/maraudes (25/09) — la météo bénévole
-- n'est plus saisie en self-service par le bénévole concerné : elle est
-- désormais saisie par le Manager/Admin de la maraude pour toute l'équipe,
-- au même endroit (sous-onglet Équipe du panneau de détail). Retire la
-- clause qui autorisait le bénévole à écrire sa propre ligne à l'insertion
-- (migration d'origine 20260912130000_meteo_benevole.sql) — la policy
-- UPDATE n'a jamais autorisé le bénévole lui-même, seule l'INSERT le
-- permettait encore. Aucune autre policy touchée : lecture toujours
-- réservée à Admin + Manager de la maraude, jamais le bénévole concerné.
-- =============================================================================

drop policy meteo_insert_self_or_admin_manager on public.meteo_benevole_saisies;

create policy meteo_insert_admin_manager
on public.meteo_benevole_saisies
for insert
to authenticated
with check (
  (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
);
