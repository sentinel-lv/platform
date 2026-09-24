// Mirror docs/PROTOCOL.md exactly — do NOT invent fields.
export type NodeState = 'NORMAL' | 'SUSPECT' | 'CONFIRMED' | 'RECOVERED' | 'OFFLINE';
export interface Telemetry {
  node_id: string; feeder_id: string; ts: number;
  efield_rms: number; baseline: number; deviation_pct: number;
  battery_mv: number; rssi: number; temp_c: number;
  state: NodeState; seq: number;
}
export interface VoteItem { node_id: string; agrees: boolean; deviation_pct: number }
export interface Vote {
  feeder_id: string; asserting_node: string; ts: number;
  votes: VoteItem[]; quorum_required: number; quorum_met: boolean;
}
export type CommandAction = 'ISOLATE' | 'RESTORE' | 'LOCKOUT' | 'TEST';
export interface Command {
  feeder_id: string; action: CommandAction;
  reason: 'quorum_confirmed' | 'manual' | 'scheduled_test' | 'watchdog';
  fault_span: [string, string] | null; ts: number;
  latency_ms: number | null; issued_by: string; mode: 'AUTO' | 'ALERT_ONLY';
}
export interface TrailItem { ts: number; node: string; state: string }
export interface FeederEvent {
  event_id: string; feeder_id: string;
  type: 'CONDUCTOR_BREAK' | 'FALSE_POSITIVE_REJECTED' | 'NODE_OFFLINE' | 'LOW_BATTERY' | 'COMMS_LOSS';
  ts_detected: number; ts_confirmed: number;
  fault_span: [string, string] | null;
  isolated: boolean; latency_ms: number | null;
  trail: TrailItem[]; acknowledged_by: string | null;
  action: string; reason: string; confidence: number;
}
export type FrameKind = 'telemetry' | 'vote' | 'command' | 'event' | 'hello';
export interface Pole { node_id: string; lat: number; lng: number; span_m: number; device_id?: string | null; gain?: number }
export interface FeederGeo {
  feeder_id: string; mode: string;
  substation: { lat: number; lng: number };
  nodes: Pole[]; polyline: [number, number][];
}
