import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { TYPE_ACTIONS, TYPE_LABELS } from "@/lib/type-action";
import { CATEGORIE_LABELS } from "@/lib/categorie-depense";
import { getRapportsData } from "@/lib/rapports";

// Export .xlsx des mêmes données que /dashboard/rapports (même fonction
// d'agrégation, src/lib/rapports.ts — jamais de divergence entre ce qui
// s'affiche et ce qui s'exporte). Alimente le template de rendu final pour
// les financeurs (Canva/Gamma, hors périmètre applicatif — décision
// utilisateur du 12/09, voir docs/Tasks.md).
//
// Route Handler et non Server Action : une Server Action ne peut pas
// renvoyer un fichier binaire avec ses propres en-têtes HTTP
// (Content-Type/Content-Disposition) pour déclencher un téléchargement.
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.redirect(new URL("/compte-en-attente", request.url));
  }
  const isAdmin = profile.roles.includes("admin");
  if (!isAdmin && !profile.roles.includes("manager")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const supabase = await createClient();
  const { totals, activiteData, depensesData } = await getRapportsData(supabase, {
    from,
    to,
    isAdmin,
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Les Anges de la Baie de Nice";
  workbook.created = new Date();

  const periode =
    from || to ? `Du ${from ?? "…"} au ${to ?? "…"}` : "Tout l'historique";

  const compteurs = workbook.addWorksheet("Compteurs");
  compteurs.addRow(["Période", periode]);
  compteurs.addRow([]);
  compteurs.addRow(["Type d'action", "Total"]).font = { bold: true };
  for (const type of TYPE_ACTIONS) {
    compteurs.addRow([TYPE_LABELS[type], totals[type] ?? 0]);
  }
  compteurs.getColumn(1).width = 28;
  compteurs.getColumn(2).width = 14;

  const activite = workbook.addWorksheet("Activité par jour");
  const enTetesActivite = ["Date", ...TYPE_ACTIONS.map((t) => TYPE_LABELS[t])];
  activite.addRow(enTetesActivite).font = { bold: true };
  for (const jour of activiteData) {
    activite.addRow([
      jour.date,
      jour.repas_distribue,
      jour.personne_rencontree,
      jour.personne_aidee,
      jour.orientation_sociale,
    ]);
  }
  activite.columns.forEach((col) => {
    col.width = 20;
  });

  if (isAdmin && depensesData.length > 0) {
    const depenses = workbook.addWorksheet("Dépenses par catégorie");
    depenses.addRow(["Catégorie", "Total (€)"]).font = { bold: true };
    for (const d of depensesData) {
      depenses.addRow([CATEGORIE_LABELS[d.categorie], Math.round(d.total * 100) / 100]);
    }
    depenses.getColumn(1).width = 22;
    depenses.getColumn(2).width = 14;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dateFichier = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rapport-abn-${dateFichier}.xlsx"`,
    },
  });
}
