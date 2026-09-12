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
- ⬜ Créer le projet Supabase réel (compte Arqoria, région Europe)
- ⬜ Appliquer migration : enums (user_role, account_status, meteo_benevole) + table profiles + RLS de base
- ⬜ Appliquer migration : fonctions helper security definer (current_user_role, current_user_status)
- ⬜ Réécrire policy profiles_select_admin_manager avec les fonctions helper (fix récursion RLS)
- ⬜ Trigger handle_new_user (auto-création du profil à l'inscription Supabase Auth)
- ⬜ Connecter Claude Code au projet Supabase via MCP (--read-only + --project-ref)

## Étape 3 — Maraudes & équipes
- ⬜ Table maraudes (date, statut, manager_id)
- ⬜ Table inscriptions_maraude (user_id, maraude_id, statut: inscrit/liste_attente)
- ⬜ Logique liste d'attente automatique (max 6) + promotion auto au désistement
- ⬜ Policies RLS (lecture large, écriture restreinte)

## Étape 4 — Sécurité & suivi bénévoles
- ⬜ Table meteo_benevole (maraude_id, user_id, valeur, saisi_par, saisi_le)
- ⬜ Policies RLS strictes (Admin + Manager de la maraude concernée uniquement)
- ⬜ Flow de validation manuelle des comptes par un Admin (server action + UI)

## Étape 5 — Logistique repas
- ⬜ Table repas (maraude_id, cuisinier_id, quoi, quantité)
- ⬜ Table tickets_depense (maraude_id, user_id, montant, photo_url, statut_remboursement)
- ⬜ Bucket Storage pour photos de tickets + policies RLS Storage
- ⬜ UI upload photo + saisie repas (mobile-first)

## Étape 6 — Suivi terrain & cartographie
- ⬜ Activer extension PostGIS sur Supabase
- ⬜ Table points_passage (maraude_id, user_id, geo_arrondi, horodatage, type_action, compteurs)
- ⬜ Fonction d'arrondi géographique côté serveur (grille ~100m) — jamais de GPS exact stocké
- ⬜ Policies RLS (Admin/Manager uniquement)
- ⬜ Capture géoloc en un tap côté client (intégrée à la queue offline, voir Étape 8)

## Étape 7 — UI métier principale (connectée à Supabase)
- ⬜ Auth (connexion, inscription, écran "compte en attente de validation")
- ⬜ Dashboard par rôle (vue Admin/Manager ≠ vue Maraudeur/Cuisinier), remplace les données factices du styleguide
- ⬜ Inscription à une maraude + visualisation liste/liste d'attente
- ⬜ Saisie météo bénévole en fin de maraude

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
