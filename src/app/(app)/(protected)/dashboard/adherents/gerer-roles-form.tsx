"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { modifierRoles } from "@/lib/actions/comptes";
import { ROLE_LABELS, type RoleName } from "@/lib/roles";
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

// isSelf : désactive la case "Admin" pour l'Admin connecté — évite de se
// retirer soi-même son propre accès par erreur (le serveur applique la
// même règle, voir modifierRoles dans lib/actions/comptes.ts).
export function GererRolesForm({
  userId,
  defaultRoles,
  isSelf,
}: {
  userId: string;
  defaultRoles: RoleName[];
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(modifierRoles, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["adherents"] });
    }
  }, [state, queryClient]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ROLES.map((role) => {
          const lockedAdmin = isSelf && role === "admin";
          return (
            <div key={role} className="flex items-center gap-2">
              {/* Un input desactive n'est pas soumis avec le formulaire —
                  on force donc "admin" via un champ caché à part pour
                  garantir qu'il reste dans formData côté serveur, en plus
                  de la vérification faite là-bas (modifierRoles). */}
              {lockedAdmin && <input type="hidden" name="roles" value="admin" />}
              <Checkbox
                id={`${userId}-${role}`}
                name="roles"
                value={role}
                defaultChecked={defaultRoles.includes(role)}
                disabled={lockedAdmin}
              />
              <Label htmlFor={`${userId}-${role}`}>{ROLE_LABELS[role]}</Label>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Enregistrement…" : "Enregistrer les rôles"}
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
