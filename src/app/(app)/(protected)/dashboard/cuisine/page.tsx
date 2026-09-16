import { CuisineClient } from "./cuisine-client";

// Voir docs/Tasks.md, "Chantier lancé" — statut vérifié par
// dashboard/layout.tsx, rôle vérifié côté client dans cuisine-client.tsx
// (Admin, Manager ou Cuisinier, spécifique à cette page).
export default function CuisinePage() {
  return <CuisineClient />;
}
