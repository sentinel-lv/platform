import { useFeeder } from '../store/feederStore';

export default function StatusBar() {
  const feederId = useFeeder((s) => s.feederId);
  const order = useFeeder((s) => s.order);
  const mode = useFeeder((s) => s.mode);
  const conn = useFeeder((s) => s.conn);
  const dot = conn === 'live' ? 'bg-green-500' : conn === 'reconnecting' ? 'bg-amber-500' : 'bg-gray-400';
  const label = conn === 'live' ? 'LIVE' : conn === 'reconnecting' ? 'RECONNECTING…' : 'CONNECTING…';
  return (
    <header className="bg-slate-900 px-4 py-2 text-sm text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1">
      <span className="font-bold">Closed-Circuit</span>
      <span className="tabular-nums">{feederId} · {order.length} nodes · {mode}</span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="ml-auto rounded bg-amber-400 px-2 py-0.5 text-xs font-semibold text-black">
        Simulated feeder · live consensus engine
      </span>
      </div>
    </header>
  );
}
