import { TABLE_5_3 } from '../physics/constants';
import type { DesignResult } from '../physics/types';
import { fmt } from '../format';

interface Row {
  label: string;
  symbol: JSX.Element;
  value: number;
  unit: string;
  book?: number;
  /** multiply displayed value (e.g. beta -> %) */
  scale?: number;
}

export function OutputsPanel({ result }: { result: DesignResult }) {
  const { out, inputs } = result;

  const groups: Array<{ title: string; rows: Row[] }> = [
    {
      title: 'Geometry',
      rows: [
        { label: 'Minor radius', symbol: <>a</>, value: out.a, unit: 'm', book: TABLE_5_3.a },
        { label: 'Plasma half-height', symbol: <>κa</>, value: out.aVertical, unit: 'm', book: TABLE_5_3.a },
        { label: 'Coil thickness', symbol: <>c</>, value: out.c, unit: 'm', book: TABLE_5_3.c },
        { label: 'Major radius', symbol: <>R₀</>, value: out.R0, unit: 'm', book: TABLE_5_3.R0 },
        { label: 'Aspect ratio', symbol: <>R₀/a</>, value: out.aspectRatio, unit: '', book: TABLE_5_3.aspectRatio },
        { label: 'Wall area', symbol: <>A<sub>P</sub></>, value: out.AP, unit: 'm²', book: TABLE_5_3.AP },
        { label: 'Plasma volume', symbol: <>V<sub>P</sub></>, value: out.VP, unit: 'm³', book: TABLE_5_3.VP },
      ],
    },
    {
      title: 'Blanket & magnets',
      rows: [
        { label: 'Required moderator depth', symbol: <>Δx</>, value: out.deltaX, unit: 'm', book: TABLE_5_3.deltaX },
        { label: 'Stress parameter', symbol: <>ξ</>, value: out.xi, unit: '', book: TABLE_5_3.xi },
        { label: 'Field on axis', symbol: <>B₀</>, value: out.B0, unit: 'T', book: TABLE_5_3.B0 },
        { label: 'Nuclear island volume', symbol: <>V<sub>I</sub>/P<sub>E</sub></>, value: out.VIoverPE, unit: 'm³/MW', book: TABLE_5_3.VIoverPE },
      ],
    },
    {
      title: 'Plasma (the “demands”)',
      rows: [
        { label: 'Power density', symbol: <>S<sub>P</sub></>, value: out.Spd, unit: 'MW/m³', book: TABLE_5_3.Spd },
        { label: 'Pressure', symbol: <>p</>, value: out.p, unit: 'atm', book: TABLE_5_3.p },
        { label: 'Density', symbol: <>n</>, value: out.n, unit: 'm⁻³', book: TABLE_5_3.n },
        { label: 'Temperature', symbol: <>T</>, value: inputs.model === 'chapter' ? 15 : inputs.T, unit: 'keV', book: TABLE_5_3.T },
        { label: 'Confinement time', symbol: <>τ<sub>E</sub></>, value: out.tauE, unit: 's', book: TABLE_5_3.tauE },
        { label: 'Plasma beta', symbol: <>β</>, value: out.beta, unit: '%', book: TABLE_5_3.beta, scale: 100 },
      ],
    },
  ];

  return (
    <section className="panel outputs" aria-label="Design outputs">
      <h2>Design outputs</h2>
      <p className="panel-hint">Computed vs. Table 5.3 (textbook column stays fixed).</p>
      {groups.map((g) => (
        <div key={g.title} className="out-group">
          <h3>{g.title}</h3>
          <table>
            <colgroup>
              <col />
              <col className="col-computed" />
              <col className="col-book" />
            </colgroup>
            <thead>
              <tr>
                <th />
                <th className="num">computed</th>
                <th className="num book-col">book</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <OutRow key={i} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

function OutRow({ row }: { row: Row }) {
  const s = row.scale ?? 1;
  const v = row.value * s;
  const book = row.book !== undefined ? row.book * s : undefined;
  const dev = book !== undefined && Number.isFinite(v) ? (v - book) / book : undefined;
  // book-rounding drift at the textbook point reaches 6.5% (tau_E), so the
  // "matches the book" band is 8%; beyond that the student has moved a slider
  const devClass =
    dev === undefined ? '' : Math.abs(dev) < 0.08 ? 'dev-ok' : Math.abs(dev) < 0.3 ? 'dev-warn' : 'dev-bad';
  return (
    <tr>
      <td>
        <span className="row-symbol">{row.symbol}</span>
        <span className="row-label">{row.label}</span>
      </td>
      <td className={`num ${devClass}`}>
        {fmt(v)}
        {row.unit && <span className="unit"> {row.unit}</span>}
      </td>
      <td className="num book-col">{book !== undefined ? fmt(book) : '—'}</td>
    </tr>
  );
}
