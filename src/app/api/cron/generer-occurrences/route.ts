import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { genererOccurrencesPourToutesSeries } from "@/lib/generer-occurrences";

// Appelée une fois par jour par Vercel Cron (voir vercel.json) ; peut aussi
// être appelée manuellement (curl + en-tête Authorization) pour tester ou
// rattraper une série en retard. Aucune session utilisateur ici — c'est un
// job système, pas une action déclenchée par un Admin authentifié — donc
// pas de vérification de rôle possible ; la SEULE barrière est le secret
// partagé CRON_SECRET, vérifié ci-dessous AVANT d'utiliser le client
// service_role (même principe que "vérifier caller.roles avant
// createAdminClient()" dans lib/actions/comptes.ts, juste avec un secret
// à la place d'une session).
export async function GET(req: Request) {
  const secretAttendu = process.env.CRON_SECRET;
  if (!secretAttendu) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 500 });
  }

  const enTeteAuth = req.headers.get("authorization");
  if (enTeteAuth !== `Bearer ${secretAttendu}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resultat = await genererOccurrencesPourToutesSeries(supabase);

  return NextResponse.json(resultat, { status: resultat.erreurs.length > 0 ? 207 : 200 });
}
