"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { genererChecklistDepart } from "@/lib/actions/checklist-depart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ChecklistItemToggle } from "./checklist-item-toggle";
import { AjouterLigneLibreForm } from "./ajouter-ligne-libre-form";
import { PresenceToggle } from "./presence-toggle";
import { initiales } from "../../maraude-card";
import {
  FONCTION_MARAUDE_ICONES,
  FONCTION_MARAUDE_LABELS,
  type FonctionMaraude,
} from "@/lib/fonction-maraude";

type ChecklistItem = { id: string; libelle: string; source: string; coche: boolean };
type Inscrit = {
  id: string;
  user_id: string;
  presence_confirmee: boolean;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};
export type DepartPayload = {
  items: ChecklistItem[];
  inscrits: Inscrit[];
  // Fonctions de chacun sur cette maraude (badges de l'émargement).
  affectations: { user_id: string; fonction: string }[];
  canWriteChecklist: boolean;
  canWritePresence: boolean;
  // Suppression d'une ligne (corbeille) : Admin ou Manager de CETTE maraude,
  // exactement la RLS checklist_depart_items_delete_admin_ou_manager — un
  // bénévole affecté peut cocher/ajouter, pas supprimer.
  canDeleteLibre: boolean;
  refuse: boolean;
};

// Lecture directe Supabase depuis le navigateur — RLS fait la restriction
// réelle. Voir docs/Tasks.md, "Checklist de départ + présence confirmée +
// parcours réel".
async function fetchDepart(maraudeId: string, profileId: string, isAdmin: boolean): Promise<DepartPayload> {
  const supabase = createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return { items: [], inscrits: [], affectations: [], canWriteChecklist: false, canWritePresence: false, canDeleteLibre: false, refuse: true };
  }

  const isOwnManager = maraude.manager_id === profileId;

  const [{ data: inscrits }, { data: affectations }] = await Promise.all([
    supabase
      .from("inscriptions_maraude")
      .select("id, user_id, presence_confirmee, profil:user_id(full_name)")
      .eq("maraude_id", maraudeId)
      .eq("statut", "inscrit"),
    supabase.from("affectations_maraude").select("user_id, fonction").eq("maraude_id", maraudeId),
  ]);

  const estInscrit = (inscrits ?? []).some((i) => i.user_id === profileId);
  const estAffecte = (affectations ?? []).some((a) => a.user_id === profileId);

  if (!isAdmin && !isOwnManager && !estInscrit) {
    return { items: [], inscrits: [], affectations: [], canWriteChecklist: false, canWritePresence: false, canDeleteLibre: false, refuse: true };
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
    affectations: affectations ?? [],
    canWriteChecklist,
    canWritePresence,
    canDeleteLibre: isAdmin || isOwnManager,
    refuse: false,
  };
}

// Partagé entre la page dédiée /depart et l'onglet Logistique du panneau de
// détail (refonte 28/09) — même clé ["depart", maraudeId], déjà invalidée
// par ChecklistItemToggle/PresenceToggle/AjouterLigneLibreForm : cocher une
// case met à jour les deux vues sans rechargement.
export function useDepart(maraudeId: string) {
  const profile = useSession();
  const isAdmin = profile.roles.includes("admin");
  return useQuery({
    queryKey: ["depart", maraudeId],
    queryFn: () => fetchDepart(maraudeId, profile.id, isAdmin),
  });
}

const SOURCE_LABELS: Record<string, string> = {
  stock: "Depuis le stock",
  don: "Dons reçus",
  libre: "Liste de base et ajouts",
};

export function ChecklistDepart({ maraudeId, data }: { maraudeId: string; data: DepartPayload }) {
  const { items, canWriteChecklist } = data;

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Rien à charger pour l&apos;instant (aucun stock ni don disponible).
        </p>
      ) : (
        ["libre", "stock", "don"].map((source) => {
          const lignes = items.filter((i) => i.source === source);
          if (lignes.length === 0) return null;
          return (
            <div key={source} className="flex flex-col">
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
                  canDelete={data.canDeleteLibre && source === "libre"}
                />
              ))}
            </div>
          );
        })
      )}
      {canWriteChecklist && <AjouterLigneLibreForm maraudeId={maraudeId} />}
    </div>
  );
}

// Émargement de l'équipe (28/09) : une carte par bénévole inscrit — initiales,
// nom, fonction(s) sur cette maraude, et présence. Cochable UNIQUEMENT par le
// Manager de cette maraude ou un Admin (même règle que la RLS, inchangée) ;
// pour tout autre profil, lecture seule : une pastille d'état, jamais une
// case désactivée qui laisserait croire à une action possible.
export function PresencesDepart({ maraudeId, data }: { maraudeId: string; data: DepartPayload }) {
  const { inscrits, affectations, canWritePresence } = data;

  if (inscrits.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun inscrit.</p>;
  }

  const presents = inscrits.filter((i) => i.presence_confirmee).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        {presents}/{inscrits.length} présent(s) confirmé(s)
      </p>
      {/* Une seule colonne : le bloc vit dans la colonne de droite (étroite)
          de l'onglet Logistique sur PC — deux colonnes y tronquaient les noms. */}
      <div className="flex flex-col gap-2">
        {inscrits.map((i) => {
          const p = Array.isArray(i.profil) ? i.profil[0] : i.profil;
          const nom = p?.full_name ?? "(sans nom)";
          const fonctions = affectations
            .filter((a) => a.user_id === i.user_id)
            .map((a) => a.fonction as FonctionMaraude);
          return (
            <div
              key={i.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                i.presence_confirmee ? "border-green-500/50 bg-green-500/10" : "bg-card"
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xs font-semibold text-white">
                {initiales(p?.full_name ?? "?")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{nom}</p>
                <p className="text-xs text-muted-foreground">
                  {fonctions.length > 0
                    ? fonctions.map((f) => `${FONCTION_MARAUDE_ICONES[f]} ${FONCTION_MARAUDE_LABELS[f]}`).join(" · ")
                    : "Rôle non choisi"}
                </p>
              </div>
              {canWritePresence ? (
                <PresenceToggle
                  maraudeId={maraudeId}
                  inscriptionId={i.id}
                  nom={nom}
                  presenceConfirmee={i.presence_confirmee}
                  canWrite
                  compact
                />
              ) : (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    i.presence_confirmee
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i.presence_confirmee ? "✓ Présent" : "En attente"}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!canWritePresence && (
        <p className="text-xs text-muted-foreground">
          Seul le Manager de cette maraude (ou un Admin) confirme les présences.
        </p>
      )}
    </div>
  );
}

// Onglet Logistique (28/09) : présences et matériel séparés en deux blocs
// distincts (auparavant mélangés dans "Avant le départ"). Même requête
// ["depart", id] partagée : un seul chargement pour les deux.
function useBlocDepart(maraudeId: string) {
  const requete = useDepart(maraudeId);
  const etat = requete.isLoading ? (
    <Skeleton className="h-24 w-full" />
  ) : requete.isError || !requete.data ? (
    <p className="text-sm text-muted-foreground">Impossible de charger la checklist.</p>
  ) : requete.data.refuse ? (
    <p className="text-sm text-muted-foreground">Réservé à l&apos;équipe inscrite sur cette maraude.</p>
  ) : null;
  return { data: requete.data, etat };
}

export function PresencesBloc({ maraudeId }: { maraudeId: string }) {
  const { data, etat } = useBlocDepart(maraudeId);
  if (etat || !data) return etat;
  return <PresencesDepart maraudeId={maraudeId} data={data} />;
}

export function MaterielBloc({ maraudeId }: { maraudeId: string }) {
  const { data, etat } = useBlocDepart(maraudeId);
  if (etat || !data) return etat;
  return <ChecklistDepart maraudeId={maraudeId} data={data} />;
}

export function DepartClient() {
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useDepart(maraudeId);

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
        <CardContent>
          <ChecklistDepart maraudeId={maraudeId} data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Présence confirmée</CardTitle>
        </CardHeader>
        <CardContent>
          <PresencesDepart maraudeId={maraudeId} data={data} />
        </CardContent>
      </Card>
    </div>
  );
}
