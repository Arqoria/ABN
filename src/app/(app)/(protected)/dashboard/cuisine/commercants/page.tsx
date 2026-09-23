import { CommercantsClient } from "./commercants-client";

// Voir docs/Tasks.md — statut vérifié par dashboard/layout.tsx, rôle Admin
// vérifié côté client dans commercants-client.tsx.
export default function CommercantsPage() {
  return <CommercantsClient />;
}
