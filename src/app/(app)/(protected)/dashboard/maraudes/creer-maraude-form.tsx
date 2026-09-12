"use client";

import { useActionState } from "react";
import { creerMaraude } from "@/lib/actions/maraudes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreerMaraudeForm({
  managers,
}: {
  managers: { id: string; full_name: string | null }[];
}) {
  const [state, action, pending] = useActionState(creerMaraude, undefined);

  if (managers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun Manager actif disponible — valide d&apos;abord un compte avec le
        rôle Manager (
        <a href="/dashboard/comptes" className="underline underline-offset-4">
          Comptes en attente
        </a>
        ) avant de pouvoir créer une maraude.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="dateHeure">Date et heure</Label>
        <Input
          id="dateHeure"
          name="dateHeure"
          type="datetime-local"
          required
          className="h-12"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="managerId">Manager</Label>
        <Select name="managerId" required>
          <SelectTrigger id="managerId" className="h-12 w-full">
            <SelectValue placeholder="Choisir un manager" />
          </SelectTrigger>
          <SelectContent>
            {managers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name ?? "(sans nom)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Création…" : "Créer"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
