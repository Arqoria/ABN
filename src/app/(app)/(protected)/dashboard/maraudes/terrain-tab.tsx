"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Inchangé par rapport à l'existant (demande explicite) : mêmes pages
// dédiées (points, carte, parcours), simplement regroupées sous ce
// sous-onglet plutôt que sous l'ancienne section "Terrain" à plat.
//
// Précision (25/09) : le circuit RÉEL (parcours_reels, bouton Démarrer/
// Terminer) n'a de sens qu'une fois la maraude passée — pas de bouton
// "Démarrer" ni de carte de parcours réel vide sur un événement qui n'a
// pas encore eu lieu. Pour une maraude à venir, seul le circuit PRÉVU
// (circuits_planifies, préparé à l'avance sur la page Carte) est
// pertinent — le lien "Parcours réel (chrono)" n'est donc affiché que
// pour l'onglet Historique.
export function TerrainTab({ maraudeId, estPassee }: { maraudeId: string; estPassee: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Button asChild variant="outline" className="justify-start">
        <Link href={`/dashboard/maraudes/${maraudeId}/points`} prefetch={false}>
          Points de passage
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <Link href={`/dashboard/maraudes/${maraudeId}/carte`} prefetch={false}>
          {estPassee
            ? "Carte (heatmap, circuit réel, circuit planifié)"
            : "Carte (circuit planifié)"}
        </Link>
      </Button>
      {estPassee && (
        <Button asChild variant="outline" className="justify-start">
          <Link href={`/dashboard/maraudes/${maraudeId}/parcours`} prefetch={false}>
            Parcours réel (chrono)
          </Link>
        </Button>
      )}
    </div>
  );
}
