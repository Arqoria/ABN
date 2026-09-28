"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { FONCTIONS_MARAUDE, type FonctionMaraude } from "@/lib/fonction-maraude";

export type ActionState = { error: string } | undefined;
export type InscriptionResult =
  | { error: string }
  | {
      id: string;
      statut: "inscrit" | "liste_attente";
      // Fonctions réellement affectées (vide en liste d'attente : aucune
      // affectation tant que l'inscription n'est pas confirmée).
      fonctions: FonctionMaraude[];
      // Affectation demandée mais refusée par la base (ne devrait pas arriver
      // depuis l'UI, qui ne propose que les rôles détenus).
      avertissement?: string;
    };

// Perf (28/09, retour client "le clic inscription est lent") : plus aucun
// revalidatePath dans ces actions — /dashboard/maraudes lit ses données via
// React Query côté client, le re-rendu serveur déclenché par revalidatePath
// (layout protégé + vérification de session Supabase) ne rafraîchissait
// rien d'utile et retardait chaque clic. Le client met son cache à jour
// lui-même (mise à jour optimiste, voir inscription-form.tsx).

// Toute la logique de capacité (max_participants, liste d'attente) est déjà
// gérée en base par le trigger set_inscription_statut (Étape 3, mis à jour
// Partie A 22/09 pour lire maraudes.max_participants au lieu d'un 6 codé en
// dur) — cette Server Action se contente d'insérer, jamais de calculer/
// forcer un statut ici. Création "Ponctuelle" (voir docs/Tasks.md, Partie
// C) : type_evenement_id est désormais NOT NULL sur maraudes, obligatoire
// même pour une maraude créée à la main, hors de toute série.

export async function creerMaraude(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  if (!caller.roles.includes("admin") && !caller.roles.includes("manager")) {
    return { error: "Action réservée aux Admins/Managers." };
  }

  const dateHeure = formData.get("dateHeure");
  const managerId = formData.get("managerId");
  const typeEvenementId = formData.get("typeEvenementId");
  const maxParticipantsRaw = formData.get("maxParticipants");

  if (typeof dateHeure !== "string" || !dateHeure) {
    return { error: "Date et heure requises." };
  }
  if (typeof managerId !== "string" || !managerId) {
    return { error: "Manager requis." };
  }
  if (typeof typeEvenementId !== "string" || !typeEvenementId) {
    return { error: "Type d'événement requis." };
  }
  const maxParticipants =
    typeof maxParticipantsRaw === "string" && maxParticipantsRaw ? Number(maxParticipantsRaw) : 6;
  if (!Number.isInteger(maxParticipants) || maxParticipants <= 0) {
    return { error: "Capacité invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("maraudes").insert({
    date_heure: new Date(dateHeure).toISOString(),
    manager_id: managerId,
    type_evenement_id: typeEvenementId,
    max_participants: maxParticipants,
  });

  if (error) {
    return { error: "Impossible de créer la maraude." };
  }

  return undefined;
}

// Renvoie l'id et le statut RÉELLEMENT attribués par le trigger (inscrit ou
// liste d'attente) : le client remplace sa prédiction optimiste par cette
// valeur, sans recharger toute la liste des maraudes.
//
// 28/09 — deux ajouts, logique de capacité inchangée (toujours le trigger) :
// - `reinscription=1` ("S'inscrire à nouveau" après un désistement) : la
//   ligne est unique par (maraude, bénévole), elle est réactivée via la
//   fonction reinscrire_maraude (voir migration 20260928110000) plutôt
//   qu'insérée ;
// - `fonctions` (Cuisinier/Maraudeur, cumulables) : affectations créées
//   UNIQUEMENT si l'inscription est confirmée (pas en liste d'attente). RLS +
//   trigger de qualification refusent de toute façon un rôle non détenu ou
//   une affectation hors inscription confirmée.
export async function inscrireMaraude(formData: FormData): Promise<InscriptionResult> {
  const maraudeId = formData.get("maraudeId");
  const reinscription = formData.get("reinscription") === "1";
  const fonctions = formData
    .getAll("fonctions")
    .filter((f): f is FonctionMaraude => FONCTIONS_MARAUDE.includes(f as FonctionMaraude));

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }

  const supabase = await createClient();
  // Seul l'id de l'appelant est nécessaire (le profil complet de
  // getCurrentProfile coûtait un aller-retour de plus) — getUser() vérifie
  // quand même la session contre Supabase Auth ; la RLS d'insertion reste la
  // vraie barrière (compte actif, user_id = auth.uid()).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Session expirée, reconnectez-vous." };
  }

  type Ligne = { id: string; statut: "inscrit" | "liste_attente" };
  let inscription: Ligne | null = null;

  if (reinscription) {
    const { data, error } = await supabase.rpc("reinscrire_maraude", { p_maraude_id: maraudeId });
    inscription = !error && Array.isArray(data) && data[0] ? (data[0] as Ligne) : null;
  } else {
    const { data, error } = await supabase
      .from("inscriptions_maraude")
      .insert({ maraude_id: maraudeId, user_id: user.id })
      .select("id, statut")
      .single<Ligne>();
    inscription = !error && data ? data : null;
  }

  if (!inscription) {
    return { error: "Impossible de s'inscrire." };
  }

  if (inscription.statut !== "inscrit" || fonctions.length === 0) {
    return { ...inscription, fonctions: [] };
  }

  const { data: affectees, error: affError } = await supabase
    .from("affectations_maraude")
    .insert(fonctions.map((fonction) => ({ maraude_id: maraudeId, user_id: user.id, fonction })))
    .select("fonction");

  if (affError) {
    return {
      ...inscription,
      fonctions: [],
      avertissement: "Inscrit, mais le rôle n'a pas pu être enregistré — choisissez-le dans l'onglet Équipe.",
    };
  }

  return { ...inscription, fonctions: (affectees ?? []).map((a) => a.fonction as FonctionMaraude) };
}

// Un désistement passe toujours par une mise à jour de statut, jamais une
// suppression (historique conservé, voir migration Étape 3). Le bénévole ne
// peut désister QUE sa propre inscription — c'est la policy RLS
// inscriptions_update_own_desist qui l'impose, pas cette action.
export async function seDesisterMaraude(formData: FormData): Promise<ActionState> {
  const inscriptionId = formData.get("inscriptionId");

  if (typeof inscriptionId !== "string" || !inscriptionId) {
    return { error: "Inscription introuvable." };
  }

  const supabase = await createClient();
  // .select() : une mise à jour refusée par RLS ne lève pas d'erreur, elle
  // modifie simplement 0 ligne — à détecter pour que le client annule son
  // affichage optimiste au lieu de montrer un faux désistement.
  const { data, error } = await supabase
    .from("inscriptions_maraude")
    .update({ statut: "desiste" })
    .eq("id", inscriptionId)
    .select("id");

  if (error || !data?.length) {
    return { error: "Impossible de se désister." };
  }

  return undefined;
}
