"use client";

import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, Laptop } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Regroupe apparence (mode clair/sombre/système — ModeToggle n'existait
// jusqu'ici que sur /styleguide, jamais câblé dans l'appli réelle) et
// déconnexion dans un seul menu, plutôt que d'empiler des boutons séparés
// dans un header déjà chargé (badges de rôle, compte en attente...).
// logout() reste la même Server Action qu'avant (appelée directement,
// sans <form> : Next.js gère le redirect() interne d'une Server Action
// appelée depuis un gestionnaire client exactement comme depuis un
// <form action=...>).
export function AccountMenu({ nom }: { nom: string }) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          {nom}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Apparence</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setTheme("light")}>
          <Sun /> Clair
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>
          <Moon /> Sombre
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>
          <Laptop /> Système
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
