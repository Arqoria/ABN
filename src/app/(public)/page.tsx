import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Compass,
  Globe,
  HeartHandshake,
  MessageCircle,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";
import { CATEGORIE_BESOIN_ICONS } from "@/lib/categorie-besoin-icons";

const CONTACT_EMAIL = "lesangesdelabaiedenice@gmail.com";

// Page d'accueil du site vitrine — Étape 10, v3 (refonte visuelle avec
// photos). '/' servait un redirect vers /login jusqu'ici, voir git blame de
// src/app/page.tsx (supprimé).
//
// Règle inchangée depuis la v1 : aucun chiffre ni témoignage inventé.
// - Bandeau chiffres clés : bénévoles actifs + maraudes réalisées + repas
//   distribués = compteurs RÉELS et LIVE (impact_public, migration
//   20260913060000).
// - Besoins matériels (besoins_publics, migration 20260912270000) : mêmes
//   données réelles que /dons.
// - Témoignage bénévole, présentation détaillée, réseaux sociaux, mentions
//   légales : volontairement absents, en attente de vrai contenu fourni par
//   l'association — jamais de contenu inventé à leur place.
// - Photos : vraies photos de l'association (récupérées par le client depuis
//   son propre Instagram, triées ensemble), hébergées en local
//   (public/images/) — jamais de photo de bénéficiaire reconnaissable
//   (anonymat strict, voir CLAUDE.md).
//   Exception : orientation-sociale.jpg est une image générée par IA
//   (aucune photo trouvée du 115 qui soit à la fois pertinente et non
//   problématique — voir discussion en session) — volontairement une
//   scène objet/téléphone sans personne, pour ne pas se faire passer pour
//   un moment réel documenté de l'association.
//
// SEO : metadata dédiée à cette page (remplace la description générique
// "app métier" du layout racine, pas adaptée à une page publique) +
// JSON-LD Organization (données réelles uniquement — pas de sameAs
// réseaux sociaux tant qu'on n'a pas de liens confirmés, voir
// docs/Tasks.md).
export const metadata: Metadata = {
  title: "Les Anges de la Baie de Nice — Maraudes solidaires à Nice",
  description:
    "Association de solidarité à Nice depuis 2014 : maraudes hebdomadaires auprès des personnes en situation d'errance et de précarité. Devenez bénévole ou faites un don.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Les Anges de la Baie de Nice",
    description:
      "Maraudes solidaires hebdomadaires à Nice depuis 2014 — repas, écoute, orientation sociale.",
    url: "/",
    siteName: "Les Anges de la Baie de Nice",
    locale: "fr_FR",
    type: "website",
    images: ["/images/hero-nuit.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Les Anges de la Baie de Nice",
    description:
      "Maraudes solidaires hebdomadaires à Nice depuis 2014 — repas, écoute, orientation sociale.",
    images: ["/images/hero-nuit.jpg"],
  },
};

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "Les Anges de la Baie de Nice",
  description:
    "Association de solidarité à Nice — maraudes hebdomadaires auprès des personnes en situation d'errance et de précarité : repas, écoute, orientation sociale.",
  foundingDate: "2014",
  areaServed: {
    "@type": "City",
    name: "Nice",
  },
  email: CONTACT_EMAIL,
};

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
      {/* JSON-LD : un seul <h1> par page (bonne pratique SEO/accessibilité) —
          ici le nom de l'association, le plus visible (retour client :
          doit dominer visuellement) ; le slogan en dessous est un <h2>,
          en sous-titre plus discret. Les paragraphes suivants restent des
          <p>, avec la taille de police voulue par le client appliquée en
          classes — jamais un vrai titre H3/H4 sur du texte de paragraphe
          (casse la navigation par titres des lecteurs d'écran). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      {/* Hero — compact (retour client : version précédente trop haute) */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr] md:items-center lg:py-14">
        <div className="flex flex-col gap-4">
          <Badge variant="secondary" className="w-fit">
            Solidarité à Nice
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl lg:text-5xl">
            Les Anges de la Baie de Nice
          </h1>
          <h2 className="text-xl font-medium text-muted-foreground sm:text-2xl">
            Aller à la rencontre. Créer du lien. Agir.
          </h2>
          <p className="text-muted-foreground">
            Depuis 2014, Les Anges de la Baie de Nice vont à la rencontre des
            personnes en situation d&apos;errance et de précarité à travers
            des maraudes hebdomadaires dans le centre de Nice.
          </p>
          <p className="text-muted-foreground">
            Parce qu&apos;un échange, une présence ou un soutien peuvent être
            le premier pas vers une nouvelle dynamique.
          </p>
          <p className="font-medium text-foreground">
            Chaque semaine, nous sommes sur le terrain.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12">
              <Link href="/recrutement">Je me porte volontaire</Link>
            </Button>
            <Button asChild variant="secondary" className="h-12">
              <Link href="/dons">Faire un don</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl shadow-lg md:mx-auto md:max-w-none">
          <Image
            src="/images/hero-nuit.jpg"
            alt="Équipe de bénévoles des Anges de la Baie de Nice avec des kits d'hygiène"
            fill
            priority
            sizes="(min-width: 768px) 35vw, 90vw"
            className="object-cover"
          />
        </div>
      </div>

      {/* Bandeau chiffres clés — fond photo de la Promenade des Anglais
          (réponse au nom "Baie des Anges", ancrage visuel Nice réel) */}
      <div className="relative overflow-hidden px-4 py-10 text-white sm:px-6 lg:py-14">
        <Image
          src="/images/promenade.jpg"
          alt=""
          fill
          aria-hidden="true"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-navy/85" />
        <div className="relative mx-auto grid w-full max-w-3xl grid-cols-1 gap-8 text-center sm:grid-cols-3 lg:max-w-4xl">
          <div className="flex flex-col items-center gap-1">
            <Users className="size-7 text-brand-coral" aria-hidden="true" />
            <span className="text-3xl font-semibold">{benevolesActifs}</span>
            <span className="text-sm text-white/70">
              {benevolesActifs === 1 ? "bénévole actif" : "bénévoles actifs"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <CalendarDays className="size-7 text-brand-coral" aria-hidden="true" />
            <span className="text-3xl font-semibold">{maraudesRealisees}</span>
            <span className="text-sm text-white/70">
              {maraudesRealisees === 1 ? "maraude réalisée" : "maraudes réalisées"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <UtensilsCrossed className="size-7 text-brand-coral" aria-hidden="true" />
            <span className="text-3xl font-semibold">{repasDistribues}</span>
            <span className="text-sm text-white/70">
              {repasDistribues === 1 ? "repas distribué" : "repas distribués"}
            </span>
          </div>
        </div>
      </div>

      {/* Nos actions sur le terrain */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16 sm:px-6 lg:max-w-5xl lg:py-24 xl:max-w-6xl">
        <h2 className="text-center text-2xl font-semibold text-foreground lg:text-3xl">
          Nos actions sur le terrain
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md">
            <div className="relative aspect-video w-full">
              <Image
                src="/images/repas-chaud.jpg"
                alt="Denrées alimentaires (lait, huile, pain) préparées pour la distribution"
                fill
                sizes="(min-width: 640px) 33vw, 90vw"
                className="object-cover"
              />
            </div>
            <CardContent className="flex flex-col items-center gap-2 pt-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <UtensilsCrossed className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="font-medium text-foreground">
                Distribution alimentaire & repas chauds
              </h3>
              <p className="text-sm text-muted-foreground">
                Repas chauds, boissons chaudes, kits d&apos;hygiène, sacs de
                couchage.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <div className="relative aspect-video w-full">
              <Image
                src="/images/lien-social.jpg"
                alt="Bénévole en conversation avec une personne rencontrée en maraude (visage flouté)"
                fill
                sizes="(min-width: 640px) 33vw, 90vw"
                className="object-cover"
              />
            </div>
            <CardContent className="flex flex-col items-center gap-2 pt-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <HeartHandshake className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="font-medium text-foreground">Lien social et écoute</h3>
              <p className="text-sm text-muted-foreground">
                Présence bienveillante, discuter, redonner de la dignité.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <div className="relative aspect-video w-full">
              <Image
                src="/images/orientation-sociale.jpg"
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 640px) 33vw, 90vw"
                className="object-cover"
              />
            </div>
            <CardContent className="flex flex-col items-center gap-2 pt-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <Compass className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="font-medium text-foreground">Orientation sociale</h3>
              <p className="text-sm text-muted-foreground">
                Aiguillage vers les accueils de jour, le 115 et les structures
                partenaires niçoises.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <div className="relative aspect-video w-full">
              <Image
                src="/images/action-humanitaire.jpg"
                alt="Chantier solidaire mené par l'association dans le cadre d'une mission humanitaire à l'international"
                fill
                sizes="(min-width: 640px) 33vw, 90vw"
                className="object-cover"
              />
            </div>
            <CardContent className="flex flex-col items-center gap-2 pt-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <Globe className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 className="font-medium text-foreground">Action humanitaire</h3>
              <p className="text-sm text-muted-foreground">
                Interventions solidaires à l&apos;international, au-delà des
                maraudes niçoises.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment se passe une maraude ? */}
      <div className="border-t border-border bg-muted/50 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid w-full max-w-5xl gap-10 lg:max-w-6xl lg:grid-cols-2 lg:items-center">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg order-2 lg:order-1">
            <Image
              src="/images/equipe-maraude.jpg"
              alt="Équipe de bénévoles préparant les sacs de dons avant une maraude"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <h2 className="text-2xl font-semibold text-foreground lg:text-3xl">
              Comment se passe une maraude ?
            </h2>
            <ol className="flex flex-col gap-5">
              <li className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  <ClipboardList className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-foreground">Briefing</p>
                  <p className="text-sm text-muted-foreground">
                    Préparation et répartition des rôles avant le départ.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  <Users className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-foreground">Tournée en équipe</p>
                  <p className="text-sm text-muted-foreground">
                    Vous n&apos;êtes jamais seul — toujours en équipe.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  <MessageCircle className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-foreground">Débriefing</p>
                  <p className="text-sm text-muted-foreground">
                    Retour sur la soirée en fin de maraude.
                  </p>
                </div>
              </li>
            </ol>
            <Button asChild className="h-12 w-fit">
              <Link href="/recrutement">Rejoindre la prochaine maraude</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Faire un don */}
      <div className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:max-w-3xl">
          <h2 className="text-center text-2xl font-semibold text-foreground lg:text-3xl">
            Faire un don
          </h2>
          <p className="text-center text-sm text-muted-foreground">
            Financier ou matériel — chaque don a un usage concret sur le
            terrain.
          </p>

          {besoins && besoins.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-foreground">
                Besoins matériels prioritaires du moment
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {besoins.map((b) => {
                  const categorie = b.categorie as CategorieBesoin;
                  const Icone = CATEGORIE_BESOIN_ICONS[categorie];
                  return (
                    <Badge key={categorie} variant="outline" className="h-8 gap-1.5 px-3 text-sm">
                      <Icone className="size-3.5 text-primary" aria-hidden="true" />
                      {CATEGORIE_BESOIN_LABELS[categorie] ?? categorie}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="h-12">
              <a href={`mailto:${CONTACT_EMAIL}`}>Faire un don financier</a>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link href="/dons">Voir tous les besoins</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
