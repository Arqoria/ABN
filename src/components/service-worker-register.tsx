"use client"

import { useEffect } from "react"

/**
 * Enregistre le Service Worker pass-through (public/sw.js) — nécessaire à
 * l'installabilité PWA sur certains navigateurs. Ne fait aucune mise en
 * cache ni logique offline (voir Étape 8 du backlog pour la synchro réelle).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Échec de l'enregistrement du Service Worker :", error)
      })
    }
  }, [])

  return null
}
