// Offline fallback so the UI never renders blank (used only if backend unreachable).
import type { Telemetry } from '../types/protocol';
export const MOCK_NODES: Telemetry[] = Array.from({ length: 12 }, (_, i) => ({
  node_id: `N-${String(i + 1).padStart(3, '0')}`,
  feeder_id: 'SLV-TVM-F12',
  ts: Date.now(),
  efield_rms: 4.9, baseline: 4.9, deviation_pct: 0,
  battery_mv: 3800, rssi: -90, temp_c: 31,
  state: 'NORMAL', seq: 0,
}));
