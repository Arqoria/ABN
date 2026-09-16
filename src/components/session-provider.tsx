"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Profile } from "@/lib/supabase/dal";

// Contexte client pour l'identité/profil du bénévole connecté — Étape
// "rapprocher ABN du pattern Probalia" (voir docs/Tasks.md, section
// Diagnostic perf webapp). Objectif : arrêter de refaire un aller-retour
// serveur (getCurrentProfile) à CHAQUE navigation à l'intérieur de l'espace
// protégé.
//
// Contrairement à Probalia (qui refait un appel réseau au montage), ici on
// HYDRATE le contexte avec le `profile` déjà calculé une fois par le layout
// serveur (app)/(protected)/layout.tsx — zéro appel réseau supplémentaire au
// premier chargement. Comme ce layout ne se remonte PAS entre deux pages du
// même groupe de routes (comportement standard de l'App Router), ce contexte
// reste stable pendant toute la navigation côté client — les pages qui
// l'utilisent n'ont plus besoin d'appeler getCurrentProfile() elles-mêmes.
//
// Sécurité inchangée : ceci est un contexte d'AFFICHAGE, pas une barrière de
// sécurité. La vraie barrière reste le RLS Postgres sur chaque requête (comme
// avant), et le premier chargement/rafraîchissement passe toujours par
// getCurrentProfile() côté serveur (redirect si pas de session/pas actif).
//
// Contrepartie assumée : si un Admin change le rôle/statut de quelqu'un
// pendant sa session, ça ne s'applique qu'à son prochain rafraîchissement
// complet, pas à son prochain clic (avant : quasi-immédiat). Documenté dans
// Tasks.md, à surveiller si ça pose un vrai problème d'usage.
const SessionContext = createContext<Profile | null>(null);

export function SessionProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={profile}>
      {children}
    </SessionContext.Provider>
  );
}

// À utiliser uniquement dans un Client Component sous (app)/(protected) —
// lève une erreur explicite sinon plutôt qu'un profil silencieusement null,
// pour éviter un bug de permissions silencieux.
export function useSession(): Profile {
  const profile = useContext(SessionContext);
  if (!profile) {
    throw new Error(
      "useSession() doit être appelé sous <SessionProvider> (layout protégé) — profil manquant.",
    );
  }
  return profile;
}
