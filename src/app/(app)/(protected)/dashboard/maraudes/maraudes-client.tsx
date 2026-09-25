"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CalendarPlus, ArrowLeft } from "lucide-react";
import { CreerEvenementForm } from "./creer-evenement-form";
import { MaraudeCard, type MaraudeCardData } from "./maraude-card";
import { MaraudeDetailPanel } from "./maraude-detail-panel";

type Inscription = {
  id: string;
  maraude_id: string;
  user_id: string;
  statut: "inscrit" | "liste_attente" | "desiste";
  inscrit_le: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};

type Manager = { id: string; full_name: string | null };
type TypeEvenement = { id: string; nom: string };

type Maraude = {
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

type Payload = {
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
async function fetchMaraudes(profileId: string, isAdminOrManager: boolean): Promise<Payload> {
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

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  { value: "mes", label: "Mes maraudes" },
  { value: "a_completer", label: "⚠️ À compléter" },
];

// Refonte Master-Detail (25/09, Étape 10bis) — remplace la liste verticale
// à plat par une mise en page liste/détail. Voir docs/Tasks.md pour le
// détail du chantier et les 3 points explicitement retirés de cette
// itération (lieu, téléphone, Modifier/Annuler — aucun n'existe dans le
// modèle de données actuel).
export function MaraudesClient() {
  const profile = useSession();
  const isAdmin = profile.roles.includes("admin");
  const isAdminOrManagerForQuery = isAdmin || profile.roles.includes("manager");

  const [onglet, setOnglet] = useState<Onglet>("a_venir");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maraudes", profile.id, isAdminOrManagerForQuery],
    queryFn: () => fetchMaraudes(profile.id, isAdminOrManagerForQuery),
  });

  const cards: (MaraudeCardData & {
    raw: Maraude;
    managerNom: string | null;
    isOwnManager: boolean;
    isPassee: boolean;
  })[] = useMemo(() => {
    if (!data) return [];
    return data.maraudes.map((m) => {
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
        isPassee: new Date(m.date_heure).getTime() < Date.now(),
      };
    });
  }, [data, profile.id]);

  const filteredCards = useMemo(() => {
    const parOnglet = cards.filter((c) => (onglet === "a_venir" ? !c.isPassee : c.isPassee));
    const trie = onglet === "a_venir" ? parOnglet : [...parOnglet].reverse();
    const mesAffectations = new Set(data?.mesAffectations ?? []);

    if (filtre === "mes") {
      return trie.filter((c) => c.isOwnManager || mesAffectations.has(c.id));
    }
    if (filtre === "a_completer") {
      return trie.filter((c) => c.inscritsCount < c.maxParticipants);
    }
    return trie;
  }, [cards, onglet, filtre, data?.mesAffectations]);

  const selected = filteredCards.find((c) => c.id === selectedId) ?? filteredCards[0] ?? null;

  if (isLoading) {
    return <CardListSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
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
    filtre === "mes"
      ? "Aucune maraude où vous êtes manager ou affecté, sur cet onglet."
      : filtre === "a_completer"
        ? "Aucune maraude à compléter — toutes les places sont prises (ou aucune maraude sur cet onglet)."
        : onglet === "a_venir"
          ? "Aucune maraude à venir."
          : "Aucun historique pour l'instant.";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Maraudes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capacité par événement, liste d&apos;attente automatique au-delà.
        </p>
      </div>

      {isAdminOrManagerForQuery && (
        <CollapsibleSection
          title="Créer un événement"
          description="Ponctuel ou série récurrente."
          icon={CalendarPlus}
        >
          <CreerEvenementForm typesEvenement={typesEvenement} managers={managers} />
        </CollapsibleSection>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-brand-pastel p-1 text-brand-navy">
          {(["a_venir", "historique"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOnglet(o)}
              className={`inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                onglet === o ? "bg-brand-navy text-white shadow-sm" : ""
              }`}
            >
              {o === "a_venir" ? "À venir" : "Historique"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTRES.map((f) => (
            <Button
              key={f.value}
              type="button"
              size="sm"
              variant={filtre === f.value ? "default" : "outline"}
              onClick={() => setFiltre(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div
          className={`flex-col gap-2 lg:col-span-5 lg:flex ${mobileDetailOpen ? "hidden" : "flex"}`}
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

        <div
          className={`lg:relative lg:inset-auto lg:z-auto lg:col-span-7 lg:block lg:overflow-visible lg:bg-transparent lg:p-0 ${
            mobileDetailOpen ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4" : "hidden"
          }`}
        >
          {mobileDetailOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-3 lg:hidden"
              onClick={() => setMobileDetailOpen(false)}
            >
              <ArrowLeft className="size-4" /> Retour
            </Button>
          )}

          {selected ? (
            <MaraudeDetailPanel
              maraude={selected}
              statut={selected.raw.statut}
              managerNom={selected.managerNom}
              profileId={profile.id}
              isAdmin={isAdmin}
              isOwnManager={selected.isOwnManager}
              estPassee={selected.isPassee}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Sélectionnez une maraude.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
