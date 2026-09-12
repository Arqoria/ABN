"use client";

import { useState, useTransition } from "react";
import { signalerBesoin } from "@/lib/actions/besoins";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES_BESOIN,
  CATEGORIE_BESOIN_LABELS,
  type CategorieBesoin,
} from "@/lib/categorie-besoin";

const ICONES: Record<CategorieBesoin, string> = {
  couvertures: "🛏️",
  vetements_chauds: "🧥",
  hygiene: "🧼",
  nourriture_specifique: "🍽️",
  autre: "📦",
};

// Un tap = un signalement, comme la capture de points de passage : le
// commentaire (facultatif, ex. "3 couvertures supplémentaires ce soir") se
// tape avant de choisir la catégorie, puis le tap sur la catégorie envoie
// directement — pas d'étape de confirmation séparée, le terrain est souvent
// pressé (nuit, froid, parfois avec des gants).
export function BesoinForm({ maraudeId }: { maraudeId: string }) {
  const [pending, startTransition] = useTransition();
  const [commentaire, setCommentaire] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function submit(categorie: CategorieBesoin) {
    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    formData.set("categorie", categorie);
    if (commentaire.trim()) {
      formData.set("commentaire", commentaire.trim());
    }
    startTransition(async () => {
      const result = await signalerBesoin(undefined, formData);
      setMessage(result?.error ?? "Besoin signalé, merci.");
      if (!result?.error) {
        setCommentaire("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Précision facultative (ex. « 3 couvertures supplémentaires ce soir »)"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CATEGORIES_BESOIN.map((c) => (
          <Button
            key={c}
            type="button"
            variant="outline"
            disabled={pending}
            className="h-12"
            onClick={() => submit(c)}
          >
            {ICONES[c]} {CATEGORIE_BESOIN_LABELS[c]}
          </Button>
        ))}
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
