-- =============================================================================
-- Fonction bureau (Président/Trésorier/Secrétaire) — champ cosmétique.
--
-- Décision (12/09) : PAS de rôle avec permissions distinctes pour ces 3
-- fonctions — aucune règle métier ne les différencie aujourd'hui (le
-- "Trésorier gère les tickets" est une habitude organisationnelle, pas une
-- règle à faire respecter par le système : n'importe quel Admin peut
-- traiter un ticket, y compris pour suppléer le Trésorier absent). Ajouter
-- 3 rôles RLS distincts pour zéro bénéfice fonctionnel aurait juste
-- multiplié les policies à maintenir (`current_user_has_role('admin')`
-- aurait dû devenir `(...'president') OR (...'tresorier') OR (...'secretaire')`
-- partout). Ce champ ne sert qu'à l'affichage (trombinoscope, etc.) — le
-- rôle `admin` (accès plein) reste inchangé pour les permissions. Si une
-- vraie règle apparaît un jour (ex. "seul le Trésorier valide un
-- remboursement > 200€"), on introduira un vrai rôle à ce moment-là.
-- =============================================================================

create type public.fonction_bureau as enum ('president', 'tresorier', 'secretaire');

alter table public.profiles
  add column fonction_bureau public.fonction_bureau;

comment on column public.profiles.fonction_bureau is
  'Purement informatif (affichage) — ne conditionne aucune policy RLS ni '
  'aucune permission. Voir le commentaire de tête de cette migration.';

-- Même garde-fou que pour status : modifiable seulement par un Admin (ou
-- service_role), jamais en self-service — sans quoi n'importe qui pourrait
-- se déclarer Président depuis son propre profil via profiles_update_own.
create or replace function public.protect_profile_role_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if (new.status is distinct from old.status)
     and not public.current_user_has_role('admin') then
    raise exception 'Seul un Admin peut modifier le statut d''un profil.';
  end if;

  if (new.fonction_bureau is distinct from old.fonction_bureau)
     and not public.current_user_has_role('admin') then
    raise exception 'Seul un Admin peut modifier la fonction bureau d''un profil.';
  end if;

  return new;
end;
$$;
