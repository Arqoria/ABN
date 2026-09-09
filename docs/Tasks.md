# Backlog technique — ABN

Découpage en petites itérations logiques. Statut : ⬜ à faire · 🟨 en cours · ✅ fait

## Phase 1 — Fondations BDD
- ✅ Enums (user_role, account_status, meteo_benevole) + table profiles + RLS de base
- ✅ Fonctions helper security definer (current_user_role, current_user_status)
- ⬜ Réécrire policy profiles_select_admin_manager avec les fonctions helper (fix récursion RLS)
- ⬜ Trigger handle_new_user (auto-création du profil à l'inscription Supabase Auth)

## Phase 2 — Maraudes & équipes
- ⬜ Table maraudes (date, statut, manager_id)
- ⬜ Table inscriptions_maraude (user_id, maraude_id, statut: inscrit/liste_attente)
- ⬜ Logique liste d'attente automatique (max 6) + promotion auto au désistement
- ⬜ Policies RLS (lecture large, écriture restreinte)

## Phase 3 — Sécurité & suivi bénévoles
- ⬜ Table meteo_benevole (maraude_id, user_id, valeur, saisi_par, saisi_le)
- ⬜ Policies RLS strictes (Admin + Manager de la maraude concernée uniquement)
- ⬜ Flow de validation manuelle des comptes par un Admin (server action + UI)

## Phase 4 — Logistique repas
- ⬜ Table repas (maraude_id, cuisinier_id, quoi, quantité)
- ⬜ Table tickets_depense (maraude_id, user_id, montant, photo_url, statut_remboursement)
- ⬜ Bucket Storage pour photos de tickets + policies RLS Storage
- ⬜ UI upload photo + saisie repas (mobile-first)

## Phase 5 — Suivi terrain & cartographie
- ⬜ Activer extension PostGIS sur Supabase
- ⬜ Table points_passage (maraude_id, user_id, geo_arrondi, horodatage, type_action, compteurs)
- ⬜ Fonction d'arrondi géographique côté serveur (grille ~100m) — jamais de GPS exact stocké
- ⬜ Policies RLS (Admin/Manager uniquement)
- ⬜ Capture géoloc en un tap côté client (intégrée à la queue offline, voir Phase 7)

## Phase 6 — UI métier principale
- ⬜ Auth (connexion, inscription, écran "compte en attente de validation")
- ⬜ Dashboard par rôle (vue Admin/Manager ≠ vue Maraudeur/Cuisinier)
- ⬜ Inscription à une maraude + visualisation liste/liste d'attente
- ⬜ Saisie météo bénévole en fin de maraude

## Phase 7 — PWA offline-first
- ✅ Manifest PWA (installabilité — icônes 192/512/maskable, theme-color, apple-web-app)
- ⬜ Service Worker de base (offline minimal, volontairement reporté)
- ⬜ IndexedDB (Dexie.js) comme file d'attente locale
- ⬜ Background Sync : synchro auto au retour réseau
- ⬜ Intégration avec saisies terrain (repas, points de passage, météo)

## Phase 8 — Reporting & KPIs
- ⬜ Vue agrégée compteurs (repas, personnes aidées, orientations sociales)
- ⬜ Carte heatmap (Leaflet + leaflet.heat, fond OpenStreetMap)
- ⬜ Tracé des circuits (points de passage reliés chronologiquement)
- ⬜ Export tableur (.xlsx/.csv)
- ⬜ Export PDF formaté pour financeurs

## Phase 9 — Site vitrine public
- ⬜ Pages SEO local (accueil, présentation, actions)
- ⬜ Formulaire recrutement bénévoles
- ⬜ Module dons financiers
- ⬜ Module dons matériels

## Phase 10 — Notifications & natif (reporté)
- ⬜ Firebase Cloud Messaging (web push Android)
- ⬜ Empaquetage Android TWA (.apk)
- ⬜ iOS via Capacitor + App Store — reporté, pas de budget pour l'instant