"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TypeAction } from "@/lib/type-action";
import type { OrganismeOrientation } from "@/lib/organisme-orientation";
import MaraudeCarte from "./maraude-carte-client";

// Centre par défaut si aucune donnée exploitable (Nice, place Masséna) —
// juste un point de départ visuel, aucune signification métier.
const CENTRE_PAR_DEFAUT = { lat: 43.6961, lng: 7.2717 };

type CircuitPoint = {
  lat: number;
  lng: number;
  typeAction: TypeAction;
  horodatage: string;
  orientationVers: OrganismeOrientation | null;
  orientationVersAutre: string | null;
};
type Payload = {
  circuitReel: CircuitPoint[];
  heatPoints: { lat: number; lng: number }[];
  circuitPlanifieInitial: { lat: number; lng: number }[];
  canEdit: boolean;
};

async function fetchCarte(maraudeId: string): Promise<Payload> {
  const res = await fetch(`/api/maraudes/${maraudeId}/carte`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé" — page la plus lourde du dashboard
// (heatmap jusqu'à 5000 points), celle qui profite le plus de sortir du
// rendu serveur bloquant à chaque navigation.
export function CarteClient() {
  useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["carte", maraudeId],
    queryFn: () => fetchCarte(maraudeId),
  });

  useEffect(() => {
    if (error instanceof Error && (error.message === "403" || error.message === "404")) {
      router.replace("/dashboard/maraudes");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger la carte pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { circuitReel, heatPoints, circuitPlanifieInitial, canEdit } = data;
  const center = circuitReel[0] ?? heatPoints[0] ?? circuitPlanifieInitial[0] ?? CENTRE_PAR_DEFAUT;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Carte de la maraude
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Heatmap de l&apos;historique, circuit réellement effectué, et
          circuit planifié{canEdit ? " — cliquez pour le définir" : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carte</CardTitle>
        </CardHeader>
        <CardContent>
          <MaraudeCarte
            maraudeId={maraudeId}
            center={center}
            heatPoints={heatPoints}
            circuitReel={circuitReel}
            circuitPlanifieInitial={circuitPlanifieInitial}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
