// Silhouette discrète de la Baie des Anges (Promenade, coupole du Negresco,
// colline du Château, palmiers) — clin d'œil au nom de l'association, en
// arrière-plan du Hero. Dessin au trait uniquement (pas de remplissage),
// couleur = currentColor pour hériter de la couleur de texte du parent et
// rester cohérent en clair/sombre sans variante séparée à maintenir.
export function NiceSkyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Mer / courbe de la baie */}
        <path d="M0 356 C 250 344, 500 366, 800 352 S 1350 340, 1600 358" />
        <path d="M0 380 C 300 372, 600 388, 900 378 S 1300 366, 1600 382" opacity="0.5" />

        {/* Colline du Château + petite tour (Tour Bellanda, stylisée) */}
        <path d="M1260 356 C 1300 300, 1340 220, 1410 190 C 1460 168, 1500 200, 1520 240 C 1545 288, 1560 322, 1600 340" />
        <rect x="1388" y="150" width="30" height="42" />
        <path d="M1385 150 L1403 128 L1421 150" />

        {/* Immeubles Belle Époque le long de la Promenade */}
        <path d="M140 356 V270 H210 V356" />
        <path d="M230 356 V290 H285 V356" />
        <path d="M305 356 V255 H375 V356" />
        <path d="M395 356 V285 H450 V356" />

        {/* Coupole du Negresco, stylisée */}
        <path d="M520 356 V260 H630 V356" />
        <path d="M520 260 A55 55 0 0 1 630 260" />
        <line x1="575" y1="205" x2="575" y2="185" />
        <path d="M567 185 L575 170 L583 185" />

        <path d="M660 356 V275 H725 V356" />
        <path d="M745 356 V245 H815 V356" />
        <path d="M835 356 V295 H900 V356" />
        <path d="M920 356 V265 H985 V356" />
        <path d="M1005 356 V285 H1070 V356" />
        <path d="M1090 356 V250 H1160 V356" />
        <path d="M1180 356 V300 H1235 V356" />

        {/* Palmiers */}
        {[170, 470, 690, 960, 1230].map((x, i) => (
          <g key={x} opacity={i % 2 === 0 ? 1 : 0.6}>
            <path d={`M${x} 356 C ${x - 4} 320, ${x + 6} 300, ${x} 275`} />
            <path d={`M${x} 275 C ${x - 30} 260, ${x - 42} 268, ${x - 50} 250`} />
            <path d={`M${x} 275 C ${x - 16} 250, ${x - 20} 235, ${x - 14} 215`} />
            <path d={`M${x} 275 C ${x + 2} 245, ${x - 2} 228, ${x + 8} 210`} />
            <path d={`M${x} 275 C ${x + 20} 252, ${x + 26} 236, ${x + 22} 216`} />
            <path d={`M${x} 275 C ${x + 32} 262, ${x + 44} 270, ${x + 52} 254`} />
          </g>
        ))}
      </g>
    </svg>
  );
}
