"use client";

import { Badge } from "@/components/ui/badge";
import { InscriptionForm } from "./inscription-form";

type Statut = "inscrit" | "liste_attente" | "desiste" | undefined;

export type MaraudeCardData = {
  id: string;
  dateHeure: string;
  typeNom: string | null;
  serieId: string | null;
  maxParticipants: number;
  inscritsCount: number;
  listeAttenteCount: number;
  premiersInscrits: string[];
  mineId: string | undefined;
  mineStatut: Statut;
};

const MOIS_ABREGES = [
  "JANV",
  "FÉVR",
  "MARS",
  "AVR",
  "MAI",
  "JUIN",
  "JUIL",
  "AOÛT",
  "SEPT",
  "OCT",
  "NOV",
  "DÉC",
];

function initiales(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

// Jauge à 3 états — seuils choisis faute d'indication précise dans la
// demande : vert = complet, rouge = "critique" au sens le plus strict
// (aucun inscrit), orange entre les deux. Le vert n'appartient pas à la
// charte graphique (qui n'en définit aucun) — exception nécessaire pour un
// indicateur à 3 couleurs de type feu tricolore, signalée dans docs/Tasks.md.
function couleurJauge(inscrits: number, max: number): string {
  if (inscrits >= max) return "bg-green-500";
  if (inscrits === 0) return "bg-destructive";
  return "bg-brand-coral";
}

export function MaraudeCard({
  maraude,
  isSelected,
  onSelect,
}: {
  maraude: MaraudeCardData;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const date = new Date(maraude.dateHeure);
  const ratio = Math.min(1, maraude.inscritsCount / Math.max(1, maraude.maxParticipants));

  // div plutôt que button : la carte contient elle-même un <form>/<button>
  // (InscriptionForm compact) — un bouton ne peut pas contenir un autre
  // élément interactif en HTML valide. role="button" + gestion clavier
  // reproduisent la sémantique d'un bouton pour l'accessibilité.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-current={isSelected}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
        isSelected
          ? "border-brand-blue bg-brand-pastel"
          : "border-border bg-card hover:bg-brand-pastel/40"
      }`}
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-brand-navy py-1.5 text-white">
        <span className="text-[10px] font-medium tracking-wide">
          {MOIS_ABREGES[date.getMonth()]}
        </span>
        <span className="text-lg leading-tight font-bold">{date.getDate()}</span>
        <span className="text-[11px]">
          {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {maraude.typeNom && (
            <Badge variant="secondary" className="text-xs">
              {maraude.typeNom}
            </Badge>
          )}
          {maraude.serieId && (
            <Badge variant="outline" className="text-xs">
              Série
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${couleurJauge(maraude.inscritsCount, maraude.maxParticipants)}`}
              style={{ width: `${Math.max(6, ratio * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {maraude.inscritsCount}/{maraude.maxParticipants}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {maraude.premiersInscrits.length > 0 ? (
            <div className="flex -space-x-2">
              {maraude.premiersInscrits.slice(0, 4).map((nom, i) => (
                <span
                  key={i}
                  className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-brand-blue text-[10px] font-medium text-white"
                  title={nom}
                >
                  {initiales(nom)}
                </span>
              ))}
              {maraude.inscritsCount > 4 && (
                <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{maraude.inscritsCount - 4}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun inscrit</span>
          )}

          <InscriptionForm
            maraudeId={maraude.id}
            inscriptionId={maraude.mineId}
            statut={maraude.mineStatut}
            compact
          />
        </div>
      </div>
    </div>
  );
}
