/**
 * Where the decision runs — the single most important architectural claim, and
 * the one a utility engineer presses on.
 *
 * Replaces an ASCII art block. The point it has to land visually is that a
 * hard line separates the trip path from the cloud: everything above the
 * divider happens at the feeder head in under two seconds, everything below it
 * only observes. A monospace drawing cannot carry that weight.
 */

const NODES = ['N-006', 'N-007', 'N-008'];

function Box({
  x, y, w, h, title, sub, accent = 'var(--cc-line)', fill = 'var(--cc-surface-2)', bold = false,
}: {
  x: number; y: number; w: number; h: number;
  title: string; sub?: string; accent?: string; fill?: string; bold?: boolean;
}) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx="8"
        fill={fill} stroke={accent} strokeWidth={bold ? 2 : 1.25}
      />
      <text
        x={x + w / 2} y={sub ? y + h / 2 - 7 : y + h / 2 + 5}
        textAnchor="middle" fill="var(--cc-text)"
        fontSize={bold ? 17 : 14} fontWeight={bold ? 800 : 700}
        fontFamily="Inter, sans-serif"
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle"
          fill="var(--cc-text-3)" fontSize="11.5" fontFamily="Inter, sans-serif"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, color = 'var(--cc-text-3)', labelDy = 0 }: {
  x1: number; y1: number; x2: number; y2: number;
  label?: string; color?: string; labelDy?: number;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.75" markerEnd="url(#arch-head)" />
      {label && (
        <text
          x={(x1 + x2) / 2 + (y1 === y2 ? 0 : 12)}
          y={(y1 + y2) / 2 + (y1 === y2 ? -9 : 4) + labelDy}
          textAnchor={y1 === y2 ? 'middle' : 'start'}
          fill="var(--cc-text-3)" fontSize="11.5" fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export default function ArchitectureDiagram() {
  return (
    <figure className="overflow-hidden rounded-panel border border-line bg-surface-1">
      <svg
        viewBox="0 0 880 430"
        className="w-full"
        role="img"
        aria-label="Nodes gossip over a LoRa mesh to a gateway at the feeder head. The gateway runs decide() and drives the relay locally in under two seconds. It then forwards to the cloud over LTE, which observes, alerts and audits but is never in the trip path."
      >
        <defs>
          <marker id="arch-head" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--cc-text-3)" />
          </marker>
        </defs>

        {/* ---- the field: sentinel nodes -------------------------------- */}
        <text x="24" y="28" fill="var(--cc-text-3)" fontSize="11.5" fontWeight="700"
          letterSpacing="1.4" fontFamily="Inter, sans-serif">ON THE POLES</text>

        {NODES.map((n, i) => (
          <Box key={n} x={24 + i * 176} y={44} w={152} h={58}
            title={n} sub="E-field probe" accent="var(--cc-good)" />
        ))}

        {/* gossip between them */}
        <line x1="176" y1="73" x2="200" y2="73" stroke="var(--cc-good)" strokeWidth="1.75" strokeDasharray="4 3" />
        <line x1="352" y1="73" x2="376" y2="73" stroke="var(--cc-good)" strokeWidth="1.75" strokeDasharray="4 3" />
        <text x="288" y="122" textAnchor="middle" fill="var(--cc-text-2)" fontSize="12.5"
          fontFamily="Inter, sans-serif">LoRa mesh gossip · a quorum must agree</text>

        <Arrow x1={288} y1={132} x2={288} y2={168} />

        {/* ---- the gateway: the trip path ------------------------------- */}
        <Box x={24} y={172} w={528} h={76}
          title="GATEWAY" sub="at the feeder head · runs decide() locally · drives the relay"
          accent="var(--cc-accent)" fill="var(--cc-accent-dim)" bold />

        <Arrow x1={552} y1={210} x2={616} y2={210} color="var(--cc-critical)" />
        <Box x={620} y={176} w={236} h={68}
          title="SPAN ISOLATED" sub="< 2 s · measured, local"
          accent="var(--cc-critical)" fill="var(--cc-surface-2)" />

        {/* ---- the divider: the whole argument -------------------------- */}
        <line x1="24" y1="286" x2="856" y2="286"
          stroke="var(--cc-critical)" strokeWidth="1.5" strokeDasharray="7 5" opacity=".75" />
        <rect x="24" y="274" width="330" height="24" rx="5" fill="var(--cc-bg)" />
        <text x="34" y="291" fill="var(--cc-critical)" fontSize="11.5" fontWeight="800"
          letterSpacing="1.2" fontFamily="Inter, sans-serif">
          TRIP PATH ENDS HERE — BELOW IS OBSERVATION ONLY
        </text>

        <Arrow x1={288} y1={248} x2={288} y2={326} label="LTE / MQTT · buffered when offline" labelDy={20} />

        {/* ---- the cloud ------------------------------------------------ */}
        <Box x={24} y={330} w={264} h={68} title="Backend" sub="ingest · arbiter shadow · audit" />
        <Arrow x1={288} y1={364} x2={360} y2={364} label="WebSocket" />
        <Box x={364} y={330} w={264} h={68} title="Operator console" sub="this dashboard" />

        <text x="652" y="356" fill="var(--cc-text-3)" fontSize="12" fontFamily="Inter, sans-serif">
          observe · alert · audit
        </text>
        <text x="652" y="374" fill="var(--cc-text-3)" fontSize="12" fontFamily="Inter, sans-serif">
          configure · dispatch
        </text>
        <text x="652" y="394" fill="var(--cc-critical)" fontSize="12" fontWeight="700"
          fontFamily="Inter, sans-serif">
          never trips anything
        </text>
      </svg>
    </figure>
  );
}
