// Cookie marqueur (pas un cookie Supabase) qui retient le choix "Se souvenir
// de moi" fait à la connexion, pour que CHAQUE rafraîchissement ultérieur de
// la session (proxy.ts à chaque requête, tout appel serveur qui rafraîchit
// un token expiré) applique la même politique — pas seulement la connexion
// initiale. Lu par src/lib/supabase/server.ts et src/lib/supabase/proxy.ts.
export const REMEMBER_ME_COOKIE = "abn-remember-me";

// Aligné sur le maxAge par défaut de @supabase/ssr (~400 jours, le maximum
// autorisé par Chrome pour un cookie — voir
// https://developer.chrome.com/blog/cookie-max-age-expires).
const REMEMBER_ME_MAX_AGE = 400 * 24 * 60 * 60;

// undefined -> cookie de session (supprimé à la fermeture du navigateur).
export function sessionMaxAge(remember: boolean): number | undefined {
  return remember ? REMEMBER_ME_MAX_AGE : undefined;
}
