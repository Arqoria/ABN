"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ajouterDonPonctuel } from "@/lib/actions/stocks";
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

// maraudeId obligatoire (contrairement aux mouvements de stock) — voir
// docs/Tasks.md : tout l'intérêt est qu'un Cuisinier voie qu'un don a déjà
// été fait pour SA maraude avant de préparer un repas en double.
export function DonPonctuelForm({
  maraudes,
}: {
  maraudes: { id: string; date_heure: string }[];
}) {
  const [state, action, pending] = useActionState(ajouterDonPonctuel, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["cuisine"] });
      formRef.current?.reset();
    }
  }, [state, queryClient]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="maraudeId">Maraude</Label>
        <Select name="maraudeId" required>
          <SelectTrigger id="maraudeId" className="h-12">
            <SelectValue placeholder="Choisir…" />
          </SelectTrigger>
          <SelectContent>
            {maraudes.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {new Date(m.date_heure).toLocaleDateString("fr-FR")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="donateur">Donateur</Label>
          <Input id="donateur" name="donateur" placeholder="Ex. « Boulangerie du coin »" required className="h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantite">Quantité (facultatif)</Label>
          <Input id="quantite" name="quantite" type="number" min={1} step={1} className="h-12" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Ex. « 20 sandwichs »" required className="h-12" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Enregistrement…" : "Enregistrer le don"}
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
