import type { MetadataRoute } from "next";

// start_url = /login (pas /) : l'icône installée sur l'écran d'accueil
// sert l'espace bénévole, pas la vitrine publique — demandé par le
// client (16/09), confondait "PWA toujours déconnectée" avec le fait que
// l'app ouvrait la page publique plutôt que l'espace bénévole. /login
// redirige déjà vers /dashboard si une session valide existe (voir
// src/app/(app)/login/page.tsx), donc ça couvre les deux cas (connecté
// ou pas) sans logique supplémentaire ici. Le site public reste
// accessible normalement par son URL dans un navigateur classique — ce
// changement n'affecte que le point d'entrée de l'icône installée.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Les Anges de la Baie de Nice",
    short_name: "ABN",
    description:
      "Application métier des Anges de la Baie de Nice — coordination des maraudes et de l'aide aux personnes sans-abri.",
    start_url: "/login",
    display: "standalone",
    background_color: "#0B3D91",
    theme_color: "#0B3D91",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
