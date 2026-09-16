import { Suspense } from "react";
import { RapportsClient } from "./rapports-client";

// Voir docs/Tasks.md, "Chantier lancé". Suspense requis par Next.js pour
// tout composant utilisant useSearchParams() (filtre de période).
export default function RapportsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      }
    >
      <RapportsClient />
    </Suspense>
  );
}
