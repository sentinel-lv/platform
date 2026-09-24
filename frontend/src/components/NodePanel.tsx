import { useFeeder } from '../store/feederStore';
import NodeCard from './NodeCard';

export default function NodePanel() {
  const order = useFeeder((s) => s.order);
  const nodes = useFeeder((s) => s.nodes);
  const selectedId = useFeeder((s) => s.selectedId);
  const setSelected = useFeeder((s) => s.setSelected);
  // RECOVERED is healed (false alarm rejected) — only live trouble counts
  const bad = order.filter((id) =>
    ['SUSPECT', 'CONFIRMED', 'OFFLINE'].includes(nodes[id]?.tel.state ?? ''),
  ).length;
  return (
    <section aria-label="Nodes" className="cc-panel overflow-hidden">
      <div className="flex items-baseline justify-between border-b-[1.5px] border-ink px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">Pole instruments</h2>
        <p className="cc-tick text-[11px] text-ink/70">
          {order.length} on line · {bad} {bad === 1 ? 'needs' : 'need'} attention
        </p>
      </div>
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto bg-paper/50 p-2">
        {order.map((id) =>
          nodes[id] ? (
            <div
              key={id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedId === id}
              aria-label={`Inspect ${id}`}
              onClick={() => setSelected(selectedId === id ? null : id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(selectedId === id ? null : id);
                }
              }}
              className={`cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator ${
                selectedId === id ? 'outline outline-2 outline-insulator' : ''
              }`}
            >
              <NodeCard id={id} view={nodes[id]} />
            </div>
          ) : null,
        )}
        {order.length === 0 && (
          <p className="p-3 text-sm text-ink/70">Connecting to feeder…</p>
        )}
      </div>
    </section>
  );
}
