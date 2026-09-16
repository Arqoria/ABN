"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Header du site vitrine — extrait en Client Component uniquement pour le
// menu hamburger mobile (useState), le reste du layout (footer, main) reste
// en Server Component. Sous `sm` (640px), la nav est repliée derrière un
// bouton pour ne plus prendre ~15% de la hauteur d'écran en permanence —
// voir docs/Tasks.md, Étape 10, point connu à corriger.
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-navy text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide sm:text-base"
          onClick={() => setOpen(false)}
        >
          Les Anges de la Baie
        </Link>

        <nav className="hidden flex-wrap items-center gap-4 text-sm sm:flex">
          <NavLinks />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex size-10 items-center justify-center rounded-md text-white sm:hidden"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav
          id="menu-mobile"
          className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-2 text-sm sm:hidden"
        >
          <NavLinks onNavigate={() => setOpen(false)} stacked />
        </nav>
      )}
    </header>
  );
}

function NavLinks({
  onNavigate,
  stacked = false,
}: {
  onNavigate?: () => void;
  stacked?: boolean;
}) {
  return (
    <>
      <Link
        href="/recrutement"
        onClick={onNavigate}
        className={
          stacked
            ? "rounded-md px-2 py-2 text-white/90 hover:bg-white/10 hover:text-white"
            : "text-white/90 hover:text-white"
        }
      >
        Devenir bénévole
      </Link>
      <Link
        href="/dons"
        onClick={onNavigate}
        className={
          stacked
            ? "rounded-md px-2 py-2 text-white/90 hover:bg-white/10 hover:text-white"
            : "text-white/90 hover:text-white"
        }
      >
        Faire un don
      </Link>
      <Button
        asChild
        variant="outline"
        size="sm"
        className={
          stacked
            ? "mt-1 w-full border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            : "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        }
      >
        <Link href="/login" onClick={onNavigate}>
          Espace bénévole
        </Link>
      </Button>
    </>
  );
}
