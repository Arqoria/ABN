"use client";

import { useActionState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { inscrireMaraude, seDesisterMaraude, type ActionState } from "@/lib/actions/maraudes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Statut = "inscrit" | "liste_attente" | "desiste" | undefined;

// compact=true (25/09, refonte Master-Detail) : variante réduite pour la
// carte de liste. variante="barre" (28/09) : gros bouton pleine largeur de
// la barre d'action fixe en bas d'écran sur mobile (atteignable au pouce).
// Mêmes deux Server Actions réutilisées telles quelles, aucune nouvelle
// logique — seule l'invalidation react-query est ajoutée pour que la liste,
// l'en-tête et l'onglet Équipe reflètent le nouvel état sans rechargement.
export function InscriptionForm({
  maraudeId,
  inscriptionId,
  statut,
  compact = false,
  variante,
}: {
  maraudeId: string;
  inscriptionId: string | undefined;
  statut: Statut;
  compact?: boolean;
  variante?: "barre";
}) {
  const queryClient = useQueryClient();

  function avecRafraichissement(
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  ) {
    return async (prev: ActionState, formData: FormData) => {
      const resultat = await action(prev, formData);
      if (!resultat?.error) {
        queryClient.invalidateQueries({ queryKey: ["maraudes"] });
        // Toutes les requêtes de CETTE maraude (équipe, carte, checklist,
        // besoins, accès aux pointages…) : leur réponse dépend du fait
        // d'être inscrit, un refus mis en cache resterait sinon affiché.
        queryClient.invalidateQueries({ predicate: (q) => q.queryKey[1] === maraudeId });
      }
      return resultat;
    };
  }

  const [inscrireState, inscrireAction, inscrirePending] = useActionState(
    avecRafraichissement(inscrireMaraude),
    undefined,
  );
  const [desisterState, desisterAction, desisterPending] = useActionState(
    avecRafraichissement(seDesisterMaraude),
    undefined,
  );

  if (variante === "barre") {
    // Désisté : l'état est déjà affiché à gauche de la barre, aucune action
    // possible (pas de réinscription, logique existante inchangée).
    if (statut === "desiste") {
      return null;
    }

    if (statut === "inscrit" || statut === "liste_attente") {
      return (
        <form action={desisterAction} className="flex flex-col gap-1">
          <input type="hidden" name="inscriptionId" value={inscriptionId} />
          <Button
            type="submit"
            variant="outline"
            disabled={desisterPending}
            className="h-12 w-full text-base"
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
      <form action={inscrireAction} className="flex flex-col gap-1">
        <input type="hidden" name="maraudeId" value={maraudeId} />
        <Button
          type="submit"
          disabled={inscrirePending}
          className="h-12 w-full bg-brand-coral text-base text-white hover:bg-brand-coral/90"
        >
          {inscrirePending ? "Inscription…" : "S'inscrire à cette maraude"}
        </Button>
        {inscrireState?.error && (
          <p role="alert" className="text-sm text-destructive">
            {inscrireState.error}
          </p>
        )}
      </form>
    );
  }

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
