import { ComptesClient } from "./comptes-client";

// Voir docs/Tasks.md, "Chantier lancé" — statut vérifié par
// dashboard/layout.tsx, rôle Admin vérifié côté client dans
// comptes-client.tsx (spécifique à cette page).
export default function ComptesPage() {
  return <ComptesClient />;
}
