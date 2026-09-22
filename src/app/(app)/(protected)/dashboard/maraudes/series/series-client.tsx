"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { basculerActifSerie } from "@/lib/actions/series-evenements";
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

type Serie = {
  id: string;
  frequence: "hebdomadaire" | "toutes_les_2_semaines" | "mensuelle_nieme_jour";
  jour_semaine: number;
  nieme_semaine_du_mois: number | null;
  heure: string;
  date_fin: string | null;
  limiter_aux_vacances_scolaires: boolean;
  actif: boolean;
  type_evenement: { nom: string } | { nom: string }[] | null;
  manager: { full_name: string | null } | { full_name: string | null }[] | null;
};

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const NIEME_LABELS: Record<number, string> = { 1: "1ère", 2: "2ème", 3: "3ème", 4: "4ème", "-1": "dernière" };

function decrireFrequence(s: Serie): string {
  const jour = JOURS[s.jour_semaine];
  if (s.frequence === "hebdomadaire") return `Toutes les semaines, ${jour}`;
  if (s.frequence === "toutes_les_2_semaines") return `Toutes les 2 semaines, ${jour}`;
  const nieme = s.nieme_semaine_du_mois !== null ? NIEME_LABELS[s.nieme_semaine_du_mois] : "?";
  return `Chaque mois, ${nieme} ${jour}`;
}

// Lecture directe Supabase — RLS (series_evenements_select_authenticated)
// fait la restriction réelle ; page réservée à l'Admin côté client (seul
// habilité à désactiver). Voir docs/Tasks.md, Partie C.
async function fetchSeries(): Promise<Serie[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("series_evenements")
    .select(
      "id, frequence, jour_semaine, nieme_semaine_du_mois, heure, date_fin, limiter_aux_vacances_scolaires, actif, type_evenement:type_evenement_id(nom), manager:manager_id_defaut(full_name)",
    )
    .order("actif", { ascending: false });
  return data ?? [];
}

export function SeriesClient() {
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

  const { data: series, isLoading, isError } = useQuery({
    queryKey: ["series-evenements"],
    queryFn: fetchSeries,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !series) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les séries pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Séries récurrentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Désactiver une série arrête la génération future, sans toucher aux
          occurrences déjà créées.
        </p>
      </div>

      {series.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune série récurrente pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        series.map((s) => {
          const type = Array.isArray(s.type_evenement) ? s.type_evenement[0] : s.type_evenement;
          const manager = Array.isArray(s.manager) ? s.manager[0] : s.manager;
          return (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {type?.nom ?? "(type inconnu)"}
                    {!s.actif && <Badge variant="destructive">Désactivée</Badge>}
                    {s.limiter_aux_vacances_scolaires && <Badge variant="outline">Vacances scolaires</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {decrireFrequence(s)} à {s.heure.slice(0, 5)} · Manager par défaut :{" "}
                    {manager?.full_name ?? "—"}
                    {s.date_fin ? ` · jusqu'au ${new Date(s.date_fin).toLocaleDateString("fr-FR")}` : ""}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    startTransition(async () => {
                      await basculerActifSerie(s.id, !s.actif);
                      queryClient.invalidateQueries({ queryKey: ["series-evenements"] });
                    })
                  }
                >
                  {s.actif ? "Désactiver" : "Réactiver"}
                </Button>
              </CardHeader>
            </Card>
          );
        })
      )}
    </div>
  );
}
