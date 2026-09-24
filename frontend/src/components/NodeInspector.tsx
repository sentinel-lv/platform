// Node inspector: click a pin or card, manage that pole here.
// Rename (real N-NNN rename), reposition (+ re-slot in feeder order),
// ESP32 bind (device registry), gain calibrate, decommission.
// Reads live: telemetry values + history sparkline + events mentioning the node.
import { useEffect, useState } from 'react';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from 'recharts';
import { api } from '../api/client';
import { useFeeder } from '../store/feederStore';
import type { FeederEvent, Telemetry } from '../types/protocol';

interface Detail {
  node_id: string;
  lat: number;
  lng: number;
  span_m: number;
  telemetry: Telemetry | null;
  binding: { node_id: string; device_id: string | null; gain: number };
}

const inputCls =
  'cc-tick mt-0.5 w-full border border-ink/40 bg-paper px-1.5 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator';
const btnPrimary =
  'border-[1.5px] border-ink bg-ink px-2 py-1.5 font-display text-xs font-bold text-porcelain hover:bg-insulator focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator disabled:opacity-40';
const btnGhost =
  'border-[1.5px] border-ink bg-porcelain px-2 py-1.5 text-xs font-bold hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator disabled:opacity-40';
const btnDanger =
  'border-[1.5px] border-ink bg-fault px-2 py-1.5 font-display text-xs font-bold text-porcelain hover:bg-faultdeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-insulator disabled:opacity-40';

function randHex(n: number): string {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export default function NodeInspector() {
  const selectedId = useFeeder((s) => s.selectedId);
  const setSelected = useFeeder((s) => s.setSelected);
  const setGeo = useFeeder((s) => s.setGeo);
  const removeNodeView = useFeeder((s) => s.removeNodeView);
  const feederId = useFeeder((s) => s.feederId);
  const order = useFeeder((s) => s.order);
  const live = useFeeder((s) => (selectedId ? s.nodes[selectedId] : undefined));
  const events = useFeeder((s) => s.events);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [hist, setHist] = useState<Telemetry[]>([]);
  const [devices, setDevices] = useState<{ device_id: string; revoked: boolean }[]>([]);
  const [bindings, setBindings] = useState<{ node_id: string; device_id: string | null }[]>([]);
  const [newId, setNewId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [span, setSpan] = useState('');
  const [after, setAfter] = useState('KEEP');
  const [gain, setGain] = useState('1.0');
  const [bindId, setBindId] = useState('');
  const [newEsp, setNewEsp] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshGeo = async () => {
    const g = await api.feeder(feederId);
    setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
  };

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setHist([]);
      return;
    }
    let dead = false;
    setMsg(null);
    setErr(null);
    api
      .nodeDetail(selectedId)
      .then((d) => {
        if (dead) return;
        setDetail(d);
        setNewId(d.node_id);
        setLat(String(d.lat));
        setLng(String(d.lng));
        setSpan(String(d.span_m));
        setAfter('KEEP');
        setGain(String(d.binding.gain ?? 1.0));
        setBindId(d.binding.device_id ?? '');
      })
      .catch((e) => {
        if (!dead) setErr(e instanceof Error ? e.message : 'load failed');
      });
    api
      .history(selectedId, feederId, 120)
      .then((rows) => {
        if (!dead) setHist(rows);
      })
      .catch(() => {});
    api
      .devices()
      .then((ds) => {
        if (!dead) setDevices(ds.filter((x) => !x.revoked));
      })
      .catch(() => {});
    api
      .bindings()
      .then((bs) => {
        if (!dead) setBindings(bs);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [selectedId, feederId]);

  if (!selectedId) return null;

  const boundElsewhere = (did: string) =>
    bindings.find((b) => b.device_id === did && b.node_id !== selectedId)?.node_id;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await fn();
      await refreshGeo();
      setMsg(ok);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  const doRename = () =>
    run(async () => {
      await api.renameNode(selectedId, newId.toUpperCase());
      const g = await api.feeder(feederId);
      setGeo(g.nodes, g.substation, g.mode ?? 'ALERT_ONLY');
      removeNodeView(selectedId);
      setSelected(newId.toUpperCase());
    }, `Renamed to ${newId.toUpperCase()} — history and order migrated.`);

  const doReposition = () =>
    run(async () => {
      const body: { lat: number; lng: number; span_m?: number | null; after?: string | null | 'KEEP' } = {
        lat: Number(lat),
        lng: Number(lng),
      };
      if (span !== '') body.span_m = Number(span);
      body.after = after === 'KEEP' ? 'KEEP' : after === '__TAIL__' ? null : after;
      await api.repositionNode(selectedId, body);
    }, 'Position saved — map pin, span and arbiter order follow.');

  const doCalibrate = () =>
    run(async () => {
      await api.calibrateNode(selectedId, Number(gain));
      const d = await api.nodeDetail(detail?.node_id === selectedId ? selectedId : selectedId);
      setDetail(d);
      setGain(String(d.binding.gain));
    }, `Gain trim ${gain}× applied — watch the sparkline shift.`);

  const doBind = () =>
    run(async () => {
      await api.bindNode(selectedId, bindId === '' ? null : bindId);
      const d = await api.nodeDetail(selectedId);
      setDetail(d);
      setBindId(d.binding.device_id ?? '');
      setBindings(await api.bindings());
    }, bindId === '' ? 'ESP32 unbound from this pole.' : `${bindId} now drives ${selectedId}.`);

  const doProvisionBind = () =>
    run(async () => {
      const id = newEsp.trim();
      if (!id) throw new Error('name the ESP32 first (e.g. ESP32-S3-A4)');
      await api.provisionDevice(id, randHex(32));
      await api.bindNode(selectedId, id);
      setDevices(await api.devices().then((ds) => ds.filter((x) => !x.revoked)));
      setBindings(await api.bindings());
      const d = await api.nodeDetail(selectedId);
      setDetail(d);
      setBindId(id);
      setNewEsp('');
    }, 'Provisioned in the device registry and bound to this pole.');

  const doRemove = () =>
    run(async () => {
      await api.removeNode(selectedId);
      removeNodeView(selectedId);
      setSelected(null);
    }, 'Decommissioned.');

  const tel = live?.tel ?? detail?.telemetry ?? null;
  const spark = (hist.length ? hist : live ? [...Array(live.hist.length)].map((_, i) => ({
    efield_rms: live.hist[i],
    baseline: live.base[i] ?? live.tel.baseline,
  })) : []).map((t, i) => ({ i, v: t.efield_rms, b: t.baseline }));
  const mentions: FeederEvent[] = events.filter(
    (e) =>
      e.fault_span?.includes(selectedId) ||
      e.trail.some((t) => t.node === selectedId) ||
      e.reason.includes(selectedId),
  );

  return (
    <section
      aria-label={`Node inspector ${selectedId}`}
      data-testid="node-inspector"
      className="cc-panel overflow-hidden"
    >
      <div className="flex items-center justify-between border-b-[1.5px] border-ink bg-ink px-3 py-2 text-porcelain">
        <h2 className="cc-tick text-sm font-bold" data-testid="inspector-title">
          {selectedId}
        </h2>
        <button
          onClick={() => setSelected(null)}
          aria-label="Close inspector"
          className="border border-porcelain/50 px-1.5 py-0.5 text-xs font-bold hover:bg-insulator focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200"
        >
          Close ✕
        </button>
      </div>

      <div className="space-y-3 bg-paper/50 p-3">
        {err && (
          <p role="alert" className="border border-fault bg-fault/10 px-2 py-1 text-xs text-faultdeep">
            {err}
          </p>
        )}
        {msg && <p className="border border-insulator bg-insulator/10 px-2 py-1 text-xs">{msg}</p>}

        {/* live values */}
        <div>
          <h3 className="font-display text-xs font-extrabold tracking-tight">Live values</h3>
          {tel ? (
            <>
              <div className="mt-1 h-20 border border-ink/15 bg-porcelain">
                {spark.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={spark} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <YAxis hide domain={['auto', 'auto']} />
                      <ReferenceLine y={tel.baseline} stroke="#1B2A23" strokeOpacity={0.45} strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="v" strokeWidth={1.75} dot={false} isAnimationActive={false} stroke="#175641" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="p-2 text-xs text-ink/60">Waiting for samples…</p>
                )}
              </div>
              <dl className="cc-tick mt-1 grid grid-cols-2 gap-x-3 text-[11px] text-ink/80">
                <div>field <b>{tel.efield_rms.toFixed(2)} kV/m</b></div>
                <div>dev <b>{tel.deviation_pct.toFixed(1)}%</b></div>
                <div>base {tel.baseline.toFixed(2)} kV/m</div>
                <div>state <b>{tel.state}</b></div>
                <div>batt {tel.battery_mv} mV</div>
                <div>rssi {tel.rssi} dBm · {tel.temp_c.toFixed(1)} °C</div>
              </dl>
            </>
          ) : (
            <p className="mt-1 text-xs text-ink/60">No telemetry yet for this pole.</p>
          )}
        </div>

        {/* rename */}
        <div>
          <h3 className="font-display text-xs font-extrabold tracking-tight">Rename pole</h3>
          <p className="text-[11px] text-ink/65">Real N-NNN rename — order, history and bindings migrate.</p>
          <div className="mt-1 flex gap-1.5">
            <input data-testid="inspector-rename" className={inputCls} value={newId} onChange={(e) => setNewId(e.target.value.toUpperCase())} />
            <button data-testid="inspector-rename-save" className={btnPrimary} disabled={busy} onClick={doRename}>
              Rename
            </button>
          </div>
        </div>

        {/* reposition */}
        <div>
          <h3 className="font-display text-xs font-extrabold tracking-tight">Reposition</h3>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <label className="text-[11px] font-semibold">Lat<input data-testid="inspector-lat" className={inputCls} value={lat} onChange={(e) => setLat(e.target.value)} /></label>
            <label className="text-[11px] font-semibold">Lng<input data-testid="inspector-lng" className={inputCls} value={lng} onChange={(e) => setLng(e.target.value)} /></label>
            <label className="text-[11px] font-semibold">Span m<input data-testid="inspector-span" className={inputCls} value={span} onChange={(e) => setSpan(e.target.value)} /></label>
            <label className="text-[11px] font-semibold">Order after
              <select data-testid="inspector-after" className={inputCls} value={after} onChange={(e) => setAfter(e.target.value)}>
                <option value="KEEP">keep position</option>
                <option value="__TAIL__">move to tail</option>
                {order.filter((id) => id !== selectedId).map((id) => (
                  <option key={id} value={id}>after {id}</option>
                ))}
              </select>
            </label>
          </div>
          <button data-testid="inspector-reposition-save" className={`${btnPrimary} mt-1.5 w-full`} disabled={busy} onClick={doReposition}>
            Save position
          </button>
        </div>

        {/* ESP32 */}
        <div>
          <h3 className="font-display text-xs font-extrabold tracking-tight">ESP32 unit</h3>
          <p className="cc-tick text-[11px] text-ink/70">
            bound: <b>{detail?.binding.device_id ?? 'none'}</b>
          </p>
          <div className="mt-1 flex gap-1.5">
            <select data-testid="inspector-bind" className={inputCls} value={bindId} onChange={(e) => setBindId(e.target.value)}>
              <option value="">— unbound —</option>
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id} disabled={!!boundElsewhere(d.device_id)}>
                  {d.device_id}{boundElsewhere(d.device_id) ? ` (on ${boundElsewhere(d.device_id)})` : ''}
                </option>
              ))}
            </select>
            <button data-testid="inspector-bind-save" className={btnPrimary} disabled={busy} onClick={doBind}>
              Bind
            </button>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <input
              data-testid="inspector-esp-new"
              className={inputCls}
              placeholder="ESP32-S3-A4"
              value={newEsp}
              onChange={(e) => setNewEsp(e.target.value)}
            />
            <button data-testid="inspector-esp-provision" className={btnGhost} disabled={busy} onClick={doProvisionBind}>
              Provision + bind
            </button>
          </div>
        </div>

        {/* calibrate */}
        <div>
          <h3 className="font-display text-xs font-extrabold tracking-tight">Calibrate gain</h3>
          <p className="text-[11px] text-ink/65">
            Trim 0.2–3.0× scales this pole's field reading (current {detail?.binding.gain ?? 1.0}×).
          </p>
          <label className="mt-1 block text-xs font-semibold">
            Gain: <span className="cc-tick font-bold">{gain}×</span>
            <input
              data-testid="inspector-gain"
              type="range"
              className="cc-range mt-1 w-full"
              min={0.2}
              max={3.0}
              step={0.05}
              value={Number(gain) || 1.0}
              onChange={(e) => setGain(e.target.value)}
            />
          </label>
          <div className="mt-1 flex gap-1.5">
            <button data-testid="inspector-gain-save" className={btnPrimary} disabled={busy} onClick={doCalibrate}>
              Apply trim
            </button>
            <button
              className={btnGhost}
              disabled={busy}
              onClick={() => {
                setGain('1.0');
              }}
            >
              Unity
            </button>
          </div>
        </div>

        {/* events */}
        <div>
          <h3 className="font-display text-xs font-extrabold tracking-tight">
            Events on this pole ({mentions.length})
          </h3>
          {mentions.length === 0 ? (
            <p className="mt-1 text-[11px] text-ink/60">Nothing in the recent ledger mentions {selectedId}.</p>
          ) : (
            <ul className="mt-1 flex max-h-28 flex-col gap-1 overflow-y-auto">
              {mentions.slice(0, 10).map((e) => (
                <li key={e.event_id} className="cc-tick border border-ink/25 bg-porcelain px-1.5 py-1 text-[11px]">
                  {new Date(e.ts_confirmed).toLocaleTimeString()} · {e.isolated ? 'BREAK' : e.type} ·{' '}
                  {e.fault_span ? `${e.fault_span[0]}↔${e.fault_span[1]}` : e.reason}
                  {e.latency_ms != null ? ` · ${e.latency_ms}ms` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* danger zone */}
        <div className="border-t-[1.5px] border-dashed border-ink/30 pt-2">
          <button data-testid="inspector-remove" className={`${btnDanger} w-full`} disabled={busy} onClick={doRemove}>
            Decommission this pole
          </button>
        </div>
      </div>
    </section>
  );
}
