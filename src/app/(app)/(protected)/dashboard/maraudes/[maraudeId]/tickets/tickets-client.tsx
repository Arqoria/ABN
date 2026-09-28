"use client";

import { useState } from "react";
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
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

// Bloc "Tickets de dépense" de l'onglet Logistique (refonte 28/09) :
// récapitulatif des montants (RLS : chacun ne voit que ses tickets, Admin
// voit tout) + saisie dans un tiroir pour ne pas alourdir la page.
export function TicketsBloc({ maraudeId }: { maraudeId: string }) {
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", maraudeId],
    queryFn: () => fetchTickets(maraudeId),
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Impossible de charger les tickets.</p>;
  }

  const { tickets, urlByPath } = data;
  const total = tickets.reduce((s, t) => s + Number(t.montant), 0);
  const enAttente = tickets
    .filter((t) => t.statut_remboursement !== "rembourse")
    .reduce((s, t) => s + Number(t.montant), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-brand-pastel px-3 py-2 text-brand-navy dark:bg-brand-navy/40 dark:text-white">
          <p className="text-2xl font-bold">{total.toFixed(2)} €</p>
          <p className="text-xs">{tickets.length} ticket(s)</p>
        </div>
        <div className="rounded-lg bg-brand-pastel px-3 py-2 text-brand-navy dark:bg-brand-navy/40 dark:text-white">
          <p className="text-2xl font-bold">{enAttente.toFixed(2)} €</p>
          <p className="text-xs">en attente de remboursement</p>
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {tickets.map((t) => {
            const url = urlByPath[t.photo_path];
            return (
              <div key={t.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {Number(t.montant).toFixed(2)} €
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {CATEGORIE_LABELS[t.categorie]}
                    {url && (
                      <>
                        {" · "}
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-blue underline-offset-4 hover:underline"
                        >
                          photo
                        </a>
                      </>
                    )}
                  </span>
                </div>
                <Badge variant={t.statut_remboursement === "rembourse" ? "default" : "secondary"}>
                  {STATUT_LABELS[t.statut_remboursement] ?? t.statut_remboursement}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={tiroirOuvert} onOpenChange={setTiroirOuvert}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="h-12">
            + Ajouter un ticket
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau ticket de dépense</DialogTitle>
            <DialogDescription>
              Photo du ticket de caisse pour remboursement par le Trésorier.
            </DialogDescription>
          </DialogHeader>
          <TicketForm maraudeId={maraudeId} onSuccess={() => setTiroirOuvert(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Voir docs/Tasks.md, "Chantier lancé".
export function TicketsClient() {
  useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tickets", maraudeId],
    queryFn: () => fetchTickets(maraudeId),
  });

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les tickets pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { tickets, urlByPath } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
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
