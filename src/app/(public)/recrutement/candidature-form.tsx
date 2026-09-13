"use client";

import { useActionState } from "react";
import { soumettreCandidature } from "@/lib/actions/candidatures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CandidatureForm() {
  const [state, action, pending] = useActionState(soumettreCandidature, undefined);

  if (state && "success" in state) {
    return (
      <p className="text-center text-sm text-foreground">
        Merci ! Votre candidature a bien été envoyée, nous revenons vers vous
        rapidement.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Honeypot anti-bot : invisible pour un visiteur humain (masqué en CSS,
          jamais en display:none, que certains bots ignorent), jamais rempli
          par une vraie personne. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="site">Ne pas remplir</label>
        <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="nomComplet">Nom complet</Label>
        <Input id="nomComplet" name="nomComplet" required className="h-12" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required className="h-12" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="telephone">Téléphone (facultatif)</Label>
        <Input id="telephone" name="telephone" type="tel" className="h-12" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="message">Message (motivation, disponibilités...)</Label>
        <Textarea id="message" name="message" rows={4} />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Envoi…" : "Envoyer ma candidature"}
      </Button>
    </form>
  );
}
