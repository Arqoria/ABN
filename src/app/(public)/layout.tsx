import type { ReactNode } from "react";

// Layout du site vitrine public — squelette uniquement, contenu réel
// (header de nav, footer complet, pages SEO) à l'Étape 10 du backlog.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-brand-navy px-4 py-4 text-white sm:px-6">
        <p className="text-sm font-semibold tracking-wide">
          Les Anges de la Baie
        </p>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Les Anges de la Baie de Nice
      </footer>
    </div>
  );
}
