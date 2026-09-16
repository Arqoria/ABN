"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { supprimerDonPonctuel, supprimerMouvementDenree } from "@/lib/actions/stocks";
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
import { Gift, Carrot } from "lucide-react";
import { DonPonctuelForm } from "./don-ponctuel-form";
import { MouvementDenreeForm } from "./mouvement-denree-form";

type Don = {
  id: string;
  donateur: string;
  description: string;
  quantite: number | null;
  created_at: string;
  maraude: { date_heure: string } | { date_heure: string }[] | null;
};
type MouvementDenree = {
  id: string;
  nom: string;
  unite: string | null;
  quantite: number;
  motif: string | null;
  created_at: string;
  maraude: { date_heure: string } | { date_heure: string }[] | null;
};
type Payload = {
  dons: Don[];
  mouvementsDenrees: MouvementDenree[];
  maraudes: { id: string; date_heure: string }[];
};

// Lecture directe Supabase depuis le navigateur — RLS
// (dons_ponctuels_select_authenticated, stock_denrees_select_authenticated)
// fait toute la restriction réelle pour la lecture. Voir docs/Tasks.md,
// "Chantier lancé" (17/09).
async function fetchCuisine(): Promise<Payload> {
  const supabase = createClient();

  const [{ data: dons }, { data: mouvementsDenrees }, { data: maraudes }] = await Promise.all([
    supabase
      .from("dons_ponctuels")
      .select("id, donateur, description, quantite, created_at, maraude:maraude_id(date_heure)")
      .order("created_at", { ascending: false }),
    supabase
      .from("stock_denrees_mouvements")
      .select("id, nom, unite, quantite, motif, created_at, maraude:maraude_id(date_heure)")
      .order("created_at", { ascending: false }),
    supabase
      .from("maraudes")
      .select("id, date_heure")
      .order("date_heure", { ascending: false })
      .limit(50),
  ]);

  return { dons: dons ?? [], mouvementsDenrees: mouvementsDenrees ?? [], maraudes: maraudes ?? [] };
}

// Voir docs/Tasks.md, "Chantier lancé" (17/09). Réservée à Admin, Manager ou
// Cuisinier (même liste que les policies RLS d'écriture) — la vraie
// barrière reste RLS sur dons_ponctuels/stock_denrees_mouvements.
export function CuisineClient() {
  const profile = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const isAdmin = profile.roles.includes("admin");
  const peutAcceder =
    isAdmin || profile.roles.includes("manager") || profile.roles.includes("cuisinier");

  useEffect(() => {
    if (!peutAcceder) {
      router.replace("/dashboard");
    }
  }, [peutAcceder, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cuisine"],
    queryFn: fetchCuisine,
    enabled: peutAcceder,
  });

  if (!peutAcceder) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les données de cuisine pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { dons, mouvementsDenrees, maraudes } = data;

  const totauxDenrees = new Map<string, { nom: string; unite: string | null; total: number }>();
  for (const m of mouvementsDenrees) {
    const cle = `${m.nom}|${m.unite ?? ""}`;
    const existant = totauxDenrees.get(cle);
    if (existant) {
      existant.total += m.quantite;
    } else {
      totauxDenrees.set(cle, { nom: m.nom, unite: m.unite, total: m.quantite });
    }
  }
  const totauxDenreesListe = Array.from(totauxDenrees.values()).sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr"),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Gestion des cuisines
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dons ponctuels de repas/snacks et stock de denrées alimentaires.
        </p>
      </div>

      <CollapsibleSection
        title="Dons ponctuels"
        description="Un commerce ou un particulier offre à manger pour une maraude — évite qu'un Cuisinier prépare un repas en double sans le savoir."
        icon={Gift}
      >
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Enregistrer un don</CardTitle>
            </CardHeader>
            <CardContent>
              <DonPonctuelForm maraudes={maraudes} />
            </CardContent>
          </Card>

          {dons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Aucun don ponctuel enregistré pour l&apos;instant.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col divide-y divide-border py-0">
                {dons.map((d) => {
                  const maraude = Array.isArray(d.maraude) ? d.maraude[0] : d.maraude;
                  return (
                    <div key={d.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {d.donateur} — {d.description}
                          {d.quantite ? ` (${d.quantite})` : ""}
                        </span>
                        <CardDescription>
                          {maraude
                            ? `Maraude du ${new Date(maraude.date_heure).toLocaleDateString("fr-FR")}`
                            : ""}
                        </CardDescription>
                      </div>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            startTransition(async () => {
                              await supprimerDonPonctuel(d.id);
                              queryClient.invalidateQueries({ queryKey: ["cuisine"] });
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
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Stock de denrées"
        description="Riz, conserves, eau... — stock actuel calculé à partir de l'historique des entrées/sorties."
        icon={Carrot}
      >
        <div className="flex flex-col gap-4">
          {totauxDenreesListe.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {totauxDenreesListe.map((t) => (
                <Card key={`${t.nom}|${t.unite ?? ""}`} className="overflow-hidden py-0">
                  <CardHeader className="gap-1 py-4">
                    <CardDescription className="text-xs leading-tight">
                      {t.nom}
                      {t.unite ? ` (${t.unite})` : ""}
                    </CardDescription>
                    <CardTitle className="text-2xl sm:text-3xl">{t.total}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Enregistrer un mouvement</CardTitle>
            </CardHeader>
            <CardContent>
              <MouvementDenreeForm maraudes={maraudes} />
            </CardContent>
          </Card>

          {mouvementsDenrees.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Aucun mouvement enregistré pour l&apos;instant.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col divide-y divide-border py-0">
                {mouvementsDenrees.map((m) => {
                  const maraude = Array.isArray(m.maraude) ? m.maraude[0] : m.maraude;
                  return (
                    <div key={m.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {m.nom}
                          {m.unite ? ` (${m.unite})` : ""} ·{" "}
                          {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                        </span>
                        <CardDescription>
                          {new Date(m.created_at).toLocaleDateString("fr-FR")}
                          {maraude
                            ? ` · maraude du ${new Date(maraude.date_heure).toLocaleDateString("fr-FR")}`
                            : ""}
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
                              await supprimerMouvementDenree(m.id);
                              queryClient.invalidateQueries({ queryKey: ["cuisine"] });
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
        </div>
      </CollapsibleSection>
    </div>
  );
}
