"use client";

import { useActionState } from "react";
import { saisirMeteo } from "@/lib/actions/meteo";
import { Button } from "@/components/ui/button";

type Valeur = "vert" | "jaune" | "rouge";

const OPTIONS: { value: Valeur; label: string }[] = [
  { value: "vert", label: "🟢 Ça va" },
  { value: "jaune", label: "🟡 Moyen" },
  { value: "rouge", label: "🔴 Difficile" },
];

// Admin/Manager peuvent saisir ET corriger (RLS l'autorise pour eux
// uniquement) — d'où la valeur actuelle mise en avant visuellement.
export function MeteoAdminForm({
  maraudeId,
  userId,
  valeur,
}: {
  maraudeId: string;
  userId: string;
  valeur?: Valeur;
}) {
  const [state, action, pending] = useActionState(saisirMeteo, undefined);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <form action={action} key={o.value}>
            <input type="hidden" name="maraudeId" value={maraudeId} />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="valeur" value={o.value} />
            <Button
              type="submit"
              variant={valeur === o.value ? "default" : "outline"}
              size="sm"
              disabled={pending}
            >
              {o.label}
            </Button>
          </form>
        ))}
      </div>
      {state?.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}
