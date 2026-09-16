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
- ✅ Capture géoloc en un tap côté client (intégrée à la queue offline) —
  /dashboard/maraudes/[id]/points : 3 boutons (repas distribué/personne
  aidée/orientation sociale), navigator.geolocation, bascule en file Dexie
  hors ligne (magasin pendingPointsPassage, même pattern que repas/météo).
  Réservée aux bénévoles inscrits à la maraude + Admin/Manager ; pas de
  liste/compteur affiché (lecture réservée à Admin/Manager par RLS, voir
  Étape 9). **Testé en conditions réelles** (géolocalisation simulée,
  coordonnées de Nice) : capture en ligne confirmée en base avec position
  correctement anonymisée (arrondie par le trigger force_geo_arrondi,
  différente de la position brute envoyée) ; capture hors ligne confirmée
  dans IndexedDB puis synchronisée automatiquement au retour du réseau

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
  - ✅ Case "Se souvenir de moi" — cookie marqueur dédié (abn-remember-me),
    lu par toute écriture de cookie de session (server.ts + proxy.ts) pour
    que chaque rafraîchissement de token respecte le même choix
  - ✅ Connexion Google/Microsoft/Facebook (OAuth) — code générique testé
    (redirection propre jusqu'à Supabase confirmée), mais aucun fournisseur
    n'est encore activé côté Supabase : ça demande de créer une app OAuth
    chez Google/Microsoft/Meta et de coller Client ID + Secret dans le
    Dashboard Supabase. Décision (12/09) : pas de nom de domaine ni d'email
    pro pour l'association pour l'instant, donc les comptes développeur
    OAuth seront créés plus tard sous le nom de l'association (pas sous
    Arqoria, pour éviter d'avoir à tout recréer). Apple reporté (compte
    Apple Developer payant, 99$/an, même décision que pour l'app iOS native)
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
- ✅ UI upload photo + saisie repas (mobile-first) — déplacé depuis l'Étape 5
  (dépendait de l'Auth). Saisie repas (/dashboard/maraudes/[id]/repas) :
  formulaire visible uniquement au rôle Cuisinier, lecture large pour tous
  (RLS Étape 5). Tickets de dépense (/dashboard/maraudes/[id]/tickets) :
  upload photo vers le bucket Storage privé (Server Action reçoit le File
  directement via FormData, convention de chemin {user_id}/{fichier}), liste
  ses propres tickets avec URL signée pour voir la photo. **Testé de bout en
  bout en conditions réelles** : repas ajouté et affiché, ticket envoyé avec
  upload réel d'une image, URL signée générée et vérifiée (image chargée
  correctement, 969×1097px), aucune erreur — Étape 7 entièrement terminée

## Étape 8 — PWA offline-first (synchro réelle)
- ✅ IndexedDB (Dexie.js) comme file d'attente locale — src/lib/offline/db.ts,
  un magasin dédié par type de saisie (pendingRepas pour l'instant)
- 🟨 Synchro auto au retour réseau — **choix d'architecture** : synchro sur
  l'évènement navigateur `online` (src/components/offline-sync.tsx, monté une
  fois dans le layout protégé) plutôt que l'API Background Sync — support
  navigateur de Background Sync trop limité (absent sur iOS Safari, cohérent
  avec la limite iOS déjà notée dans CLAUDE.md), et l'appli reste ouverte
  pendant la maraude donc l'évènement `online` suffit en pratique. Pas de
  synchro en tâche de fond quand l'app est fermée — limite assumée, à
  reconsidérer si le besoin réel apparaît
- ✅ Intégration avec les saisies terrain : **repas, météo, points de passage
  ET tickets de dépense faits et testés** — RepasForm/MeteoForm/
  CapturePointForm/TicketForm basculent en file locale (magasins Dexie
  dédiés pendingRepas/pendingMeteo/pendingPointsPassage/pendingTickets) si
  hors ligne ou si l'appel réseau échoue, message explicite,
  resynchronisation automatique. Pour les tickets, la photo (File) est
  stockée directement en IndexedDB (Blob nativement supporté, pas besoin de
  sérialiser en base64) et reconstruite en File au moment de la synchro.
  Tous testés en conditions réelles (navigator.onLine forcé à false,
  IndexedDB vérifiée, puis évènement 'online' déclenché, IndexedDB vidée et
  donnée confirmée en base à chaque fois — pour les tickets, upload réel de
  la photo vérifié après synchro). **Étape 8 terminée.**

## Ajout — catégorie de dépense (compta)

Besoin exprimé en testant l'Étape 8 : le Trésorier a besoin de classer les
tickets de dépense par catégorie pour la comptabilité, pas seulement un
montant brut.

- ✅ Migration `20260912190000_categorie_depense.sql` : enum
  `categorie_depense` (alimentaire/carburant/materiel/autre), colonne
  `categorie` sur `tickets_depense` (NOT NULL, pas de default — le
  formulaire impose toujours un choix explicite)
- ✅ TicketForm : sélecteur de catégorie ajouté, affichée dans la liste des
  tickets. `CATEGORIE_LABELS`/`CategorieDepense` vivent dans
  `src/lib/categorie-depense.ts` (module neutre, ni "use server" ni
  "server-only") — **piège rencontré** : un fichier `"use server"` ne peut
  exporter QUE des fonctions async ("A 'use server' file can only export
  async functions, found object"), donc ces constantes ne pouvaient pas
  rester dans `src/lib/actions/tickets.ts` ; même famille de bug que
  l'erreur de build server-only déjà rencontrée plus haut — capturé cette
  fois par `npm run build` avant de pousser, pas en production

## Ajout — fonction bureau (Président/Trésorier/Secrétaire)

Question posée en testant l'Étape 9 : faut-il créer 3 rôles à permissions
distinctes pour refléter le bureau de l'association ? **Décision : non.**
Aucune règle métier ne les différencie aujourd'hui (le "Trésorier gère les
tickets" est une habitude organisationnelle, pas une règle système à faire
respecter — n'importe quel Admin doit pouvoir suppléer). Créer 3 rôles RLS
pour zéro bénéfice fonctionnel aurait juste multiplié les policies à
maintenir. Retenu à la place : un champ cosmétique, pas de rôle.

- ✅ Migration `20260912230000_fonction_bureau.sql` : enum `fonction_bureau`
  (president/tresorier/secretaire), colonne nullable sur `profiles` —
  purement informatif, ne conditionne aucune policy RLS ni permission (le
  rôle `admin`, accès plein, reste inchangé). Protégée en self-service par
  le trigger existant `protect_profile_role_status` (même garde-fou que
  pour `status`)
- ✅ Assignable à la validation d'un compte (`ValiderCompteForm`) et
  modifiable ensuite pour un Admin déjà actif (nouvelle section "Bureau" sur
  `/dashboard/comptes`, `BureauForm`) ; affiché en badge dans le header
- Si une vraie règle apparaît un jour (ex. "seul le Trésorier valide un
  remboursement > 200€"), on introduira un vrai rôle à ce moment-là — pas
  avant

## Étape 9 — Reporting & KPIs
- ✅ Vue agrégée compteurs (repas, personnes aidées, orientations sociales) —
  /dashboard/rapports (Admin/Manager, RLS scope automatiquement un Manager à
  ses propres maraudes — aucune logique de scope à écrire côté page), filtre
  de période (formulaire GET natif, pas de JS). Agrège points_passage (pas
  la table repas — ce sont deux tables différentes : repas = traçabilité
  cuisine, points_passage = distribution terrain, c'est ce dernier qui
  alimente les KPIs par conception depuis l'Étape 6). **Testé en conditions
  réelles** : compteurs correspondant exactement aux captures test faites à
  l'Étape 8 (1 repas distribué, 1 personne aidée), filtre de période
  vérifié (0 sur une période sans données)
- ✅ Compteur "personnes rencontrées" — 4e valeur d'enum `type_action_terrain`
  (migration séparée de son usage, obligatoire pour un ajout de valeur enum
  Postgres), 4e bouton de capture terrain, 4e carte KPI sur /dashboard/rapports.
  **Testé** : capture réelle (géoloc mockée), compteur agrégé correct
- ✅ Carte heatmap (Leaflet + leaflet.heat, fond OpenStreetMap) + tracé du
  circuit réel — /dashboard/maraudes/\[maraudeId\]/carte (Admin/Manager pour
  les données détaillées, tout participant inscrit voit la carte). Vue SQL
  `points_passage_geo` (security_invoker, ST_Y/ST_X) pour exposer lat/lng en
  float — PostgREST ne sérialise pas geography en JSON exploitable
  nativement. Heatmap = historique visible par l'appelant (scope RLS déjà en
  place), circuit réel = points_passage de la maraude reliés
  chronologiquement, couleur par type d'action. **Testé en conditions
  réelles** : heatmap affichée, points colorés par type, tooltip horodatage
- ✅ Circuit planifié — le Manager/Admin de la maraude clique une suite de
  points sur la carte (heatmap en fond d'aide à la décision) pour définir
  l'itinéraire prévu avant le départ ; enregistré dans la nouvelle table
  `circuits_planifies` (un circuit par maraude, jsonb ordonné, upsert sur
  maraude_id). RLS : lecture Admin/Manager/participant inscrit, écriture
  Admin ou Manager de cette maraude uniquement — `updated_by`/`updated_at`
  forcés par trigger, même principe que `saisi_par` ailleurs dans le projet.
  **Bug UX corrigé en test** : le zoom molette de Leaflet capturait le scroll
  de la page — désactivé (`scrollWheelZoom={false}`), boutons +/- et pincement
  tactile restent disponibles. **Testé en conditions réelles** : 3 points
  cliqués, enregistrement confirmé en base, persistance vérifiée après
  rechargement de page
- ✅ Dashboard visuel — /dashboard/rapports enrichi : graphique "Dépenses par
  catégorie" (réservé Admin — RLS `tickets_depense` ne donne à un Manager
  que ses propres tickets, un total agrégé serait trompeur pour lui),
  heatmap globale filtrable par type (client-side, sans rechargement) pour
  repérer les zones à couvrir et aider à planifier les circuits. Module
  partagé `src/lib/type-action.ts` (labels/couleurs/ordre des 4 types,
  utilisé aussi par la carte par maraude).
- ✅ **Refonte visuelle** (retour "rendu dégueulasse", 12/09) :
  - Carte remontée juste après les KPI (elle sert activement à planifier
    les circuits, ce n'est pas une curiosité à faire défiler jusqu'en bas) ;
    agrandie (540px), cadrage automatique sur les points réels (`fitBounds`,
    pas un zoom fixe arbitraire qui pouvait couper des données), compteur
    par type dans la légende, popups au clic (pas juste au survol — plus
    fiable au tactile) avec date/heure
  - "Activité par jour" passé de barres empilées à 4 courbes distinctes —
    un empilement rend impossible de suivre un seul type dans le temps (sa
    bande "flotte" à une hauteur de base différente chaque jour)
  - KPI cards réorganisées en grille 2×2 (mobile) / 4 colonnes (desktop)
    avec bande de couleur, plus compactes
  - **Testé en conditions réelles** : carte cadrée correctement sur les 5
    points de test, popup avec détail au clic, courbes lisibles avec
    tooltip multi-séries, rendu vérifié en mobile (375px)
- ✅ **Orientation vers qui** (retour utilisateur, 12/09) — une orientation
  sociale ne disait pas vers quel organisme. Migration
  `20260912250000_orientation_vers.sql` : enum `organisme_orientation` (18
  valeurs : 115, CCAS, CCAS 15e corps, Croix-Rouge, Secours Catholique,
  Restos du Cœur, Emmaüs, Douche municipale, Autre maraude, Médecins Sans
  Frontières, COVIAM, France Services, MSD, CSAPA, CAARUD, Halte de nuit,
  CHRS, Autre), colonnes `orientation_vers`/`orientation_vers_autre` sur
  `points_passage` avec 2 contraintes CHECK (cohérence avec type_action,
  "Autre" impose un texte libre non vide) — défense en profondeur, jamais
  de confiance dans la seule validation cliente. Capture terrain :
  exception délibérée au principe "un tap = une action" — le bouton
  "Orientation sociale" ouvre un petit panneau (Select organisme + texte
  libre si "Autre") avant de capturer la position, les 3 autres boutons
  restent un tap direct. Nouveau graphique "Orientations par organisme"
  (barres horizontales, triées par fréquence) + nouvelle feuille dans
  l'export .xlsx + destination affichée dans les popups de la heatmap et
  les tooltips du circuit réel par maraude. **Testé en conditions
  réelles** : capture avec organisme nommé et avec "Autre" + texte libre,
  contraintes CHECK vérifiées en base, graphique et export corrects
- ✅ Export tableur (.xlsx) — bouton "Exporter" sur /dashboard/rapports,
  route `/dashboard/rapports/export` (Route Handler et non Server Action :
  seule une Route Handler peut renvoyer un fichier binaire avec ses propres
  en-têtes HTTP Content-Type/Content-Disposition pour déclencher le
  téléchargement). Génère un classeur `exceljs` à 2 feuilles (Compteurs,
  Activité par jour) ou 3 pour un Admin (+ Dépenses par catégorie), même
  période filtrée que la page, même agrégation (extraite dans
  `src/lib/rapports.ts`, partagée avec la page — jamais de divergence entre
  ce qui s'affiche et ce qui s'exporte). Alimente le template de rendu final
  (Canva/Gamma, hors périmètre applicatif). **Bibliothèque `xlsx` (SheetJS)
  écartée** : vulnérabilité connue sans correctif (CVE liées au parsing,
  nettement moins un risque ici puisqu'on ne fait qu'écrire — mais autant
  éviter le bruit sur un dépôt public) — `exceljs` utilisé à la place.
  **Testé en conditions réelles** : fichier généré et vérifié (contenu du
  classeur inspecté), 2 feuilles pour Manager, 3 pour Admin (Dépenses en
  plus), valeurs correctes
- 🚫 Export PDF formaté pour financeurs — **hors périmètre** : le rendu
  final pour les financeurs se fera via un template Canva/Gamma, alimenté
  par l'export tableur ci-dessus (décision utilisateur, 12/09)
- ✅ **Besoins signalés** (retour utilisateur, 12/09 : "anticiper les besoins
  remontés par les bénévoles pour mieux ajuster les achats") — un
  bénévole/maraudeur peut signaler un manque matériel observé (couvertures,
  vêtements chauds, hygiène, nourriture spécifique, autre), distinct des
  points_passage (actions envers des personnes, pas besoins matériels de
  l'équipe). Migration `20260912260000_besoins_signales.sql` : table
  `besoins_signales` (categorie, commentaire facultatif), `user_id` forcé
  côté serveur par trigger, garde-fou d'inscription à la maraude (avec
  exemption Admin/Manager, plus permissif que le même garde-fou sur
  points_passage — volontaire, un besoin matériel n'a pas besoin de la même
  rigueur qu'une action terrain géolocalisée). RLS lecture : Admin, tout
  Manager (même raisonnement que la heatmap), ou participant inscrit à
  cette maraude (voir ce qui est déjà signalé, éviter les doublons).
  Nouvelle page `/dashboard/maraudes/[id]/besoins` (formulaire "un tap = un
  signalement" + liste), nouveau graphique "Besoins signalés" sur
  /dashboard/rapports, nouvelle feuille dans l'export .xlsx. **Testé en
  conditions réelles** : signalement avec et sans commentaire, `user_id`
  vérifié forcé en base, graphique et export corrects

## Étape 10 — Site vitrine public
- 🟨 Pages SEO local (accueil, présentation, actions) — **accueil v1 minimale
  livrée** (13/09), **refonte v3 livrée** (14-15/09, branche
  `feat/accueil-v3` — **PAS ENCORE mergée sur `main`**, à valider/merger en
  prochaine session) :
  - Hero 2 colonnes avec vraie photo d'équipe (récupérée par le client sur
    l'Instagram de l'asso, `@labnice06`, triée à la main — ~30 photos
    passées en revue, la plupart écartées : hors-sujet, visage de
    bénéficiaire identifiable, ou visuel promo avec texte incrusté)
  - Texte du hero fourni par le client : slogan "Aller à la rencontre.
    Créer du lien. Agir." + texte "Depuis 2014..." — non vérifié
    indépendamment par nous (date de création, cadence)
  - Bandeau chiffres clés (fond photo Promenade des Anglais) : bénévoles
    actifs + maraudes réalisées + repas distribués = compteurs RÉELS et
    LIVE (vue `impact_public`, migration `20260913060000`) — actuellement
    3 / 0 / 60 (données de test, pas encore de vraie activité)
  - 4 cartes "Nos actions" avec photos (distribution, lien social — visage
    flouté au flou ovale doux, orientation sociale — image générée par IA
    en dernier recours, aucune photo 115 convenable trouvée, action
    humanitaire à l'international)
  - Structure de titres corrigée (H1 = nom asso, H2 = slogan, jamais de
    paragraphe en H3/H4 — accessibilité/SEO)
  - Premiers pas SEO : metadata dédiée (title/description/OG/Twitter),
    JSON-LD Organization (données réelles uniquement), `robots.ts` +
    `sitemap.ts` (rien n'existait avant), `metadataBase` sur l'URL Vercel
    de prod (pas de nom de domaine propre encore)
  - **Connu, pas corrigé** : navbar sans menu hamburger mobile — prend
    ~15% de la hauteur d'écran sur petit mobile, en permanence (sticky).
    À traiter avant de considérer la vitrine vraiment finie
  - **Reste factuel/pas de contenu inventé** : pas de "Présentation"/
    "Actions" dédiées, pas de témoignage, pas de réseaux sociaux, pas de
    mentions légales — attend du vrai contenu de l'association
  - Photo "Musée Masséna" (groupe + prix/médaille) reçue du client,
    mise de côté — provenance/signification pas claire même pour le
    client, prévue pour une future section "À propos"
  - Dossier `photos-instagram/` (gitignore) : zone de dépôt/tri des photos
    brutes récupérées par le client, workflow à réutiliser si besoin de
    nouvelles photos
- ✅ Formulaire recrutement bénévoles — `/recrutement`, table
  `candidatures_benevolat` (RLS : insert ouvert à `anon`, select/update/
  delete réservés Admin), honeypot anti-bot (champ invisible, silencieux si
  rempli). Vue Admin `/dashboard/candidatures` pour traiter les
  candidatures (sinon coincées en base sans aucune UI de lecture) + badge
  de comptage dans le header, même pattern que "Comptes en attente".
  **Testé en conditions réelles** : candidature soumise en anon confirmée
  en base, lecture anon de la table bien refusée (RLS), toggle "traitée"
  fonctionnel
- ⬜ Module dons financiers — bloqué : le Trésorier doit créer le compte
  HelloAsso lui-même (voir la piste technique notée plus haut). Page `/dons`
  déjà prête à accueillir le module, actuellement un simple mailto de
  patience
- ✅ Module dons matériels — `/dons` interroge la vue publique
  `public.besoins_publics` (migration `20260912270000_besoins_publics.sql`,
  agrège les besoins signalés des 30 derniers jours par catégorie, lisible
  sans authentification) : affiche les besoins réels et actuels plutôt
  qu'une liste générique, exactement comme anticipé. **Testé en conditions
  réelles** : lecture anon de la vue confirmée OK

## Diagnostic perf webapp (15/09) — cause racine identifiée : compute Supabase partagé

Retour client "c'est lent partout dans l'espace bénévole", persistant même
après plusieurs passes d'optimisation (fusion de requêtes, parallélisation
— voir commits du 15/09 sur dal.ts, layout protégé, et 5 pages dashboard).

**Investigation menée** (compte de test temporaire créé puis supprimé,
connexion réelle sur `abn-theta-murex.vercel.app` en prod) :
- `curl` détaillé sur `/dashboard/maraudes` authentifiée : DNS+connexion+TLS
  < 100ms cumulés, mais TTFB ~1,4 à 2s — donc pas un souci réseau/navigateur,
  le serveur lui-même met ce temps à répondre.
- Région Vercel (header `x-vercel-id`) : `cdg1` (Paris). Région Supabase
  (`npx supabase projects list`) : `eu-west-3` (Paris aussi). **Écarte
  l'hypothèse de distance géographique** — les deux sont dans la même ville.
- Logs Supabase en direct (`query_logs`, source `edge_logs`) sur un
  chargement de page réel : chaque appel individuel (auth.getUser, requête
  profil, requête maraudes...) prend **250 à 650ms**, alors qu'ils
  s'enchaînent à quelques ms d'écart les uns des autres — anormalement lent
  pour un aller-retour intra-ville (attendu : 10-30ms).

**Conclusion** : le compute **partagé** du plan gratuit Supabase sature sous
charge légère (cohérent avec la doc Supabase elle-même sur les paliers
"Micro" partagés). Ce n'est PAS un problème Vercel (déjà écarté par les
tests précédents — bytecode caching actif en prod, TTFB rapide sur le site
public). Réduire le nombre de requêtes par page (déjà fait, cf. commits
15/09) limite l'impact mais ne peut pas compenser une latence de ~300-600ms
*par appel* imposée par le compute partagé.

**Recommandation pour la suite** : si la réactivité de l'espace bénévole
doit s'améliorer nettement, le levier ciblé est un **palier de calcul dédié
Supabase** (pas Vercel Pro — écarté, ne résoudrait rien ici), typiquement le
palier "Small" (~15$/mois en plus du Pro à 25$/mois). Décision commerciale
à prendre par le client, pas engagée pour l'instant.

**Vérification complémentaire (15/09, suite)** — le client a raison de
douter, donc contre-vérifié plus loin avant de conclure :
- `mcp__supabase__get_advisors` (jamais utilisé avant, aurait dû l'être plus
  tôt) a remonté un vrai défaut de code SQL : 24 policies RLS qui appellent
  `auth.uid()`/`current_user_has_role()`/`current_user_status()` SANS les
  envelopper dans `(select ...)` — Postgres réévalue sinon l'appel à CHAQUE
  ligne scannée au lieu d'une fois par requête (piège très documenté par
  Supabase). Corrigé migration `20260915190000_fix_rls_auth_initplan.sql`
  (`alter policy` sur les 24 + 15 autres policies utilisant les mêmes
  fonctions mais non détectées par le linter textuel) — réécriture
  mécanique par substitution sur le texte exact de `pg_policies`, logique
  strictement inchangée, testé sans erreur.
- **Résultat mesuré après correctif** : quasi nul sur ce projet (`/dashboard
  /maraudes` toujours ~1,4-1,9s de TTFB). Attendu : avec seulement 2-3
  lignes dans les tables de test, il n'y a presque rien à gagner à éviter
  une réévaluation par ligne — ce correctif ne rapporte qu'à partir de
  centaines/milliers de lignes. **Reste une vraie amélioration à garder**
  (utile dès que l'association aura une vraie activité), mais confirme par
  élimination que le compute partagé reste la cause dominante actuelle.
- Région Vercel (`cdg1`, Paris) et région Supabase (`eu-west-3`, Paris)
  confirmées identiques — écarte aussi la distance géographique.
- **Affiné encore (15/09, contre-exemple du client — projet "Probalia",
  même compte Supabase, "semblait rapide")** : 18 appels PostgREST bruts
  chronométrés directement (sans passer par Vercel) — 17 rapides
  (89-257ms), 1 seul pic à 2,4s. Donc pas "le compute partagé est toujours
  lent" mais des **pics de contention occasionnels et imprévisibles**
  (~1 appel sur 15-20). Chaque page protégée enchaînant 3-4 appels
  Supabase d'affilée (identité + profil + données), la probabilité de
  toucher au moins un pic à chaque clic reste élevée même après avoir
  réduit le nombre d'appels — d'où la lenteur ressentie systématiquement
  alors qu'un appel isolé est presque toujours rapide.

**Piste alternative identifiée (15/09, fin de session)** — le client
précise que Probalia charge les données sur l'appareil puis synchronise en
arrière-plan (pattern local-first), pas un simple aller-retour serveur à
chaque navigation comme ABN actuellement. Vérifié : l'infra offline déjà
présente dans ABN (`src/components/offline-sync.tsx`,
`src/lib/offline/sync.ts`, IndexedDB via Dexie) ne couvre QUE le sens
écriture (file d'attente des saisies terrain hors-ligne : repas, météo,
points de passage, tickets) — **rien côté lecture**, chaque page du
dashboard va chercher ses données fraîches à chaque clic, aucun cache
local.

⬜ **Chantier à scoper sérieusement en prochaine session** (pas engagé
maintenant, trop gros pour une fin de session) : cache local en lecture
pour les pages dashboard (chargement instantané depuis l'appareil,
synchronisation en fond) — cohérent avec la philosophie offline-first déjà
actée du projet, mais touche quasiment toutes les pages protégées et
demande une vraie stratégie de fraîcheur/invalidation (particulièrement
pour les données sensibles au temps réel : inscriptions, météo bénévole).
Alternative plus rapide mais avec coût récurrent : palier de calcul dédié
Supabase (~40$/mois, voir ci-dessus) — les deux pistes ne s'excluent pas,
mais à ne pas mener en parallèle sans clarifier la priorité avec le client.

**✅ Preuve de concept testée en vraie production (15/09)** — cache local
en lecture (IndexedDB/Dexie, stale-while-revalidate) implémenté sur une
seule page (`/dashboard/maraudes` uniquement) : `src/lib/offline/db.ts`
(store `pageCache`), `src/app/api/maraudes/route.ts` (Route Handler qui
réexpose la même logique/RLS que l'ancienne page 100% serveur),
`src/app/(app)/(protected)/dashboard/maraudes/maraudes-client.tsx`
(Client Component : affiche le cache local instantanément si présent, va
chercher les données fraîches en fond, remet à jour le cache). Mergé sur
`main` et testé avec un compte de test temporaire (créé puis supprimé
après coup, même méthode que les diagnostics précédents). Mesures réelles
(`performance.getEntriesByType('navigation')`) :
- **Premier chargement de la page (pas encore de cache)** : coquille de
  page (vérification de session) ~2,2s de TTFB, page "chargée" à ~2,5s,
  PUIS l'appel `/api/maraudes` démarre seulement à ce moment-là (séquentiel,
  après le montage du composant client) et prend encore ~1,5s de plus →
  **~3,9s avant de voir les vraies données**. C'est légèrement PIRE qu'avant
  (un seul aller-retour serveur), car on a maintenant deux allers-retours
  l'un après l'autre au lieu d'un seul.
- **Deuxième visite (cache déjà présent depuis la 1ère visite)** : coquille
  de page toujours ~1,6s de TTFB (inchangé — c'est `getCurrentProfile()`
  côté serveur, la vérification de session, qui ne peut pas être mise en
  cache côté client), mais la liste des maraudes s'affiche quasi
  immédiatement au montage (depuis IndexedDB, avant même que l'appel réseau
  de rafraîchissement ne parte) au lieu d'attendre l'appel réseau
  supplémentaire → **les données visibles ~1,8s au lieu de ~3,9s, soit un
  vrai gain perçu d'environ 2 secondes, mais uniquement à partir de la 2e
  visite sur cette page précise**.
- **⚠️ Correction (16/09) — méthodologie invalide, ne pas se fier aux
  chiffres ci-dessus** : cette mesure est basée sur **un seul essai** par
  condition (1 chargement "sans cache", 1 chargement "avec cache"). Or le
  diagnostic précédent (voir plus haut) a établi que les appels Supabase
  ont des pics de contention aléatoires (~1 appel sur 15-20 tombe à
  ~2,4s au lieu de ~150ms) — l'écart observé entre les deux essais (1,6s
  vs 2,2s de TTFB sur la coquille de page, qui elle n'est PAS affectée par
  le cache) est **cohérent avec du simple bruit de mesure** (un essai qui
  tombe sur un pic, l'autre non), pas forcément avec un effet réel du
  cache. Le "gain perçu d'environ 2 secondes" annoncé initialement n'est
  donc **pas fiable** — il aurait fallu plusieurs dizaines d'essais dans
  chaque condition pour trancher. Ça ne remet pas en cause la décision de
  revenir en arrière (voir ci-dessous) — au contraire, ça confirme qu'on
  n'a jamais eu de preuve solide que le cache apportait un vrai bénéfice.
- Généraliser ce pattern à tout le dashboard aurait de toute façon demandé
  de dupliquer cette logique (Route Handler + Client Component + gestion
  cache) sur chaque page protégée, avec une vraie stratégie de fraîcheur
  pour les données sensibles au temps réel (inscriptions, météo bénévole).

**Décision du client (15/09)** : revenu en arrière (`git revert`,
commit `2ddeee5`) — `/dashboard/maraudes` est repassée en 100% serveur.
Piste conservée ici pour référence si le sujet est repris plus tard (avec
cette fois une vraie méthodologie multi-essais si on veut la retester) ;
alternative palier Supabase dédié toujours ouverte, à trancher avec le
client le moment venu.

**Suite (16/09)** — le client demande comment identifier l'origine réelle
du ralentissement, notamment via une comparaison directe avec le projet
Probalia (accès repo + configuration Supabase). Voir plan d'investigation
plus bas dans la conversation / prochaine session : commencer par comparer
le **palier de calcul Supabase** des deux projets (vérification à 2 minutes,
avant tout accès élargi) — si Probalia tourne sur un palier payant/dédié,
ça expliquerait la différence perçue sans qu'aucune architecture
particulière ne soit en cause.

## Étape 10bis — Refonte UI des espaces par rôle (après OAuth, avant Étape 11)
- ⬜ Pages Maraudeur, Cuisinier, Admin, Manager — actuellement fonctionnelles
  mais visuellement "cartes + boutons en vrac" (dixit client, 15/09) :
  besoin d'une vraie structure/hiérarchie visuelle par rôle, pas de
  nouvelle fonctionnalité, du réagencement/design
- ⬜ Pages détail pour les cartes "Nos actions sur le terrain" (site
  vitrine) — une page dédiée par action (distribution, lien social,
  orientation sociale, action humanitaire), à commencer par celle où le
  client a déjà le plus de contenu réel plutôt que les 4 en même temps —
  risque de contenu creux si on se précipite sur les 4, voir échange du
  15/09. Objectif SEO (pages ciblables individuellement) + crédibilité
  auprès des financeurs. Même règle que le reste du site : contenu réel
  fourni par le client, jamais inventé. Matière déjà donnée par le client
  (15/09) :
  - **Distribution alimentaire** : finalement prévu directement sur la
    landing page (pas de page dédiée) — préciser que ce sont les
    bénévoles eux-mêmes qui, grâce aux dons reçus, préparent les repas
    chaque vendredi
  - **Action humanitaire** : deux actions réelles à documenter — un
    voyage/action pour des migrants à Vintimille, et un puits construit
    au Sénégal (correspond aux photos écartées lors du tri initial,
    voir plus haut — elles redeviennent utilisables pour CETTE page,
    dans leur vrai contexte)
  - **Orientation sociale** : pas encore de chiffres, mais le client peut
    déjà nommer les structures/acteurs vers qui l'association oriente le
    plus souvent — à demander au moment de rédiger cette page
  - **Lien social et écoute** : client encore en train de se renseigner
    en interne sur les projets/contenu à mettre — pas de matière pour
    l'instant, attendre son retour avant d'attaquer cette page

## Étape 11 — Notifications & natif (reporté)
- ⬜ Firebase Cloud Messaging (web push Android)
- ⬜ Empaquetage Android TWA (.apk)
- ⬜ iOS via Capacitor + App Store — reporté, pas de budget pour l'instant

## Piste — Module dons financiers via HelloAsso (mis de côté, pour l'Étape 10)

Recherché le 12/09 (voir sources dans la conversation) :
- **Gratuit pour l'association** : HelloAsso ne prélève aucune commission sur
  les dons — financé par une contribution volontaire demandée au donateur
  (modifiable/refusable), donc 1€ donné = 1€ reçu.
- **Bouton "Financer une maraude"** : faisable via une **cagnotte HelloAsso
  permanente** ("Financez nos maraudes"), pas une cagnotte par maraude
  (charge admin récurrente pour peu de bénéfice) — mise à jour périodique
  (photos, montant collecté).
- **Intégration "native"** (demande explicite : pas un truc dégueulasse) :
  HelloAsso Checkout (API, `dev.helloasso.com`) permet de construire NOTRE
  PROPRE formulaire (montant, cause, coordonnées) intégralement dans notre
  charte graphique — seule l'étape finale de saisie carte bancaire passe par
  une page HelloAsso sécurisée (conformité PCI-DSS, non contournable, standard
  même chez Stripe/PayPal/Apple Pay). Flow : POST `/checkout-intents` côté
  serveur (clientId/clientSecret à récupérer dans le back-office HelloAsso,
  jamais en clair dans le chat) → `redirectUrl` reçu → redirection brève pour
  la carte → retour automatique via `returnUrl` + webhook serveur pour la
  validation définitive (jamais se fier aux seuls paramètres côté client).
- **Idée à creuser avec l'association** : filmer les maraudes sur Instagram
  et lier ça à la page de dons — transparence concrète sur la destination
  des dons, bon levier de rétention pour une petite association.
- **Prérequis avant de coder quoi que ce soit** : l'utilisateur doit d'abord
  créer le compte association sur HelloAsso lui-même (création de compte =
  hors de portée de l'assistant) et récupérer clientId/clientSecret.

## Ajout — affectations par maraude (retour utilisateur, 12-13/09)

Observation de départ : le modèle `profile_roles` (voir refactor plus haut)
est global et permanent — un profil "a" le rôle cuisinier jusqu'à ce qu'un
Admin le retire, alors que dans la réalité du terrain on n'est "pas
cuisinier à vie" (la même personne cuisine un soir, fait la maraude un
autre soir, parfois les deux le même soir).

**Décisions tranchées le 13/09** (3 questions posées en fin de session
précédente) :
1. Le rôle global reste un **garde-fou obligatoire** — seul un profil qui
   détient déjà le rôle global correspondant peut être affecté à une
   fonction sur une maraude. Comment on obtient ce rôle global reste hors
   scope ici (aujourd'hui : attribution manuelle par un Admin via
   `/dashboard/comptes` ; l'idée d'un déblocage par mini-formation/quiz est
   notée séparément ci-dessous, pas construite)
2. **Cumul possible** — une personne peut être affectée à plusieurs
   fonctions sur la même maraude (ex. cuisinier ET maraudeur)
3. **Coexiste avec l'existant** — `maraudes.manager_id` et
   `repas.cuisinier_id` restent inchangés (aucune régression) ; la nouvelle
   table sert uniquement de planning/roster ("qui fait quoi ce soir")
4. "CA" (Conseil d'Administration) écarté de `fonction_bureau` pour
   l'instant — l'utilisateur n'est pas certain que l'association ait un CA
   élargi, à reconfirmer avant d'ajouter quoi que ce soit

**Implémenté** :
- Migration `20260913040000_affectations_maraude.sql` : enum
  `fonction_maraude` (cuisinier/maraudeur), table `affectations_maraude`
  (maraude_id, user_id, fonction, `assigned_by` forcé par trigger, unique
  sur les 3 premiers). Trigger `check_affectation_maraude_qualification` :
  vérifie TOUJOURS (même pour Admin/Manager) que `user_id` détient le rôle
  global correspondant (cast `fonction::text::user_role`, les libellés
  cuisinier/maraudeur sont identiques dans les deux enums) + vérifie
  l'inscription à la maraude (avec exemption Admin/Manager-de-la-maraude,
  même principe que `besoins_signales`)
- RLS lecture : Admin, Manager de CETTE maraude (pas tout Manager comme pour
  la heatmap — un roster d'équipe est propre à cette maraude, pas une donnée
  de planification globale), ou participant inscrit. Écriture (insert/
  delete) : soi-même, Admin, ou Manager de cette maraude
- Nouvelle page `/dashboard/maraudes/[id]/equipe` : liste les participants
  inscrits, badge/bouton par fonction qualifiée (auto-affectation en un
  clic pour soi-même, gestion des autres pour Admin/Manager de la maraude) —
  aucun bouton affiché pour une fonction non qualifiée (le garde-fou se
  reflète directement dans l'UI, pas juste côté serveur)
- **Testé en conditions réelles** : auto-affectation cuisinier confirmée en
  base (`assigned_by` correctement forcé au bon profil), retrait confirmé
  (ligne supprimée), badge non affiché pour la fonction maraudeur (non
  qualifié pour ce profil de test)

## Chantier à part — parcours de qualification (mini-formation/quiz)

Idée exprimée le 13/09 en discutant des affectations : débloquer
l'obtention d'un rôle global (ex. Cuisinier) via une mini-formation (quiz,
vidéos) plutôt que uniquement une attribution manuelle par un Admin. Reprend
et précise le "parcours d'onboarding" déjà noté comme hors scope lors du
refactor `profile_roles` (vidéo débloquée, entretien de motivation).
**Ne bloque pas** les affectations par maraude ci-dessus : celles-ci ne
vérifient que la possession du rôle, peu importe comment il a été obtenu.
Sujet à cadrer entièrement à part (contenu de formation, moteur de quiz,
suivi de progression) — pas commencé.

## Reporté — activation OAuth (bien plus lourd que prévu, 13/09)

Code déjà prêt et testé depuis l'Étape 7 (`loginWithOAuth`, boutons Google/
Microsoft/Facebook, callback) — ce qui reste est de la **configuration
externe**, pas du code, mais chaque fournisseur a son propre obstacle
opérationnel découvert en essayant réellement ce matin :

- **Gmail dédié à l'association** créé (`lesangesdelabaiedenice@gmail.com`)
  — ✅ fait, réutilisable pour tout le reste
- **Google Cloud Console** : bloqué en **Testing** (impossible de passer en
  "In production") tant qu'on n'a pas un **nom de domaine possédé et
  vérifiable via Search Console** — `*.vercel.app` est un domaine partagé,
  non vérifiable par nature. Publier en Production demande aussi
  potentiellement une politique de confidentialité publique (donc le site
  vitrine, Étape 10). **Solution qui marche déjà, non testée** : rester en
  Testing et ajouter les bénévoles comme "utilisateurs test" (jusqu'à 100,
  ajout par lot possible) — s'intègre à la validation manuelle des comptes
  déjà en place, mais pas essayé concrètement
- **Microsoft Entra ID** : le provisionnement d'un tenant personnel (via
  Azure, nécessaire après une erreur AADSTS50020 rencontrée en allant
  directement sur entra.microsoft.com avec un compte tout neuf) demande le
  **nom et l'adresse de l'entité légale** — informations que l'utilisateur
  n'est pas autorisé à fournir sans l'accord formel de l'association.
  Reporté explicitement pour cette raison, pas un problème technique
- **Meta (Facebook)** : pas encore essayé du tout

**Prérequis réels avant de reprendre** (à préparer en amont, pas le jour
même) :
1. Nom de domaine acheté (débloque Google Production + est de toute façon
   nécessaire pour l'Étape 10)
2. Accord formel de l'association pour fournir nom/adresse légale (pour
   Microsoft) — à obtenir avant la session, pas pendant
3. Éventuellement une carte (perso ou virtuelle N26/Revolut à plafond bas)
   si la vérification anti-fraude Google/Microsoft revient
