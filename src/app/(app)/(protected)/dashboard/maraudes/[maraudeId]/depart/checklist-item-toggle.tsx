"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toggleChecklistItem, supprimerLigneChecklist } from "@/lib/actions/checklist-depart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// canWrite=false : ligne lue seule (checkbox désactivée), RLS refuserait de
// toute façon l'update côté serveur — ce composant ne fait que refléter ce
// que la page a déjà calculé, même principe que AffectationToggle.
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
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function toggle() {
    startTransition(async () => {
      await toggleChecklistItem(itemId, !coche);
      queryClient.invalidateQueries({ queryKey: ["depart", maraudeId] });
    });
  }

  function supprimer() {
    startTransition(async () => {
      await supprimerLigneChecklist(itemId);
      queryClient.invalidateQueries({ queryKey: ["depart", maraudeId] });
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`checklist-${itemId}`}
          checked={coche}
          disabled={!canWrite || pending}
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
          disabled={pending}
          onClick={supprimer}
          aria-label="Supprimer cette ligne"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
