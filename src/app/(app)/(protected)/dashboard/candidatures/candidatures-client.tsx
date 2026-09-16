"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ToggleTraitee } from "./toggle-traitee";

type Candidature = {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string | null;
  message: string | null;
  traitee: boolean;
  created_at: string;
};

// Lecture directe Supabase depuis le navigateur (RLS comme seule
// barrière) — voir docs/Tasks.md, "Chantier lancé, suite (16/09)".
async function fetchCandidatures(): Promise<Candidature[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("candidatures_benevolat")
    .select("id, nom_complet, email, telephone, message, traitee, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Voir docs/Tasks.md, "Chantier lancé".
export function CandidaturesClient() {
  const profile = useSession();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  const { data: candidatures, isLoading, isError } = useQuery({
    queryKey: ["candidatures"],
    queryFn: fetchCandidatures,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton />;
  }

  if (isError || !candidatures) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les candidatures pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Candidatures bénévoles
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soumises depuis le site vitrine public (/recrutement).
        </p>
      </div>

      {candidatures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune candidature pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        candidatures.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.nom_complet}</CardTitle>
              <CardDescription>
                {c.email}
                {c.telephone ? ` · ${c.telephone}` : ""} ·{" "}
                {new Date(c.created_at).toLocaleDateString("fr-FR")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {c.message && <p className="text-sm text-foreground">{c.message}</p>}
              <div>
                <ToggleTraitee id={c.id} traitee={c.traitee} />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
