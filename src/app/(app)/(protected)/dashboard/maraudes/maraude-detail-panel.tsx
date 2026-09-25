"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerrainTab } from "./terrain-tab";
import { EquipeTab } from "./equipe-tab";
import { LogistiqueTab } from "./logistique-tab";
import type { MaraudeCardData } from "./maraude-card";

const STATUT_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

// En-tête réduit à titre/statut/type/manager — les actions "Modifier"/
// "Annuler" nommées dans la demande n'existent nulle part dans l'app
// (aucun formulaire d'édition de maraude, aucune action d'annulation) ;
// décision explicite du Chef de Produit : retirées de cette itération
// plutôt que construites, voir docs/Tasks.md.
export function MaraudeDetailPanel({
  maraude,
  statut,
  managerNom,
  profileId,
  isAdmin,
  isOwnManager,
  estPassee,
}: {
  maraude: MaraudeCardData;
  statut: string;
  managerNom: string | null;
  profileId: string;
  isAdmin: boolean;
  isOwnManager: boolean;
  estPassee: boolean;
}) {
  const date = new Date(maraude.dateHeure);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {date.toLocaleString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </h2>
          <Badge variant="outline">{STATUT_LABELS[statut] ?? statut}</Badge>
          {maraude.typeNom && <Badge variant="secondary">{maraude.typeNom}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          Manager : {managerNom ?? "—"} · {maraude.inscritsCount}/{maraude.maxParticipants} inscrits
          {maraude.listeAttenteCount > 0 ? ` · ${maraude.listeAttenteCount} en liste d'attente` : ""}
        </p>
      </div>

      <Tabs key={maraude.id} defaultValue="terrain">
        <TabsList className="w-full">
          <TabsTrigger value="terrain">Parcours &amp; Terrain</TabsTrigger>
          <TabsTrigger value="equipe">Équipe</TabsTrigger>
          <TabsTrigger value="logistique">{estPassee ? "Bilan" : "Logistique"}</TabsTrigger>
        </TabsList>
        <TabsContent value="terrain" className="pt-3">
          <TerrainTab maraudeId={maraude.id} />
        </TabsContent>
        <TabsContent value="equipe" className="pt-3">
          <EquipeTab
            maraudeId={maraude.id}
            profileId={profileId}
            isAdmin={isAdmin}
            isOwnManager={isOwnManager}
          />
        </TabsContent>
        <TabsContent value="logistique" className="pt-3">
          <LogistiqueTab maraudeId={maraude.id} estBilan={estPassee} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
