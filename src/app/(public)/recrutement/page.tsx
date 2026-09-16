import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidatureForm } from "./candidature-form";

// Formulaire public de candidature bénévole — Étape 10. Server Action
// soumettreCandidature (RLS anon insert-only, jamais de lecture publique).
export default function RecrutementPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Devenir bénévole
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Laissez-nous vos coordonnées, un membre de l&apos;association vous
          recontactera pour vous présenter les maraudes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Votre candidature</CardTitle>
          <CardDescription>
            Aucune expérience requise — juste l&apos;envie de donner un peu de
            temps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CandidatureForm />
        </CardContent>
      </Card>
    </div>
  );
}
