"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { MeteoAdminForm } from "./meteo-admin-form";

type Valeur = "vert" | "jaune" | "rouge";
type Inscription = {
  user_id: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
type Payload = {
  inscriptions: Inscription[];
  meteos: { user_id: string; valeur: Valeur }[];
  refuse: boolean;
};

// Lecture directe Supabase depuis le navigateur — réservé à Admin +
// Manager DE CETTE maraude (RLS l'impose de toute façon). Voir
// docs/Tasks.md, "Chantier lancé, suite (16/09)".
async function fetchMeteo(maraudeId: string, profileId: string, isAdmin: boolean): Promise<Payload> {
  const supabase = createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, date_heure, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return { inscriptions: [], meteos: [], refuse: true };
  }

  const isOwnManager = maraude.manager_id === profileId;
  if (!isAdmin && !isOwnManager) {
    return { inscriptions: [], meteos: [], refuse: true };
  }

  const [{ data: inscriptions }, { data: meteos }] = await Promise.all([
    supabase
      .from("inscriptions_maraude")
      .select("user_id, profil:user_id(full_name)")
      .eq("maraude_id", maraudeId)
      .eq("statut", "inscrit"),
    supabase.from("meteo_benevole_saisies").select("user_id, valeur").eq("maraude_id", maraudeId),
  ]);

  return { inscriptions: inscriptions ?? [], meteos: meteos ?? [], refuse: false };
}

// Voir docs/Tasks.md, "Chantier lancé".
export function MeteoClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["meteo", maraudeId],
    queryFn: () => fetchMeteo(maraudeId, profile.id, isAdmin),
  });

  useEffect(() => {
    if (data?.refuse) {
      router.replace("/dashboard/maraudes");
    }
  }, [data?.refuse, router]);

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (data?.refuse) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger la météo pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { inscriptions, meteos } = data;
  const meteoMap = new Map(meteos.map((m) => [m.user_id, m.valeur]));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
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
