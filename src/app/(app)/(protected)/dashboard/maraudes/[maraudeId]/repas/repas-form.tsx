"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
//
// Menu des plats (28/09) : il n'existe AUCUNE liste de repas dans le projet
// (ni table, ni enum, ni constante — vérifié). Décision Chef de Produit : les
// options sont les valeurs déjà saisies dans repas.quoi, les plus fréquentes
// d'abord, puis "Autre" qui fait apparaître un champ libre. Aucune nouvelle
// table ni colonne ; un plat saisi via "Autre" rejoint la liste ensuite.
const AUTRE = "__autre__";

async function fetchPlatsConnus(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("repas").select("quoi");
  const frequences = new Map<string, number>();
  for (const r of data ?? []) {
    const quoi = (r.quoi as string).trim();
    if (quoi) frequences.set(quoi, (frequences.get(quoi) ?? 0) + 1);
  }
  return [...frequences.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([quoi]) => quoi);
}

export function RepasForm({ maraudeId }: { maraudeId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);
  const queryClient = useQueryClient();
  const { data: platsConnus = [] } = useQuery({
    queryKey: ["repas-plats-connus"],
    queryFn: fetchPlatsConnus,
  });
  const [choix, setChoix] = useState("");
  const [autre, setAutre] = useState("");
  // Aucun plat encore saisi (ou liste indisponible hors-ligne) : directement
  // le champ libre, un menu ne contenant que "Autre" n'aurait pas de sens.
  const saisieLibre = platsConnus.length === 0 || choix === AUTRE;
  const quoiChoisi = saisieLibre ? autre : choix;

  function reinitialiser(form: HTMLFormElement) {
    form.reset();
    setChoix("");
    setAutre("");
  }

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
        reinitialiser(form);
        return;
      }

      try {
        const result = await ajouterRepas(undefined, formData);
        if (result?.error) {
          setMessage({ type: "error", text: result.error });
          return;
        }
        setMessage(null);
        reinitialiser(form);
        queryClient.invalidateQueries({ queryKey: ["repas", maraudeId] });
        queryClient.invalidateQueries({ queryKey: ["repas-plats-connus"] });
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
        reinitialiser(form);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="maraudeId" value={maraudeId} />
      {/* La valeur réellement envoyée (plat choisi ou texte "Autre"). */}
      <input type="hidden" name="quoi" value={quoiChoisi} />
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="quoi-choix">Quoi</Label>
        {platsConnus.length > 0 && (
          <select
            id="quoi-choix"
            required
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <option value="" disabled>
              Choisir un plat…
            </option>
            {platsConnus.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={AUTRE}>Autre…</option>
          </select>
        )}
        {saisieLibre && (
          <Input
            id={platsConnus.length > 0 ? "quoi-autre" : "quoi-choix"}
            aria-label="Préciser le plat"
            placeholder="Préciser le plat"
            value={autre}
            onChange={(e) => setAutre(e.target.value)}
            required
            autoFocus={choix === AUTRE}
            className="h-12"
          />
        )}
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
