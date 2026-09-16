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

// Lecture directe Supabase depuis le navigateur — lecture large (RLS
// repas_select_authenticated). Voir docs/Tasks.md, "Chantier lancé, suite
// (16/09)".
async function fetchRepas(maraudeId: string): Promise<Repas[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("repas")
    .select("id, quoi, quantite, created_at")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Voir docs/Tasks.md, "Chantier lancé".
export function RepasClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();

  const { data: repas, isLoading, isError } = useQuery({
    queryKey: ["repas", maraudeId],
    queryFn: () => fetchRepas(maraudeId),
  });

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !repas) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les repas pour l&apos;instant.
        </p>
      </div>
    );
  }

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
    </div>
  );
}
