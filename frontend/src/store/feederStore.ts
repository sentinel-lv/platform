// WebSocket stream into one store (Zustand). Last-60 samples/node for sparklines.
import { create } from 'zustand';
import type { FeederEvent, FrameKind, Pole, Telemetry } from '../types/protocol';

export interface NodeView { tel: Telemetry; hist: number[]; base: number[] }
interface State {
  feederId: string;
  poles: Pole[];
  substation: { lat: number; lng: number };
  nodes: Record<string, NodeView>;
  order: string[];
  events: FeederEvent[];
  mode: string;
  conn: 'connecting' | 'live' | 'reconnecting';
  scenarioRunning: string | null;
  lastIsolate: FeederEvent | null;
  dismissCascade: boolean;
  ingest: (kind: FrameKind, payload: never) => void;
  setGeo: (poles: Pole[], substation: { lat: number; lng: number }, mode: string) => void;
  backfill: (node_id: string, samples: Telemetry[]) => void;
  setConn: (c: State['conn']) => void;
  setScenario: (s: string | null) => void;
  setDismissCascade: (b: boolean) => void;
}

const HIST_N = 60;
function pushHist(arr: number[], v: number) {
  const n = [...arr, v];
  return n.length > HIST_N ? n.slice(n.length - HIST_N) : n;
}

export const useFeeder = create<State>((set) => ({
  feederId: 'KSEB-TVM-F12',
  poles: [],
  substation: { lat: 8.5241, lng: 76.9366 },
  nodes: {},
  order: [],
  events: [],
  mode: 'ALERT_ONLY',
  conn: 'connecting',
  scenarioRunning: null,
  lastIsolate: null,
  dismissCascade: false,
  ingest: (kind, payload) => set((st) => {
    if (kind === 'hello') {
      const p = payload as unknown as { nodes: Telemetry[] };
      const nodes: Record<string, NodeView> = {};
      for (const t of p.nodes ?? []) {
        const prev = st.nodes[t.node_id];
        nodes[t.node_id] = {
          tel: t,
          hist: prev ? pushHist(prev.hist, t.efield_rms) : [t.efield_rms],
          base: prev ? pushHist(prev.base, t.baseline) : [t.baseline],
        };
      }
      const order = Object.keys(nodes).sort();
      return { nodes: { ...st.nodes, ...nodes }, order: order.length ? order : st.order, conn: 'live' as const };
    }
    if (kind === 'telemetry') {
      const t = payload as unknown as Telemetry;
      const prev = st.nodes[t.node_id];
      // client-side OFFLINE is derived at render (no telemetry > 30 s); server is authoritative.
      return {
        nodes: {
          ...st.nodes,
          [t.node_id]: {
            tel: t,
            hist: prev ? pushHist(prev.hist, t.efield_rms) : [t.efield_rms],
            base: prev ? pushHist(prev.base, t.baseline) : [t.baseline],
          },
        },
        order: st.order.includes(t.node_id) ? st.order : [...st.order, t.node_id].sort(),
      };
    }
    if (kind === 'event') {
      const e = payload as unknown as FeederEvent;
      const events = [e, ...st.events].slice(0, 50);
      // reset-ish frames (recovery line / RESTORE-mode housekeeping): clear the
      // banner so a stale BREAK + red spans don't linger after the field heals.
      const healed = !e.isolated && (e.reason === 'no_fault' || e.type === 'FALSE_POSITIVE_REJECTED');
      const newestIso = e.isolated ? e : healed ? undefined : events.find((x) => x.isolated);
      return {
        events,
        lastIsolate: newestIso === undefined ? null : (newestIso ?? null),
        dismissCascade: e.isolated ? false : healed ? true : st.dismissCascade,
        scenarioRunning: null,
      };
    }
    return {};
  }),
  setGeo: (poles, substation, mode) => set({ poles, substation, mode }),
  backfill: (node_id, samples) => set((st) => {
    const cur = st.nodes[node_id];
    if (cur && cur.hist.length >= HIST_N) return {};
    const hist = [...samples.map((t) => t.efield_rms), ...(cur?.hist ?? [])].slice(-HIST_N);
    const base = [...samples.map((t) => t.baseline), ...(cur?.base ?? [])].slice(-HIST_N);
    const tel = samples.length && !cur ? samples[samples.length - 1] : cur?.tel;
    if (!tel) return {};
    return { nodes: { ...st.nodes, [node_id]: { tel, hist, base } } };
  }),
  setConn: (conn) => set({ conn }),
  setScenario: (scenarioRunning) => set({ scenarioRunning }),
  setDismissCascade: (dismissCascade) => set({ dismissCascade }),
}));

// Client-side OFFLINE derivation (UI degrades honestly if stream stalls).
export function isOffline(tel: Telemetry | undefined, now = Date.now()): boolean {
  if (!tel) return true;
  return now - tel.ts > 30_000;
}
