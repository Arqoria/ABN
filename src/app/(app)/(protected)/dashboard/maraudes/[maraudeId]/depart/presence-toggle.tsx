"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { confirmerPresence } from "@/lib/actions/presence";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function PresenceToggle({
  maraudeId,
  inscriptionId,
  nom,
  presenceConfirmee,
  canWrite,
}: {
  maraudeId: string;
  inscriptionId: string;
  nom: string;
  presenceConfirmee: boolean;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function toggle() {
    startTransition(async () => {
      await confirmerPresence(inscriptionId, !presenceConfirmee);
      queryClient.invalidateQueries({ queryKey: ["depart", maraudeId] });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`presence-${inscriptionId}`}
        checked={presenceConfirmee}
        disabled={!canWrite || pending}
        onCheckedChange={toggle}
      />
      <Label htmlFor={`presence-${inscriptionId}`}>{nom}</Label>
    </div>
  );
}
