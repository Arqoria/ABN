"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { RepasForm } from "./repas-form";

type Repas = { id: string; quoi: string; quantite: number; created_at: string };
type DonPonctuel = {
  id: string;
  donateur: string;
  description: string;
  quantite: number | null;
  created_at: string;
};
type Payload = { repas: Repas[]; dons: DonPonctuel[] };

// Lecture directe Supabase depuis le navigateur — lecture large (RLS
// repas_select_authenticated, dons_ponctuels_select_authenticated). Voir
// docs/Tasks.md, "Chantier lancé, suite (16/09)". dons_ponctuels était
// visible uniquement sur /dashboard/cuisine — retour client (23/09) :
// affiché aussi ici, à côté des repas cuisinés, pour une vraie vue
// d'ensemble de ce qui sera distribué ce soir-là.
async function fetchRepasEtDons(maraudeId: string): Promise<Payload> {
  const supabase = createClient();
  const [{ data: repas }, { data: dons }] = await Promise.all([
    supabase
      .from("repas")
      .select("id, quoi, quantite, created_at")
      .eq("maraude_id", maraudeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("dons_ponctuels")
      .select("id, donateur, description, quantite, created_at")
      .eq("maraude_id", maraudeId)
      .order("created_at", { ascending: false }),
  ]);
  return { repas: repas ?? [], dons: dons ?? [] };
}

// Voir docs/Tasks.md, "Chantier lancé".
export function RepasClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["repas", maraudeId],
    queryFn: () => fetchRepasEtDons(maraudeId),
  });

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les repas pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { repas, dons } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Repas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Traçabilité des repas préparés pour cette maraude.
        </p>
      </div>

      {profile.roles.includes("cuisinier") && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un repas</CardTitle>
          </CardHeader>
          <CardContent>
            <RepasForm maraudeId={maraudeId} />
          </CardContent>
        </Card>
      )}

      {repas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun repas enregistré pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border py-0">
            {repas.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <span className="text-sm text-foreground">{r.quoi}</span>
                <CardDescription>x{r.quantite}</CardDescription>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {dons.length > 0 && (
        <div className="mt-2">
          <h2 className="text-lg font-semibold text-foreground">
            Dons reçus pour cette maraude
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repas/snacks offerts par un commerce ou un particulier — à
            ajouter aux repas cuisinés pour la vue d&apos;ensemble de ce soir.
          </p>
        </div>
      )}
      {dons.length > 0 && (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border py-0">
            {dons.map((d) => (
              <div key={d.id} className="flex flex-col gap-0.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{d.donateur}</span>
                  {d.quantite !== null && <CardDescription>x{d.quantite}</CardDescription>}
                </div>
                <span className="text-sm text-muted-foreground">{d.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
