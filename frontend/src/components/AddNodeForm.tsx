import { useState } from 'react';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';
import { Btn } from './ui';

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
    <div
      data-testid="add-node-form"
      className="cc-rise absolute left-3 top-14 z-20 w-64 rounded-panel border border-line bg-surface-1/97 p-3 shadow-lift backdrop-blur"
    >
      <div className="text-2xs font-bold uppercase tracking-[.14em] text-ink-3">Commission node</div>
      <div className="cc-mono mt-1 text-2xs tabular-nums text-ink-3">{lat.toFixed(5)}, {lng.toFixed(5)}</div>

      <label className="mt-2.5 block text-2xs text-ink-2">
        Node ID
        <input data-testid="add-node-id" className="cc-input cc-mono mt-1" value={nodeId} onChange={(e) => setNodeId(e.target.value.toUpperCase())} />
      </label>

      <label className="mt-2 block text-2xs text-ink-2">
        Downstream of
        <select data-testid="add-node-after" className="cc-input cc-mono mt-1" value={after} onChange={(e) => setAfter(e.target.value)}>
          <option value="">— feeder head —</option>
          {order.map((id) => <option key={id} value={id}>{id}</option>)}
        </select>
      </label>

      <label className="mt-2 block text-2xs text-ink-2">
        Span (m)
        <input data-testid="add-node-span" type="number" className="cc-input cc-mono mt-1" value={span} onChange={(e) => setSpan(Number(e.target.value))} />
      </label>

      {err && (
        <div role="alert" className="mt-2 rounded border border-critical bg-critical-dim px-2 py-1 text-2xs text-critical">
          {err}
        </div>
      )}

      <div className="mt-2.5 flex gap-1.5">
        <Btn variant="primary" data-testid="add-node-submit" disabled={busy} onClick={submit} className="flex-1">
          {busy ? 'Adding…' : 'Add node'}
        </Btn>
        <Btn onClick={onDone}>Cancel</Btn>
      </div>

      <p className="mt-2 text-2xs leading-tight text-ink-3">
        Order along the feeder is what makes a fault span computable — pick the true upstream pole.
      </p>
    </div>
  );
}
