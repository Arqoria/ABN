// Module neutre (pas de "use server"/"server-only") — même raison que
// src/lib/categorie-depense.ts.
export const CATEGORIES_BESOIN = [
  "couvertures",
  "vetements_chauds",
  "chaussures",
  "hygiene",
  "nourriture_specifique",
  "autre",
] as const;

export type CategorieBesoin = (typeof CATEGORIES_BESOIN)[number];

export const CATEGORIE_BESOIN_LABELS: Record<CategorieBesoin, string> = {
  couvertures: "Couvertures",
  vetements_chauds: "Vêtements chauds",
  chaussures: "Chaussures",
  hygiene: "Hygiène",
  nourriture_specifique: "Nourriture spécifique",
  autre: "Autre",
};
