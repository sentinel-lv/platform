import { useEffect, useState } from 'react';
import { useFeeder } from '../store/feederStore';

interface Row { actor: string; action: string; detail: Record<string, unknown>; ts: number }

// Who did what, when: mode/config/ack/provision writes (backend audit.py).
export default function AuditLog() {
  const events = useFeeder((s) => s.events);
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8015'}/audit?limit=20`);
      if (r.ok) setRows(await r.json());
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [events.length]);
  if (rows.length === 0) return null;
  return (
    <div data-testid="audit" className="rounded border bg-white p-2 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-bold">Audit</span>
        <button onClick={load} className="text-xs text-slate-500">refresh</button>
      </div>
      <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-xs">
        {rows.map((r, i) => (
          <li key={i} className="font-mono text-[11px] text-slate-600">
            {new Date(r.ts).toLocaleTimeString()} {r.actor} {r.action} {JSON.stringify(r.detail)}
          </li>
        ))}
      </ul>
    </div>
  );
}
