"use client";

import { useActionState } from "react";
import { ajouterRepas } from "@/lib/actions/repas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RepasForm({ maraudeId }: { maraudeId: string }) {
  const [state, action, pending] = useActionState(ajouterRepas, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="maraudeId" value={maraudeId} />
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
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
