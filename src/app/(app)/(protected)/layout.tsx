import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { ROLE_LABELS } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  if (profile.roles.includes("admin")) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "en_attente");
    comptesEnAttenteCount = count ?? 0;
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-brand-navy px-4 py-3 text-white sm:px-6">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-wide sm:text-base"
        >
          Les Anges de la Baie
        </Link>
        <nav className="flex flex-wrap items-center gap-3">
          {profile.roles.includes("admin") && (
            <Link
              href="/dashboard/comptes"
              className="flex items-center gap-1.5 text-sm text-white/90 hover:text-white"
            >
              Comptes en attente
              {comptesEnAttenteCount > 0 && (
                <Badge variant="destructive">{comptesEnAttenteCount}</Badge>
              )}
            </Link>
          )}
          {profile.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {ROLE_LABELS[role]}
            </Badge>
          ))}
          <span className="hidden text-sm text-white/80 sm:inline">
            {profile.full_name ?? "Bénévole"}
          </span>
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Se déconnecter
            </Button>
          </form>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
