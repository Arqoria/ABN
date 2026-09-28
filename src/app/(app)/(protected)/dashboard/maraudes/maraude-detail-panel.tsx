"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerrainTab } from "./terrain-tab";
import { EquipeTab } from "./equipe-tab";
import { LogistiqueTab } from "./logistique-tab";
import { InscriptionForm } from "./inscription-form";
import type { MaraudeCardData } from "./maraude-card";

const STATUT_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

const ANIMATION_ONGLET = "pt-3 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200";

// En-tête réduit à titre/statut/type/manager (+ action S'inscrire/Se
// désister sur grand écran — sur mobile elle vit dans la barre fixe en bas,
// voir maraudes-client.tsx). Les actions "Modifier"/"Annuler" n'existent
// nulle part dans l'app — retirées sur décision du Chef de Produit, voir
// docs/Tasks.md.
export function MaraudeDetailPanel({
  maraude,
  statut,
  managerNom,
  profileId,
  isAdmin,
  isOwnManager,
  estPassee,
  estJourJ,
}: {
  maraude: MaraudeCardData;
  statut: string;
  managerNom: string | null;
  profileId: string;
  isAdmin: boolean;
  isOwnManager: boolean;
  estPassee: boolean;
  estJourJ: boolean;
}) {
  const date = new Date(maraude.dateHeure);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground first-letter:uppercase">
              {date.toLocaleString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </h2>
            {estJourJ && <Badge className="bg-brand-coral text-white">Aujourd&apos;hui</Badge>}
            <Badge variant="outline">{STATUT_LABELS[statut] ?? statut}</Badge>
            {maraude.typeNom && <Badge variant="secondary">{maraude.typeNom}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Manager : {managerNom ?? "—"} · {maraude.inscritsCount}/{maraude.maxParticipants} inscrits
            {maraude.listeAttenteCount > 0 ? ` · ${maraude.listeAttenteCount} en liste d'attente` : ""}
          </p>
        </div>
        <div className="hidden shrink-0 lg:block">
          <InscriptionForm
            maraudeId={maraude.id}
            inscriptionId={maraude.mineId}
            statut={maraude.mineStatut}
          />
        </div>
      </div>

      <Tabs key={maraude.id} defaultValue="terrain">
        <TabsList className="w-full">
          <TabsTrigger value="terrain" className="transition-colors">Parcours &amp; Terrain</TabsTrigger>
          <TabsTrigger value="equipe" className="transition-colors">Équipe</TabsTrigger>
          <TabsTrigger value="logistique" className="transition-colors">
            {estPassee ? "Bilan" : "Logistique"}
          </TabsTrigger>
        </TabsList>
        {/* forceMount : l'onglet Terrain reste monté quand on consulte
            Équipe/Logistique — sinon le chrono (watchPosition) et la carte
            seraient détruits à chaque changement d'onglet en pleine marche. */}
        <TabsContent value="terrain" forceMount className={`${ANIMATION_ONGLET} data-[state=inactive]:hidden`}>
          <TerrainTab
            maraudeId={maraude.id}
            estPassee={estPassee}
            estJourJ={estJourJ}
            peutGererMaraude={isAdmin || isOwnManager}
          />
        </TabsContent>
        <TabsContent value="equipe" className={ANIMATION_ONGLET}>
          <EquipeTab
            maraudeId={maraude.id}
            profileId={profileId}
            isAdmin={isAdmin}
            isOwnManager={isOwnManager}
            maxParticipants={maraude.maxParticipants}
            listeAttenteCount={maraude.listeAttenteCount}
          />
        </TabsContent>
        <TabsContent value="logistique" className={ANIMATION_ONGLET}>
          <LogistiqueTab maraudeId={maraude.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
