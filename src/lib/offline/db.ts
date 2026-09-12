import Dexie, { type Table } from "dexie";

// File d'attente locale (IndexedDB via Dexie) pour la saisie terrain sans
// réseau — Étape 8. Un magasin par type de saisie plutôt qu'un magasin
// générique : chaque type a sa propre forme de données et sa propre logique
// de synchro (voir src/lib/offline/sync.ts).
export type PendingRepas = {
  id?: number;
  maraudeId: string;
  quoi: string;
  quantite: number;
  createdAt: number;
};

export type PendingMeteo = {
  id?: number;
  maraudeId: string;
  userId: string;
  valeur: "vert" | "jaune" | "rouge";
  createdAt: number;
};

class OfflineDB extends Dexie {
  pendingRepas!: Table<PendingRepas, number>;
  pendingMeteo!: Table<PendingMeteo, number>;

  constructor() {
    super("abn-offline");
    this.version(1).stores({
      pendingRepas: "++id, maraudeId, createdAt",
    });
    // v2 : ajoute pendingMeteo. Dexie applique les versions successives dans
    // l'ordre chez les navigateurs qui ont déjà la v1 — ne jamais modifier
    // les stores() d'une version déjà déployée, toujours en ajouter une
    // nouvelle.
    this.version(2).stores({
      pendingRepas: "++id, maraudeId, createdAt",
      pendingMeteo: "++id, maraudeId, createdAt",
    });
  }
}

// Instancié une seule fois. Ce module n'est importé que depuis des Client
// Components (IndexedDB n'existe pas côté serveur) — jamais depuis un
// Server Component ou une Server Action.
export const offlineDb = new OfflineDB();
