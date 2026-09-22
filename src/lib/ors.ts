import "server-only";

// Client OpenRouteService (Directions API, profil foot-walking — les
// équipes se déplacent à pied) — côté serveur uniquement, ORS_API_KEY
// n'est jamais exposée au navigateur. Voir docs/Specs.md pour le principe
// général (tracé réel vs points bruts) et docs/Tasks.md pour le compte/la
// clé.
//
// Ne lève JAMAIS d'exception : un circuit planifié doit pouvoir
// s'enregistrer même si l'API échoue (pas de connexion, quota dépassé,
// points trop excentrés/non routables, clé absente) — l'appelant se
// contente d'un résultat null et garde l'ancien comportement (ligne
// droite) en repli, jamais d'écran cassé pour ça.

type Point = { lat: number; lng: number };

// GeoJSON LineString minimal — suffisant pour ce qu'on stocke/affiche,
// pas besoin du type complet du package geojson pour un seul usage.
export type GeometrieLigne = {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat], convention GeoJSON/ORS
};

const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/foot-walking/geojson";
const DELAI_MAX_MS = 10_000;

export async function calculerTraceReel(points: Point[]): Promise<GeometrieLigne | null> {
  if (points.length < 2) return null;

  const cle = process.env.ORS_API_KEY;
  if (!cle) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELAI_MAX_MS);

  try {
    const reponse = await fetch(ORS_DIRECTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: cle,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: points.map((p) => [p.lng, p.lat]),
      }),
      signal: controller.signal,
    });

    if (!reponse.ok) {
      return null;
    }

    const donnees = await reponse.json();
    const geometrie = donnees?.features?.[0]?.geometry;
    if (
      !geometrie ||
      geometrie.type !== "LineString" ||
      !Array.isArray(geometrie.coordinates) ||
      geometrie.coordinates.length === 0
    ) {
      return null;
    }

    return geometrie as GeometrieLigne;
  } catch {
    // Réseau indisponible, timeout (AbortError), JSON invalide... tout se
    // traite pareil : pas de tracé réel cette fois, repli sur la ligne
    // droite côté UI.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
