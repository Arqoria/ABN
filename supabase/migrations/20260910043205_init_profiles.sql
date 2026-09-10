-- =============================================================================
-- Étape 2 — Fondations BDD
-- Enums, table profiles, fonctions helper (security definer), policies RLS
-- de base, trigger d'auto-création de profil à l'inscription.
-- =============================================================================

-- --- Enums -------------------------------------------------------------------

create type public.user_role as enum ('admin', 'manager', 'maraudeur', 'cuisinier');

create type public.account_status as enum ('en_attente', 'actif', 'suspendu');

create type public.meteo_benevole as enum ('vert', 'jaune', 'rouge');

-- --- Table profiles ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role,
  status public.account_status not null default 'en_attente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil métier de chaque utilisateur Supabase Auth. Rôle assigné par un '
  'Admin lors de la validation du compte (status : en_attente -> actif). '
  'Voir docs/Specs.md.';

alter table public.profiles enable row level security;

-- --- Fonctions helper (security definer) --------------------------------------
-- Lisent profiles avec les privilèges du définisseur (contournent RLS),
-- pour permettre aux policies RLS de vérifier le rôle/statut de
-- l'utilisateur courant SANS sous-requête sur profiles à l'intérieur d'une
-- policy de profiles (ce qui provoquerait une récursion infinie).

create function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.current_user_status()
returns public.account_status
language sql
security definer
set search_path = public
stable
as $$
  select status from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

revoke all on function public.current_user_status() from public;
grant execute on function public.current_user_status() to authenticated;

-- --- Policies RLS de base -------------------------------------------------------

-- Chacun peut lire son propre profil.
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Chacun peut mettre à jour son propre profil (full_name, etc.) — le
-- trigger protect_profile_role_status ci-dessous empêche de modifier son
-- propre rôle/statut par ce biais.
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Admin et Manager peuvent lire tous les profils. Utilise la fonction
-- helper security definer — jamais de sous-requête directe sur profiles
-- ici (voir avertissement CLAUDE.md sur la récursion RLS).
create policy profiles_select_admin_manager
on public.profiles
for select
to authenticated
using (public.current_user_role() in ('admin', 'manager'));

-- --- Garde-fou : rôle/statut non modifiables en self-service --------------------
-- La policy profiles_update_own autorise la mise à jour de sa propre ligne,
-- mais RLS ne restreint pas les colonnes : sans ce trigger, n'importe quel
-- utilisateur authentifié pourrait s'auto-promouvoir admin via un simple
-- UPDATE. Le vrai flow de validation (Étape 4) passera par une Server
-- Action avec la clé service_role, qui contourne RLS — ce trigger reste
-- une protection en profondeur côté base.

create function public.protect_profile_role_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'Seul un Admin peut modifier le rôle ou le statut d''un profil.';
  end if;
  return new;
end;
$$;

create trigger protect_profile_role_status
  before update on public.profiles
  for each row execute function public.protect_profile_role_status();

-- --- Trigger handle_new_user -----------------------------------------------------
-- Auto-création du profil à l'inscription Supabase Auth. Statut initial
-- "en_attente" (défaut de la colonne) ; rôle laissé à null jusqu'à
-- validation manuelle par un Admin (Étape 4).

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
