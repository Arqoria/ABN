"use client";

import { useState, useTransition } from "react";
import { creerTicket } from "@/lib/actions/tickets";
import { CATEGORIE_LABELS, type CategorieDepense } from "@/lib/categorie-depense";
import { offlineDb } from "@/lib/offline/db";
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

const CATEGORIES = Object.keys(CATEGORIE_LABELS) as CategorieDepense[];

type Message = { type: "error" | "queued"; text: string };

// Hors-ligne (ou réseau indisponible au moment de l'envoi) : la saisie part
// dans la file d'attente locale (Dexie/IndexedDB, photo comprise — un
// Blob/File se stocke nativement en IndexedDB) au lieu d'appeler la Server
// Action, et sera rejouée automatiquement au retour du réseau — Étape 8.
export function TicketForm({ maraudeId }: { maraudeId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const montant = Number(formData.get("montant"));
    const categorie = formData.get("categorie");
    const photo = formData.get("photo");

    if (!Number.isFinite(montant) || montant <= 0) {
      setMessage({ type: "error", text: "Montant invalide." });
      return;
    }
    if (typeof categorie !== "string" || !categorie) {
      setMessage({ type: "error", text: "Choisissez une catégorie." });
      return;
    }
    if (!(photo instanceof File) || photo.size === 0) {
      setMessage({ type: "error", text: "Une photo du ticket est requise." });
      return;
    }

    startTransition(async () => {
      const queueOffline = async () => {
        await offlineDb.pendingTickets.add({
          maraudeId,
          montant,
          categorie: categorie as CategorieDepense,
          photo,
          photoName: photo.name,
          createdAt: Date.now(),
        });
        form.reset();
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOffline();
        setMessage({
          type: "queued",
          text: "Hors ligne : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
        return;
      }

      try {
        const result = await creerTicket(undefined, formData);
        if (result?.error) {
          setMessage({ type: "error", text: result.error });
          return;
        }
        setMessage(null);
        form.reset();
      } catch {
        await queueOffline();
        setMessage({
          type: "queued",
          text: "Connexion indisponible : enregistré sur l'appareil, envoyé automatiquement au retour du réseau.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="montant">Montant (€)</Label>
        <Input
          id="montant"
          name="montant"
          type="number"
          min={0.01}
          step={0.01}
          required
          className="h-12"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="categorie">Catégorie</Label>
        <Select name="categorie" defaultValue="alimentaire" required>
          <SelectTrigger id="categorie" className="h-12 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORIE_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="photo">Photo du ticket</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          required
          className="h-12 pt-2.5"
        />
      </div>
      <Button type="submit" disabled={pending} className="h-12">
        {pending ? "Envoi…" : "Envoyer le ticket"}
      </Button>
      {message && (
        <p
          role={message.type === "error" ? "alert" : undefined}
          className={`text-sm ${message.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
