// Module neutre (pas de "use server"/"server-only") — partagé entre pages
// serveur et composants client (carte, heatmap, graphiques). Un seul endroit
// pour l'ordre d'affichage, les libellés et les couleurs des 4 types
// d'action terrain, cohérent avec la charte graphique (src/app/globals.css).
export const TYPE_ACTIONS = [
  "repas_distribue",
  "personne_rencontree",
  "personne_aidee",
  "orientation_sociale",
] as const;

export type TypeAction = (typeof TYPE_ACTIONS)[number];

export const TYPE_LABELS: Record<TypeAction, string> = {
  repas_distribue: "Repas distribués",
  personne_rencontree: "Personnes rencontrées",
  personne_aidee: "Personnes aidées",
  orientation_sociale: "Orientations sociales",
};

export const TYPE_LABELS_COURT: Record<TypeAction, string> = {
  repas_distribue: "Repas",
  personne_rencontree: "Rencontrée",
  personne_aidee: "Aidée",
  orientation_sociale: "Orientation",
};

export const TYPE_COLORS: Record<TypeAction, string> = {
  repas_distribue: "#ff683d", // corail
  personne_rencontree: "#1e88e5", // bleu principal
  personne_aidee: "#16a34a", // vert (distinct des couleurs de marque, sens positif)
  orientation_sociale: "#0b3d91", // bleu nuit
};
