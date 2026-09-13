import { BedDouble, Droplet, HelpCircle, Shirt, Soup, type LucideIcon } from "lucide-react";
import type { CategorieBesoin } from "@/lib/categorie-besoin";

// Pictogrammes pour l'affichage public des besoins matériels (accueil, /dons)
// — séparé de categorie-besoin.ts (module neutre utilisé aussi côté
// formulaires/rapports internes qui n'ont pas besoin de lucide-react).
export const CATEGORIE_BESOIN_ICONS: Record<CategorieBesoin, LucideIcon> = {
  couvertures: BedDouble,
  vetements_chauds: Shirt,
  hygiene: Droplet,
  nourriture_specifique: Soup,
  autre: HelpCircle,
};
