-- Corrige l'avertissement Supabase 'Auth RLS Initialization Plan' (24 occurrences)
-- sur les policies qui appellent auth.uid()/current_user_has_role()/current_user_status()
-- directement plutot que via (select ...) -- Postgres reevalue sinon l'appel a CHAQUE
-- ligne scannee au lieu d'une seule fois par requete. Reecriture MECANIQUE (substitution
-- automatique sur le texte exact recupere via pg_policies, aucune retype a la main) :
-- logique strictement identique, seule la mise en cache change. Voir docs/Tasks.md (15/09).

alter policy "affectations_maraude_delete_self_or_admin_manager" on public.affectations_maraude
  using (((user_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = affectations_maraude.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "affectations_maraude_insert_self_or_admin_manager" on public.affectations_maraude
  with check (((user_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = affectations_maraude.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "affectations_maraude_select_participant_ou_admin_manager" on public.affectations_maraude
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = affectations_maraude.maraude_id) AND (m.manager_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM inscriptions_maraude i
  WHERE ((i.maraude_id = affectations_maraude.maraude_id) AND (i.user_id = (select auth.uid())) AND (i.statut = 'inscrit'::inscription_statut))))));

alter policy "besoins_signales_insert_self_or_admin_manager" on public.besoins_signales
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = besoins_signales.maraude_id) AND (m.manager_id = (select auth.uid()))))) OR ((user_id = (select auth.uid())) AND ((select current_user_status()) = 'actif'::account_status))));

alter policy "besoins_signales_select_admin_manager_ou_participant" on public.besoins_signales
  using (((select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role)) OR (EXISTS ( SELECT 1
   FROM inscriptions_maraude i
  WHERE ((i.maraude_id = besoins_signales.maraude_id) AND (i.user_id = (select auth.uid())) AND (i.statut = 'inscrit'::inscription_statut))))));

alter policy "circuits_planifies_delete_admin_or_own_manager" on public.circuits_planifies
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = circuits_planifies.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "circuits_planifies_insert_admin_or_own_manager" on public.circuits_planifies
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = circuits_planifies.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "circuits_planifies_select_participant_or_admin_manager" on public.circuits_planifies
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = circuits_planifies.maraude_id) AND (m.manager_id = (select auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM inscriptions_maraude i
  WHERE ((i.maraude_id = circuits_planifies.maraude_id) AND (i.user_id = (select auth.uid())) AND (i.statut = 'inscrit'::inscription_statut))))));

alter policy "circuits_planifies_update_admin_or_own_manager" on public.circuits_planifies
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = circuits_planifies.maraude_id) AND (m.manager_id = (select auth.uid())))))))
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = circuits_planifies.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "inscriptions_insert_self_or_admin_manager" on public.inscriptions_maraude
  with check ((((select current_user_status()) = 'actif'::account_status) AND ((user_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role)))));

alter policy "inscriptions_update_own_desist" on public.inscriptions_maraude
  using ((user_id = (select auth.uid())))
  with check (((user_id = (select auth.uid())) AND (statut = 'desiste'::inscription_statut)));

alter policy "maraudes_update_admin_or_own_manager" on public.maraudes
  using (((select current_user_has_role('admin'::user_role)) OR ((select current_user_has_role('manager'::user_role)) AND (manager_id = (select auth.uid())))))
  with check (((select current_user_has_role('admin'::user_role)) OR ((select current_user_has_role('manager'::user_role)) AND (manager_id = (select auth.uid())))));

alter policy "meteo_admin_or_own_manager_select" on public.meteo_benevole_saisies
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = meteo_benevole_saisies.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "meteo_admin_or_own_manager_update" on public.meteo_benevole_saisies
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = meteo_benevole_saisies.maraude_id) AND (m.manager_id = (select auth.uid())))))))
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = meteo_benevole_saisies.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "meteo_insert_self_or_admin_manager" on public.meteo_benevole_saisies
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = meteo_benevole_saisies.maraude_id) AND (m.manager_id = (select auth.uid()))))) OR ((user_id = (select auth.uid())) AND ((select current_user_status()) = 'actif'::account_status))));

alter policy "points_passage_insert_self_or_admin_manager" on public.points_passage
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = points_passage.maraude_id) AND (m.manager_id = (select auth.uid()))))) OR ((user_id = (select auth.uid())) AND ((select current_user_status()) = 'actif'::account_status))));

alter policy "points_passage_update_admin_or_own_manager" on public.points_passage
  using (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = points_passage.maraude_id) AND (m.manager_id = (select auth.uid())))))))
  with check (((select current_user_has_role('admin'::user_role)) OR (EXISTS ( SELECT 1
   FROM maraudes m
  WHERE ((m.id = points_passage.maraude_id) AND (m.manager_id = (select auth.uid())))))));

alter policy "profile_roles_select_own_or_admin" on public.profile_roles
  using (((profile_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role))));

alter policy "profiles_select_own" on public.profiles
  using ((id = (select auth.uid())));

alter policy "profiles_update_own" on public.profiles
  using ((id = (select auth.uid())))
  with check ((id = (select auth.uid())));

alter policy "repas_insert_self_or_admin_manager" on public.repas
  with check ((((select current_user_status()) = 'actif'::account_status) AND ((cuisinier_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role)))));

alter policy "repas_update_self_or_admin_manager" on public.repas
  using (((cuisinier_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role))))
  with check (((cuisinier_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role))));

alter policy "tickets_insert_own" on public.tickets_depense
  with check (((user_id = (select auth.uid())) AND ((select current_user_status()) = 'actif'::account_status)));

alter policy "tickets_select_own_or_admin" on public.tickets_depense
  using (((user_id = (select auth.uid())) OR (select current_user_has_role('admin'::user_role))));

alter policy "besoins_signales_delete_admin" on public.besoins_signales
  using ((select current_user_has_role('admin'::user_role)));

alter policy "candidatures_benevolat_delete_admin" on public.candidatures_benevolat
  using ((select current_user_has_role('admin'::user_role)));

alter policy "candidatures_benevolat_select_admin" on public.candidatures_benevolat
  using ((select current_user_has_role('admin'::user_role)));

alter policy "candidatures_benevolat_update_admin" on public.candidatures_benevolat
  using ((select current_user_has_role('admin'::user_role)))
  with check ((select current_user_has_role('admin'::user_role)));

alter policy "maraudes_delete_admin" on public.maraudes
  using ((select current_user_has_role('admin'::user_role)));

alter policy "maraudes_insert_admin_manager" on public.maraudes
  with check (((select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role))));

alter policy "meteo_admin_delete" on public.meteo_benevole_saisies
  using ((select current_user_has_role('admin'::user_role)));

alter policy "points_passage_delete_admin" on public.points_passage
  using ((select current_user_has_role('admin'::user_role)));

alter policy "points_passage_select_admin_or_manager" on public.points_passage
  using (((select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role))));

alter policy "profile_roles_delete_admin" on public.profile_roles
  using ((select current_user_has_role('admin'::user_role)));

alter policy "profile_roles_insert_admin" on public.profile_roles
  with check ((select current_user_has_role('admin'::user_role)));

alter policy "profiles_select_admin_manager" on public.profiles
  using (((select current_user_has_role('admin'::user_role)) OR (select current_user_has_role('manager'::user_role))));

alter policy "repas_delete_admin" on public.repas
  using ((select current_user_has_role('admin'::user_role)));

alter policy "tickets_delete_admin" on public.tickets_depense
  using ((select current_user_has_role('admin'::user_role)));

alter policy "tickets_update_admin" on public.tickets_depense
  using ((select current_user_has_role('admin'::user_role)))
  with check ((select current_user_has_role('admin'::user_role)));

