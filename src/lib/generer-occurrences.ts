import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculerDatesOccurrences, estDansPeriodeVacances, type RegleSerie } from "@/lib/recurrence";
import { parisVersUtc } from "@/lib/timezone";

// Orchestration DB partagée entre la génération immédiate (création d'une
// série, Server Action déjà authentifiée Admin) et la route cron
// quotidienne (createAdminClient, aucune session — voir
// src/app/api/cron/generer-occurrences/route.ts). Le calcul des dates lui-
// même est délégué à src/lib/recurrence.ts (fonctions pures, testées
// isolément).

export interface SerieEvenement {
  id: string;
  type_evenement_id: string;
  frequence: RegleSerie["frequence"];
  jour_semaine: number;
  nieme_semaine_du_mois: number | null;
  heure: string;
  manager_id_defaut: string;
  max_participants_defaut: number;
  horizon_generation_jours: number;
  date_debut: string;
  date_fin: string | null;
  limiter_aux_vacances_scolaires: boolean;
  actif: boolean;
}

function aujourdHuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function ajouterJoursIso(iso: string, jours: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

// Génère les occurrences manquantes d'UNE série sur son horizon
// (aujourd'hui -> aujourd'hui + horizon_generation_jours, borné par
// date_fin si présente). Idempotent : ne recrée jamais une occurrence dont
// la date existe déjà pour cette série (vérifié par date civile, pas par
// instant exact, pour rester robuste à un éventuel changement d'heure de
// la série après coup).
export async function genererOccurrencesPourSerie(
  supabase: SupabaseClient,
  serie: SerieEvenement,
): Promise<{ serieId: string; creees: number; erreur?: string }> {
  const debutFenetre = aujourdHuiIso();
  const finFenetre = ajouterJoursIso(debutFenetre, serie.horizon_generation_jours);

  const regle: RegleSerie = {
    frequence: serie.frequence,
    jourSemaine: serie.jour_semaine,
    niemeSemaineDuMois: serie.nieme_semaine_du_mois,
    dateDebut: serie.date_debut,
    dateFin: serie.date_fin,
  };

  let datesCandidates = calculerDatesOccurrences(regle, debutFenetre, finFenetre);

  if (serie.limiter_aux_vacances_scolaires && datesCandidates.length > 0) {
    const { data: vacances, error: vacancesError } = await supabase
      .from("vacances_scolaires")
      .select("date_debut, date_fin");
    if (vacancesError) {
      return { serieId: serie.id, creees: 0, erreur: "Impossible de lire les vacances scolaires." };
    }
    datesCandidates = datesCandidates.filter((d) => estDansPeriodeVacances(d, vacances ?? []));
  }

  if (datesCandidates.length === 0) {
    return { serieId: serie.id, creees: 0 };
  }

  const { data: existantes, error: existantesError } = await supabase
    .from("maraudes")
    .select("date_heure")
    .eq("serie_id", serie.id)
    .gte("date_heure", `${debutFenetre}T00:00:00Z`)
    .lte("date_heure", `${finFenetre}T23:59:59Z`);
  if (existantesError) {
    return { serieId: serie.id, creees: 0, erreur: "Impossible de lire les occurrences déjà générées." };
  }

  const datesExistantes = new Set((existantes ?? []).map((m) => (m.date_heure as string).slice(0, 10)));
  const datesACreer = datesCandidates.filter((d) => !datesExistantes.has(d));

  if (datesACreer.length === 0) {
    return { serieId: serie.id, creees: 0 };
  }

  const lignes = datesACreer.map((d) => ({
    date_heure: parisVersUtc(d, serie.heure).toISOString(),
    manager_id: serie.manager_id_defaut,
    type_evenement_id: serie.type_evenement_id,
    max_participants: serie.max_participants_defaut,
    serie_id: serie.id,
  }));

  const { error: insertError } = await supabase.from("maraudes").insert(lignes);
  if (insertError) {
    return { serieId: serie.id, creees: 0, erreur: "Échec de la création des occurrences." };
  }

  return { serieId: serie.id, creees: datesACreer.length };
}

// Utilisée par la route cron : toutes les séries actives.
export async function genererOccurrencesPourToutesSeries(
  supabase: SupabaseClient,
): Promise<{ series: number; creees: number; erreurs: string[] }> {
  const { data: series, error } = await supabase
    .from("series_evenements")
    .select(
      "id, type_evenement_id, frequence, jour_semaine, nieme_semaine_du_mois, heure, manager_id_defaut, max_participants_defaut, horizon_generation_jours, date_debut, date_fin, limiter_aux_vacances_scolaires, actif",
    )
    .eq("actif", true);

  if (error || !series) {
    return { series: 0, creees: 0, erreurs: ["Impossible de lire les séries actives."] };
  }

  let totalCreees = 0;
  const erreurs: string[] = [];

  for (const serie of series as SerieEvenement[]) {
    const resultat = await genererOccurrencesPourSerie(supabase, serie);
    totalCreees += resultat.creees;
    if (resultat.erreur) {
      erreurs.push(`Série ${serie.id} : ${resultat.erreur}`);
    }
  }

  return { series: series.length, creees: totalCreees, erreurs };
}
