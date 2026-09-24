// Who did what, when: mode/config/ack/provision writes (backend audit.py).
import { useEffect, useState } from 'react';
import { useFeeder } from '../store/feederStore';

interface Row {
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  ts: number;
}

export default function AuditLog() {
  const events = useFeeder((s) => s.events);
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    try {
      const r = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:8015'}/audit?limit=20`,
      );
      if (r.ok) setRows(await r.json());
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    load();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [events.length]);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Audit ledger" data-testid="audit" className="cc-panel overflow-hidden">
      <div className="flex items-center justify-between border-b-[1.5px] border-ink px-3 py-2">
        <h2 className="font-display text-sm font-extrabold tracking-tight">Audit ledger</h2>
        <button
          onClick={load}
          className="text-xs font-semibold underline decoration-dotted underline-offset-2 hover:text-insulator focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator"
        >
          Refresh
        </button>
      </div>
      <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto bg-paper/50 p-2">
        {rows.map((r, i) => (
          <li key={i} className="cc-tick border-b border-dashed border-ink/20 pb-1 text-[11px] text-ink/75">
            {new Date(r.ts).toLocaleTimeString()} · {r.actor} · {r.action} ·{' '}
            {JSON.stringify(r.detail)}
          </li>
        ))}
      </ul>
    </section>
  );
}
