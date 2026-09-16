"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Section repliable pour regrouper Rapports & KPIs par catégorie (voir
// docs/Tasks.md, Étape 10bis) — plus de "tout en vrac" au même niveau
// visuel. `children` n'est monté QUE si la section est ouverte (pas juste
// masqué en CSS) : les sections fermées par défaut (Terrain, la plus
// lourde — carte + jusqu'à 5000 points) ne payent le coût de rendu
// (Leaflet, graphiques) qu'à l'ouverture, pas au premier affichage.
export function RapportSection({
  title,
  description,
  defaultOpen = true,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <CardHeader className="flex-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <ChevronDown
          className={`mt-6 mr-6 size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </Card>
  );
}
