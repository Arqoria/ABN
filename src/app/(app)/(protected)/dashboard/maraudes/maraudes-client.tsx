"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { offlineDb } from "@/lib/offline/db";
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
import type { RoleName } from "@/lib/roles";

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

const CACHE_KEY = "maraudes";

// EXPÉRIMENTAL (15/09) — preuve de concept "cache local en lecture" sur
// cette seule page, pour mesurer l'effet réel avant d'investir dans le
// chantier complet (voir docs/Tasks.md). Stale-while-revalidate simple :
// affiche immédiatement le cache local s'il existe (rendu instantané, sans
// attendre le réseau), puis va chercher les données fraîches en fond et met
// à jour l'affichage + le cache quand elles arrivent. Pas de résolution de
// conflit fine, pas de détection d'obsolescence avancée — juste pour tester
// l'hypothèse, pas encore la version "propre" à généraliser.
export function MaraudesClient({
  profileId,
  roles,
}: {
  profileId: string;
  roles: RoleName[];
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFromCacheThenNetwork() {
      const cached = await offlineDb.pageCache.get(CACHE_KEY);
      if (cached && !cancelled) {
        setData(JSON.parse(cached.data) as Payload);
        setFromCache(true);
        setLoading(false);
      }

      try {
        const res = await fetch("/api/maraudes");
        if (!res.ok) return;
        const fresh = (await res.json()) as Payload;
        if (cancelled) return;
        setData(fresh);
        setFromCache(false);
        setLoading(false);
        await offlineDb.pageCache.put({
          key: CACHE_KEY,
          data: JSON.stringify(fresh),
          updatedAt: Date.now(),
        });
      } catch {
        // Hors ligne ou erreur réseau : on reste sur le cache s'il y en a
        // un, sinon la page affiche l'état "chargement" indéfiniment (pas
        // de gestion d'erreur soignée pour cette preuve de concept).
        if (!cached) setLoading(false);
      }
    }

    void loadFromCacheThenNetwork();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les maraudes pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { managers, maraudes } = data;
  const isAdminOrManager = roles.includes("admin") || roles.includes("manager");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Maraudes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Équipe max 6 personnes par maraude, liste d&apos;attente automatique
          au-delà.
          {fromCache && " (données en cache, mise à jour en cours…)"}
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
          const mine = mesInscriptions.find((i) => i.user_id === profileId);
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
                  <MeteoForm maraudeId={maraude.id} userId={profileId} />
                )}
                <div className="flex flex-wrap gap-2">
                  {(mine?.statut === "inscrit" ||
                    roles.includes("admin") ||
                    maraude.manager_id === profileId) && (
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
                  {(roles.includes("admin") ||
                    maraude.manager_id === profileId) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/meteo`}>
                        Météo équipe
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    roles.includes("admin") ||
                    maraude.manager_id === profileId) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/carte`}>
                        Carte
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    roles.includes("admin") ||
                    roles.includes("manager")) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/besoins`}>
                        Besoins
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    roles.includes("admin") ||
                    maraude.manager_id === profileId) && (
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
