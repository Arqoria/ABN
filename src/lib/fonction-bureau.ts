// Module neutre (pas de "server-only") — même raison que src/lib/roles.ts :
// un Client Component (formulaire de validation de compte) en a besoin.
// Purement cosmétique : voir supabase/migrations/20260912230000_fonction_bureau.sql,
// ce champ ne conditionne aucune permission.
export type FonctionBureau = "president" | "tresorier" | "secretaire";

export const FONCTION_BUREAU_LABELS: Record<FonctionBureau, string> = {
  president: "Président",
  tresorier: "Trésorier",
  secretaire: "Secrétaire",
};
