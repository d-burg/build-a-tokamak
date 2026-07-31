import type { DesignResult } from '../physics/types';
import { fmt } from '../format';

/**
 * To-scale poloidal cross-section of the torus (R-Z plane, metres):
 * nested plasma / blanket / coil rings centred at R = R0, the torus axis at
 * R = 0, dimension arrows for a, b, c and R0, and a 1.8 m person for scale.
 */
export function CrossSection({ result }: { result: DesignResult }) {
  const { out } = result;
  const { a, c, R0 } = out;
  const b = result.inputs.b;
  const kappa = result.inputs.kappa;

  // Draw whenever the geometry is numerically defined — even an "impossible"
  // machine (inboard leg overlapping the torus axis) is worth seeing.
  if (!Number.isFinite(a) || !Number.isFinite(R0)) {
    return (
      <section className="panel cross-section">
        <h2>Reactor cross-section</h2>
        <div className="cross-error">
          No buildable reactor at these constraints — see the message above.
        </div>
      </section>
    );
  }

  const rOut = a + b + c; // outer coil half-width
  const vOut = kappa * a + b + c; // outer coil half-height
  const margin = 0.8;
  const personH = 1.8;
  // when the machine overlaps the torus axis (R0 < rOut), extend the view left
  const x0 = Math.min(0, margin + R0 - rOut - 0.3);
  const W = R0 + rOut + 2 * margin + 1.6 - x0; // world width  [m]
  const H = 2 * vOut + 2 * margin; // world height [m]
  const cx = margin + R0; // torus centre x in world coords
  const cy = H / 2;
  const ground = cy + vOut; // machine base line
  const personX = margin + R0 + rOut + 1.0;

  const bore = R0 - a - b;

  return (
    <section className="panel cross-section">
      <h2>Reactor cross-section</h2>
      <svg
        viewBox={`${x0} 0 ${W} ${H}`}
        className="cross-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="plasmaGrad">
            <stop offset="0%" stopColor="var(--plasma-core)" />
            <stop offset="100%" stopColor="var(--plasma-edge)" />
          </radialGradient>
          <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 z" fill="var(--muted)" />
          </marker>
        </defs>

        {/* torus axis */}
        <line x1={margin * 0.4} y1={cy - vOut - 0.3} x2={margin * 0.4}
          y2={ground + 0.15} className="axis-line" />
        <text x={margin * 0.4 + 0.12} y={cy - vOut - 0.35} className="svg-label tiny">
          torus axis
        </text>

        {/* nested components, drawn to scale (ellipses; circular at kappa = 1) */}
        <ellipse cx={cx} cy={cy} rx={rOut} ry={vOut} className="ring-coil" />
        <ellipse cx={cx} cy={cy} rx={a + b} ry={kappa * a + b} className="ring-blanket" />
        <ellipse cx={cx} cy={cy} rx={a} ry={kappa * a} fill="url(#plasmaGrad)" />

        {/* R0 dimension arrow along the midplane */}
        <line x1={margin * 0.4} y1={cy} x2={cx} y2={cy}
          className="dim-line" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <text x={(margin * 0.4 + cx) / 2} y={cy - 0.15} className="svg-label">
          R₀ = {fmt(R0)} m
        </text>

        {/* a, b, c dimension arrows; labels staggered so they never collide.
            The radial arrows measure the midplane (horizontal) thicknesses,
            which stay a, b, c at every kappa. */}
        <Dim x1={cx} x2={cx + a} y={cy - vOut - 0.35}
          label={`a = ${fmt(a)}`} />
        <Dim x1={cx + a} x2={cx + a + b} y={cy - vOut - 0.35}
          label={`b = ${fmt(b)}`} labelDy={0.44} />
        <Dim x1={cx + a + b} x2={cx + rOut} y={cy - vOut - 0.35}
          label={`c = ${fmt(c)}`} />
        {kappa !== 1 && (
          <>
            <line x1={cx} y1={cy} x2={cx} y2={cy - kappa * a} className="dim-line"
              markerEnd="url(#arrow)" />
            <text x={cx + 0.12} y={cy - kappa * a * 0.55} className="svg-label tiny">
              κa = {fmt(kappa * a)}
            </text>
          </>
        )}

        {/* component labels with leaders */}
        <text x={cx} y={cy + 0.1} className="svg-label plasma-label" textAnchor="middle">
          plasma
        </text>
        <text x={cx + a + b / 2} y={cy + (a + b) * 0.72} className="svg-label tiny"
          textAnchor="middle" transform={`rotate(45 ${cx + a + b / 2} ${cy + (a + b) * 0.72})`}>
        </text>
        <text x={cx} y={cy - kappa * a - b * 0.45} className="svg-label mid" textAnchor="middle">
          blanket + shield
        </text>
        <text x={cx} y={cy - kappa * a - b - c * 0.35} className="svg-label mid" textAnchor="middle">
          coil
        </text>

        {/* field annotations */}
        {bore > 0 && (
          <>
            <text x={cx - a - b + 0.12} y={cy + a * 0.75} className="svg-label tiny field-label">
              B<tspan className="sub">max</tspan> = {fmt(result.inputs.Bmax)} T
            </text>
            <text x={cx} y={cy + a * 0.55} className="svg-label tiny on-plasma" textAnchor="middle">
              B₀ = {fmt(out.B0)} T
            </text>
          </>
        )}

        {/* person for scale */}
        <g className="person" transform={`translate(${personX} ${ground - personH})`}>
          <circle cx={0} cy={0.14} r={0.14} />
          <line x1={0} y1={0.3} x2={0} y2={1.05} />
          <line x1={-0.28} y1={0.62} x2={0.28} y2={0.62} />
          <line x1={0} y1={1.05} x2={-0.2} y2={personH} />
          <line x1={0} y1={1.05} x2={0.2} y2={personH} />
        </g>
        <line x1={personX - 0.7} y1={ground} x2={personX + 0.7} y2={ground}
          className="ground-line" />
        <text x={personX} y={ground + 0.42} className="svg-label tiny" textAnchor="middle">
          1.8 m
        </text>
      </svg>
    </section>
  );
}

function Dim({
  x1, x2, y, label, labelDy = 0,
}: {
  x1: number; x2: number; y: number; label: string; labelDy?: number;
}) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} className="dim-line"
        markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <line x1={x1} y1={y - 0.12} x2={x1} y2={y + 0.12} className="dim-line" />
      <line x1={x2} y1={y - 0.12} x2={x2} y2={y + 0.12} className="dim-line" />
      <text x={(x1 + x2) / 2} y={y - 0.14 + labelDy} className="svg-label tiny" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
