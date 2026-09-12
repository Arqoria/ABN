"use client";

import { useState, useTransition } from "react";
import { saisirMeteo } from "@/lib/actions/meteo";
import { offlineDb } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";

type Valeur = "vert" | "jaune" | "rouge";

const OPTIONS: { value: Valeur; label: string }[] = [
  { value: "vert", label: "🟢 Ça va" },
  { value: "jaune", label: "🟡 Moyen" },
  { value: "rouge", label: "🔴 Difficile" },
];

type Message = { type: "error" | "queued" | "success"; text: string };

// Auto-déclaration en fin de maraude — une seule fois (contrainte unique en
// base). Volontairement AUCUN affichage de la valeur transmise : le bénévole
// ne doit jamais pouvoir relire sa propre météo (voir docs/Specs.md).
// Hors-ligne (ou réseau indisponible) : la saisie part dans la file
// d'attente locale (Dexie/IndexedDB) au lieu d'appeler la Server Action, et
// sera rejouée automatiquement au retour du réseau — Étape 8.
export function MeteoForm({
  maraudeId,
  userId,
}: {
  maraudeId: string;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  function submit(valeur: Valeur) {
    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await offlineDb.pendingMeteo.add({
          maraudeId,
          userId,
          valeur,
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
      formData.set("userId", userId);
      formData.set("valeur", valeur);

      try {
        const result = await saisirMeteo(undefined, formData);
        if (result?.status === "error") {
          setMessage({ type: "error", text: result.message });
          return;
        }
        setMessage({ type: "success", text: "Météo transmise, merci." });
      } catch {
        await offlineDb.pendingMeteo.add({
          maraudeId,
          userId,
          valeur,
          createdAt: Date.now(),
        });
        setMessage({
          type: "queued",
          text: "Connexion indisponible : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
      }
    });
  }

  if (message?.type === "success") {
    return <p className="text-sm text-muted-foreground">{message.text}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Comment ça s&apos;est passé pour vous, ce soir ?
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Button
            key={o.value}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
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
