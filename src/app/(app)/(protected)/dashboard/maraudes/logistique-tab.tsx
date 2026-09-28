"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepasBloc } from "./[maraudeId]/repas/repas-client";
import { MaterielBloc, PresencesBloc } from "./[maraudeId]/depart/depart-client";
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

// Refonte 28/09 : les sous-sections logistiques sont directement
// exploitables ici (plus de page intermédiaire à ouvrir). Chaque bloc
// réutilise la même requête/les mêmes composants de saisie que sa page
// dédiée (toujours accessible à son URL), aucune logique métier dupliquée.
// Même contenu pour une maraude passée (libellé "Bilan" côté onglet).
//
// Mise en page (28/09, suite) : 2 colonnes THÉMATIQUES indépendantes sur
// grand écran plutôt qu'une grille 2x2 — une grille alignait chaque ligne
// sur son bloc le plus haut et laissait un grand vide sous "Repas" à côté de
// la checklist. Gauche = ce qu'on charge et distribue, droite = humain,
// terrain et gestion. Sur mobile, les deux colonnes s'empilent : même ordre.
export function LogistiqueTab({ maraudeId }: { maraudeId: string }) {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Bloc titre="🍲 Repas préparés">
          <RepasBloc maraudeId={maraudeId} />
        </Bloc>
        <Bloc titre="📦 Matériel & dons à charger">
          <MaterielBloc maraudeId={maraudeId} />
        </Bloc>
      </div>
      <div className="flex flex-col gap-4">
        <Bloc titre="👥 Présences au départ">
          <PresencesBloc maraudeId={maraudeId} />
        </Bloc>
        <Bloc titre="⚠️ Besoins signalés">
          <BesoinsBloc maraudeId={maraudeId} />
        </Bloc>
        <Bloc titre="🧾 Tickets de dépense">
          <TicketsBloc maraudeId={maraudeId} />
        </Bloc>
      </div>
    </div>
  );
}
