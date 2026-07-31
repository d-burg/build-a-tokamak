import { useState } from 'react';
import type { DesignResult } from '../physics/types';
import { coefficients } from '../physics/design';
import { costOfA } from '../physics/coilAndCost';
import { attenuationProfile } from '../physics/blanket';
import { pTauEIgnition } from '../physics/reactivity';
import { CHAPTER } from '../physics/constants';
import { fmt } from '../format';

/* ------------------------------------------------------------------ */
/* Minimal SVG line-plot helper (linear axes, shared by all four tabs) */
/* ------------------------------------------------------------------ */

interface Series {
  pts: Array<[number, number]>;
  cls: string; // plot-line-1 | plot-line-2
  label?: string;
}
interface VLine { x: number; label: string; cls?: string }
interface HLine { y: number; label: string }
interface Mark { x: number; y: number; label?: string }
interface Band { x0: number; x1: number; label?: string }

function niceTicks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const t: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * span; v += step) {
    t.push(Math.abs(v) < 1e-12 * span ? 0 : v);
  }
  return t;
}

function LinePlot({
  series, xLabel, yLabel, xDomain, yDomain,
  vlines = [], hlines = [], marks = [], bands = [], legendPos = 'tr',
}: {
  series: Series[];
  xLabel: string;
  yLabel: string;
  xDomain: [number, number];
  yDomain: [number, number];
  vlines?: VLine[];
  hlines?: HLine[];
  marks?: Mark[];
  bands?: Band[];
  legendPos?: 'tr' | 'bl';
}) {
  const W = 640;
  const H = 320;
  const m = { l: 62, r: 16, t: 14, b: 44 };
  const [x0, x1] = xDomain;
  const [y0, y1] = yDomain;
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - y0) / (y1 - y0)) * (H - m.t - m.b);
  const clip = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const path = (pts: Array<[number, number]>) =>
    pts
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(2)},${sy(clip(y, y0, y1)).toFixed(2)}`)
      .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="plot" preserveAspectRatio="xMidYMid meet">
      {bands.map((bd, i) => (
        <g key={`b${i}`}>
          <rect x={sx(bd.x0)} y={m.t} width={sx(bd.x1) - sx(bd.x0)}
            height={H - m.t - m.b} className="plot-band" />
          {bd.label && (
            <text x={(sx(bd.x0) + sx(bd.x1)) / 2} y={m.t + 14}
              className="plot-note" textAnchor="middle">{bd.label}</text>
          )}
        </g>
      ))}
      {niceTicks(y0, y1).map((t) => (
        <g key={`y${t}`}>
          <line x1={m.l} y1={sy(t)} x2={W - m.r} y2={sy(t)} className="plot-grid" />
          <text x={m.l - 8} y={sy(t) + 4} className="plot-tick" textAnchor="end">
            {fmt(t)}
          </text>
        </g>
      ))}
      {niceTicks(x0, x1, 6).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} y1={H - m.b} x2={sx(t)} y2={H - m.b + 5} className="plot-axis" />
          <text x={sx(t)} y={H - m.b + 20} className="plot-tick" textAnchor="middle">
            {fmt(t)}
          </text>
        </g>
      ))}
      <line x1={m.l} y1={m.t} x2={m.l} y2={H - m.b} className="plot-axis" />
      <line x1={m.l} y1={H - m.b} x2={W - m.r} y2={H - m.b} className="plot-axis" />
      <text x={(m.l + W - m.r) / 2} y={H - 8} className="plot-label" textAnchor="middle">
        {xLabel}
      </text>
      <text x={16} y={(m.t + H - m.b) / 2} className="plot-label" textAnchor="middle"
        transform={`rotate(-90 16 ${(m.t + H - m.b) / 2})`}>
        {yLabel}
      </text>
      {hlines.map((h, i) => (
        <g key={`h${i}`}>
          <line x1={m.l} y1={sy(h.y)} x2={W - m.r} y2={sy(h.y)} className="plot-ref" />
          <text x={W - m.r - 4} y={sy(h.y) - 5} className="plot-note" textAnchor="end">
            {h.label}
          </text>
        </g>
      ))}
      {vlines.map((v, i) => (
        <g key={`v${i}`}>
          <line x1={sx(v.x)} y1={m.t} x2={sx(v.x)} y2={H - m.b}
            className={v.cls ?? 'plot-ref'} />
          <text x={sx(v.x) + 4} y={m.t + 12 + i * 14} className="plot-note">
            {v.label}
          </text>
        </g>
      ))}
      {series.map((s, i) => (
        <path key={i} d={path(s.pts)} className={`plot-line ${s.cls}`} fill="none" />
      ))}
      {marks.map((mk, i) => (
        <g key={`m${i}`}>
          <circle cx={sx(mk.x)} cy={sy(clip(mk.y, y0, y1))} r={4.5} className="plot-mark" />
          {mk.label && (
            <text x={sx(mk.x) + 8} y={sy(clip(mk.y, y0, y1)) - 8} className="plot-note">
              {mk.label}
            </text>
          )}
        </g>
      ))}
      {series.filter((s) => s.label).map((s, i) => {
        const lx = legendPos === 'tr' ? W - m.r - 150 : m.l + 26;
        const ly = legendPos === 'tr' ? m.t + 10 + i * 18 : H - m.b - 44 + i * 18;
        return (
          <g key={`l${i}`} transform={`translate(${lx}, ${ly})`}>
            <line x1={0} y1={0} x2={22} y2={0} className={`plot-line ${s.cls}`} />
            <text x={28} y={4} className="plot-note">{s.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The four physics plots                                              */
/* ------------------------------------------------------------------ */

function CostTab({ result }: { result: DesignResult }) {
  const { out, inputs } = result;
  const { KVI } = coefficients();
  if (!Number.isFinite(out.a)) return <PlotUnavailable />;
  const aMax = 3.2 * out.a;
  const pts: Array<[number, number]> = [];
  for (let a = 0.08 * out.a; a <= aMax; a += aMax / 300) {
    pts.push([a, costOfA(a, inputs.b, out.xi, inputs.PW, KVI, inputs.kappa)]);
  }
  const yMax = 3 * out.VIoverPE;
  return (
    <>
      <LinePlot
        series={[{ pts, cls: 'plot-line-1' }]}
        xLabel="plasma minor radius a  [m]"
        yLabel="V_I / P_E  [m³/MW]"
        xDomain={[0, aMax]}
        yDomain={[0, yMax]}
        marks={[{ x: out.a, y: out.VIoverPE, label: `optimum a = ${fmt(out.a)} m` }]}
        vlines={[{ x: out.a, label: '' }]}
      />
      <p className="plot-caption">
        The cost proxy (Eq. 5.28): nuclear-island volume per megawatt vs. minor radius, at
        the current ξ, b and κ. Small a wastes power density on a thick coil; large a
        makes the island huge. The design sits exactly at the analytic minimum (Eq. 5.29).
        Note P_E and P_W move this curve only vertically — the optimum a never depends on
        them.
      </p>
    </>
  );
}

function BlanketTab({ result }: { result: DesignResult }) {
  const { out, inputs } = result;
  const xMax = Math.max(1.5, inputs.b * 1.15);
  const ePts: Array<[number, number]> = [];
  const fPts: Array<[number, number]> = [];
  for (let x = 0; x <= xMax; x += xMax / 300) {
    const { E_MeV, flux } = attenuationProfile(x);
    ePts.push([x, E_MeV / 14.1]);
    fPts.push([x, flux]);
  }
  return (
    <>
      <LinePlot
        series={[
          { pts: ePts, cls: 'plot-line-2', label: 'neutron energy E/E_n' },
          { pts: fPts, cls: 'plot-line-1', label: 'neutron flux Γ/Γ₀' },
        ]}
        xLabel="depth into blanket x  [m]"
        yLabel="normalized"
        xDomain={[0, xMax]}
        yDomain={[0, 1.02]}
        legendPos="bl"
        vlines={[
          { x: out.xBoundary, label: `moderator | breeder (${fmt(out.xBoundary)} m)` },
          { x: out.deltaX, label: `Δx = ${fmt(out.deltaX)} m (1% flux)` },
          { x: inputs.b, label: `chosen b = ${fmt(inputs.b)} m`, cls: 'plot-ref-strong' },
        ]}
      />
      <p className="plot-caption">
        Eqs. 5.4 and 5.9: fast 14.1 MeV neutrons slow down exponentially
        (λ_sd = 0.055 m), then Li-6 breeding devours the flux — slowly at first, then a
        cliff once the neutrons are slow (the double exponential). Δx is where 99% have
        bred; the chapter rounds b up to 1.2 m for the multiplier, shield, and structure.
      </p>
    </>
  );
}

function FieldTab({ result }: { result: DesignResult }) {
  const { out, inputs } = result;
  const Ri = out.R0 - out.a - inputs.b;
  if (Ri <= 0 || !Number.isFinite(Ri)) return <PlotUnavailable />;
  const Rmax = out.R0 + out.a + inputs.b;
  const pts: Array<[number, number]> = [];
  for (let R = Ri; R <= Rmax; R += (Rmax - Ri) / 300) {
    pts.push([R, (inputs.Bmax * Ri) / R]);
  }
  return (
    <>
      <LinePlot
        series={[{ pts, cls: 'plot-line-1' }]}
        xLabel="major radius R  [m]"
        yLabel="toroidal field B  [T]"
        xDomain={[Math.max(0, Ri - 0.5), Rmax + 0.3]}
        yDomain={[0, inputs.Bmax * 1.12]}
        bands={[{ x0: out.R0 - out.a, x1: out.R0 + out.a, label: 'plasma' }]}
        marks={[
          { x: Ri, y: inputs.Bmax, label: `B_max = ${fmt(inputs.Bmax)} T at coil` },
          { x: out.R0, y: out.B0, label: `B₀ = ${fmt(out.B0)} T on axis` },
        ]}
      />
      <p className="plot-caption">
        Eqs. 5.41–5.42: the toroidal field falls as 1/R from the inboard coil face
        (R = R₀ − a − b), so the plasma only ever sees B₀ = (R₀−a−b)/R₀ · B_max — you pay
        for {fmt(inputs.Bmax)} T superconductor and confine with {fmt(out.B0)} T. This
        geometric tax is why β, not B alone, measures confinement efficiency.
      </p>
    </>
  );
}

function IgnitionTab({ result }: { result: DesignResult }) {
  const { out, inputs } = result;
  const pts: Array<[number, number]> = [];
  for (let T = 5; T <= 40; T += 0.1) {
    pts.push([T, pTauEIgnition(T)]);
  }
  const Tused = inputs.model === 'chapter' ? CHAPTER.T : inputs.T;
  return (
    <>
      <LinePlot
        series={[{ pts, cls: 'plot-line-1', label: 'Bosch–Hale pτ_E(T)' }]}
        xLabel="temperature T  [keV]"
        yLabel="ignition pτ_E  [atm·s]"
        xDomain={[5, 40]}
        yDomain={[0, 30]}
        hlines={[{ y: CHAPTER.pTauE, label: 'chapter: 8.3 atm·s' }]}
        vlines={[
          { x: 13.54, label: 'true min (13.5 keV)' },
          { x: 15, label: 'Freidberg design point (15 keV)', cls: 'plot-ref-strong' },
        ]}
        marks={[{ x: Tused, y: out.pTauEreq, label: 'operating point' }]}
      />
      <p className="plot-caption">
        Ignition demands pτ_E ≥ 24T²/(⟨σv⟩E_α) — same shape as T²/⟨σv⟩, so the pressure
        and the ignition demand are minimized at the same temperature. The Bosch–Hale
        minimum is 8.9 atm·s at 13.5 keV, flat to 1% across 12–15 keV; the chapter&rsquo;s
        &ldquo;8.3 at 15 keV&rdquo; is the same physics with rounded reactivity. Away from
        the minimum the demanded τ_E climbs fast — the plasma physicist&rsquo;s burden.
      </p>
    </>
  );
}

function PlotUnavailable() {
  return (
    <div className="cross-error">
      This plot is undefined at the current constraints — fix the errors above first.
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'cost', label: 'Cost optimum' },
  { id: 'blanket', label: 'Blanket neutronics' },
  { id: 'field', label: 'Field profile' },
  { id: 'ignition', label: 'Ignition & T' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function PlotsPanel({ result }: { result: DesignResult }) {
  const [tab, setTab] = useState<TabId>('cost');
  return (
    <section className="panel plots" aria-label="Physics plots">
      <div className="tab-row" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'cost' && <CostTab result={result} />}
      {tab === 'blanket' && <BlanketTab result={result} />}
      {tab === 'field' && <FieldTab result={result} />}
      {tab === 'ignition' && <IgnitionTab result={result} />}
    </section>
  );
}
