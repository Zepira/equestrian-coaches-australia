"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * The results map. MapLibre GL on OpenFreeMap's vector tiles, recoloured
 * into the palette at load — cream ground, tint roads, ink labels — so it
 * reads as part of the page rather than a third-party widget.
 *
 * What's on it:
 *  - a dashed terracotta circle for the search radius and a pulsing origin
 *    dot, when there is a searched point;
 *  - one map pin per coach, clustered: coaches close together at the
 *    current zoom collapse into a numbered bubble, and clicking a bubble
 *    zooms in until it splits. Clustering is MapLibre's own (a GeoJSON
 *    source with `cluster: true`); the pins and bubbles themselves are HTML
 *    markers, re-derived from the visible source features after every
 *    move, so they can carry the palette, a name label and a real button;
 *  - the rider's own position (MapLibre's GeolocateControl: a locate button
 *    top-right and a dot once allowed), zoom buttons, and cooperative
 *    gestures so a plain scroll wheel scrolls the page.
 *
 * Marker positioning gotcha: MapLibre places a marker by setting an inline
 * `transform` on the element it is given, and a filling CSS animation on
 * that same element would outrank it (the pin then sits at 0,0 forever). So
 * the marker element is always a plain wrapper; anything animated lives
 * inside it.
 */
export type MapPin = { slug: string; lat: number; long: number; km: number | null; name?: string };

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const SOURCE = "coaches";
const CLUSTER_MAX_ZOOM = 13;
const AUSTRALIA: [[number, number], [number, number]] = [
  [113.3, -43.7],
  [153.7, -10.6],
];

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

function pinLabel(p: { km: number | null; name?: string }) {
  if (p.km != null) return `${Math.round(p.km)} km`;
  return p.name?.split(" ")[0] ?? "";
}

/** Bounds around every pin, or Australia when there are none. */
function pinBounds(pins: MapPin[]): maplibregl.LngLatBoundsLike {
  if (pins.length === 0) return AUSTRALIA;
  const b = new maplibregl.LngLatBounds([pins[0].long, pins[0].lat], [pins[0].long, pins[0].lat]);
  for (const p of pins) b.extend([p.long, p.lat]);
  return b;
}

function toGeoJSON(pins: MapPin[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      properties: { slug: p.slug, name: p.name ?? "", km: p.km },
      geometry: { type: "Point", coordinates: [p.long, p.lat] },
    })),
  };
}

// The pin glyph: a teardrop with a hollow centre, `currentColor` so the
// active/idle colour is one CSS rule.
const PIN_SVG =
  '<svg viewBox="0 0 28 38" width="28" height="38" aria-hidden="true"><path d="M14 1C6.8 1 1 6.7 1 13.8c0 9.4 11.2 21.4 12.2 22.5a1.1 1.1 0 0 0 1.6 0C15.8 35.2 27 23.2 27 13.8 27 6.7 21.2 1 14 1z" fill="currentColor" stroke="#f6f1e7" stroke-width="1.5"/><circle cx="14" cy="14" r="4.6" fill="#f6f1e7"/></svg>';

function makePin(slug: string, label: string, aria: string, onClick: () => void) {
  const wrap = document.createElement("div");
  wrap.className = "map-marker";
  const b = document.createElement("button");
  b.type = "button";
  b.className = "map-pin";
  b.dataset.slug = slug;
  b.setAttribute("aria-label", aria);
  b.innerHTML = PIN_SVG;
  if (label) {
    const l = document.createElement("span");
    l.className = "map-pin__label";
    l.textContent = label;
    b.appendChild(l);
  }
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  wrap.appendChild(b);
  return wrap;
}

function makeCluster(count: number, onClick: () => void) {
  const wrap = document.createElement("div");
  wrap.className = "map-marker";
  const b = document.createElement("button");
  b.type = "button";
  b.className = "map-cluster";
  b.dataset.size = count >= 50 ? "lg" : count >= 10 ? "md" : "sm";
  b.textContent = String(count);
  b.setAttribute("aria-label", `${count} coaches here — zoom in`);
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  wrap.appendChild(b);
  return wrap;
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
  const pinsRef = useRef(pins);
  const activeRef = useRef(activeSlug);
  useEffect(() => {
    onSelectRef.current = onSelect;
    pinsRef.current = pins;
    activeRef.current = activeSlug;
  }, [onSelect, pins, activeSlug]);

  // Rebuild the HTML markers from whatever the clustered source currently
  // exposes in view. Called after every move and whenever the data changes.
  // Held in a ref (assigned in an effect, never during render) so the map's
  // own event listeners, registered once, always call the latest closure.
  const syncMarkers = useRef(() => {});
  const sync = () => {
    const map = mapRef.current;
    if (!map || !map.getSource(SOURCE)) return;
    const feats = map.querySourceFeatures(SOURCE);
    const seen = new Set<string>();
    // Coincident coaches past the cluster ceiling land on one point; fan
    // those out in a small pixel ring so every pin stays tappable.
    const groups = new Map<string, string[]>();
    for (const f of feats) {
      if (f.properties?.cluster) continue;
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      const k = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const g = groups.get(k) ?? [];
      if (!g.includes(f.properties!.slug)) g.push(f.properties!.slug);
      groups.set(k, g);
    }
    for (const f of feats) {
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
      const props = f.properties ?? {};
      if (props.cluster) {
        const id = `c:${props.cluster_id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        let m = markers.current.get(id);
        if (!m) {
          const clusterId = props.cluster_id as number;
          const elc = makeCluster(props.point_count as number, async () => {
            const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource;
            const zoom = await src.getClusterExpansionZoom(clusterId);
            map.easeTo({ center: [lng, lat], zoom: Math.min(zoom + 0.3, 16), duration: 500 });
          });
          m = new maplibregl.Marker({ element: elc }).setLngLat([lng, lat]).addTo(map);
          markers.current.set(id, m);
        }
        continue;
      }
      const slug = props.slug as string;
      const id = `p:${slug}`;
      if (seen.has(id)) continue;
      seen.add(id);
      let m = markers.current.get(id);
      if (!m) {
        const label = pinLabel({ km: props.km ?? null, name: props.name });
        const aria = `${props.name || "Coach"}${props.km == null ? "" : `, ${Math.round(props.km)} km away`}`;
        m = new maplibregl.Marker({ element: makePin(slug, label, aria, () => onSelectRef.current(slug)), anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(map);
        markers.current.set(id, m);
      }
      const g = groups.get(`${lat.toFixed(4)},${lng.toFixed(4)}`) ?? [slug];
      if (g.length > 1) {
        const i = g.indexOf(slug);
        const r = 12 + g.length * 4;
        const a = (i / g.length) * Math.PI * 2 - Math.PI / 2;
        m.setOffset([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]);
      } else {
        m.setOffset([0, 0]);
      }
      const active = slug === activeRef.current;
      (m.getElement().firstElementChild as HTMLElement).dataset.active = String(active);
      m.getElement().style.zIndex = active ? "2" : "1";
    }
    for (const [id, m] of markers.current) {
      if (!seen.has(id)) {
        m.remove();
        markers.current.delete(id);
      }
    }
  };

  useEffect(() => {
    syncMarkers.current = sync;
  });

  // Map lifecycle
  useEffect(() => {
    if (!el.current || mapRef.current) return;
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
      bounds: origin ? radiusBounds(origin, radiusKm) : pinBounds(pinsRef.current),
      fitBoundsOptions: { padding: 48, maxZoom: 12 },
      attributionControl: { compact: true },
      dragRotate: false,
      // Plain wheel scrolls the page; ctrl/⌘ + wheel (or the buttons,
      // pinch, double-click) zooms — the same convention as embedded maps
      // on property sites, so a rider scrolling past never gets trapped.
      cooperativeGestures: true,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // The rider's own position: a locate button, then a dot (and accuracy
    // ring) once the browser permission is granted. Not tracked
    // continuously — one fix per press is what a search wants.
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 10_000 },
        trackUserLocation: false,
        showUserLocation: true,
        showAccuracyCircle: true,
        fitBoundsOptions: { maxZoom: 11 },
      }),
      "top-right"
    );
    // A style/tile/worker failure is otherwise silent: the map just stays
    // cream. Surface it.
    map.on("error", (e) => console.error("[coach-map]", e.error?.message ?? e));
    map.on("load", () => {
      recolour(map);
      map.addSource("radius", { type: "geojson", data: origin ? circle(origin.lat, origin.long, radiusKm) : { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#b4553a", "fill-opacity": 0.06 } });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#b4553a", "line-opacity": 0.5, "line-width": 1, "line-dasharray": [3, 3] },
      });
      // The coaches, clustered by MapLibre. No layer draws them — the HTML
      // markers do — but a source only yields query results for features it
      // has loaded, so an invisible layer keeps it live.
      map.addSource(SOURCE, { type: "geojson", data: toGeoJSON(pinsRef.current), cluster: true, clusterRadius: 44, clusterMaxZoom: CLUSTER_MAX_ZOOM });
      map.addLayer({ id: "coaches-anchor", type: "circle", source: SOURCE, paint: { "circle-radius": 0, "circle-opacity": 0 } });
      map.on("sourcedata", (e) => {
        if (e.sourceId === SOURCE && e.isSourceLoaded) syncMarkers.current();
      });
      map.on("moveend", () => syncMarkers.current());
      map.on("zoomend", () => syncMarkers.current());
      syncMarkers.current();
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
      map.fitBounds(radiusBounds(origin, radiusKm), { padding: 48, duration: 600, maxZoom: 12 });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [origin, radiusKm]);

  // Pin data changes → feed the source; the sourcedata event re-syncs the
  // markers. Without a searched point, frame whatever is on the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData(toGeoJSON(pins));
      if (!origin && pins.length > 0) map.fitBounds(pinBounds(pins), { padding: 56, duration: 600, maxZoom: 11 });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [pins, origin]);

  // Active pin changes → restyle in place, no re-query.
  useEffect(() => {
    for (const [id, m] of markers.current) {
      if (!id.startsWith("p:")) continue;
      const active = id === `p:${activeSlug}`;
      (m.getElement().firstElementChild as HTMLElement).dataset.active = String(active);
      m.getElement().style.zIndex = active ? "2" : "1";
    }
  }, [activeSlug]);

  return <div ref={el} className={`h-full w-full ${className}`} aria-label="Map of coaches" role="region" />;
}

function radiusBounds(origin: { lat: number; long: number }, radiusKm: number): [[number, number], [number, number]] {
  const dLat = radiusKm / 110.574;
  const dLong = radiusKm / (111.32 * Math.cos((origin.lat * Math.PI) / 180));
  return [
    [origin.long - dLong, origin.lat - dLat],
    [origin.long + dLong, origin.lat + dLat],
  ];
}
