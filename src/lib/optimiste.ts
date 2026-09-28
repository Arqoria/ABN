import type { QueryClient, QueryKey } from "@tanstack/react-query";

// Mise à jour optimiste d'un cache React Query autour d'une Server Action
// (perf, 28/09 — retour client "les clics sont lents") : l'écran bascule
// immédiatement, l'action part en arrière-plan. Si elle échoue — erreur
// renvoyée, refus RLS signalé par l'action, ou promesse rejetée (réseau
// coupé, fréquent sur le terrain) — le cache est rechargé depuis la base
// plutôt que restauré depuis un instantané : un instantané écraserait un
// autre clic fait entre-temps. Renvoie le message d'erreur à afficher, ou
// null si tout s'est bien passé.
export async function avecOptimisme<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  patch: (old: T) => T,
  action: () => Promise<{ error: string } | undefined | void>,
): Promise<string | null> {
  queryClient.setQueryData<T>(queryKey, (old) => (old === undefined ? old : patch(old)));

  const resultat = await action().catch(() => ({ error: "Connexion indisponible, réessayez." }));
  if (resultat && "error" in resultat) {
    queryClient.invalidateQueries({ queryKey });
    return resultat.error;
  }
  return null;
}
