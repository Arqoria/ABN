// Module neutre (pas de "use server"/server-only) — même raison que les
// autres modules src/lib/categorie-*.ts. Convertit une date+heure "murale"
// Europe/Paris en instant UTC réel, conscient du changement d'heure
// (CET/CEST) — nécessaire car les occurrences générées par le cron
// (environnement Vercel en UTC, aucun fuseau navigateur disponible) doivent
// tomber à la bonne heure locale toute l'année, pas seulement en hiver ou
// en été.
//
// Pas de nouvelle dépendance (date-fns-tz, luxon...) : Intl.DateTimeFormat
// avec timeZone: "Europe/Paris" suffit pour lire le décalage UTC réel à une
// date donnée.

function decalageParisEnMinutes(dateIso: string): number {
  // Sonde à midi UTC pour rester loin de la bascule DST (toujours à 1h/2h
  // du matin en France) — le décalage lu reste valable pour toute la
  // journée locale visée.
  const sonde = new Date(`${dateIso}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
  }).formatToParts(sonde);
  const nomZone = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const correspondance = nomZone.match(/GMT([+-]\d+)/);
  const heures = correspondance ? parseInt(correspondance[1], 10) : 1;
  return heures * 60;
}

// dateIso: "YYYY-MM-DD", heure: "HH:MM" (ou "HH:MM:SS") — heure murale
// Europe/Paris. Retourne l'instant UTC réel correspondant.
export function parisVersUtc(dateIso: string, heure: string): Date {
  const heureNormalisee = heure.length === 5 ? `${heure}:00` : heure;
  const decalage = decalageParisEnMinutes(dateIso);
  const instantNaif = new Date(`${dateIso}T${heureNormalisee}Z`);
  return new Date(instantNaif.getTime() - decalage * 60_000);
}
