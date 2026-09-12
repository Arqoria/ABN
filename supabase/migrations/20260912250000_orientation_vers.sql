-- =============================================================================
-- "Orientation sociale" ne dit pas vers qui — besoin exprimé en utilisant le
-- dashboard rapports (12/09) : indiquer l'organisme partenaire vers lequel
-- la personne a été orientée, pour un suivi exploitable (compteur par
-- organisme dans les rapports).
--
-- Enum plutôt qu'une table de référence : cohérent avec toutes les autres
-- listes fixes du projet (type_action_terrain, categorie_depense,
-- meteo_benevole, fonction_bureau...) — ajouter un organisme plus tard se
-- fait par une migration `alter type ... add value`, comme déjà fait 2 fois
-- dans ce projet (personne_rencontree, fonction_bureau).
-- =============================================================================

create type public.organisme_orientation as enum (
  'samu_social_115',
  'ccas',
  'ccas_15e_corps',
  'croix_rouge',
  'secours_catholique',
  'restos_du_coeur',
  'emmaus',
  'douche_municipale',
  'autre_maraude',
  'medecins_sans_frontieres',
  'coviam',
  'france_services',
  'msd',
  'csapa',
  'caarud',
  'halte_de_nuit',
  'chrs',
  'autre'
);

alter table public.points_passage
  add column orientation_vers public.organisme_orientation,
  add column orientation_vers_autre text;

comment on column public.points_passage.orientation_vers is
  'Renseigné uniquement quand type_action = orientation_sociale (voir '
  'contrainte points_passage_orientation_vers_coherent). "autre" impose une '
  'précision en texte libre dans orientation_vers_autre (voir contrainte '
  'points_passage_orientation_vers_autre_coherent).';

-- Cohérence avec type_action : orientation_vers renseigné SI ET SEULEMENT SI
-- type_action = 'orientation_sociale' — équivalence booléenne, valide aussi
-- pour les 3 autres types (orientation_vers doit alors être NULL).
alter table public.points_passage
  add constraint points_passage_orientation_vers_coherent
  check ((type_action = 'orientation_sociale') = (orientation_vers is not null));

-- "autre" impose un texte libre non vide ; tout autre organisme interdit
-- de renseigner ce texte (évite une donnée fantôme jamais affichée).
alter table public.points_passage
  add constraint points_passage_orientation_vers_autre_coherent
  check (
    (orientation_vers = 'autre')
    = (orientation_vers_autre is not null and length(trim(orientation_vers_autre)) > 0)
  );
