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

function nearestPole(
  poles: { node_id: string; lat: number; lng: number }[],
  lat: number,
  lng: number,
): string {
  let best = '';
  let bd = Infinity;
  for (const p of poles) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bd) {
      bd = d;
      best = p.node_id;
    }
  }
  return best;
}

export default function AddNodeForm({
  lat,
  lng,
  onDone,
  onCancel,
}: {
  lat: number;
  lng: number;
  onDone: () => void;
  onCancel?: () => void;
}) {
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
    setBusy(true);
    setErr(null);
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
      role="dialog"
      aria-label="Commission node"
      className="absolute left-2 top-14 z-10 w-64 border-[1.5px] border-ink bg-porcelain p-3 shadow-plate"
    >
      <p className="font-display text-sm font-extrabold">Commission node</p>
      <p className="cc-tick mb-2 text-xs text-ink/60">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
      <label className="block text-xs font-semibold">
        Node ID
        <input
          data-testid="add-node-id"
          className="cc-tick mt-0.5 w-full border border-ink/40 bg-paper px-1.5 py-1"
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value.toUpperCase())}
        />
      </label>
      <label className="mt-1.5 block text-xs font-semibold">
        Upstream of (after)
        <select
          data-testid="add-node-after"
          className="cc-tick mt-0.5 w-full border border-ink/40 bg-paper px-1.5 py-1"
          value={after}
          onChange={(e) => setAfter(e.target.value)}
        >
          <option value="">— tail —</option>
          {order.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-1.5 block text-xs font-semibold">
        Span (m)
        <input
          data-testid="add-node-span"
          type="number"
          className="cc-tick mt-0.5 w-full border border-ink/40 bg-paper px-1.5 py-1"
          value={span}
          onChange={(e) => setSpan(Number(e.target.value))}
        />
      </label>
      {err && (
        <p role="alert" className="mt-1.5 border border-fault bg-fault/10 px-2 py-1 text-xs text-faultdeep">
          {err}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          data-testid="add-node-submit"
          disabled={busy}
          onClick={submit}
          className="flex-1 border-[1.5px] border-ink bg-insulator px-2 py-1.5 font-display text-xs font-bold text-porcelain disabled:opacity-40"
        >
          {busy ? 'Adding…' : 'Add node'}
        </button>
        <button
          onClick={onCancel ?? onDone}
          className="border-[1.5px] border-ink bg-porcelain px-2 py-1.5 text-xs font-bold hover:bg-amber-100"
        >
          Cancel
        </button>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-ink/65">
        Placement defines fault spans — pick the true upstream pole.
      </p>
    </div>
  );
}
