import { useFeeder } from '../store/feederStore';
import NodeCard from './NodeCard';

export default function NodePanel() {
  const order = useFeeder((s) => s.order);
  const nodes = useFeeder((s) => s.nodes);
  // RECOVERED is healed (false alarm rejected) — only live trouble counts
  const bad = order.filter((id) => ['SUSPECT', 'CONFIRMED', 'OFFLINE'].includes(nodes[id]?.tel.state ?? '')).length;
  return (
    <div className="rounded border bg-white p-2 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-bold">Nodes</span>
        <span className="text-xs tabular-nums text-slate-500">{order.length} total · {bad === 1 ? '1 needs' : `${bad} need`} attention</span>
      </div>
    <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
      {order.map((id) => (nodes[id] ? <NodeCard key={id} id={id} view={nodes[id]} /> : null))}
      {order.length === 0 && <div className="p-3 text-sm text-slate-500">Connecting to feeder…</div>}
    </div>
    </div>
  );
}
