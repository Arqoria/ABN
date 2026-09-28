"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { confirmerPresence } from "@/lib/actions/presence";
import { avecOptimisme } from "@/lib/optimiste";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DepartPayload } from "./depart-client";

// Perf (28/09) : présence cochée instantanément (cache ["depart", id]
// modifié directement), annulée si la base refuse — voir src/lib/optimiste.ts.
export function PresenceToggle({
  maraudeId,
  inscriptionId,
  nom,
  presenceConfirmee,
  canWrite,
  compact = false,
}: {
  maraudeId: string;
  inscriptionId: string;
  nom: string;
  presenceConfirmee: boolean;
  canWrite: boolean;
  compact?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const queryClient = useQueryClient();

  function toggle() {
    setErreur(null);
    startTransition(async () => {
      setErreur(
        await avecOptimisme<DepartPayload>(
          queryClient,
          ["depart", maraudeId],
          (old) => ({
            ...old,
            inscrits: old.inscrits.map((i) =>
              i.id === inscriptionId ? { ...i, presence_confirmee: !presenceConfirmee } : i,
            ),
          }),
          () => confirmerPresence(inscriptionId, !presenceConfirmee),
        ),
      );
    });
  }

  // compact (émargement de l'onglet Logistique, 28/09) : case seule, le nom
  // est déjà affiché sur la carte du bénévole — conservé en aria-label.
  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-end">
        <Checkbox
          aria-label={`Présence de ${nom}`}
          className="size-7"
          checked={presenceConfirmee}
          disabled={!canWrite}
          onCheckedChange={toggle}
        />
        {erreur && (
          <p role="alert" className="text-xs text-destructive">
            {erreur}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex min-h-11 items-center gap-3">
        <Checkbox
          id={`presence-${inscriptionId}`}
          className="size-6"
          checked={presenceConfirmee}
          disabled={!canWrite}
          onCheckedChange={toggle}
        />
        <Label htmlFor={`presence-${inscriptionId}`}>{nom}</Label>
      </div>
      {erreur && (
        <p role="alert" className="text-xs text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}
