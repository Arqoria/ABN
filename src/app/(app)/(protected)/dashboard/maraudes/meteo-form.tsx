"use client";

import { useActionState } from "react";
import { saisirMeteo } from "@/lib/actions/meteo";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "vert", label: "🟢 Ça va" },
  { value: "jaune", label: "🟡 Moyen" },
  { value: "rouge", label: "🔴 Difficile" },
] as const;

// Auto-déclaration en fin de maraude — une seule fois (contrainte unique en
// base). Volontairement AUCUN affichage de la valeur transmise : le bénévole
// ne doit jamais pouvoir relire sa propre météo (voir docs/Specs.md).
export function MeteoForm({
  maraudeId,
  userId,
}: {
  maraudeId: string;
  userId: string;
}) {
  const [state, action, pending] = useActionState(saisirMeteo, undefined);

  if (state?.status === "success") {
    return (
      <p className="text-sm text-muted-foreground">Météo transmise, merci.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Comment ça s&apos;est passé pour vous, ce soir ?
      </p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <form action={action} key={o.value}>
            <input type="hidden" name="maraudeId" value={maraudeId} />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="valeur" value={o.value} />
            <Button type="submit" variant="outline" size="sm" disabled={pending}>
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
