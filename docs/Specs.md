# Specs métier — ABN

Source de vérité fonctionnelle du projet. CLAUDE.md y renvoie plutôt que de dupliquer ce contenu.

## Rôles & permissions
- **Admin** (Trésorier/Présidence) : accès complet, validation des comptes, gestion des rôles, gestion financière
- **Manager** (Chef de maraude) : gestion de son équipe/maraude, accès météo bénévole et heatmap
- **Maraudeur** : participation aux maraudes, saisie terrain, pas d'accès aux données agrégées/carto
- **Cuisinier** : gestion de la préparation des repas, pas d'accès aux données agrégées/carto

## Gestion des maraudes
- Équipe limitée à `max_participants` par événement (6 par défaut, configurable par événement ou par série — voir ci-dessous)
- Liste d'attente automatique au-delà de la capacité, promotion automatique en cas de désistement

## Types d'événements, nature, séries récurrentes et vacances scolaires (22/09)

La table `maraudes` couvre depuis le 22/09 plus que la maraude hebdomadaire
classique : tout événement (maraude mobile, événement à point fixe comme un
goûter) y vit sous le même nom de table (décision explicite : pas de
renommage, voir docs/Tasks.md pour l'état des lieux qui a précédé cette
décision), distingué par son **type**.

- **`nature`** (enum fixe, 2 valeurs, non éditable) : `maraude` (mobile,
  autorise un circuit planifié) ou `evenement_fixe` (point fixe, ne peut
  jamais avoir de circuit planifié — seule restriction structurelle liée à
  la nature ; toutes les autres tables — repas, tickets de dépense, météo
  bénévole, besoins signalés, affectations, stocks, dons ponctuels — restent
  disponibles pour les deux natures, sans logique dupliquée).
- **`types_evenement`** : ce que l'Admin configure réellement (ex. "Maraude
  classique", "Goûter"). Chaque type est rattaché à une nature fixe. Jamais
  de suppression physique, seulement une désactivation (`actif`).
- **`series_evenements`** : une règle de récurrence (fréquence
  hebdomadaire/toutes les 2 semaines/mensuelle au Nième jour, jour de la
  semaine, heure, Manager et capacité par défaut, horizon de génération)
  rattachée à un `type_evenement_id`. La génération crée automatiquement les
  lignes `maraudes` correspondantes (immédiatement à la création de la
  série, puis quotidiennement via `/api/cron/generer-occurrences`).
  Désactiver une série arrête la génération future sans toucher aux
  occurrences déjà créées.

### Cumuler deux fréquences sur un même type (méthode recommandée)

Pour un besoin comme "plus souvent pendant les vacances scolaires", ne pas
chercher un mécanisme d'exception unique — **superposer deux séries sur le
même `type_evenement_id`**, chacune avec sa propre fréquence. Les deux
règles cohabitent et se cumulent, elles ne s'excluent pas.

**Exemple concret : "Maraude des enfants"**
- Une série **mensuelle** (ex. le 1er mercredi du mois), toute l'année —
  `limiter_aux_vacances_scolaires = false`.
- Une seconde série **hebdomadaire** (même jour), mais
  `limiter_aux_vacances_scolaires = true` : ne génère une occurrence QUE si
  la date calculée tombe dans une période `vacances_scolaires`.

Résultat : une maraude des enfants par mois habituellement, chaque semaine
pendant les vacances — sans aucune règle spéciale à coder, juste deux
séries simples empilées.

### Vacances scolaires

Table `vacances_scolaires` (nom, date_debut, date_fin) — **Zone B
uniquement** (académie de Nice), pas de gestion multi-zone, l'association
n'opère qu'à Nice.

**⚠️ Mise à jour manuelle annuelle requise.** Le Ministère de l'Éducation
nationale ne publie le calendrier scolaire officiel que quelques mois à
l'avance (pas assez tôt pour couvrir un horizon glissant de façon fiable
via une automatisation/cron) — aucune automatisation n'est prévue. Quand un
nouveau calendrier officiel est publié
(https://www.education.gouv.fr/le-calendrier-scolaire-9047, ou directement
le fichier ICS Zone B :
https://fr.ftp.opendatasoft.com/openscol/fr-en-calendrier-scolaire/Zone-B.ics),
un Admin doit ajouter les nouvelles périodes dans `vacances_scolaires`
(actuellement via une migration SQL — pas encore d'UI dédiée à cette table,
seulement sa lecture par le moteur de récurrence). Le DTEND d'un événement
ICS "jour entier" est exclusif (RFC 5545, jour APRÈS la fin réelle) : à
convertir en borne inclusive (DTEND − 1 jour) avant insertion.

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

### Circuit planifié — tracé réel suivant les rues (22/09)

Le Manager/Admin définit un circuit planifié en cliquant une suite de
points sur la carte (`circuits_planifies.points`, ordonnés). Ces points
restent la donnée source, jamais remplacée. En plus, à chaque
enregistrement, le circuit est envoyé à l'API **Directions
d'OpenRouteService** (profil `foot-walking` — les équipes se déplacent à
pied) qui retourne le tracé réel suivant les rues/trottoirs, stocké à côté
(`circuits_planifies.geometrie_reelle`, GeoJSON `LineString`). La carte
affiche ce tracé réel quand il est disponible.

- **Compte/clé** : `ORS_API_KEY`, compte gratuit openrouteservice.org
  (créé et géré par l'association, pas par l'assistant — voir
  `.env.local.example`). Appel fait uniquement côté serveur
  (`src/lib/ors.ts`, depuis la Server Action `enregistrerCircuitPlanifie`)
  — la clé n'est jamais exposée au navigateur.
- **Dégradation obligatoire** : si l'appel échoue pour n'importe quelle
  raison (pas de connexion, quota gratuit dépassé, points trop excentrés/
  non routables à pied, clé absente ou invalide, timeout), le circuit
  s'enregistre quand même avec `geometrie_reelle = null` — jamais
  d'exception qui bloquerait l'enregistrement. La carte se replie alors
  sur l'ancienne ligne droite entre les points bruts, avec un message
  discret ("tracé réel indisponible pour l'instant, ligne droite
  affichée"), jamais un écran cassé.
- **Recalcul systématique** : la géométrie est recalculée à CHAQUE
  enregistrement du circuit (jamais réutilisée d'une fois sur l'autre) —
  sinon un appel qui échoue après une modification des points laisserait
  un tracé qui ne correspond plus aux points actuels, silencieusement faux.
- Pendant l'édition (avant le prochain enregistrement), la carte affiche
  la ligne droite en aperçu — le tracé réel n'apparaît qu'une fois le
  circuit (ré-)enregistré avec succès.

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