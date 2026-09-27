import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
// imported here, not in main.tsx, so it ships with the lazy console chunk
import 'maplibre-gl/dist/maplibre-gl.css';
import { useFeeder } from '../store/feederStore';
import type { NodeState } from '../types/protocol';
import { STATE, STATE_ORDER } from '../theme/state';
import { TOKENS } from '../theme/tokens';
import AddNodeForm from './AddNodeForm';

/**
 * Basemap: plain OpenStreetMap raster, darkened in the GPU by MapLibre's own
 * raster paint properties.
 *
 * The obvious move — a ready-made dark tile set — is a trap: CARTO, Stadia and
 * Mapbox all now want an API key for their dark styles, and a demo that dies
 * on a rate limit or an expired token in front of a panel is not worth the
 * nicer tiles. OSM standard needs no key.
 *
 * Darkening on the raster layer (rather than a CSS filter on the canvas) is
 * deliberate: a CSS filter would invert the span lines and pins too, because
 * MapLibre draws them onto the same canvas.
 */
const BASEMAP_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const ATTRIBUTION = '© OpenStreetMap contributors';

function displayState(tel: { state: NodeState; ts: number } | undefined, now: number): NodeState {
  if (!tel || now - tel.ts > 30_000) return 'OFFLINE';  // stalled stream degrades honestly
  return tel.state;
}

/**
 * One line layer per state rather than a data-driven colour ramp, because
 * MapLibre's line-dasharray is not a data-driven property — and the dash is
 * what makes the feeder readable with hue removed.
 */
function ensureSpanLayers(map: maplibregl.Map) {
  if (map.getSource('span')) return;
  const add = () => {
    if (map.getSource('span')) return;
    map.addSource('span', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as never });

    // A wide dark casing first, so the span reads against any tile beneath it.
    map.addLayer({
      id: 'span-casing',
      type: 'line',
      source: 'span',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 8, 'line-color': TOKENS.bg, 'line-opacity': 0.85 },
    });

    for (const s of STATE_ORDER) {
      const style = STATE[s];
      map.addLayer({
        id: `span-${s}`,
        type: 'line',
        source: 'span',
        filter: ['==', ['get', 'state'], s],
        layout: { 'line-cap': style.dash ? 'butt' : 'round', 'line-join': 'round' },
        paint: {
          'line-width': s === 'CONFIRMED' ? 5 : 3.5,
          'line-color': style.color,
          ...(style.dash ? { 'line-dasharray': style.dash } : {}),
        },
      });
    }
  };
  if (map.isStyleLoaded()) add();
  else map.once('load', add);
}

function pinHtml(id: string, state: NodeState, selected: boolean) {
  const s = STATE[state];
  return { glyph: s.glyph, color: s.color, title: `${id} — ${s.label}: ${s.meaning}`, selected };
}

export default function FeederMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const subMarker = useRef<maplibregl.Marker | null>(null);

  const poles = useFeeder((s) => s.poles);
  const nodes = useFeeder((s) => s.nodes);
  const substation = useFeeder((s) => s.substation);
  const selected = useFeeder((s) => s.selectedNode);
  const selectNode = useFeeder((s) => s.selectNode);

  const [arming, setArming] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  /**
   * Bumped every time a Map instance is created. StrictMode mounts, tears
   * down and remounts effects in development, and a lazily-imported console
   * makes that ordering bite: the teardown removed the map while the marker
   * refs survived, so the re-mounted map got no markers and the feeder
   * rendered as bare line work. Every effect that talks to the map depends on
   * this, so they all re-run against the new instance.
   */
  const [mapEpoch, setMapEpoch] = useState(0);

  // click-to-place commissioning: arm, click the pole position, confirm
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !arming) return;
    const onClick = (e: maplibregl.MapMouseEvent) => setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [arming]);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: BASEMAP_TILES, tileSize: 256, attribution: ATTRIBUTION },
        },
        layers: [
          {
            id: 'base',
            type: 'raster',
            source: 'base',
            paint: {
              'raster-saturation': -0.8,     // lose the postcard colour
              'raster-brightness-max': 0.19,  // pull white paper down to near-black
              'raster-contrast': 0.34,        // put back the road/land separation that costs
              'raster-opacity': 0.85,
            },
          },
        ],
      },
      center: [76.9406, 8.5265],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapObj.current = map;
    setMapEpoch((n) => n + 1);

    // The map lives in a flex/grid cell that can still be zero-height on the
    // first paint. Without this every marker pins to the container origin,
    // because MapLibre projects against a stale viewport size.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(mapRef.current);

    return () => {
      ro.disconnect();
      // Markers belong to the map being destroyed — drop the refs with it,
      // or the next map is handed markers that are already detached.
      for (const m of markers.current.values()) m.remove();
      markers.current.clear();
      subMarker.current?.remove();
      subMarker.current = null;
      map.remove();
      mapObj.current = null;
    };
  }, []);

  // substation marker at the feeder head
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !substation) return;
    if (!subMarker.current) {
      const el = document.createElement('div');
      el.title = 'Substation / feeder head — the gateway lives here';
      el.style.cssText =
        `display:grid;place-items:center;width:26px;height:26px;border-radius:6px;` +
        `background:${TOKENS.surface2};border:2px solid ${TOKENS.accent};` +
        `color:${TOKENS.accent};font:700 12px/1 Inter,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.6)`;
      el.textContent = 'GW';
      subMarker.current = new maplibregl.Marker({ element: el }).setLngLat([substation.lng, substation.lat]).addTo(map);
    } else {
      subMarker.current.setLngLat([substation.lng, substation.lat]);
    }
  }, [substation, mapEpoch]);

  // pins follow poles; bounds include the substation so nothing sits off-screen
  useEffect(() => {
    const map = mapObj.current;
    if (!map || poles.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    if (substation) bounds.extend([substation.lng, substation.lat]);
    for (const p of poles) {
      bounds.extend([p.lng, p.lat]);
      if (!markers.current.has(p.node_id)) {
        // MapLibre owns the OUTER element's `transform` — that is how it
        // positions a marker. Anything we scale or animate has to be an inner
        // node, or every pin snaps back to the container origin.
        const wrap = document.createElement('div');
        wrap.id = `pin-${p.node_id}`;
        const pin = document.createElement('div');
        pin.className = 'cc-pin';
        wrap.appendChild(pin);
        wrap.addEventListener('click', (ev) => {
          ev.stopPropagation();
          selectNode(useFeeder.getState().selectedNode === p.node_id ? null : p.node_id);
        });
        markers.current.set(
          p.node_id,
          new maplibregl.Marker({ element: wrap }).setLngLat([p.lng, p.lat]).addTo(map),
        );
      } else {
        markers.current.get(p.node_id)!.setLngLat([p.lng, p.lat]);
      }
    }
    // drop pins for nodes that were decommissioned
    for (const [id, m] of markers.current) {
      if (!poles.some((p) => p.node_id === id)) { m.remove(); markers.current.delete(id); }
    }
    map.fitBounds(bounds, { padding: 56, maxZoom: 16 });
    ensureSpanLayers(map);
  }, [poles, substation, selectNode, mapEpoch]);

  // re-evaluate staleness on a ticker so OFFLINE appears without new frames
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // spans are coloured by the DOWNSTREAM node's state: that is the segment the
  // break actually de-energises
  const statesSig =
    poles.map((p) => `${p.node_id}:${displayState(nodes[p.node_id]?.tel, Date.now())}`).join(',') +
    `|${tick}|${mapEpoch}`;
  useEffect(() => {
    const map = mapObj.current;
    if (!map || poles.length === 0) return;
    const feats = [];
    for (let i = 0; i < poles.length - 1; i++) {
      const dn = poles[i + 1];
      feats.push({
        type: 'Feature',
        properties: { state: displayState(nodes[dn.node_id]?.tel, Date.now()) },
        geometry: { type: 'LineString', coordinates: [[poles[i].lng, poles[i].lat], [dn.lng, dn.lat]] },
      });
    }
    if (!map.getSource('span')) ensureSpanLayers(map);
    (map.getSource('span') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection', features: feats,
    } as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesSig]);

  // pin appearance follows telemetry + selection
  useEffect(() => {
    const now = Date.now();
    for (const [id, m] of markers.current) {
      const wrap = m.getElement();
      const pin = wrap.firstElementChild as HTMLElement | null;
      if (!pin) continue;
      const st = displayState(nodes[id]?.tel, now);
      const p = pinHtml(id, st, selected === id);
      pin.style.background = p.color;
      pin.textContent = p.glyph;
      wrap.title = p.title;
      pin.dataset.alarm = String(st === 'CONFIRMED');
      pin.style.borderColor = p.selected ? TOKENS.text : 'rgba(255,255,255,.92)';
      // scale the inner pin only; the wrapper's transform belongs to MapLibre
      pin.style.scale = p.selected ? '1.25' : '1';
      wrap.style.zIndex = p.selected ? '5' : '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, tick, selected, mapEpoch]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-panel border border-line bg-surface-1">
      <div ref={mapRef} data-testid="feeder-map" className="h-full w-full" />

      <button
        data-testid="arm-add-node"
        onClick={() => { setArming(!arming); setDraft(null); }}
        className={`absolute left-3 top-3 z-10 rounded border px-2.5 py-1.5 text-xs font-semibold shadow-lift transition ${
          arming
            ? 'border-accent bg-accent text-white'
            : 'border-line bg-surface-1/95 text-ink-2 backdrop-blur hover:text-ink'
        }`}
        title="Commission a new sentinel node: arm, then click the pole position on the map"
      >
        {arming ? 'Click a pole position… (cancel)' : '+ Commission node'}
      </button>

      {draft && <AddNodeForm lat={draft.lat} lng={draft.lng} onDone={() => { setDraft(null); setArming(false); }} />}
    </div>
  );
}
