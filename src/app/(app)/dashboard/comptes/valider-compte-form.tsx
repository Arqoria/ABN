"use client";

import { useActionState } from "react";
import { validerCompte } from "@/lib/actions/comptes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "maraudeur", label: "Maraudeur" },
  { value: "cuisinier", label: "Cuisinier" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
] as const;

export function ValiderCompteForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(validerCompte, undefined);

  return (
    <form
      action={action}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="userId" value={userId} />
      {/* Select name="role" : Radix Select.Root rend un <select> natif caché
          pour participer à la soumission de formulaire — pas besoin de
          gérer la valeur manuellement en React. */}
      <Select name="role" defaultValue="maraudeur" required>
        <SelectTrigger className="h-12 w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Validation…" : "Valider le compte"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
