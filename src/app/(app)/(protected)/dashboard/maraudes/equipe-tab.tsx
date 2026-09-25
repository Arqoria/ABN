"use client";

import { useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { saisirMeteo } from "@/lib/actions/meteo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FONCTIONS_MARAUDE, type FonctionMaraude } from "@/lib/fonction-maraude";
import type { RoleName } from "@/lib/roles";
import { AffectationToggle } from "./[maraudeId]/equipe/affectation-toggle";

type Inscription = {
  user_id: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
type Affectation = { user_id: string; fonction: string };
type Meteo = { user_id: string; valeur: "vert" | "jaune" | "rouge" };
type Payload = {
  inscriptions: Inscription[];
  affectations: Affectation[];
  roleRows: { profile_id: string; role: RoleName }[];
  meteos: Meteo[];
  refuse: boolean;
};

function invalidateKey(maraudeId: string) {
  return ["maraude-equipe-tab", maraudeId];
}

// Fusionne le contenu de l'ancienne page /equipe (roster + affectations) et
// de l'ancienne page /meteo (saisie Admin/Manager) dans un seul sous-onglet
// — deux ajouts explicitement demandés : bouton d'appel (retiré, aucun
// champ téléphone n'existe — voir docs/Tasks.md) et météo saisie par le
// Manager/Admin pour toute l'équipe au même endroit (plus de self-service,
// RLS déjà corrigée côté base). Les pages dédiées /equipe et /meteo restent
// intactes et fonctionnelles par ailleurs (non supprimées, simplement plus
// liées depuis la liste des maraudes).
async function fetchEquipeTab(
  maraudeId: string,
  profileId: string,
  isAdmin: boolean,
  isOwnManager: boolean,
): Promise<Payload> {
  const supabase = createClient();

  const { data: inscriptions } = await supabase
    .from("inscriptions_maraude")
    .select("user_id, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId)
    .eq("statut", "inscrit");

  const estInscrit = (inscriptions ?? []).some((i) => i.user_id === profileId);
  const canManageOthers = isAdmin || isOwnManager;

  if (!canManageOthers && !estInscrit) {
    return { inscriptions: [], affectations: [], roleRows: [], meteos: [], refuse: true };
  }

  const participantIds = (inscriptions ?? []).map((i) => i.user_id as string);

  const [{ data: affectations }, { data: roleRows }, { data: meteos }] = await Promise.all([
    supabase.from("affectations_maraude").select("user_id, fonction").eq("maraude_id", maraudeId),
    participantIds.length
      ? supabase.from("profile_roles").select("profile_id, role").in("profile_id", participantIds)
      : Promise.resolve({ data: [] as { profile_id: string; role: RoleName }[] }),
    // RLS (meteo_admin_or_own_manager_select) ne renvoie des lignes qu'à
    // Admin/Manager de cette maraude — vide pour un simple inscrit, ce qui
    // masque naturellement le sélecteur météo pour lui plus bas.
    supabase.from("meteo_benevole_saisies").select("user_id, valeur").eq("maraude_id", maraudeId),
  ]);

  return {
    inscriptions: inscriptions ?? [],
    affectations: affectations ?? [],
    roleRows: roleRows ?? [],
    meteos: (meteos ?? []) as Meteo[],
    refuse: false,
  };
}

const METEO_OPTIONS: { value: "vert" | "jaune" | "rouge"; label: string }[] = [
  { value: "vert", label: "🟢" },
  { value: "jaune", label: "🟡" },
  { value: "rouge", label: "🔴" },
];

function MeteoSelector({
  maraudeId,
  userId,
  valeur,
}: {
  maraudeId: string;
  userId: string;
  valeur?: "vert" | "jaune" | "rouge";
}) {
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function choisir(v: "vert" | "jaune" | "rouge") {
    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    formData.set("userId", userId);
    formData.set("valeur", v);
    startTransition(async () => {
      await saisirMeteo(undefined, formData);
      queryClient.invalidateQueries({ queryKey: invalidateKey(maraudeId) });
    });
  }

  return (
    <div className="flex gap-1">
      {METEO_OPTIONS.map((o) => (
        <Button
          key={o.value}
          type="button"
          size="sm"
          variant={valeur === o.value ? "default" : "outline"}
          disabled={pending}
          onClick={() => choisir(o.value)}
          aria-label={o.value}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export function EquipeTab({
  maraudeId,
  profileId,
  isAdmin,
  isOwnManager,
}: {
  maraudeId: string;
  profileId: string;
  isAdmin: boolean;
  isOwnManager: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: invalidateKey(maraudeId),
    queryFn: () => fetchEquipeTab(maraudeId, profileId, isAdmin, isOwnManager),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (data.refuse) {
    return (
      <p className="text-sm text-muted-foreground">
        Vous n&apos;avez pas accès à l&apos;équipe de cette maraude.
      </p>
    );
  }

  const { inscriptions, affectations, roleRows, meteos } = data;
  const canManageOthers = isAdmin || isOwnManager;
  const meteoMap = new Map(meteos.map((m) => [m.user_id, m.valeur]));

  if (inscriptions.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun participant inscrit.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {inscriptions.map((i) => {
        const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
        const nom = p?.full_name;
        const userId = i.user_id;
        const rolesDeCeParticipant = roleRows
          .filter((r) => r.profile_id === userId)
          .map((r) => r.role);
        const peutModifierAffectation = userId === profileId || canManageOthers;

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
              canToggle={peutModifierAffectation && qualifie}
              invalidateKey={invalidateKey(maraudeId)}
            />
          );
        });
        const aucuneFonctionApplicable = badges.every((b) => b === null);

        return (
          <Card key={userId}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-base">{nom ?? "(sans nom)"}</CardTitle>
              {canManageOthers && (
                <MeteoSelector maraudeId={maraudeId} userId={userId} valeur={meteoMap.get(userId)} />
              )}
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
      })}
    </div>
  );
}
