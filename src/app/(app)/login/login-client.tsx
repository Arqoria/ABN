"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { REMEMBERED_EMAIL_KEY } from "@/lib/supabase/remember-me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { OAuthButtons } from "@/components/oauth-buttons";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Formulaire proprement dit — le contrôle "déjà connecté ? redirect" est
// fait par page.tsx (Server Component), avant que ce composant ne
// s'affiche. Voir page.tsx.
export function LoginClient() {
  const [state, action, pending] = useActionState(login, undefined);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);

  // Préremplit l'email si "Se souvenir de moi" avait été coché la dernière
  // fois — bug remonté par l'utilisateur : le cookie abn-remember-me ne
  // contrôle que la durée de la session, jamais l'email affiché au retour.
  // useEffect (pas de valeur initiale directe) pour éviter un mismatch
  // d'hydratation SSR : le serveur ne connaît jamais le localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      // Navigation privée ou stockage bloqué — tant pis, champ vide comme
      // avant ce correctif.
    }
  }, []);

  function handleSubmit() {
    try {
      if (remember && email) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } catch {
      // Sans conséquence : juste un confort, la connexion continue quand
      // même via l'action du formulaire.
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-16">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Accédez à votre espace bénévole.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-12"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                name="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              <Label htmlFor="remember" className="font-normal">
                Se souvenir de moi
              </Label>
            </div>
            {state?.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="h-12">
              {pending ? "Connexion…" : "Se connecter"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                S&apos;inscrire
              </Link>
            </p>
          </form>
          <div className="mt-4">
            <OAuthButtons />
          </div>
        </CardContent>
      </Card>
      {/* Lien discret — charte graphique conservée pour validation par le
          référent association, voir docs/Tasks.md */}
      <Link
        href="/styleguide"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60 hover:text-muted-foreground"
      >
        Charte graphique
      </Link>
    </div>
  );
}
