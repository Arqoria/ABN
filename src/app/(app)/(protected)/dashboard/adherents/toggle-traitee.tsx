"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { marquerCandidatureTraitee } from "@/lib/actions/candidatures";
import { Button } from "@/components/ui/button";

export function ToggleTraitee({ id, traitee }: { id: string; traitee: boolean }) {
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  return (
    <Button
      type="button"
      size="sm"
      variant={traitee ? "secondary" : "outline"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await marquerCandidatureTraitee(id, !traitee);
          // La donnée vient maintenant de React Query (voir
          // adherents-client.tsx) — revalidatePath() côté serveur (dans
          // l'action) ne suffit plus à rafraîchir l'affichage.
          queryClient.invalidateQueries({ queryKey: ["adherents"] });
        })
      }
    >
      {traitee ? "Traitée ✓" : "Marquer traitée"}
    </Button>
  );
}
