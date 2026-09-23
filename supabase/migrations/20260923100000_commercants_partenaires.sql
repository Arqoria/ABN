-- =============================================================================
-- Répertoire de commerçants partenaires (23/09).
-- Retour client : suite à un don ponctuel enregistré via /dashboard/cuisine,
-- demande d'un répertoire de commerçants réutilisable plutôt que de
-- retaper le nom du donateur en texte libre à chaque fois.
--
-- dons_ponctuels.donateur (texte libre) N'EST PAS remplacé — commercant_id
-- s'ajoute à côté, nullable : un don ponctuel d'un donateur non répertorié
-- reste possible (option "Autre" dans le formulaire, texte libre conservé).
-- =============================================================================

create table public.commercants_partenaires (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  actif boolean not null default true,
  notes text,
  cree_par uuid not null references public.profiles (id),
  cree_le timestamptz not null default now()
);

comment on table public.commercants_partenaires is
  'Répertoire de commerçants/donateurs réguliers (dons ponctuels de repas/
  snacks). Jamais de suppression physique — un commerçant désactivé
  (actif=false) ne casse pas l''historique des dons déjà enregistrés à son
  nom, il disparaît seulement du menu déroulant pour un nouveau don.';

alter table public.commercants_partenaires enable row level security;

create function public.force_commercant_cree_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cree_par := auth.uid();
  return new;
end;
$$;

create trigger force_commercant_cree_par
  before insert on public.commercants_partenaires
  for each row execute function public.force_commercant_cree_par();

-- Lecture large (authenticated) : savoir quels commerçants existent n'est
-- pas sensible. Écriture (création + modification + désactivation)
-- réservée à l'Admin. Pas de policy/grant delete : suppression physique
-- impossible par construction, même principe que types_evenement.

create policy commercants_partenaires_select_authenticated
on public.commercants_partenaires
for select
to authenticated
using (true);

create policy commercants_partenaires_insert_admin
on public.commercants_partenaires
for insert
to authenticated
with check (
  (select public.current_user_has_role('admin'))
  and (select public.current_user_status()) = 'actif'
);

create policy commercants_partenaires_update_admin
on public.commercants_partenaires
for update
to authenticated
using ((select public.current_user_has_role('admin')))
with check ((select public.current_user_has_role('admin')));

grant select, insert, update on public.commercants_partenaires to authenticated;
grant select, insert, update on public.commercants_partenaires to service_role;

-- --- dons_ponctuels.commercant_id -----------------------------------------

alter table public.dons_ponctuels
  add column commercant_id uuid references public.commercants_partenaires (id);

create index dons_ponctuels_commercant_id_idx on public.dons_ponctuels (commercant_id);
