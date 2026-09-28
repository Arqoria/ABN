"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ArrowLeft } from "lucide-react";
import { CreerEvenementForm } from "./creer-evenement-form";
import { MaraudeCard, type MaraudeCardData } from "./maraude-card";
import { MaraudeDetailPanel } from "./maraude-detail-panel";
import { InscriptionForm } from "./inscription-form";

export type Inscription = {
  id: string;
  maraude_id: string;
  user_id: string;
  statut: "inscrit" | "liste_attente" | "desiste";
  inscrit_le: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};

type Manager = { id: string; full_name: string | null };
type TypeEvenement = { id: string; nom: string };

export type Maraude = {
  id: string;
  date_heure: string;
  statut: string;
  manager_id: string;
  max_participants: number;
  serie_id: string | null;
  manager: { full_name: string | null } | { full_name: string | null }[] | null;
  type_evenement: { nom: string } | { nom: string }[] | null;
  inscriptions_maraude: Inscription[];
};

export type MaraudesPayload = {
  managers: Manager[];
  typesEvenement: TypeEvenement[];
  maraudes: Maraude[];
  mesAffectations: string[];
};

// Lecture directe Supabase depuis le navigateur (RLS comme seule
// barrière) — voir docs/Tasks.md, "Chantier lancé, suite (16/09)". Étendu
// (25/09, refonte Master-Detail) : noms des inscrits (avatars à initiales)
// et mes propres affectations toutes maraudes confondues (filtre "Mes
// maraudes").
async function fetchMaraudes(profileId: string, isAdminOrManager: boolean): Promise<MaraudesPayload> {
  const supabase = createClient();

  async function chargerManagers() {
    if (!isAdminOrManager) return [] as Manager[];
    const { data } = await supabase
      .from("profile_roles")
      .select("profiles!profile_roles_profile_id_fkey!inner(id, full_name, status)")
      .eq("role", "manager")
      .eq("profiles.status", "actif");

    return (data ?? []).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return p as Manager;
    });
  }

  async function chargerMaraudesAvecInscriptions() {
    const { data } = await supabase
      .from("maraudes")
      .select(
        "id, date_heure, statut, manager_id, max_participants, serie_id, manager:manager_id(full_name), type_evenement:type_evenement_id(nom), inscriptions_maraude(id, maraude_id, user_id, statut, inscrit_le, profil:user_id(full_name))",
      )
      .order("date_heure", { ascending: true });
    return (data ?? []) as unknown as Maraude[];
  }

  async function chargerTypesEvenement() {
    if (!isAdminOrManager) return [] as TypeEvenement[];
    const { data } = await supabase
      .from("types_evenement")
      .select("id, nom")
      .eq("actif", true)
      .order("nom", { ascending: true });
    return data ?? [];
  }

  async function chargerMesAffectations() {
    const { data } = await supabase
      .from("affectations_maraude")
      .select("maraude_id")
      .eq("user_id", profileId);
    return (data ?? []).map((a) => a.maraude_id as string);
  }

  const [managers, typesEvenement, maraudes, mesAffectations] = await Promise.all([
    chargerManagers(),
    chargerTypesEvenement(),
    chargerMaraudesAvecInscriptions(),
    chargerMesAffectations(),
  ]);

  return { managers, typesEvenement, maraudes, mesAffectations };
}

type Onglet = "a_venir" | "historique";
type Filtre = "toutes" | "mes" | "a_completer";

const FILTRES: { value: Filtre; label: string; historique: boolean }[] = [
  { value: "toutes", label: "Toutes", historique: true },
  { value: "mes", label: "Mes maraudes", historique: true },
  { value: "a_completer", label: "⚠️ À compléter", historique: false },
];

// Fenêtre "jour J" (décision Chef de Produit, 28/09) : une maraude est
// active — chrono et boutons de pointage terrain — depuis 00:00 le jour de
// sa date jusqu'au lendemain 06:00, pour que le passage de minuit ne coupe
// pas une maraude du soir en cours. Heure locale de l'appareil.
const FIN_JOUR_J_LENDEMAIN_HEURE = 6;

function estDansFenetreJourJ(dateMaraude: Date, maintenant: Date): boolean {
  const debut = new Date(dateMaraude);
  debut.setHours(0, 0, 0, 0);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);
  fin.setHours(FIN_JOUR_J_LENDEMAIN_HEURE, 0, 0, 0);
  return maintenant >= debut && maintenant < fin;
}

// Refonte Master-Detail (25/09, Étape 10bis), reprise ergonomique (28/09) —
// voir docs/Tasks.md pour le détail des deux chantiers et les points
// explicitement retirés (lieu, téléphone, WhatsApp, Modifier/Annuler —
// aucun n'existe dans le modèle de données actuel).
export function MaraudesClient() {
  const profile = useSession();
  const isAdmin = profile.roles.includes("admin");
  const isAdminOrManagerForQuery = isAdmin || profile.roles.includes("manager");

  const [onglet, setOnglet] = useState<Onglet>("a_venir");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [creationOuverte, setCreationOuverte] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maraudes", profile.id, isAdminOrManagerForQuery],
    queryFn: () => fetchMaraudes(profile.id, isAdminOrManagerForQuery),
  });

  const cards: (MaraudeCardData & {
    raw: Maraude;
    managerNom: string | null;
    isOwnManager: boolean;
    isPassee: boolean;
    isJourJ: boolean;
  })[] = useMemo(() => {
    if (!data) return [];
    const maintenant = new Date();
    return data.maraudes.map((m) => {
      const date = new Date(m.date_heure);
      const mesInscriptions = m.inscriptions_maraude ?? [];
      const inscrits = mesInscriptions
        .filter((i) => i.statut === "inscrit")
        .sort((a, b) => a.inscrit_le.localeCompare(b.inscrit_le));
      const listeAttente = mesInscriptions.filter((i) => i.statut === "liste_attente");
      const mine = mesInscriptions.find((i) => i.user_id === profile.id);
      const managerRow = Array.isArray(m.manager) ? m.manager[0] : m.manager;
      const typeRow = Array.isArray(m.type_evenement) ? m.type_evenement[0] : m.type_evenement;

      return {
        id: m.id,
        raw: m,
        dateHeure: m.date_heure,
        typeNom: typeRow?.nom ?? null,
        serieId: m.serie_id,
        maxParticipants: m.max_participants,
        inscritsCount: inscrits.length,
        listeAttenteCount: listeAttente.length,
        premiersInscrits: inscrits
          .map((i) => {
            const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
            return p?.full_name ?? "?";
          }),
        mineId: mine?.id,
        mineStatut: mine?.statut,
        managerNom: managerRow?.full_name ?? null,
        isOwnManager: m.manager_id === profile.id,
        isPassee: date.getTime() < maintenant.getTime(),
        // Conditionne le chrono et les 4 boutons de pointage terrain.
        isJourJ: estDansFenetreJourJ(date, maintenant),
      };
    });
  }, [data, profile.id]);

  // "À compléter" n'a pas de sens sur l'Historique (demande 28/09) : filtre
  // masqué, et s'il était actif on retombe sur "Toutes" en changeant d'onglet.
  const filtreEffectif: Filtre = onglet === "historique" && filtre === "a_completer" ? "toutes" : filtre;

  // Les 3 listes filtrées de l'onglet actif, calculées ensemble pour que
  // les compteurs "Toutes (X) / Mes maraudes (Y) / À compléter (Z)" soient
  // toujours exactement le nombre de cartes affichées par chaque filtre.
  const parFiltre = useMemo(() => {
    const parOnglet = cards.filter((c) => (onglet === "a_venir" ? !c.isPassee : c.isPassee));
    const toutes = onglet === "a_venir" ? parOnglet : [...parOnglet].reverse();
    const mesAffectations = new Set(data?.mesAffectations ?? []);
    return {
      toutes,
      mes: toutes.filter((c) => c.isOwnManager || mesAffectations.has(c.id)),
      a_completer: toutes.filter((c) => c.inscritsCount < c.maxParticipants),
    } satisfies Record<Filtre, typeof cards>;
  }, [cards, onglet, data?.mesAffectations]);

  const filteredCards = parFiltre[filtreEffectif];

  // Défilement PC (28/09) : sur lg, la zone liste/détail occupe exactement
  // la hauteur restante de l'écran et chaque colonne défile indépendamment
  // (le bas de Logistique — Besoins, Tickets — n'est plus hors d'atteinte).
  // L'en-tête a une hauteur variable (badges de rôles qui passent à la
  // ligne) : on mesure la position réelle de la grille plutôt que de coder
  // une hauteur en dur. Sur mobile, la variable est ignorée (classes lg:
  // uniquement) : pas de conteneur à défilement imbriqué, la page défile.
  const grilleRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grille = grilleRef.current;
    if (!grille) return;
    function mesurer() {
      if (!grille) return;
      const haut = grille.getBoundingClientRect().top + window.scrollY;
      grille.style.setProperty("--grille-haut", `${Math.round(haut)}px`);
    }
    mesurer();
    window.addEventListener("resize", mesurer);
    const observer = new ResizeObserver(mesurer);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("resize", mesurer);
      observer.disconnect();
    };
  }, [isLoading]);

  const selected = filteredCards.find((c) => c.id === selectedId) ?? filteredCards[0] ?? null;

  if (isLoading) {
    return <CardListSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-8 pb-16 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les maraudes pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { managers, typesEvenement } = data;

  function selectionner(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  const messageListeVide =
    filtreEffectif === "mes"
      ? "Aucune maraude où vous êtes manager ou affecté, sur cet onglet."
      : filtreEffectif === "a_completer"
        ? "Aucune maraude à compléter — toutes les places sont prises (ou aucune maraude sur cet onglet)."
        : onglet === "a_venir"
          ? "Aucune maraude à venir."
          : "Aucun historique pour l'instant.";

  const etatBenevole =
    selected?.mineStatut === "inscrit"
      ? "✅ Vous êtes inscrit(e)"
      : selected?.mineStatut === "liste_attente"
        ? "⏳ En liste d'attente"
        : selected?.mineStatut === "desiste"
          ? "Désisté(e)"
          : selected
            ? `${Math.max(0, selected.maxParticipants - selected.inscritsCount)} place(s) disponible(s)`
            : "";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Maraudes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Capacité par événement, liste d&apos;attente automatique au-delà.
          </p>
        </div>

        {isAdminOrManagerForQuery && (
          <Dialog open={creationOuverte} onOpenChange={setCreationOuverte}>
            <DialogTrigger asChild>
              <Button type="button" className="h-10 shrink-0">
                <Plus className="size-4" /> Créer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer un événement</DialogTitle>
                <DialogDescription>Ponctuel ou série récurrente.</DialogDescription>
              </DialogHeader>
              <CreerEvenementForm
                typesEvenement={typesEvenement}
                managers={managers}
                onCree={() => setCreationOuverte(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-brand-pastel p-1 text-brand-navy">
          {(["a_venir", "historique"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOnglet(o)}
              className={`inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                onglet === o ? "bg-brand-navy text-white shadow-sm" : "hover:bg-white/60"
              }`}
            >
              {o === "a_venir" ? "À venir" : "Historique"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTRES.filter((f) => onglet === "a_venir" || f.historique).map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={filtreEffectif === f.value ? "default" : "outline"}
              onClick={() => setFiltre(f.value)}
            >
              {f.label}{" "}
              <span className="tabular-nums opacity-80">({parFiltre[f.value].length})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* lg : hauteur = reste de l'écran (voir --grille-haut plus haut),
          min-h pour rester utilisable sur un écran très bas. */}
      <div
        ref={grilleRef}
        className="lg:grid lg:h-[calc(100dvh-var(--grille-haut,0px)-1rem)] lg:min-h-[28rem] lg:grid-cols-12 lg:gap-6"
      >
        {/* Liste : défile indépendamment du détail sur grand écran. */}
        <div
          className={`flex-col gap-2 lg:col-span-5 lg:flex lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:pb-4 ${
            mobileDetailOpen ? "hidden" : "flex"
          }`}
        >
          {filteredCards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {messageListeVide}
              </CardContent>
            </Card>
          ) : (
            filteredCards.map((c) => (
              <MaraudeCard
                key={c.id}
                maraude={c}
                isSelected={selected?.id === c.id}
                onSelect={() => selectionner(c.id)}
              />
            ))
          )}
        </div>

        {/* Détail : plein écran au-dessus de la liste sur mobile (retour collé
            en haut, barre d'action collée en bas), colonne de droite toujours
            visible sur grand écran. Bascule purement CSS, aucune détection de
            largeur en JS. */}
        <div
          className={`lg:static lg:z-auto lg:col-span-7 lg:block lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:bg-transparent lg:pr-1 ${
            mobileDetailOpen ? "fixed inset-0 z-50 overflow-y-auto bg-background" : "hidden"
          }`}
        >
          <div className="sticky top-0 z-10 border-b bg-background/95 px-2 py-1.5 backdrop-blur lg:hidden">
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              onClick={() => setMobileDetailOpen(false)}
            >
              <ArrowLeft className="size-4" /> Retour aux maraudes
            </Button>
          </div>

          <div className="px-4 pt-4 pb-32 lg:p-0 lg:pb-4">
            {selected ? (
              <MaraudeDetailPanel
                maraude={selected}
                statut={selected.raw.statut}
                managerNom={selected.managerNom}
                profileId={profile.id}
                isAdmin={isAdmin}
                isOwnManager={selected.isOwnManager}
                estPassee={selected.isPassee}
                estJourJ={selected.isJourJ}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Sélectionnez une maraude.
                </CardContent>
              </Card>
            )}
          </div>

          {mobileDetailOpen && selected && (
            <div className="fixed inset-x-0 bottom-0 z-10 flex items-center gap-3 border-t bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
              <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{etatBenevole}</p>
              <div className="w-3/5 shrink-0">
                <InscriptionForm
                  key={selected.id}
                  maraudeId={selected.id}
                  inscriptionId={selected.mineId}
                  statut={selected.mineStatut}
                  variante="barre"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
