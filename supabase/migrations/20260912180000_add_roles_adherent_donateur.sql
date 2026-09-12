-- =============================================================================
-- Ajout des rôles adherent et donateur à l'enum user_role
--
-- Migration séparée du reste du refactor (20260912180500) : Postgres interdit
-- d'utiliser une nouvelle valeur d'enum dans la même transaction que celle qui
-- l'ajoute (ALTER TYPE ... ADD VALUE). Deux migrations = deux transactions.
-- =============================================================================

alter type public.user_role add value 'adherent';
alter type public.user_role add value 'donateur';
