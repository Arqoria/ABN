-- =============================================================================
-- Bandeau d'impact du site vitrine (Étape 10, page d'accueil) : compteurs
-- réels affichés publiquement (bénévoles actifs, maraudes réalisées, repas
-- distribués). Mêmes principes que besoins_publics (20260912270000) :
-- vue "propriétaire" (pas security_invoker), agrégats uniquement, aucun
-- détail individuel exposé (pas de nom, pas de maraude précise, pas de date).
--
-- Compteurs volontairement choisis pour rester non-sensibles même agrégés :
-- un nombre de bénévoles actifs ou de repas distribués ne révèle rien sur les
-- personnes aidées (anonymat strict, voir CLAUDE.md) ni sur un individu
-- bénévole précis.
-- =============================================================================

create view public.impact_public as
select
  (select count(*) from public.profiles where status = 'actif') as benevoles_actifs,
  (select count(*) from public.maraudes where statut = 'terminee') as maraudes_realisees,
  (select coalesce(sum(quantite), 0) from public.repas) as repas_distribues;

comment on view public.impact_public is
  'Agrégat public (lisible sans authentification) pour le bandeau d''impact du '
  'site vitrine : bénévoles actifs, maraudes terminées, total de repas '
  'distribués. Ne bypasse PAS RLS pour un accès direct aux tables sources : '
  'seule cette vue, volontairement restreinte à 3 compteurs globaux, est '
  'accessible à anon.';

grant select on public.impact_public to anon;
grant select on public.impact_public to authenticated;
