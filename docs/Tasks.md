# Backlog technique — ABN

Découpage en petites itérations logiques. Statut : ⬜ à faire · 🟨 en cours · ✅ fait

## Étape 1 — Socle & validation design (EN COURS)
- ✅ Repo Arqoria/ABN connecté à Vercel, premier déploiement réussi
- ✅ Design system / styleguide intégré (couleurs, typographie, boutons, badges, cartes) — abn-theta-murex.vercel.app
- ⬜ Validation visuelle par Aymen + référent association (dark mode, contrastes, taille des boutons sur mobile réel)
- ⬜ Ajustements design suite aux retours de validation
- ✅ Manifest PWA (icônes 192/512/maskable/apple-icon, theme-color, apple-web-app) — déployé et vérifié en ligne
- ✅ Service Worker de base (public/sw.js, pass-through — installabilité uniquement, aucun cache/offline)
- ✅ Structure des pages/routes (squelette (public)/(app) + proxy.ts, pas encore de contenu final)
  — note : '/' sert temporairement le styleguide (charte graphique) au lieu du placeholder vitrine ;
  la vraie page d'accueil sera construite séparément à l'Étape 10

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
- ⬜ Activer extension PostGIS sur Supabase
- ⬜ Table points_passage (maraude_id, user_id, geo_arrondi, horodatage, type_action, compteurs)
- ⬜ Fonction d'arrondi géographique côté serveur (grille ~100m) — jamais de GPS exact stocké
- ⬜ Policies RLS (Admin/Manager uniquement)
- ⬜ Capture géoloc en un tap côté client (intégrée à la queue offline, voir Étape 8)

## Étape 7 — UI métier principale (connectée à Supabase)
- ⬜ Auth (connexion, inscription, écran "compte en attente de validation")
- ⬜ Flow de validation manuelle des comptes par un Admin (server action + UI)
  — déplacé depuis l'Étape 4, dépend de l'Auth ci-dessus
- ⬜ Dashboard par rôle (vue Admin/Manager ≠ vue Maraudeur/Cuisinier), remplace les données factices du styleguide
- ⬜ Inscription à une maraude + visualisation liste/liste d'attente
- ⬜ Saisie météo bénévole en fin de maraude
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
