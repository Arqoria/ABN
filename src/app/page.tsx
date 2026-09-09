import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import {
  HeartHandshake,
  MapPinned,
  Users,
  Soup,
  Siren,
  ArrowRight,
} from "lucide-react";

const brandColors = [
  {
    name: "Bleu nuit",
    role: "Marque / Header",
    className: "bg-brand-navy",
    hex: "#0B3D91",
  },
  {
    name: "Bleu principal",
    role: "Liens / Infos",
    className: "bg-brand-blue",
    hex: "#1E88E5",
  },
  {
    name: "Orange corail",
    role: "Boutons d'action (CTA)",
    className: "bg-brand-coral",
    hex: "#FF683D",
  },
  {
    name: "Anthracite",
    role: "Textes principaux",
    className: "bg-brand-anthracite",
    hex: "#1F2937",
  },
  {
    name: "Bleu pastel",
    role: "Fonds secondaires",
    className: "bg-brand-pastel border border-border",
    hex: "#E6F4FC",
    darkText: true,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-brand-navy px-4 py-3 text-white shadow-sm sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F5F7FA] p-1.5 shadow-sm">
            <Image
              src="/logo-abn-icon.png"
              alt="Logo Les Anges de la Baie"
              width={28}
              height={32}
              className="h-full w-auto"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide sm:text-base">
              Les Anges de la Baie
            </p>
            <p className="text-xs text-white/70">Styleguide &amp; Dashboard</p>
          </div>
        </div>
        <ModeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
        {/* Intro */}
        <section className="flex flex-col gap-3">
          <Badge className="w-fit" variant="secondary">
            Design system — v0.1
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Charte graphique &amp; composants
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Cette page valide l&apos;intégration de notre identité visuelle
            dans le design system (Next.js, Tailwind CSS, shadcn/ui). Pensée
            pour une utilisation de jour comme de nuit, sur le terrain.
          </p>
        </section>

        <Separator />

        {/* Couleurs */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">Couleurs</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {brandColors.map((color) => (
              <div key={color.hex} className="flex flex-col gap-2">
                <div
                  className={`h-20 w-full rounded-lg shadow-sm ${color.className}`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {color.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {color.role}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {color.hex}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Typographie */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            Typographie
          </h2>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-foreground">
              Titre H1 — Les Anges de la Baie
            </h1>
            <h2 className="text-2xl font-semibold text-foreground">
              Titre H2 — Planning des maraudes
            </h2>
            <h3 className="text-lg font-semibold text-foreground">
              Titre H3 — Carnet de transmission
            </h3>
            <p className="text-foreground">
              Texte courant en Anthracite : lisible de jour comme de nuit,
              avec un contraste soigné pour un usage terrain.
            </p>
            <p className="text-sm text-muted-foreground">
              Texte secondaire / muted — informations complémentaires,
              horodatage, notes internes.
            </p>
            <a
              href="#"
              className="text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Lien texte (bleu principal) →
            </a>
          </div>
        </section>

        <Separator />

        {/* Boutons */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">Boutons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Action principale
              <ArrowRight />
            </Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Contour</Button>
            <Button variant="ghost">Discret</Button>
            <Button variant="destructive">Urgence / Suppression</Button>
            <Button variant="link">Lien</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Petit</Button>
            <Button size="default">Par défaut</Button>
            <Button size="lg">Grand</Button>
            <Button size="icon" aria-label="Alerte SOS" variant="destructive">
              <Siren />
            </Button>
            <Button disabled>Désactivé</Button>
          </div>
        </section>

        <Separator />

        {/* Badges & contrôles */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            Badges &amp; contrôles
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Urgente</Badge>
            <Badge variant="secondary">À faire</Badge>
            <Badge variant="outline">Moyenne</Badge>
            <Badge variant="destructive">Incident</Badge>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch id="notif" defaultChecked />
              <label htmlFor="notif" className="text-sm text-foreground">
                Notifications de maraude
              </label>
            </div>
            <div className="flex -space-x-2">
              <Avatar className="ring-2 ring-background">
                <AvatarImage src="/logo-abn-icon.png" alt="Bénévole" />
                <AvatarFallback>LA</AvatarFallback>
              </Avatar>
              <Avatar className="ring-2 ring-background">
                <AvatarFallback className="bg-brand-blue text-white">
                  JM
                </AvatarFallback>
              </Avatar>
              <Avatar className="ring-2 ring-background">
                <AvatarFallback className="bg-brand-coral text-white">
                  SR
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </section>

        <Separator />

        {/* Cartes */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">Cartes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPinned className="size-5 text-accent" />
                  <CardTitle>Prochaine maraude</CardTitle>
                </div>
                <CardDescription>Ce soir · 19h30 · Promenade des Anglais</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  8 places disponibles sur 12. Départ du local ABN.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  Je participe
                  <ArrowRight />
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-accent" />
                  <CardTitle>Bénévoles actifs</CardTitle>
                </div>
                <CardDescription>Cette semaine</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">24</p>
                <p className="text-sm text-muted-foreground">
                  +3 par rapport à la semaine dernière
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Soup className="size-5 text-accent" />
                  <CardTitle>Plats du soir</CardTitle>
                </div>
                <CardDescription>Récapitulatif équipe cuisine</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="secondary">42 portions</Badge>
                <Badge variant="outline">Végé x 12</Badge>
                <Badge variant="outline">Sans gluten x 4</Badge>
              </CardContent>
            </Card>
          </div>

          <Card className="border-brand-coral/30 bg-brand-coral/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HeartHandshake className="size-5 text-primary" />
                <CardTitle>Appel aux dons — Kit hiver</CardTitle>
              </div>
              <CardDescription>
                Couvertures, bonnets et boissons chaudes pour les maraudes de
                nuit.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex gap-3">
              <Button>
                Faire un don
                <ArrowRight />
              </Button>
              <Button variant="outline">En savoir plus</Button>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        <footer className="flex flex-col gap-1 pb-6 text-xs text-muted-foreground">
          <p>Les Anges de la Baie de Nice — Application interne (PWA)</p>
          <p>Charte graphique intégrée · Mode clair / sombre disponible</p>
        </footer>
      </main>
    </div>
  );
}
