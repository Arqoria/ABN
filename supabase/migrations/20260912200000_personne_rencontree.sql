-- =============================================================================
-- Ajoute 'personne_rencontree' à l'enum type_action_terrain — distinct de
-- 'personne_aidee' (rencontrée ≠ systématiquement aidée). Migration séparée :
-- Postgres interdit d'utiliser une nouvelle valeur d'enum dans la
-- transaction qui l'ajoute.
-- =============================================================================

alter type public.type_action_terrain add value 'personne_rencontree';
