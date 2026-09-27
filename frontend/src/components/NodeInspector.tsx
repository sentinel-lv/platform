import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { api } from '../api/client';
import { useFeeder, isOffline } from '../store/feederStore';
import type { NodeMeta } from '../types/protocol';
import { STATE, StateBadge } from '../theme/state';
import { Btn, Meter } from './ui';

const BATT_MIN = 2800;
const BATT_MAX = 4200;

function battTone(pct: number): 'good' | 'warning' | 'critical' {
  if (pct < 20) return 'critical';
  if (pct < 45) return 'warning';
  return 'good';
}

function Row({ k, v, tone = '' }: { k: string; v: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-2xs text-ink-3">{k}</dt>
      <dd className={`cc-mono text-2xs tabular-nums ${tone || 'text-ink-2'}`}>{v}</dd>
    </div>
  );
}

/**
 * Everything about one node, and the two things you can do to it.
 *
 * Slides in over the map when a pin or a card is selected. Live telemetry at
 * the top (it keeps updating while open), commissioning metadata below it,
 * and decommissioning behind a typed confirmation — removing a node
 * renumbers nothing, but it does change which spans exist, so it is not a
 * single click.
 */
export default function NodeInspector() {
  const id = useFeeder((s) => s.selectedNode);
  const nodes = useFeeder((s) => s.nodes);
  const poles = useFeeder((s) => s.poles);
  const feederId = useFeeder((s) => s.feederId);
  const setGeo = useFeeder((s) => s.setGeo);
  const select = useFeeder((s) => s.selectNode);

  const [meta, setMeta] = useState<NodeMeta | null>(null);
  const [label, setLabel] = useState('');
  const [device, setDevice] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [removing, setRemoving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // load metadata whenever the selection changes
  useEffect(() => {
    setMeta(null); setMsg(null); setConfirm(''); setRemoving(false);
    if (!id) return;
    let dead = false;
    api.nodeMeta(id)
      .then((m) => {
        if (dead) return;
        setMeta(m); setLabel(m.label ?? ''); setDevice(m.device_id ?? ''); setNotes(m.notes ?? '');
      })
      .catch(() => { if (!dead) setMsg('Could not load commissioning data.'); });
    return () => { dead = true; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') select(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, select]);

  if (!id) return null;
  const view = nodes[id];
  const pole = poles.find((p) => p.node_id === id);

  const dirty = !!meta && (label !== (meta.label ?? '') || device !== (meta.device_id ?? '') || notes !== (meta.notes ?? ''));

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const m = await api.patchNode(id, { label, device_id: device, notes });
      setMeta(m);
      setMsg('Saved.');
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'save failed');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.removeNode(id);
      const g = await api.feeder(feederId);
      setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
      select(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'remove failed');
      setBusy(false);
    }
  };

  const tel = view?.tel;
  const offline = tel ? isOffline(tel) : true;
  const state = offline ? 'OFFLINE' : tel!.state;
  const style = STATE[state];
  const data = view ? view.hist.map((v, i) => ({ i, v, b: view.base[i] ?? tel!.baseline })) : [];
  const batt = tel ? Math.round(((tel.battery_mv - BATT_MIN) / (BATT_MAX - BATT_MIN)) * 100) : 0;

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-label={`Node ${id}`}
      data-testid="node-inspector"
      className="cc-scroll absolute right-3 top-3 z-20 max-h-[calc(100%-1.5rem)] w-[302px] overflow-y-auto rounded-panel border border-line bg-surface-1 shadow-lift"
      style={{ animation: 'cc-slide-in .24s cubic-bezier(.22,1,.36,1) both' }}
    >
      {/* header */}
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-surface-1 px-3 py-2">
        <span
          aria-hidden="true"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{ background: style.color }}
        >
          {style.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="cc-mono text-sm font-bold leading-none">{id}</div>
          {meta?.label && <div className="truncate text-2xs text-ink-3">{meta.label}</div>}
        </div>
        <button
          onClick={() => select(null)}
          aria-label="Close node inspector"
          className="rounded px-1.5 py-0.5 text-2xs font-semibold text-ink-3 transition hover:bg-surface-3 hover:text-ink-2"
        >
          esc
        </button>
      </header>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <StateBadge state={state} size="xs" />
          <span className="text-2xs text-ink-3">{style.meaning}</span>
        </div>

        {tel ? (
          <>
            <div className="h-20 rounded border border-line-soft bg-surface-2 p-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id={`ins-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={style.color} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={style.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['auto', 'auto']} />
                  <ReferenceLine y={tel.baseline} stroke="var(--cc-text-3)" strokeDasharray="3 3" strokeWidth={1} />
                  <Tooltip
                    cursor={{ stroke: 'var(--cc-text-3)', strokeWidth: 1 }}
                    contentStyle={{
                      background: 'var(--cc-surface-1)', border: '1px solid var(--cc-line)',
                      borderRadius: 4, fontSize: 10,
                    }}
                    labelFormatter={() => ''}
                    formatter={(v: number) => [`${v.toFixed(2)} kV/m`, '']}
                  />
                  <Area type="monotone" dataKey="v" stroke={style.color} strokeWidth={2}
                    fill={`url(#ins-${id})`} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <dl className="divide-y divide-line-soft">
              <Row k="E-field (10-cycle RMS)" v={`${tel.efield_rms.toFixed(2)} kV/m`} />
              <Row k="EWMA baseline" v={`${tel.baseline.toFixed(2)} kV/m`} />
              <Row
                k="Deviation"
                v={`${tel.deviation_pct >= 0 ? '+' : ''}${tel.deviation_pct.toFixed(1)}%`}
                tone={tel.deviation_pct <= -60 ? 'text-critical font-semibold'
                  : tel.deviation_pct <= -20 ? 'text-warning font-semibold' : ''}
              />
              <Row k="Battery" v={`${tel.battery_mv} mV`} />
              <Row k="RSSI" v={`${tel.rssi} dBm`} />
              <Row k="Enclosure" v={`${tel.temp_c.toFixed(1)} °C`} />
              <Row k="Sequence" v={tel.seq} />
              <Row
                k="Last frame"
                v={`${Math.round((Date.now() - tel.ts) / 1000)} s ago`}
                tone={offline ? 'text-warning' : ''}
              />
            </dl>

            <Meter pct={batt} tone={battTone(batt)} label={`${id} battery`} />
          </>
        ) : (
          <p className="text-2xs text-ink-3">No telemetry received from this node yet.</p>
        )}

        {/* placement */}
        <section className="rounded border border-line-soft bg-surface-2 p-2.5">
          <h3 className="text-2xs font-bold uppercase tracking-[.12em] text-ink-3">Placement</h3>
          <dl className="mt-1 divide-y divide-line-soft">
            <Row k="Latitude" v={pole ? pole.lat.toFixed(5) : '—'} />
            <Row k="Longitude" v={pole ? pole.lng.toFixed(5) : '—'} />
            <Row k="Span to next" v={pole ? `${pole.span_m} m` : '—'} />
          </dl>
        </section>

        {/* commissioning */}
        <section className="rounded border border-line-soft bg-surface-2 p-2.5">
          <h3 className="text-2xs font-bold uppercase tracking-[.12em] text-ink-3">Commissioning</h3>

          <label className="mt-2 block text-2xs text-ink-2">
            Pole label
            <input
              data-testid="ins-label"
              className="cc-input mt-1"
              placeholder="e.g. Pole outside St Mary's"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          <label className="mt-2 block text-2xs text-ink-2">
            Bound device
            <input
              data-testid="ins-device"
              className="cc-input cc-mono mt-1"
              placeholder="e.g. ESP32-S3-0A14"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
            />
          </label>

          <label className="mt-2 block text-2xs text-ink-2">
            Notes
            <textarea
              className="cc-input mt-1 h-14 resize-none"
              placeholder="Access, mounting height, anything the crew needs"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <p className="mt-2 text-2xs leading-snug text-ink-3">
            The node ID is fixed. Ordering along the feeder is what makes a fault span computable, so
            renaming one would invalidate every span already recorded against it — the label is the
            human name instead.
          </p>

          <div className="mt-2 flex items-center gap-2">
            <Btn variant="primary" data-testid="ins-save" disabled={!dirty || busy} onClick={save} className="flex-1">
              {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </Btn>
          </div>
          {msg && <div className="mt-1.5 text-2xs text-ink-3">{msg}</div>}
        </section>

        {/* decommission */}
        <section className="rounded border border-critical/40 bg-critical-dim p-2.5">
          <h3 className="text-2xs font-bold uppercase tracking-[.12em] text-critical">Decommission</h3>
          {!removing ? (
            <>
              <p className="mt-1 text-2xs leading-snug text-ink-2">
                Removes {id} from the feeder. The spans either side of it merge into one, so any
                fault already recorded against those spans will no longer line up with the topology.
              </p>
              <Btn variant="ghost" data-testid="ins-remove" onClick={() => setRemoving(true)} className="mt-2 w-full">
                Remove node…
              </Btn>
            </>
          ) : (
            <>
              <p className="mt-1 text-2xs text-ink-2">
                Type <code className="cc-mono font-bold text-ink">{id}</code> to confirm.
              </p>
              <input
                data-testid="ins-confirm"
                className="cc-input cc-mono mt-1.5"
                value={confirm}
                autoFocus
                onChange={(e) => setConfirm(e.target.value.toUpperCase())}
              />
              <div className="mt-2 flex gap-1.5">
                <Btn
                  variant="danger"
                  data-testid="ins-remove-confirm"
                  disabled={confirm !== id || busy}
                  onClick={remove}
                  className="flex-1"
                >
                  {busy ? 'Removing…' : 'Remove permanently'}
                </Btn>
                <Btn onClick={() => { setRemoving(false); setConfirm(''); }}>Cancel</Btn>
              </div>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
