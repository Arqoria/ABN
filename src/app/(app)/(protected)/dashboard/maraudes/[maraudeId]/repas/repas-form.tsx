"use client";

import { useState, useTransition } from "react";
import { ajouterRepas } from "@/lib/actions/repas";
import { offlineDb } from "@/lib/offline/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Message = { type: "error" | "queued"; text: string };

// Hors-ligne (ou réseau indisponible au moment de l'envoi) : la saisie part
// dans la file d'attente locale (Dexie/IndexedDB) au lieu d'appeler la
// Server Action, et sera rejouée automatiquement au retour du réseau (voir
// src/components/offline-sync.tsx, src/lib/offline/sync.ts) — Étape 8.
export function RepasForm({ maraudeId }: { maraudeId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const quoi = String(formData.get("quoi") ?? "").trim();
    const quantite = Number(formData.get("quantite"));

    if (!quoi || !Number.isInteger(quantite) || quantite <= 0) {
      setMessage({ type: "error", text: "Champs invalides." });
      return;
    }

    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await offlineDb.pendingRepas.add({
          maraudeId,
          quoi,
          quantite,
          createdAt: Date.now(),
        });
        setMessage({
          type: "queued",
          text: "Hors ligne : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
        form.reset();
        return;
      }

      try {
        const result = await ajouterRepas(undefined, formData);
        if (result?.error) {
          setMessage({ type: "error", text: result.error });
          return;
        }
        setMessage(null);
        form.reset();
      } catch {
        await offlineDb.pendingRepas.add({
          maraudeId,
          quoi,
          quantite,
          createdAt: Date.now(),
        });
        setMessage({
          type: "queued",
          text: "Connexion indisponible : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
        form.reset();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="quoi">Quoi</Label>
        <Input id="quoi" name="quoi" type="text" required className="h-12" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="quantite">Quantité</Label>
        <Input
          id="quantite"
          name="quantite"
          type="number"
          min={1}
          step={1}
          required
          className="h-12 w-24"
        />
      </div>
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Ajout…" : "Ajouter"}
      </Button>
      {message && (
        <p
          role={message.type === "error" ? "alert" : undefined}
          className={`text-sm ${message.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
