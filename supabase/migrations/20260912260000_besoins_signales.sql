-- =============================================================================
-- Besoins signalés — anticiper les achats (retour utilisateur, 12/09).
-- Un bénévole/maraudeur peut signaler sur le terrain un besoin matériel
-- observé (manque de couvertures, vêtements chauds, hygiène...) pour aider
-- le Trésorier à mieux ajuster les prochains achats — distinct des
-- points_passage (ceux-là comptent des ACTIONS envers des personnes, pas des
-- besoins matériels de l'équipe/l'association).
-- =============================================================================

create type public.categorie_besoin as enum (
  'couvertures',
  'vetements_chauds',
  'hygiene',
  'nourriture_specifique',
  'autre'
);

create table public.besoins_signales (
  id uuid primary key default gen_random_uuid(),
  maraude_id uuid not null references public.maraudes (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  categorie public.categorie_besoin not null,
  commentaire text,
  created_at timestamptz not null default now()
);

comment on table public.besoins_signales is
  'Besoin matériel signalé par un bénévole pendant/après une maraude (pas '
  'géolocalisé, pas anonymisé — aucune donnée sur une personne aidée ici, '
  'juste un besoin logistique de l''équipe). Alimente le graphique '
  '"Besoins signalés" des rapports et l''export .xlsx, pour anticiper les '
  'achats.';

create index besoins_signales_maraude_id_idx on public.besoins_signales (maraude_id);

alter table public.besoins_signales enable row level security;

-- --- Garde-fous ----------------------------------------------------------------

-- user_id forcé côté serveur, même principe que saisi_par (meteo) —
-- jamais de confiance dans une valeur cliente.
create function public.force_besoin_signale_user_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger force_besoin_signale_user_id
  before insert on public.besoins_signales
  for each row execute function public.force_besoin_signale_user_id();

-- L'appelant (auth.uid(), jamais new.user_id qui pourrait être fourni par le
-- client AVANT que force_besoin_signale_user_id ne l'écrase — dépendre de
-- new.user_id ici créerait un risque d'ordre d'exécution entre triggers
-- BEFORE INSERT) doit être inscrit à la maraude — SAUF Admin/Manager de la
-- maraude. Note : plus permissif que check_points_passage_user_participant
-- (Étape 6), qui n'a pas cette exemption — volontaire, un besoin matériel
-- n'a pas besoin de la même rigueur qu'une action terrain géolocalisée.
create function public.check_besoin_signale_user_participant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
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
    where maraude_id = new.maraude_id and user_id = auth.uid() and statut = 'inscrit'
  ) then
    raise exception 'Vous devez être inscrit à cette maraude pour signaler un besoin.';
  end if;
  return new;
end;
$$;

create trigger check_besoin_signale_user_participant
  before insert on public.besoins_signales
  for each row execute function public.check_besoin_signale_user_participant();

-- --- Policies RLS --------------------------------------------------------------
-- LECTURE : Admin, Manager (toutes maraudes — même raisonnement que la
-- heatmap, migration 20260912240000 : un besoin matériel signalé quelque
-- part intéresse toute la planification d'achats, pas seulement le Manager
-- de cette maraude précise), ou tout participant inscrit (utile à l'équipe
-- pour voir ce qui a déjà été signalé, éviter les doublons).
-- ÉCRITURE : Admin, Manager de la maraude, ou le participant concerné
-- lui-même (compte actif) — même structure que points_passage.

create policy besoins_signales_select_admin_manager_ou_participant
on public.besoins_signales
for select
to authenticated
using (
  public.current_user_has_role('admin')
  or public.current_user_has_role('manager')
  or exists (
    select 1 from public.inscriptions_maraude i
    where i.maraude_id = besoins_signales.maraude_id
      and i.user_id = auth.uid()
      and i.statut = 'inscrit'
  )
);

create policy besoins_signales_insert_self_or_admin_manager
on public.besoins_signales
for insert
to authenticated
with check (
  public.current_user_has_role('admin')
  or exists (
    select 1 from public.maraudes m
    where m.id = besoins_signales.maraude_id and m.manager_id = auth.uid()
  )
  or (user_id = auth.uid() and public.current_user_status() = 'actif')
);

create policy besoins_signales_delete_admin
on public.besoins_signales
for delete
to authenticated
using (public.current_user_has_role('admin'));

-- --- Grants ----------------------------------------------------------------
grant select, insert, delete on public.besoins_signales to authenticated;
grant select, insert, delete on public.besoins_signales to service_role;
