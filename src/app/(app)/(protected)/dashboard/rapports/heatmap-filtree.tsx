"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
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
import {
  ORGANISME_ORIENTATION_LABELS,
  type OrganismeOrientation,
} from "@/lib/organisme-orientation";

type Point = {
  lat: number;
  lng: number;
  typeAction: TypeAction;
  horodatage: string;
  orientationVers: OrganismeOrientation | null;
  orientationVersAutre: string | null;
};

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

// Cadre la carte sur les points réellement affichés plutôt qu'un zoom fixe
// arbitraire — sinon une partie des données peut se retrouver hors champ
// (ou la carte trop dézoomée si tout est concentré sur un petit secteur).
function FitBounds({ points }: { points: Point[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    // Volontairement déclenché une seule fois par jeu de points (pas à
    // chaque changement de filtre) : re-cadrer à chaque coche/décoche
    // déplacerait la carte sous les doigts de l'utilisateur en pleine
    // exploration — désorientant. Le filtre ne fait que montrer/cacher des
    // points dans le cadre déjà choisi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

function describePoint(p: Point): string {
  if (p.typeAction === "orientation_sociale") {
    const organisme = p.orientationVers
      ? p.orientationVers === "autre"
        ? (p.orientationVersAutre ?? "Autre")
        : ORGANISME_ORIENTATION_LABELS[p.orientationVers]
      : "—";
    return `${TYPE_LABELS[p.typeAction]} → ${organisme}`;
  }
  return TYPE_LABELS[p.typeAction];
}

// Heatmap globale (toutes maraudes confondues, selon le scope déjà imposé
// par RLS sur points_passage_geo : un Manager ne voit que ses propres
// maraudes, un Admin voit tout) — sert à repérer les zones où se concentrent
// le plus d'actions d'un type donné, pour aider à planifier de meilleurs
// circuits. Le filtre par type est purement client (pas de round-trip
// serveur) : la carte doit rester réactive pendant qu'on teste des
// combinaisons. Popup au clic (pas juste au survol) : plus fiable au
// tactile que le hover, cohérent avec l'usage terrain mobile-first.
export function HeatmapFiltree({ points }: { points: Point[] }) {
  const [selected, setSelected] = useState<Set<TypeAction>>(
    () => new Set(TYPE_ACTIONS),
  );

  const filtered = useMemo(
    () => points.filter((p) => selected.has(p.typeAction)),
    [points, selected],
  );

  const center = points[0] ?? CENTRE_PAR_DEFAUT;

  const comptesParType = useMemo(() => {
    const map = new Map<TypeAction, number>();
    for (const p of points) {
      map.set(p.typeAction, (map.get(p.typeAction) ?? 0) + 1);
    }
    return map;
  }, [points]);

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
      <div className="flex flex-wrap gap-x-5 gap-y-2">
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
              <span className="text-muted-foreground">
                ({comptesParType.get(type) ?? 0})
              </span>
            </Label>
          </div>
        ))}
      </div>

      <div
        className="h-[540px] w-full overflow-hidden rounded-lg border"
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
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            <HeatLayer points={filtered} />
            {filtered.map((p, i) => (
              <CircleMarker
                key={i}
                center={[p.lat, p.lng]}
                radius={6}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1.5,
                  fillColor: TYPE_COLORS[p.typeAction],
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-medium">{describePoint(p)}</p>
                    <p className="text-muted-foreground">
                      {new Date(p.horodatage).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {filtered.length} point{filtered.length > 1 ? "s" : ""} affiché
        {filtered.length > 1 ? "s" : ""} sur {points.length} au total — cliquez
        un point pour le détail.
      </p>
    </div>
  );
}
