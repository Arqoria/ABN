"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  TYPE_ACTIONS,
  TYPE_COLORS,
  TYPE_LABELS,
  type TypeAction,
} from "@/lib/type-action";

type Point = { lat: number; lng: number; typeAction: TypeAction };

const CENTRE_PAR_DEFAUT = { lat: 43.6961, lng: 7.2717 }; // Nice, place Masséna

function HeatLayer({ points }: { points: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, 1] as [number, number, number]),
      { radius: 25, blur: 18, maxZoom: 17 },
    ).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

// Heatmap globale (toutes maraudes confondues, selon le scope déjà imposé
// par RLS sur points_passage_geo : un Manager ne voit que ses propres
// maraudes, un Admin voit tout) — sert à repérer les zones où se concentrent
// le plus d'actions d'un type donné, pour aider à planifier de meilleurs
// circuits. Le filtre par type est purement client (pas de round-trip
// serveur) : la carte doit rester réactive pendant qu'on teste des
// combinaisons.
export function HeatmapFiltree({ points }: { points: Point[] }) {
  const [selected, setSelected] = useState<Set<TypeAction>>(
    () => new Set(TYPE_ACTIONS),
  );

  const filtered = useMemo(
    () => points.filter((p) => selected.has(p.typeAction)),
    [points, selected],
  );

  const center = filtered[0] ?? points[0] ?? CENTRE_PAR_DEFAUT;

  function toggle(type: TypeAction, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(type);
      else next.delete(type);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        {TYPE_ACTIONS.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox
              id={`filtre-${type}`}
              checked={selected.has(type)}
              onCheckedChange={(checked) => toggle(type, checked === true)}
            />
            <Label
              htmlFor={`filtre-${type}`}
              className="flex items-center gap-1.5 text-sm font-normal"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              />
              {TYPE_LABELS[type]}
            </Label>
          </div>
        ))}
      </div>

      <div
        className="h-[380px] w-full overflow-hidden rounded-lg border"
        role="application"
        aria-label="Heatmap des zones d'activité"
      >
        {points.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Aucune donnée sur cette période.
          </div>
        ) : (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer points={filtered} />
            {filtered.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lng]}
                radius={5}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1.5,
                  fillColor: TYPE_COLORS[p.typeAction],
                  fillOpacity: 0.9,
                }}
              >
                <Tooltip>{TYPE_LABELS[p.typeAction]}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
