"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardListSkeleton } from "@/components/card-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";
import { BesoinForm } from "./besoin-form";

type Besoin = {
  id: string;
  categorie: CategorieBesoin;
  commentaire: string | null;
  created_at: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};

// Lecture directe Supabase depuis le navigateur — RLS
// (besoins_signales_select_admin_manager_ou_participant) fait toute la
// restriction réelle. Voir docs/Tasks.md, "Chantier lancé, suite (16/09)".
async function fetchBesoins(
  maraudeId: string,
  isAdminOrManager: boolean,
  profileId: string,
): Promise<{ besoins: Besoin[]; refuse: boolean }> {
  const supabase = createClient();

  if (!isAdminOrManager) {
    const { data: inscription } = await supabase
      .from("inscriptions_maraude")
      .select("statut")
      .eq("maraude_id", maraudeId)
      .eq("user_id", profileId)
      .maybeSingle();

    if (inscription?.statut !== "inscrit") {
      return { besoins: [], refuse: true };
    }
  }

  const { data: besoins } = await supabase
    .from("besoins_signales")
    .select("id, categorie, commentaire, created_at, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  return { besoins: besoins ?? [], refuse: false };
}

// Voir docs/Tasks.md, "Chantier lancé".
// Partagé avec l'onglet Logistique du panneau de détail (refonte 28/09) —
// BesoinForm invalide déjà le préfixe ["besoins", maraudeId].
function useBesoins(maraudeId: string) {
  const profile = useSession();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  return useQuery({
    queryKey: ["besoins", maraudeId, isAdminOrManager],
    queryFn: () => fetchBesoins(maraudeId, isAdminOrManager, profile.id),
  });
}

function ListeBesoins({ besoins }: { besoins: Besoin[] }) {
  return (
    <div className="flex flex-col divide-y divide-border">
      {besoins.map((b) => {
        const p = Array.isArray(b.profil) ? b.profil[0] : b.profil;
        const nom = p?.full_name;
        return (
          <div key={b.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {CATEGORIE_BESOIN_LABELS[b.categorie]}
              </span>
              <CardDescription>
                {new Date(b.created_at).toLocaleDateString("fr-FR")}
                {nom ? ` · ${nom}` : ""}
              </CardDescription>
            </div>
            {b.commentaire && <p className="text-sm text-muted-foreground">{b.commentaire}</p>}
          </div>
        );
      })}
    </div>
  );
}

// Bloc "Besoins signalés" de l'onglet Logistique : boutons de catégorie
// prêts à taper + liste des besoins de la maraude, sans page intermédiaire.
export function BesoinsBloc({ maraudeId }: { maraudeId: string }) {
  const { data, isLoading, isError } = useBesoins(maraudeId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Impossible de charger les besoins.</p>;
  }
  if (data.refuse) {
    return (
      <p className="text-sm text-muted-foreground">
        Réservé à l&apos;équipe inscrite sur cette maraude.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BesoinForm maraudeId={maraudeId} />
      {data.besoins.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun besoin signalé pour l&apos;instant.</p>
      ) : (
        <ListeBesoins besoins={data.besoins} />
      )}
    </div>
  );
}

export function BesoinsClient() {
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useBesoins(maraudeId);

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
          Impossible de charger les besoins pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { besoins } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Besoins signalés
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manque de couvertures, vêtements, hygiène... aide le Trésorier à
          ajuster les prochains achats.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signaler un besoin</CardTitle>
        </CardHeader>
        <CardContent>
          <BesoinForm maraudeId={maraudeId} />
        </CardContent>
      </Card>

      {besoins.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun besoin signalé pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-0">
            <ListeBesoins besoins={besoins} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
