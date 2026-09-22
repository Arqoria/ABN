"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { genererOccurrencesPourSerie, type SerieEvenement } from "@/lib/generer-occurrences";

export type ActionState = { error: string; details?: string } | undefined;

const FREQUENCES = ["hebdomadaire", "toutes_les_2_semaines", "mensuelle_nieme_jour"] as const;
type Frequence = (typeof FREQUENCES)[number];

// RLS (series_evenements_insert_admin) impose déjà Admin + compte actif ;
// check_serie_manager_role (trigger DB) impose que manager_id_defaut
// désigne un profil Manager. Après l'insertion, génère IMMÉDIATEMENT le
// premier horizon (point 10 du cahier des charges) — le client Supabase
// utilisé ici est lié à la session de l'Admin appelant, RLS l'autorise
// normalement à insérer dans maraudes (maraudes_insert_admin_manager),
// pas besoin du client service_role comme pour la route cron.
export async function creerSerieEvenement(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  if (!caller.roles.includes("admin") || caller.status !== "actif") {
    return { error: "Action réservée aux administrateurs." };
  }

  const typeEvenementId = formData.get("typeEvenementId");
  const frequence = formData.get("frequence");
  const jourSemaineRaw = formData.get("jourSemaine");
  const niemeSemaineDuMoisRaw = formData.get("niemeSemaineDuMois");
  const heure = formData.get("heure");
  const managerIdDefaut = formData.get("managerIdDefaut");
  const maxParticipantsDefautRaw = formData.get("maxParticipantsDefaut");
  const horizonGenerationJoursRaw = formData.get("horizonGenerationJours");
  const dateDebutRaw = formData.get("dateDebut");
  const dateFinRaw = formData.get("dateFin");
  const limiterAuxVacancesScolaires = formData.get("limiterAuxVacancesScolaires") === "on";

  if (typeof typeEvenementId !== "string" || !typeEvenementId) {
    return { error: "Choisissez un type d'événement." };
  }
  if (typeof frequence !== "string" || !FREQUENCES.includes(frequence as Frequence)) {
    return { error: "Choisissez une fréquence." };
  }
  const jourSemaine = Number(jourSemaineRaw);
  if (!Number.isInteger(jourSemaine) || jourSemaine < 0 || jourSemaine > 6) {
    return { error: "Choisissez un jour de la semaine." };
  }
  let niemeSemaineDuMois: number | null = null;
  if (frequence === "mensuelle_nieme_jour") {
    niemeSemaineDuMois = Number(niemeSemaineDuMoisRaw);
    if (![1, 2, 3, 4, -1].includes(niemeSemaineDuMois)) {
      return { error: "Choisissez la Nième semaine du mois." };
    }
  }
  if (typeof heure !== "string" || !heure) {
    return { error: "L'heure est requise." };
  }
  if (typeof managerIdDefaut !== "string" || !managerIdDefaut) {
    return { error: "Le Manager par défaut est requis." };
  }
  // date_debut n'est pas un champ du formulaire (voir docs/Tasks.md, Partie
  // C item 12 — liste exacte des champs exposés) : une série démarre par
  // défaut le jour de sa création, jamais dans le passé.
  const dateDebut =
    typeof dateDebutRaw === "string" && dateDebutRaw ? dateDebutRaw : new Date().toISOString().slice(0, 10);
  const maxParticipantsDefaut =
    typeof maxParticipantsDefautRaw === "string" && maxParticipantsDefautRaw
      ? Number(maxParticipantsDefautRaw)
      : 6;
  if (!Number.isInteger(maxParticipantsDefaut) || maxParticipantsDefaut <= 0) {
    return { error: "Capacité par défaut invalide." };
  }
  const horizonGenerationJours =
    typeof horizonGenerationJoursRaw === "string" && horizonGenerationJoursRaw
      ? Number(horizonGenerationJoursRaw)
      : 56;
  if (!Number.isInteger(horizonGenerationJours) || horizonGenerationJours <= 0) {
    return { error: "Horizon de génération invalide." };
  }
  const dateFin = typeof dateFinRaw === "string" && dateFinRaw ? dateFinRaw : null;

  const supabase = await createClient();
  const { data: serie, error } = await supabase
    .from("series_evenements")
    .insert({
      type_evenement_id: typeEvenementId,
      frequence,
      jour_semaine: jourSemaine,
      nieme_semaine_du_mois: niemeSemaineDuMois,
      heure,
      manager_id_defaut: managerIdDefaut,
      max_participants_defaut: maxParticipantsDefaut,
      horizon_generation_jours: horizonGenerationJours,
      date_debut: dateDebut,
      date_fin: dateFin,
      limiter_aux_vacances_scolaires: limiterAuxVacancesScolaires,
    })
    .select(
      "id, type_evenement_id, frequence, jour_semaine, nieme_semaine_du_mois, heure, manager_id_defaut, max_participants_defaut, horizon_generation_jours, date_debut, date_fin, limiter_aux_vacances_scolaires, actif",
    )
    .single();

  if (error || !serie) {
    return {
      error: error?.message.includes("Manager")
        ? "Le Manager par défaut choisi n'a pas le rôle Manager."
        : "Impossible de créer la série.",
    };
  }

  const resultat = await genererOccurrencesPourSerie(supabase, serie as SerieEvenement);
  if (resultat.erreur) {
    // La série est créée, seule la génération immédiate a échoué — le
    // prochain passage du cron la rattrapera. On le signale sans annuler
    // la création (déjà actée en base).
    return { error: "Série créée, mais la génération immédiate a échoué (le cron la rattrapera).", details: resultat.erreur };
  }

  revalidatePath("/dashboard/maraudes");
  revalidatePath("/dashboard/series-evenements");
  return undefined;
}

export async function basculerActifSerie(id: string, actif: boolean) {
  const supabase = await createClient();
  await supabase.from("series_evenements").update({ actif }).eq("id", id);
  revalidatePath("/dashboard/series-evenements");
}
