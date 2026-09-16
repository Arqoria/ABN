import { AdherentsClient } from "./adherents-client";

// Voir docs/Tasks.md, "Chantier lancé" — statut vérifié par
// dashboard/layout.tsx, rôle Admin vérifié côté client dans
// adherents-client.tsx (spécifique à cette page).
export default function AdherentsPage() {
  return <AdherentsClient />;
}
