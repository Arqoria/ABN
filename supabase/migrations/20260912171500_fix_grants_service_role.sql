-- =============================================================================
-- Correctif — même trou que 20260912170000, pour service_role cette fois
--
-- service_role a l'attribut BYPASSRLS (contourne les policies RLS), mais ça
-- ne contourne PAS les GRANT Postgres de base : sans SELECT/INSERT/UPDATE/
-- DELETE explicites, service_role se prend aussi "permission denied" — ça
-- aurait cassé la Server Action validerCompte() (src/lib/actions/comptes.ts)
-- au premier essai réel, pour exactement la même raison que le correctif
-- précédent côté authenticated.
-- =============================================================================

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
