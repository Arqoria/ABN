import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Page d'accueil du site vitrine — Étape 10. '/' servait un redirect vers
// /login jusqu'ici (le temps que cette page existe), voir git blame de
// src/app/page.tsx (supprimé) et docs/Tasks.md.
//
// Contenu volontairement minimal et strictement factuel (nom, activité
// réelle de l'association telle que décrite dans docs/Specs.md/CLAUDE.md,
// aucun chiffre ni témoignage inventé) — la présentation détaillée
// (histoire, équipe, photos) attend les vrais textes de l'association.
export default function AccueilPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Les Anges de la Baie de Nice
        </h1>
        <p className="text-lg text-muted-foreground">
          Association de solidarité à Nice — maraudes auprès des personnes
          sans-abri : repas, écoute, orientation sociale.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Devenir bénévole</CardTitle>
            <CardDescription>
              Rejoignez une maraude : distribution de repas, présence et
              écoute, orientation vers les bons organismes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-12 w-full">
              <Link href="/recrutement">Je me porte volontaire</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faire un don</CardTitle>
            <CardDescription>
              Financier ou matériel — chaque don a un usage concret sur le
              terrain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="h-12 w-full">
              <Link href="/dons">Voir comment aider</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

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
  );
}
