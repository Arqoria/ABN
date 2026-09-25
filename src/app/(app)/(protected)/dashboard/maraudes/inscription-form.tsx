"use client";

import { useActionState } from "react";
import { inscrireMaraude, seDesisterMaraude } from "@/lib/actions/maraudes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Statut = "inscrit" | "liste_attente" | "desiste" | undefined;

// compact=true (25/09, refonte Master-Detail) : variante réduite pour la
// carte de liste — un seul bouton compact reflétant l'état (au lieu du
// badge + bouton "Se désister" séparés de la variante complète, utilisée
// dans l'en-tête du panneau de détail). Même deux Server Actions
// réutilisées telle quelle, aucune nouvelle logique.
export function InscriptionForm({
  maraudeId,
  inscriptionId,
  statut,
  compact = false,
}: {
  maraudeId: string;
  inscriptionId: string | undefined;
  statut: Statut;
  compact?: boolean;
}) {
  const [inscrireState, inscrireAction, inscrirePending] = useActionState(
    inscrireMaraude,
    undefined,
  );
  const [desisterState, desisterAction, desisterPending] = useActionState(
    seDesisterMaraude,
    undefined,
  );

  if (compact) {
    if (statut === "desiste") {
      return (
        <Badge variant="outline" className="shrink-0">
          Désisté
        </Badge>
      );
    }

    if (statut === "inscrit" || statut === "liste_attente") {
      return (
        <form action={desisterAction} onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="inscriptionId" value={inscriptionId} />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={desisterPending}
            className="shrink-0"
          >
            {statut === "inscrit" ? "Inscrit" : "Liste d'attente"}
          </Button>
        </form>
      );
    }

    return (
      <form action={inscrireAction} onClick={(e) => e.stopPropagation()}>
        <input type="hidden" name="maraudeId" value={maraudeId} />
        <Button type="submit" size="sm" disabled={inscrirePending} className="shrink-0">
          {inscrirePending ? "…" : "S'inscrire"}
        </Button>
      </form>
    );
  }

  if (statut === "desiste") {
    return <Badge variant="outline">Désisté</Badge>;
  }

  if (statut === "inscrit" || statut === "liste_attente") {
    return (
      <form action={desisterAction} className="flex items-center gap-3">
        <input type="hidden" name="inscriptionId" value={inscriptionId} />
        <Badge variant={statut === "inscrit" ? "default" : "secondary"}>
          {statut === "inscrit" ? "Inscrit" : "Liste d'attente"}
        </Badge>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={desisterPending}
        >
          {desisterPending ? "…" : "Se désister"}
        </Button>
        {desisterState?.error && (
          <p role="alert" className="text-sm text-destructive">
            {desisterState.error}
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={inscrireAction} className="flex items-center gap-3">
      <input type="hidden" name="maraudeId" value={maraudeId} />
      <Button type="submit" disabled={inscrirePending} className="h-12">
        {inscrirePending ? "Inscription…" : "S'inscrire"}
      </Button>
      {inscrireState?.error && (
        <p role="alert" className="text-sm text-destructive">
          {inscrireState.error}
        </p>
      )}
    </form>
  );
}
