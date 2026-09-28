-- =============================================================================
-- /dashboard/maraudes (28/09) — réinscription, checklist par défaut,
-- rôle choisi à l'inscription. Décisions du Chef de Produit : voir
-- docs/Tasks.md, "Défilement PC, compteurs, réinscription, checklist par
-- défaut, rôle à l'inscription".
-- =============================================================================

-- --- 1. Réinscription après désistement -----------------------------------------
-- La ligne d'inscription est unique par (maraude, bénévole) : se réinscrire =
-- réactiver CETTE ligne (desiste -> inscrit/liste d'attente). Le statut final
-- est toujours recalculé côté serveur selon la capacité, exactement comme à
-- l'INSERT — jamais accepté tel quel du client.

create or replace function public.set_inscription_statut()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nb_inscrits int;
  capacite int;
begin
  -- UPDATE : seule une réactivation (desiste -> autre chose) est recalculée.
  -- Tout autre UPDATE (promotion liste d'attente -> inscrit par
  -- promote_next_in_waitlist, correction Admin/Manager, désistement) passe
  -- inchangé, comme avant.
  if tg_op = 'UPDATE' then
    if not (old.statut = 'desiste' and new.statut is distinct from 'desiste') then
      return new;
    end if;
    -- Réinscription = nouvelle demande : repasse en fin de liste d'attente
    -- (ordre de promotion = inscrit_le), présence à reconfirmer.
    new.inscrit_le := now();
    new.presence_confirmee := false;
    new.confirmee_par := null;
    new.confirmee_le := null;
  end if;

  select max_participants into capacite
  from public.maraudes
  where id = new.maraude_id
  for update;

  select count(*) into nb_inscrits
  from public.inscriptions_maraude
  where maraude_id = new.maraude_id and statut = 'inscrit' and id <> new.id;

  if nb_inscrits < capacite then
    new.statut := 'inscrit';
  else
    new.statut := 'liste_attente';
  end if;

  return new;
end;
$$;

drop trigger set_inscription_statut on public.inscriptions_maraude;
create trigger set_inscription_statut
  before insert or update of statut on public.inscriptions_maraude
  for each row execute function public.set_inscription_statut();

-- Réactivation par le bénévole lui-même : via cette fonction, PAS via une
-- nouvelle policy UPDATE. Une policy "desiste -> inscrit/liste_attente"
-- serait combinée (OU) avec inscriptions_update_own_desist, dont le USING
-- accepte déjà sa propre ligne quel que soit son statut : un bénévole en
-- liste d'attente pourrait alors passer lui-même sa ligne en 'inscrit' et
-- doubler la file au-delà de la capacité (le trigger ne recalcule que les
-- réactivations depuis 'desiste'). La RLS d'inscription reste donc
-- strictement inchangée ; cette fonction ne touche que la ligne 'desiste'
-- de l'appelant, et le trigger ci-dessus décide du statut final.
create function public.reinscrire_maraude(p_maraude_id uuid)
returns table (id uuid, statut public.inscription_statut)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if auth.uid() is null or public.current_user_status() is distinct from 'actif' then
    raise exception 'Compte non actif.';
  end if;

  return query
  update public.inscriptions_maraude i
  set statut = 'inscrit'
  where i.maraude_id = p_maraude_id
    and i.user_id = auth.uid()
    and i.statut = 'desiste'
  returning i.id, i.statut;
end;
$$;

revoke execute on function public.reinscrire_maraude(uuid) from public, anon;
grant execute on function public.reinscrire_maraude(uuid) to authenticated;

-- --- 2. Désistement : retire les affectations -------------------------------------
-- security definer : logique serveur fixe (même principe que
-- promote_next_in_waitlist) — un Admin/Manager global qui désiste un
-- bénévole d'une maraude qu'il ne manage pas doit quand même nettoyer ses
-- affectations, ce que la RLS delete (Admin ou Manager DE CETTE maraude)
-- refuserait silencieusement.
create function public.retirer_affectations_au_desistement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'desiste' and old.statut is distinct from 'desiste' then
    delete from public.affectations_maraude
    where maraude_id = new.maraude_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger retirer_affectations_au_desistement
  after update of statut on public.inscriptions_maraude
  for each row execute function public.retirer_affectations_au_desistement();

-- --- 3. Affectations : auto-affectation strictement bornée --------------------------
-- Un bénévole ne crée/supprime QUE sa propre affectation, sur une maraude où
-- il est lui-même inscrit (confirmé, pas en liste d'attente). Admin et
-- Manager de la maraude inchangés. Le rôle détenu reste vérifié par le
-- trigger check_affectation_maraude_qualification (inchangé) ; la condition
-- d'inscription y était déjà, elle est ajoutée ici aussi dans la policy
-- (défense en profondeur, et désormais aussi pour la suppression).

alter policy affectations_maraude_insert_self_or_admin_manager
on public.affectations_maraude
with check (
  (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.inscriptions_maraude i
      where i.maraude_id = affectations_maraude.maraude_id
        and i.user_id = (select auth.uid())
        and i.statut = 'inscrit'
    )
  )
  or (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = affectations_maraude.maraude_id and m.manager_id = (select auth.uid())
  )
);

alter policy affectations_maraude_delete_self_or_admin_manager
on public.affectations_maraude
using (
  (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.inscriptions_maraude i
      where i.maraude_id = affectations_maraude.maraude_id
        and i.user_id = (select auth.uid())
        and i.statut = 'inscrit'
    )
  )
  or (select public.current_user_has_role('admin'))
  or exists (
    select 1 from public.maraudes m
    where m.id = affectations_maraude.maraude_id and m.manager_id = (select auth.uid())
  )
);

-- --- 4. Checklist par défaut --------------------------------------------------------
-- Lignes de base (source 'libre') créées UNE SEULE FOIS, à la création de la
-- maraude — formulaire manuel comme génération par le cron de séries, les
-- deux passant par un INSERT dans maraudes. Jamais à l'ouverture de la page
-- (genererChecklistDepart ne gère que stock/dons) : une ligne supprimée ne
-- revient donc pas.

-- cree_par reste forcé à auth.uid() pour toute écriture d'un utilisateur
-- (inchangé). Sans utilisateur (cron via clé service, migration), auth.uid()
-- est NULL : on garde alors la valeur fournie par la logique serveur au lieu
-- d'échouer sur la contrainte NOT NULL.
create or replace function public.force_checklist_item_cree_par()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.cree_par := coalesce(auth.uid(), new.cree_par);
  return new;
end;
$$;

-- Idempotent (n'ajoute pas une ligne de base déjà présente sous le même
-- libellé) — sert au trigger ET au rattrapage ci-dessous.
create function public.ajouter_checklist_par_defaut(p_maraude_id uuid, p_cree_par uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.checklist_depart_items (maraude_id, libelle, source, cree_par)
  select p_maraude_id, l.libelle, 'libre', p_cree_par
  from unnest(array[
    'Thermos de café / eau chaude',
    'Sucre, touillettes et gobelets',
    'Barquettes repas chauds',
    'Pain et collations',
    'Sacs poubelle et serviettes',
    'Trousse de secours'
  ]) with ordinality as l(libelle, ordre)
  where not exists (
    select 1 from public.checklist_depart_items c
    where c.maraude_id = p_maraude_id and c.source = 'libre' and c.libelle = l.libelle
  )
  order by l.ordre;
end;
$$;

-- Fonction interne : jamais appelable par un client via l'API.
revoke execute on function public.ajouter_checklist_par_defaut(uuid, uuid) from public, anon, authenticated;

create function public.checklist_par_defaut_a_la_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Créateur : l'utilisateur qui crée la maraude, ou à défaut (cron) le
  -- Manager désigné de la maraude.
  perform public.ajouter_checklist_par_defaut(new.id, coalesce(auth.uid(), new.manager_id));
  return new;
end;
$$;

create trigger checklist_par_defaut_a_la_creation
  after insert on public.maraudes
  for each row execute function public.checklist_par_defaut_a_la_creation();

-- Rattrapage unique : maraudes à venir déjà existantes.
select public.ajouter_checklist_par_defaut(m.id, m.manager_id)
from public.maraudes m
where m.date_heure >= now();
