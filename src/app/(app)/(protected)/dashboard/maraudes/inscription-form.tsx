"use client";

import { useState, useTransition } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
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

type Statut = "inscrit" | "liste_attente" | "desiste" | "en_cours" | undefined;

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

// Mes fonctions sur UNE maraude : badges de rôle, filtre "Mes maraudes" (et
// son compteur), bandeau "choisissez votre rôle". Par défaut `fonctions`
// remplace la liste ; "ajouter"/"retirer" la modifient (bandeau, onglet
// Équipe).
export function patcherMesFonctions(
  queryClient: QueryClient,
  maraudeId: string,
  fonctions: FonctionMaraude[],
  mode: "remplacer" | "ajouter" | "retirer" = "remplacer",
) {
  queryClient.setQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] }, (old) => {
    if (!old) return old;
    const actuelles = old.mesFonctions[maraudeId] ?? [];
    const nouvelles =
      mode === "ajouter"
        ? [...new Set([...actuelles, ...fonctions])]
        : mode === "retirer"
          ? actuelles.filter((f) => !fonctions.includes(f))
          : fonctions;
    const mesFonctions = { ...old.mesFonctions };
    if (nouvelles.length > 0) {
      mesFonctions[maraudeId] = nouvelles;
    } else {
      delete mesFonctions[maraudeId];
    }
    return { ...old, mesFonctions, mesAffectations: Object.keys(mesFonctions) };
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

// Après un désistement, la base peut promouvoir quelqu'un de la liste
// d'attente : on relit les inscriptions de CETTE maraude seulement (plus de
// rechargement de toute la liste des maraudes du tableau de bord).
async function resynchroniserInscriptions(queryClient: QueryClient, maraudeId: string) {
  const { data } = await createClient()
    .from("inscriptions_maraude")
    .select("id, maraude_id, user_id, statut, inscrit_le, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId);
  if (data) {
    patcherInscriptions(queryClient, maraudeId, () => data as unknown as Inscription[]);
  }
}

// compact=true (25/09, refonte Master-Detail) : variante réduite pour la
// carte de liste. variante="barre" (28/09) : gros bouton pleine largeur de
// la barre d'action fixe en bas d'écran sur mobile (atteignable au pouce).
//
// Réactivité (28/09) : au tap, la modale se ferme et le rôle choisi
// s'affiche IMMÉDIATEMENT (carte, détail, barre du bas) ; le statut, lui,
// n'est jamais supposé — "Inscription en cours…" jusqu'à la réponse du
// serveur, qui donne le statut réel attribué par le trigger (inscrit ou liste
// d'attente). Si ce statut diffère de ce que laissaient prévoir les places
// affichées (dernière place prise entre-temps, ou place libérée), la
// personne en est informée. En liste d'attente, pas d'affectation : le badge
// de rôle disparaît. Erreur ou réseau coupé → retour à l'état précédent +
// message. Seul le cache de CETTE maraude est modifié.
export function InscriptionForm({
  maraudeId,
  inscriptionId,
  statut,
  fonctions = [],
  compact = false,
  variante,
}: {
  maraudeId: string;
  inscriptionId: string | undefined;
  statut: Statut;
  fonctions?: FonctionMaraude[];
  compact?: boolean;
  variante?: "barre";
}) {
  const queryClient = useQueryClient();
  const profile = useSession();
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [choixOuvert, setChoixOuvert] = useState(false);
  const [choix, setChoix] = useState<FonctionMaraude[]>([]);

  // Choix du rôle à l'inscription : seuls les rôles détenus (profile_roles)
  // sont proposés. Aucun ou un seul → pas de modale (inscription directe,
  // avec ce rôle s'il existe). Les deux → modale, rôles cumulables.
  const rolesDetenus = FONCTIONS_MARAUDE.filter((f) => profile.roles.includes(f));
  const reinscription = statut === "desiste";
  const enCours = statut === "en_cours";

  function demanderInscription() {
    setErreur(null);
    setInfo(null);
    if (rolesDetenus.length >= 2) {
      setChoix([]);
      setChoixOuvert(true);
      return;
    }
    lancerInscription(rolesDetenus);
  }

  function lancerInscription(fonctionsChoisies: FonctionMaraude[]) {
    setChoixOuvert(false);
    setErreur(null);
    setInfo(null);
    const avant = queryClient.getQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] });

    // Ce que laissent prévoir les places affichées — uniquement pour
    // prévenir la personne si la réalité diffère, jamais affiché comme statut.
    let attendu: "inscrit" | "liste_attente" = "inscrit";
    patcherInscriptions(queryClient, maraudeId, (inscriptions, max) => {
      const places = inscriptions.filter((i) => i.statut === "inscrit").length;
      attendu = places < max ? "inscrit" : "liste_attente";
      // Réinscription : même ligne (unique par maraude/bénévole), réactivée.
      if (reinscription) {
        return inscriptions.map((i) =>
          i.user_id === profile.id ? { ...i, statut: "en_cours" } : i,
        );
      }
      return [
        ...inscriptions,
        {
          id: ID_OPTIMISTE,
          maraude_id: maraudeId,
          user_id: profile.id,
          statut: "en_cours",
          inscrit_le: new Date().toISOString(),
          profil: { full_name: profile.full_name },
        },
      ];
    });
    patcherMesFonctions(queryClient, maraudeId, fonctionsChoisies);

    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    if (reinscription) formData.set("reinscription", "1");
    fonctionsChoisies.forEach((f) => formData.append("fonctions", f));
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
      // Rôles RÉELLEMENT affectés (aucun en liste d'attente).
      patcherMesFonctions(queryClient, maraudeId, resultat.fonctions);

      if (resultat.statut === "liste_attente") {
        setInfo(
          attendu === "inscrit"
            ? "La dernière place vient d'être prise : vous êtes en liste d'attente. Vous choisirez votre rôle une fois votre place confirmée."
            : "Maraude complète : vous êtes en liste d'attente. Vous choisirez votre rôle une fois votre place confirmée.",
        );
      } else if (attendu === "liste_attente") {
        setInfo("Une place s'est libérée entre-temps : vous êtes inscrit(e).");
      }
      if (resultat.avertissement) {
        setErreur(resultat.avertissement);
      }
      // Les compteurs affichés peuvent être périmés (quelqu'un a pris ou
      // libéré une place entre-temps) : relecture en arrière-plan des
      // inscriptions de CETTE maraude seulement.
      void resynchroniserInscriptions(queryClient, maraudeId);
      rafraichirDependances(queryClient, maraudeId);
    });
  }

  function seDesister() {
    if (!inscriptionId || inscriptionId === ID_OPTIMISTE) return;
    setErreur(null);
    setInfo(null);
    const avant = queryClient.getQueriesData<MaraudesPayload>({ queryKey: ["maraudes"] });
    patcherInscriptions(queryClient, maraudeId, (inscriptions) =>
      inscriptions.map((i) => (i.id === inscriptionId ? { ...i, statut: "desiste" } : i)),
    );
    // Le désistement retire aussi les affectations (trigger
    // retirer_affectations_au_desistement).
    patcherMesFonctions(queryClient, maraudeId, []);

    const formData = new FormData();
    formData.set("inscriptionId", inscriptionId);
    startTransition(async () => {
      const resultat = await seDesisterMaraude(formData).catch(() => ({ error: ERREUR_RESEAU }));
      if (resultat?.error) {
        avant.forEach(([cle, donnees]) => queryClient.setQueryData(cle, donnees));
        setErreur(resultat.error);
        return;
      }
      await resynchroniserInscriptions(queryClient, maraudeId);
      rafraichirDependances(queryClient, maraudeId);
    });
  }

  // Le temps que le serveur confirme l'inscription, l'id réel n'est pas
  // encore connu : "Se désister" reste désactivé ces quelques centaines de ms.
  const desistementImpossible = pending || enCours || inscriptionId === ID_OPTIMISTE;
  const messages = (
    <>
      {info && <p className="text-sm text-brand-navy dark:text-brand-pastel">{info}</p>}
      {erreur && (
        <p role="alert" className="text-sm text-destructive">
          {erreur}
        </p>
      )}
    </>
  );
  const badgesRoles = fonctions.map((f) => (
    <Badge key={f} variant="secondary" className="shrink-0">
      {FONCTION_MARAUDE_ICONES[f]} {FONCTION_MARAUDE_LABELS[f]}
    </Badge>
  ));

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
    if (enCours) {
      return (
        <Button type="button" disabled className="h-12 w-full text-base">
          Inscription…
        </Button>
      );
    }

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
          {messages}
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
        {messages}
        {modaleChoix}
      </div>
    );
  }

  if (compact) {
    // Icônes de rôle à côté du bouton : visibles dès le tap.
    const icones = fonctions.length > 0 && (
      <span className="shrink-0 text-sm" title={fonctions.map((f) => FONCTION_MARAUDE_LABELS[f]).join(", ")}>
        {fonctions.map((f) => FONCTION_MARAUDE_ICONES[f]).join("")}
      </span>
    );
    const message = (info || erreur) && (
      <span
        role={erreur ? "alert" : undefined}
        className={`max-w-48 text-right text-xs ${erreur ? "text-destructive" : "text-brand-navy dark:text-brand-pastel"}`}
      >
        {erreur ?? info}
      </span>
    );

    if (enCours || statut === "inscrit" || statut === "liste_attente") {
      return (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {icones}
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
            >
              {enCours ? "Inscription…" : statut === "inscrit" ? "Inscrit" : "Liste d'attente"}
            </Button>
          </div>
          {message}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            demanderInscription();
          }}
          className="shrink-0"
        >
          {libelleInscription ?? "S'inscrire"}
        </Button>
        {message}
        {modaleChoix}
      </div>
    );
  }

  if (enCours || statut === "inscrit" || statut === "liste_attente") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={statut === "inscrit" ? "default" : "secondary"}>
            {enCours ? "Inscription en cours…" : statut === "inscrit" ? "Inscrit" : "Liste d'attente"}
          </Badge>
          {badgesRoles}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={desistementImpossible}
            onClick={seDesister}
          >
            Se désister
          </Button>
        </div>
        {messages}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {reinscription && <Badge variant="outline">Désisté</Badge>}
        <Button type="button" disabled={pending} onClick={demanderInscription} className="h-12">
          {libelleInscription ?? "S'inscrire"}
        </Button>
      </div>
      {messages}
      {modaleChoix}
    </div>
  );
}
