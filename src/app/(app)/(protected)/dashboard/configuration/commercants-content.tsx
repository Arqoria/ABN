"use client";

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
// réelle. Le garde-fou Admin vit désormais une seule fois au niveau de
// /dashboard/configuration. Voir docs/Tasks.md, Étape 10bis (migration
// depuis l'ancienne page /dashboard/cuisine/commercants).
async function fetchCommercants(): Promise<Commercant[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("commercants_partenaires")
    .select("id, nom, notes, actif")
    .order("nom", { ascending: true });
  return data ?? [];
}

export function CommercantsContent() {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [enEdition, setEnEdition] = useState<string | null>(null);

  const { data: commercants, isLoading, isError } = useQuery({
    queryKey: ["commercants"],
    queryFn: fetchCommercants,
  });

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !commercants) {
    return (
      <p className="text-sm text-muted-foreground">
        Impossible de charger les commerçants pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Jamais de suppression, seulement une désactivation (n&apos;affecte
        pas l&apos;historique des dons déjà enregistrés).
      </p>

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
