import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { TYPE_ACTIONS, type TypeAction } from "@/lib/type-action";
import type { CategorieDepense } from "@/lib/categorie-depense";
import type { OrganismeOrientation } from "@/lib/organisme-orientation";
import type { CategorieBesoin } from "@/lib/categorie-besoin";

// Agrégation partagée entre la page /dashboard/rapports et son export
// (.xlsx) — un seul endroit pour ne pas faire diverger les deux. RLS sur
// points_passage_geo/tickets_depense fait déjà toute la restriction de
// scope (Admin voit tout, Manager voit tout depuis la migration
// 20260912240000) : cette fonction ne fait qu'agréger ce que la requête
// renvoie, aucune logique de permission ici.
export async function getRapportsData(
  supabase: SupabaseClient,
  { from, to, isAdmin }: { from?: string; to?: string; isAdmin: boolean },
) {
  let pointsQuery = supabase
    .from("points_passage_geo")
    .select("type_action, compteur, horodatage, lat, lng, orientation_vers, orientation_vers_autre")
    .limit(5000);

  if (from) pointsQuery = pointsQuery.gte("horodatage", from);
  if (to) pointsQuery = pointsQuery.lte("horodatage", `${to}T23:59:59`);

  const { data: points } = await pointsQuery;

  const totals: Record<TypeAction, number> = {
    repas_distribue: 0,
    personne_rencontree: 0,
    personne_aidee: 0,
    orientation_sociale: 0,
  };

  const dailyMap = new Map<
    string,
    { label: string; totaux: Record<TypeAction, number> }
  >();

  const orientationsMap = new Map<OrganismeOrientation, number>();

  for (const p of points ?? []) {
    const type = p.type_action as TypeAction;
    const compteur = p.compteur as number;
    totals[type] = (totals[type] ?? 0) + compteur;

    const d = new Date(p.horodatage as string);
    const iso = d.toISOString().slice(0, 10);
    if (!dailyMap.has(iso)) {
      dailyMap.set(iso, {
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        totaux: {
          repas_distribue: 0,
          personne_rencontree: 0,
          personne_aidee: 0,
          orientation_sociale: 0,
        },
      });
    }
    dailyMap.get(iso)!.totaux[type] += compteur;

    if (type === "orientation_sociale" && p.orientation_vers) {
      const organisme = p.orientation_vers as OrganismeOrientation;
      orientationsMap.set(organisme, (orientationsMap.get(organisme) ?? 0) + compteur);
    }
  }

  // Trié du plus fréquent au moins fréquent — plus lisible en graphique
  // qu'un ordre alphabétique ou l'ordre de l'enum.
  const orientationsData = [...orientationsMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([organisme, total]) => ({ organisme, total }));

  const activiteData = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, { label, totaux }]) => ({ iso, date: label, ...totaux }));

  const heatmapPoints = (points ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
    typeAction: p.type_action as TypeAction,
    horodatage: p.horodatage as string,
    orientationVers: p.orientation_vers as OrganismeOrientation | null,
    orientationVersAutre: p.orientation_vers_autre as string | null,
  }));

  let depensesData: { categorie: CategorieDepense; total: number }[] = [];
  if (isAdmin) {
    let ticketsQuery = supabase
      .from("tickets_depense")
      .select("categorie, montant, created_at");

    if (from) ticketsQuery = ticketsQuery.gte("created_at", from);
    if (to) ticketsQuery = ticketsQuery.lte("created_at", `${to}T23:59:59`);

    const { data: tickets } = await ticketsQuery;
    const parCategorie = new Map<CategorieDepense, number>();
    for (const t of tickets ?? []) {
      const cat = t.categorie as CategorieDepense;
      parCategorie.set(cat, (parCategorie.get(cat) ?? 0) + (t.montant as number));
    }
    depensesData = [...parCategorie.entries()].map(([categorie, total]) => ({
      categorie,
      total,
    }));
  }

  // Besoins signalés (retour utilisateur, 12/09) : aide à anticiper les
  // achats. Visible à Admin et Manager (RLS besoins_signales_select_...
  // laisse déjà tout Manager voir tous les besoins, même raisonnement que la
  // heatmap — la planification d'achats concerne toute l'association).
  let besoinsQuery = supabase
    .from("besoins_signales")
    .select("categorie, created_at");

  if (from) besoinsQuery = besoinsQuery.gte("created_at", from);
  if (to) besoinsQuery = besoinsQuery.lte("created_at", `${to}T23:59:59`);

  const { data: besoins } = await besoinsQuery;
  const parCategorieBesoin = new Map<CategorieBesoin, number>();
  for (const b of besoins ?? []) {
    const cat = b.categorie as CategorieBesoin;
    parCategorieBesoin.set(cat, (parCategorieBesoin.get(cat) ?? 0) + 1);
  }
  const besoinsData = [...parCategorieBesoin.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([categorie, total]) => ({ categorie, total }));

  return { totals, activiteData, heatmapPoints, depensesData, orientationsData, besoinsData };
}

export { TYPE_ACTIONS };
