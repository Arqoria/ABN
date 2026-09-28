import type { CategorieBesoin } from "@/lib/categorie-besoin";

// Raccourcis de précision par catégorie de besoin (28/09) — de simples aides
// à la saisie : le choix est COMPOSÉ dans le texte de précision existant
// (besoins_signales.commentaire, ex. "Jean/Pantalon - Taille L"), aucune
// colonne en base. Le site vitrine et les rapports regroupent uniquement par
// catégorie : ces précisions n'y apparaissent pas et ne les perturbent pas.
// Module neutre (pas de "use server"/"server-only"), même raison que
// categorie-besoin.ts.
export type PrecisionBesoin = {
  // Premier choix (type d'article), facultatif.
  types?: string[];
  // Second choix (taille / pointure), facultatif.
  tailles?: { libelle: string; prefixe: string; valeurs: string[] };
};

const POINTURES = Array.from({ length: 12 }, (_, i) => String(36 + i));

export const PRECISIONS_BESOIN: Partial<Record<CategorieBesoin, PrecisionBesoin>> = {
  vetements_chauds: {
    types: ["Pull/Sweat", "Jean/Pantalon", "Doudoune/Manteau", "T-shirt", "Sous-vêtements", "Chaussettes"],
    tailles: { libelle: "Taille", prefixe: "Taille", valeurs: ["S", "M", "L", "XL", "XXL"] },
  },
  chaussures: {
    tailles: { libelle: "Pointure", prefixe: "Pointure", valeurs: POINTURES },
  },
  hygiene: {
    types: ["Kit dentaire", "Savon/Douche", "Rasoirs", "Protections féminines"],
  },
};

// "Jean/Pantalon - Taille L — 2 personnes ce soir" : raccourcis puis texte
// libre éventuel, dans cet ordre.
export function composerPrecision(
  categorie: CategorieBesoin,
  type: string | null,
  taille: string | null,
  texteLibre: string,
): string {
  const tailles = PRECISIONS_BESOIN[categorie]?.tailles;
  const raccourcis = [type, taille && tailles ? `${tailles.prefixe} ${taille}` : null]
    .filter(Boolean)
    .join(" - ");
  return [raccourcis, texteLibre.trim()].filter(Boolean).join(" — ");
}
