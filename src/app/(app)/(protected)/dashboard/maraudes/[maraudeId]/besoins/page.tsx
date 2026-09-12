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
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";
import { BesoinForm } from "./besoin-form";

// RLS (besoins_signales_select_admin_manager_ou_participant) fait déjà toute
// la restriction : Admin, tout Manager (planification d'achats à l'échelle
// de l'association, comme la heatmap), ou participant inscrit à CETTE
// maraude. Le garde-fou ci-dessous n'est qu'une redirection propre, pas une
// barrière de sécurité.
export default async function BesoinsMaraudePage({
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

  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  if (!isAdminOrManager) {
    const { data: inscription } = await supabase
      .from("inscriptions_maraude")
      .select("statut")
      .eq("maraude_id", maraudeId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (inscription?.statut !== "inscrit") {
      redirect("/dashboard/maraudes");
    }
  }

  const { data: besoins } = await supabase
    .from("besoins_signales")
    .select("id, categorie, commentaire, created_at, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Besoins signalés
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manque de couvertures, vêtements, hygiène... aide le Trésorier à
          ajuster les prochains achats.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signaler un besoin</CardTitle>
        </CardHeader>
        <CardContent>
          <BesoinForm maraudeId={maraudeId} />
        </CardContent>
      </Card>

      {!besoins || besoins.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun besoin signalé pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border py-0">
            {besoins.map((b) => {
              const p = Array.isArray(b.profil) ? b.profil[0] : b.profil;
              const nom = (p as { full_name: string | null } | null)?.full_name;
              return (
                <div key={b.id as string} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {CATEGORIE_BESOIN_LABELS[b.categorie as CategorieBesoin]}
                    </span>
                    <CardDescription>
                      {new Date(b.created_at as string).toLocaleDateString("fr-FR")}
                      {nom ? ` · ${nom}` : ""}
                    </CardDescription>
                  </div>
                  {b.commentaire && (
                    <p className="text-sm text-muted-foreground">
                      {b.commentaire as string}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
