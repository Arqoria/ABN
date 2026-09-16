"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { validerCompte } from "@/lib/actions/comptes";
import { ROLE_LABELS, type RoleName } from "@/lib/roles";
import { FONCTION_BUREAU_LABELS, type FonctionBureau } from "@/lib/fonction-bureau";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FONCTIONS_BUREAU: FonctionBureau[] = ["president", "tresorier", "secretaire"];

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
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);

  // La donnée vient maintenant de React Query (voir comptes-client.tsx) —
  // revalidatePath() côté serveur (dans l'action) ne suffit plus à
  // rafraîchir l'affichage, il faut invalider la query explicitement.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["comptes"] });
    }
  }, [state, queryClient]);

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
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${userId}-fonction`}>
          Fonction bureau (facultatif, purement informatif)
        </Label>
        <Select name="fonctionBureau">
          <SelectTrigger id={`${userId}-fonction`} className="h-12 w-full sm:w-64">
            <SelectValue placeholder="Aucune" />
          </SelectTrigger>
          <SelectContent>
            {FONCTIONS_BUREAU.map((f) => (
              <SelectItem key={f} value={f}>
                {FONCTION_BUREAU_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
