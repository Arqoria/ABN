"use client";

import { useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
// la lecture. Le garde-fou Admin (seul habilité à créer/désactiver) vit
// désormais une seule fois au niveau de /dashboard/configuration, qui
// englobe ce contenu. Voir docs/Tasks.md, Étape 10bis (migration depuis
// l'ancienne page /dashboard/maraudes/types-evenement).
async function fetchTypesEvenement(): Promise<TypeEvenement[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("types_evenement")
    .select("id, nom, nature, description, actif")
    .order("nom", { ascending: true });
  return data ?? [];
}

// Ne récupère ses données qu'à l'ouverture de la section (CollapsibleSection
// ne monte ses enfants que si elle est ouverte) — pas de coût réseau tant
// que l'Admin ne clique pas dessus.
export function TypesEvenementContent() {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  const { data: types, isLoading, isError } = useQuery({
    queryKey: ["types-evenement"],
    queryFn: fetchTypesEvenement,
  });

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !types) {
    return (
      <p className="text-sm text-muted-foreground">
        Impossible de charger les types d&apos;événements pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Chaque type est rattaché à une nature fixe (Maraude ou Événement à
        point fixe). Jamais de suppression — seulement une désactivation.
      </p>

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
