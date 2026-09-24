"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { supprimerMouvementMateriel } from "@/lib/actions/stocks";
import { CATEGORIES_BESOIN, CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PlusCircle, History } from "lucide-react";
import { MouvementMaterielForm } from "./mouvement-materiel-form";

type Mouvement = {
  id: string;
  categorie: CategorieBesoin;
  quantite: number;
  motif: string | null;
  created_at: string;
  maraude: { date_heure: string } | { date_heure: string }[] | null;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
type Payload = {
  mouvements: Mouvement[];
  maraudes: { id: string; date_heure: string }[];
};

// Lecture directe Supabase depuis le navigateur — RLS
// (stock_materiel_select_authenticated) fait toute la restriction réelle
// pour la lecture. Voir docs/Tasks.md, "Chantier lancé" (17/09).
async function fetchStocks(): Promise<Payload> {
  const supabase = createClient();

  const [{ data: mouvements }, { data: maraudes }] = await Promise.all([
    supabase
      .from("stock_materiel_mouvements")
      .select("id, categorie, quantite, motif, created_at, maraude:maraude_id(date_heure), profil:created_by(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("maraudes")
      .select("id, date_heure")
      .order("date_heure", { ascending: false })
      .limit(50),
  ]);

  return { mouvements: mouvements ?? [], maraudes: maraudes ?? [] };
}

// Voir docs/Tasks.md, "Chantier lancé" (17/09). Réservée à Admin, Manager
// ou Maraudeur (même liste que la policy RLS d'écriture) — la vraie
// barrière reste RLS sur stock_materiel_mouvements.
export function StocksClient() {
  const profile = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const isAdmin = profile.roles.includes("admin");
  const peutAcceder =
    isAdmin || profile.roles.includes("manager") || profile.roles.includes("maraudeur");

  useEffect(() => {
    if (!peutAcceder) {
      router.replace("/dashboard");
    }
  }, [peutAcceder, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["stocks-materiel"],
    queryFn: fetchStocks,
    enabled: peutAcceder,
  });

  if (!peutAcceder) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={3} />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger le stock pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { mouvements, maraudes } = data;

  const totaux = CATEGORIES_BESOIN.reduce(
    (acc, categorie) => {
      acc[categorie] = mouvements
        .filter((m) => m.categorie === categorie)
        .reduce((sum, m) => sum + m.quantite, 0);
      return acc;
    },
    {} as Record<CategorieBesoin, number>,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Gestion des stocks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Matériel (couvertures, vêtements, hygiène...) — stock actuel calculé
          à partir de l&apos;historique des entrées/sorties.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CATEGORIES_BESOIN.map((categorie) => (
          <Card key={categorie} className="overflow-hidden py-0">
            <CardHeader className="gap-1 py-4">
              <CardDescription className="text-xs leading-tight">
                {CATEGORIE_BESOIN_LABELS[categorie]}
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{totaux[categorie]}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <CollapsibleSection
        title="Enregistrer un mouvement"
        description="Entrée (don reçu) ou sortie (distribué)."
        icon={PlusCircle}
      >
        <MouvementMaterielForm maraudes={maraudes} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Historique"
        description={
          mouvements.length === 0
            ? "Aucun mouvement enregistré pour l'instant."
            : `${mouvements.length} mouvement${mouvements.length > 1 ? "s" : ""} enregistré${mouvements.length > 1 ? "s" : ""}.`
        }
        icon={History}
      >
        {mouvements.length > 0 && (
          <Card>
            <CardContent className="flex flex-col divide-y divide-border py-0">
              {mouvements.map((m) => {
                const maraude = Array.isArray(m.maraude) ? m.maraude[0] : m.maraude;
                const auteur = Array.isArray(m.profil) ? m.profil[0] : m.profil;
                return (
                  <div key={m.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {CATEGORIE_BESOIN_LABELS[m.categorie]} ·{" "}
                        {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                      </span>
                      <CardDescription>
                        {new Date(m.created_at).toLocaleDateString("fr-FR")}
                        {auteur?.full_name ? ` · ${auteur.full_name}` : ""}
                        {maraude ? ` · maraude du ${new Date(maraude.date_heure).toLocaleDateString("fr-FR")}` : ""}
                      </CardDescription>
                      {m.motif && <p className="text-sm text-muted-foreground">{m.motif}</p>}
                    </div>
                    {isAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            await supprimerMouvementMateriel(m.id);
                            queryClient.invalidateQueries({ queryKey: ["stocks-materiel"] });
                          })
                        }
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </CollapsibleSection>
    </div>
  );
}
