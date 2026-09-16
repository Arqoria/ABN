"use client";

import { useActionState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ajouterMouvementDenree } from "@/lib/actions/stocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MouvementDenreeForm({
  maraudes,
}: {
  maraudes: { id: string; date_heure: string }[];
}) {
  const [state, action, pending] = useActionState(ajouterMouvementDenree, undefined);
  const queryClient = useQueryClient();
  const isFirstRender = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!state?.error) {
      queryClient.invalidateQueries({ queryKey: ["cuisine"] });
      formRef.current?.reset();
    }
  }, [state, queryClient]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nom">Denrée</Label>
          <Input id="nom" name="nom" placeholder="Ex. « Riz »" required className="h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unite">Unité (facultatif)</Label>
          <Input id="unite" name="unite" placeholder="Ex. « kg »" className="h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type</Label>
          <Select name="type" defaultValue="entree" required>
            <SelectTrigger id="type" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entree">Entrée (don/achat reçu)</SelectItem>
              <SelectItem value="sortie">Sortie (utilisé)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantite">Quantité</Label>
          <Input id="quantite" name="quantite" type="number" min={1} step={1} required className="h-12" />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="maraudeId">Maraude (facultatif)</Label>
          <Select name="maraudeId">
            <SelectTrigger id="maraudeId" className="h-12">
              <SelectValue placeholder="Aucune" />
            </SelectTrigger>
            <SelectContent>
              {maraudes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {new Date(m.date_heure).toLocaleDateString("fr-FR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="motif">Motif (facultatif)</Label>
        <Input id="motif" name="motif" placeholder="Ex. « Achat en gros »" className="h-12" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="h-12">
          {pending ? "Enregistrement…" : "Enregistrer le mouvement"}
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
