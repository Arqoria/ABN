"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { Card, CardContent } from "@/components/ui/card";
import { CapturePointForm } from "./capture-point-form";

async function fetchAcces(maraudeId: string): Promise<{ allowed: true }> {
  const res = await fetch(`/api/maraudes/${maraudeId}/acces`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé". Pas de liste à afficher (écriture
// seule) — juste une vérification d'accès légère avant de montrer le
// formulaire. La vraie barrière reste le trigger côté base à l'insertion.
export function PointsClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();

  const { isLoading, isError, error } = useQuery({
    queryKey: ["acces", maraudeId],
    queryFn: () => fetchAcces(maraudeId),
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

  if (isError) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Points de passage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un tap = une action. La position est arrondie automatiquement
          (~100m), jamais stockée précisément.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CapturePointForm maraudeId={maraudeId} userId={profile.id} />
        </CardContent>
      </Card>
    </div>
  );
}
