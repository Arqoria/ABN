-- =============================================================================
-- Étape 5 — Logistique repas (1/2 : BDD — tables repas/tickets_depense + Storage)
-- UI (upload photo + saisie repas) reportée à l'Étape 7, même raison qu'à
-- l'Étape 4 : dépend d'une session utilisateur réelle, pas encore d'Auth
-- Supabase branchée (voir docs/Tasks.md).
-- =============================================================================

create type public.remboursement_statut as enum ('en_attente', 'rembourse');

-- --- Table repas ------------------------------------------------------------

create table public.repas (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  cuisinier_id uuid not null references public.profiles (id),
  quoi text not null,
  quantite integer not null check (quantite > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.repas is
  'Traçabilité des repas préparés pour une maraude : quoi, combien, par qui '
  '(cuisinier_id doit désigner un profil role=''cuisinier''). Voir docs/Specs.md.';

create index repas_maraude_id_idx on public.repas (maraude_id);

alter table public.repas enable row level security;

-- Garde-fou : cuisinier_id doit désigner un profil Cuisinier — même principe
-- que check_maraude_manager_role / check_meteo_user_participant.
create function public.check_repas_cuisinier_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.cuisinier_id and role = 'cuisinier'
  ) then
    raise exception 'cuisinier_id doit désigner un profil Cuisinier.';
  end if;
  return new;
end;
$$;

create trigger check_repas_cuisinier_role
  before insert or update of cuisinier_id on public.repas
  for each row execute function public.check_repas_cuisinier_role();

-- Policies RLS : lecture large (tout authentifié — ces compteurs ne sont pas
-- sensibles), écriture restreinte au Cuisinier concerné (compte actif) ou à
-- Admin/Manager (correction/saisie pour un tiers).

create policy repas_select_authenticated
on public.repas
for select
to authenticated
using (true);

create policy repas_insert_self_or_admin_manager
on public.repas
for insert
to authenticated
with check (
  public.current_user_status() = 'actif'
  and (cuisinier_id = auth.uid() or public.current_user_role() in ('admin', 'manager'))
);

create policy repas_update_self_or_admin_manager
on public.repas
for update
to authenticated
using (cuisinier_id = auth.uid() or public.current_user_role() in ('admin', 'manager'))
with check (cuisinier_id = auth.uid() or public.current_user_role() in ('admin', 'manager'));

create policy repas_delete_admin
on public.repas
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- --- Table tickets_depense --------------------------------------------------

create table public.tickets_depense (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  montant numeric(10, 2) not null check (montant > 0),
  photo_path text not null,
  statut_remboursement public.remboursement_statut not null default 'en_attente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tickets_depense is
  'Ticket de caisse à rembourser par le Trésorier (Admin). photo_path pointe vers '
  'un objet du bucket Storage privé ''tickets-depense'' — jamais une URL publique '
  '(colonne nommée photo_path et non photo_url : le bucket n''est pas public, '
  'l''URL réelle est signée à la demande côté serveur, elle n''existe pas de '
  'façon stable). Convention de chemin obligatoire ''{user_id}/{fichier}'' pour '
  'que les policies Storage ci-dessous vérifient la propriété par le chemin. '
  'Voir docs/Specs.md.';

create index tickets_depense_maraude_id_idx on public.tickets_depense (maraude_id);
create index tickets_depense_user_id_idx on public.tickets_depense (user_id);

alter table public.tickets_depense enable row level security;

-- Policies RLS : le déposant voit/crée son propre ticket ; seul Admin
-- (Trésorier) peut le modifier (statut de remboursement) ou le supprimer —
-- aucune correction possible côté déposant après coup (intégrité financière).

create policy tickets_select_own_or_admin
on public.tickets_depense
for select
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy tickets_insert_own
on public.tickets_depense
for insert
to authenticated
with check (user_id = auth.uid() and public.current_user_status() = 'actif');

create policy tickets_update_admin
on public.tickets_depense
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy tickets_delete_admin
on public.tickets_depense
for delete
to authenticated
using (public.current_user_role() = 'admin');

-- --- Bucket Storage : photos de tickets de caisse ---------------------------
-- Privé (public = false), 8 Mo max, images uniquement. Valeurs par défaut
-- raisonnables pour une photo de ticket de caisse — à ajuster si besoin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tickets-depense',
  'tickets-depense',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Vérification de propriété par le CHEMIN du fichier (premier segment =
-- user_id), pas par la colonne owner_id de storage.objects : plus explicite et
-- indépendant de la façon dont le client d'upload la renseigne.

create policy tickets_depense_select_own_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'tickets-depense'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.current_user_role() = 'admin'
  )
);

create policy tickets_depense_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tickets-depense'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_status() = 'actif'
);

-- Pas de policy update : un ticket déposé n'est pas modifiable, seulement
-- remplaçable (nouveau fichier) ou supprimé par un Admin.
create policy tickets_depense_delete_admin
on storage.objects
for delete
to authenticated
using (bucket_id = 'tickets-depense' and public.current_user_role() = 'admin');
