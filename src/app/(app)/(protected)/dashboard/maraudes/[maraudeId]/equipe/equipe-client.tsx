"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  managerId: string;
};

async function fetchEquipe(maraudeId: string): Promise<Payload> {
  const res = await fetch(`/api/maraudes/${maraudeId}/equipe`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé".
export function EquipeClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["equipe", maraudeId],
    queryFn: () => fetchEquipe(maraudeId),
  });

  useEffect(() => {
    if (error instanceof Error && (error.message === "403" || error.message === "404")) {
      router.replace("/dashboard/maraudes");
    }
  }, [error, router]);

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
          Impossible de charger l&apos;équipe pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { inscriptions, affectations, roleRows, managerId } = data;
  const canManageOthers = profile.roles.includes("admin") || managerId === profile.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
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
