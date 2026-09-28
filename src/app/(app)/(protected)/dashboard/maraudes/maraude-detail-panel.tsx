"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { affecterFonction } from "@/lib/actions/affectations";
import {
  FONCTIONS_MARAUDE,
  FONCTION_MARAUDE_ICONES,
  FONCTION_MARAUDE_LABELS,
  type FonctionMaraude,
} from "@/lib/fonction-maraude";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerrainTab } from "./terrain-tab";
import { EquipeTab } from "./equipe-tab";
import { LogistiqueTab } from "./logistique-tab";
import { InscriptionForm, patcherMesFonctions } from "./inscription-form";
import type { MaraudeCardData } from "./maraude-card";

const STATUT_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

// Bandeau "Choisissez votre rôle" (28/09) : inscrit confirmé, détient au
// moins un rôle Cuisinier/Maraudeur, mais aucune affectation sur cette
// maraude — cas typique d'une promotion depuis la liste d'attente (décision
// Chef de Produit : pas d'affectation automatique à la promotion, le
// bénévole choisit ensuite) ou d'une inscription antérieure à cette
// fonctionnalité. Auto-affectation autorisée par la RLS (sa propre ligne,
// inscrit, rôle détenu).
function ChoixRoleBandeau({ maraudeId }: { maraudeId: string }) {
  const profile = useSession();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const rolesDetenus = FONCTIONS_MARAUDE.filter((f) => profile.roles.includes(f));

  if (rolesDetenus.length === 0) return null;

  function choisir(fonction: FonctionMaraude) {
    setErreur(null);
    patcherMesFonctions(queryClient, maraudeId, [fonction], "ajouter");
    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    formData.set("userId", profile.id);
    formData.set("fonction", fonction);
    startTransition(async () => {
      const resultat = await affecterFonction(undefined, formData).catch(() => ({
        error: "Connexion indisponible, réessayez.",
      }));
      if (resultat?.error) {
        // Le bandeau n'apparaît que sans aucune affectation : retour à "aucune".
        patcherMesFonctions(queryClient, maraudeId, []);
        setErreur(resultat.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["maraude-equipe-tab", maraudeId] });
      queryClient.invalidateQueries({ queryKey: ["depart", maraudeId] });
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-brand-coral/40 bg-brand-coral/10 p-3">
      <p className="text-sm font-medium text-foreground">
        Vous êtes inscrit(e) — choisissez votre rôle sur cette maraude.
      </p>
      <div className="flex flex-wrap gap-2">
        {rolesDetenus.map((f) => (
          <Button key={f} type="button" className="h-11" disabled={pending} onClick={() => choisir(f)}>
            {FONCTION_MARAUDE_ICONES[f]} {FONCTION_MARAUDE_LABELS[f]}
          </Button>
        ))}
      </div>
      {erreur && (
        <p role="alert" className="text-xs text-destructive">
          {erreur}
        </p>
      )}
    </div>
  );
}

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
  estAffecte,
}: {
  maraude: MaraudeCardData;
  statut: string;
  managerNom: string | null;
  profileId: string;
  isAdmin: boolean;
  isOwnManager: boolean;
  estPassee: boolean;
  estJourJ: boolean;
  estAffecte: boolean;
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
            {/* "Jour J" plutôt qu'"Aujourd'hui" : après minuit, la maraude
                de la veille reste active jusqu'à 06:00. */}
            {estJourJ && <Badge className="bg-brand-coral text-white">Jour J</Badge>}
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
            fonctions={maraude.mesFonctions}
          />
        </div>
      </div>

      {maraude.mineStatut === "inscrit" && !estAffecte && maraude.mineId !== "optimiste" && (
        <ChoixRoleBandeau maraudeId={maraude.id} />
      )}

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
