import Link from "next/link";
import {
  ClipboardList,
  Compass,
  Footprints,
  HeartHandshake,
  MessageCircle,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";

// Page d'accueil du site vitrine — Étape 10. '/' servait un redirect vers
// /login jusqu'ici, voir git blame de src/app/page.tsx (supprimé).
//
// Structure v2 (bandeau d'impact + actions terrain + déroulé maraude + dons)
// décidée en session avec le client — voir docs/Tasks.md. Règle inchangée :
// aucun chiffre ni témoignage inventé.
// - Bandeau d'impact (impact_public, migration 20260913060000) : compteurs
//   RÉELS et LIVE — pas figés en dur, deviennent justes automatiquement dès
//   que l'association utilise vraiment l'app (pour l'instant ce sont des
//   données de test, le client en a été informé explicitement).
// - Besoins matériels (besoins_publics, migration 20260912270000) : mêmes
//   données réelles que /dons, prévisualisées ici.
// - Témoignage bénévole et présentation détaillée (histoire, équipe, photos,
//   réseaux sociaux) : volontairement absents, en attente de vrai contenu
//   fourni par l'association — jamais de contenu inventé à leur place.
function pluriel(n: number, singulier: string, pluriel: string) {
  return n === 1 ? singulier : pluriel;
}

export default async function AccueilPage() {
  const supabase = await createClient();

  const [{ data: impact }, { data: besoins }] = await Promise.all([
    supabase.from("impact_public").select("benevoles_actifs, maraudes_realisees, repas_distribues").single(),
    supabase.from("besoins_publics").select("categorie, total").order("total", { ascending: false }).limit(4),
  ]);

  const benevolesActifs = (impact?.benevoles_actifs as number | undefined) ?? 0;
  const maraudesRealisees = (impact?.maraudes_realisees as number | undefined) ?? 0;
  const repasDistribues = (impact?.repas_distribues as number | undefined) ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16 text-center sm:px-6 lg:max-w-4xl lg:py-24 xl:max-w-5xl 2xl:max-w-6xl">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Les Anges de la Baie de Nice
        </h1>
        <p className="text-lg text-muted-foreground">
          Association de solidarité à Nice — maraudes auprès des personnes
          sans-abri : repas, écoute, orientation sociale.
        </p>
      </div>

      {/* A. Bandeau d'impact — compteurs réels et live */}
      <div className="border-y border-border bg-brand-pastel/40 px-4 py-8 sm:px-6 lg:py-10">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6 text-center sm:grid-cols-3 lg:max-w-4xl lg:gap-10 xl:max-w-5xl 2xl:max-w-6xl">
          <div className="flex flex-col items-center gap-1">
            <Users className="size-6 text-primary" aria-hidden="true" />
            <span className="text-2xl font-semibold text-foreground">{benevolesActifs}</span>
            <span className="text-sm text-muted-foreground">
              {pluriel(benevolesActifs, "bénévole actif", "bénévoles actifs")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Footprints className="size-6 text-primary" aria-hidden="true" />
            <span className="text-2xl font-semibold text-foreground">{maraudesRealisees}</span>
            <span className="text-sm text-muted-foreground">
              {pluriel(maraudesRealisees, "maraude réalisée", "maraudes réalisées")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <UtensilsCrossed className="size-6 text-primary" aria-hidden="true" />
            <span className="text-2xl font-semibold text-foreground">{repasDistribues}</span>
            <span className="text-sm text-muted-foreground">
              {pluriel(repasDistribues, "repas distribué", "repas distribués")}
            </span>
          </div>
        </div>
      </div>

      {/* B. Nos actions sur le terrain */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16 sm:px-6 lg:max-w-5xl lg:py-24 xl:max-w-6xl 2xl:max-w-7xl">
        <h2 className="text-center text-2xl font-semibold text-foreground lg:text-3xl">
          Nos actions sur le terrain
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
          <Card>
            <CardHeader>
              <UtensilsCrossed className="size-6 text-primary" aria-hidden="true" />
              <CardTitle className="mt-2">Distribution alimentaire & vêtements</CardTitle>
              <CardDescription>
                Repas chauds, boissons chaudes, kits d&apos;hygiène, sacs de
                couchage.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <HeartHandshake className="size-6 text-primary" aria-hidden="true" />
              <CardTitle className="mt-2">Lien social et écoute</CardTitle>
              <CardDescription>
                Briser la solitude, discuter, redonner de la dignité.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Compass className="size-6 text-primary" aria-hidden="true" />
              <CardTitle className="mt-2">Orientation sociale</CardTitle>
              <CardDescription>
                Aiguillage vers les accueils de jour, le 115 et les structures
                partenaires niçoises.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* C. Comment se passe une maraude ? */}
      <div className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl">
          <h2 className="text-center text-2xl font-semibold text-foreground lg:text-3xl">
            Comment se passe une maraude ?
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
            <Card>
              <CardHeader>
                <ClipboardList className="size-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">1. Briefing</CardTitle>
                <CardDescription>
                  Préparation et répartition des rôles avant le départ.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Footprints className="size-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">2. Tournée en équipe</CardTitle>
                <CardDescription>
                  Vous n&apos;êtes jamais seul — toujours en équipe.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <MessageCircle className="size-6 text-primary" aria-hidden="true" />
                <CardTitle className="mt-2">3. Débriefing</CardTitle>
                <CardDescription>
                  Retour sur la soirée en fin de maraude.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="flex justify-center">
            <Button asChild className="h-12">
              <Link href="/recrutement">Je me porte volontaire</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* D. Besoins matériels & dons */}
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-16 sm:px-6 lg:max-w-3xl lg:py-24">
        <h2 className="text-center text-2xl font-semibold text-foreground lg:text-3xl">
          Faire un don
        </h2>
        <p className="text-center text-sm text-muted-foreground">
          Financier ou matériel — chaque don a un usage concret sur le
          terrain.
        </p>

        {besoins && besoins.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Besoins matériels du moment</CardTitle>
              <CardDescription>Signalés par les bénévoles ces 30 derniers jours.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <Button asChild variant="outline" className="h-12">
            <Link href="/dons">Voir comment aider</Link>
          </Button>
        </div>
      </div>

      {/* Déjà bénévole ? */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6 lg:max-w-3xl lg:pb-24">
        <Card>
          <CardHeader>
            <CardTitle>Déjà bénévole ?</CardTitle>
            <CardDescription>
              Accédez à votre espace pour vos maraudes, votre équipe et vos
              saisies terrain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="h-12">
              <Link href="/login">Se connecter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
