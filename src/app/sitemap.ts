import type { MetadataRoute } from "next";

// Étape 10 (SEO) — seulement les pages publiques du site vitrine (pas
// l'espace bénévole, pas /login /signup — non pertinents pour le
// référencement, voir aussi robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://abn-theta-murex.vercel.app";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/recrutement`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/dons`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
