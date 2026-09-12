// Couleurs cohérentes avec la charte graphique (voir src/app/globals.css) —
// module neutre partagé entre le composant carte (client) et la légende.
export const TYPE_COLORS: Record<string, string> = {
  repas_distribue: "#ff683d", // corail
  personne_rencontree: "#1e88e5", // bleu principal
  personne_aidee: "#16a34a", // vert (distinct des couleurs de marque, sens positif)
  orientation_sociale: "#0b3d91", // bleu nuit
};

export const TYPE_LABELS_COURT: Record<string, string> = {
  repas_distribue: "Repas",
  personne_rencontree: "Rencontrée",
  personne_aidee: "Aidée",
  orientation_sociale: "Orientation",
};
