"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MaraudeCarte from "./[maraudeId]/carte/maraude-carte-client";
import { CENTRE_PAR_DEFAUT, fetchCarte } from "./[maraudeId]/carte/carte-data";
import { ParcoursChrono } from "./[maraudeId]/parcours/parcours-chrono";
import { checkAcces } from "./[maraudeId]/points/points-client";
import { CapturePointForm } from "./[maraudeId]/points/capture-point-form";

// Refonte 28/09 — tout est sous les yeux du maraudeur, sans sous-page :
// - carte Leaflet intégrée (circuit planifié + édition pour Admin/Manager
//   de la maraude). Le circuit RÉEL n'apparaît que pour une maraude de
//   l'onglet Historique (correctif 25/09 conservé) ;
// - chrono Démarrer/Terminer : Admin/Manager de CETTE maraude, le jour J
//   uniquement (quel que soit l'onglet — une maraude du jour bascule en
//   Historique dès son heure de départ dépassée) ;
// - 4 boutons de pointage géolocalisé : maraude du jour uniquement (ni
//   future, ni passée), mêmes règles d'accès que la page Points de passage.
// Les pages dédiées (/carte, /parcours, /points) restent accessibles à leur
// URL, simplement plus liées d'ici.
export function TerrainTab({
  maraudeId,
  estPassee,
  estJourJ,
  peutGererMaraude,
}: {
  maraudeId: string;
  estPassee: boolean;
  estJourJ: boolean;
  peutGererMaraude: boolean;
}) {
  const profile = useSession();
  const isAdmin = profile.roles.includes("admin");
  const isAdminOrManager = isAdmin || profile.roles.includes("manager");

  const carte = useQuery({
    queryKey: ["carte", maraudeId],
    queryFn: () => fetchCarte(maraudeId, profile.id, isAdmin),
  });
  const acces = useQuery({
    queryKey: ["acces", maraudeId],
    queryFn: () => checkAcces(maraudeId, profile.id, isAdminOrManager),
    enabled: estJourJ,
  });

  return (
    <div className="flex flex-col gap-4">
      {estJourJ && peutGererMaraude && (
        <Card className="gap-3 border-brand-blue/40 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">⏱️ Parcours réel (chrono)</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <ParcoursChrono maraudeId={maraudeId} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {carte.isLoading ? (
          <Skeleton className="h-[260px] w-full lg:h-[360px]" />
        ) : carte.isError || !carte.data ? (
          <p className="text-sm text-muted-foreground">
            Impossible de charger la carte pour l&apos;instant.
          </p>
        ) : carte.data.refuse ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Le parcours est visible par l&apos;équipe inscrite sur cette maraude.
          </p>
        ) : (
          <MaraudeCarte
            // Remonte la carte si l'on change de maraude : l'état local
            // (points en cours d'édition) est propre à chaque circuit.
            key={maraudeId}
            maraudeId={maraudeId}
            center={
              (estPassee ? carte.data.circuitReel[0] : undefined) ??
              carte.data.circuitPlanifieInitial[0] ??
              carte.data.heatPoints[0] ??
              CENTRE_PAR_DEFAUT
            }
            heatPoints={carte.data.heatPoints}
            circuitReel={carte.data.circuitReel}
            circuitPlanifieInitial={carte.data.circuitPlanifieInitial}
            circuitPlanifieGeometrieInitial={carte.data.circuitPlanifieGeometrieInitial}
            canEdit={carte.data.canEdit}
            afficherCircuitReel={estPassee}
            hauteurClass="h-[260px] lg:h-[360px]"
          />
        )}
      </div>

      {estJourJ ? (
        acces.data ? (
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">📍 Actions terrain — un tap = une action</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 px-4">
              <CapturePointForm maraudeId={maraudeId} userId={profile.id} />
              <p className="text-xs text-muted-foreground">
                Position arrondie automatiquement (~100m), jamais stockée précisément.
              </p>
            </CardContent>
          </Card>
        ) : acces.isLoading ? (
          <Skeleton className="h-36 w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Les actions terrain sont réservées à l&apos;équipe inscrite.
          </p>
        )
      ) : (
        !estPassee && (
          <p className="text-sm text-muted-foreground">
            Les boutons d&apos;action terrain apparaîtront ici le jour de la maraude.
          </p>
        )
      )}
    </div>
  );
}
