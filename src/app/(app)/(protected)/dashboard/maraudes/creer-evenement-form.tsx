"use client";

import { useActionState, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { creerMaraude } from "@/lib/actions/maraudes";
import { creerSerieEvenement } from "@/lib/actions/series-evenements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TypeEvenement = { id: string; nom: string };
type Manager = { id: string; full_name: string | null };

const JOURS_SEMAINE = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "0", label: "Dimanche" },
];

// Remplace CreerMaraudeForm (Partie C, 22/09) : un événement se crée
// désormais soit Ponctuel (une date, ancien comportement, inchangé côté
// données hormis type_evenement_id/max_participants maintenant requis),
// soit via une Série récurrente. Deux formulaires distincts plutôt qu'un
// seul bindé sur deux Server Actions différentes — chacun garde son propre
// useActionState, plus simple que de faire cohabiter 2 actions sous un
// state unique.
export function CreerEvenementForm({
  typesEvenement,
  managers,
}: {
  typesEvenement: TypeEvenement[];
  managers: Manager[];
}) {
  const [mode, setMode] = useState<"ponctuel" | "serie">("ponctuel");

  if (managers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun Manager actif disponible — valide d&apos;abord un compte avec le
        rôle Manager (
        <a href="/dashboard/adherents" className="underline underline-offset-4">
          Gestion des adhérents
        </a>
        ) avant de pouvoir créer un événement.
      </p>
    );
  }

  if (typesEvenement.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun type d&apos;événement actif — crée d&apos;abord un type (
        <a href="/dashboard/configuration" className="underline underline-offset-4">
          Configuration
        </a>
        ) avant de pouvoir créer un événement.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "ponctuel" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("ponctuel")}
        >
          Ponctuel
        </Button>
        <Button
          type="button"
          variant={mode === "serie" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("serie")}
        >
          Série récurrente
        </Button>
      </div>
      {mode === "ponctuel" ? (
        <CreerPonctuelForm typesEvenement={typesEvenement} managers={managers} />
      ) : (
        <CreerSerieForm typesEvenement={typesEvenement} managers={managers} />
      )}
    </div>
  );
}

function CreerPonctuelForm({
  typesEvenement,
  managers,
}: {
  typesEvenement: TypeEvenement[];
  managers: Manager[];
}) {
  const [state, action, pending] = useActionState(creerMaraude, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="typeEvenementId">Type d&apos;événement</Label>
          <Select name="typeEvenementId" required>
            <SelectTrigger id="typeEvenementId" className="h-12">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {typesEvenement.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateHeure">Date et heure</Label>
          <Input id="dateHeure" name="dateHeure" type="datetime-local" required className="h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="managerId">Manager</Label>
          <Select name="managerId" required>
            <SelectTrigger id="managerId" className="h-12">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name ?? "(sans nom)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxParticipants">Capacité</Label>
          <Input
            id="maxParticipants"
            name="maxParticipants"
            type="number"
            min={1}
            step={1}
            defaultValue={6}
            required
            className="h-12"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Création…" : "Créer"}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

function CreerSerieForm({
  typesEvenement,
  managers,
}: {
  typesEvenement: TypeEvenement[];
  managers: Manager[];
}) {
  const queryClient = useQueryClient();
  const [frequence, setFrequence] = useState("hebdomadaire");

  // La génération immédiate (côté serveur) crée des lignes maraudes — la
  // liste affichée sur cette page doit se rafraîchir après coup, même
  // principe que partout ailleurs dans ce projet (invalidateQueries après
  // une Server Action).
  const [state, action, pending] = useActionState(async (
    prevState: Awaited<ReturnType<typeof creerSerieEvenement>>,
    formData: FormData,
  ) => {
    const resultat = await creerSerieEvenement(prevState, formData);
    if (!resultat?.error) {
      queryClient.invalidateQueries({ queryKey: ["maraudes"] });
    }
    return resultat;
  }, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="serie-typeEvenementId">Type d&apos;événement</Label>
          <Select name="typeEvenementId" required>
            <SelectTrigger id="serie-typeEvenementId" className="h-12">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {typesEvenement.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="frequence">Fréquence</Label>
          <Select name="frequence" defaultValue="hebdomadaire" onValueChange={setFrequence} required>
            <SelectTrigger id="frequence" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hebdomadaire">Toutes les semaines</SelectItem>
              <SelectItem value="toutes_les_2_semaines">Toutes les 2 semaines</SelectItem>
              <SelectItem value="mensuelle_nieme_jour">Chaque mois (Nième jour)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="jourSemaine">Jour</Label>
          <Select name="jourSemaine" defaultValue="5" required>
            <SelectTrigger id="jourSemaine" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOURS_SEMAINE.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {frequence === "mensuelle_nieme_jour" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="niemeSemaineDuMois">Quelle semaine du mois</Label>
            <Select name="niemeSemaineDuMois" defaultValue="1" required>
              <SelectTrigger id="niemeSemaineDuMois" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1ère</SelectItem>
                <SelectItem value="2">2ème</SelectItem>
                <SelectItem value="3">3ème</SelectItem>
                <SelectItem value="4">4ème</SelectItem>
                <SelectItem value="-1">Dernière</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="heure">Heure</Label>
          <Input id="heure" name="heure" type="time" defaultValue="20:30" required className="h-12" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="managerIdDefaut">Manager par défaut</Label>
          <Select name="managerIdDefaut" required>
            <SelectTrigger id="managerIdDefaut" className="h-12">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {managers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name ?? "(sans nom)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="maxParticipantsDefaut">Capacité par défaut</Label>
          <Input
            id="maxParticipantsDefaut"
            name="maxParticipantsDefaut"
            type="number"
            min={1}
            step={1}
            defaultValue={6}
            className="h-12"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dateFin">Date de fin (facultatif)</Label>
          <Input id="dateFin" name="dateFin" type="date" className="h-12" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="limiterAuxVacancesScolaires" name="limiterAuxVacancesScolaires" />
        <Label htmlFor="limiterAuxVacancesScolaires">Limiter aux vacances scolaires uniquement</Label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Création…" : "Créer la série"}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
            {state.details ? ` (${state.details})` : ""}
          </p>
        )}
      </div>
    </form>
  );
}
