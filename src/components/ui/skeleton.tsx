import { cn } from "@/lib/utils";

// Composant standard shadcn — un bloc qui pulse doucement, à dimensionner
// via className selon ce qu'il remplace (ligne de texte, carte, etc.).
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
