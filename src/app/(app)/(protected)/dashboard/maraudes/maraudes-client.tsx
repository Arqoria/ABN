"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

async function fetchMaraudes(): Promise<Payload> {
  const res = await fetch("/api/maraudes");
  if (!res.ok) throw new Error("Échec du chargement des maraudes");
  return res.json();
}

// Page pilote du chantier "rapprocher ABN du pattern Probalia" (voir
// docs/Tasks.md, Diagnostic perf webapp). Plus de getCurrentProfile()
// appelé ici : l'identité vient de useSession() (contexte hydraté une fois
// par le layout serveur, voir session-provider.tsx), les données viennent
// de React Query + /api/maraudes plutôt que de bloquer le rendu de la page.
//
// Vérification de statut : faite ici côté client (pas de nouvel appel
// serveur, profile.status est déjà connu) plutôt que dans le layout partagé
// — le layout englobe aussi /compte-en-attente, y centraliser ce redirect
// créerait une boucle. Centraliser proprement est une suite possible une
// fois le pattern généralisé à plus de pages.
export function MaraudesClient() {
  const profile = useSession();
  const router = useRouter();

  useEffect(() => {
    if (profile.status !== "actif") {
      router.replace("/compte-en-attente");
    }
  }, [profile.status, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["maraudes"],
    queryFn: fetchMaraudes,
    enabled: profile.status === "actif",
  });

  if (profile.status !== "actif") {
    return null;
  }

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
          Impossible de charger les maraudes pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { managers, maraudes } = data;
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
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
                      <Link href={`/dashboard/maraudes/${maraude.id}/points`}>
                        Points de passage
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/maraudes/${maraude.id}/repas`}>
                      Repas
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/maraudes/${maraude.id}/tickets`}>
                      Tickets de dépense
                    </Link>
                  </Button>
                  {(profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/meteo`}>
                        Météo équipe
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/carte`}>
                        Carte
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    profile.roles.includes("manager")) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/besoins`}>
                        Besoins
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/equipe`}>
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
