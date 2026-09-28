"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { demarrerParcours, ajouterPointParcours, terminerParcours } from "@/lib/actions/parcours";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export type ParcoursPayload = {
  parcoursEnCours: { id: string; demarre_le: string } | null;
  canWrite: boolean;
  refuse: boolean;
};

// Distance approximative entre deux points (formule de Haversine, en
// mètres) — sert uniquement au seuil client "~20m de déplacement" avant de
// capturer un nouveau point, aucune précision cartographique requise ici.
function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const INTERVALLE_MIN_MS = 30_000;
const DISTANCE_MIN_M = 20;

export async function fetchParcours(
  maraudeId: string,
  profileId: string,
  isAdmin: boolean,
): Promise<ParcoursPayload> {
  const supabase = createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return { parcoursEnCours: null, canWrite: false, refuse: true };
  }

  const isOwnManager = maraude.manager_id === profileId;

  if (!isAdmin && !isOwnManager) {
    const { data: inscription } = await supabase
      .from("inscriptions_maraude")
      .select("statut")
      .eq("maraude_id", maraudeId)
      .eq("user_id", profileId)
      .maybeSingle();
    if (inscription?.statut !== "inscrit") {
      return { parcoursEnCours: null, canWrite: false, refuse: true };
    }
  }

  const { data: parcoursEnCours } = await supabase
    .from("parcours_reels")
    .select("id, demarre_le")
    .eq("maraude_id", maraudeId)
    .eq("statut", "en_cours")
    .maybeSingle();

  return { parcoursEnCours: parcoursEnCours ?? null, canWrite: isAdmin || isOwnManager, refuse: false };
}

// Extrait de parcours-client.tsx (refonte 28/09) pour être intégré tel quel
// dans l'onglet "Parcours & Terrain" du panneau de détail — logique
// inchangée. Voir docs/Tasks.md, "Checklist de départ + présence confirmée
// + parcours réel". Capture continue via watchPosition, throttlée côté
// client au plus tôt de ~30s ou ~20m de déplacement. ⚠️ Limite assumée et
// documentée (Specs.md) : la capture s'arrête si l'onglet/l'app passe en
// arrière-plan ou l'écran se verrouille (particulièrement iPhone), ou si ce
// composant est démonté (changement de maraude sélectionnée, navigation).
export function ParcoursChrono({ maraudeId }: { maraudeId: string }) {
  const profile = useSession();
  const queryClient = useQueryClient();
  const isAdmin = profile.roles.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["parcours", maraudeId],
    queryFn: () => fetchParcours(maraudeId, profile.id, isAdmin),
  });

  // null = pas encore d'action locale : l'état reflète alors le serveur
  // (parcours déjà en cours, ex. après un rechargement de page — la capture
  // locale ne peut pas reprendre, seul "Terminer" reste disponible).
  const [enCoursLocal, setEnCours] = useState<boolean | null>(null);
  const enCours = enCoursLocal ?? !!data?.parcoursEnCours;
  const [erreurGeo, setErreurGeo] = useState<string | null>(null);
  const [nbPoints, setNbPoints] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const parcoursIdRef = useRef<string | null>(null);
  const dernierPointRef = useRef<{ lat: number; lng: number; t: number } | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  function demarrer() {
    setErreurGeo(null);
    if (!("geolocation" in navigator)) {
      setErreurGeo("Géolocalisation indisponible sur cet appareil.");
      return;
    }

    demarrerParcours(maraudeId).then((result) => {
      if ("error" in result) {
        setErreurGeo(result.error);
        return;
      }
      parcoursIdRef.current = result.id;
      dernierPointRef.current = null;
      setNbPoints(0);
      setEnCours(true);

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const point = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            t: Date.now(),
          };
          const dernier = dernierPointRef.current;
          const assezLoin = !dernier || distanceMetres(dernier, point) >= DISTANCE_MIN_M;
          const assezTard = !dernier || point.t - dernier.t >= INTERVALLE_MIN_MS;

          if (!dernier || assezLoin || assezTard) {
            dernierPointRef.current = point;
            if (parcoursIdRef.current) {
              ajouterPointParcours(parcoursIdRef.current, point.lat, point.lng).then(() => {
                setNbPoints((n) => n + 1);
              });
            }
          }
        },
        () => {
          setErreurGeo(
            "Position indisponible — vérifiez l'autorisation de géolocalisation. La marche continue d'être enregistrable en réessayant.",
          );
        },
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
      watchIdRef.current = watchId;
    });
  }

  function terminer() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    const parcoursId = parcoursIdRef.current ?? data?.parcoursEnCours?.id;
    if (parcoursId) {
      terminerParcours(parcoursId).then(() => {
        setEnCours(false);
        parcoursIdRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["parcours", maraudeId] });
      });
    }
  }

  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (isError || !data || data.refuse) {
    return null;
  }

  if (!data.canWrite) {
    return (
      <p className="text-sm text-muted-foreground">
        Seul le Manager de cette maraude (ou un Admin) peut démarrer/terminer le parcours.{" "}
        {enCours ? "Un parcours est actuellement en cours." : ""}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!enCours ? (
        <Button type="button" className="h-12" onClick={demarrer}>
          ⏱️ Démarrer la maraude
        </Button>
      ) : (
        <>
          <Button type="button" variant="destructive" className="h-12" onClick={terminer}>
            ⏹️ Terminer la maraude
          </Button>
          <p className="text-sm text-muted-foreground">
            {nbPoints > 0
              ? `${nbPoints} point(s) capturé(s) depuis cet écran.`
              : "En attente de la première position…"}
          </p>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        ⚠️ Gardez l&apos;application ouverte et l&apos;écran allumé pendant toute la marche
        pour un enregistrement fiable — la capture peut s&apos;interrompre si l&apos;écran se
        verrouille ou que l&apos;app passe en arrière-plan (particulièrement sur iPhone).
      </p>
      {erreurGeo && (
        <p role="alert" className="text-sm text-destructive">
          {erreurGeo}
        </p>
      )}
    </div>
  );
}
