-- =============================================================================
-- Affectations par maraude — retour utilisateur (12/09 soir, tranché le 13/09
-- matin) : on n'est "pas cuisinier à vie", la même personne peut cuisiner un
-- soir et faire la maraude un autre soir, voire cumuler les deux le même
-- soir. Le rôle global (profile_roles) reste le garde-fou de QUALIFICATION
-- (qui est autorisé à endosser une fonction, peu importe comment il l'a
-- obtenue — attribution manuelle par un Admin aujourd'hui, ou via une
-- mini-formation/quiz plus tard, sujet à part) ; cette nouvelle table ne
-- fait qu'enregistrer QUI FAIT QUOI CETTE MARAUDE PRÉCISE (planning/roster).
--
-- Coexiste avec l'existant, ne le remplace pas : maraudes.manager_id reste
-- tel quel (un Président/Trésorier qui dépanne comme manager d'une maraude
-- obtient déjà ça en cumulant aussi le rôle global Manager — pas besoin de
-- cette table pour ça), repas.cuisinier_id reste tel quel (traçabilité d'un
-- repas précis, différent de "qui est planifié cuisinier ce soir").
-- =============================================================================

create type public.fonction_maraude as enum ('cuisinier', 'maraudeur');

create table public.affectations_maraude (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  fonction public.fonction_maraude not null,
  assigned_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (maraude_id, user_id, fonction)
);

comment on table public.affectations_maraude is
  'Planning/roster : qui fait quoi sur une maraude précise (cuisinier et/ou '
  'maraudeur, cumul possible). Le rôle global (profile_roles) reste le '
  'garde-fou de qualification, vérifié par le trigger '
  'check_affectation_maraude_qualification ci-dessous — cette table ne fait '
  'qu''enregistrer l''affectation ponctuelle, jamais l''octroi du rôle '
  'lui-même. Coexiste avec maraudes.manager_id et repas.cuisinier_id, ne les '
  'remplace pas.';

create index affectations_maraude_maraude_id_idx on public.affectations_maraude (maraude_id);

alter table public.affectations_maraude enable row level security;

-- --- Garde-fous ----------------------------------------------------------------

-- assigned_by forcé côté serveur, même principe que saisi_par/granted_by
-- ailleurs dans ce projet.
create function public.force_affectation_assigned_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.assigned_by := auth.uid();
  return new;
end;
$$;

create trigger force_affectation_assigned_by
  before insert on public.affectations_maraude
  for each row execute function public.force_affectation_assigned_by();

-- Garde-fou de qualification (toujours vérifié, y compris pour Admin/Manager
-- — c'est le point central de la décision du 13/09 : seul un profil qui
-- détient déjà le rôle global correspondant peut être affecté à cette
-- fonction) + garde-fou d'inscription (doit être inscrit à la maraude, SAUF
-- Admin/Manager de la maraude qui peuvent planifier en avance — même
-- exemption que check_besoin_signale_user_participant).
create function public.check_affectation_maraude_qualification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profile_roles pr
    where pr.profile_id = new.user_id
      and pr.role = new.fonction::text::public.user_role
  ) then
    raise exception 'Ce profil ne détient pas le rôle % nécessaire pour cette affectation.', new.fonction;
  end if;

  if public.current_user_has_role('admin') then
    return new;
  end if;
  if exists (
    select 1 from public.maraudes m
    where m.id = new.maraude_id and m.manager_id = auth.uid()
  ) then
    return new;
  end if;
  if not exists (
    select 1 from public.inscriptions_maraude
    where maraude_id = new.maraude_id and user_id = new.user_id and statut = 'inscrit'
  ) then
    raise exception 'Ce profil doit être inscrit à cette maraude pour y être affecté.';
  end if;
  return new;
end;
$$;

create trigger check_affectation_maraude_qualification
  before insert on public.affectations_maraude
  for each row execute function public.check_affectation_maraude_qualification();

-- --- Policies RLS --------------------------------------------------------------
-- LECTURE : Admin, Manager de CETTE maraude (pas tout Manager global comme
-- pour la heatmap — un roster d'équipe est une info opérationnelle propre à
-- cette maraude, pas une donnée agrégée utile à toute planification), ou
-- tout participant inscrit (voir qui fait quoi ce soir).
-- ÉCRITURE (insert/delete) : soi-même (auto-affectation/désistement — voir
-- le garde-fou de qualification ci-dessus, qui s'applique quel que soit
-- l'auteur), Admin, ou Manager de cette maraude (gère l'équipe des autres).

create policy affectations_maraude_select_participant_ou_admin_manager
on public.affectations_maraude
for select
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = affectations_maraude.maraude_id and m.manager_id = auth.uid()
  )
  or exists (
    select 1 from public.inscriptions_maraude i
    where i.maraude_id = affectations_maraude.maraude_id
      and i.user_id = auth.uid()
      and i.statut = 'inscrit'
  )
);

create policy affectations_maraude_insert_self_or_admin_manager
on public.affectations_maraude
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = affectations_maraude.maraude_id and m.manager_id = auth.uid()
  )
);

create policy affectations_maraude_delete_self_or_admin_manager
on public.affectations_maraude
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = affectations_maraude.maraude_id and m.manager_id = auth.uid()
  )
);

-- --- Grants ----------------------------------------------------------------
grant select, insert, delete on public.affectations_maraude to authenticated;
grant select, insert, delete on public.affectations_maraude to service_role;
