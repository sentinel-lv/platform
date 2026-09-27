import { useEffect, useState } from 'react';
import { useFeeder, isOffline } from '../store/feederStore';
import { STATE, STATE_ORDER } from '../theme/state';
import NodeCard from './NodeCard';
import { Empty, Panel } from './ui';

/** Compact legend — the key to every pin, badge and span on screen. */
function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line-soft px-3 py-1.5">
      {STATE_ORDER.map((s) => (
        <span key={s} className="flex items-center gap-1 text-2xs text-ink-3" title={STATE[s].meaning}>
          <span aria-hidden="true" style={{ color: STATE[s].color }}>{STATE[s].glyph}</span>
          {STATE[s].label}
        </span>
      ))}
    </div>
  );
}

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
        <span className={`cc-mono text-2xs tabular-nums ${bad ? 'text-warning' : 'text-ink-3'}`}>
          {bad === 0 ? `${order.length} healthy` : `${bad} of ${order.length} need attention`}
        </span>
      }
      className="min-h-[200px] flex-1"
      dense
      bodyClassName="flex flex-col"
    >
      <Legend />
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
