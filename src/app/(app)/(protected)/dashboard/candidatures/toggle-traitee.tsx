"use client";

import { useTransition } from "react";
import { marquerCandidatureTraitee } from "@/lib/actions/candidatures";
import { Button } from "@/components/ui/button";

export function ToggleTraitee({ id, traitee }: { id: string; traitee: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant={traitee ? "secondary" : "outline"}
      disabled={pending}
      onClick={() => startTransition(() => marquerCandidatureTraitee(id, !traitee))}
    >
      {traitee ? "Traitée ✓" : "Marquer traitée"}
    </Button>
  );
}
