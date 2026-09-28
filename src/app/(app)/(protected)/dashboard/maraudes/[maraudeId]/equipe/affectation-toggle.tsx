"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { affecterFonction, retirerAffectation } from "@/lib/actions/affectations";
import { avecOptimisme } from "@/lib/optimiste";
import { Button } from "@/components/ui/button";
import {
  FONCTION_MARAUDE_ICONES,
  FONCTION_MARAUDE_LABELS,
  type FonctionMaraude,
} from "@/lib/fonction-maraude";

// Forme commune aux deux caches qui affichent ce bouton (page dédiée
// /equipe et onglet Équipe du panneau de détail).
type AvecAffectations = { affectations: { user_id: string; fonction: string }[] };

// canToggle=false : juste un badge (ex. un autre participant qualifié, mais
// on n'a pas le droit de modifier son affectation). canToggle=true : bouton
// cliquable pour s'auto-affecter/se retirer (soi-même) ou gérer l'équipe
// (Admin/Manager de cette maraude) — le garde-fou de qualification réel
// reste de toute façon vérifié côté serveur (trigger
// check_affectation_maraude_qualification), ce composant ne fait que
// refléter ce que la page a déjà calculé.
//
// Perf (28/09) : bascule instantanée (cache modifié directement), annulée si
// la base refuse (non qualifié, déjà affecté, RLS) — voir src/lib/optimiste.ts.
export function AffectationToggle({
  maraudeId,
  userId,
  fonction,
  assigned,
  canToggle,
  invalidateKey,
}: {
  maraudeId: string;
  userId: string;
  fonction: FonctionMaraude;
  assigned: boolean;
  canToggle: boolean;
  // Clé react-query du cache à mettre à jour — par défaut celle de la page
  // dédiée /equipe. Le sous-onglet Équipe du panneau de détail (refonte
  // Master-Detail, 25/09) passe sa propre clé.
  invalidateKey?: unknown[];
}) {
  const [, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const queryClient = useQueryClient();

  if (!canToggle) {
    return assigned ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
        {FONCTION_MARAUDE_ICONES[fonction]} {FONCTION_MARAUDE_LABELS[fonction]}
      </span>
    ) : null;
  }

  function toggle() {
    setErreur(null);
    startTransition(async () => {
      setErreur(
        await avecOptimisme<AvecAffectations>(
          queryClient,
          invalidateKey ?? ["equipe", maraudeId],
          (old) => ({
            ...old,
            affectations: assigned
              ? old.affectations.filter((a) => !(a.user_id === userId && a.fonction === fonction))
              : [...old.affectations, { user_id: userId, fonction }],
          }),
          () => {
            if (assigned) {
              return retirerAffectation(maraudeId, userId, fonction);
            }
            const formData = new FormData();
            formData.set("maraudeId", maraudeId);
            formData.set("userId", userId);
            formData.set("fonction", fonction);
            return affecterFonction(undefined, formData);
          },
        ),
      );
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={assigned ? "secondary" : "outline"}
        onClick={toggle}
        title={erreur ?? undefined}
        aria-invalid={erreur ? true : undefined}
      >
        {FONCTION_MARAUDE_ICONES[fonction]} {FONCTION_MARAUDE_LABELS[fonction]}
        {assigned ? " ✕" : ""}
      </Button>
      {erreur && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {erreur}
        </p>
      )}
    </>
  );
}
