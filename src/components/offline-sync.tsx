"use client";

import { useEffect } from "react";
import { flushPendingRepas, flushPendingMeteo } from "@/lib/offline/sync";

// Monté une fois dans le layout (protected) : tente une synchro au chargement
// (couvre le cas "app rouverte après être restée hors ligne") ET à chaque
// retour de connexion. Ne rend rien — pas d'indicateur visuel global pour
// l'instant, voir docs/Tasks.md.
export function OfflineSync() {
  useEffect(() => {
    void flushPendingRepas();
    void flushPendingMeteo();

    function handleOnline() {
      void flushPendingRepas();
      void flushPendingMeteo();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}
