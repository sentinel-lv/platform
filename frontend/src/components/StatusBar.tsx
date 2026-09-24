import { useFeeder } from '../store/feederStore';

export default function StatusBar() {
  const feederId = useFeeder((s) => s.feederId);
  const order = useFeeder((s) => s.order);
  const mode = useFeeder((s) => s.mode);
  const conn = useFeeder((s) => s.conn);
  const dot =
    conn === 'live'
      ? 'bg-emerald-400'
      : conn === 'reconnecting'
        ? 'bg-amber-300'
        : 'bg-stone-300';
  const label =
    conn === 'live' ? 'Live' : conn === 'reconnecting' ? 'Reconnecting' : 'Connecting';
  return (
    <header className="border-b-2 border-line bg-moss text-porcelain">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-3 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center border-[1.5px] border-porcelain bg-insulator font-display text-lg font-black"
          >
            ◍
          </span>
          <span>
            <span className="block font-display text-base font-extrabold leading-none tracking-tight">
              Closed-Circuit
            </span>
            <span className="mt-1 block text-[11px] font-medium text-porcelain/70">
              Low-voltage break isolation desk
            </span>
          </span>
        </div>
        <dl className="cc-tick flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-porcelain/90">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-porcelain/50">Feeder</dt>
            <dd className="font-semibold">{feederId}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-porcelain/50">Nodes</dt>
            <dd className="font-semibold">{order.length}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-porcelain/50">Mode</dt>
            <dd className="font-semibold">{mode}</dd>
          </div>
        </dl>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 border border-porcelain/40 px-2 py-1 text-xs font-semibold">
            <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
            {label}
          </span>
          <span className="border border-amber-200 bg-amber-300 px-2 py-1 text-[11px] font-bold text-ink">
            Simulated feeder · live consensus engine
          </span>
        </div>
      </div>
    </header>
  );
}
