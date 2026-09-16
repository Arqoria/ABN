"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MeteoAdminForm } from "./meteo-admin-form";

type Valeur = "vert" | "jaune" | "rouge";
type Inscription = {
  user_id: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
type Payload = {
  inscriptions: Inscription[];
  meteos: { user_id: string; valeur: Valeur }[];
};

async function fetchMeteo(maraudeId: string): Promise<Payload> {
  const res = await fetch(`/api/maraudes/${maraudeId}/meteo`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé".
export function MeteoClient() {
  useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["meteo", maraudeId],
    queryFn: () => fetchMeteo(maraudeId),
  });

  useEffect(() => {
    if (error instanceof Error && (error.message === "403" || error.message === "404")) {
      router.replace("/dashboard/maraudes");
    }
  }, [error, router]);

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
          Impossible de charger la météo pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { inscriptions, meteos } = data;
  const meteoMap = new Map(meteos.map((m) => [m.user_id, m.valeur]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Météo bénévole</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visible uniquement par vous — jamais par les bénévoles concernés.
        </p>
      </div>

      {inscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun participant inscrit.
          </CardContent>
        </Card>
      ) : (
        inscriptions.map((i) => {
          const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
          const nom = p?.full_name;
          const userId = i.user_id;

          return (
            <Card key={userId}>
              <CardHeader>
                <CardTitle>{nom ?? "(sans nom)"}</CardTitle>
                <CardDescription>
                  {meteoMap.has(userId) ? "Météo déjà transmise" : "Pas encore transmise"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MeteoAdminForm
                  maraudeId={maraudeId}
                  userId={userId}
                  valeur={meteoMap.get(userId)}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
