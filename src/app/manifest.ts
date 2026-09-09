import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Les Anges de la Baie de Nice",
    short_name: "ABN",
    description:
      "Application métier des Anges de la Baie de Nice — coordination des maraudes et de l'aide aux personnes sans-abri.",
    start_url: "/",
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
