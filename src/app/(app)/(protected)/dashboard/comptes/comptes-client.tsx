"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import type { RoleName } from "@/lib/roles";
import type { FonctionBureau } from "@/lib/fonction-bureau";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ValiderCompteForm } from "./valider-compte-form";
import { BureauForm } from "./bureau-form";

type Payload = {
  comptesEnAttente: { id: string; full_name: string | null; created_at: string }[];
  roleRows: { profile_id: string; role: RoleName }[];
  admins: { id: string; full_name: string | null; fonction_bureau: FonctionBureau | null }[];
};

async function fetchComptes(): Promise<Payload> {
  const res = await fetch("/api/comptes");
  if (!res.ok) throw new Error("Échec du chargement des comptes");
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé". Réservée aux Admins : la
// vérification de rôle est faite ici côté client (redirect si pas admin) —
// spécifique à cette page, pas partagée comme le statut (dashboard/layout.tsx).
// La vraie barrière reste le 403 côté serveur dans /api/comptes.
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
          Impossible de charger les comptes pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { comptesEnAttente, roleRows, admins } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
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
