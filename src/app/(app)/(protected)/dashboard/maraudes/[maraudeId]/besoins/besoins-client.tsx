"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";
import { BesoinForm } from "./besoin-form";

type Besoin = {
  id: string;
  categorie: CategorieBesoin;
  commentaire: string | null;
  created_at: string;
  profil: { full_name: string | null } | { full_name: string | null }[] | null;
};

async function fetchBesoins(maraudeId: string): Promise<{ besoins: Besoin[] }> {
  const res = await fetch(`/api/maraudes/${maraudeId}/besoins`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé". RLS fait la vraie restriction
// d'accès — le redirect ici n'est qu'une redirection propre, comme avant.
export function BesoinsClient() {
  useSession(); // s'assure d'être sous le SessionProvider (garde-fou dev)
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["besoins", maraudeId],
    queryFn: () => fetchBesoins(maraudeId),
  });

  useEffect(() => {
    if (error instanceof Error && error.message === "403") {
      router.replace("/dashboard/maraudes");
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les besoins pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { besoins } = data;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
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
          <CardContent className="flex flex-col divide-y divide-border py-0">
            {besoins.map((b) => {
              const p = Array.isArray(b.profil) ? b.profil[0] : b.profil;
              const nom = p?.full_name;
              return (
                <div key={b.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {CATEGORIE_BESOIN_LABELS[b.categorie]}
                    </span>
                    <CardDescription>
                      {new Date(b.created_at).toLocaleDateString("fr-FR")}
                      {nom ? ` · ${nom}` : ""}
                    </CardDescription>
                  </div>
                  {b.commentaire && (
                    <p className="text-sm text-muted-foreground">{b.commentaire}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
