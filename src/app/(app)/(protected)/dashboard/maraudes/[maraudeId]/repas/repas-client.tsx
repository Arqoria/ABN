"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RepasForm } from "./repas-form";

type Repas = { id: string; quoi: string; quantite: number; created_at: string };

async function fetchRepas(maraudeId: string): Promise<{ repas: Repas[] }> {
  const res = await fetch(`/api/maraudes/${maraudeId}/repas`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé".
export function RepasClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["repas", maraudeId],
    queryFn: () => fetchRepas(maraudeId),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les repas pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { repas } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
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
