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

// Lecture directe Supabase depuis le navigateur (RLS comme seule barrière,
// comme pour tout le reste de cette page) — pas de Route Handler
// intermédiaire pour une simple lecture, voir docs/Tasks.md, "Chantier
// lancé, suite (16/09)".
async function fetchComptesEnAttenteCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "en_attente");
  return count ?? 0;
}

// Page d'accueil du dashboard — voir docs/Tasks.md, "Chantier lancé".
// Identité via useSession(), seul le compteur "comptes en attente" (Admin
// uniquement) vient d'un fetch réseau (React Query).
//
// prefetch={false} sur les liens ci-dessous : nos pages dashboard sont
// maintenant des coquilles client légères, le préchargement n'apporte
// plus grand-chose, alors qu'il déclenche le middleware (rafraîchissement
// de session) inutilement à chaque page visible à l'écran — en cause
// dans un cas de déconnexion malgré "Se souvenir de moi" (16/09).
export function DashboardHomeClient() {
  const profile = useSession();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: fetchComptesEnAttenteCount,
    enabled: profile.roles.includes("admin"),
  });
  const comptesEnAttenteCount = data ?? 0;

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
              <Link href="/dashboard/comptes" prefetch={false}>Gérer les comptes</Link>
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
            <Link href="/dashboard/maraudes" prefetch={false}>Voir les maraudes</Link>
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
              <Link href="/dashboard/rapports" prefetch={false}>Voir les rapports</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
