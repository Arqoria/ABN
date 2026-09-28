"use client";

import { useState, useTransition } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { inscrireMaraude, seDesisterMaraude } from "@/lib/actions/maraudes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FONCTIONS_MARAUDE,
  FONCTION_MARAUDE_ICONES,
  FONCTION_MARAUDE_LABELS,
  type FonctionMaraude,
} from "@/lib/fonction-maraude";
import type { Inscription, MaraudesPayload } from "./maraudes-client";

type Statut = "inscrit" | "liste_attente" | "desiste" | undefined;

const ID_OPTIMISTE = "optimiste";
// Server Action rejetée (réseau coupé, fréquent sur le terrain) : l'affichage
// optimiste est annulé comme pour une erreur métier.
const ERREUR_RESEAU = "Connexion indisponible, réessayez.";

// Applique `modifier` aux inscriptions d'UNE maraude dans tous les caches de
// la liste (["maraudes", ...]) — carte, en-tête et barre du bas lisent tous
// ce même cache, ils basculent donc ensemble instantanément.
function patcherInscriptions(
  queryClient: QueryClient,
  maraudeId: string,
  modifier: (inscriptions: Inscription[], maxParticipants: number) => Inscription[],
) {
  queryClient.setQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] }, (old) =>
    old
      ? {
          ...old,
          maraudes: old.maraudes.map((m) =>
            m.id === maraudeId
              ? { ...m, inscriptions_maraude: modifier(m.inscriptions_maraude ?? [], m.max_participants) }
              : m,
          ),
        }
      : old,
  );
}

// Filtre "Mes maraudes" (et son compteur) : maraudes où l'on est affecté.
export function patcherMesAffectations(queryClient: QueryClient, maraudeId: string, affecte: boolean) {
  queryClient.setQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] }, (old) => {
    if (!old) return old;
    const sans = old.mesAffectations.filter((id) => id !== maraudeId);
    return { ...old, mesAffectations: affecte ? [...sans, maraudeId] : sans };
  });
}

// Rafraîchit EN ARRIÈRE-PLAN (jamais bloquant pour l'affichage) les seules
// requêtes de cette maraude qui dépendent de l'inscription : l'équipe, la
// checklist/présences, et celles qui avaient refusé l'accès faute
// d'inscription (carte, besoins, pointages…). La heatmap d'un Admin/Manager,
// déjà accessible, n'est plus rechargée pour rien.
function rafraichirDependances(queryClient: QueryClient, maraudeId: string) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      if (q.queryKey[1] !== maraudeId) return false;
      const racine = q.queryKey[0];
      if (racine === "maraude-equipe-tab" || racine === "depart") return true;
      const data = q.state.data as { refuse?: boolean } | boolean | undefined;
      return data === false || (typeof data === "object" && data?.refuse === true);
    },
  });
}

// compact=true (25/09, refonte Master-Detail) : variante réduite pour la
// carte de liste. variante="barre" (28/09) : gros bouton pleine largeur de
// la barre d'action fixe en bas d'écran sur mobile (atteignable au pouce).
//
// Perf (28/09, retour client "le clic inscription est lent") : mise à jour
// OPTIMISTE — l'état bascule au tap, avant la réponse du serveur. Le statut
// prédit (inscrit / liste d'attente selon les places restantes connues) est
// ensuite remplacé par celui réellement attribué par le trigger
// set_inscription_statut ; en cas d'erreur, l'état précédent est restauré
// et le message affiché. Mêmes deux Server Actions, logique métier
// inchangée.
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
  const profile = useSession();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [choixOuvert, setChoixOuvert] = useState(false);
  const [choix, setChoix] = useState<FonctionMaraude[]>([]);

  // Choix du rôle à l'inscription (28/09) : seuls les rôles que la personne
  // détient (profile_roles) sont proposés. Aucun ou un seul → pas de modale
  // (inscription directe, avec ce rôle s'il existe). Les deux → modale,
  // rôles cumulables.
  const rolesDetenus = FONCTIONS_MARAUDE.filter((f) => profile.roles.includes(f));
  const reinscription = statut === "desiste";

  function demanderInscription() {
    setErreur(null);
    if (rolesDetenus.length >= 2) {
      setChoix([]);
      setChoixOuvert(true);
      return;
    }
    lancerInscription(rolesDetenus);
  }

  function lancerInscription(fonctions: FonctionMaraude[]) {
    setChoixOuvert(false);
    setErreur(null);
    const avant = queryClient.getQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] });
    patcherInscriptions(queryClient, maraudeId, (inscriptions, max) => {
      const places = inscriptions.filter((i) => i.statut === "inscrit").length;
      const predit = places < max ? "inscrit" : "liste_attente";
      // Réinscription : même ligne (unique par maraude/bénévole), réactivée.
      if (reinscription) {
        return inscriptions.map((i) =>
          i.user_id === profile.id ? { ...i, statut: predit, inscrit_le: new Date().toISOString() } : i,
        );
      }
      return [
        ...inscriptions,
        {
          id: ID_OPTIMISTE,
          maraude_id: maraudeId,
          user_id: profile.id,
          statut: predit,
          inscrit_le: new Date().toISOString(),
          profil: { full_name: profile.full_name },
        },
      ];
    });

    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    if (reinscription) formData.set("reinscription", "1");
    fonctions.forEach((f) => formData.append("fonctions", f));
    startTransition(async () => {
      const resultat = await inscrireMaraude(formData).catch(() => ({ error: ERREUR_RESEAU }));
      if ("error" in resultat) {
        avant.forEach(([cle, donnees]) => queryClient.setQueryData(cle, donnees));
        setErreur(resultat.error);
        return;
      }
      patcherInscriptions(queryClient, maraudeId, (inscriptions) =>
        inscriptions.map((i) =>
          i.id === ID_OPTIMISTE || (reinscription && i.user_id === profile.id)
            ? { ...i, id: resultat.id, statut: resultat.statut }
            : i,
        ),
      );
      if (resultat.fonctions.length > 0) {
        patcherMesAffectations(queryClient, maraudeId, true);
      }
      if (resultat.avertissement) {
        setErreur(resultat.avertissement);
      }
      rafraichirDependances(queryClient, maraudeId);
    });
  }

  function seDesister() {
    if (!inscriptionId || inscriptionId === ID_OPTIMISTE) return;
    setErreur(null);
    const avant = queryClient.getQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] });
    patcherInscriptions(queryClient, maraudeId, (inscriptions) =>
      inscriptions.map((i) => (i.id === inscriptionId ? { ...i, statut: "desiste" } : i)),
    );

    const formData = new FormData();
    formData.set("inscriptionId", inscriptionId);
    startTransition(async () => {
      const resultat = await seDesisterMaraude(formData).catch(() => ({ error: ERREUR_RESEAU }));
      if (resultat?.error) {
        avant.forEach(([cle, donnees]) => queryClient.setQueryData(cle, donnees));
        setErreur(resultat.error);
        return;
      }
      // Le désistement retire aussi les affectations (trigger
      // retirer_affectations_au_desistement) : "Mes maraudes" suit.
      patcherMesAffectations(queryClient, maraudeId, false);
      // Un désistement peut promouvoir quelqu'un de la liste d'attente
      // (côté base) : la liste est resynchronisée en arrière-plan, l'écran
      // affiche déjà le désistement.
      queryClient.invalidateQueries({ queryKey: ["maraudes"] });
      rafraichirDependances(queryClient, maraudeId);
    });
  }

  // Le temps que le serveur confirme l'inscription, l'id réel n'est pas
  // encore connu : "Se désister" reste désactivé ces quelques centaines de ms.
  const desistementImpossible = pending || inscriptionId === ID_OPTIMISTE;
  const messageErreur = erreur && (
    <p role="alert" className="text-sm text-destructive">
      {erreur}
    </p>
  );

  // Modale de choix du rôle (seulement si la personne détient les deux).
  // Rendue DANS le composant : les clics dans le portail remontent l'arbre
  // React jusqu'au conteneur de la carte, qui les arrête déjà (la carte ne
  // s'ouvre pas en arrière-plan).
  const modaleChoix = (
    <Dialog open={choixOuvert} onOpenChange={setChoixOuvert}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Votre rôle sur cette maraude</DialogTitle>
          <DialogDescription>
            Choisissez un ou les deux rôles. En liste d&apos;attente, le rôle sera à choisir
            une fois votre place confirmée.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {rolesDetenus.map((f) => {
            const actif = choix.includes(f);
            return (
              <Button
                key={f}
                type="button"
                variant={actif ? "default" : "outline"}
                aria-pressed={actif}
                className="h-16 text-base"
                onClick={() => setChoix((c) => (actif ? c.filter((x) => x !== f) : [...c, f]))}
              >
                {FONCTION_MARAUDE_ICONES[f]} {FONCTION_MARAUDE_LABELS[f]}
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          className="h-12 bg-brand-coral text-base text-white hover:bg-brand-coral/90"
          disabled={choix.length === 0}
          onClick={() => lancerInscription(choix)}
        >
          {reinscription ? "S'inscrire à nouveau" : "Confirmer l'inscription"}
        </Button>
      </DialogContent>
    </Dialog>
  );

  const libelleInscription = reinscription ? "S'inscrire à nouveau" : null;

  if (variante === "barre") {
    if (statut === "inscrit" || statut === "liste_attente") {
      return (
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            disabled={desistementImpossible}
            onClick={seDesister}
            className="h-12 w-full text-base"
          >
            Se désister
          </Button>
          {messageErreur}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          disabled={pending}
          onClick={demanderInscription}
          className="h-12 w-full bg-brand-coral text-base text-white hover:bg-brand-coral/90"
        >
          {libelleInscription ?? "S'inscrire à cette maraude"}
        </Button>
        {messageErreur}
        {modaleChoix}
      </div>
    );
  }

  if (compact) {
    if (statut === "inscrit" || statut === "liste_attente") {
      return (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={desistementImpossible}
          onClick={(e) => {
            e.stopPropagation();
            seDesister();
          }}
          className="shrink-0"
          title={erreur ?? undefined}
        >
          {statut === "inscrit" ? "Inscrit" : "Liste d'attente"}
        </Button>
      );
    }

    return (
      <>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            demanderInscription();
          }}
          className="shrink-0"
          title={erreur ?? undefined}
        >
          {libelleInscription ?? "S'inscrire"}
        </Button>
        {modaleChoix}
      </>
    );
  }

  if (statut === "inscrit" || statut === "liste_attente") {
    return (
      <div className="flex items-center gap-3">
        <Badge variant={statut === "inscrit" ? "default" : "secondary"}>
          {statut === "inscrit" ? "Inscrit" : "Liste d'attente"}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={desistementImpossible}
          onClick={seDesister}
        >
          Se désister
        </Button>
        {messageErreur}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {reinscription && <Badge variant="outline">Désisté</Badge>}
      <Button type="button" disabled={pending} onClick={demanderInscription} className="h-12">
        {libelleInscription ?? "S'inscrire"}
      </Button>
      {messageErreur}
      {modaleChoix}
    </div>
  );
}
