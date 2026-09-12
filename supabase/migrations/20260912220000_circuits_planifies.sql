-- =============================================================================
-- Étape 9 — Circuit planifié.
-- Le Manager (ou l'Admin) définit avant le départ un itinéraire prévu en
-- cliquant une suite de points sur la carte (affichée avec la heatmap de
-- l'historique en fond) — voir docs/Tasks.md. Un seul circuit planifié par
-- maraude (maraude_id unique) : redéfinir le circuit remplace le précédent,
-- pas d'historique de versions nécessaire pour ce besoin.
--
-- points est un jsonb ordonné [{lat, lng}, ...] plutôt qu'une table de lignes
-- séparées : la liste est toujours lue/écrite comme un tout (jamais de point
-- individuel modifié isolément), un tableau JSON évite une table +
-- une colonne d'ordre pour un gain nul ici.
-- =============================================================================

create table public.circuits_planifies (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null unique references public.maraudes (id) on delete cascade,
  points jsonb not null default '[]'::jsonb,
  updated_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

comment on table public.circuits_planifies is
  'Itinéraire prévu par le Manager/Admin avant le départ, défini en cliquant '
  'des points sur la carte (en s''appuyant visuellement sur la heatmap de '
  'l''historique). points : tableau jsonb ordonné [{lat,lng}, ...]. Un seul '
  'circuit par maraude — le redéfinir écrase le précédent.';

alter table public.circuits_planifies enable row level security;

-- --- Garde-fous ----------------------------------------------------------------

-- updated_by/updated_at forcés côté serveur, même principe que saisi_par
-- ailleurs dans ce projet — jamais de confiance dans une valeur cliente.
create function public.force_circuit_planifie_meta()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger force_circuit_planifie_meta
  before insert or update on public.circuits_planifies
  for each row execute function public.force_circuit_planifie_meta();

-- --- Policies RLS --------------------------------------------------------------
-- LECTURE : Admin, Manager de la maraude, ou tout participant inscrit — utile
-- à l'équipe pour connaître l'itinéraire prévu. ÉCRITURE (create/update/
-- delete) : réservée à Admin ou au Manager de CETTE maraude, cohérent avec
-- points_passage_update_admin_or_own_manager.

create policy circuits_planifies_select_participant_or_admin_manager
on public.circuits_planifies
for select
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = circuits_planifies.maraude_id and m.manager_id = auth.uid()
  )
  or exists (
    select 1 from public.inscriptions_maraude i
    where i.maraude_id = circuits_planifies.maraude_id
      and i.user_id = auth.uid()
      and i.statut = 'inscrit'
  )
);

create policy circuits_planifies_insert_admin_or_own_manager
on public.circuits_planifies
for insert
to authenticated
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = circuits_planifies.maraude_id and m.manager_id = auth.uid()
  )
);

create policy circuits_planifies_update_admin_or_own_manager
on public.circuits_planifies
for update
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = circuits_planifies.maraude_id and m.manager_id = auth.uid()
  )
)
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = circuits_planifies.maraude_id and m.manager_id = auth.uid()
  )
);

create policy circuits_planifies_delete_admin_or_own_manager
on public.circuits_planifies
for delete
to authenticated
using (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = circuits_planifies.maraude_id and m.manager_id = auth.uid()
  )
);

-- --- Grants ----------------------------------------------------------------
-- Rappel du piège déjà rencontré (migrations 20260912170000/171500) : RLS ne
-- sert à rien sans les GRANTs de base, absents par défaut pour une table
-- créée via migration (rôle postgres) contrairement au Dashboard.
grant select, insert, update, delete on public.circuits_planifies to authenticated;
grant select, insert, update, delete on public.circuits_planifies to service_role;
