-- =============================================================================
-- Anticipe le futur module "dons matériels" du site vitrine (Étape 10, pas
-- encore commencée) : la page de dons pourra afficher les besoins RÉELS de
-- l'association ("actuellement, on manque de couvertures") au lieu d'une
-- liste générique, en lisant simplement cette vue.
--
-- Première surface de données lisible sans authentification (anon) dans ce
-- projet — à noter, tout le reste de l'app exige une session. Seulement un
-- agrégat par catégorie sur les 30 derniers jours, jamais le détail
-- individuel (ni commentaire, ni maraude, ni qui a signalé, ni quand
-- précisément) : rien de sensible, juste une info logistique publique par
-- nature (à quoi sert un don).
--
-- Vue "propriétaire" (pas security_invoker) : elle s'exécute avec les droits
-- du propriétaire de la vue (même rôle que le propriétaire de
-- besoins_signales, postgres) — les propriétaires de table sont exemptés de
-- leurs propres policies RLS par défaut (sauf FORCE ROW LEVEL SECURITY, non
-- activé ici), donc la vue voit toutes les lignes pour construire l'agrégat,
-- puis n'expose que categorie + total à qui interroge la vue — jamais un
-- accès direct à besoins_signales pour anon (RLS de la table reste intacte).
-- =============================================================================

create view public.besoins_publics as
select
  categorie,
  count(*) as total
from public.besoins_signales
where created_at >= now() - interval '30 days'
group by categorie
order by total desc;

comment on view public.besoins_publics is
  'Agrégat public (lisible sans authentification) des besoins signalés sur '
  'les 30 derniers jours, par catégorie — destiné au futur module "dons '
  'matériels" du site vitrine (Étape 10). Ne bypasse PAS RLS pour un accès '
  'direct à besoins_signales : seule cette vue, volontairement restreinte à '
  'categorie+total, est accessible à anon.';

grant select on public.besoins_publics to anon;
grant select on public.besoins_publics to authenticated;
