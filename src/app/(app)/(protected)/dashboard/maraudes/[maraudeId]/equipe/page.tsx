import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FONCTIONS_MARAUDE, type FonctionMaraude } from "@/lib/fonction-maraude";
import type { RoleName } from "@/lib/roles";
import { AffectationToggle } from "./affectation-toggle";

// RLS (affectations_maraude_select_...) fait déjà la restriction réelle :
// Admin, Manager de CETTE maraude, ou participant inscrit. Le garde-fou
// ci-dessous n'est qu'une redirection propre. Qui fait quoi ce soir —
// cuisinier et/ou maraudeur, cumul possible (retour utilisateur, 13/09) — le
// rôle global (profile_roles) reste le garde-fou de qualification, vérifié
// côté serveur par le trigger check_affectation_maraude_qualification quel
// que soit qui fait l'affectation.
export default async function EquipeMaraudePage({
  params,
}: {
  params: Promise<{ maraudeId: string }>;
}) {
  const { maraudeId } = await params;
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  const supabase = await createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    redirect("/dashboard/maraudes");
  }

  const isAdmin = profile.roles.includes("admin");
  const isOwnManager = maraude.manager_id === profile.id;
  const canManageOthers = isAdmin || isOwnManager;

  const { data: inscriptions } = await supabase
    .from("inscriptions_maraude")
    .select("user_id, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId)
    .eq("statut", "inscrit");

  const estInscrit = (inscriptions ?? []).some((i) => i.user_id === profile.id);
  if (!canManageOthers && !estInscrit) {
    redirect("/dashboard/maraudes");
  }

  const participantIds = (inscriptions ?? []).map((i) => i.user_id as string);

  const { data: roleRows } = participantIds.length
    ? await supabase
        .from("profile_roles")
        .select("profile_id, role")
        .in("profile_id", participantIds)
    : { data: [] as { profile_id: string; role: RoleName }[] };

  const { data: affectations } = await supabase
    .from("affectations_maraude")
    .select("user_id, fonction")
    .eq("maraude_id", maraudeId);

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

      {!inscriptions || inscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun participant inscrit.
          </CardContent>
        </Card>
      ) : (
        inscriptions.map((i) => {
          const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
          const nom = (p as { full_name: string | null } | null)?.full_name;
          const userId = i.user_id as string;
          const rolesDeCeParticipant = (roleRows ?? [])
            .filter((r) => r.profile_id === userId)
            .map((r) => r.role as RoleName);
          const peutModifier = userId === profile.id || canManageOthers;

          const badges = FONCTIONS_MARAUDE.map((fonction) => {
            const qualifie = rolesDeCeParticipant.includes(fonction);
            const assigne = (affectations ?? []).some(
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
