"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { definirFonctionBureau } from "@/lib/actions/comptes";
import { FONCTION_BUREAU_LABELS, type FonctionBureau } from "@/lib/fonction-bureau";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FONCTIONS_BUREAU: FonctionBureau[] = ["president", "tresorier", "secretaire"];

// Édite la fonction bureau d'un Admin déjà actif — purement informatif, voir
// supabase/migrations/20260912230000_fonction_bureau.sql.
export function BureauForm({
  userId,
  fonctionActuelle,
}: {
  userId: string;
  fonctionActuelle: FonctionBureau | null;
}) {
  const [state, action, pending] = useActionState(definirFonctionBureau, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["comptes"] });
    }
  }, [state, queryClient]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="userId" value={userId} />
      <Select name="fonctionBureau" defaultValue={fonctionActuelle ?? "aucune"}>
        <SelectTrigger className="h-10 w-48">
          <SelectValue placeholder="Aucune" />
        </SelectTrigger>
        <SelectContent>
          {/* Valeur "aucune" plutôt qu'une chaîne vide : Radix Select
              n'accepte pas les SelectItem à valeur vide. */}
          <SelectItem value="aucune">Aucune</SelectItem>
          {FONCTIONS_BUREAU.map((f) => (
            <SelectItem key={f} value={f}>
              {FONCTION_BUREAU_LABELS[f]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
