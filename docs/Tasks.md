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
- ✅ Bootstrap du tout premier compte Admin — fait (le trigger
  protect_profile_role_status bloquait la modification manuelle via le
  SQL Editor du Dashboard, auth.role() y est toujours NULL ; contourné
  via un appel direct à l'API REST avec la clé service_role, qui passe
  par PostgREST). Compte réel confirmé actif en production (Aymen
  Gasmi, Trésorier, vu dans le Bureau de /dashboard/comptes) — entrée
  laissée ⬜ par erreur, corrigée le 16/09.
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
  livrée** (13/09), **refonte v3 livrée et mergée sur `main`** (14-15/09,
  commit `d46cde6`) :
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
  - ✅ **Corrigé (16/09)** : navbar sans menu hamburger mobile (prenait
    ~15% de la hauteur d'écran en permanence sur petit mobile). Header
    extrait dans `src/app/(public)/site-header.tsx` (seul Client
    Component de la zone publique, pour le `useState` du menu) — sous
    `sm` (640px), les liens sont repliés derrière un bouton hamburger ;
    au-delà, affichage inline inchangé. Testé en vrai (desktop + mobile
    375px, ouverture/fermeture, fermeture automatique à la navigation) :
    OK des deux côtés, build statique de `/` et `/dons` inchangé (ISR
    toujours actif).
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
Probalia (même compte Supabase, "semblait rapide" selon le client — voir
plus haut). Question ouverte du client : est-ce qu'un accès à Probalia
(repo + config Supabase) et/ou un budget Supabase permettraient de
trancher ? Et est-ce qu'il y a peut-être un lien tout court entre les deux
projets ?

**Confirmé (16/09, capture d'écran du dashboard Supabase d'ABN)** : le
projet ABN tourne sur le palier gratuit **Nano** (pas "Micro" comme
formulé un peu vite plus haut — nom exact du palier par défaut du plan
Free), instance `t3a.nano`, région `eu-west-3` (Paris), confirmé. Charge
observée avec seulement les données de test actuelles : CPU 2%, RAM 60%
(~300 Mo/512 Mo déjà utilisés), disque 14%, 8/60 connexions. Une RAM déjà
à 60% avec quasiment aucune vraie activité est cohérent avec l'hypothèse
des pics de contention (l'instance a très peu de marge). Point important
vu sur ce même écran : l'organisation **Arqoria est elle-même sur le plan
Free** — or chez Supabase, le calcul dédié/payant (Micro/Small/…) doit
être débloqué au niveau de l'organisation (upgrade vers Pro minimum), pas
juste au niveau du projet. **Si Probalia est hébergé sous ce même compte
Arqoria, il est donc probablement lui aussi sur du calcul partagé gratuit
— ce qui écarterait d'emblée "palier différent" comme explication.**

**✅ Étape 1 tranchée (16/09)** : le client confirme que Probalia est
hébergé sous ce même compte/organisation Arqoria. Or l'organisation
Arqoria est sur le plan Free (confirmé sur la capture ABN) — le calcul
dédié/payant se débloquant au niveau de l'organisation chez Supabase (pas
projet par projet), **Probalia tourne donc très probablement lui aussi
sur le palier Nano partagé gratuit, comme ABN**. "Palier de calcul
différent" est donc écarté comme explication (à confirmer visuellement en
un clic si besoin : dashboard Probalia → bloc "Compute" en haut de page,
doit afficher "NANO" comme sur la capture ABN — mais pas bloquant pour
avancer, l'inférence org Free est déjà solide).

**✅ Étape 2 faite (16/09) — résultat : aucune différence détectée côté
Supabase brut.** Test chronométré croisé, appels REST entrelacés
(`GET /rest/v1/`, avec apikey) sur les deux projets, au même moment,
même réseau : 20 échantillons/projet puis 40/projet (120 appels au
total) :
- 20/projet : ABN moyenne 114,6ms (min 82, max 366,7) ; Probalia moyenne
  103,9ms (min 77,4, max 248,5)
- 40/projet : ABN moyenne 88,8ms (min 65,8, max 143,3) ; Probalia
  moyenne 82,9ms (min 58,4, max 114,6)
- **Aucun pic significatif chez aucun des deux projets** sur ces 120
  appels (contrairement au test du 15/09 sur ABN seul qui avait capté 1
  pic à 2,4s sur 18 appels — soit le hasard n'a pas refait tomber la
  dé sur un pic cette fois, soit la charge/contention varie dans le
  temps). Les deux projets se comportent de façon statistiquement
  similaire (écarts de quelques dizaines de ms, dans le bruit normal).
- **Conclusion** : pas de différence mesurable de performance brute côté
  Supabase entre ABN et Probalia aujourd'hui. Cohérent avec le fait
  qu'ils sont sur le même palier gratuit (voir étape 1). **La cause de la
  lenteur ressentie sur ABN n'est donc très probablement PAS le compute
  Supabase lui-même, mais la façon dont le code d'ABN l'utilise** —
  confirme l'intérêt des optimisations déjà faites (réduction des
  allers-retours séquentiels, ISR) et oriente vers l'étape 3 plutôt que
  vers un upgrade payant.

**✅ Étape 3 faite (16/09) — cause racine réelle identifiée, plus une
hypothèse.** Le dépôt Probalia a été retrouvé en local sur la machine
(`C:\Users\a-gas\Documents\Probalia`, un autre projet du même
utilisateur) et son code lu directement — plus besoin de deviner à partir
de sa description.

**Mécanisme réel de Probalia** : c'est une SPA classique (Vite + React +
`react-router-dom`), pas du Next.js server-rendered comme ABN.
- `src/App.tsx` : une seule page HTML chargée au démarrage, toute la
  navigation ensuite se fait côté client (`BrowserRouter`) — zéro
  aller-retour serveur à chaque clic.
- `src/contexts/AuthContext.tsx` : session + profil + rôle chargés **une
  seule fois** au montage de l'appli (`useEffect` deps `[]`), gardés en
  mémoire (React Context) pour toute la durée de la session.
- `src/components/ProtectedRoute.tsx` : le contrôle d'accès à chaque page
  lit ce contexte déjà en mémoire — **aucun appel réseau** à chaque
  navigation.
- Utilise aussi `@tanstack/react-query` (cache de données standard,
  affichage instantané des données déjà chargées pendant la
  revalidation en fond).

**Donc pas du "sync sur l'appareil"/offline-first comme supposé au
départ (pas d'IndexedDB) — plus simple que ça** : Probalia ne revérifie
l'identité/le profil qu'**une fois par session**, alors qu'ABN (Next.js
App Router, Server Components) refait cette vérification **à chaque
navigation**, par construction de l'App Router (chaque route = un
nouveau rendu serveur).

**Sécurité** : le `ProtectedRoute` de Probalia est un contrôle client
uniquement (contournable en théorie) — la vraie barrière est le RLS
Postgres, appliqué quoi qu'il arrive à chaque requête. Donc rapprocher
ABN de ce pattern ne réduirait pas la sécurité réelle des données (RLS
déjà en place sur ABN aussi), seulement la fréquence de re-vérification
de session pour la simple navigation.

**Implication pour ABN** : contrairement à la preuve de concept du 15/09
(hypothèse non vérifiée, mesure ratée), on a maintenant un exemple qui
tourne réellement en production et qui prouve que le pattern fonctionne.
Deux options, à trancher avec le client :
1. **Chantier ciblé** : convertir la zone `(app)/(protected)` (ou au
   moins les pages dashboard les plus visitées) en un sous-ensemble plus
   "SPA-like" — authentifier une fois (contexte client, comme
   `AuthProvider` de Probalia), puis naviguer/charger les données via
   React Query (ou SWR) côté client plutôt que de refaire
   `getCurrentProfile()` côté serveur à chaque clic. RLS reste la
   vraie barrière de sécurité dans les deux cas.
2. **Statu quo** : accepter la latence actuelle (chaque page protégée
   revérifie tout côté serveur), qui a déjà été réduite significativement
   cette session (Promise.all, embeds PostgREST, RLS InitPlan).

Pas engagé pour l'instant — c'est un vrai changement d'architecture pour
la partie protégée du site (pas une petite extension), à scoper
sérieusement si le client choisit l'option 1.

**✅ Vérification en direct tentée (16/09)** — le client a demandé une
confirmation empirique (pas juste la lecture du code) avant d'engager quoi
que ce soit. Serveur de dev Probalia lancé en local
(`C:\Users\a-gas\Documents\Probalia`, `npm run dev`, port 8081) et ouvert
dans le navigateur :
- **Confirmé en direct** : après le chargement initial, cliquer dans
  l'appli (ex. "Accès participant") n'ajoute AUCUNE nouvelle entrée de
  navigation navigateur (`performance.getEntriesByType('navigation')
  .length` reste à 1) — preuve mesurée, pas déduite du code, qu'aucune
  interaction ne déclenche de rechargement de page.
- **Limite non résolue** : pas d'identifiants Probalia disponibles → pas
  pu tester la navigation dans le vrai tableau de bord authentifié (la
  partie la plus comparable à ABN). Testé seulement le comportement
  public (page de connexion + modale d'accès participant).
- **Deuxième limite** : le serveur tournait en mode développement Vite
  (centaines de fichiers non empaquetés servis un par un) — pas
  représentatif de la vitesse réelle en production. Impossible d'en tirer
  un chiffre de vitesse absolu comparable à ABN sur Vercel. Serveur de
  dev arrêté après le test (aucune trace laissée qui tourne).
**✅ Mesure finale faite en vraie production (16/09)** — le client a
fourni l'URL de production de Probalia
(`https://probalia-connect-path.lovable.app/`) + un compte de test
(`test.referent@probalia.fr`, fourni par le client, pas créé par nous —
pas de suppression nécessaire après coup). Connexion réelle, puis script
chronométrant 15 allers-retours entre `/dashboard` et
`/dashboard/participants` (page qui charge de vraies données Supabase à
chaque visite — table de bénéficiaires), mesuré via
`performance.now()` autour du clic + attente que les données réelles
apparaissent dans le DOM (pas juste le changement d'URL) :

| Direction | Moyenne | Min | Max |
|---|---|---|---|
| Vers `/dashboard` (contenu structurel, pas de nouvelle donnée à charger) | 22,8ms | 14,4ms | 33,3ms |
| Vers `/dashboard/participants` (vraies données Supabase à chaque fois) | 166,9ms | 123ms | 264,7ms |

**Comparaison directe avec ABN** (mesures de cette session, même type de
page — chargement de données réelles à la navigation) : ABN tourne
systématiquement entre **~1,6s et ~3,9s** par navigation (TTFB coquille
serveur + éventuelle donnée). **Probalia : 123-265ms pour une page
équivalente avec vraies données, 14-33ms pour une page sans nouvelle
donnée.** Écart d'environ **10 à 20x**.

**Conclusion (avec un niveau de preuve maintenant solide, pas juste une
hypothèse)** : le mécanisme identifié (authentification unique par
session + navigation client + cache de requêtes, vs revérification
serveur complète à chaque clic chez ABN) explique quantitativement
l'écart de vitesse ressenti. Les deux causes concurrentes (palier de
calcul, latence brute Supabase) avaient déjà été testées et écartées aux
étapes 1-2. Il reste toujours une réserve honnête : ce test mesure la
navigation **après connexion réussie**, pas le chargement initial de
l'appli (téléchargement du bundle JS, plus long qu'une simple page
Next.js pour la toute première visite) — mais pour l'usage réel d'un
bénévole qui reste connecté et clique plusieurs fois par maraude, c'est
la partie qui compte le plus.

Plan d'investigation complet (du moins cher/rapide au plus lourd), à
suivre dans l'ordre :

1. **Palier de calcul Supabase, Probalia vs ABN** (2 min, aucun accès à
   débloquer — juste que le client regarde et rapporte). ABN est sur Free
   (compute partagé Micro). Si Probalia est sur un palier payant/dédié,
   ça explique probablement toute la différence perçue, sans qu'aucune
   architecture particulière (cache local, etc.) ne soit en cause — il
   suffirait alors de basculer ABN sur le même palier (~10-40$/mois
   selon le palier, voir tarifs ci-dessus).
2. **Si même palier gratuit des deux côtés** : test chronométré croisé —
   20-30 appels REST bruts sur chaque projet, au même moment, même
   réseau, pour comparer les taux de pics de contention (référence ABN :
   17/18 rapides 89-257ms, 1/18 à 2,4s, voir plus haut). Nécessite l'URL
   du projet Probalia + sa clé `anon`/`publishable` (pas la clé secrète,
   celle-là n'est pas sensible à partager).
3. **Si le comportement brut Supabase est identique des deux côtés** :
   inspection réelle du code Probalia (accès lecture au repo GitHub, ou
   juste les fichiers qui chargent les données) pour vérifier
   objectivement s'il y a un vrai mécanisme local-first/offline-sync, au
   lieu de partir sur une supposition fondée sur la description du client.
4. **Si tout ça ne suffit pas** : accès Supabase MCP en lecture seule sur
   le projet Probalia (nouveau Personal Access Token, nouvelle session
   Claude Code — voir note dans CLAUDE.md, section Accès & sécurité) pour
   regarder ses advisors/logs directement.

Important : upgrader le palier de calcul d'ABN ne réglera le problème QUE
si l'étape 1 confirme que c'est bien le compute la cause — dépenser sans
savoir ne réglera rien si la vraie cause est ailleurs.

⚠️ Rappel important pour la suite : la preuve de concept "cache local"
testée le 15/09 (voir ci-dessus) a été invalidée méthodologiquement (un
seul essai par condition, chiffres non fiables) puis annulée (`git
revert`, commit `2ddeee5`). Ne pas repartir de ces chiffres si le sujet du
cache local est repris — refaire une vraie mesure multi-essais.

### 🟨 Chantier lancé (16/09) — généraliser le pattern "auth unique par session"

Décision du client : attaquer ce chantier en priorité. Contrairement à la
preuve de concept du 15/09 (hypothèse non testée), celui-ci s'appuie sur
le mécanisme réel confirmé chez Probalia (étape 3 ci-dessus) et sur
`@tanstack/react-query`, la même librairie que Probalia utilise avec
succès en production — pas de code de cache fait maison cette fois.

**Fondations posées** (commit `f729839`) :
- `src/components/session-provider.tsx` — contexte client `useSession()`,
  **hydraté depuis le `profile` déjà calculé une fois par le layout
  serveur** (`(app)/(protected)/layout.tsx`) — zéro appel réseau
  supplémentaire au premier chargement, contrairement à Probalia qui
  refait un fetch client. Le layout ne se remontant pas entre deux pages
  du même groupe de routes, ce contexte reste stable pendant toute la
  navigation côté client.
- `src/components/query-provider.tsx` — `@tanstack/react-query`,
  `staleTime: 30s`.
- Sécurité **inchangée** : RLS Postgres reste la vraie barrière sur
  chaque requête, comme avant. Le premier chargement/rafraîchissement
  passe toujours par `getCurrentProfile()` côté serveur (layout).
  Contrepartie assumée et documentée dans le code : un changement de
  rôle/statut par un Admin ne s'applique qu'au prochain rafraîchissement
  complet de la personne concernée, plus au prochain clic (avant :
  quasi-immédiat) — à surveiller si ça pose un problème d'usage réel.

**Page pilote migrée** : `/dashboard/maraudes`
- `page.tsx` réduit à un simple point d'entrée de route (plus aucun appel
  serveur propre à cette page)
- `maraudes-client.tsx` (nouveau) : Client Component, identité via
  `useSession()`, données via `useQuery` + `/api/maraudes`
- `/api/maraudes/route.ts` (recréé) : Route Handler JSON léger, même
  logique/RLS que l'ancienne page 100% serveur — reste protégé par
  `getCurrentProfile()`, c'est la vraie vérification pour CES données,
  juste déplacée d'un rendu de page complet vers un endpoint JSON léger
- Vérification de statut (`compte_en_attente`) faite **côté client** dans
  `maraudes-client.tsx`, pas dans le layout partagé — le layout englobe
  aussi `/compte-en-attente`, y centraliser créerait une boucle de
  redirection. Centraliser proprement = suite possible une fois le
  pattern généralisé à plus de pages.

**✅ Mesure en production (16/09, compte de test créé puis supprimé)** —
test A/B **dans la même session**, en alternant les clics entre la page
pilote et une page pas encore migrée (`/dashboard/comptes`), pour éliminer
la variabilité jour/heure/charge Supabase (12 allers-retours de chaque
côté, marqueur = apparition des vraies données dans le DOM) :

| Page | Moyenne | Min | Max |
|---|---|---|---|
| `/dashboard/maraudes` (migrée) | **291ms** | 233ms | 443ms |
| `/dashboard/comptes` (pas migrée, même session/minute) | 1147ms | 719ms | 2231ms |

**Environ 3,9x plus rapide**, mesuré en conditions réelles, contrôle direct
dans la même session (pas une comparaison avec un autre jour). Reste
~1,7x plus lent que la moyenne mesurée sur une page Probalia équivalente
(167ms, voir plus haut) — écart plausible : le Route Handler
`/api/maraudes` fait quand même un aller-retour serveur (léger, mais réel)
pour la vérification d'identité sur CES données, alors que Probalia
interroge Supabase directement sans cette étape intermédiaire ; à
surveiller mais pas bloquant, l'essentiel de l'écart initial est comblé.

**✅ Généralisé à tout le dashboard (16/09, commit `7fb8df4`)** — décision
du client : enchaîner directement plutôt qu'étaler sur plusieurs sessions
comme envisagé plus haut. Les 11 pages restantes converties au même
pattern que la pilote (page.tsx minimal + Client Component +
`useSession()` + React Query + Route Handler JSON réutilisant la même
logique/RLS que l'ancien Server Component) :
- `dashboard/page.tsx` (accueil), `comptes`, `candidatures`, `rapports`
  (+ filtre de période, adapté en `useSearchParams()` côté client)
- Les 7 sous-pages de maraude : `besoins`, `carte` (la plus lourde —
  heatmap jusqu'à 5000 points), `equipe`, `meteo`, `points` (écriture
  seule, pas de liste), `repas`, `tickets`

**Vérification de statut centralisée** dans un nouveau
`dashboard/layout.tsx` (englobe `/dashboard/*` uniquement, pas
`/compte-en-attente` — sinon boucle de redirection) — une seule fois par
session grâce à `cache()` React, au lieu d'une fois par page comme pour
la pilote initiale.

**Formulaires d'écriture** (valider-compte, bureau, toggle-traitee,
affectation-toggle, météo-admin, besoin, repas, ticket) : ajout de
l'invalidation React Query après soumission réussie — `revalidatePath()`
côté serveur ne rafraîchissait plus rien côté client une fois la donnée
pilotée par React Query.

**Bug préexistant trouvé et corrigé en testant** : les formulaires repas
et tickets n'avaient jamais de champ caché `maraudeId` — `ajouterRepas()`
et `creerTicket()` échouaient donc déjà systématiquement AVANT ce
chantier ("Maraude introuvable"), sans lien avec la migration. Corrigé au
passage (`repas-form.tsx`, `ticket-form.tsx`).

**Testé en local** (compte de test créé puis supprimé) : chaque page
visitée, carte (heatmap Leaflet fonctionnelle), filtre de période testé,
soumission d'un repas testée avec confirmation visuelle immédiate
(invalidation React Query). Build + `tsc --noEmit` propres.

**✅ Écart Probalia fermé (16/09, commit `be8cbf8`)** — le client a
relevé, à juste titre, que l'écart mesuré (1,7x) n'était "pas anodin".
Cause identifiée avec précision : les Route Handlers ajoutaient un aller-
retour serveur superflu (navigateur → Vercel → Supabase → Vercel →
navigateur) pour de la simple lecture protégée par RLS, là où Probalia
appelle Supabase **directement** depuis le navigateur (RLS = seule
barrière de sécurité dans les deux cas, aucune perte de sécurité à faire
pareil). Converti en appel direct (`src/lib/supabase/client.ts`, déjà
présent, jamais branché) pour toutes les pages sauf `rapports` — celle-ci
garde son Route Handler car elle partage sa logique d'agrégation
(`getRapportsData`) avec l'export .xlsx ; la dupliquer côté client aurait
créé un risque de divergence entre les deux, sans bénéfice de vitesse
proportionné (voir échange avec le client, 16/09 — décision explicite de
laisser `rapports` de côté et d'optimiser le reste).

Retire aussi l'état "Chargement…" séparé (rendu `null` pendant le
chargement) — demandé explicitement par le client pour observer la
vitesse brute sans l'interstitiel, avant de décider d'un éventuel
remplacement par des squelettes visuels.

**✅ Squelettes ajoutés (16/09, commit `2625ba1`)** — décision prise
après mesure : le blanc pendant le chargement est remplacé par de vrais
squelettes visuels sur les 10 pages concernées (`src/components/ui/
skeleton.tsx` + `src/components/card-list-skeleton.tsx` génériques,
squelettes sur mesure pour carte/points/rapports). Profité du passage
pour séparer proprement chargement (squelette) et erreur réseau (message
visible) — les deux étaient fusionnés en un seul `return null`.

**Confirmé en production** : indétectable en local (tout est trop
rapide une fois les connexions chaudes — c'est bon signe), mais bien
visible en conditions réelles — détecté à ~348ms après le clic via un
script de sondage (`document.querySelector('.animate-pulse')`) sur la
page carte en production.

**Mesure en production (compte de test créé puis supprimé)** — premier
essai comparant `maraudes` (converti) à `comptes` (converti dans le même
commit) : résultat quasi identique (~290ms des deux côtés), ce qui
**n'infirme pas l'hypothèse mais invalide la méthode de test** — les
deux pages étaient déjà converties, ce n'était plus un vrai A/B. Corrigé
en comparant à `rapports` (seule page restée en Route Handler) :

| Page | Médiane | Moyenne |
|---|---|---|
| `maraudes` (appel direct) | 267,7ms | 318,6ms |
| `rapports` (Route Handler, hors 1 pic à 2,8s) | 410,6ms | 417,6ms |

**~1,5x plus rapide** — confirme l'hypothèse, même si `rapports` charge
davantage de données (graphiques, heatmap complémentaire) donc pas une
comparaison parfaitement égale. Testé en production (dashboard, comptes,
candidatures, maraudes, carte, équipe, météo, besoins, repas avec
soumission réelle, tickets, points) : tout fonctionne, aucune erreur
console.

**Bilan cumulé du chantier perf** : ~1,6-3,9s (état initial) → ~270ms
(page pilote, appel direct) — écart d'environ 10-15x sur les pages qui
en avaient le plus besoin. `rapports` reste volontairement à ~400ms
(Route Handler assumé), déjà une nette amélioration par rapport à l'état
initial du dashboard entier.

### ✅ Correctif (16/09, commit `5dba733`) — déconnexion malgré "Se souvenir de moi"

Signalé par le client : la case "Se souvenir de moi" (400 jours, voir
`src/lib/supabase/remember-me.ts`) ne suffit pas toujours — redemande le
mot de passe. Cause identifiée dans la doc officielle Supabase :
mécanisme de **détection de réutilisation du refresh token** — si deux
rafraîchissements de session se chevauchent en dehors d'une fenêtre de
tolérance de 10s, Supabase révoque **toute la session**, cookie de 400
jours ou pas.

Next.js précharge automatiquement tout `<Link>` visible à l'écran, et
chaque préchargement vers `/dashboard/*` passe par le middleware
(`src/proxy.ts`) qui rafraîchit le token. Avec jusqu'à 7 liens d'action
par carte de maraude affichée + le header toujours monté, plusieurs
rafraîchissements peuvent se déclencher en parallèle — risque accru si
l'un tombe sur un pic de latence Supabase (déjà documenté plus haut,
jusqu'à 2,4s).

**Correctif** : `prefetch={false}` sur tous les liens du dashboard
protégé (en-tête, accueil, maraudes, export rapports) — double
bénéfice : réduit le risque de collision, ET nos pages étant devenues
des coquilles client légères (chantier ci-dessus), le préchargement
n'apportait de toute façon plus grand-chose. Testé en local (navigation
vérifiée, aucune régression — `prefetch={false}` ne change que
l'anticipation, pas le comportement du clic).

⚠️ Correctif qui **réduit la probabilité** du problème sans l'éliminer
totalement (le mécanisme Supabase reste déclenchable dans d'autres
circonstances — plusieurs onglets ouverts, coupure réseau pendant un
rafraîchissement). À surveiller ; repasser dessus si le problème
persiste après ce correctif.

**Vérifications complémentaires (16/09)** :
- **Cookie de session confirmé correct** : testé en conditions réelles
  (compte de test, connexion avec "Se souvenir de moi" coché) — le
  cookie `sb-<ref>-auth-token` a bien une expiration à **400,0 jours**
  exactement (vérifié via `cookieStore.getAll()`, pas juste supposé).
  Écarte l'hypothèse "le cookie lui-même expire trop tôt".
- **Réglages Supabase Auth (dashboard, Authentication → Sessions)
  vérifiés sur ABN** (le client a d'abord regardé par erreur sur
  Probalia, mêmes réglages puisque même compte/plan Arqoria Free — puis
  reconfirmé sur ABN directement) :
  - Time-box user sessions / Inactivity timeout : à "0 / jamais",
    **grisés, réservés au plan Pro** — le plan Free actuel ne permet
    même pas de les activer. **Écarte définitivement l'hypothèse d'une
    coupure automatique par inactivité.**
  - "Detect and revoke potentially compromised refresh tokens" :
    **activé** — confirme que le mécanisme de détection de réutilisation
    de jeton (cause retenue) est bien actif sur le projet.
- Fait notable : Probalia a exactement les mêmes réglages activés, mais
  ne semble pas souffrir du même problème en pratique — cohérent avec
  son architecture (un seul rafraîchissement propre par session, géré en
  tâche de fond par le SDK, plutôt que N rafraîchissements déclenchés par
  navigation comme ABN avant le correctif prefetch).
- **Décision** : ne pas désactiver "Detect and revoke..." pour
  contourner le problème — c'est une vraie protection contre le vol de
  session, la désactiver a un coût de sécurité réel. Observer l'usage
  réel après le correctif prefetch avant d'envisager d'y toucher (bug
  intermittent par nature, difficile à confirmer "réglé" en une seule
  session de test).

### ✅ Vraie cause trouvée et corrigée (16/09, commit `425163c`) — "je dois retaper mon mot de passe"

Le client a précisé le scénario exact : même sur ordinateur (Chrome), en
étant déjà connecté, ouvrir un nouvel onglet vers le site atterrit sur la
page d'accueil publique, et il fallait retaper le mot de passe. Ça a
permis de trouver la **vraie** cause, différente de la collision de
rafraîchissement de jeton (qui reste une amélioration légitime mais
n'était pas le problème principal) :

**`/login` et `/signup` ne vérifiaient jamais si une session valide
existait déjà** — le formulaire s'affichait systématiquement, même avec
un cookie de session parfaitement valide (confirmé à 400 jours la
veille). Donc rouvrir `/login` (nouvel onglet, lien "Espace bénévole"
depuis le site public, etc.) réaffichait toujours un formulaire vide,
même connecté — donnant l'impression d'être déconnecté alors que la
session n'avait jamais expiré.

**Correctif** : `/login` et `/signup` sont devenues des Server Components
qui vérifient la session (`getUser()`) et redirigent vers `/dashboard` si
un utilisateur existe déjà ; le formulaire lui-même déplacé dans
`login-client.tsx` / `signup-client.tsx` (inchangés sinon).

**Changement demandé en plus** : `start_url` du manifest PWA passé de
`/` à `/login` — l'icône installée sur l'écran d'accueil sert
maintenant l'espace bénévole directement (qui redirige vers `/dashboard`
si déjà connecté, affiche le formulaire sinon) plutôt que la vitrine
publique. La navigation normale du site via un navigateur classique
n'est pas affectée.

**Testé en local** (compte de test créé puis supprimé) : connexion, puis
navigation vers `/login` dans le même onglet ET dans un nouvel onglet →
redirection immédiate vers `/dashboard` confirmée dans les deux cas.
Build propre. **Confirmé en production** (compte de test) : navigation
vers `/login` déjà connecté → redirection immédiate vers `/dashboard`.

### ✅ Correctif (16/09, commit `42e18c9`) — premier chargement de Rapports & KPIs long

Retour client : premier chargement de `/dashboard/rapports` vraiment
long. Cause trouvée dans `src/lib/rapports.ts` (jamais revu pendant le
chantier perf — volontairement laissé en Route Handler pour sa logique
partagée avec l'export .xlsx, mais son contenu interne jamais audité) :
3 requêtes indépendantes (`points_passage_geo` jusqu'à 5000 lignes,
`tickets_depense`, `besoins_signales`) s'enchaînaient en **série** au
lieu d'être lancées en parallèle — même défaut déjà corrigé partout
ailleurs cette session. Regroupées dans un seul `Promise.all`.

**Vérifié directement dans les logs Supabase** (`query_logs`, pas
juste supposé) : les 3 requêtes partent maintenant à moins de 10ms
d'écart les unes des autres (ex. `20:06:05.974/.980/.981`) — contre
300-650ms d'étalement dans les entrées de logs antérieures au
déploiement (comportement séquentiel de l'ancien code). Confirme que le
correctif est bien effectif.

⚠️ **Mesure de temps total non concluante ce jour-là** : le temps agrégé
côté client mesuré juste après (~700-900ms) semblait plus élevé que
l'ancienne référence (~410ms) — mais `maraudes` (page déjà optimisée,
non touchée aujourd'hui) était **elle aussi** plus lente que sa mesure
de la veille (356ms vs 267ms) au même moment, signe d'une charge
Supabase ambiante plus élevée ce jour-là, pas d'un échec du correctif.
Comparer un temps agrégé mesuré à un autre moment n'est pas fiable (déjà
appris plus haut dans ce document) — la preuve retenue est celle des
horodatages de requêtes, pas le chiffre total.

## Étape 10bis — Refonte UI des espaces par rôle (après OAuth, avant Étape 11)

**🟨 Chantier lancé (16/09)**, on commence par Rapports & KPIs.

- ✅ **Rapports & KPIs** (16/09, commits `5749e1c` puis `fc44fc5`) —
  regroupée en 4 sections repliables (`rapport-section.tsx`, pas de
  nouvelle dépendance) :
  - **Vue d'ensemble** (icône Gauge) — les 4 chiffres clés
  - **Terrain** (icône MapPin) — carte (heatmap) + activité par jour +
    orientations par organisme. De loin la plus lourde (jusqu'à 5000
    points) : ses composants (Leaflet, graphiques) ne sont montés qu'à
    l'ouverture, pas au premier affichage. Seule la heatmap est
    filtrable par type — précisé explicitement dans le texte pour ne
    pas laisser croire que l'activité par jour et les orientations
    suivent le même filtre
  - **Besoins matériels** (icône Package)
  - **Finances** (icône Wallet, Admin seulement) — passée d'un
    histogramme à un **camembert** (retour client : varier le style
    entre sections, pertinent ici car on regarde une répartition d'un
    tout entre 4 catégories)
  - **Toutes fermées par défaut** (retour client, après un premier
    essai avec certaines ouvertes) — sinon on retombe sur le même
    problème visuel qu'avant. Chaque section reste identifiable même
    repliée grâce au pictogramme
  - **Portée réelle du gain, à ne pas surestimer** : les 4 catégories
    viennent toujours d'un seul appel `/api/rapports` (pas scindé) — le
    gain porte sur le coût de **rendu** (DOM/JS, Leaflet notamment) au
    premier affichage, pas sur le volume réseau téléchargé
  - Testé en local (compte de test créé puis supprimé) à chaque étape :
    les 4 sections fermées au chargement avec pictogrammes visibles,
    Terrain et Finances ouvertes et vérifiées (camembert + légende,
    heatmap + graphiques fonctionnels)
  - Piste notée mais **pas engagée** : `totals`, `activiteData` et
    `orientationsData` sont calculés en JS à partir des 5000 lignes
    brutes de `points_passage_geo` — une vraie agrégation côté base
    (vue SQL ou RPC) donnerait les mêmes chiffres pour une fraction du
    poids réseau. À faire si le lazy-loading seul ne suffit pas.
  - **✅ Deux correctifs supplémentaires (16/09, commit `c09bd57`)** :
    - Le squelette de chargement affichait encore l'ancienne mise en
      page "tout ouvert" (gros blocs pleine hauteur), plus du tout
      représentatif après le passage aux 4 sections fermées par
      défaut — remplacé par des squelettes courts de la même hauteur
      qu'une section fermée
    - Les 4 courbes d'"Activité par jour" s'entremêlaient, illisibles
      ensemble — ajouté un filtre par type (mêmes cases à cocher +
      pastille de couleur que la heatmap, `Set` indépendant, purement
      client), remplace l'ancienne légende recharts qui ne permettait
      pas d'isoler une courbe. Testé : décocher un type fait
      disparaître sa courbe en laissant les autres lisibles.
- ✅ **Espace vertical sous le header réduit (16/09, commit `0af019a`)**
  — retour client : "entre la barre bleu en haut et le debut du texte,
  il y a un espace de quelques centimetre inutile". `py-16` (haut ET
  bas, 64px) était copié-collé comme padding du conteneur principal sur
  ~20 pages, dashboard et site public confondus. Remplacé par
  `pt-8 pb-16` (haut divisé par deux, bas inchangé pour ne pas resserrer
  le bas de page) partout où le motif était un simple `py-16` ; les
  sections hero du site public en `lg:py-24` (page d'accueil, dons,
  recrutement) passent en `lg:pt-12 lg:pb-24`, même logique appliquée
  au breakpoint large. Testé en local (compte de test créé puis
  supprimé) : page d'accueil publique, `/login`, dashboard et
  `/dashboard/rapports` — écart visuel net, rien de cassé.
- ✅ **Comptes en attente + Candidatures fusionnés en "Gestion des
  adhérents" (17/09, commit `7a26fa1`)** — retour client : la carte du
  dashboard devient "Gestion des adhérents", et "Comptes en attente"/
  "Candidatures" quittent la barre bleue (visible sur CHAQUE page
  protégée) pour vivre à l'intérieur de la page elle-même.
  - Nouvelle route `/dashboard/adherents` (remplace `/dashboard/comptes`
    et `/dashboard/candidatures`) avec 3 sections repliables (même
    pattern que Rapports & KPIs) : Comptes en attente, Candidatures,
    Bureau — toutes fermées par défaut
  - `rapport-section.tsx` devient `components/collapsible-section.tsx`,
    généralisé (plus rien de spécifique à Rapports dans son code) et
    réutilisé par les deux pages
  - La barre bleue ne fait plus les 2 requêtes de comptage
    (`comptesEnAttenteCount`, `candidaturesEnAttenteCount`) à chaque
    navigation pour un Admin — le compteur combiné vit désormais sur la
    carte "Gestion des adhérents" du dashboard (`fetchAdherentsSummary`)
  - Testé en local puis en prod (comptes de test créés/validés/supprimés
    à chaque fois) : les 3 sections s'ouvrent et se peuplent
    correctement, la validation d'un compte en attente le fait
    disparaître de la liste sans recharger la page
  - ⚠️ Piège rencontré pendant le test : l'outil de capture d'écran du
    navigateur intégré a parfois affiché une image figée (bouton
    "Valider le compte" cliqué, compte toujours visible) alors que la
    base et le DOM réel (vérifiés via `get_page_text`/`read_page` et une
    requête directe en base) étaient déjà à jour — un artefact de
    l'outil de test, pas un bug de l'appli. À garder en tête pour éviter
    de chasser un faux bug : en cas de doute sur un rafraîchissement qui
    semble ne pas se produire, vérifier via le DOM/texte réel avant de
    conclure, pas seulement via une capture d'écran.
- ✅ **Coquille "Cotisations" ajoutée à Gestion des adhérents (17/09,
  commit `f7bd5ba`)** — question client : la gestion des cotisations
  (HelloAsso) peut-elle être gérée depuis cette page ? Réponse : oui,
  techniquement, via l'API HelloAsso (liste des adhésions d'un
  formulaire, qui a payé/quand/combien). Décision client : "on fabrique
  la coquille, on fera le branchement en même temps que OAuth, etc." —
  4ᵉ section (icône CreditCard) entre Candidatures et Bureau, texte
  d'attente uniquement, aucun appel réseau. Le vrai branchement
  (webhook + table Supabase, ou appel direct à l'API à chaque
  ouverture — à trancher le moment venu) est regroupé avec les autres
  tâches "carte bancaire" (OAuth, nom de domaine).
- ✅ **Section "Membres" — gestion des rôles (17/09, commit `eb2d90a`)** —
  demande client : pouvoir gérer les rôles (Cuisinier, Admin, Manager,
  etc.) des membres, pas seulement à la validation du compte. Nouvelle
  5ᵉ section (icône Users) entre Comptes en attente et Candidatures :
  liste tous les membres actifs, mêmes cases à cocher que la validation
  de compte, une nouvelle Server Action `modifierRoles`
  (`lib/actions/comptes.ts`) calcule le diff (rôles ajoutés/retirés)
  plutôt que tout supprimer-réinsérer.
  - **Garde-fou** : un Admin ne peut pas retirer son propre rôle Admin
    depuis ce formulaire (case décochée + désactivée côté UI, ET
    vérification serveur indépendante dans `modifierRoles` — l'UI seule
    ne suffit jamais, voir le commentaire dans validerCompte). Un champ
    caché force "admin" dans les données soumises pour son propre profil
    puisqu'une case à cocher désactivée n'est pas envoyée par le
    navigateur avec le formulaire.
  - Testé en local : ajout du rôle Cuisinier à un membre existant déjà
    Maraudeur confirmé en base (les autres rôles n'ont pas bougé), case
    Admin bien désactivée/cochée pour le compte connecté.
- ✅ **Gestion des stocks + Gestion des cuisines (17/09, commit `202be43`)**
  — nouvelle demande client, depuis l'accueil (à côté de Gestion des
  adhérents/maraudes/Rapports & KPIs) : "gestion des stocks (couvertures,
  vêtements, kits d'hygiène) et gestion des cuisines (dons de plats/snacks,
  denrées alimentaires)". Scoping fait via 3 questions avant de coder
  (niveau de suivi, périmètre cuisine, permissions) :
  - **Stocks (matériel)** — quantités réelles avec mouvements (pas juste
    un signalement comme `besoins_signales`) : nouvelle table
    `stock_materiel_mouvements` (categorie réutilise l'enum
    `categorie_besoin`, quantite signée +/-, maraude_id optionnel), stock
    actuel = somme des mouvements (agrégé côté client, pas de vue SQL —
    volume faible, même choix que pour les rapports). Page
    `/dashboard/stocks` : totaux par catégorie, formulaire
    Entrée/Sortie, historique.
  - **Cuisines** — les 2 usages demandés, dans une page
    `/dashboard/cuisine` à 2 sections repliables (même pattern que
    Rapports/Adhérents) :
    - **Dons ponctuels** — table `dons_ponctuels`, maraude_id
      **obligatoire** (contrairement au stock) : objectif explicite du
      client, "ne pas qu'un cuisinier de l'asso fasse un repas de son
      côté" — un don déjà enregistré pour une maraude doit être visible
      avant de cuisiner en double.
    - **Stock de denrées** — table `stock_denrees_mouvements`, même
      principe que le stock matériel mais `nom` en texte libre (une
      denrée alimentaire ne rentre pas dans un enum fixe).
  - **Permissions** : Admin/Manager + Maraudeur (stocks) ou Cuisinier
    (cuisine) en écriture — extension explicitement qualifiée par le
    client d'"initiative perso, pas validée par l'association", avec la
    demande de pouvoir revenir en arrière facilement. Chaque policy RLS
    d'écriture isole cette clause sur sa propre ligne
    (`stock_materiel_insert_admin_manager_maraudeur`,
    `stock_denrees_insert_admin_manager_cuisinier`,
    `dons_ponctuels_insert_admin_manager_cuisinier`) : un retour en
    arrière sera une migration d'une ligne par policy, pas un redesign.
    Lecture large (authenticated) pour toutes ces tables — pas de donnée
    sensible sur des personnes aidées, même raisonnement que `repas`.
  - Migration `20260917100000_stocks_et_cuisine.sql` appliquée en
    production (`supabase db push`) — vérifiée sans nouvelle alerte RLS/
    sécurité via les advisors Supabase après coup.
  - Testé en local (compte de test cumulant Admin+Maraudeur+Cuisinier,
    une maraude de test) : mouvement matériel, don ponctuel et mouvement
    de denrée tous confirmés directement en base après soumission ; page
    correctement inaccessible pour un compte n'ayant aucun des rôles
    autorisés (redirection vers `/dashboard`).
  - ⚠️ **Leçon retenue pendant le test** : un script de nettoyage de
    compte de test avait affiché "cleaned up" sans que la suppression
    ait réellement eu lieu (`deleteUser` sans vérifier l'erreur retournée)
    — a fait croire un instant à un bug de session fantôme dans l'app.
    Toujours vérifier `error` sur `auth.admin.deleteUser`, ne jamais se
    fier à un message codé en dur.
- 🟨 Pages Maraudeur, Cuisinier, Admin, Manager — actuellement fonctionnelles
  mais visuellement "cartes + boutons en vrac" (dixit client, 15/09) :
  besoin d'une vraie structure/hiérarchie visuelle par rôle, pas de
  nouvelle fonctionnalité, du réagencement/design. **Vue Admin traitée
  (24/09), voir ci-dessous** ; Maraudeur/Cuisinier/Manager restent à
  faire.

### ✅ Refonte visuelle — vue Admin (24/09)

Basée sur un état des lieux préalable (inventaire de l'existant, puis
inventaire du contenu de chaque section) — réagencement/design uniquement,
aucune nouvelle fonctionnalité, aucune query ni policy RLS modifiée.

- **Regroupement des 9 boutons plats par maraude** (`maraudes-client.tsx`)
  en 3 `CollapsibleSection` fermées par défaut : **Terrain** (Points de
  passage, Carte, Parcours réel), **Équipe** (Équipe, Météo équipe, Avant
  le départ), **Logistique** (Repas, Tickets, Besoins). Chaque bouton
  garde EXACTEMENT sa condition d'affichage d'origine (aucun changement de
  permission) — une section n'est rendue que si au moins un de ses
  boutons le serait avant regroupement.
- **Nouvelle page `/dashboard/configuration`** (Admin uniquement) : 3
  sections repliables (Types d'événements, Séries récurrentes,
  Commerçants partenaires) reprenant le contenu exact des 3 anciennes
  pages (`/dashboard/maraudes/types-evenement`, `/dashboard/maraudes/series`,
  `/dashboard/cuisine/commercants`), migrées et **supprimées** (fichiers
  déplacés vers `dashboard/configuration/`, pas dupliqués). Toutes les
  références internes retrouvées et mises à jour (`revalidatePath` dans
  les 3 fichiers d'actions, liens dans `cuisine-client.tsx` et
  `creer-evenement-form.tsx`) — vérifié par grep qu'aucun lien mort ne
  subsiste. Carte "Configuration" ajoutée sur `/dashboard` (Admin).
- **`CollapsibleSection` généralisée à Maraudes et Stocks** (seules pages
  n'en disposant pas encore, avec Cuisine qui en dispose déjà — correction
  d'une erreur de mon précédent état des lieux, qui affirmait à tort que
  Cuisine n'en avait pas). Sur Maraudes : "Créer un événement" (jusqu'à 9
  champs en mode Série) déplacé dans une section fermée par défaut, avant
  la liste — la liste des maraudes existantes est maintenant ce qu'on voit
  en premier. Sur Stocks : totaux (vue d'ensemble) restent toujours
  visibles hors section — comme "Vue d'ensemble" sur Rapports, elle,
  répliquée à l'identique aurait fermé cette vue par défaut, moins utile
  ici pour un coup d'œil rapide — formulaire et historique chacun dans
  leur propre section fermée. **Signalé comme choix discutable** : ce
  n'était pas explicitement demandé, à ajuster si le client préfère tout
  fermé par défaut pour une cohérence stricte avec Rapports.
- **Rapports, section Terrain** : les 3 blocs (heatmap, activité par jour,
  orientations) étaient seulement séparés par un `<h3>` — chacun
  encapsulé dans sa propre Card, comme le reste de l'app.
- **Repas, absence de rôle Cuisinier** : affichait un simple silence (le
  formulaire "Ajouter un repas" disparaissait sans explication) —
  remplacé par un message "Seul un Cuisinier peut ajouter un repas." à
  l'intérieur de la Card, toujours visible.
- **Non traité, signalé plutôt que décidé seul** : la demande nommait une
  page "`/dashboard/maraudes/[id]`" pour le regroupement Terrain/Équipe/
  Logistique — cette route n'existe pas (les maraudes sont des cartes sur
  la liste `/dashboard/maraudes`, jamais une page de détail dédiée). Le
  regroupement a été appliqué directement sur chaque carte de la liste
  plutôt que sur une page qui n'existe pas.

**Testé en conditions réelles** (compte Admin+Manager de test créé puis
supprimé, vérification explicite de l'erreur de suppression) : les 3
sections de Configuration s'ouvrent et affichent les vraies données
existantes (type "Maraude classique", sa série, aucun commerçant) ;
création d'un type de test confirmée en base (`cree_par` correct) après
migration de l'action ; groupes Terrain/Équipe/Logistique vérifiés sur
plusieurs maraudes, lien "Points de passage" suivi jusqu'à la vraie page ;
Stocks (totaux + 2 sections fermées) et message "Seul un Cuisinier..." sur
Repas vérifiés à l'écran ; section "Zones d'activité" de Rapports
confirmée encapsulée dans une Card après ouverture. Build + `tsc --noEmit`
propres après nettoyage du cache `.next` (routes supprimées).

### ✅ Correctif (24/09) — doublons signalés par le Chef de Produit sur la refonte Admin

Retour direct après la refonte ci-dessus : "le résultat global est pire
qu'avant, pas mieux". Avant de corriger, un constat précis a été fait
(aucune correction avant d'avoir identifié la vraie cause) :
- Les 3 anciennes pages étaient bien supprimées (pas de doublon de route).
- Le vrai doublon : **le même texte affiché deux fois sur un même
  écran** — la `description` d'une `CollapsibleSection` (toujours visible,
  même fermée) était reformulée puis quasiment répétée dans le paragraphe
  interne une fois la section ouverte. Pattern absent du reste de l'app
  (Adhérents/Rapports/Cuisine d'origine), introduit uniquement par cette
  refonte sur 4 sections.
- Secondaire : 4 chemins distincts menaient tous à `/dashboard/configuration`
  (accueil, en-tête Cuisine, formulaire vide, navigation directe) — pas
  des liens morts, mais plus d'entrées que nécessaire.

**Corrections appliquées** :
- **Chemins d'accès simplifiés** : bouton "Commerçants partenaires" retiré
  de l'en-tête de `/dashboard/cuisine` (`cuisine-client.tsx`, import
  `Link` devenu inutile retiré au passage). Restent uniquement : la carte
  Configuration sur l'accueil (accès principal), et le lien contextuel
  dans le formulaire de création d'événement quand aucun type n'est actif
  (utilité réelle — apparaît exactement quand on en a besoin).
- **Texte dupliqué retiré** :
  - `stocks-client.tsx`, section Historique : le paragraphe interne "Aucun
    mouvement enregistré pour l'instant." (répétition EXACTE de la
    description) supprimé — rien ne s'affiche à l'ouverture si la liste
    est vide, la description suffit.
  - `configuration/types-evenement-content.tsx` : le paragraphe interne ne
    garde que l'information réellement nouvelle ("Jamais de suppression —
    seulement une désactivation"), la partie qui reformulait la
    description ("nature fixe (Maraude ou point fixe)") retirée.
  - `configuration/commercants-content.tsx` : même principe, le préfixe
    "Répertoire réutilisable pour les dons ponctuels" (répétition quasi
    mot pour mot de la description) retiré, seule l'information nouvelle
    (jamais de suppression, historique préservé) reste.
  - `configuration/series-content.tsx` : **non modifié** — vérifié qu'il
    n'y a pas de réel doublon ici (description = ce que fait la
    fonctionnalité, paragraphe interne = effet d'une désactivation, deux
    informations différentes malgré des mots en commun comme "génération"/
    "occurrences") ; le corriger quand même aurait supprimé une
    information utile sans raison.

**Testé en conditions réelles** (compte Admin de test créé puis supprimé,
vérification explicite de l'erreur de suppression) : bouton "Commerçants
partenaires" confirmé absent de l'en-tête Cuisine ; section Historique de
Stocks ouverte avec 0 mouvement — le texte n'apparaît plus qu'une fois ;
sections "Types d'événements" et "Commerçants partenaires" de Configuration
ouvertes — plus aucune répétition, uniquement l'information nouvelle
affichée sous la description. Build + `tsc --noEmit` propres.

### ✅ Refonte Master-Detail — `/dashboard/maraudes` (25/09)

Remplace la liste verticale à plat par une mise en page liste/détail
moderne, commune à tous les rôles (pas seulement Admin) — réagencement
visuel, aucune nouvelle fonctionnalité, aucun nouveau champ de données,
sauf l'ajustement RLS météo explicitement demandé (voir plus bas).

**3 points bloquants trouvés en vérifiant le modèle de données avant de
coder — signalés puis tranchés par le Chef de Produit avant toute ligne de
code**, exactement comme demandé ("si un point n'est pas clair, arrête-toi
et demande") :
- **Champ "lieu"** demandé sur la carte de maraude — n'existe nulle part
  dans le modèle. **Décision : retiré de la carte** (pas de nouvelle
  colonne).
- **`profiles.phone`** pour le bouton d'appel de l'onglet Équipe —
  n'existe pas non plus sur `profiles`. **Décision : bouton retiré de
  cette itération**, comme les coordonnées d'urgence déjà écartées dans
  la même demande — sujet à reprendre en session dédiée une fois décidé
  comment collecter ce numéro.
- **Actions "Modifier"/"Annuler" existantes** pour l'en-tête du panneau de
  détail — n'existent nulle part (pas de formulaire d'édition de maraude,
  pas d'action d'annulation, même si l'enum `maraude_statut` a bien une
  valeur `annulee` jamais utilisée par aucune UI). **Décision : retirées
  de cette itération** plutôt que construites (aurait été une vraie
  nouvelle fonctionnalité serveur, hors du périmètre visuel annoncé).

**Layout** :
- Conteneur `max-w-7xl` (au lieu de `max-w-2xl`), grid 12 colonnes en
  desktop (`lg:col-span-5` liste / `lg:col-span-7` détail).
- Onglets **À venir/Historique** (comparaison `date_heure` au moment du
  rendu) + 3 filtres **Toutes/Mes maraudes (manager ou affecté)/⚠️ À
  compléter (inscrits < capacité)** — calculés côté client à partir des
  données déjà chargées, aucune requête supplémentaire pour les filtres
  eux-mêmes (une seule requête additionnelle légère pour "mes
  affectations" toutes maraudes confondues).
- **Historique trié du plus récent au plus ancien** (inverse de "À
  venir") — choix non précisé dans la demande, logique la plus naturelle
  pour consulter un historique.
- Carte compacte : badge date (mois/jour/heure), badges type/série, jauge
  de progression à 3 couleurs, avatars à initiales des premiers inscrits
  (triés par date d'inscription), bouton compact S'inscrire/Inscrit
  (variante `compact` ajoutée à `InscriptionForm` existant, pas de
  duplication de la logique des 2 Server Actions).
  - **Seuils de la jauge, non précisés dans la demande** : vert = complet
    (inscrits ≥ capacité), rouge = critique (0 inscrit), orange entre les
    deux.
  - **Le vert n'appartient pas à la charte graphique** (qui n'en définit
    aucun) — exception nécessaire pour un indicateur à 3 couleurs de type
    feu tricolore, le reste de l'UI (jauge orange, onglets, badges) utilise
    exclusivement les couleurs de la charte (`brand-navy`/`brand-blue`/
    `brand-coral`/`brand-pastel`, déjà les tokens Tailwind du projet).
- Panneau de détail : en-tête (titre/statut/type/manager, sans
  Modifier/Annuler — voir plus haut) + 3 sous-onglets :
  - **Parcours & Terrain** : inchangé, mêmes 3 liens qu'avant (Points de
    passage, Carte, Parcours réel) vers les pages dédiées existantes.
  - **Équipe** : fusionne le contenu des anciennes pages `/equipe` et
    `/meteo` dans un seul sous-onglet (roster + fonctions/affectations +
    météo). **Les 2 pages dédiées `/equipe` et `/meteo` ne sont PAS
    supprimées** (pas demandé cette fois, contrairement au chantier
    Configuration du 24/09) — elles restent fonctionnelles à leur URL,
    simplement plus liées depuis la liste principale.
  - **Logistique/Bilan** : compteurs (repas, tickets, besoins, checklist
    coché/total) calculés à partir des tables existantes, avec un lien
    vers chaque page dédiée — aucun nouveau formulaire de bilan, conforme
    à la demande. Libellé de l'onglet passe à "Bilan" pour une maraude
    passée (même contenu affiché dans les deux cas).
- **Sélection par défaut** : 1ère maraude de la liste filtrée
  auto-sélectionnée ; état vide "Sélectionnez une maraude" si la liste est
  vide après filtrage.
- **État vide sur filtre/onglet sans résultat** : message contextuel dans
  la colonne de liste (ex. "Aucune maraude où vous êtes manager ou
  affecté, sur cet onglet.") plutôt qu'un espace blanc.
- **Mobile** : liste pleine largeur ; au tap, transition plein écran
  (choix fait entre plein écran et bottom sheet — plein écran retenu,
  cohérent avec la navigation par page déjà utilisée partout ailleurs
  dans l'app plutôt qu'un nouveau pattern de panneau glissant) avec bouton
  "← Retour". Purement en CSS (classes `hidden`/`lg:flex` conditionnées
  par un état `mobileDetailOpen`), aucune détection de largeur d'écran en
  JS.
- Nouveau composant `src/components/ui/tabs.tsx` (wrapper shadcn standard
  autour de `radix-ui`, déjà une dépendance du projet — pas de nouvelle
  dépendance ajoutée) : les onglets À venir/Historique et les 3
  sous-onglets du détail sont les premiers vrais onglets exclusifs de
  l'app (`CollapsibleSection` reste pour du contenu qui peut coexister
  ouvert, pattern différent, conservé ailleurs sans changement).

**Météo — self-service retiré (migration `20260925100000`)** : la policy
RLS `meteo_insert_self_or_admin_manager` autorisait encore un bénévole à
insérer sa propre ligne météo — clause retirée, seuls Admin/Manager de la
maraude peuvent désormais écrire une météo (saisie initiale ou
correction), pour n'importe quel membre de l'équipe, depuis le sélecteur
du sous-onglet Équipe. Lecture inchangée (toujours réservée à Admin/
Manager, jamais le bénévole concerné).

**Testé en conditions réelles** (2 comptes de test — Admin+Manager et
Maraudeur simple non affecté — + une maraude future et une maraude
passée, tous créés puis supprimés avec vérification explicite de l'erreur
de suppression) :
- Onglets À venir/Historique et les 3 filtres vérifiés, y compris l'état
  vide réel ("Mes maraudes" pour le Maraudeur simple, qui n'est manager
  ni affecté nulle part) dans les deux colonnes.
- Sélection automatique de la 1ère maraude confirmée au chargement.
- Météo saisie par l'Admin sur le profil d'un autre bénévole confirmée en
  base (`saisi_par` forcé au bon compte) ; tentative d'insertion
  self-service par le bénévole confirmée refusée par RLS (avant
  correctif, la même tentative aurait réussi).
- Sous-onglet Équipe confirmé restreint (message explicite) pour un
  profil non-Admin/Manager/inscrit sur une maraude qui ne le concerne pas.
- Bilan logistique d'une maraude passée vérifié avec des données réelles
  (repas et besoin seedés, compteurs corrects, libellé "Bilan").
- Comportement mobile vérifié à 375px : liste seule au chargement,
  transition plein écran au tap avec conservation de la sélection, retour
  fonctionnel.
- Build + `tsc --noEmit` propres.

⬜ **Piste notée, pas engagée** : bouton d'appel (`profiles.phone`) et
actions Modifier/Annuler d'une maraude, toutes deux retirées de cette
itération faute de champ/fonctionnalité existants — à reprendre en
session dédiée si le besoin est confirmé.

**✅ Correctif (25/09, suite)** — précision demandée sur le sous-onglet
Parcours & Terrain : le circuit RÉEL (`parcours_reels`, bouton Démarrer/
Terminer) n'a de sens qu'une fois la maraude passée — pas de bouton
"Démarrer" ni de carte de parcours réel vide sur un événement qui n'a pas
encore eu lieu. Pour une maraude à venir, seul le circuit PRÉVU
(`circuits_planifies`, préparé à l'avance sur la page Carte) est
pertinent.
- `TerrainTab` reçoit désormais `estPassee` : le lien "Parcours réel
  (chrono)" n'est affiché QUE pour l'onglet Historique. Le lien "Carte"
  reste affiché dans les deux cas (label ajusté : "circuit planifié"
  seul pour une maraude à venir, "circuit réel, circuit planifié" pour
  l'historique) — la page Carte elle-même gère déjà l'absence de circuit
  réel sans erreur. "Points de passage" reste inchangé dans les deux
  onglets, non concerné par cette demande.
- Le découpage À venir/Historique par simple comparaison de `date_heure`
  fait que le lien chrono apparaît exactement au moment où l'heure prévue
  est dépassée (la maraude bascule alors en Historique) — cohérent avec
  l'usage réel : le Manager démarre le chrono au moment du départ, pas
  avant.
- **Testé en conditions réelles** (compte de test + une maraude future et
  une maraude passée, créés puis supprimés, suppression du compte
  vérifiée) : onglet À venir → seulement Points de passage + Carte
  (circuit planifié) ; onglet Historique → les 3 liens, dont Parcours réel
  (chrono).

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

## ✅ Checklist de départ + présence confirmée + parcours réel (24/09)

Trois ajouts liés au moment du départ en maraude, cadrés avec le Chef de
Produit puis construits et testés dans la foulée.

**Partie A — Checklist de départ** (`checklist_depart_items`,
`/dashboard/maraudes/[id]/depart`)
- Trois origines : `stock` et `don` régénérées automatiquement et de façon
  idempotente à chaque ouverture de page (depuis les totaux actuels de
  stock et les dons ponctuels de la maraude — jamais de doublon, jamais de
  ligne déjà cochée touchée), `libre` ajoutée à la main par le Manager —
  "c'est une association, tout n'est pas dans le stock formel".
- **Choix de formulation RLS signalé (point 4 de la demande)** : écriture
  (cocher/ajouter) = Manager de cette maraude, Admin, ou tout bénévole
  **affecté** à cette maraude (`affectations_maraude`) — interprété au
  sens littéral d'"affecté" (a une fonction cuisinier/maraudeur sur CETTE
  maraude), pas au sens large de "simplement inscrit". Suppression d'une
  ligne (corriger une ligne libre ajoutée par erreur) : Admin/Manager
  seulement, pas ouvert aux affectés.
- `reference_id` des lignes `stock` est un UUID **déterministe** (dérivé
  de `maraude_id` + catégorie/denrée via md5) plutôt qu'une vraie clé
  étrangère — il n'existe pas de ligne unique représentant "le stock actuel
  d'une catégorie" (c'est une somme de mouvements). Sert uniquement de clé
  stable pour l'index unique anti-doublon à la régénération.

**Partie B — Présence confirmée**
- `inscriptions_maraude.presence_confirmee` (+ `confirmee_par`/
  `confirmee_le` forcés par trigger) — case à cocher, écran Manager, sur la
  même page `/depart`. Aucune nouvelle policy RLS nécessaire : la policy
  `inscriptions_update_admin_manager` (déjà en place depuis l'Étape 3,
  tout Manager global) couvrait déjà ce besoin ; l'écran restreint
  seulement l'affichage au Manager de CETTE maraude + Admin, cohérent avec
  le reste du dashboard.
- Documenté dans Specs.md : le jour où une alerte d'effectif minimum sera
  construite (pas encore le cas), elle devra utiliser cette colonne plutôt
  que le nombre d'inscrits.

**Partie C — Parcours réel** (`parcours_reels` + `parcours_reels_points`,
`/dashboard/maraudes/[id]/parcours`)
- Bouton Démarrer/Terminer (Manager/Admin de cette maraude uniquement, un
  seul parcours `en_cours` à la fois par maraude — index unique partiel).
  Capture continue via `watchPosition`, throttlée côté client au plus tôt
  de ~30s ou ~20m de déplacement.
- Réutilise **tel quel** le trigger `force_geo_arrondi` déjà créé pour
  `points_passage` (Étape 6) — simplement attaché à la nouvelle table,
  aucun nouveau code d'arrondi, comme demandé.
- Refus de permission géolocalisation géré sans planter l'app (message
  inline). Notice explicite "gardez l'écran allumé" affichée.
- Fusionné dans la heatmap de densité de `/dashboard/maraudes/[id]/carte`
  (couche de fond commune avec `points_passage`, via une nouvelle vue
  `parcours_reels_points_geo`) — décision de placement : uniquement la
  heatmap de densité de la carte par maraude, PAS le "circuit réel" tracé
  par type d'action (qui reste basé uniquement sur `points_passage`, un
  parcours chrono n'a pas de type d'action associé) ni le graphique
  "Terrain" de `/dashboard/rapports` (filtrable par type d'action, un
  ajout non typé y casserait la sémantique du filtre — laissé de côté,
  à reprendre séparément si besoin).

⚠️ **Bug trouvé et corrigé en testant (avant tout déploiement)** : l'index
unique anti-doublon de la checklist était initialement un index **partiel**
(`where source in ('stock','don')`) — l'upsert PostgREST (`ON CONFLICT
(colonnes)` sans prédicat) ne peut pas cibler un index partiel, erreur
Postgres 42P10. Corrigé par un index unique non partiel (migration
`20260924100100`) : fonctionne quand même pour les lignes `libre`
puisque Postgres ne considère jamais deux `NULL` comme égaux dans un index
unique (`reference_table`/`reference_id` toujours NULL pour ces lignes).

**Testé en conditions réelles** (deux comptes de test créés puis
supprimés, vérification explicite de l'erreur à chaque suppression — un
Admin+Manager+Maraudeur+Cuisinier de test, et un Maraudeur simple sans
affectation) :
- Checklist auto-générée correctement depuis stock (matériel + denrées) et
  un don ponctuel réels ; régénération confirmée idempotente (texte de
  quantité mis à jour, ligne déjà cochée intacte, ligne libre intacte) ;
  ajout de ligne libre confirmé en base.
- RLS confirmée dans les deux sens : le Maraudeur simple (inscrit, pas
  affecté) lit la checklist mais ne peut ni cocher ni confirmer sa propre
  présence (0 ligne modifiée / erreur RLS explicite) ; après
  auto-affectation `maraudeur` sur cette maraude, l'écriture checklist
  fonctionne.
- Parcours réel : chrono démarré/arrêté (position simulée), 3 points
  capturés avec la position bien recalée sur la grille ~100m (vérifié
  différente de la position brute envoyée) ; tentative de démarrage par un
  profil non-Manager/Admin refusée par RLS ; heatmap de la carte par
  maraude vérifiée sans erreur console après la fusion.

## État des lieux — renommage `maraudes` (22/09, mission lecture seule)

Demande du Chef de Produit avant de généraliser le concept de maraude :
renommer la table `maraudes` (et tout ce qui en dérive) est-il raisonnable,
ou disproportionné par rapport à juste garder le nom et ajouter un type
par-dessus ? Rapport livré en texte (pas de fichier créé, mission
explicitement lecture seule) :
- 406 occurrences de "maraude" dans `src/` (59 fichiers), dont 169 (41 %)
  un seul motif mécanique répété (`maraude_id`/`maraudeId`) — pas 406
  décisions indépendantes
- 22 occurrences dans la copie marketing du site public : ne changeraient
  dans aucun des deux scénarios, "maraude" reste le mot que l'association
  utilise pour son activité historique
- Objets vivants en base : 3 tables, 13 colonnes `maraude_id`, 9 policies
  RLS nommées, 2 fonctions/triggers, 2 vrais enums
- Recommandation retenue : **garder `maraudes`**, ajouter un type par-
  dessus — le renommage seul ne résout pas la vraie difficulté (rendre
  `circuits_planifies`/`points_passage` conditionnels à la nature), et son
  coût réel est la re-vérification manuelle de toute la fonctionnalité
  (pas de tests automatisés dans ce projet), pas le diff lui-même, pour un
  gain purement cosmétique
- **Décision Chef de Produit** : confirmée, voir chantier ci-dessous.

## ✅ Généralisation maraude → types d'événements + récurrence + vacances scolaires (22/09)

**Remplace la piste "Module de planification d'événements hors maraude
régulière" (16/09, ci-dessous conservée pour l'historique)** — au lieu
d'une table `evenements` séparée envisagée le 16/09, décision finale du
Chef de Produit après un état des lieux chiffré (voir plus bas, "État des
lieux — renommage maraudes") : généraliser la table `maraudes` existante
plutôt que dupliquer un modèle parallèle, en gardant son nom tel quel
(aucun renommage table/colonnes/routes/policies). Répond aussi au besoin
"goûter, café, maraude hors du vendredi habituel" de la piste initiale, en
mieux : génération automatique récurrente, pas seulement une saisie
ponctuelle manuelle.

Chantier en 3 parties, validées et testées en conditions réelles à chaque
étape (compte de test créé puis supprimé) :

**Partie A — Types d'événements**
- Enum `nature_evenement` (`maraude` | `evenement_fixe`, fixe, non
  éditable) ; table `types_evenement` (nom unique, nature, description,
  actif — jamais de suppression physique, désactivation seulement)
- `maraudes.type_evenement_id` (FK NOT NULL) et `maraudes.max_participants`
  (NOT NULL, défaut 6) — remplace le "6" codé en dur dans le trigger
  `set_inscription_statut` (Étape 3). Migration : type "Maraude classique"
  créé, assigné à toutes les lignes existantes, `max_participants=6` pour
  elles, avant de poser les contraintes NOT NULL — comportement inchangé
  pour l'historique
- Restriction structurelle (trigger, pas juste UI) : un `circuits_planifies`
  ne peut jamais être créé pour un événement dont le type a
  `nature='evenement_fixe'` — seule table restreinte par nature, toutes
  les autres (points_passage, besoins_signales, meteo_benevole_saisies,
  repas, tickets_depense, affectations_maraude, dons_ponctuels, stocks)
  restent disponibles pour toute nature, sans logique dupliquée
- Testé directement en base (compte service_role) : circuit refusé avec le
  bon message pour `evenement_fixe`, accepté pour `maraude` ; capacité à 2
  → 2 inscrits + 1 en liste d'attente confirmé

**Partie B — Récurrence**
- Table `series_evenements` (type, fréquence `hebdomadaire` /
  `toutes_les_2_semaines` / `mensuelle_nieme_jour`, jour de la semaine,
  Nième semaine du mois si pertinent, heure, Manager par défaut, capacité
  par défaut, horizon de génération, date de fin optionnelle,
  `limiter_aux_vacances_scolaires`). **Décision Chef de Produit (22/09)** :
  `manager_id_defaut` NOT NULL (même contrainte que `maraudes.manager_id`,
  doit désigner un profil Manager) — cohérent avec la règle déjà en place
  partout ailleurs, plutôt que de l'assouplir pour ce seul cas
- Table `vacances_scolaires` (nom, date_debut, date_fin), Zone B
  uniquement. **Dates réelles importées** depuis le fichier ICS officiel
  Zone B (`fr.ftp.opendatasoft.com/openscol/...Zone-B.ics`,
  data.education.gouv.fr) — 9 périodes couvrant les années scolaires
  2026-2027 et 2027-2028 (Été 2028 pas encore publié par le Ministère à
  cette date, normal). DTEND ICS (exclusif) converti en borne inclusive
  (−1 jour). Mise à jour manuelle annuelle documentée dans docs/Specs.md —
  pas d'automatisation, les dates ne sont pas publiées assez à l'avance
- Calcul des dates de récurrence en TypeScript pur (`src/lib/recurrence.ts`,
  testé isolément avant intégration : hebdomadaire, bimensuel avec ancrage
  correct sur `date_debut`, mensuel Nième-jour et dernier-jour-du-mois,
  tous vérifiés par des cas de test à la main) — pas en PL/pgSQL, trop de
  logique de calendrier pour rester lisible. Conversion heure locale
  Europe/Paris → UTC consciente du changement d'heure
  (`src/lib/timezone.ts`, `Intl.DateTimeFormat`, aucune nouvelle
  dépendance) — vérifié DST hiver/été et sur une date à cheval sur la
  bascule d'octobre
- Route `/api/cron/generer-occurrences` (Vercel Cron, une fois par jour,
  3h UTC, voir `vercel.json`) : seule barrière `CRON_SECRET` (en-tête
  `Authorization: Bearer`, pas de session possible pour un job système) —
  `CRON_SECRET` ajouté à `.env.local.example`, **doit aussi être défini
  manuellement dans les variables d'environnement Vercel** (pas fait par
  l'assistant, pas d'accès au dashboard Vercel depuis cette session)
- Génération immédiate à la création d'une série (pas d'attente du
  prochain passage cron), idempotente (vérifie les dates déjà générées
  pour la série avant d'insérer)
- **Testé en conditions réelles via l'UI complète** (compte
  Admin+Manager de test) : série mensuelle (1er mercredi du mois) →
  génération immédiate confirmée en base (2026-10-07, 2026-11-04,
  heures UTC correctes de part et d'autre de la bascule DST) ; série
  hebdomadaire (mercredi) avec `limiter_aux_vacances_scolaires=true` →
  UNIQUEMENT 2026-10-21 et 2026-10-28 générées (les deux mercredis dans
  Toussaint 2026), tous les autres mercredis de la fenêtre correctement
  exclus — cas vacances/hors-vacances vérifié avec les vraies dates
  importées. Appel manuel de la route cron : 401 sans secret, 401 avec
  mauvais secret, 200 avec le bon secret ; idempotence confirmée
  (`creees:0` au second appel) ; rattrapage confirmé après suppression
  d'une occurrence (`creees:1`, date exacte recréée sans doublon) ;
  désactivation d'une série confirmée exclue du cron suivant (`series`
  passe de 2 à 1)

**Partie C — UI (Admin)**
- Page `/dashboard/maraudes/types-evenement` : liste, création
  (nom + nature), désactivation/réactivation
- Formulaire de création d'événement unifié sur `/dashboard/maraudes`
  (remplace l'ancien `CreerMaraudeForm`) : bascule Ponctuel / Série
  récurrente, sélection du type (actifs uniquement) dans les deux cas.
  `date_debut` de série non exposée en UI (démarre le jour de la
  création, jamais dans le passé) ni `horizon_generation_jours` (garde le
  défaut de 56 jours) — périmètre de champs exact demandé, pas plus
- Page `/dashboard/maraudes/series` : liste actives/inactives (triées
  actives d'abord), description lisible de la fréquence, désactivation
- Badge sur chaque carte de la liste des maraudes : nom du type + "Généré
  par série" si `serie_id` non nul ; "X/max_participants inscrits"
  remplace l'ancien "X/6" codé en dur dans le texte d'accueil

⚠️ **Nettoyage opportuniste (22/09)** : en testant, découvert un compte de
test + une maraude + un mouvement de stock d'une session précédente jamais
réellement supprimés (le script de nettoyage de l'époque ne vérifiait pas
l'erreur de `deleteUser`, voir mémoire `verify-test-account-deletion`) —
supprimés proprement cette fois, avec vérification systématique de chaque
suppression avant de continuer.

## ✅ Circuit planifié — tracé réel suivant les rues (22-23/09, commit `b4705fa`)

Retour client : le circuit planifié traçait une ligne droite entre les
points cliqués — les équipes se déplacent à pied, il faut suivre les
rues/trottoirs réels.

- **Compte OpenRouteService** : création refusée par l'assistant (règle
  absolue — créer un compte tiers, même gratuit sans CB, reste toujours
  à l'utilisateur). Le client crée le compte lui-même et ajoute
  `ORS_API_KEY` en local + Vercel, comme pour `CRON_SECRET`.
- Migration `20260922120000_circuit_geometrie_reelle.sql` — ajoute
  `circuits_planifies.geometrie_reelle` (jsonb, nullable, GeoJSON
  `LineString`), **à côté** de `points` (jamais remplacée, reste la
  donnée source éditable). Appliquée en production.
- `src/lib/ors.ts` : appel serveur-only à l'API Directions ORS (profil
  `foot-walking`), ne lève jamais d'exception — retourne `null` sur
  n'importe quel échec (pas de connexion, quota dépassé, points non
  routables à pied, clé absente/invalide, timeout 10s). `ORS_API_KEY`
  jamais exposée au client.
- `enregistrerCircuitPlanifie` (`src/lib/actions/circuits.ts`) : recalcule
  la géométrie à CHAQUE enregistrement (jamais réutilisée) — sinon un
  échec après modification des points laisserait un tracé qui ne
  correspond plus aux points actuels, silencieusement faux. Retourne la
  géométrie au client pour affichage immédiat, plus un signal
  "tracé réel indisponible" distinct de l'échec d'enregistrement.
- `maraude-carte.tsx` : affiche `geometrie_reelle` (convertie
  [lng,lat]→[lat,lng] pour Leaflet) si présente, sinon repli sur la ligne
  droite entre les points bruts — jamais d'écran cassé. Toute
  modification des points pendant l'édition invalide localement l'ancien
  tracé affiché (retour à la ligne droite en aperçu) jusqu'au prochain
  enregistrement réussi. Message discret si le tracé réel n'a pas pu
  être calculé, distinct du message de succès normal.
- Documenté dans docs/Specs.md, section "Circuit planifié — tracé réel
  suivant les rues".

**✅ Confirmé en production (23/09)** : `ORS_API_KEY` fournie par le
client (compte créé par ses soins) et ajoutée en local + Vercel.
Testé de bout en bout avec de vrais points le long de la promenade
côtière de Nice — tracé réel de 72 points confirmé en base, en local et
en production. Fausse alerte initiale du client résolue : la ligne
droite affichée pendant qu'on place les points est le comportement
normal (aperçu avant sauvegarde, le tracé réel n'apparaît qu'après clic
sur "Enregistrer le circuit planifié" — pas de calcul à chaque clic pour
ne pas solliciter l'API inutilement) ; le vrai souci était que le
circuit n'avait simplement pas encore été enregistré au moment de la
capture d'écran envoyée. Repli testé avec les 2 cas d'échec réels de
l'API (clé invalide → 403, points non routables → 404).

## ✅ Dons ponctuels visibles sur la page maraude + répertoire de commerçants (23/09)

**Partie 1 — Investigation** : retour client, un don ajouté via
`/dashboard/cuisine` n'apparaissait pas "dans les repas" de la maraude.
Vérifié directement en base : le don était bien enregistré (`donateur`,
`maraude_id`, etc. tous corrects, `created_by` un vrai compte Admin) —
**pas un bug de sauvegarde**, un manque d'affichage :
`dons_ponctuels` n'était visible que sur `/dashboard/cuisine`, jamais sur
la page repas de la maraude elle-même.
- Corrigé : `/dashboard/maraudes/[id]/repas` affiche maintenant une
  section "Dons reçus pour cette maraude" à côté des repas cuisinés
  (`fetchRepasEtDons`, une seule requête parallèle en plus, même
  `queryKey` que la page — pas de nouveau chantier de cache).

**Partie 2 — Répertoire de commerçants partenaires** (nouvelle demande) :
- Schéma `dons_ponctuels` vérifié avant extension (id, maraude_id,
  donateur, description, quantite, created_by, created_at) — inchangé
  depuis sa création, aucune surprise.
- Migration `20260923100000_commercants_partenaires.sql` : nouvelle table
  `commercants_partenaires` (nom unique, actif, notes, cree_par/cree_le),
  même principe que `types_evenement` — écriture Admin, lecture
  authenticated, **jamais de suppression physique** (juste `actif`).
  `dons_ponctuels.commercant_id` ajouté en FK nullable — le texte libre
  `donateur` existant est conservé, jamais remplacé.
- Formulaire de don (`don-ponctuel-form.tsx`) : menu déroulant des
  commerçants actifs + option "Autre" qui révèle le champ texte libre.
  Le nom du commerçant est résolu **côté serveur** (jamais transmis tel
  quel par le client) pour peupler `donateur`, afin de ne jamais casser
  l'affichage existant qui lit cette colonne.
- Nouvelle page `/dashboard/cuisine/commercants` (Admin) : lister, créer,
  modifier (édition inline nom/notes), désactiver/réactiver. Choix
  d'emplacement : sous `/dashboard/cuisine` plutôt qu'ailleurs — même
  logique que `types-evenement`/`series` sous `/dashboard/maraudes`
  (config Admin d'un domaine, rattachée à la page de ce domaine, pas un
  nouveau chantier de navigation top-level). Lien ajouté dans l'en-tête
  de `/dashboard/cuisine` (Admin uniquement).
- Documenté dans docs/Specs.md, section "Dons ponctuels & commerçants
  partenaires".

Testé en conditions réelles (compte Admin+Cuisinier créé puis supprimé,
vérification explicite de l'erreur à chaque suppression) : don "Point B"
existant confirmé visible sur la page repas de sa maraude ; création d'un
commerçant confirmée en base (`cree_par` forcé au vrai compte
authentifié) ; don enregistré via ce commerçant confirmé lié
(`commercant_id`) avec `donateur` correctement résolu côté serveur ;
option "Autre" toujours fonctionnelle en parallèle ; désactivation
confirmée — disparaît du menu déroulant pour un nouveau don, mais le don
déjà enregistré reste intact (nom + lien).

## Piste — Module de planification d'événements hors maraude régulière (16/09, pas scopé, **remplacé** — voir chantier ci-dessus, 22/09)

Demandé par le client — **absent de Specs.md et Tasks.md avant ce jour**,
vérifié explicitement (pas dans le cahier des charges initial, ni discuté
et oublié — vraie nouvelle idée ou remontée d'un échange jamais
consigné). Besoin exprimé : goûter, café, maraude hors du vendredi
habituel — des événements ponctuels, distincts de la récurrence
hebdomadaire déjà gérée par le système de maraudes actuel.

**Pas scopé sérieusement** — à clarifier avant de commencer :
- Nouvelle table `evenements` (titre, description, date_heure, lieu,
  créé par) — modèle distinct des `maraudes` (pas de récurrence
  vendredi, pas de météo bénévole/points de passage a priori)
- Inscriptions : réutiliser le principe de `inscriptions_maraude`
  (liste d'attente, etc.) ou plus simple (pas de limite à 6 personnes
  a priori) ?
- Qui peut créer un événement — Admin/Manager seulement, ou plus large ?
- Visible par qui — tous les bénévoles actifs, adhérents compris ?
- Vue calendrier ou simple liste chronologique ?

## Piste — Système de note de service / bulletin interne (16/09, pas scopé)

Demandé par le client, **séparé du module d'événements ci-dessus** —
diffusion d'informations à sens unique (Admin/Manager écrit, les
bénévoles lisent), **pas une messagerie/chat** (le client a explicitement
distingué les deux besoins). Piste du client : pourrait constituer le
contenu du tableau de bord du rôle **Adhérent** — vérifié, ce rôle existe
déjà dans `src/lib/roles.ts` mais n'a aujourd'hui **aucun contenu dédié**
(un Adhérent voit le même accueil générique que tout le monde).

**Pas scopé sérieusement** — à clarifier avant de commencer :
- Nouvelle table `notes_service` (titre, contenu, créé par, date,
  éventuelle date d'expiration/archivage)
- Qui peut publier — Admin seulement, ou aussi Manager ?
- Visible par quels rôles — Adhérent seulement, ou affiché à tous
  (avec le dashboard Adhérent comme point de départ) ?
- Lien avec le chantier notifications push (Étape 11, ci-dessous) — une
  nouvelle note déclenche-t-elle une notification ?

**Ajout (25/09, pas scopé ni construit)** : diffusion des notes de service
par **notification** et/ou **lien WhatsApp pré-rempli** (`wa.me/<numéro>?
text=<message encodé>`) — permet de joindre un bénévole sans qu'il ait
installé l'app ni créé de compte WhatsApp Business, un clic généré par
note et par destinataire, aucun service payant (contrairement à l'API
WhatsApp Business officielle). Dépend du même besoin de numéro de
téléphone déjà identifié et écarté cette session (voir refonte
Master-Detail Maraudes, 25/09) — nécessiterait `profiles.phone` pour
générer les liens par destinataire.

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
- **Lié (17/09)** : section "Cotisations" (coquille posée sur
  `/dashboard/adherents`, voir Étape 10bis) — même compte/API HelloAsso,
  mais usage différent : lister les **adhésions** existantes (qui a payé
  sa cotisation, pas collecter un nouveau don). À brancher en même temps
  que ce module dons, une fois les identifiants API disponibles.

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

## Chantier RGPD (25/09, backlog structuré — rien construit)

Liste transmise par le Chef de Produit, consignée telle quelle en backlog
à la demande explicite ("consigne dans Tasks.md, ne code rien") — **aucun
code, aucune migration, aucun document produit à ce stade**. Sert de base
pour découper ce chantier en tickets séparés plus tard.

### ⚠️ Point à trancher avant de scoper le module Usagers

Le point "Usagers" ci-dessous (identifiant de fiche auto, reconnu à
travers plusieurs maraudes) **contredit la règle actuelle de
`docs/Specs.md`** ("Anonymat des personnes aidées : Aucune fiche
individuelle, aucun nom, aucune donnée identifiante... Uniquement des
compteurs agrégés"). Clarifié avec le Chef de Produit (25/09) : le besoin
réel est bien de **reconnaître la même personne dans le temps** (ex. "déjà
orientée vers la CCAS le mois dernier"), pas juste une fiche par
rencontre sans lien garanti — donc une vraie identité persistante, même
minimaliste (surnom/signe distinctif, pas de nom obligatoire), au lieu des
compteurs anonymes actuels. **Decision de principe actée, mais
`docs/Specs.md` et `CLAUDE.md` (qui répètent tous deux la règle
"anonymat strict") ne sont volontairement pas encore mis à jour** — à
faire au moment de scoper réellement ce module, pas en même temps qu'une
simple consignation de backlog.

### App V1
- ⬜ Membres : photo facultative (initiales par défaut, consentement
  explicite par case NON précochée, retrait possible)
- ⬜ Membres : adresse obligatoire uniquement pour le rôle Cuisinier,
  visible Managers/Admins, supprimée si le rôle est retiré
- ⬜ Usagers : identifiant de fiche auto, nom/prénom facultatifs (option
  surnom), lieu habituel de rencontre (pas d'adresse ni GPS) — voir point
  à trancher ci-dessus avant de scoper
- ⬜ Besoins : liste fermée + taille + statut (remonté/préparé/remis),
  détachés du nom une fois remis
- ⬜ Orientations : catégorie générique, date, statut, niveau
  d'accompagnement (autonome/rappel/accompagnement physique), case
  "accord donné le…" ; aucun texte libre
- ⬜ RLS : orientations visibles uniquement par Managers et Admins
- ⬜ Journal des consultations (fiches usagers + orientations)
- ⬜ Purges automatiques : anonymisation usager après 24 mois sans
  contact ; suppression membre 1 an après départ (hors pièces
  comptables)
- ⬜ Stats calculées sur données anonymisées
- ⬜ Sécurité : comptes individuels, déconnexion auto sur mobile,
  désactivation du compte au départ d'un bénévole
- ⬜ Vérifier région UE + DPA pour Supabase et Vercel — **partiellement
  déjà répondu par cette session** : région Supabase confirmée
  `eu-west-3` (Paris) et région Vercel confirmée `cdg1` (Paris), voir le
  diagnostic perf du 15-16/09 plus haut dans ce document. Reste à
  vérifier : les DPA (Data Processing Agreement) eux-mêmes, pas juste la
  localisation des données.

### Module permanence/tutorat (construit mais désactivé)
- ⬜ Interrupteur Admin : aucun champ visible ni enregistré quand éteint,
  aucune donnée réelle en base
- ⬜ Activation conditionnée à : référent nommé, formation faite, mise à
  jour AIPD + registre + flyer

### Documents (validés et signés par ABN — hors périmètre technique)
- ⬜ Lettre de mission V1 Arqoria/ABN
- ⬜ Contrat de sous-traitance (art. 28)
- ⬜ Registre des traitements : bénévoles, maraude, permanence (traitement
  prévu)
- ⬜ Mentions d'information membres + flyer usagers
- ⬜ Charte de confidentialité Managers/Admins (règle : la contrainte,
  jamais le mal)
- ⬜ AIPD via l'outil PIA de la CNIL
- ⬜ Procédures écrites : exercice des droits, violation de données (CNIL
  sous 72h), revue des accès au départ d'un bénévole

### Hors app (aucune action possible de l'assistant)
- ⬜ Module RGPD (30-45 min) dans la mini-formation + feuille d'émargement
  (côté ABN)
- ⬜ Vérifier que la RC pro de l'association couvre l'activité avant mise
  en production
- ⬜ Relecture juridique externe (optionnelle, recommandée)
