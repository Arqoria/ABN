"use client";

import { useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signalerBesoin } from "@/lib/actions/besoins";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES_BESOIN,
  CATEGORIE_BESOIN_LABELS,
  type CategorieBesoin,
} from "@/lib/categorie-besoin";
import { PRECISIONS_BESOIN, composerPrecision } from "@/lib/precision-besoin";

const ICONES: Record<CategorieBesoin, string> = {
  couvertures: "🛏️",
  vetements_chauds: "🧥",
  chaussures: "👟",
  hygiene: "🧼",
  nourriture_specifique: "🍽️",
  autre: "📦",
};

// Un tap = un signalement pour les catégories sans précision (couvertures,
// nourriture, autre) : le terrain est souvent pressé (nuit, froid, gants).
// Vêtements, Chaussures et Hygiène (28/09) : le tap ouvre des raccourcis
// (type, taille/pointure — tous facultatifs) puis "Signaler" ; la précision
// est composée dans le texte existant ("Jean/Pantalon - Taille L"), aucune
// colonne en base. Le texte libre reste disponible en complément.
//
// Correctif CSS (28/09) : les boutons (whitespace-nowrap du composant
// Button) débordaient et se chevauchaient sur les libellés longs
// ("Nourriture spécifique") — grille 2 colonnes, hauteur libre, retour à la
// ligne autorisé.
export function BesoinForm({ maraudeId }: { maraudeId: string }) {
  const [pending, startTransition] = useTransition();
  const [commentaire, setCommentaire] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [categorieOuverte, setCategorieOuverte] = useState<CategorieBesoin | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [taille, setTaille] = useState<string | null>(null);
  const queryClient = useQueryClient();

  function envoyer(categorie: CategorieBesoin) {
    const texte = composerPrecision(categorie, type, taille, commentaire);
    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    formData.set("categorie", categorie);
    if (texte) {
      formData.set("commentaire", texte);
    }
    startTransition(async () => {
      const result = await signalerBesoin(undefined, formData).catch(() => ({
        error: "Connexion indisponible, réessayez.",
      }));
      setMessage(result?.error ?? `Besoin signalé, merci (${CATEGORIE_BESOIN_LABELS[categorie]}${texte ? ` : ${texte}` : ""}).`);
      if (!result?.error) {
        setCommentaire("");
        fermer();
        queryClient.invalidateQueries({ queryKey: ["besoins", maraudeId] });
      }
    });
  }

  function fermer() {
    setCategorieOuverte(null);
    setType(null);
    setTaille(null);
  }

  function taperCategorie(c: CategorieBesoin) {
    setMessage(null);
    if (!PRECISIONS_BESOIN[c]) {
      envoyer(c);
      return;
    }
    if (categorieOuverte === c) {
      fermer();
      return;
    }
    setCategorieOuverte(c);
    setType(null);
    setTaille(null);
  }

  const precision = categorieOuverte ? PRECISIONS_BESOIN[categorieOuverte] : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES_BESOIN.map((c) => (
          <Button
            key={c}
            type="button"
            variant={categorieOuverte === c ? "default" : "outline"}
            disabled={pending}
            aria-expanded={PRECISIONS_BESOIN[c] ? categorieOuverte === c : undefined}
            className="h-auto min-h-12 justify-start px-3 py-2 text-left whitespace-normal"
            onClick={() => taperCategorie(c)}
          >
            <span aria-hidden>{ICONES[c]}</span> {CATEGORIE_BESOIN_LABELS[c]}
          </Button>
        ))}
      </div>

      {categorieOuverte && precision && (
        <div className="flex flex-col gap-3 rounded-lg border bg-brand-pastel/40 p-3 dark:bg-brand-navy/20">
          {precision.types && (
            <Raccourcis
              titre="Type"
              valeurs={precision.types}
              choisi={type}
              onChoisir={setType}
            />
          )}
          {precision.tailles && (
            <Raccourcis
              titre={precision.tailles.libelle}
              valeurs={precision.tailles.valeurs}
              choisi={taille}
              onChoisir={setTaille}
              compact
            />
          )}
          <p className="text-xs text-muted-foreground">
            Précision envoyée :{" "}
            <span className="font-medium text-foreground">
              {composerPrecision(categorieOuverte, type, taille, commentaire) || "aucune"}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-12" onClick={fermer}>
              Annuler
            </Button>
            <Button
              type="button"
              className="h-12"
              disabled={pending}
              onClick={() => envoyer(categorieOuverte)}
            >
              Signaler
            </Button>
          </div>
        </div>
      )}

      <Textarea
        placeholder="Précision libre facultative (ex. « 3 couvertures supplémentaires ce soir »)"
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

function Raccourcis({
  titre,
  valeurs,
  choisi,
  onChoisir,
  compact = false,
}: {
  titre: string;
  valeurs: string[];
  choisi: string | null;
  onChoisir: (v: string | null) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase">{titre}</p>
      <div className="flex flex-wrap gap-2">
        {valeurs.map((v) => (
          <Button
            key={v}
            type="button"
            size="sm"
            variant={choisi === v ? "default" : "outline"}
            aria-pressed={choisi === v}
            className={`h-10 ${compact ? "min-w-12" : ""}`}
            onClick={() => onChoisir(choisi === v ? null : v)}
          >
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}
