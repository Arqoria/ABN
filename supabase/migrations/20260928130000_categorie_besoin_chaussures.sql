-- =============================================================================
-- Nouvelle catégorie de besoin "Chaussures" (décision Chef de Produit,
-- 28/09 : catégorie à part entière plutôt qu'un raccourci dans Vêtements).
-- La pointure (36 à 47) est composée dans le texte de précision existant
-- (besoins_signales.commentaire) — aucune colonne ajoutée.
--
-- L'enum categorie_besoin est partagé avec stock_materiel_mouvements : la
-- catégorie devient aussi disponible pour le stock matériel. La vue publique
-- besoins_publics (site vitrine) et les rapports regroupent par categorie
-- sans liste en dur : ils la comptent automatiquement, libellé et icône
-- ajoutés côté application (src/lib/categorie-besoin*.ts).
-- =============================================================================

alter type public.categorie_besoin add value if not exists 'chaussures' after 'vetements_chauds';
