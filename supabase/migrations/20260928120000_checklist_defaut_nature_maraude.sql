-- =============================================================================
-- Checklist par défaut réservée aux maraudes (arbitrage Chef de Produit,
-- 28/09) : les 6 lignes de base ne sont créées que pour un événement dont le
-- type est de nature 'maraude'. Tout autre événement (point fixe : goûter,
-- réunion, collecte…) démarre avec une checklist vide.
--
-- Critère : types_evenement.nature (enum fixe, non éditable, déjà la
-- distinction structurelle du modèle — voir docs/Specs.md) plutôt que le
-- NOM du type, librement modifiable par un Admin et donc peu fiable.
--
-- Aucun nettoyage nécessaire : au 28/09 seuls deux types existent ("Maraude
-- classique", "Maraude des enfants"), tous deux de nature 'maraude' — le
-- rattrapage de 20260928110000 n'a rien ajouté à un événement à point fixe.
-- =============================================================================

create or replace function public.checklist_par_defaut_a_la_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.types_evenement t
    where t.id = new.type_evenement_id and t.nature = 'maraude'
  ) then
    -- Créateur : l'utilisateur qui crée la maraude, ou à défaut (cron) le
    -- Manager désigné de la maraude.
    perform public.ajouter_checklist_par_defaut(new.id, coalesce(auth.uid(), new.manager_id));
  end if;
  return new;
end;
$$;
