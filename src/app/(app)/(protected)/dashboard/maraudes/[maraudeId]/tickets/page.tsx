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
import { Badge } from "@/components/ui/badge";
import { TicketForm } from "./ticket-form";

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  rembourse: "Remboursé",
};

// RLS (Étape 5) : chacun ne voit que ses propres tickets, Admin voit tout —
// cette page n'affiche donc jamais que ce que la base autorise déjà.
export default async function TicketsMaraudePage({
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

  const { data: tickets } = await supabase
    .from("tickets_depense")
    .select("id, montant, photo_path, statut_remboursement, created_at")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  const paths = (tickets ?? []).map((t) => t.photo_path as string);
  const { data: signedUrls } = paths.length
    ? await supabase.storage.from("tickets-depense").createSignedUrls(paths, 60 * 5)
    : { data: [] as { path: string | null; signedUrl: string }[] };

  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((s) => s.path)
      .map((s) => [s.path as string, s.signedUrl]),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Tickets de dépense
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Photo du ticket de caisse pour remboursement par le Trésorier.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Envoyer un ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketForm maraudeId={maraudeId} />
        </CardContent>
      </Card>

      {!tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun ticket envoyé pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        tickets.map((t) => {
          const url = urlByPath.get(t.photo_path as string);
          const statut = t.statut_remboursement as string;

          return (
            <Card key={t.id as string}>
              <CardHeader>
                <CardTitle>{(t.montant as number).toFixed(2)} €</CardTitle>
                <CardDescription>
                  {new Date(t.created_at as string).toLocaleDateString("fr-FR")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={statut === "rembourse" ? "default" : "secondary"}>
                  {STATUT_LABELS[statut] ?? statut}
                </Badge>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Voir la photo
                  </a>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
