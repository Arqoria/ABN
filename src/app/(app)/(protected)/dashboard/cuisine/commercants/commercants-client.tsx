"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { basculerActifCommercant } from "@/lib/actions/commercants";
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
import { CreerCommercantForm } from "./creer-commercant-form";
import { ModifierCommercantForm } from "./modifier-commercant-form";

type Commercant = {
  id: string;
  nom: string;
  notes: string | null;
  actif: boolean;
};

// Lecture directe Supabase — RLS
// (commercants_partenaires_select_authenticated) fait la restriction
// réelle pour la lecture ; cette page reste réservée à l'Admin côté
// client (seul habilité à créer/modifier/désactiver). Voir docs/Tasks.md.
async function fetchCommercants(): Promise<Commercant[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercants_partenaires")
    .select("id, nom, notes, actif")
    .order("nom", { ascending: true });
  return data ?? [];
}

export function CommercantsClient() {
  const profile = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const isAdmin = profile.roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard/cuisine");
    }
  }, [isAdmin, router]);

  const { data: commercants, isLoading, isError } = useQuery({
    queryKey: ["commercants"],
    queryFn: fetchCommercants,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !commercants) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les commerçants pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Commerçants partenaires</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Répertoire réutilisable pour les dons ponctuels — jamais de
          suppression, seulement une désactivation (n&apos;affecte pas
          l&apos;historique des dons déjà enregistrés).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer un commerçant</CardTitle>
        </CardHeader>
        <CardContent>
          <CreerCommercantForm />
        </CardContent>
      </Card>

      {commercants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun commerçant pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        commercants.map((c) => (
          <Card key={c.id}>
            {enEdition === c.id ? (
              <CardContent className="pt-6">
                <ModifierCommercantForm
                  id={c.id}
                  nomActuel={c.nom}
                  notesActuelles={c.notes}
                  onTermine={() => setEnEdition(null)}
                />
              </CardContent>
            ) : (
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {c.nom}
                    {!c.actif && <Badge variant="destructive">Désactivé</Badge>}
                  </CardTitle>
                  {c.notes && <CardDescription>{c.notes}</CardDescription>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setEnEdition(c.id)}>
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startTransition(async () => {
                        await basculerActifCommercant(c.id, !c.actif);
                        queryClient.invalidateQueries({ queryKey: ["commercants"] });
                      })
                    }
                  >
                    {c.actif ? "Désactiver" : "Réactiver"}
                  </Button>
                </div>
              </CardHeader>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
