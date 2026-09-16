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
import { CollapsibleSection } from "@/components/collapsible-section";
import { UserPlus, Inbox, Briefcase } from "lucide-react";
import { ValiderCompteForm } from "./valider-compte-form";
import { BureauForm } from "./bureau-form";
import { ToggleTraitee } from "./toggle-traitee";

type Candidature = {
  id: string;
  nom_complet: string;
  email: string;
  telephone: string | null;
  message: string | null;
  traitee: boolean;
  created_at: string;
};
type Payload = {
  comptesEnAttente: { id: string; full_name: string | null; created_at: string }[];
  roleRows: { profile_id: string; role: RoleName }[];
  admins: { id: string; full_name: string | null; fonction_bureau: FonctionBureau | null }[];
  candidatures: Candidature[];
};

// Lecture directe Supabase depuis le navigateur (RLS comme seule
// barrière) — voir docs/Tasks.md, "Chantier lancé, suite (16/09)". Fusion
// des anciennes pages /dashboard/comptes et /dashboard/candidatures en une
// seule "Gestion des adhérents" (17/09) : mêmes requêtes qu'avant, toutes
// lancées en parallèle plutôt que page par page.
async function fetchAdherents(): Promise<Payload> {
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

  async function chargerCandidatures() {
    const { data } = await supabase
      .from("candidatures_benevolat")
      .select("id, nom_complet, email, telephone, message, traitee, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  }

  const [{ comptesEnAttente, roleRows }, admins, candidatures] = await Promise.all([
    chargerComptesEnAttente(),
    chargerAdmins(),
    chargerCandidatures(),
  ]);

  return { comptesEnAttente, roleRows, admins, candidatures };
}

// Voir docs/Tasks.md, "Chantier lancé". Réservée aux Admins : la
// vérification de rôle est faite ici côté client (redirect si pas admin).
// La vraie barrière reste RLS sur chaque table interrogée ci-dessus.
//
// Regroupe ce qui était avant 2 pages séparées ("Comptes en attente" et
// "Candidatures", toutes deux accessibles depuis la barre bleue en haut de
// chaque page) sous une seule page "Gestion des adhérents" (retour client,
// 17/09) : la barre du haut reste dédiée à la navigation stable
// (accueil, menu compte), le reste vit dans les pages elles-mêmes.
export function AdherentsClient() {
  const profile = useSession();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["adherents"],
    queryFn: fetchAdherents,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return <CardListSkeleton rows={3} />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les adhérents pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { comptesEnAttente, roleRows, admins, candidatures } = data;
  const candidaturesNonTraitees = candidatures.filter((c) => !c.traitee).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Gestion des adhérents
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comptes à valider, candidatures bénévoles et fonctions du bureau.
        </p>
      </div>

      <CollapsibleSection
        title="Comptes en attente"
        description={
          comptesEnAttente.length === 0
            ? "Aucun compte en attente."
            : `${comptesEnAttente.length} compte${comptesEnAttente.length > 1 ? "s" : ""} à valider.`
        }
        icon={UserPlus}
      >
        <div className="flex flex-col gap-4">
          {comptesEnAttente.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun compte en attente.
            </p>
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
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Candidatures"
        description={
          candidaturesNonTraitees === 0
            ? "Aucune candidature en attente de traitement."
            : `${candidaturesNonTraitees} candidature${candidaturesNonTraitees > 1 ? "s" : ""} à traiter.`
        }
        icon={Inbox}
      >
        <div className="flex flex-col gap-4">
          {candidatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune candidature pour l&apos;instant.
            </p>
          ) : (
            candidatures.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle>{c.nom_complet}</CardTitle>
                  <CardDescription>
                    {c.email}
                    {c.telephone ? ` · ${c.telephone}` : ""} ·{" "}
                    {new Date(c.created_at).toLocaleDateString("fr-FR")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {c.message && <p className="text-sm text-foreground">{c.message}</p>}
                  <div>
                    <ToggleTraitee id={c.id} traitee={c.traitee} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Bureau"
        description="Fonction purement informative — n'importe quel Admin garde un accès complet, quelle que soit sa fonction."
        icon={Briefcase}
      >
        <div className="flex flex-col gap-4">
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun Admin actif.</p>
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
      </CollapsibleSection>
    </div>
  );
}
