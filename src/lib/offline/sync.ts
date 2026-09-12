import { offlineDb } from "./db";
import { ajouterRepas } from "@/lib/actions/repas";
import { saisirMeteo } from "@/lib/actions/meteo";
import { capturerPointPassage } from "@/lib/actions/points-passage";
import { creerTicket } from "@/lib/actions/tickets";

// Vide la file d'attente locale en rejouant chaque saisie via la Server
// Action normale (RLS/triggers s'appliquent exactement comme en ligne — pas
// de chemin de contournement pour les saisies hors-ligne). S'arrête au
// premier échec réseau (on retentera au prochain 'online') mais continue
// sur une erreur métier (ex. maraude supprimée entretemps) en retirant
// l'entrée fautive plutôt que de bloquer toute la file indéfiniment dessus.
export async function flushPendingRepas() {
  const pending = await offlineDb.pendingRepas.orderBy("createdAt").toArray();

  for (const item of pending) {
    const formData = new FormData();
    formData.set("maraudeId", item.maraudeId);
    formData.set("quoi", item.quoi);
    formData.set("quantite", String(item.quantite));

    try {
      const result = await ajouterRepas(undefined, formData);
      if (result?.error) {
        // Erreur métier (pas réseau, ex. maraude supprimée entretemps) :
        // on retire l'entrée pour ne pas bloquer indéfiniment la file
        // dessus. Pas de résolution de conflit fine à ce stade — voir
        // docs/Tasks.md.
        await offlineDb.pendingRepas.delete(item.id!);
        continue;
      }
    } catch {
      // Toujours hors ligne (ou réseau instable) — on arrête ici, le
      // prochain évènement 'online' relancera flushPendingRepas() depuis
      // le début.
      return;
    }

    await offlineDb.pendingRepas.delete(item.id!);
  }
}

export async function countPendingRepas(): Promise<number> {
  return offlineDb.pendingRepas.count();
}

// Même logique que flushPendingRepas() ci-dessus.
export async function flushPendingMeteo() {
  const pending = await offlineDb.pendingMeteo.orderBy("createdAt").toArray();

  for (const item of pending) {
    const formData = new FormData();
    formData.set("maraudeId", item.maraudeId);
    formData.set("userId", item.userId);
    formData.set("valeur", item.valeur);

    try {
      const result = await saisirMeteo(undefined, formData);
      if (result?.status === "error") {
        // Ex. le bénévole a été désinscrit, ou une météo a déjà été saisie
        // entretemps par un Manager — on retire l'entrée plutôt que de
        // bloquer la file dessus.
        await offlineDb.pendingMeteo.delete(item.id!);
        continue;
      }
    } catch {
      return;
    }

    await offlineDb.pendingMeteo.delete(item.id!);
  }
}

// Même logique que les deux précédentes. lat/lng sont la position brute
// captée côté client — c'est le trigger force_geo_arrondi (Étape 6) qui la
// recale sur une grille ~100m côté serveur, jamais stockée précisément
// même dans cette file d'attente locale (elle ne quitte l'appareil que
// le temps du trajet réseau, jamais persistée ailleurs).
export async function flushPendingPointsPassage() {
  const pending = await offlineDb.pendingPointsPassage
    .orderBy("createdAt")
    .toArray();

  for (const item of pending) {
    const formData = new FormData();
    formData.set("maraudeId", item.maraudeId);
    formData.set("typeAction", item.typeAction);
    formData.set("lat", String(item.lat));
    formData.set("lng", String(item.lng));

    try {
      const result = await capturerPointPassage(undefined, formData);
      if (result?.error) {
        await offlineDb.pendingPointsPassage.delete(item.id!);
        continue;
      }
    } catch {
      return;
    }

    await offlineDb.pendingPointsPassage.delete(item.id!);
  }
}

// Même logique que les précédentes, avec en plus la reconstruction d'un
// File à partir du Blob stocké tel quel dans IndexedDB (voir
// src/lib/offline/db.ts) — la Server Action reçoit un vrai File via
// FormData, exactement comme depuis un vrai formulaire.
export async function flushPendingTickets() {
  const pending = await offlineDb.pendingTickets
    .orderBy("createdAt")
    .toArray();

  for (const item of pending) {
    const formData = new FormData();
    formData.set("maraudeId", item.maraudeId);
    formData.set("montant", String(item.montant));
    formData.set("categorie", item.categorie);
    formData.set(
      "photo",
      new File([item.photo], item.photoName, { type: item.photo.type }),
    );

    try {
      const result = await creerTicket(undefined, formData);
      if (result?.error) {
        await offlineDb.pendingTickets.delete(item.id!);
        continue;
      }
    } catch {
      return;
    }

    await offlineDb.pendingTickets.delete(item.id!);
  }
}
