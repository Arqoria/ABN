"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CapturePointForm } from "./capture-point-form";

// Lecture directe Supabase depuis le navigateur — juste une vérification
// d'accès légère (pas de liste à afficher). La vraie barrière reste le
// trigger côté base à l'insertion. Voir docs/Tasks.md, "Chantier lancé,
// suite (16/09)".
async function checkAcces(
  maraudeId: string,
  profileId: string,
  isAdminOrManager: boolean,
): Promise<boolean> {
  if (isAdminOrManager) return true;
  const supabase = createClient();
  const { data: inscription } = await supabase
    .from("inscriptions_maraude")
    .select("statut")
    .eq("maraude_id", maraudeId)
    .eq("user_id", profileId)
    .maybeSingle();
  return inscription?.statut === "inscrit";
}

// Voir docs/Tasks.md, "Chantier lancé".
export function PointsClient() {
  const profile = useSession();
  const { maraudeId } = useParams<{ maraudeId: string }>();
  const router = useRouter();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  const { data: allowed, isLoading, isError } = useQuery({
    queryKey: ["acces", maraudeId],
    queryFn: () => checkAcces(maraudeId, profile.id, isAdminOrManager),
  });

  useEffect(() => {
    if (allowed === false) {
      router.replace("/dashboard/maraudes");
    }
  }, [allowed, router]);

  if (isLoading || isError || !allowed) {
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
