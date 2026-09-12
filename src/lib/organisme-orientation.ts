// Module neutre (pas de "server-only"/"use server") — même raison que
// src/lib/roles.ts et src/lib/categorie-depense.ts : consommé à la fois par
// des Server Components/Actions et par des Client Components (formulaire de
// capture terrain).
export const ORGANISMES_ORIENTATION = [
  "samu_social_115",
  "ccas",
  "ccas_15e_corps",
  "croix_rouge",
  "secours_catholique",
  "restos_du_coeur",
  "emmaus",
  "douche_municipale",
  "autre_maraude",
  "medecins_sans_frontieres",
  "coviam",
  "france_services",
  "msd",
  "csapa",
  "caarud",
  "halte_de_nuit",
  "chrs",
  "autre",
] as const;

export type OrganismeOrientation = (typeof ORGANISMES_ORIENTATION)[number];

export const ORGANISME_ORIENTATION_LABELS: Record<OrganismeOrientation, string> = {
  samu_social_115: "115 (SAMU social)",
  ccas: "CCAS",
  ccas_15e_corps: "CCAS 15e corps",
  croix_rouge: "Croix-Rouge",
  secours_catholique: "Secours Catholique",
  restos_du_coeur: "Restos du Cœur",
  emmaus: "Emmaüs",
  douche_municipale: "Douche municipale",
  autre_maraude: "Autre maraude",
  medecins_sans_frontieres: "Médecins Sans Frontières",
  coviam: "COVIAM",
  france_services: "France Services",
  msd: "MSD",
  csapa: "CSAPA",
  caarud: "CAARUD",
  halte_de_nuit: "Halte de nuit",
  chrs: "CHRS",
  autre: "Autre",
};
