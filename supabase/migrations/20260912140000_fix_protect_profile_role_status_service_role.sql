-- =============================================================================
-- Correctif — protect_profile_role_status bloquait le service_role
--
-- Le trigger (migration 20260910043205_init_profiles.sql) vérifie
-- `current_user_role() IS DISTINCT FROM 'admin'`, où current_user_role()
-- s'appuie sur auth.uid(). Avec la clé service_role (celle que la future
-- Server Action de validation des comptes — Étape 7 — doit utiliser, comme
-- prévu dans le commentaire de la migration d'origine), auth.uid() vaut NULL,
-- donc current_user_role() vaut NULL, et NULL IS DISTINCT FROM 'admin' vaut
-- VRAI : le trigger bloquerait alors même une Server Action légitime.
--
-- Correctif : bypass explicite quand la requête est exécutée avec le rôle
-- service_role (auth.role() = 'service_role', standard Supabase — ce rôle est
-- de toute façon déjà exempté de RLS, ce bypass ne fait qu'aligner ce trigger
-- de défense en profondeur sur le même niveau de confiance).
-- =============================================================================

create or replace function public.protect_profile_role_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'Seul un Admin peut modifier le rôle ou le statut d''un profil.';
  end if;
  return new;
end;
$$;
