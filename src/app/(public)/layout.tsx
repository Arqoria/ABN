import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONTACT_EMAIL = "lesangesdelabaiedenice@gmail.com";

// Layout du site vitrine public — Étape 10. Header sticky (reste visible au
// scroll, via `sticky` plutôt que `fixed` — même effet visuel sans avoir à
// compenser un padding-top ailleurs) + footer bleu marine.
//
// Footer volontairement partiel : pas de liens réseaux sociaux ni de
// mentions légales/transparence tant qu'on n'a pas les vraies infos de
// l'association (décision explicite du client, voir docs/Tasks.md) — jamais
// de lien ou de texte inventé à leur place.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-brand-navy px-4 py-3 text-white sm:px-6">
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

      <footer className="bg-brand-navy px-4 py-10 text-white sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide">Les Anges de la Baie de Nice</p>
            <p className="mt-1 text-sm text-white/70">Maraudes solidaires à Nice</p>
          </div>
          <div className="text-sm text-white/70">
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <div className="mx-auto mt-8 w-full max-w-6xl border-t border-white/10 pt-4 text-xs text-white/50">
          © {new Date().getFullYear()} Les Anges de la Baie de Nice
        </div>
      </footer>
    </div>
  );
}
