"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TypeAction } from "@/lib/type-action";
import type { OrganismeOrientation } from "@/lib/organisme-orientation";
import type { GeometrieLigne } from "@/lib/ors";
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
  circuitPlanifieGeometrieInitial: GeometrieLigne | null;
  canEdit: boolean;
  refuse: boolean;
};

// Lecture directe Supabase depuis le navigateur — page la plus lourde du
// dashboard (heatmap jusqu'à 5000 points), celle qui profite le plus de
// sortir du rendu serveur bloquant. Voir docs/Tasks.md, "Chantier lancé,
// suite (16/09)".
async function fetchCarte(
  maraudeId: string,
  profileId: string,
  isAdmin: boolean,
): Promise<Payload> {
  const supabase = createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, date_heure, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return {
      circuitReel: [],
      heatPoints: [],
      circuitPlanifieInitial: [],
      circuitPlanifieGeometrieInitial: null,
      canEdit: false,
      refuse: true,
    };
  }

  const isOwnManager = maraude.manager_id === profileId;
  const canEdit = isAdmin || isOwnManager;

  if (!canEdit) {
    const { data: inscription } = await supabase
      .from("inscriptions_maraude")
      .select("statut")
      .eq("maraude_id", maraudeId)
      .eq("user_id", profileId)
      .maybeSingle();

    if (inscription?.statut !== "inscrit") {
      return {
        circuitReel: [],
        heatPoints: [],
        circuitPlanifieInitial: [],
        circuitPlanifieGeometrieInitial: null,
        canEdit: false,
        refuse: true,
      };
    }
  }

  const [{ data: pointsReel }, { data: pointsHeat }, { data: pointsParcours }, { data: circuitPlanifie }] =
    await Promise.all([
      supabase
        .from("points_passage_geo")
        .select("lat, lng, type_action, horodatage, orientation_vers, orientation_vers_autre")
        .eq("maraude_id", maraudeId)
        .order("horodatage", { ascending: true }),
      supabase.from("points_passage_geo").select("lat, lng").limit(5000),
      // Parcours réel (chrono, 24/09) : agrégé dans la MÊME heatmap de
      // densité que points_passage — simple couche de fond, pas de type
      // d'action associé (contrairement à circuitReel ci-dessus, qui reste
      // uniquement basé sur points_passage). Voir docs/Specs.md.
      supabase.from("parcours_reels_points_geo").select("lat, lng").limit(5000),
      supabase
        .from("circuits_planifies")
        .select("points, geometrie_reelle")
        .eq("maraude_id", maraudeId)
        .maybeSingle(),
    ]);

  const circuitReel = (pointsReel ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
    typeAction: p.type_action as TypeAction,
    horodatage: p.horodatage as string,
    orientationVers: p.orientation_vers as OrganismeOrientation | null,
    orientationVersAutre: p.orientation_vers_autre as string | null,
  }));

  const heatPoints = [...(pointsHeat ?? []), ...(pointsParcours ?? [])].map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
  }));

  const circuitPlanifieInitial =
    (circuitPlanifie?.points as { lat: number; lng: number }[] | null) ?? [];
  const circuitPlanifieGeometrieInitial =
    (circuitPlanifie?.geometrie_reelle as GeometrieLigne | null) ?? null;

  return {
    circuitReel,
    heatPoints,
    circuitPlanifieInitial,
    circuitPlanifieGeometrieInitial,
    canEdit,
    refuse: false,
  };
}

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
