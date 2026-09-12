// Module neutre (pas de "use server", pas de "server-only") — importable
// aussi bien depuis une Server Action que depuis un Client Component. Un
// fichier "use server" ne peut exporter QUE des fonctions async (voir
// erreur de build Next.js "A 'use server' file can only export async
// functions, found object"), donc ce genre de constante ne peut pas vivre
// dans src/lib/actions/tickets.ts — même raison que src/lib/roles.ts.
export const CATEGORIES = [
  "alimentaire",
  "carburant",
  "materiel",
  "autre",
] as const;

export type CategorieDepense = (typeof CATEGORIES)[number];

export const CATEGORIE_LABELS: Record<CategorieDepense, string> = {
  alimentaire: "Alimentaire",
  carburant: "Carburant",
  materiel: "Matériel",
  autre: "Autre",
};
