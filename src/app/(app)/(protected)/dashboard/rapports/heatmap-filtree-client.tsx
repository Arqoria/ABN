"use client";

import dynamic from "next/dynamic";

// Même contrainte que pour la carte de maraude : Leaflet touche window/
// document dès l'import, ssr:false n'est permis que depuis un Client
// Component.
const HeatmapFiltree = dynamic(
  () => import("./heatmap-filtree").then((m) => m.HeatmapFiltree),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] w-full items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Chargement de la carte…
      </div>
    ),
  },
);

export default HeatmapFiltree;
