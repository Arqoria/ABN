-- =============================================================================
-- Correctif — GRANT manquants pour authenticated sur toutes les tables
--
-- Découvert en testant le flow Auth avec un vrai compte : RLS était bien
-- configuré sur toutes les tables depuis l'Étape 2, mais RLS ne sert à rien
-- sans le GRANT Postgres de base en dessous. `supabase db push` exécute les
-- migrations avec le rôle `postgres`, et les privilèges par défaut de CE rôle
-- sur le schéma `public` (pg_default_acl) excluent explicitement
-- SELECT/INSERT/UPDATE/DELETE pour anon/authenticated (seulement
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) — à l'inverse des tables créées via
-- le Dashboard Supabase (rôle supabase_admin), qui héritent de privilèges
-- par défaut complets. Résultat : "permission denied for table profiles" dès
-- le premier vrai accès authentifié, alors que tout semblait correct côté RLS.
--
-- Deux volets : rattraper les tables déjà créées, ET corriger les privilèges
-- par défaut pour que les tables des prochaines migrations (Étape 8+)
-- n'aient pas le même problème.
-- =============================================================================

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
