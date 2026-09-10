import { NextResponse } from "next/server";

// Cible les routes protégées du groupe (app). Étendre le matcher au fur
// et à mesure que de nouvelles routes (app) apparaissent.
export const config = {
  matcher: ["/dashboard/:path*"],
};

// Next.js appelle proxy() avec (request, event) — on ne déclare que ce
// qu'on utilise, donc rien pour l'instant.
export function proxy() {
  // ⚠️ TODO (Étape 2 puis Étape 7) : aucune vérification de session réelle
  // ici — Supabase n'est pas encore branché (Étape 2). Une fois l'auth en
  // place, vérifier ici le cookie de session Supabase et rediriger vers
  // /login si absent/invalide. Pour l'instant on laisse tout passer.
  return NextResponse.next();
}
