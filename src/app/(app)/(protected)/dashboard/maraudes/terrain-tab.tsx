"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Inchangé par rapport à l'existant (demande explicite) : mêmes 3 pages
// dédiées (points, carte, parcours), simplement regroupées sous ce
// sous-onglet plutôt que sous l'ancienne section "Terrain" à plat.
export function TerrainTab({ maraudeId }: { maraudeId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="outline" className="justify-start">
        <Link href={`/dashboard/maraudes/${maraudeId}/points`} prefetch={false}>
          Points de passage
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <Link href={`/dashboard/maraudes/${maraudeId}/carte`} prefetch={false}>
          Carte (heatmap, circuit réel, circuit planifié)
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <Link href={`/dashboard/maraudes/${maraudeId}/parcours`} prefetch={false}>
          Parcours réel (chrono)
        </Link>
      </Button>
    </div>
  );
}
