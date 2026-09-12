import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MeteoAdminForm } from "./meteo-admin-form";

type Valeur = "vert" | "jaune" | "rouge";

// Réservée à Admin + Manager DE CETTE maraude (RLS l'impose de toute façon,
// cette vérification est juste pour rediriger proprement plutôt que
// d'afficher une page vide). Jamais accessible aux bénévoles eux-mêmes —
// voir docs/Specs.md.
export default async function MeteoMaraudePage({
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
    .select("id, date_heure, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    redirect("/dashboard/maraudes");
  }

  const isAdmin = profile.roles.includes("admin");
  const isOwnManager = maraude.manager_id === profile.id;
  if (!isAdmin && !isOwnManager) {
    redirect("/dashboard/maraudes");
  }

  const { data: inscriptions } = await supabase
    .from("inscriptions_maraude")
    .select("user_id, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId)
    .eq("statut", "inscrit");

  const { data: meteos } = await supabase
    .from("meteo_benevole_saisies")
    .select("user_id, valeur")
    .eq("maraude_id", maraudeId);

  const meteoMap = new Map(
    (meteos ?? []).map((m) => [m.user_id as string, m.valeur as Valeur]),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Météo bénévole
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visible uniquement par vous — jamais par les bénévoles concernés.
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

          return (
            <Card key={userId}>
              <CardHeader>
                <CardTitle>{nom ?? "(sans nom)"}</CardTitle>
                <CardDescription>
                  {meteoMap.has(userId)
                    ? "Météo déjà transmise"
                    : "Pas encore transmise"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MeteoAdminForm
                  maraudeId={maraudeId}
                  userId={userId}
                  valeur={meteoMap.get(userId)}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
