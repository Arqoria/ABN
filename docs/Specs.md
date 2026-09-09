# Specs métier — ABN

Source de vérité fonctionnelle du projet. CLAUDE.md y renvoie plutôt que de dupliquer ce contenu.

## Rôles & permissions
- **Admin** (Trésorier/Présidence) : accès complet, validation des comptes, gestion des rôles, gestion financière
- **Manager** (Chef de maraude) : gestion de son équipe/maraude, accès météo bénévole et heatmap
- **Maraudeur** : participation aux maraudes, saisie terrain, pas d'accès aux données agrégées/carto
- **Cuisinier** : gestion de la préparation des repas, pas d'accès aux données agrégées/carto

## Gestion des maraudes
- Récurrence : tous les vendredis, 20h30
- Équipe max 6 personnes par maraude
- Liste d'attente automatique au-delà de 6 inscrits, promotion automatique en cas de désistement

## Sécurité & suivi des bénévoles
- Validation manuelle obligatoire de tout nouveau compte par un Admin avant accès aux fonctionnalités métier
- "Météo du bénévole" (vert/jaune/rouge) saisie en fin de maraude — suivi psychologique léger
  - Visible uniquement par Admin + Manager de la maraude concernée
  - Jamais visible par les autres bénévoles de l'équipe, y compris le concerné lui-même dans l'UI standard

## Logistique repas
- Traçabilité : quoi, combien, préparé par qui (rattaché au Cuisinier et à la maraude du jour)
- Upload de tickets de caisse (photo) pour remboursement par le Trésorier
- Statut de remboursement suivi (en attente / remboursé)

## Suivi terrain & cartographie
- Capture automatique d'un "point de passage" à chaque action clé (ex. repas distribué) :
  géolocalisation du téléphone + horodatage, en un tap, fonctionne offline (mise en file, synchro au retour réseau)
- Cette table unique de points de passage alimente :
  - Les compteurs agrégés (nombre de personnes aidées, repas distribués)
  - Le tracé du circuit emprunté (points reliés dans l'ordre chronologique)
  - La heatmap de densité
- **Anonymisation géographique obligatoire** : jamais de coordonnées GPS exactes stockées ni affichées.
  Arrondi à une grille (~100m) ou rattachement à un tronçon de rue avant stockage, pour éviter
  qu'un recoupement de plusieurs maraudes ne révèle un lieu de vie identifiable
- Visibilité : heatmap + circuits + compteurs détaillés réservés à Admin/Manager.
  Maraudeur/Cuisinier n'ont pas besoin de cette vue

## Anonymat des personnes aidées
- Aucune fiche individuelle, aucun nom, aucune donnée identifiante sur les personnes aidées
- Uniquement des compteurs agrégés (nombre de personnes aidées, orientations sociales effectuées)

## KPIs pour les subventions
- Nombre de repas distribués (période sélectionnable)
- Nombre d'orientations sociales
- Nombre de personnes aidées (agrégé, jamais nominatif)
- Export double format : tableur (.xlsx/.csv) pour traitement interne, PDF formaté pour présentation aux financeurs

## PWA & usage terrain
- Offline-first : toute saisie terrain (repas, points de passage, météo bénévole) doit pouvoir être
  faite sans réseau et synchronisée automatiquement au retour de connexion
- Voir CLAUDE.md pour le détail technique (IndexedDB, Service Worker Background Sync)