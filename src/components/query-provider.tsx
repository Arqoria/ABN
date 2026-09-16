"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient créé dans un useState (pas au niveau module) pour éviter de
// partager un même client entre plusieurs requêtes/utilisateurs côté
// serveur lors du rendu initial — pattern recommandé par TanStack Query
// pour Next.js App Router. staleTime > 0 : évite un refetch immédiat à
// chaque montage de composant (ex. revenir sur une page déjà visitée),
// sans quoi le cache n'apporterait rien de perceptible.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
