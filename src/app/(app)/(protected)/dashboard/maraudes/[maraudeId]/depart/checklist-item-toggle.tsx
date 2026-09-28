"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toggleChecklistItem, supprimerLigneChecklist } from "@/lib/actions/checklist-depart";
import { avecOptimisme } from "@/lib/optimiste";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { DepartPayload } from "./depart-client";

// canWrite=false : ligne lue seule (checkbox désactivée), RLS refuserait de
// toute façon l'update côté serveur — ce composant ne fait que refléter ce
// que la page a déjà calculé, même principe que AffectationToggle.
//
// Perf (28/09) : case cochée/ligne retirée instantanément (cache
// ["depart", id] modifié directement) — plus d'attente de l'action PUIS du
// rechargement complet de la checklist (qui relançait en plus sa
// régénération depuis le stock). Annulé si la base refuse.
export function ChecklistItemToggle({
  maraudeId,
  itemId,
  libelle,
  coche,
  canWrite,
  canDelete,
}: {
  maraudeId: string;
  itemId: string;
  libelle: string;
  coche: boolean;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const cle = ["depart", maraudeId];

  function toggle() {
    setErreur(null);
    startTransition(async () => {
      setErreur(
        await avecOptimisme<DepartPayload>(
          queryClient,
          cle,
          (old) => ({
            ...old,
            items: old.items.map((i) => (i.id === itemId ? { ...i, coche: !coche } : i)),
          }),
          () => toggleChecklistItem(itemId, !coche),
        ),
      );
    });
  }

  function supprimer() {
    setErreur(null);
    startTransition(async () => {
      setErreur(
        await avecOptimisme<DepartPayload>(
          queryClient,
          cle,
          (old) => ({ ...old, items: old.items.filter((i) => i.id !== itemId) }),
          () => supprimerLigneChecklist(itemId),
        ),
      );
    });
  }

  return (
    <div className="flex flex-col">
      <div className="flex min-h-11 items-center justify-between gap-2 py-1">
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id={`checklist-${itemId}`}
            className="size-6"
            checked={coche}
            disabled={!canWrite}
            onCheckedChange={toggle}
          />
          <Label
            htmlFor={`checklist-${itemId}`}
            className={coche ? "text-muted-foreground line-through" : ""}
          >
            {libelle}
          </Label>
        </div>
        {canDelete && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={supprimer}
            aria-label="Supprimer cette ligne"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {erreur && (
        <p role="alert" className="text-xs text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}
