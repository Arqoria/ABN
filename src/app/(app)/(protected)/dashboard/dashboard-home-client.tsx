"use client";

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

async function fetchSummary(): Promise<{ comptesEnAttenteCount: number }> {
  const res = await fetch("/api/dashboard-summary");
  if (!res.ok) throw new Error("Échec du chargement du résumé");
  return res.json();
}

// Page d'accueil du dashboard — voir docs/Tasks.md, "Chantier lancé".
// Identité via useSession(), seul le compteur "comptes en attente" (Admin
// uniquement) vient d'un fetch réseau (React Query).
export function DashboardHomeClient() {
  const profile = useSession();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchSummary,
    enabled: profile.roles.includes("admin"),
  });
  const comptesEnAttenteCount = data?.comptesEnAttenteCount ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Bienvenue, {profile.full_name ?? "bénévole"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tableau de bord — d&apos;autres fonctionnalités arrivent
          prochainement.
        </p>
      </div>

      {profile.roles.includes("admin") && (
        <Card>
          <CardHeader>
            <CardTitle>Comptes en attente de validation</CardTitle>
            <CardDescription>
              {comptesEnAttenteCount === 0
                ? "Aucun compte en attente."
                : `${comptesEnAttenteCount} compte${comptesEnAttenteCount > 1 ? "s" : ""} à valider.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/comptes">Gérer les comptes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdminOrManager ? "Gestion des maraudes" : "Mes maraudes"}
          </CardTitle>
          <CardDescription>
            {isAdminOrManager
              ? "Créer une maraude, suivre les inscriptions."
              : "S'inscrire à une maraude, voir la liste d'attente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/maraudes">Voir les maraudes</Link>
          </Button>
        </CardContent>
      </Card>

      {isAdminOrManager && (
        <Card>
          <CardHeader>
            <CardTitle>Rapports &amp; KPIs</CardTitle>
            <CardDescription>
              Compteurs agrégés (repas distribués, personnes aidées,
              orientations sociales).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/rapports">Voir les rapports</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
