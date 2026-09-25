"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Payload = {
  repasCount: number;
  ticketsCount: number;
  besoinsCount: number;
  checklistCoches: number;
  checklistTotal: number;
};

async function fetchLogistique(maraudeId: string): Promise<Payload> {
  const supabase = createClient();
  const [{ count: repasCount }, { count: ticketsCount }, { count: besoinsCount }, { data: checklist }] =
    await Promise.all([
      supabase.from("repas").select("id", { count: "exact", head: true }).eq("maraude_id", maraudeId),
      supabase
        .from("tickets_depense")
        .select("id", { count: "exact", head: true })
        .eq("maraude_id", maraudeId),
      supabase
        .from("besoins_signales")
        .select("id", { count: "exact", head: true })
        .eq("maraude_id", maraudeId),
      supabase.from("checklist_depart_items").select("coche").eq("maraude_id", maraudeId),
    ]);

  const checklistTotal = checklist?.length ?? 0;
  const checklistCoches = (checklist ?? []).filter((c) => c.coche).length;

  return {
    repasCount: repasCount ?? 0,
    ticketsCount: ticketsCount ?? 0,
    besoinsCount: besoinsCount ?? 0,
    checklistCoches,
    checklistTotal,
  };
}

// "Réutilise ces mêmes données existantes en lecture comme bilan" (demande
// explicite pour une maraude passée) : pas de nouveau formulaire de
// bilan/feedback — seulement des compteurs calculés à partir des tables
// déjà existantes (repas, tickets_depense, besoins_signales,
// checklist_depart_items), avec un lien vers chaque page dédiée pour le
// détail/la saisie. Même contenu affiché qu'une maraude soit à venir ou
// passée — seul le libellé ("Logistique" / "Bilan logistique") change,
// passé par le parent selon l'onglet actif.
export function LogistiqueTab({ maraudeId, estBilan }: { maraudeId: string; estBilan: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["maraude-logistique", maraudeId],
    queryFn: () => fetchLogistique(maraudeId),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {estBilan && (
        <p className="text-sm text-muted-foreground">
          Données existantes de cette maraude, en lecture seule.
        </p>
      )}
      <Button asChild variant="outline" className="justify-between">
        <Link href={`/dashboard/maraudes/${maraudeId}/repas`} prefetch={false}>
          <span>Repas</span>
          <span className="text-muted-foreground">{data.repasCount}</span>
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-between">
        <Link href={`/dashboard/maraudes/${maraudeId}/tickets`} prefetch={false}>
          <span>Tickets de dépense</span>
          <span className="text-muted-foreground">{data.ticketsCount}</span>
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-between">
        <Link href={`/dashboard/maraudes/${maraudeId}/besoins`} prefetch={false}>
          <span>Besoins signalés</span>
          <span className="text-muted-foreground">{data.besoinsCount}</span>
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-between">
        <Link href={`/dashboard/maraudes/${maraudeId}/depart`} prefetch={false}>
          <span>Checklist de départ</span>
          <span className="text-muted-foreground">
            {data.checklistCoches}/{data.checklistTotal}
          </span>
        </Link>
      </Button>
    </div>
  );
}
