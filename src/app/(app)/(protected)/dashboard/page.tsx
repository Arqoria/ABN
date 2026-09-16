import { DashboardHomeClient } from "./dashboard-home-client";

// Voir docs/Tasks.md, "Chantier lancé" — statut vérifié par
// dashboard/layout.tsx, identité par useSession(), plus de logique
// serveur propre à cette page.
export default function DashboardPage() {
  return <DashboardHomeClient />;
}
