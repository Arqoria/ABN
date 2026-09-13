import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Layout du site vitrine public — Étape 10. Header léger avec navigation +
// lien vers l'espace bénévole (connexion), footer minimal. Le contenu
// éditorial complet (présentation détaillée, historique, équipe...) attend
// les vrais textes/photos de l'association — voir docs/Tasks.md, jamais de
// contenu inventé à sa place.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-brand-navy px-4 py-3 text-white sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-wide sm:text-base">
          Les Anges de la Baie
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/recrutement" className="text-white/90 hover:text-white">
            Devenir bénévole
          </Link>
          <Link href="/dons" className="text-white/90 hover:text-white">
            Faire un don
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/login">Espace bénévole</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Les Anges de la Baie de Nice
      </footer>
    </div>
  );
}
