-- =============================================================================
-- Ajoute une catégorie de dépense aux tickets, pour la compta du Trésorier.
-- =============================================================================

create type public.categorie_depense as enum (
  'alimentaire',
  'carburant',
  'materiel',
  'autre'
);

alter table public.tickets_depense
  add column categorie public.categorie_depense not null default 'autre';

-- Le default 'autre' n'est là que pour ne pas casser une éventuelle ligne
-- existante au moment de la migration (aucune donnée réelle en base à ce
-- stade) — le formulaire impose toujours un choix explicite, jamais soumis
-- vide côté client.
alter table public.tickets_depense alter column categorie drop default;
