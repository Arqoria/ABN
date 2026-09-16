import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Squelette générique pour les pages "titre + liste de cartes" (la
// majorité des pages dashboard) — remplace l'état "Chargement…"/blanc
// pendant que React Query va chercher les données. Voir docs/Tasks.md,
// "Chantier lancé, suite (16/09)".
export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-56" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
