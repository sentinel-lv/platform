// REST wrapper (backend README §4).
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8015';
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) throw new Error(`${init?.method ?? 'GET'} ${path}: ${r.status}`);
  return r.json() as Promise<T>;
}
export const api = {
  feeders: () => req<{ feeder_id: string; mode: string }[]>('/feeders'),
  feeder: (id: string) => req<import('../types/protocol').FeederGeo>(`/feeders/${id}`),
  nodes: (fid: string) => req<import('../types/protocol').Telemetry[]>(`/nodes?feeder_id=${fid}`),
  history: (nid: string, fid: string, window = 60) =>
    req<import('../types/protocol').Telemetry[]>(`/nodes/${nid}/history?feeder_id=${fid}&window=${window}`),
  events: (fid: string, limit = 50) =>
    req<import('../types/protocol').FeederEvent[]>(`/events?feeder_id=${fid}&limit=${limit}`),
  simulate: (scenario: string) =>
    req<{ started: string }>(`/simulate/${scenario}`, { method: 'POST' }),
  setMode: (fid: string, mode: string) =>
    req<{ mode: string }>(`/feeders/${fid}/mode?mode=${mode}`, { method: 'POST' }),
  addNode: (body: { node_id: string; lat: number; lng: number; span_m?: number; after?: string | null }) =>
    req<{ node_id: string }>(`/nodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  removeNode: (nid: string) =>
    req<{ removed: string }>(`/nodes/${nid}`, { method: 'DELETE' }),
  nodeDetail: (nid: string) =>
    req<{ node_id: string; lat: number; lng: number; span_m: number; telemetry: import('../types/protocol').Telemetry | null; binding: { node_id: string; device_id: string | null; gain: number } }>(`/nodes/${nid}`),
  renameNode: (nid: string, new_id: string) =>
    req<{ node_id: string }>(`/nodes/${nid}/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_id }) }),
  repositionNode: (nid: string, body: { lat: number; lng: number; span_m?: number | null; after?: string | null | 'KEEP' }) =>
    req<{ node_id: string }>(`/nodes/${nid}/position`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  calibrateNode: (nid: string, gain: number) =>
    req<{ node_id: string; gain: number }>(`/nodes/${nid}/calibrate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gain }) }),
  bindNode: (nid: string, device_id: string | null) =>
    req<{ node_id: string; device_id: string | null; gain: number }>(`/nodes/${nid}/bind`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id }) }),
  devices: () =>
    req<{ device_id: string; revoked: boolean }[]>('/devices'),
  provisionDevice: (device_id: string, fingerprint: string) =>
    req<{ device_id: string }>(`/devices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device_id, fingerprint }) }),
  bindings: () =>
    req<{ node_id: string; device_id: string | null; gain: number }[]>('/bindings'),
};
