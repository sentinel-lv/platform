import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useFeeder } from '../store/feederStore';
import type { NodeState } from '../types/protocol';
import AddNodeForm from './AddNodeForm';

const COLOR: Record<NodeState, string> = {
  NORMAL: '#16a34a', SUSPECT: '#f59e0b', CONFIRMED: '#dc2626', RECOVERED: '#0d9488', OFFLINE: '#6b7280',
};

function ensureSpanLayer(map: maplibregl.Map) {
  if (map.getSource('span')) return;
  const empty = { type: 'FeatureCollection', features: [] } as never;
  const add = () => {
    if (map.getSource('span')) return;
    map.addSource('span', { type: 'geojson', data: empty });
    map.addLayer({
      id: 'span', type: 'line', source: 'span', paint: {
        'line-width': 4,
        'line-color': ['match', ['get', 'state'],
          'NORMAL', COLOR.NORMAL, 'SUSPECT', COLOR.SUSPECT, 'CONFIRMED', COLOR.CONFIRMED,
          'RECOVERED', COLOR.RECOVERED, COLOR.OFFLINE],
      },
    });
  };
  if (map.isStyleLoaded()) add();
  else map.once('load', add);
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
  const [arming, setArming] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);

  // click-to-place commissioning: arm, click the pole position, confirm
  useEffect(() => {
    const map = mapObj.current;
    if (!map || !arming) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
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
    const data = { type: 'FeatureCollection', features: feats } as never;
    if (!map.getSource('span')) ensureSpanLayer(map);
    (map.getSource('span') as maplibregl.GeoJSONSource | undefined)?.setData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statesSig]);

  useEffect(() => {
    const now = Date.now();
    for (const [id, m] of markers.current) {
      const el = m.getElement();
      const st = displayState(nodes[id]?.tel, now);
      el.style.background = COLOR[st];
      el.textContent = id.replace('N-', '');
      el.title = `${id} — ${st}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, tick]);

  return (
    <div className="relative">
      <div ref={mapRef} data-testid="feeder-map" className="h-72 w-full rounded bg-slate-200 md:h-96" />
      <button
        data-testid="arm-add-node"
        onClick={() => { setArming(!arming); setDraft(null); }}
        className={`absolute left-2 top-2 z-10 rounded px-2 py-1 text-xs font-bold shadow ${arming ? 'bg-emerald-700 text-white' : 'bg-white text-slate-800'}`}
      >
        {arming ? 'Click map to place… (cancel)' : '+ Add node'}
      </button>
      {draft && <AddNodeForm lat={draft.lat} lng={draft.lng} onDone={() => { setDraft(null); setArming(false); }} />}
    </div>
  );
}
