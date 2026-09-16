import { StocksClient } from "./stocks-client";

// Voir docs/Tasks.md, "Chantier lancé" — statut vérifié par
// dashboard/layout.tsx, rôle vérifié côté client dans stocks-client.tsx
// (Admin, Manager ou Maraudeur, spécifique à cette page).
export default function StocksPage() {
  return <StocksClient />;
}
