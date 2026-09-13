// Module neutre (pas de "server-only") — même raison que src/lib/roles.ts.
export const FONCTIONS_MARAUDE = ["cuisinier", "maraudeur"] as const;

export type FonctionMaraude = (typeof FONCTIONS_MARAUDE)[number];

export const FONCTION_MARAUDE_LABELS: Record<FonctionMaraude, string> = {
  cuisinier: "Cuisinier",
  maraudeur: "Maraudeur",
};

export const FONCTION_MARAUDE_ICONES: Record<FonctionMaraude, string> = {
  cuisinier: "🍳",
  maraudeur: "🚶",
};
