"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import MaraudeCarte from "./maraude-carte-client";
import { CENTRE_PAR_DEFAUT, fetchCarte } from "./carte-data";

// Voir docs/Tasks.md, "Chantier lancé".
export function CarteClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["carte", maraudeId],
    queryFn: () => fetchCarte(maraudeId, profile.id, isAdmin),
  });

  useEffect(() => {
    if (data?.refuse) {
      router.replace("/dashboard/maraudes");
    }
  }, [data?.refuse, router]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[420px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data?.refuse) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger la carte pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { circuitReel, heatPoints, circuitPlanifieInitial, circuitPlanifieGeometrieInitial, canEdit } =
    data;
  const center = circuitReel[0] ?? heatPoints[0] ?? circuitPlanifieInitial[0] ?? CENTRE_PAR_DEFAUT;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
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
            circuitPlanifieGeometrieInitial={circuitPlanifieGeometrieInitial}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
