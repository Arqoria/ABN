import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreerMaraudeForm } from "./creer-maraude-form";
import { InscriptionForm } from "./inscription-form";
import { MeteoForm } from "./meteo-form";

type Inscription = {
  id: string;
  maraude_id: string;
  user_id: string;
  statut: "inscrit" | "liste_attente" | "desiste";
};

// Liste les maraudes, permet de s'inscrire/se désister (logique de capacité
// et liste d'attente entièrement gérée en base, voir
// src/lib/actions/maraudes.ts). Admin/Manager peuvent en plus créer une
// maraude — nécessite au moins un Manager actif (voir CreerMaraudeForm).
export default async function MaraudesPage() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  const supabase = await createClient();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  // Perf (15/09, retour client "toujours lent" même après le 1er passage de
  // parallélisation) : mesuré en conditions réelles sur cette page précise —
  // 1,2 à 1,6s de TTFB, la pire de tout le dashboard. Chaque branche
  // ci-dessous faisait encore 2 requêtes séquentielles ; fusionnées en 1 via
  // l'embed PostgREST (testé en direct avant de committer, comme pour
  // dal.ts). Managers : `!inner` pour filtrer sur profiles.status au passage
  // (sinon on récupère aussi les comptes Manager désactivés).
  async function chargerManagers() {
    if (!isAdminOrManager) return [] as { id: string; full_name: string | null }[];

    const { data } = await supabase
      .from("profile_roles")
      .select("profiles!profile_roles_profile_id_fkey!inner(id, full_name, status)")
      .eq("role", "manager")
      .eq("profiles.status", "actif");

    return (data ?? []).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return p as { id: string; full_name: string | null };
    });
  }

  async function chargerMaraudesAvecInscriptions() {
    const { data } = await supabase
      .from("maraudes")
      .select(
        "id, date_heure, statut, manager_id, manager:manager_id(full_name), inscriptions_maraude(id, maraude_id, user_id, statut)",
      )
      .order("date_heure", { ascending: true });
    return data ?? [];
  }

  const [managers, maraudes] = await Promise.all([
    chargerManagers(),
    chargerMaraudesAvecInscriptions(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Maraudes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Équipe max 6 personnes par maraude, liste d&apos;attente automatique
          au-delà.
        </p>
      </div>

      {isAdminOrManager && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une maraude</CardTitle>
          </CardHeader>
          <CardContent>
            <CreerMaraudeForm managers={managers} />
          </CardContent>
        </Card>
      )}

      {!maraudes || maraudes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune maraude planifiée.
          </CardContent>
        </Card>
      ) : (
        maraudes.map((maraude) => {
          // inscriptions_maraude arrive déjà filtré sur CETTE maraude via
          // l'embed PostgREST — plus besoin de filtrer côté client par
          // maraude_id comme avant.
          const mesInscriptions = (maraude.inscriptions_maraude ?? []) as Inscription[];
          const inscritsCount = mesInscriptions.filter(
            (i) => i.statut === "inscrit",
          ).length;
          const listeAttenteCount = mesInscriptions.filter(
            (i) => i.statut === "liste_attente",
          ).length;
          const mine = mesInscriptions.find((i) => i.user_id === profile.id);
          const managerRow = Array.isArray(maraude.manager)
            ? maraude.manager[0]
            : maraude.manager;
          const manager = managerRow as { full_name: string | null } | null;

          return (
            <Card key={maraude.id as string}>
              <CardHeader>
                <CardTitle>
                  {new Date(maraude.date_heure as string).toLocaleString(
                    "fr-FR",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </CardTitle>
                <CardDescription>
                  {inscritsCount}/6 inscrits
                  {listeAttenteCount > 0
                    ? ` · ${listeAttenteCount} en liste d'attente`
                    : ""}
                  {" · "}Manager : {manager?.full_name ?? "—"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <InscriptionForm
                  maraudeId={maraude.id as string}
                  inscriptionId={mine?.id}
                  statut={mine?.statut}
                />
                {mine?.statut === "inscrit" && (
                  <MeteoForm
                    maraudeId={maraude.id as string}
                    userId={profile.id}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/points`}>
                        Points de passage
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/maraudes/${maraude.id}/repas`}>
                      Repas
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/maraudes/${maraude.id}/tickets`}>
                      Tickets de dépense
                    </Link>
                  </Button>
                  {(profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/meteo`}>
                        Météo équipe
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/carte`}>
                        Carte
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    profile.roles.includes("manager")) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/besoins`}>
                        Besoins
                      </Link>
                    </Button>
                  )}
                  {(mine?.statut === "inscrit" ||
                    profile.roles.includes("admin") ||
                    maraude.manager_id === profile.id) && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/maraudes/${maraude.id}/equipe`}>
                        Équipe
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
