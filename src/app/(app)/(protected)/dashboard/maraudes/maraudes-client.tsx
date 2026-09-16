"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { CreerMaraudeForm } from "./creer-maraude-form";
import { InscriptionForm } from "./inscription-form";
import { MeteoForm } from "./meteo-form";

type Inscription = {
  id: string;
  maraude_id: string;
  user_id: string;
  statut: "inscrit" | "liste_attente" | "desiste";
};

type Manager = { id: string; full_name: string | null };

type Maraude = {
  id: string;
  date_heure: string;
  statut: string;
  manager_id: string;
  manager: { full_name: string | null } | { full_name: string | null }[] | null;
  inscriptions_maraude: Inscription[];
};

type Payload = { managers: Manager[]; maraudes: Maraude[] };

// Lecture directe Supabase depuis le navigateur (RLS comme seule
// barrière) — voir docs/Tasks.md, "Chantier lancé, suite (16/09)".
async function fetchMaraudes(isAdminOrManager: boolean): Promise<Payload> {
  const supabase = createClient();

  async function chargerManagers() {
    if (!isAdminOrManager) return [] as Manager[];
    const { data } = await supabase
      .from("profile_roles")
      .select("profiles!profile_roles_profile_id_fkey!inner(id, full_name, status)")
      .eq("role", "manager")
      .eq("profiles.status", "actif");

    return (data ?? []).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return p as Manager;
    });
  }

  async function chargerMaraudesAvecInscriptions() {
    const { data } = await supabase
      .from("maraudes")
      .select(
        "id, date_heure, statut, manager_id, manager:manager_id(full_name), inscriptions_maraude(id, maraude_id, user_id, statut)",
      )
      .order("date_heure", { ascending: true });
    return (data ?? []) as unknown as Maraude[];
  }

  const [managers, maraudes] = await Promise.all([
    chargerManagers(),
    chargerMaraudesAvecInscriptions(),
  ]);

  return { managers, maraudes };
}

// Page pilote du chantier "rapprocher ABN du pattern Probalia" (voir
// docs/Tasks.md, Diagnostic perf webapp). Plus de getCurrentProfile()
// appelé ici : l'identité vient de useSession() (contexte hydraté une fois
// par le layout serveur, voir session-provider.tsx).
//
// Vérification de statut : centralisée dans dashboard/layout.tsx (redirect
// serveur si pas "actif") — plus besoin de la refaire ici.
//
// prefetch={false} sur les liens d'action ci-dessous (jusqu'à 7 par
// maraude affichée) : le préchargement déclenche le middleware
// (rafraîchissement de session) pour chaque lien visible à l'écran, sans
// bénéfice réel sur nos pages client désormais légères — en cause dans
// un cas de déconnexion malgré "Se souvenir de moi" (16/09, voir
// docs/Tasks.md).
export function MaraudesClient() {
  const profile = useSession();
  const isAdminOrManagerForQuery =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maraudes", isAdminOrManagerForQuery],
    queryFn: () => fetchMaraudes(isAdminOrManagerForQuery),
  });

  if (isLoading) {
    return <CardListSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les maraudes pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { managers, maraudes } = data;
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Maraudes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Équipe max 6 personnes par maraude, liste d&apos;attente automatique
          au-delà.
        </p>
      </div>

      {isAdminOrManager && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une maraude</CardTitle>
          </CardHeader>
          <CardContent>
            <CreerMaraudeForm managers={managers} />
          </CardContent>
        </Card>
      )}

      {!maraudes || maraudes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune maraude planifiée.
          </CardContent>
        </Card>
      ) : (
        maraudes.map((maraude) => {
          const mesInscriptions = maraude.inscriptions_maraude ?? [];
          const inscritsCount = mesInscriptions.filter(
            (i) => i.statut === "inscrit",
          ).length;
          const listeAttenteCount = mesInscriptions.filter(
            (i) => i.statut === "liste_attente",
          ).length;
          const mine = mesInscriptions.find((i) => i.user_id === profile.id);
          const managerRow = Array.isArray(maraude.manager)
            ? maraude.manager[0]
            : maraude.manager;

          return (
            <Card key={maraude.id}>
              <CardHeader>
                <CardTitle>
                  {new Date(maraude.date_heure).toLocaleString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </CardTitle>
                <CardDescription>
                  {inscritsCount}/6 inscrits
                  {listeAttenteCount > 0
                    ? ` · ${listeAttenteCount} en liste d'attente`
                    : ""}
                  {" · "}Manager : {managerRow?.full_name ?? "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <InscriptionForm
                  maraudeId={maraude.id}
                  inscriptionId={mine?.id}
                  statut={mine?.statut}
                />
                {mine?.statut === "inscrit" && (
                  <MeteoForm maraudeId={maraude.id} userId={profile.id} />
                )}
                <div className="flex flex-wrap gap-2">
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/points`} prefetch={false}>
                        Points de passage
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/maraudes/${maraude.id}/repas`} prefetch={false}>
                      Repas
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/maraudes/${maraude.id}/tickets`} prefetch={false}>
                      Tickets de dépense
                    </Link>
                  </Button>
                  {(profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/meteo`} prefetch={false}>
                        Météo équipe
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/carte`} prefetch={false}>
                        Carte
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    profile.roles.includes("manager")) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/besoins`} prefetch={false}>
                        Besoins
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/equipe`} prefetch={false}>
                        Équipe
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
