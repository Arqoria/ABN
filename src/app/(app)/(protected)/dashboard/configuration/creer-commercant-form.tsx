"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { creerCommercant } from "@/lib/actions/commercants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreerCommercantForm() {
  const [state, action, pending] = useActionState(creerCommercant, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["commercants"] });
      formRef.current?.reset();
    }
  }, [state, queryClient]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" placeholder="Ex. « Boulangerie du coin »" required className="h-12" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (facultatif)</Label>
        <Input id="notes" name="notes" className="h-12" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Création…" : "Créer le commerçant"}
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
