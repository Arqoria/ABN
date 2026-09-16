"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORIE_LABELS, type CategorieDepense } from "@/lib/categorie-depense";
import { TicketForm } from "./ticket-form";

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  rembourse: "Remboursé",
};

type Ticket = {
  id: string;
  montant: number;
  categorie: CategorieDepense;
  photo_path: string;
  statut_remboursement: string;
  created_at: string;
};
type Payload = { tickets: Ticket[]; urlByPath: Record<string, string> };

// Lecture directe Supabase depuis le navigateur — RLS (chacun ne voit que
// ses propres tickets, Admin voit tout). Voir docs/Tasks.md, "Chantier
// lancé, suite (16/09)".
async function fetchTickets(maraudeId: string): Promise<Payload> {
  const supabase = createClient();
  const { data: tickets } = await supabase
    .from("tickets_depense")
    .select("id, montant, categorie, photo_path, statut_remboursement, created_at")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  const paths = (tickets ?? []).map((t) => t.photo_path as string);
  const { data: signedUrls } = paths.length
    ? await supabase.storage.from("tickets-depense").createSignedUrls(paths, 60 * 5)
    : { data: [] as { path: string | null; signedUrl: string }[] };

  const urlByPath = Object.fromEntries(
    (signedUrls ?? [])
      .filter((s): s is { path: string; signedUrl: string } => !!s.path && !!s.signedUrl)
      .map((s) => [s.path, s.signedUrl]),
  );

  return { tickets: tickets ?? [], urlByPath };
}

// Voir docs/Tasks.md, "Chantier lancé".
export function TicketsClient() {
  useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", maraudeId],
    queryFn: () => fetchTickets(maraudeId),
  });

  if (isLoading || isError || !data) {
    return null;
  }

  const { tickets, urlByPath } = data;

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

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun ticket envoyé pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        tickets.map((t) => {
          const url = urlByPath[t.photo_path];
          const statut = t.statut_remboursement;

          return (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.montant.toFixed(2)} €</CardTitle>
                <CardDescription>
                  {CATEGORIE_LABELS[t.categorie]} ·{" "}
                  {new Date(t.created_at).toLocaleDateString("fr-FR")}
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
