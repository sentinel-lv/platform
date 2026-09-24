// WebSocket with exponential backoff (frontend README Phase 3).
import type { FrameKind } from '../types/protocol';

export function connectStream(
  feederId: string,
  onFrame: (kind: FrameKind, payload: never) => void,
  onStatus: (s: 'live' | 'reconnecting') => void,
): () => void {
  const base = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8015/stream';
  let ws: WebSocket | null = null;
  let closed = false;
  let delay = 500;
  const open = () => {
    if (closed) return;
    onStatus('reconnecting');
    ws = new WebSocket(`${base}?feeder_id=${feederId}`);
    ws.onopen = () => { delay = 500; onStatus('live'); };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { kind: FrameKind; payload: never };
        onFrame(msg.kind, msg.payload);
      } catch { /* ignore malformed frame */ }
    };
    ws.onclose = () => { if (!closed) { delay = Math.min(delay * 2, 10000); setTimeout(open, delay); } };
    ws.onerror = () => { try { ws?.close(); } catch { /* noop */ } };
  };
  open();
  return () => { closed = true; try { ws?.close(); } catch { /* noop */ } };
}
