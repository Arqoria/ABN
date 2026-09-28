"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { fetchParcours, ParcoursChrono } from "./parcours-chrono";

// Page dédiée conservée (URL directe) — le chrono lui-même vit dans
// ParcoursChrono, partagé avec l'onglet "Parcours & Terrain" du panneau de
// détail (refonte 28/09). Même clé react-query : pas de double chargement.
export function ParcoursClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["parcours", maraudeId],
    queryFn: () => fetchParcours(maraudeId, profile.id, isAdmin),
  });

  useEffect(() => {
    if (data?.refuse) {
      router.replace("/dashboard/maraudes");
    }
  }, [data?.refuse, router]);

  if (isLoading) {
    return <CardListSkeleton rows={1} />;
  }

  if (data?.refuse) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger le parcours pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Parcours réel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enregistre la position pendant la marche pour que la heatmap reflète le
          territoire réellement couvert — distinct des points d&apos;action ponctuels.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{data.parcoursEnCours ? "Parcours en cours" : "Chrono"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ParcoursChrono maraudeId={maraudeId} />
        </CardContent>
      </Card>
    </div>
  );
}
