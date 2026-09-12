"use client";

import { useActionState } from "react";
import { validerCompte } from "@/lib/actions/comptes";
import { ROLE_LABELS, type RoleName } from "@/lib/supabase/dal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const ROLES: RoleName[] = [
  "adherent",
  "donateur",
  "maraudeur",
  "cuisinier",
  "manager",
  "admin",
];

export function ValiderCompteForm({
  userId,
  defaultRoles = [],
}: {
  userId: string;
  defaultRoles?: RoleName[];
}) {
  const [state, action, pending] = useActionState(validerCompte, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      {/* Checkbox name="roles" : Radix rend un input caché par case, formData
          .getAll("roles") renvoie toutes les valeurs cochées — pas besoin
          d'état React manuel. */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ROLES.map((role) => (
          <div key={role} className="flex items-center gap-2">
            <Checkbox
              id={`${userId}-${role}`}
              name="roles"
              value={role}
              defaultChecked={defaultRoles.includes(role)}
            />
            <Label htmlFor={`${userId}-${role}`}>{ROLE_LABELS[role]}</Label>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Validation…" : "Valider le compte"}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
