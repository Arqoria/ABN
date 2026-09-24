"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { modifierCommercant } from "@/lib/actions/commercants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ModifierCommercantForm({
  id,
  nomActuel,
  notesActuelles,
  onTermine,
}: {
  id: string;
  nomActuel: string;
  notesActuelles: string | null;
  onTermine: () => void;
}) {
  const [state, action, pending] = useActionState(modifierCommercant, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["commercants"] });
      onTermine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, queryClient]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-nom`}>Nom</Label>
        <Input id={`${id}-nom`} name="nom" defaultValue={nomActuel} required className="h-12" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-notes`}>Notes (facultatif)</Label>
        <Input id={`${id}-notes`} name="notes" defaultValue={notesActuelles ?? ""} className="h-12" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onTermine}>
          Annuler
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
