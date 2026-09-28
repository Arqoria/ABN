"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepasBloc } from "./[maraudeId]/repas/repas-client";
import { AvantDepartBloc } from "./[maraudeId]/depart/depart-client";
import { BesoinsBloc } from "./[maraudeId]/besoins/besoins-client";
import { TicketsBloc } from "./[maraudeId]/tickets/tickets-client";

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-base">{titre}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

// Refonte 28/09 : les 4 sous-sections logistiques sont directement
// exploitables ici (plus de page intermédiaire à ouvrir) — empilées sur
// mobile, grille 2x2 sur grand écran. Chaque bloc réutilise la même
// requête/les mêmes composants de saisie que sa page dédiée (toujours
// accessible à son URL), aucune logique métier dupliquée. Même contenu pour
// une maraude passée (libellé "Bilan" côté onglet) : les tickets arrivent
// souvent après coup, la saisie reste donc ouverte comme avant.
export function LogistiqueTab({ maraudeId }: { maraudeId: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Bloc titre="🍲 Repas préparés">
        <RepasBloc maraudeId={maraudeId} />
      </Bloc>
      <Bloc titre="✅ Avant le départ">
        <AvantDepartBloc maraudeId={maraudeId} />
      </Bloc>
      <Bloc titre="📣 Besoins signalés">
        <BesoinsBloc maraudeId={maraudeId} />
      </Bloc>
      <Bloc titre="🧾 Tickets de dépense">
        <TicketsBloc maraudeId={maraudeId} />
      </Bloc>
    </div>
  );
}
