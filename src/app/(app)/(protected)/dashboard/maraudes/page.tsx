import { MaraudesClient } from "./maraudes-client";

// Page pilote du chantier perf (voir docs/Tasks.md, Diagnostic perf webapp
// et maraudes-client.tsx) — aucune logique serveur propre à cette page :
// l'identité vient du contexte posé par le layout protégé (déjà vérifiée
// une fois par requête), les données par React Query côté client. Naviguer
// ici ne déclenche donc plus de nouvel appel Supabase pour l'identité.
export default function MaraudesPage() {
  return <MaraudesClient />;
}
