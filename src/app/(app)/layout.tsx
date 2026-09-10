import type { ReactNode } from "react";

// Layout de la WebApp métier (protégée) — pas de header/footer publics.
// Nav par rôle + shell applicatif réel à l'Étape 7, une fois l'auth
// Supabase branchée (Étape 2).
export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-col">{children}</div>;
}
