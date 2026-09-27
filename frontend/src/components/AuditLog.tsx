import { useEffect, useState } from 'react';
import { useFeeder } from '../store/feederStore';
import { Empty, Panel } from './ui';

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
  return (
    <Panel
      title="Audit log"
      right={
        <button onClick={load} className="text-2xs font-semibold text-ink-3 transition hover:text-ink-2">
          Refresh
        </button>
      }
      className="mx-auto w-full max-w-3xl"
      dense
    >
      {rows.length === 0 ? (
        <Empty>No privileged writes yet. Mode changes, config edits and acknowledgements land here with an actor.</Empty>
      ) : (
        <table data-testid="audit" className="w-full text-2xs">
          <thead>
            <tr className="border-b border-line-soft text-left uppercase tracking-[.1em] text-ink-3">
              <th className="px-3 py-1.5 font-semibold">Time</th>
              <th className="px-3 py-1.5 font-semibold">Actor</th>
              <th className="px-3 py-1.5 font-semibold">Action</th>
              <th className="px-3 py-1.5 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody className="cc-mono">
            {rows.map((r, i) => (
              <tr key={i} className={i ? 'border-t border-line-soft' : ''}>
                <td className="whitespace-nowrap px-3 py-1.5 tabular-nums text-ink-3">
                  {new Date(r.ts).toLocaleTimeString('en-GB', { hour12: false })}
                </td>
                <td className="px-3 py-1.5 text-ink-2">{r.actor}</td>
                <td className="px-3 py-1.5 font-semibold text-accent">{r.action}</td>
                <td className="max-w-[340px] truncate px-3 py-1.5 text-ink-3" title={JSON.stringify(r.detail)}>
                  {JSON.stringify(r.detail)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
