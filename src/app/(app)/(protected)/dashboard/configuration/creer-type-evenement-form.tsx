"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { creerTypeEvenement } from "@/lib/actions/types-evenement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// nature est fixe (2 valeurs), non éditable après coup — c'est le nom qui
// est la vraie configuration de l'Admin.
export function CreerTypeEvenementForm() {
  const [state, action, pending] = useActionState(creerTypeEvenement, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["types-evenement"] });
      formRef.current?.reset();
    }
  }, [state, queryClient]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" placeholder="Ex. « Goûter »" required className="h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nature">Nature</Label>
          <Select name="nature" defaultValue="maraude" required>
            <SelectTrigger id="nature" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maraude">Maraude (mobile, avec circuit)</SelectItem>
              <SelectItem value="evenement_fixe">Événement à point fixe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description (facultatif)</Label>
        <Input id="description" name="description" className="h-12" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Création…" : "Créer le type"}
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
