import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";
import { CATEGORIE_BESOIN_EXEMPLES, CATEGORIE_BESOIN_ICONS } from "@/lib/categorie-besoin-icons";

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
//
// Perf (15/09) : createPublicClient() + revalidate — même correctif que
// l'accueil, voir son commentaire d'en-tête et docs/Tasks.md.
export const revalidate = 60;

export default async function DonsPage() {
  const supabase = createPublicClient();
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {besoins.map((b) => {
                const categorie = b.categorie as CategorieBesoin;
                const Icone = CATEGORIE_BESOIN_ICONS[categorie];
                return (
                  <Card key={categorie}>
                    <CardContent className="flex flex-col items-center gap-1.5 py-4 text-center">
                      <Icone className="size-6 text-primary" aria-hidden="true" />
                      <span className="text-sm font-medium text-foreground">
                        {CATEGORIE_BESOIN_LABELS[categorie] ?? categorie}
                      </span>
                      {CATEGORIE_BESOIN_EXEMPLES[categorie] && (
                        <span className="text-xs text-muted-foreground">
                          {CATEGORIE_BESOIN_EXEMPLES[categorie]}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {b.total as number} signalement{(b.total as number) > 1 ? "s" : ""}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          <Button asChild className="h-12">
            <a href={`mailto:${CONTACT_EMAIL}`}>Proposer un don matériel</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
