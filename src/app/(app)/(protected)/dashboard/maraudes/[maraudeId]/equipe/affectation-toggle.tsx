"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { affecterFonction, retirerAffectation } from "@/lib/actions/affectations";
import { Button } from "@/components/ui/button";
import {
  FONCTION_MARAUDE_ICONES,
  FONCTION_MARAUDE_LABELS,
  type FonctionMaraude,
} from "@/lib/fonction-maraude";

// canToggle=false : juste un badge (ex. un autre participant qualifié, mais
// on n'a pas le droit de modifier son affectation). canToggle=true : bouton
// cliquable pour s'auto-affecter/se retirer (soi-même) ou gérer l'équipe
// (Admin/Manager de cette maraude) — le garde-fou de qualification réel
// reste de toute façon vérifié côté serveur (trigger
// check_affectation_maraude_qualification), ce composant ne fait que
// refléter ce que la page a déjà calculé.
export function AffectationToggle({
  maraudeId,
  userId,
  fonction,
  assigned,
  canToggle,
}: {
  maraudeId: string;
  userId: string;
  fonction: FonctionMaraude;
  assigned: boolean;
  canToggle: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  if (!canToggle) {
    return assigned ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
        {FONCTION_MARAUDE_ICONES[fonction]} {FONCTION_MARAUDE_LABELS[fonction]}
      </span>
    ) : null;
  }

  function toggle() {
    startTransition(async () => {
      if (assigned) {
        await retirerAffectation(maraudeId, userId, fonction);
      } else {
        const formData = new FormData();
        formData.set("maraudeId", maraudeId);
        formData.set("userId", userId);
        formData.set("fonction", fonction);
        await affecterFonction(undefined, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["equipe", maraudeId] });
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={assigned ? "secondary" : "outline"}
      disabled={pending}
      onClick={toggle}
    >
      {FONCTION_MARAUDE_ICONES[fonction]} {FONCTION_MARAUDE_LABELS[fonction]}
      {assigned ? " ✕" : ""}
    </Button>
  );
}
