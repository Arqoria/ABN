"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { FONCTIONS_MARAUDE, type FonctionMaraude } from "@/lib/fonction-maraude";
import type { RoleName } from "@/lib/roles";
import { AffectationToggle } from "./affectation-toggle";

type Inscription = {
  user_id: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
type Affectation = { user_id: string; fonction: string };
type Payload = {
  inscriptions: Inscription[];
  affectations: Affectation[];
  roleRows: { profile_id: string; role: RoleName }[];
  managerId: string | null;
  refuse: boolean;
};

// Lecture directe Supabase depuis le navigateur — RLS fait la restriction
// réelle. Voir docs/Tasks.md, "Chantier lancé, suite (16/09)".
async function fetchEquipe(maraudeId: string, profileId: string, isAdmin: boolean): Promise<Payload> {
  const supabase = createClient();

  const [{ data: maraude }, { data: inscriptions }, { data: affectations }] =
    await Promise.all([
      supabase.from("maraudes").select("id, manager_id").eq("id", maraudeId).single(),
      supabase
        .from("inscriptions_maraude")
        .select("user_id, profil:user_id(full_name)")
        .eq("maraude_id", maraudeId)
        .eq("statut", "inscrit"),
      supabase.from("affectations_maraude").select("user_id, fonction").eq("maraude_id", maraudeId),
    ]);

  if (!maraude) {
    return { inscriptions: [], affectations: [], roleRows: [], managerId: null, refuse: true };
  }

  const isOwnManager = maraude.manager_id === profileId;
  const canManageOthers = isAdmin || isOwnManager;
  const estInscrit = (inscriptions ?? []).some((i) => i.user_id === profileId);
  if (!canManageOthers && !estInscrit) {
    return { inscriptions: [], affectations: [], roleRows: [], managerId: null, refuse: true };
  }

  const participantIds = (inscriptions ?? []).map((i) => i.user_id as string);
  const { data: roleRows } = participantIds.length
    ? await supabase
        .from("profile_roles")
        .select("profile_id, role")
        .in("profile_id", participantIds)
    : { data: [] as { profile_id: string; role: RoleName }[] };

  return {
    inscriptions: inscriptions ?? [],
    affectations: affectations ?? [],
    roleRows: roleRows ?? [],
    managerId: maraude.manager_id,
    refuse: false,
  };
}

// Voir docs/Tasks.md, "Chantier lancé".
export function EquipeClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["equipe", maraudeId],
    queryFn: () => fetchEquipe(maraudeId, profile.id, isAdmin),
  });

  useEffect(() => {
    if (data?.refuse) {
      router.replace("/dashboard/maraudes");
    }
  }, [data?.refuse, router]);

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (data?.refuse) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger l&apos;équipe pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { inscriptions, affectations, roleRows, managerId } = data;
  const canManageOthers = isAdmin || managerId === profile.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Équipe de la maraude
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qui fait quoi ce soir — cuisinier et/ou maraudeur, cumul possible.
          Réservé aux profils qui détiennent déjà le rôle correspondant.
        </p>
      </div>

      {inscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun participant inscrit.
          </CardContent>
        </Card>
      ) : (
        inscriptions.map((i) => {
          const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
          const nom = p?.full_name;
          const userId = i.user_id;
          const rolesDeCeParticipant = roleRows
            .filter((r) => r.profile_id === userId)
            .map((r) => r.role);
          const peutModifier = userId === profile.id || canManageOthers;

          const badges = FONCTIONS_MARAUDE.map((fonction) => {
            const qualifie = rolesDeCeParticipant.includes(fonction);
            const assigne = affectations.some(
              (a) => a.user_id === userId && a.fonction === fonction,
            );
            if (!qualifie && !assigne) return null;
            return (
              <AffectationToggle
                key={fonction}
                maraudeId={maraudeId}
                userId={userId}
                fonction={fonction as FonctionMaraude}
                assigned={assigne}
                canToggle={peutModifier && qualifie}
              />
            );
          });

          const aucuneFonctionApplicable = badges.every((b) => b === null);

          return (
            <Card key={userId}>
              <CardHeader>
                <CardTitle>{nom ?? "(sans nom)"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {aucuneFonctionApplicable ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun rôle cuisinier/maraudeur détenu pour l&apos;instant.
                  </p>
                ) : (
                  badges
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
