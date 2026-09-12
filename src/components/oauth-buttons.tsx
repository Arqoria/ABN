"use client";

import { useActionState } from "react";
import { loginWithOAuth } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const PROVIDERS = [
  { value: "google", label: "Google" },
  { value: "azure", label: "Microsoft" },
  { value: "facebook", label: "Facebook" },
] as const;

// Partagé entre /login et /signup — Supabase traite connexion et inscription
// via OAuth de façon identique (compte créé automatiquement au premier
// passage, avec le rôle 'adherent' comme un compte email/mot de passe, via
// handle_new_user). Ne fonctionnera qu'une fois chaque fournisseur activé et
// configuré dans le Dashboard Supabase (Authentication → Providers) — ça ne
// dépend pas que du code, voir docs/Tasks.md.
export function OAuthButtons() {
  const [state, action, pending] = useActionState(loginWithOAuth, undefined);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ou</span>
        <Separator className="flex-1" />
      </div>
      {PROVIDERS.map((p) => (
        <form action={action} key={p.value}>
          <input type="hidden" name="provider" value={p.value} />
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            className="h-12 w-full"
          >
            Continuer avec {p.label}
          </Button>
        </form>
      ))}
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
