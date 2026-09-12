-- =============================================================================
-- Refactor — rôles multiples par profil (profile_roles) + rôles adherent/donateur
--
-- profiles.role (une seule valeur) devient public.profile_roles (plusieurs
-- lignes possibles par profil) : une personne peut cumuler Manager + Cuisinier
-- + Maraudeur, etc. Tout nouveau compte reçoit automatiquement le rôle
-- 'adherent' à l'inscription (parcours progressif : un Admin ajoute ensuite
-- les rôles supplémentaires via /dashboard/comptes au fil de la validation).
--
-- Remplace la fonction current_user_role() (une valeur) par
-- current_user_has_role(role) (test d'appartenance), utilisée par toutes les
-- policies RLS et triggers basés sur le rôle depuis l'Étape 2.
-- =============================================================================

-- --- Table profile_roles ------------------------------------------------------

create table public.profile_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.user_role not null,
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role)
);

comment on table public.profile_roles is
  'Rôles cumulables par profil (remplace profiles.role, une seule valeur).
  Une personne peut être Manager + Cuisinier en même temps, par exemple. Tout
  nouveau compte reçoit ''adherent'' automatiquement à l''inscription (trigger
  handle_new_user) ; les rôles supplémentaires sont ajoutés par un Admin via
  /dashboard/comptes au fil du parcours du bénévole.';

alter table public.profile_roles enable row level security;

-- Reprise des données existantes (profiles.role, une valeur par profil).
insert into public.profile_roles (profile_id, role)
select id, role from public.profiles where role is not null
on conflict do nothing;

-- --- Fonction helper (security definer) --------------------------------------
-- Remplace current_user_role() (une seule valeur, ne peut plus représenter un
-- profil à plusieurs rôles). Même principe anti-récursion que
-- current_user_role() à l'Étape 2 : security definer, contourne RLS sur
-- profile_roles pour éviter toute boucle avec les policies de cette table.

create function public.current_user_has_role(check_role public.user_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role = check_role
  );
$$;

revoke all on function public.current_user_has_role(public.user_role) from public;
grant execute on function public.current_user_has_role(public.user_role) to authenticated;

-- --- Policies RLS : profile_roles ----------------------------------------------
-- Chacun voit ses propres rôles ; Admin voit tout. Seul Admin (ou service_role,
-- qui contourne RLS de toute façon) peut ajouter/retirer un rôle — empêche
-- l'auto-promotion, même principe que protect_profile_role_status avant lui,
-- mais porté nativement par RLS plutôt que par un trigger.

create policy profile_roles_select_own_or_admin
on public.profile_roles
for select
to authenticated
using (profile_id = auth.uid() or public.current_user_has_role('admin'));

create policy profile_roles_insert_admin
on public.profile_roles
for insert
to authenticated
with check (public.current_user_has_role('admin'));

create policy profile_roles_delete_admin
on public.profile_roles
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- --- handle_new_user : ajoute le rôle 'adherent' par défaut ---------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.profile_roles (profile_id, role)
  values (new.id, 'adherent');

  return new;
end;
$$;

-- --- protect_profile_role_status : ne protège plus que status ------------------
-- role n'existe plus sur profiles (colonne supprimée plus bas) ; sa protection
-- est maintenant assurée nativement par les policies profile_roles ci-dessus
-- (insert/delete réservés à Admin/service_role).

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
  return new;
end;
$$;

-- --- check_maraude_manager_role : lit profile_roles plutôt que profiles.role ----

create or replace function public.check_maraude_manager_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profile_roles
    where profile_id = new.manager_id and role = 'manager'
  ) then
    raise exception 'manager_id doit désigner un profil Manager.';
  end if;
  return new;
end;
$$;

-- --- check_repas_cuisinier_role : idem pour le rôle Cuisinier -------------------

create or replace function public.check_repas_cuisinier_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profile_roles
    where profile_id = new.cuisinier_id and role = 'cuisinier'
  ) then
    raise exception 'cuisinier_id doit désigner un profil Cuisinier.';
  end if;
  return new;
end;
$$;

-- --- Policies RLS existantes : current_user_role() -> current_user_has_role() --
-- Remplacement mécanique, aucun changement de logique d'accès par ailleurs.

-- profiles
drop policy profiles_select_admin_manager on public.profiles;
create policy profiles_select_admin_manager
on public.profiles
for select
to authenticated
using (public.current_user_has_role('admin') or public.current_user_has_role('manager'));

-- maraudes
drop policy maraudes_insert_admin_manager on public.maraudes;
create policy maraudes_insert_admin_manager
on public.maraudes
for insert
to authenticated
with check (public.current_user_has_role('admin') or public.current_user_has_role('manager'));

drop policy maraudes_update_admin_or_own_manager on public.maraudes;
create policy maraudes_update_admin_or_own_manager
on public.maraudes
for update
to authenticated
using (
  public.current_user_has_role('admin')
  or (public.current_user_has_role('manager') and manager_id = auth.uid())
)
with check (
  public.current_user_has_role('admin')
  or (public.current_user_has_role('manager') and manager_id = auth.uid())
);

drop policy maraudes_delete_admin on public.maraudes;
create policy maraudes_delete_admin
on public.maraudes
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- inscriptions_maraude
drop policy inscriptions_insert_self_or_admin_manager on public.inscriptions_maraude;
create policy inscriptions_insert_self_or_admin_manager
on public.inscriptions_maraude
for insert
to authenticated
with check (
  public.current_user_status() = 'actif'
  and (
    user_id = auth.uid()
    or public.current_user_has_role('admin')
    or public.current_user_has_role('manager')
  )
);

drop policy inscriptions_update_admin_manager on public.inscriptions_maraude;
create policy inscriptions_update_admin_manager
on public.inscriptions_maraude
for update
to authenticated
using (public.current_user_has_role('admin') or public.current_user_has_role('manager'))
with check (public.current_user_has_role('admin') or public.current_user_has_role('manager'));

-- meteo_benevole_saisies
drop policy meteo_admin_or_own_manager_select on public.meteo_benevole_saisies;
create policy meteo_admin_or_own_manager_select
on public.meteo_benevole_saisies
for select
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
);

drop policy meteo_insert_self_or_admin_manager on public.meteo_benevole_saisies;
create policy meteo_insert_self_or_admin_manager
on public.meteo_benevole_saisies
for insert
to authenticated
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
  or (user_id = auth.uid() and public.current_user_status() = 'actif')
);

drop policy meteo_admin_or_own_manager_update on public.meteo_benevole_saisies;
create policy meteo_admin_or_own_manager_update
on public.meteo_benevole_saisies
for update
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
)
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = meteo_benevole_saisies.maraude_id and m.manager_id = auth.uid()
  )
);

drop policy meteo_admin_delete on public.meteo_benevole_saisies;
create policy meteo_admin_delete
on public.meteo_benevole_saisies
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- repas
drop policy repas_insert_self_or_admin_manager on public.repas;
create policy repas_insert_self_or_admin_manager
on public.repas
for insert
to authenticated
with check (
  public.current_user_status() = 'actif'
  and (
    cuisinier_id = auth.uid()
    or public.current_user_has_role('admin')
    or public.current_user_has_role('manager')
  )
);

drop policy repas_update_self_or_admin_manager on public.repas;
create policy repas_update_self_or_admin_manager
on public.repas
for update
to authenticated
using (
  cuisinier_id = auth.uid()
  or public.current_user_has_role('admin')
  or public.current_user_has_role('manager')
)
with check (
  cuisinier_id = auth.uid()
  or public.current_user_has_role('admin')
  or public.current_user_has_role('manager')
);

drop policy repas_delete_admin on public.repas;
create policy repas_delete_admin
on public.repas
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- tickets_depense
drop policy tickets_select_own_or_admin on public.tickets_depense;
create policy tickets_select_own_or_admin
on public.tickets_depense
for select
to authenticated
using (user_id = auth.uid() or public.current_user_has_role('admin'));

drop policy tickets_update_admin on public.tickets_depense;
create policy tickets_update_admin
on public.tickets_depense
for update
to authenticated
using (public.current_user_has_role('admin'))
with check (public.current_user_has_role('admin'));

drop policy tickets_delete_admin on public.tickets_depense;
create policy tickets_delete_admin
on public.tickets_depense
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- storage.objects (bucket tickets-depense)
drop policy tickets_depense_select_own_or_admin on storage.objects;
create policy tickets_depense_select_own_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tickets-depense'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_has_role('admin')
  )
);

drop policy tickets_depense_delete_admin on storage.objects;
create policy tickets_depense_delete_admin
on storage.objects
for delete
to authenticated
using (bucket_id = 'tickets-depense' and public.current_user_has_role('admin'));

-- points_passage
drop policy points_passage_select_admin_or_own_manager on public.points_passage;
create policy points_passage_select_admin_or_own_manager
on public.points_passage
for select
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
);

drop policy points_passage_insert_self_or_admin_manager on public.points_passage;
create policy points_passage_insert_self_or_admin_manager
on public.points_passage
for insert
to authenticated
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
  or (user_id = auth.uid() and public.current_user_status() = 'actif')
);

drop policy points_passage_update_admin_or_own_manager on public.points_passage;
create policy points_passage_update_admin_or_own_manager
on public.points_passage
for update
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
)
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = points_passage.maraude_id and m.manager_id = auth.uid()
  )
);

drop policy points_passage_delete_admin on public.points_passage;
create policy points_passage_delete_admin
on public.points_passage
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- --- Suppression de l'ancien modèle ---------------------------------------------

alter table public.profiles drop column role;
drop function public.current_user_role();
