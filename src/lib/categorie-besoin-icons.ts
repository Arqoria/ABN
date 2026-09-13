import { BedDouble, HelpCircle, Shirt, ShowerHead, Soup, type LucideIcon } from "lucide-react";
import type { CategorieBesoin } from "@/lib/categorie-besoin";

// Pictogrammes pour l'affichage public des besoins matériels (accueil, /dons)
// — séparé de categorie-besoin.ts (module neutre utilisé aussi côté
// formulaires/rapports internes qui n'ont pas besoin de lucide-react).
export const CATEGORIE_BESOIN_ICONS: Record<CategorieBesoin, LucideIcon> = {
  couvertures: BedDouble,
  vetements_chauds: Shirt,
  hygiene: ShowerHead,
  nourriture_specifique: Soup,
  autre: HelpCircle,
};

// Exemples concrets par catégorie, affichés en complément du libellé pour
// rendre une catégorie large (ex. "Hygiène") plus parlante pour un donateur
// — juste des exemples illustratifs de ce que couvre la catégorie, pas un
// besoin précis signalé (ça reste besoins_publics qui donne le vrai signal
// "combien de fois signalé"). "Autre" volontairement sans exemple (fourre-tout).
export const CATEGORIE_BESOIN_EXEMPLES: Partial<Record<CategorieBesoin, string>> = {
  couvertures: "Couvertures, duvets, sacs de couchage",
  vetements_chauds: "Pulls, manteaux, gants, bonnets",
  hygiene: "Savon, gel douche, protections, rasoirs",
  nourriture_specifique: "Conserves, produits longue conservation",
};
