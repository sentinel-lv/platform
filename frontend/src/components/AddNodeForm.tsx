import { useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';

function nextId(order: string[]): string {
  let mx = 0;
  for (const id of order) {
    const m = /^N-(\d{3})$/.exec(id);
    if (m) mx = Math.max(mx, parseInt(m[1], 10));
  }
  return `N-${String(mx + 1).padStart(3, '0')}`;
}

function nearestPole(poles: { node_id: string; lat: number; lng: number }[], lat: number, lng: number): string {
  let best = '', bd = Infinity;
  for (const p of poles) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bd) { bd = d; best = p.node_id; }
  }
  return best;
}

export default function AddNodeForm({ lat, lng, onDone }: { lat: number; lng: number; onDone: () => void }) {
  const order = useFeeder((s) => s.order);
  const poles = useFeeder((s) => s.poles);
  const feederId = useFeeder((s) => s.feederId);
  const setGeo = useFeeder((s) => s.setGeo);
  const [nodeId, setNodeId] = useState(() => nextId(order));
  const [after, setAfter] = useState(() => nearestPole(poles, lat, lng));
  const [span, setSpan] = useState(42);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      await api.addNode({ node_id: nodeId, lat, lng, span_m: span, after: after || null });
      const g = await api.feeder(feederId);
      setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'add failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="add-node-form" className="absolute left-2 top-12 z-10 w-64 rounded border bg-white p-3 shadow-lg">
      <div className="mb-2 text-sm font-bold">Commission node</div>
      <div className="mb-1 font-mono text-xs text-slate-500">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
      <label className="block text-xs">Node ID
        <input data-testid="add-node-id" className="mt-0.5 w-full rounded border px-1.5 py-1 font-mono" value={nodeId} onChange={(e) => setNodeId(e.target.value.toUpperCase())} />
      </label>
      <label className="mt-1 block text-xs">Upstream of (after)
        <select data-testid="add-node-after" className="mt-0.5 w-full rounded border px-1.5 py-1 font-mono" value={after} onChange={(e) => setAfter(e.target.value)}>
          <option value="">— tail —</option>
          {order.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>
      <label className="mt-1 block text-xs">Span (m)
        <input data-testid="add-node-span" type="number" className="mt-0.5 w-full rounded border px-1.5 py-1" value={span} onChange={(e) => setSpan(Number(e.target.value))} />
      </label>
      {err && <div className="mt-1 rounded bg-red-100 px-2 py-1 text-xs text-red-800">{err}</div>}
      <div className="mt-2 flex gap-2">
        <button data-testid="add-node-submit" disabled={busy} onClick={submit} className="flex-1 rounded bg-emerald-700 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-40">
          {busy ? 'Adding…' : 'Add node'}
        </button>
        <button onClick={onDone} className="rounded border px-2 py-1.5 text-xs">Cancel</button>
      </div>
      <div className="mt-1 text-[11px] text-slate-500">Placement defines fault spans — pick the true upstream pole.</div>
    </div>
  );
}
