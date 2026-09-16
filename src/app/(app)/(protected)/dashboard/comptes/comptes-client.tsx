"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import type { RoleName } from "@/lib/roles";
import type { FonctionBureau } from "@/lib/fonction-bureau";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { ValiderCompteForm } from "./valider-compte-form";
import { BureauForm } from "./bureau-form";

type Payload = {
  comptesEnAttente: { id: string; full_name: string | null; created_at: string }[];
  roleRows: { profile_id: string; role: RoleName }[];
  admins: { id: string; full_name: string | null; fonction_bureau: FonctionBureau | null }[];
};

// Lecture directe Supabase depuis le navigateur (RLS comme seule
// barrière) — voir docs/Tasks.md, "Chantier lancé, suite (16/09)".
async function fetchComptes(): Promise<Payload> {
  const supabase = createClient();

  async function chargerComptesEnAttente() {
    const { data: comptesEnAttente } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("status", "en_attente")
      .order("created_at", { ascending: true });

    const compteIds = (comptesEnAttente ?? []).map((c) => c.id as string);
    const { data: roleRows } = compteIds.length
      ? await supabase
          .from("profile_roles")
          .select("profile_id, role")
          .in("profile_id", compteIds)
      : { data: [] as { profile_id: string; role: RoleName }[] };

    return { comptesEnAttente: comptesEnAttente ?? [], roleRows: roleRows ?? [] };
  }

  async function chargerAdmins() {
    const { data: adminRoleRows } = await supabase
      .from("profile_roles")
      .select("profile_id")
      .eq("role", "admin");
    const adminIds = (adminRoleRows ?? []).map((r) => r.profile_id as string);
    if (!adminIds.length) {
      return [] as { id: string; full_name: string | null; fonction_bureau: FonctionBureau | null }[];
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, fonction_bureau")
      .in("id", adminIds)
      .eq("status", "actif")
      .order("full_name", { ascending: true });
    return data ?? [];
  }

  const [{ comptesEnAttente, roleRows }, admins] = await Promise.all([
    chargerComptesEnAttente(),
    chargerAdmins(),
  ]);

  return { comptesEnAttente, roleRows, admins };
}

// Voir docs/Tasks.md, "Chantier lancé". Réservée aux Admins : la
// vérification de rôle est faite ici côté client (redirect si pas admin).
// La vraie barrière reste RLS sur chaque table interrogée ci-dessus.
export function ComptesClient() {
  const profile = useSession();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["comptes"],
    queryFn: fetchComptes,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les comptes pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { comptesEnAttente, roleRows, admins } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Comptes en attente de validation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assignez un ou plusieurs rôles à chaque nouveau bénévole pour
          activer son compte.
        </p>
      </div>

      {comptesEnAttente.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun compte en attente.
          </CardContent>
        </Card>
      ) : (
        comptesEnAttente.map((compte) => {
          const defaultRoles = roleRows
            .filter((r) => r.profile_id === compte.id)
            .map((r) => r.role);

          return (
            <Card key={compte.id}>
              <CardHeader>
                <CardTitle>{compte.full_name ?? "(sans nom)"}</CardTitle>
                <CardDescription>
                  Inscrit le{" "}
                  {new Date(compte.created_at).toLocaleDateString("fr-FR")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ValiderCompteForm userId={compte.id} defaultRoles={defaultRoles} />
              </CardContent>
            </Card>
          );
        })
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-foreground">Bureau</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fonction purement informative (affichage) — n&apos;importe quel
          Admin garde un accès complet, quelle que soit sa fonction.
        </p>
      </div>

      {admins.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun Admin actif.
          </CardContent>
        </Card>
      ) : (
        admins.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle>{a.full_name ?? "(sans nom)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <BureauForm userId={a.id} fonctionActuelle={a.fonction_bureau} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
