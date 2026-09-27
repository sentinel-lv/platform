import { useEffect, useState } from 'react';
import { useFeeder, isOffline } from '../store/feederStore';
import { Link } from '../router';
import NodeCard from './NodeCard';
import StateKey from './StateKey';
import { Empty, Panel } from './ui';

export default function NodePanel() {
  const order = useFeeder((s) => s.order);
  const nodes = useFeeder((s) => s.nodes);
  const selected = useFeeder((s) => s.selectedNode);
  const select = useFeeder((s) => s.selectNode);

  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  // RECOVERED is healed (false alarm rejected) — only live trouble counts.
  const bad = order.filter((id) => {
    const tel = nodes[id]?.tel;
    if (!tel) return false;
    return isOffline(tel, now) || ['SUSPECT', 'CONFIRMED'].includes(tel.state);
  }).length;

  return (
    <Panel
      title="Nodes"
      right={
        <span className="flex items-center gap-2">
          <span className={`cc-mono text-2xs tabular-nums ${bad ? 'text-warning' : 'text-ink-3'}`}>
            {bad === 0 ? `${order.length} healthy` : `${bad} of ${order.length} need attention`}
          </span>
          <Link
            to="/nodes"
            title="See every node's field trace side by side"
            className="flex min-h-[32px] items-center rounded border border-line px-2 text-2xs font-semibold text-ink-3 transition hover:border-ink-3 hover:text-ink-2 sm:min-h-0 sm:py-0.5"
          >
            Expand
          </Link>
        </span>
      }
      className="min-h-[200px] flex-1"
      dense
      bodyClassName="flex flex-col"
    >
      <StateKey compact />
      <div className="cc-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {order.map((id) =>
          nodes[id] ? (
            <NodeCard
              key={id}
              id={id}
              view={nodes[id]}
              selected={selected === id}
              onSelect={(n) => select(selected === n ? null : n)}
            />
          ) : null,
        )}
        {order.length === 0 && <Empty>Connecting to feeder…</Empty>}
      </div>
    </Panel>
  );
}
