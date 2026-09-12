"use client";

import { useActionState } from "react";
import { inscrireMaraude, seDesisterMaraude } from "@/lib/actions/maraudes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Statut = "inscrit" | "liste_attente" | "desiste" | undefined;

export function InscriptionForm({
  maraudeId,
  inscriptionId,
  statut,
}: {
  maraudeId: string;
  inscriptionId: string | undefined;
  statut: Statut;
}) {
  const [inscrireState, inscrireAction, inscrirePending] = useActionState(
    inscrireMaraude,
    undefined,
  );
  const [desisterState, desisterAction, desisterPending] = useActionState(
    seDesisterMaraude,
    undefined,
  );

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
