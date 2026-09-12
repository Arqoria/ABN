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
import { CreerMaraudeForm } from "./creer-maraude-form";
import { InscriptionForm } from "./inscription-form";

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

  const { data: maraudes } = await supabase
    .from("maraudes")
    .select("id, date_heure, statut, manager:manager_id(full_name)")
    .order("date_heure", { ascending: true });

  const maraudeIds = (maraudes ?? []).map((m) => m.id as string);

  const { data: inscriptions } = maraudeIds.length
    ? await supabase
        .from("inscriptions_maraude")
        .select("id, maraude_id, user_id, statut")
        .in("maraude_id", maraudeIds)
    : { data: [] as Inscription[] };

  const isAdminOrManager = profile.role === "admin" || profile.role === "manager";

  let managers: { id: string; full_name: string | null }[] = [];
  if (isAdminOrManager) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "manager")
      .eq("status", "actif");
    managers = data ?? [];
  }

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
          const mesInscriptions = (inscriptions ?? []) as Inscription[];
          const inscritsCount = mesInscriptions.filter(
            (i) => i.maraude_id === maraude.id && i.statut === "inscrit",
          ).length;
          const listeAttenteCount = mesInscriptions.filter(
            (i) => i.maraude_id === maraude.id && i.statut === "liste_attente",
          ).length;
          const mine = mesInscriptions.find(
            (i) => i.maraude_id === maraude.id && i.user_id === profile.id,
          );
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
              <CardContent>
                <InscriptionForm
                  maraudeId={maraude.id as string}
                  inscriptionId={mine?.id}
                  statut={mine?.statut}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
