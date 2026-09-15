import type { MetadataRoute } from "next";

// Étape 10 (SEO) — rien n'existait avant. Interdit l'indexation de l'espace
// bénévole (données internes, pas du contenu public) et des routes d'auth ;
// le reste (site vitrine) est ouvert au crawl.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/compte-en-attente", "/auth/"],
    },
    sitemap: "https://abn-theta-murex.vercel.app/sitemap.xml",
  };
}
