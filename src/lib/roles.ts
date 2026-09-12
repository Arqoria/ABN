// Constantes de rôles partagées entre Server ET Client Components. Ce
// fichier ne doit JAMAIS importer "server-only" ni quoi que ce soit qui en
// dépende (next/headers, etc.) — c'est exactement pour ça qu'il est séparé
// de src/lib/supabase/dal.ts : un Client Component (ex.
// valider-compte-form.tsx) a besoin de ROLE_LABELS mais ne peut pas
// importer un module server-only, même pour un simple objet de libellés.
export type RoleName =
  | "admin"
  | "manager"
  | "maraudeur"
  | "cuisinier"
  | "adherent"
  | "donateur";

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Admin",
  manager: "Manager",
  maraudeur: "Maraudeur",
  cuisinier: "Cuisinier",
  adherent: "Adhérent",
  donateur: "Donateur",
};
