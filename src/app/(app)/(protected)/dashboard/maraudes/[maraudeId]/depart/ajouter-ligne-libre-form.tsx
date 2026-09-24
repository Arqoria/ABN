"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ajouterLigneChecklistLibre } from "@/lib/actions/checklist-depart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// "C'est une association, tout n'est pas dans le stock formel" — décision
// explicite du Chef de Produit : le Manager doit pouvoir ajouter une ligne
// non prévue (ex. un don en nature apporté directement par un bénévole,
// jamais passé par le stock/les dons ponctuels enregistrés).
export function AjouterLigneLibreForm({ maraudeId }: { maraudeId: string }) {
  const [libelle, setLibelle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function submit() {
    if (!libelle.trim()) return;
    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    formData.set("libelle", libelle.trim());
    startTransition(async () => {
      const result = await ajouterLigneChecklistLibre(undefined, formData);
      setMessage(result?.error ?? null);
      if (!result?.error) {
        setLibelle("");
        queryClient.invalidateQueries({ queryKey: ["depart", maraudeId] });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="Ajouter une ligne (ex. « Lampes de poche »)"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="button" disabled={pending || !libelle.trim()} onClick={submit}>
          Ajouter
        </Button>
      </div>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
