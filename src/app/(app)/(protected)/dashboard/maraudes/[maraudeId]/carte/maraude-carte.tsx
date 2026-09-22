"use client";

import { useEffect, useState, useTransition } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet.heat";
import { Button } from "@/components/ui/button";
import { enregistrerCircuitPlanifie } from "@/lib/actions/circuits";
import type { GeometrieLigne } from "@/lib/ors";
import { TYPE_ACTIONS, TYPE_COLORS, TYPE_LABELS_COURT, type TypeAction } from "@/lib/type-action";
import {
  ORGANISME_ORIENTATION_LABELS,
  type OrganismeOrientation,
} from "@/lib/organisme-orientation";

type LatLng = { lat: number; lng: number };
type PointReel = LatLng & {
  typeAction: TypeAction;
  horodatage: string;
  orientationVers: OrganismeOrientation | null;
  orientationVersAutre: string | null;
};

// leaflet.heat n'est pas un composant react-leaflet — on l'ajoute
// impérativement à l'instance de carte via useMap(), comme documenté pour
// toute lib Leaflet tierce non portée en React.
function HeatLayer({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, 1] as [number, number, number]),
      { radius: 30, blur: 20, maxZoom: 17 },
    ).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

function ClickCatcher({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Un seul composant pour les 3 besoins liés à la carte (Étape 9) : heatmap de
// l'historique (aide à la décision), tracé du circuit réellement effectué
// (points_passage de CETTE maraude, chaînés chronologiquement), et circuit
// planifié éditable par clic (Admin/Manager de la maraude uniquement — RLS
// circuits_planifies_insert/update_admin_or_own_manager l'impose de toute
// façon côté serveur, canEdit ne fait qu'afficher ou non les contrôles).
export function MaraudeCarte({
  maraudeId,
  center,
  heatPoints,
  circuitReel,
  circuitPlanifieInitial,
  circuitPlanifieGeometrieInitial,
  canEdit,
}: {
  maraudeId: string;
  center: LatLng;
  heatPoints: LatLng[];
  circuitReel: PointReel[];
  circuitPlanifieInitial: LatLng[];
  circuitPlanifieGeometrieInitial: GeometrieLigne | null;
  canEdit: boolean;
}) {
  const [planned, setPlanned] = useState<LatLng[]>(circuitPlanifieInitial);
  const [geometrieReelle, setGeometrieReelle] = useState<GeometrieLigne | null>(
    circuitPlanifieGeometrieInitial,
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const reelLine: LatLngExpression[] = circuitReel.map((p) => [p.lat, p.lng]);
  // Tracé réel (suivant les rues) si disponible pour les points ACTUELLEMENT
  // enregistrés ; sinon repli sur la ligne droite entre les points bruts —
  // jamais d'écran cassé si l'API a échoué ou n'a pas encore été appelée.
  // GeoJSON stocke [lng, lat], Leaflet attend [lat, lng] : conversion ici.
  const plannedLine: LatLngExpression[] = geometrieReelle
    ? geometrieReelle.coordinates.map(([lng, lat]) => [lat, lng])
    : planned.map((p) => [p.lat, p.lng]);

  // Toute modification des points en cours d'édition invalide l'ancien
  // tracé réel affiché (il ne correspondrait plus aux points actuels tant
  // que le nouveau circuit n'est pas ré-enregistré) — on repasse sur la
  // ligne droite en aperçu pendant l'édition, le tracé réel réapparaît au
  // prochain enregistrement réussi.
  function modifierPoints(nouveaux: LatLng[]) {
    setPlanned(nouveaux);
    setGeometrieReelle(null);
  }

  function save() {
    const formData = new FormData();
    formData.set("maraudeId", maraudeId);
    formData.set("points", JSON.stringify(planned));
    startTransition(async () => {
      const result = await enregistrerCircuitPlanifie(undefined, formData);
      if (result && "error" in result) {
        setMessage(result.error);
        return;
      }
      setGeometrieReelle(result?.geometrieReelle ?? null);
      setMessage(
        planned.length >= 2 && !result?.geometrieReelle
          ? "Circuit planifié enregistré (tracé réel indisponible pour l'instant, ligne droite affichée)."
          : "Circuit planifié enregistré.",
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="h-[420px] w-full overflow-hidden rounded-lg border"
        role="application"
        aria-label="Carte de la maraude"
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatLayer points={heatPoints} />

          {reelLine.length > 1 && (
            <Polyline
              positions={reelLine}
              pathOptions={{ color: "#0b3d91", weight: 4 }}
            />
          )}
          {circuitReel.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={7}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: TYPE_COLORS[p.typeAction] ?? "#1e88e5",
                fillOpacity: 1,
              }}
            >
              <Tooltip>
                {TYPE_LABELS_COURT[p.typeAction] ?? p.typeAction}
                {p.typeAction === "orientation_sociale" && p.orientationVers && (
                  <>
                    {" → "}
                    {p.orientationVers === "autre"
                      ? (p.orientationVersAutre ?? "Autre")
                      : ORGANISME_ORIENTATION_LABELS[p.orientationVers]}
                  </>
                )}
                {" — "}
                {new Date(p.horodatage).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Tooltip>
            </CircleMarker>
          ))}

          {plannedLine.length > 1 && (
            <Polyline
              positions={plannedLine}
              pathOptions={{
                color: "#ff683d",
                weight: 3,
                dashArray: "8 8",
              }}
            />
          )}
          {planned.map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lng]}
              radius={5}
              pathOptions={{
                color: "#ff683d",
                weight: 2,
                fillColor: "#ffffff",
                fillOpacity: 1,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -6]}>
                {i + 1}
              </Tooltip>
            </CircleMarker>
          ))}

          {canEdit && (
            <ClickCatcher
              onClick={(p) => modifierPoints([...planned, p])}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {TYPE_ACTIONS.map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[type] }}
            />
            {TYPE_LABELS_COURT[type]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-[#0b3d91]" />
          Circuit réalisé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#ff683d]" />
          Circuit planifié
        </span>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || planned.length === 0}
            onClick={() => modifierPoints(planned.slice(0, -1))}
          >
            Annuler le dernier point
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || planned.length === 0}
            onClick={() => modifierPoints([])}
          >
            Effacer le circuit
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={save}>
            {pending ? "Enregistrement…" : "Enregistrer le circuit planifié"}
          </Button>
        </div>
      )}
      {canEdit && (
        <p className="text-sm text-muted-foreground">
          Cliquez sur la carte pour placer les points du circuit prévu, dans
          l&apos;ordre du passage.
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
