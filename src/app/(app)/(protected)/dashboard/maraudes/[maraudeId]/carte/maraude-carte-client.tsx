"use client";

import dynamic from "next/dynamic";

// Leaflet touche `window`/`document` dès l'import — impossible à faire
// tourner côté serveur (Server Component). ssr:false n'est autorisé que
// depuis un Client Component, d'où cet intermédiaire.
const MaraudeCarte = dynamic(
  () => import("./maraude-carte").then((m) => m.MaraudeCarte),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Chargement de la carte…
      </div>
    ),
  },
);

export default MaraudeCarte;
