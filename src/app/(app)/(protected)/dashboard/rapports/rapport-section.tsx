"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Section repliable pour regrouper Rapports & KPIs par catégorie (voir
// docs/Tasks.md, Étape 10bis) — plus de "tout en vrac" au même niveau
// visuel. `children` n'est monté QUE si la section est ouverte (pas juste
// masqué en CSS) : les sections fermées par défaut ne payent le coût de
// rendu (Leaflet pour Terrain, notamment) qu'à l'ouverture, pas au
// premier affichage.
//
// Toutes fermées par défaut (retour client, 16/09) : sinon on retombe
// sur le même problème visuel qu'avant ("tout en vrac"), juste avec des
// intitulés en plus. Le pictogramme sert justement à identifier chaque
// section même repliée, sans avoir à ouvrir pour savoir ce qu'elle
// contient.
export function RapportSection({
  title,
  description,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
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
        <CardHeader className="flex flex-1 flex-row items-start gap-3 space-y-0">
          <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <ChevronDown
          className={`mt-6 mr-6 size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </Card>
  );
}
