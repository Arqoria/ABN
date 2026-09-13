import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";

const CONTACT_EMAIL = "lesangesdelabaiedenice@gmail.com";

// Dons matériels : lit directement la vue publique besoins_publics
// (migration 20260912270000_besoins_publics.sql — agrégat des besoins
// signalés par les bénévoles sur les 30 derniers jours, lisible sans
// authentification). Affiche les besoins RÉELS et actuels plutôt qu'une
// liste générique, comme prévu dès la préparation de cette passerelle.
//
// Dons financiers : en attente du compte HelloAsso (le Trésorier doit le
// créer lui-même, voir docs/Tasks.md) — la page reste prête à accueillir
// le module une fois les clés API disponibles, pas de contenu inventé
// entre-temps.
export default async function DonsPage() {
  const supabase = await createClient();
  const { data: besoins } = await supabase
    .from("besoins_publics")
    .select("categorie, total")
    .order("total", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16 sm:px-6 lg:max-w-3xl lg:py-24">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Faire un don
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Financier ou matériel, chaque don a un usage concret sur le
          terrain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dons financiers</CardTitle>
          <CardDescription>Bientôt disponible en ligne.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            En attendant la mise en ligne du paiement en ligne, contactez-nous
            directement pour faire un don :{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dons matériels</CardTitle>
          <CardDescription>
            Ce dont l&apos;association a besoin en ce moment (30 derniers
            jours).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!besoins || besoins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun besoin particulier signalé pour l&apos;instant — un don
              reste toujours utile, contactez-nous pour en discuter.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {besoins.map((b) => (
                <li
                  key={b.categorie as string}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {CATEGORIE_BESOIN_LABELS[b.categorie as CategorieBesoin] ??
                      (b.categorie as string)}
                  </span>
                  <span className="text-muted-foreground">
                    {b.total as number} signalement
                    {(b.total as number) > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button asChild className="h-12">
            <a href={`mailto:${CONTACT_EMAIL}`}>Proposer un don matériel</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
