"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { CollapsibleSection } from "@/components/collapsible-section";
import { CalendarClock, Repeat, Store } from "lucide-react";
import { TypesEvenementContent } from "./types-evenement-content";
import { SeriesContent } from "./series-content";
import { CommercantsContent } from "./commercants-content";

// Regroupe 3 pages Admin auparavant séparées (types-évènement, séries,
// commerçants) — réservée à l'Admin, seul habilité à créer/désactiver dans
// les trois cas. Voir docs/Tasks.md, Étape 10bis. Chaque section ne charge
// ses données qu'à l'ouverture (CollapsibleSection), donc visiter cette
// page ne fait aucun appel réseau tant qu'aucune section n'est ouverte.
export function ConfigurationClient() {
  const profile = useSession();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Types d&apos;événements, séries récurrentes et commerçants partenaires.
        </p>
      </div>

      <CollapsibleSection
        title="Types d'événements"
        description="Ce que couvre chaque événement (Maraude ou point fixe)."
        icon={CalendarClock}
      >
        <TypesEvenementContent />
      </CollapsibleSection>

      <CollapsibleSection
        title="Séries récurrentes"
        description="Génération automatique des occurrences, vacances scolaires."
        icon={Repeat}
      >
        <SeriesContent />
      </CollapsibleSection>

      <CollapsibleSection
        title="Commerçants partenaires"
        description="Répertoire réutilisable pour les dons ponctuels."
        icon={Store}
      >
        <CommercantsContent />
      </CollapsibleSection>
    </div>
  );
}
