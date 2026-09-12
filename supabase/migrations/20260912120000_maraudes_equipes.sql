-- =============================================================================
-- Étape 3 — Maraudes & équipes
-- Table maraudes, table inscriptions_maraude, liste d'attente automatique
-- (max 6, promotion auto au désistement), policies RLS.
-- =============================================================================

-- --- Enums -------------------------------------------------------------------

create type public.maraude_statut as enum ('planifiee', 'en_cours', 'terminee', 'annulee');

create type public.inscription_statut as enum ('inscrit', 'liste_attente', 'desiste');

-- --- Table maraudes ------------------------------------------------------------

create table public.maraudes (
  id uuid primary key default gen_random_uuid(),
  date_heure timestamptz not null,
  statut public.maraude_statut not null default 'planifiee',
  manager_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.maraudes is
  'Une maraude = une sortie terrain datée (récurrence habituelle : vendredi 20h30, '
  'mais date libre pour gérer les exceptions/annulations). Voir docs/Specs.md.';

create index maraudes_manager_id_idx on public.maraudes (manager_id);

alter table public.maraudes enable row level security;

-- Garde-fou : manager_id doit désigner un profil Manager (rôle Admin et rôle
-- Manager sont deux rôles distincts et non interchangeables — un Admin ne peut
-- pas être lui-même désigné chef de maraude via cette colonne). Impossible à
-- exprimer en simple CHECK (pas de sous-requête sur une autre table dans un
-- CHECK) — d'où ce trigger, sur le même principe que protect_profile_role_status.
create function public.check_maraude_manager_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.manager_id and role = 'manager'
  ) then
    raise exception 'manager_id doit désigner un profil Manager.';
  end if;
  return new;
end;
$$;

create trigger check_maraude_manager_role
  before insert or update of manager_id on public.maraudes
  for each row execute function public.check_maraude_manager_role();

-- --- Table inscriptions_maraude --------------------------------------------------

create table public.inscriptions_maraude (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  statut public.inscription_statut not null default 'inscrit',
  inscrit_le timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (maraude_id, user_id)
);

comment on table public.inscriptions_maraude is
  'Inscription d''un bénévole à une maraude. Une seule ligne par (maraude, bénévole) : '
  'un désistement met à jour le statut à ''desiste'' plutôt que de supprimer la ligne '
  '(historique conservé, réinscription possible en réutilisant la même ligne). Le '
  'statut inscrit/liste_attente à la création est calculé côté serveur (trigger '
  'set_inscription_statut), jamais accepté tel quel du client. Voir docs/Specs.md '
  '(équipe max 6, liste d''attente automatique).';

create index inscriptions_maraude_maraude_id_statut_idx
  on public.inscriptions_maraude (maraude_id, statut);

alter table public.inscriptions_maraude enable row level security;

-- --- Logique liste d'attente (max 6, promotion auto au désistement) ---------------

-- À l'inscription : place directe si l'équipe a moins de 6 inscrits, sinon liste
-- d'attente. Verrouille la ligne maraude pour sérialiser les inscriptions
-- concurrentes sur une même maraude (évite qu'une place soit attribuée deux fois).
create function public.set_inscription_statut()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  nb_inscrits int;
begin
  perform 1 from public.maraudes where id = new.maraude_id for update;

  select count(*) into nb_inscrits
  from public.inscriptions_maraude
  where maraude_id = new.maraude_id and statut = 'inscrit';

  if nb_inscrits < 6 then
    new.statut := 'inscrit';
  else
    new.statut := 'liste_attente';
  end if;

  return new;
end;
$$;

create trigger set_inscription_statut
  before insert on public.inscriptions_maraude
  for each row execute function public.set_inscription_statut();

-- Au désistement (inscrit -> desiste) : promeut le plus ancien de la liste
-- d'attente. security definer pour que cette promotion interne (déclenchée par
-- un simple bénévole qui se désiste) puisse mettre à jour la ligne d'un AUTRE
-- utilisateur malgré les policies RLS restreignant chacun à sa propre ligne —
-- même principe que handle_new_user (contournement RLS volontaire et borné à
-- une logique serveur fixe, aucune entrée arbitraire du client).
create function public.promote_next_in_waitlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
begin
  if new.statut = 'desiste' and old.statut = 'inscrit' then
    select id into next_id
    from public.inscriptions_maraude
    where maraude_id = new.maraude_id and statut = 'liste_attente'
    order by inscrit_le asc
    limit 1
    for update skip locked;

    if next_id is not null then
      update public.inscriptions_maraude
      set statut = 'inscrit'
      where id = next_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger promote_next_in_waitlist
  after update of statut on public.inscriptions_maraude
  for each row execute function public.promote_next_in_waitlist();

-- --- Policies RLS : maraudes -----------------------------------------------------
-- Lecture large (tout authentifié voit toutes les maraudes), écriture restreinte
-- à Admin (tout) et Manager (uniquement ses propres maraudes).

create policy maraudes_select_authenticated
on public.maraudes
for select
to authenticated
using (true);

create policy maraudes_insert_admin_manager
on public.maraudes
for insert
to authenticated
with check (public.current_user_role() in ('admin', 'manager'));

create policy maraudes_update_admin_or_own_manager
on public.maraudes
for update
to authenticated
using (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'manager' and manager_id = auth.uid())
)
with check (
  public.current_user_role() = 'admin'
  or (public.current_user_role() = 'manager' and manager_id = auth.uid())
);

create policy maraudes_delete_admin
on public.maraudes
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- --- Policies RLS : inscriptions_maraude -------------------------------------------
-- Lecture large (visibilité de l'équipe/liste d'attente par tous). Écriture
-- restreinte : un bénévole (compte déjà validé "actif") ne peut s'inscrire que
-- lui-même et ne peut modifier sa ligne que pour se désister ; Admin/Manager ont
-- la main complète (inscrire/désister un tiers, gestion d'équipe).

create policy inscriptions_select_authenticated
on public.inscriptions_maraude
for select
to authenticated
using (true);

create policy inscriptions_insert_self_or_admin_manager
on public.inscriptions_maraude
for insert
to authenticated
with check (
  public.current_user_status() = 'actif'
  and (user_id = auth.uid() or public.current_user_role() in ('admin', 'manager'))
);

create policy inscriptions_update_own_desist
on public.inscriptions_maraude
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and statut = 'desiste');

create policy inscriptions_update_admin_manager
on public.inscriptions_maraude
for update
to authenticated
using (public.current_user_role() in ('admin', 'manager'))
with check (public.current_user_role() in ('admin', 'manager'));

-- Pas de policy delete : un désistement passe par une mise à jour de statut
-- (historique conservé), jamais par une suppression de ligne en self-service.
