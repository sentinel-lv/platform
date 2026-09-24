import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';
import type { NodeState } from '../types/protocol';
import AddNodeForm from './AddNodeForm';

const COLOR: Record<NodeState, string> = {
  NORMAL: '#175641', SUSPECT: '#9A6B00', CONFIRMED: '#B3261E', RECOVERED: '#0F766E', OFFLINE: '#57534E',
};

function ensureSpanLayer(map: maplibregl.Map) {
  const empty = { type: 'FeatureCollection', features: [] } as never;
  const addAll = () => {
    if (!map.getSource('span-base')) {
      map.addSource('span-base', { type: 'geojson', data: empty });
      map.addLayer({
        id: 'span-base', type: 'line', source: 'span-base',
        layout: { 'line-cap': 'round' },
        paint: { 'line-width': 3.5, 'line-color': COLOR.NORMAL },
      });
    }
    if (!map.getSource('span-alert')) {
      map.addSource('span-alert', { type: 'geojson', data: empty });
      map.addLayer({
        id: 'span-alert', type: 'line', source: 'span-alert',
        layout: { 'line-cap': 'round' },
        paint: {
          'line-width': 5.5,
          'line-color': ['match', ['get', 'state'],
            'SUSPECT', COLOR.SUSPECT, 'CONFIRMED', COLOR.CONFIRMED,
            'RECOVERED', COLOR.RECOVERED, COLOR.OFFLINE],
        },
      });
    }
  };
  if (map.isStyleLoaded()) addAll();
  else map.once('load', addAll);
}

function displayState(tel: { state: NodeState; ts: number } | undefined, now: number): NodeState {
  if (!tel || now - tel.ts > 30_000) return 'OFFLINE';  // stalled stream degrades honestly
  return tel.state;
}

export default function FeederMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const poles = useFeeder((s) => s.poles);
  const nodes = useFeeder((s) => s.nodes);
  const removeNodeView = useFeeder((s) => s.removeNodeView);
  const selectedId = useFeeder((s) => s.selectedId);
  const setSelected = useFeeder((s) => s.setSelected);
  const [arming, setArming] = useState<'idle' | 'add' | 'remove'>('idle');
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);

  // click-to-place commissioning: arm add or remove, then click the map/pin
  useEffect(() => {
    const map = mapObj.current;
    if (!map || arming === 'idle') return;
    if (arming === 'add') {
      const onClick = (e: maplibregl.MapMouseEvent) => {
        // ignore clicks that land on an existing pin — those belong to remove mode
        if ((e.originalEvent.target as HTMLElement | null)?.closest?.('.pole-pin')) return;
        setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      };
      map.on('click', onClick);
      map.getCanvas().style.cursor = 'crosshair';
      return () => {
        map.off('click', onClick);
        map.getCanvas().style.cursor = '';
      };
    }
    return undefined;
  }, [arming]);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [76.9406, 8.5265],
      zoom: 14,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapObj.current = map;
    return () => { map.remove(); mapObj.current = null; };
  }, []);

  // pins + span polyline follow poles once + state colours follow telemetry
  // Marker cleanup: without this, decommissioned pins linger on the map
  // (stale DOM markers leech into later Playwright clicks — "ugly and inactive").
  useEffect(() => {
    const alive = new Set(poles.map((p) => p.node_id));
    for (const [id, m] of markers.current) {
      if (!alive.has(id)) {
        m.remove();
        markers.current.delete(id);
      }
    }
  }, [poles]);
  useEffect(() => {
    const map = mapObj.current;
    if (!map || poles.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const p of poles) {
      bounds.extend([p.lng, p.lat]);
      if (!markers.current.has(p.node_id)) {
        const el = document.createElement('div');
        el.className = 'pole-pin';
        el.id = `pin-${p.node_id}`;
        const m = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
        markers.current.set(p.node_id, m);
      } else {
        markers.current.get(p.node_id)!.setLngLat([p.lng, p.lat]);
      }
    }
    map.fitBounds(bounds, { padding: 40, maxZoom: 16 });
    ensureSpanLayer(map);
  }, [poles]);

  // span segments coloured by the DOWNSTREAM node's state (README: no manual pan needed, health readable)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);  // re-evaluate staleness
    return () => clearInterval(t);
  }, []);
  const statesSig = poles.map((p) => `${p.node_id}:${displayState(nodes[p.node_id]?.tel, Date.now())}`).join(',') + tick;
  useEffect(() => {
    const map = mapObj.current;
    if (!map || poles.length === 0) return;
    const feats = [];
    for (let i = 0; i < poles.length - 1; i++) {
      const dn = poles[i + 1];
      feats.push({
        type: 'Feature', properties: { state: displayState(nodes[dn.node_id]?.tel, Date.now()) },
        geometry: { type: 'LineString', coordinates: [[poles[i].lng, poles[i].lat], [dn.lng, dn.lat]] },
      });
    }
    const base = { type: 'FeatureCollection', features: feats } as never;
    // healthy spans draw thin green underneath; non-normal spans overdraw thick.
    const alert = {
      type: 'FeatureCollection',
      features: feats.filter((f) => (f as { properties: { state: string } }).properties.state !== 'NORMAL'),
    } as never;
    if (!map.getSource('span-base') || !map.getSource('span-alert')) ensureSpanLayer(map);
    (map.getSource('span-base') as maplibregl.GeoJSONSource | undefined)?.setData(base);
    (map.getSource('span-alert') as maplibregl.GeoJSONSource | undefined)?.setData(alert);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesSig]);

  useEffect(() => {
    const now = Date.now();
    const removing = arming === 'remove';
    for (const [id, m] of markers.current) {
      const el = m.getElement();
      const st = displayState(nodes[id]?.tel, now);
      el.style.background = COLOR[st];
      el.classList.toggle('is-suspect', st === 'SUSPECT');
      el.classList.toggle('is-confirmed', st === 'CONFIRMED');
      el.classList.toggle('is-selected', id === selectedId);
      el.textContent = removing ? '✕' : id.replace('N-', '');
      el.title = removing ? `${id} — click to decommission` : `${id} — ${st} — click to inspect`;
      el.style.cursor = 'pointer';
      // data-pin keeps the id reachable for headless click-through
      el.setAttribute('data-pin', id);
      el.onclick = (ev) => {
        ev.stopPropagation();
        if (removing) {
          void (async () => {
            try {
              await api.removeNode(id);
            } catch {
              /* 404 (already gone) still clears the pin locally */
            }
            const g = await api.feeder(useFeeder.getState().feederId);
            useFeeder.getState().setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
            removeNodeView(id);
            if (useFeeder.getState().selectedId === id) useFeeder.getState().setSelected(null);
            setArming('idle');
          })();
          return;
        }
        setSelected(id);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, tick, arming, selectedId]);

  return (
    <section aria-label="Feeder map" className="cc-panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b-[1.5px] border-ink bg-porcelain px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">Feeder line</h2>
        <ul className="cc-tick ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <li className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-insulator" /> normal</li>
          <li className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-wire" /> suspect</li>
          <li className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-fault" /> isolated</li>
          <li className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-recover" /> recovered</li>
          <li className="flex items-center gap-1"><span className="inline-block h-2 w-4 bg-stone-500" /> offline</li>
        </ul>
      </div>
      <div className="relative">
        <div ref={mapRef} data-testid="feeder-map" className="h-72 w-full bg-paper md:h-96" />
        <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1.5">
          <button
            data-testid="arm-add-node"
            onClick={() => { setArming(arming === 'add' ? 'idle' : 'add'); setDraft(null); }}
            aria-pressed={arming === 'add'}
            className={`border-[1.5px] border-ink px-2.5 py-1.5 font-display text-xs font-bold shadow-platesm focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator ${arming === 'add' ? 'bg-insulator text-porcelain' : 'bg-porcelain text-ink hover:bg-amber-100'}`}
          >
            {arming === 'add' ? 'Placing… click bare line (cancel)' : '+ Commission node'}
          </button>
          <button
            data-testid="arm-remove-node"
            onClick={() => { setArming(arming === 'remove' ? 'idle' : 'remove'); setDraft(null); }}
            aria-pressed={arming === 'remove'}
            className={`border-[1.5px] border-ink px-2.5 py-1.5 font-display text-xs font-bold shadow-platesm focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator ${arming === 'remove' ? 'bg-fault text-porcelain' : 'bg-porcelain text-ink hover:bg-amber-100'}`}
          >
            {arming === 'remove' ? 'Click a pin to remove (cancel)' : '− Decommission'}
          </button>
        </div>
        {draft && (
          <AddNodeForm
            lat={draft.lat}
            lng={draft.lng}
            onDone={() => { setDraft(null); setArming('idle'); }}
            onCancel={() => { setDraft(null); setArming('idle'); }}
          />
        )}
      </div>
    </section>
  );
}
