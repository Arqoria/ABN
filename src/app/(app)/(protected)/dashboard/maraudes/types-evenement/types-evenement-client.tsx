"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { basculerActifTypeEvenement } from "@/lib/actions/types-evenement";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { CreerTypeEvenementForm } from "./creer-type-evenement-form";

type TypeEvenement = {
  id: string;
  nom: string;
  nature: "maraude" | "evenement_fixe";
  description: string | null;
  actif: boolean;
};

// Lecture directe Supabase depuis le navigateur — RLS
// (types_evenement_select_authenticated) fait la restriction réelle pour
// la lecture ; cette page elle-même reste réservée à l'Admin côté client
// (seul habilité à créer/désactiver). Voir docs/Tasks.md, Partie C.
async function fetchTypesEvenement(): Promise<TypeEvenement[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("types_evenement")
    .select("id, nom, nature, description, actif")
    .order("nom", { ascending: true });
  return data ?? [];
}

export function TypesEvenementClient() {
  const profile = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const isAdmin = profile.roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard/maraudes");
    }
  }, [isAdmin, router]);

  const { data: types, isLoading, isError } = useQuery({
    queryKey: ["types-evenement"],
    queryFn: fetchTypesEvenement,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !types) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les types d&apos;événements pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Types d&apos;événements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque type est rattaché à une nature fixe (Maraude ou Événement à
          point fixe). Jamais de suppression — seulement une désactivation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer un type</CardTitle>
        </CardHeader>
        <CardContent>
          <CreerTypeEvenementForm />
        </CardContent>
      </Card>

      {types.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun type d&apos;événement.
          </CardContent>
        </Card>
      ) : (
        types.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t.nom}
                  <Badge variant={t.nature === "maraude" ? "secondary" : "outline"}>
                    {t.nature === "maraude" ? "Maraude" : "Point fixe"}
                  </Badge>
                  {!t.actif && <Badge variant="destructive">Désactivé</Badge>}
                </CardTitle>
                {t.description && <CardDescription>{t.description}</CardDescription>}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  startTransition(async () => {
                    await basculerActifTypeEvenement(t.id, !t.actif);
                    queryClient.invalidateQueries({ queryKey: ["types-evenement"] });
                  })
                }
              >
                {t.actif ? "Désactiver" : "Réactiver"}
              </Button>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}
