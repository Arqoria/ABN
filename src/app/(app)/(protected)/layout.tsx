import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { FONCTION_BUREAU_LABELS } from "@/lib/fonction-bureau";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { OfflineSync } from "@/components/offline-sync";
import { AccountMenu } from "@/components/account-menu";
import { QueryProvider } from "@/components/query-provider";
import { SessionProvider } from "@/components/session-provider";

// Layout partagé par toutes les routes protégées (/dashboard,
// /compte-en-attente, ...) — PAS par /login ni /signup, qui restent en
// dehors du groupe (protected) pour rester accessibles sans session. La
// vérification de session elle-même reste dans le DAL (getCurrentProfile),
// appelée ici pour le header ET par chaque page pour ses propres redirections
// de statut (voir guide Next.js sur l'auth : éviter l'autorisation dans les
// layouts, mais la lecture d'affichage seule est sans risque ici).
export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getCurrentProfile();

  let comptesEnAttenteCount = 0;
  let candidaturesEnAttenteCount = 0;
  if (profile.roles.includes("admin")) {
    const supabase = await createClient();
    // Perf (15/09) : en parallèle plutôt que l'un après l'autre — ce layout
    // s'exécute sur chaque page protégée pour un Admin, chaque round-trip
    // Supabase évité (ou ici, chevauché) compte.
    const [{ count }, { count: candidaturesCount }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "en_attente"),
      supabase
        .from("candidatures_benevolat")
        .select("id", { count: "exact", head: true })
        .eq("traitee", false),
    ]);
    comptesEnAttenteCount = count ?? 0;
    candidaturesEnAttenteCount = candidaturesCount ?? 0;
  }

  return (
    <div className="flex min-h-full flex-col">
      <OfflineSync />
      <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-4 py-3 text-white sm:px-6">
        {/* prefetch={false} sur tous les liens de cet en-tête : présent sur
            CHAQUE page protégée, donc toujours monté/visible — un
            préchargement permanent qui déclenche le middleware (rafraîchit
            le token) à chaque page inutilement. Voir docs/Tasks.md,
            "Chantier lancé, suite (16/09)". */}
        <Link
          href="/dashboard"
          prefetch={false}
          className="text-sm font-semibold tracking-wide sm:text-base"
        >
          Les Anges de la Baie
        </Link>
        <nav className="flex flex-wrap items-center gap-3">
          {profile.roles.includes("admin") && (
            <Link
              href="/dashboard/comptes"
              prefetch={false}
              className="flex items-center gap-1.5 text-sm text-white/90 hover:text-white"
            >
              Comptes en attente
              {comptesEnAttenteCount > 0 && (
                <Badge variant="destructive">{comptesEnAttenteCount}</Badge>
              )}
            </Link>
          )}
          {profile.roles.includes("admin") && (
            <Link
              href="/dashboard/candidatures"
              prefetch={false}
              className="flex items-center gap-1.5 text-sm text-white/90 hover:text-white"
            >
              Candidatures
              {candidaturesEnAttenteCount > 0 && (
                <Badge variant="destructive">{candidaturesEnAttenteCount}</Badge>
              )}
            </Link>
          )}
          {profile.fonction_bureau && (
            <Badge variant="outline" className="border-white/40 text-white">
              {FONCTION_BUREAU_LABELS[profile.fonction_bureau]}
            </Badge>
          )}
          {profile.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {ROLE_LABELS[role]}
            </Badge>
          ))}
          <AccountMenu nom={profile.full_name ?? "Bénévole"} />
        </nav>
      </header>
      <main className="flex flex-1 flex-col">
        <QueryProvider>
          <SessionProvider profile={profile}>{children}</SessionProvider>
        </QueryProvider>
      </main>
    </div>
  );
}
