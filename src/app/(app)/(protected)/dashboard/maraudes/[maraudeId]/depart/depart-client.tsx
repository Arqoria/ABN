"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { genererChecklistDepart } from "@/lib/actions/checklist-depart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { ChecklistItemToggle } from "./checklist-item-toggle";
import { AjouterLigneLibreForm } from "./ajouter-ligne-libre-form";
import { PresenceToggle } from "./presence-toggle";

type ChecklistItem = { id: string; libelle: string; source: string; coche: boolean };
type Inscrit = {
  id: string;
  user_id: string;
  presence_confirmee: boolean;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
type Payload = {
  items: ChecklistItem[];
  inscrits: Inscrit[];
  canWriteChecklist: boolean;
  canWritePresence: boolean;
  refuse: boolean;
};

// Lecture directe Supabase depuis le navigateur — RLS fait la restriction
// réelle. Voir docs/Tasks.md, "Checklist de départ + présence confirmée +
// parcours réel".
async function fetchDepart(maraudeId: string, profileId: string, isAdmin: boolean): Promise<Payload> {
  const supabase = createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return { items: [], inscrits: [], canWriteChecklist: false, canWritePresence: false, refuse: true };
  }

  const isOwnManager = maraude.manager_id === profileId;

  const [{ data: inscrits }, { data: affectations }] = await Promise.all([
    supabase
      .from("inscriptions_maraude")
      .select("id, user_id, presence_confirmee, profil:user_id(full_name)")
      .eq("maraude_id", maraudeId)
      .eq("statut", "inscrit"),
    supabase.from("affectations_maraude").select("user_id").eq("maraude_id", maraudeId),
  ]);

  const estInscrit = (inscrits ?? []).some((i) => i.user_id === profileId);
  const estAffecte = (affectations ?? []).some((a) => a.user_id === profileId);

  if (!isAdmin && !isOwnManager && !estInscrit) {
    return { items: [], inscrits: [], canWriteChecklist: false, canWritePresence: false, refuse: true };
  }

  const canWriteChecklist = isAdmin || isOwnManager || estAffecte;
  const canWritePresence = isAdmin || isOwnManager;

  // Régénère la checklist depuis le stock/dons actuels avant de la lire —
  // idempotent, ne touche jamais les lignes déjà cochées ni les lignes
  // libres. Population = RLS d'écriture, pas la peine d'appeler si l'on sait
  // déjà que ça échouera silencieusement.
  if (canWriteChecklist) {
    await genererChecklistDepart(maraudeId);
  }

  const { data: items } = await supabase
    .from("checklist_depart_items")
    .select("id, libelle, source, coche")
    .eq("maraude_id", maraudeId)
    .order("source", { ascending: true })
    .order("cree_le", { ascending: true });

  return {
    items: items ?? [],
    inscrits: inscrits ?? [],
    canWriteChecklist,
    canWritePresence,
    refuse: false,
  };
}

const SOURCE_LABELS: Record<string, string> = {
  stock: "Depuis le stock",
  don: "Dons reçus",
  libre: "Ajouté manuellement",
};

export function DepartClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const isAdmin = profile.roles.includes("admin");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["depart", maraudeId],
    queryFn: () => fetchDepart(maraudeId, profile.id, isAdmin),
  });

  useEffect(() => {
    if (data?.refuse) {
      router.replace("/dashboard/maraudes");
    }
  }, [data?.refuse, router]);

  if (isLoading) {
    return <CardListSkeleton rows={2} />;
  }

  if (data?.refuse) {
    return null;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger la checklist pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { items, inscrits, canWriteChecklist, canWritePresence } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Avant le départ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Checklist de matériel/dons et présence confirmée de l&apos;équipe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist de départ</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Rien à charger pour l&apos;instant (aucun stock ni don disponible).
            </p>
          ) : (
            ["stock", "don", "libre"].map((source) => {
              const lignes = items.filter((i) => i.source === source);
              if (lignes.length === 0) return null;
              return (
                <div key={source} className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    {SOURCE_LABELS[source]}
                  </p>
                  {lignes.map((item) => (
                    <ChecklistItemToggle
                      key={item.id}
                      maraudeId={maraudeId}
                      itemId={item.id}
                      libelle={item.libelle}
                      coche={item.coche}
                      canWrite={canWriteChecklist}
                      canDelete={canWriteChecklist && source === "libre"}
                    />
                  ))}
                </div>
              );
            })
          )}
          {canWriteChecklist && <AjouterLigneLibreForm maraudeId={maraudeId} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Présence confirmée</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {inscrits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun inscrit.</p>
          ) : (
            inscrits.map((i) => {
              const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
              return (
                <PresenceToggle
                  key={i.id}
                  maraudeId={maraudeId}
                  inscriptionId={i.id}
                  nom={p?.full_name ?? "(sans nom)"}
                  presenceConfirmee={i.presence_confirmee}
                  canWrite={canWritePresence}
                />
              );
            })
          )}
          {!canWritePresence && (
            <p className="text-xs text-muted-foreground">
              Seul le Manager de cette maraude (ou un Admin) peut confirmer la présence.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
