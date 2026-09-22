// Module neutre (pas de "use server"/server-only) — fonctions pures, aucun
// I/O, aucun secret. Utilisé à la fois par la génération immédiate
// (création d'une série, Server Action) et par la route cron quotidienne —
// un seul endroit pour la logique de calendrier, jamais dupliquée.
//
// Convention jour_semaine : 0=dimanche ... 6=samedi (Date.getUTCDay()),
// même convention que la colonne series_evenements.jour_semaine — voir
// migration 20260922110000. Tous les calculs se font en dates civiles
// (YYYY-MM-DD) via des Date construites en UTC minuit : le jour de la
// semaine d'une date civile est un fait indépendant du fuseau horaire, la
// conversion vers un instant UTC réel (heure locale Europe/Paris) n'arrive
// qu'à la toute fin, via src/lib/timezone.ts.

export type FrequenceSerie = "hebdomadaire" | "toutes_les_2_semaines" | "mensuelle_nieme_jour";

export interface RegleSerie {
  frequence: FrequenceSerie;
  jourSemaine: number; // 0-6
  niemeSemaineDuMois: number | null; // 1-4 ou -1, uniquement si frequence='mensuelle_nieme_jour'
  dateDebut: string; // "YYYY-MM-DD"
  dateFin: string | null; // "YYYY-MM-DD"
}

function versDateUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function versIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ajouterJours(iso: string, jours: number): string {
  const d = versDateUtc(iso);
  d.setUTCDate(d.getUTCDate() + jours);
  return versIso(d);
}

function differenceJours(depuisIso: string, jusquIso: string): number {
  return Math.round((versDateUtc(jusquIso).getTime() - versDateUtc(depuisIso).getTime()) / 86_400_000);
}

// Premier jour >= depuisIso qui tombe sur jourSemaine.
function premierJourSemaineApres(depuisIso: string, jourSemaine: number): string {
  const d = versDateUtc(depuisIso);
  const delta = (jourSemaine - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return versIso(d);
}

// Nième (ou dernière si nieme=-1) occurrence de jourSemaine dans le mois
// contenant premierJourDuMoisIso ("YYYY-MM-01" ou toute date de ce mois).
// Retourne null si le mois n'a pas de Nième occurrence (ex. 5e lundi).
function niemeJourSemaineDuMois(
  uneDateDuMoisIso: string,
  jourSemaine: number,
  nieme: number,
): string | null {
  const premierDuMois = versDateUtc(`${uneDateDuMoisIso.slice(0, 7)}-01`);
  const dernierDuMois = new Date(Date.UTC(premierDuMois.getUTCFullYear(), premierDuMois.getUTCMonth() + 1, 0));

  if (nieme === -1) {
    const d = new Date(dernierDuMois);
    const delta = (d.getUTCDay() - jourSemaine + 7) % 7;
    d.setUTCDate(d.getUTCDate() - delta);
    return versIso(d);
  }

  const premier = premierJourSemaineApres(versIso(premierDuMois), jourSemaine);
  const candidat = ajouterJours(premier, (nieme - 1) * 7);
  return versDateUtc(candidat) <= dernierDuMois ? candidat : null;
}

// Toutes les dates (YYYY-MM-DD) qui satisfont la règle dans
// [debutFenetreIso, finFenetreIso], en respectant aussi dateDebut/dateFin
// de la règle elle-même.
export function calculerDatesOccurrences(
  regle: RegleSerie,
  debutFenetreIso: string,
  finFenetreIso: string,
): string[] {
  const bornInf = regle.dateDebut > debutFenetreIso ? regle.dateDebut : debutFenetreIso;
  const bornSup = regle.dateFin && regle.dateFin < finFenetreIso ? regle.dateFin : finFenetreIso;
  if (bornInf > bornSup) return [];

  const dates: string[] = [];

  if (regle.frequence === "mensuelle_nieme_jour") {
    if (regle.niemeSemaineDuMois === null) return [];
    let curseurMois = `${bornInf.slice(0, 7)}-01`;
    const finMois = `${bornSup.slice(0, 7)}-01`;
    while (curseurMois <= finMois) {
      const date = niemeJourSemaineDuMois(curseurMois, regle.jourSemaine, regle.niemeSemaineDuMois);
      if (date && date >= bornInf && date <= bornSup) {
        dates.push(date);
      }
      const d = versDateUtc(curseurMois);
      d.setUTCMonth(d.getUTCMonth() + 1);
      curseurMois = versIso(d);
    }
    return dates;
  }

  // hebdomadaire / toutes_les_2_semaines : ancrées sur dateDebut de la
  // règle, pas sur bornInf — sinon la parité "toutes les 2 semaines"
  // dériverait selon la fenêtre de génération demandée.
  const ancre = premierJourSemaineApres(regle.dateDebut, regle.jourSemaine);
  const pas = regle.frequence === "toutes_les_2_semaines" ? 14 : 7;

  let curseur = premierJourSemaineApres(bornInf, regle.jourSemaine);
  while (differenceJours(ancre, curseur) % pas !== 0) {
    curseur = ajouterJours(curseur, 7);
  }

  while (curseur <= bornSup) {
    dates.push(curseur);
    curseur = ajouterJours(curseur, pas);
  }

  return dates;
}

export interface PeriodeVacances {
  date_debut: string;
  date_fin: string;
}

export function estDansPeriodeVacances(dateIso: string, periodes: PeriodeVacances[]): boolean {
  return periodes.some((p) => dateIso >= p.date_debut && dateIso <= p.date_fin);
}
