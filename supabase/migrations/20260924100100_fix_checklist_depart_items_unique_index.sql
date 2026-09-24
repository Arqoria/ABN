-- =============================================================================
-- Correctif (24/09) : l'upsert PostgREST (ON CONFLICT (colonnes), sans
-- prédicat) ne peut pas cibler un index unique PARTIEL — Postgres exige un
-- ON CONFLICT (...) WHERE <même prédicat>, que PostgREST ne génère pas.
-- Reproduit et confirmé en local avant ce correctif (erreur 42P10 "there is
-- no unique or exclusion constraint matching the ON CONFLICT specification").
--
-- Remplacé par un index unique NON partiel — fonctionne quand même pour les
-- lignes source='libre' (reference_table/reference_id toujours NULL pour
-- elles) car Postgres ne considère jamais deux NULL comme égaux dans un
-- index unique : plusieurs lignes libres peuvent coexister sans collision,
-- seules les lignes stock/don (reference_table/reference_id toujours
-- renseignés) sont réellement dédupliquées.
-- =============================================================================

drop index public.checklist_depart_items_auto_unique_idx;

create unique index checklist_depart_items_auto_unique_idx
  on public.checklist_depart_items (maraude_id, source, reference_table, reference_id);
