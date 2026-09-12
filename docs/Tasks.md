# Backlog technique — ABN

Découpage en petites itérations logiques. Statut : ⬜ à faire · 🟨 en cours · ✅ fait

## Étape 1 — Socle & validation design (EN COURS)
- ✅ Repo Arqoria/ABN connecté à Vercel, premier déploiement réussi
- ✅ Design system / styleguide intégré (couleurs, typographie, boutons, badges, cartes) — abn-theta-murex.vercel.app
  — vit désormais de façon permanente sur /styleguide (déplacé le 12/09, voir plus bas),
  indépendamment de '/' qui affichera la vraie page d'accueil à l'Étape 10
- 🟨 Validation visuelle : validée par Aymen (par conviction personnelle) ; validation du
  référent association toujours en attente (dark mode, contrastes, taille des boutons sur
  mobile réel) — page de référence stable pour cette validation : /styleguide
- ⬜ Ajustements design suite aux retours de validation (du référent association)
- ✅ Manifest PWA (icônes 192/512/maskable/apple-icon, theme-color, apple-web-app) — déployé et vérifié en ligne
- ✅ Service Worker de base (public/sw.js, pass-through — installabilité uniquement, aucun cache/offline)
- ✅ Structure des pages/routes (squelette (public)/(app) + proxy.ts, pas encore de contenu final)
  — note : '/' sert temporairement le styleguide (ré-export de /styleguide) au lieu du
  placeholder vitrine ; la vraie page d'accueil sera construite séparément à l'Étape 10,
  à ce moment-là il suffira de remplacer le ré-export dans src/app/page.tsx

## Étape 2 — Fondations BDD (Supabase)
- ✅ Créer le projet Supabase réel (compte Arqoria, projet `kjwjkzoepjaepxjkquwr`)
- ✅ Appliquer migration : enums (user_role, account_status, meteo_benevole) + table profiles + RLS de base
- ✅ Appliquer migration : fonctions helper security definer (current_user_role, current_user_status)
- ✅ Policy profiles_select_admin_manager construite directement avec les fonctions helper (pas de récursion à corriger, jamais de sous-requête sur profiles depuis le début)
- ✅ Trigger handle_new_user (auto-création du profil à l'inscription Supabase Auth)
  — les 4 lignes ci-dessus : migration `20260910043205_init_profiles.sql` appliquée le 13/09
  via `supabase db push`, confirmée par `supabase migration list` (local = remote)
- ✅ Connecter Claude Code au projet Supabase via MCP (--read-only + --project-ref) — connecté, vérifié via `claude mcp get` (nécessite une nouvelle session pour être utilisable)

## Étape 3 — Maraudes & équipes
- ✅ Table maraudes (date_heure, statut, manager_id — manager_id doit désigner un profil Manager, jamais Admin, rôles strictement séparés)
- ✅ Table inscriptions_maraude (user_id, maraude_id, statut: inscrit/liste_attente/desiste — une ligne par binôme, désistement = changement de statut, jamais de suppression)
- ✅ Logique liste d'attente automatique (max 6) + promotion auto au désistement
  — triggers `set_inscription_statut` (calcul serveur à l'inscription) et `promote_next_in_waitlist`
  (promotion du plus ancien en attente), migration `20260912120000_maraudes_equipes.sql`
  appliquée le 12/09 via `supabase db push`, vérifiée en base via MCP (lecture seule)
- ✅ Policies RLS (lecture large pour tout authentifié, écriture restreinte : Admin accès complet,
  Manager limité à ses propres maraudes, bénévole limité à sa propre inscription et à un compte `actif`)

## Étape 4 — Sécurité & suivi bénévoles
- ✅ Table meteo_benevole_saisies (maraude_id, user_id, valeur, saisi_par, saisi_le
  — nommée `_saisies` et non `meteo_benevole` : ce nom est déjà pris par l'enum du
  même nom créé à l'Étape 2, conflit de type composite implicite sinon)
- ✅ Policies RLS strictes : lecture réservée Admin + Manager de la maraude concernée
  (jamais le bénévole concerné lui-même, même règle en écriture pour la correction) ;
  écriture (saisie initiale) ouverte en plus au bénévole concerné sur sa propre ligne
  — migration `20260912130000_meteo_benevole.sql` appliquée le 12/09 via
  `supabase db push`, vérifiée en base via MCP (lecture seule)
- ✅ Correctif trigger protect_profile_role_status (bloquait le service_role, cf. Étape 7)
  — migration `20260912140000_fix_protect_profile_role_status_service_role.sql`
- ➡️ Flow de validation manuelle des comptes par un Admin (server action + UI) : déplacé
  à l'Étape 7, juste après l'Auth — dépend d'une session utilisateur réelle pour savoir
  qui est connecté et vérifier que c'est un Admin, impossible à construire avant

## Étape 5 — Logistique repas
- ✅ Table repas (maraude_id, cuisinier_id, quoi, quantité — cuisinier_id doit désigner
  un profil role='cuisinier')
- ✅ Table tickets_depense (maraude_id, user_id, montant, photo_path, statut_remboursement
  — colonne nommée `photo_path` et non `photo_url` : le bucket est privé, il n'y a pas
  d'URL stable, seulement un chemin d'objet + URL signée générée à la demande)
- ✅ Bucket Storage `tickets-depense` (privé, 8 Mo max, images) + policies RLS Storage
  (déposant = propriétaire par le chemin `{user_id}/...`, Trésorier/Admin en plus)
  — migration `20260912150000_logistique_repas.sql`
- ➡️ UI upload photo + saisie repas (mobile-first) : déplacé à l'Étape 7, même raison
  qu'à l'Étape 4 — dépend d'une session utilisateur réelle, pas encore d'Auth branchée

## Étape 6 — Suivi terrain & cartographie
- ✅ Extension PostGIS activée (schéma `extensions`)
- ✅ Table points_passage (maraude_id, user_id, type_action, compteur, geo_arrondi,
  horodatage — type_action est l'enum type_action_terrain : repas_distribue/
  personne_aidee/orientation_sociale, qui correspond exactement aux 3 KPIs de
  docs/Specs.md)
- ✅ Fonction d'arrondi géographique côté serveur (grille ~100m, projection
  Lambert-93/EPSG:2154) — ET forcée par un trigger (force_geo_arrondi) sur
  TOUTE écriture, quelle que soit la précision envoyée par le client : jamais
  de GPS exact stocké, même en cas de bug ou de client malveillant
  — migration `20260912160000_suivi_terrain.sql`
- ✅ Policies RLS : lecture réservée Admin + Manager de la maraude concernée
  (conforme "Admin/Manager uniquement" de docs/Specs.md) ; écriture ouverte en
  plus au participant qui capture sa propre entrée (compte actif) — nécessaire
  pour la capture en un tap prévue à l'Étape 8, sinon personne ne pourrait
  jamais écrire dans cette table
- ⬜ Capture géoloc en un tap côté client (intégrée à la queue offline, voir Étape 8)

## Étape 7 — UI métier principale (connectée à Supabase)
- ✅ Auth (connexion, inscription, écran "compte en attente de validation")
  - ✅ Socle : @supabase/ssr installé, clients Supabase (browser/server/proxy),
    src/proxy.ts vérifie une vraie session et redirige vers /login si absente
    (testé en local : /dashboard sans session → redirection /login confirmée)
  - ✅ Formulaire de connexion (email/mot de passe, Server Action + useActionState,
    shadcn Input/Label ajoutés) — testé en local contre l'API Supabase Auth réelle :
    mauvais identifiants → message d'erreur générique affiché (jamais "email
    inconnu" vs "mot de passe incorrect", pour éviter l'énumération de comptes)
  - ✅ Formulaire d'inscription (nom, email, mot de passe + confirmation) —
    signup() transmet full_name dans les métadonnées Auth (lu par le trigger
    handle_new_user pour créer le profil, status='en_attente' par défaut) ;
    gère le cas où la confirmation email est activée sur le projet (pas de
    session immédiate → message "vérifiez votre boîte mail" au lieu d'une
    redirection). Validations (champs requis, mot de passe ≥ 8, confirmation)
    testées en local ; la création de compte réelle n'a PAS été testée en
    direct pour ne pas polluer la base Supabase de production avec un compte
    de test (MCP en lecture seule, impossible de le nettoyer après coup) —
    à vérifier manuellement une fois prêt, ou via un compte jetable
  - ✅ Écran "compte en attente de validation" (/compte-en-attente) — DAL
    centralisée (src/lib/supabase/dal.ts, getCurrentProfile()) : /dashboard
    vérifie le statut réel du profil (vérification "secure" contre la base,
    pas juste le cookie du proxy) et renvoie vers /compte-en-attente si
    status ≠ 'actif' ; message différent si 'suspendu'. Testé en local pour
    le cas non connecté (redirection /login confirmée sur les deux routes) ;
    le branchement actif/en_attente réel n'a PAS pu être testé avec un vrai
    compte, faute de compte existant en base et pour la même raison qu'au
    point précédent (pas de compte de test en production)
- ✅ Flow de validation manuelle des comptes par un Admin (server action + UI)
  — déplacé depuis l'Étape 4 (dépendait de l'Auth ci-dessus). Server Action
  validerCompte() : vérifie que l'appelant est bien Admin (seule barrière,
  le client service_role contourne RLS), assigne un rôle et passe le compte
  à 'actif'. UI /dashboard/comptes : liste les comptes en_attente, un
  formulaire (shadcn Select) par compte pour choisir son rôle. Nécessite
  SUPABASE_SERVICE_ROLE_KEY en variable d'environnement serveur (jamais
  commitée, jamais collée dans le chat) — placeholder documenté dans
  .env.local.example, **à ajouter toi-même dans .env.local ET dans les
  variables d'environnement Vercel** avant que ce flow soit utilisable.
  Testé en local uniquement pour le cas non connecté (redirection /login
  confirmée sur /dashboard/comptes) ; le flow complet (Admin réel qui valide
  un compte) n'a pas pu être testé, ni la clé service_role, faute de compte
  de test en production (même réserve que les points précédents)
- ✅ **Correctif critique découvert en testant avec un vrai compte** : les 7 tables
  créées depuis l'Étape 2 avaient RLS correctement configuré mais **aucun GRANT
  Postgres de base pour `authenticated`/`service_role`** — RLS ne sert à rien sans
  ça, résultat "permission denied for table profiles" au premier vrai accès
  authentifié. Cause : `supabase db push` exécute les migrations sous le rôle
  `postgres`, dont les privilèges par défaut sur `public` excluent explicitement
  SELECT/INSERT/UPDATE/DELETE pour anon/authenticated/service_role (contrairement
  aux tables créées via le Dashboard). Corrigé par
  `20260912170000_fix_grants_authenticated.sql` et
  `20260912171500_fix_grants_service_role.sql` (GRANT rétroactif + ALTER DEFAULT
  PRIVILEGES pour que les futures tables n'aient pas le même problème). **Testé
  et confirmé en conditions réelles** : inscription → confirmation email → connexion
  → redirection /compte-en-attente, avec un vrai compte (06aymen.gasmi@gmail.com)
- ⬜ Bootstrap du tout premier compte Admin — aucun compte admin n'existe encore,
  et le trigger protect_profile_role_status bloque même une modification manuelle
  via le SQL Editor du Dashboard (auth.role() y est toujours NULL, jamais
  'service_role' — ce GUC n'est posé que par PostgREST). Un appel direct à l'API
  REST avec la clé service_role (qui passe par PostgREST) fonctionne, lui.
- ✅ Dashboard par rôle (vue Admin/Manager ≠ vue Maraudeur/Cuisinier), remplace les données
  factices du styleguide — layout partagé src/app/(app)/(protected)/layout.tsx (header,
  badge de rôle, bouton déconnexion, lien "Comptes en attente" + compteur pour Admin) ;
  page /dashboard affiche un contenu différent Admin/Manager vs Maraudeur/Cuisinier, sans
  données inventées (les fonctionnalités métier réelles arrivent aux points suivants).
  Testé en local avec le vrai compte de test : header affiché, déconnexion fonctionnelle
- ✅ Inscription à une maraude + visualisation liste/liste d'attente — page
  /dashboard/maraudes : liste les maraudes (compteur inscrits/liste d'attente,
  manager), bouton S'inscrire/Se désister par bénévole (toute la logique de
  capacité reste en base, cette UI ne fait qu'insérer/mettre à jour un statut).
  Admin/Manager peuvent en plus créer une maraude (nécessite un Manager actif
  existant — sinon message explicite plutôt qu'un formulaire cassé). **Testé
  de bout en bout en conditions réelles** avec un 2ᵉ compte de test validé en
  Manager : création de maraude + inscription confirmées (1/6 inscrits), aucune
  erreur

## Refactor — rôles multiples par profil (profile_roles)

Déclenché par un besoin réel identifié en testant l'Étape 7 : une personne peut
cumuler plusieurs rôles (ex. Manager + Cuisinier), et le parcours d'un nouveau
membre est progressif (adhérent au départ, rôles supplémentaires ajoutés par
un Admin au fil de sa validation/implication — vidéo, entretien de motivation).
Un seul champ `profiles.role` ne pouvait pas représenter ça.

- ✅ `profiles.role` (une seule valeur) remplacé par la table `public.profile_roles`
  (plusieurs lignes possibles par profil) — migrations
  `20260912180000_add_roles_adherent_donateur.sql` (ajoute adherent/donateur à
  l'enum user_role, dans une migration séparée car Postgres interdit d'utiliser
  une nouvelle valeur d'enum dans la transaction qui l'ajoute) et
  `20260912180500_profile_roles_refactor.sql` (table, fonction
  `current_user_has_role()` qui remplace `current_user_role()`, ré-écriture de
  toutes les policies RLS/triggers basés sur le rôle depuis l'Étape 2 — 21
  policies + 3 triggers touchés, sur 8 tables). `handle_new_user` attribue
  désormais automatiquement le rôle `adherent` à l'inscription
- ✅ RLS sur `profile_roles` (self lit ses propres rôles, Admin lit/écrit tout)
  remplace nativement l'ancien trigger `protect_profile_role_status` pour la
  partie rôle — plus besoin de trigger dédié, la policy suffit
- ✅ UI /dashboard/comptes : cases à cocher (shadcn Checkbox ajouté) au lieu
  d'un menu déroulant — plusieurs rôles assignables en une fois, avec les
  rôles déjà détenus pré-cochés
- ✅ Le suivi "parcours d'onboarding" (vidéo débloquée, entretien de motivation)
  reste volontairement hors scope ici — sujet à part, pas construit
- **Testé en conditions réelles** : une erreur d'attribution (rôle Admin
  attribué par erreur à un compte de test via l'ancien menu déroulant, avant
  le refactor) corrigée directement en base via l'API service_role ; le
  refactor complet vérifié ensuite avec le flow création de maraude +
  inscription (voir Étape 7 ci-dessus)
- ✅ Saisie météo bénévole en fin de maraude — une seule Server Action
  (saisirMeteo) pour tout le monde : insert d'abord, fallback update en cas de
  conflit (déjà saisie) — la vraie barrière de sécurité reste RLS (seul
  Admin/Manager peut corriger), pas cette fonction. Auto-déclaration inline
  sur /dashboard/maraudes (bénévole inscrit, jamais d'affichage de la valeur
  transmise — write-only par design) ; page dédiée
  /dashboard/maraudes/[id]/meteo pour Admin/Manager de la maraude (seuls à
  pouvoir lire/corriger). **Testé de bout en bout en conditions réelles** :
  saisie self-service confirmée ("Météo transmise, merci."), relecture Admin
  confirmée (valeur correcte affichée et mise en avant), aucune erreur
- ⬜ UI upload photo + saisie repas (mobile-first) — déplacé depuis l'Étape 5, dépend de l'Auth ci-dessus

## Étape 8 — PWA offline-first (synchro réelle)
- ⬜ IndexedDB (Dexie.js) comme file d'attente locale
- ⬜ Background Sync : synchro auto au retour réseau
- ⬜ Intégration avec saisies terrain (repas, points de passage, météo)

## Étape 9 — Reporting & KPIs
- ⬜ Vue agrégée compteurs (repas, personnes aidées, orientations sociales)
- ⬜ Carte heatmap (Leaflet + leaflet.heat, fond OpenStreetMap)
- ⬜ Tracé des circuits (points de passage reliés chronologiquement)
- ⬜ Export tableur (.xlsx/.csv)
- ⬜ Export PDF formaté pour financeurs

## Étape 10 — Site vitrine public
- ⬜ Pages SEO local (accueil, présentation, actions)
- ⬜ Formulaire recrutement bénévoles
- ⬜ Module dons financiers
- ⬜ Module dons matériels

## Étape 11 — Notifications & natif (reporté)
- ⬜ Firebase Cloud Messaging (web push Android)
- ⬜ Empaquetage Android TWA (.apk)
- ⬜ iOS via Capacitor + App Store — reporté, pas de budget pour l'instant
