"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * The results map (canvas: "map placeholder — coaches plotted from PostGIS
 * results"). MapLibre GL on OpenFreeMap's vector tiles, recoloured into the
 * palette at load — cream ground, tint roads, ink labels — so it reads as
 * part of the page rather than a third-party widget. A dashed terracotta
 * circle for the search radius, a pulsing origin dot, and one "N km" pill
 * per coach; the active pin is terracotta and clicking one selects that
 * coach (the parent shows its card).
 */
export type MapPin = { slug: string; lat: number; long: number; km: number | null };

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const PALETTE: Record<string, [string, string | number]> = {
  background: ["background-color", "#efe9dc"],
  park: ["fill-color", "#e6dfcc"],
  landcover_wood: ["fill-color", "#e4dcc8"],
  landuse_residential: ["fill-color", "#ebe4d5"],
  water: ["fill-color", "#dcd3bf"],
  waterway: ["line-color", "#dcd3bf"],
  building: ["fill-opacity", 0],
  highway_minor: ["line-color", "rgba(31,58,46,0.08)"],
  highway_major_inner: ["line-color", "rgba(31,58,46,0.14)"],
  highway_major_subtle: ["line-color", "rgba(31,58,46,0.08)"],
  highway_motorway_inner: ["line-color", "rgba(31,58,46,0.2)"],
  highway_motorway_subtle: ["line-color", "rgba(31,58,46,0.12)"],
  highway_motorway_bridge_inner: ["line-color", "rgba(31,58,46,0.2)"],
  highway_path: ["line-color", "rgba(31,58,46,0.06)"],
  railway: ["line-color", "rgba(31,58,46,0.12)"],
  boundary_2: ["line-color", "rgba(31,58,46,0.3)"],
  boundary_3: ["line-color", "rgba(31,58,46,0.18)"],
};
const HIDE = new Set([
  "highway_major_casing",
  "highway_motorway_casing",
  "highway_motorway_bridge_casing",
  "tunnel_motorway_casing",
  "tunnel_motorway_inner",
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
  "airport",
  "railway_transit",
  "railway_transit_dashline",
  "railway_service",
  "railway_service_dashline",
  "railway_dashline",
]);

function recolour(map: maplibregl.Map) {
  for (const layer of map.getStyle().layers ?? []) {
    if (HIDE.has(layer.id)) {
      map.setLayoutProperty(layer.id, "visibility", "none");
      continue;
    }
    const p = PALETTE[layer.id];
    if (p) map.setPaintProperty(layer.id, p[0] as "background-color", p[1] as string);
    if (layer.type === "symbol") {
      map.setPaintProperty(layer.id, "text-color", "#4a4842");
      map.setPaintProperty(layer.id, "text-halo-color", "#efe9dc");
      map.setPaintProperty(layer.id, "text-halo-width", 1.2);
    }
  }
}

function circle(lat: number, long: number, km: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const dLat = km / 110.574;
  const dLong = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    coords.push([long + dLong * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

export function CoachMap({
  origin,
  radiusKm,
  pins,
  activeSlug,
  onSelect,
  className = "",
}: {
  origin: { lat: number; long: number } | null;
  radiusKm: number;
  pins: MapPin[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Map lifecycle
  useEffect(() => {
    if (!el.current || mapRef.current) return;
    const centre: [number, number] = origin ? [origin.long, origin.lat] : [133.7751, -25.2744];
    // Tile parsing runs in a Web Worker. Under Turbopack `import.meta.url`
    // isn't http(s), so MapLibre's default worker URL resolves to "" — the
    // page itself, an HTML document — and every tile stays "loading"
    // forever with nothing drawn. Point it at MapLibre's own worker served
    // from /public (copied by scripts/copy-maplibre-worker.mjs before
    // dev/build). Set HERE, right before construction: a module-scope call
    // was evaluated against a different module instance and never applied.
    maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: el.current,
      style: STYLE_URL,
      center: centre,
      zoom: origin ? 9 : 3.4,
      attributionControl: { compact: true },
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    // A style/tile/worker failure is otherwise silent: the map just stays
    // cream. Surface it.
    map.on("error", (e) => console.error("[coach-map]", e.error?.message ?? e));
    map.on("load", () => {
      recolour(map);
      map.addSource("radius", { type: "geojson", data: origin ? circle(origin.lat, origin.long, radiusKm) : { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#b4553a", "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#b4553a", "line-opacity": 0.5, "line-width": 1, "line-dasharray": [3, 3] },
      });
      if (origin) fitToRadius(map, origin, radiusKm);
    });
    // Markers don't need the style: add the origin dot straight away.
    if (origin) {
      const dot = document.createElement("div");
      dot.className = "map-origin";
      originMarker.current = new maplibregl.Marker({ element: dot }).setLngLat([origin.long, origin.lat]).addTo(map);
    }
    mapRef.current = map;
    // Dev-only handle for the parity harness (scripts/design-reference/*).
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ecaMap?: maplibregl.Map }).__ecaMap = map;
    // The container can be laid out after construction (dynamic import,
    // sticky column sizing) — at zero size every point projects to 0,0 and
    // no tiles load. Resize on load and whenever the box changes.
    map.once("load", () => map.resize());
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el.current);
    const markerStore = markers.current;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerStore.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Radius / origin changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin) return;
    const apply = () => {
      const src = map.getSource("radius") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(circle(origin.lat, origin.long, radiusKm));
      fitToRadius(map, origin, radiusKm);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [origin, radiusKm]);

  // Pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const keep = new Set(pins.map((p) => p.slug));
    for (const [slug, m] of markers.current) {
      if (!keep.has(slug)) {
        m.remove();
        markers.current.delete(slug);
      }
    }
    for (const p of pins) {
      let m = markers.current.get(p.slug);
      if (!m) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "map-pin";
        b.dataset.slug = p.slug;
        b.textContent = p.km == null ? "·" : `${Math.round(p.km)} km`;
        b.setAttribute("aria-label", `Coach ${p.km == null ? "" : Math.round(p.km) + " km away"}`);
        b.addEventListener("click", () => onSelectRef.current(p.slug));
        m = new maplibregl.Marker({ element: b, anchor: "bottom" }).setLngLat([p.long, p.lat]).addTo(map);
        markers.current.set(p.slug, m);
      }
      m.getElement().dataset.active = String(p.slug === activeSlug);
    }
  }, [pins, activeSlug]);

  return <div ref={el} className={`h-full w-full ${className}`} aria-label="Map of coaches" role="region" />;
}

function fitToRadius(map: maplibregl.Map, origin: { lat: number; long: number }, radiusKm: number) {
  const dLat = radiusKm / 110.574;
  const dLong = radiusKm / (111.32 * Math.cos((origin.lat * Math.PI) / 180));
  map.fitBounds(
    [
      [origin.long - dLong, origin.lat - dLat],
      [origin.long + dLong, origin.lat + dLat],
    ],
    { padding: 40, duration: 600, maxZoom: 12 }
  );
}
