"use client";

import { useActionState } from "react";
import { creerTicket } from "@/lib/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TicketForm({ maraudeId }: { maraudeId: string }) {
  const [state, action, pending] = useActionState(creerTicket, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="maraudeId" value={maraudeId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="montant">Montant (€)</Label>
        <Input
          id="montant"
          name="montant"
          type="number"
          min={0.01}
          step={0.01}
          required
          className="h-12"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="photo">Photo du ticket</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          required
          className="h-12 pt-2.5"
        />
      </div>
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Envoi…" : "Envoyer le ticket"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
