"use client";

import { useState, useTransition } from "react";
import { capturerPointPassage } from "@/lib/actions/points-passage";
import { offlineDb } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";

type TypeAction =
  | "repas_distribue"
  | "personne_aidee"
  | "personne_rencontree"
  | "orientation_sociale";

const OPTIONS: { value: TypeAction; label: string }[] = [
  { value: "repas_distribue", label: "🍲 Repas distribué" },
  { value: "personne_rencontree", label: "👋 Personne rencontrée" },
  { value: "personne_aidee", label: "🤝 Personne aidée" },
  { value: "orientation_sociale", label: "🧭 Orientation sociale" },
];

type Message = { type: "error" | "queued" | "success"; text: string };

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("no-geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });
}

// Un tap = une capture (pas de formulaire à remplir sur le terrain, souvent
// de nuit et parfois avec des gants — voir CLAUDE.md). La position brute
// n'est utilisée qu'une fois, le temps du trajet réseau : le trigger
// force_geo_arrondi (Étape 6) la recale sur une grille ~100m côté serveur,
// jamais stockée précisément — y compris dans la file d'attente hors-ligne.
export function CapturePointForm({
  maraudeId,
  userId,
}: {
  maraudeId: string;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  function submit(typeAction: TypeAction) {
    startTransition(async () => {
      let lat: number;
      let lng: number;

      try {
        const position = await getPosition();
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch {
        setMessage({
          type: "error",
          text: "Position indisponible — vérifiez l'autorisation de géolocalisation.",
        });
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await offlineDb.pendingPointsPassage.add({
          maraudeId,
          userId,
          typeAction,
          lat,
          lng,
          createdAt: Date.now(),
        });
        setMessage({
          type: "queued",
          text: "Hors ligne : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
        return;
      }

      const formData = new FormData();
      formData.set("maraudeId", maraudeId);
      formData.set("typeAction", typeAction);
      formData.set("lat", String(lat));
      formData.set("lng", String(lng));

      try {
        const result = await capturerPointPassage(undefined, formData);
        if (result?.error) {
          setMessage({ type: "error", text: result.error });
          return;
        }
        setMessage({ type: "success", text: "Capturé." });
      } catch {
        await offlineDb.pendingPointsPassage.add({
          maraudeId,
          userId,
          typeAction,
          lat,
          lng,
          createdAt: Date.now(),
        });
        setMessage({
          type: "queued",
          text: "Connexion indisponible : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            type="button"
            disabled={pending}
            className="h-12"
            onClick={() => submit(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {message && (
        <p
          role={message.type === "error" ? "alert" : undefined}
          className={`text-sm ${message.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
