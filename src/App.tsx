import { useEffect, useMemo, useState } from 'react';
import { design } from './physics/design';
import { DEFAULTS } from './physics/constants';
import type { DesignInputs } from './physics/types';
import { SliderPanel } from './components/SliderPanel';
import { CrossSection } from './components/CrossSection';
import { OutputsPanel } from './components/OutputsPanel';
import { NotesBar } from './components/NotesBar';
import { PlotsPanel } from './components/PlotsPanel';
import { WalkPanel } from './components/WalkPanel';
import { buildReport, downloadText, reportFilename } from './export';

const INITIAL: DesignInputs = { ...DEFAULTS, model: 'chapter' };
type View = 'explore' | 'walk';

interface Preset {
  id: string;
  label: string;
  hint: string;
  inputs: Partial<DesignInputs>;
}

const PRESETS: Preset[] = [
  { id: 'textbook', label: 'Textbook design point', hint: 'Freidberg Table 5.3', inputs: {} },
  { id: 'hts', label: 'HTS magnets (B_max = 20 T)', hint: 'What does high-temperature superconductor buy?', inputs: { Bmax: 20 } },
  { id: 'wall', label: 'Conservative wall (P_W = 1)', hint: 'Distrust the materials people', inputs: { PW: 1 } },
  { id: 'steel', label: 'Super steel (σ_max = 600 MPa)', hint: 'Twice the allowable stress', inputs: { sigmaMax: 600 } },
  { id: 'elong', label: 'Elongated (κ = 1.8)', hint: 'A modern-looking cross-section', inputs: { kappa: 1.8 } },
  { id: 'pilot', label: 'Small pilot plant (P_E = 500 MW)', hint: 'Why small fusion is hard', inputs: { PE: 500 } },
];

/* ---------------- URL state (shareable classroom links) ---------------- */

const NUM_KEYS = ['PE', 'PW', 'Bmax', 'sigmaMax', 'b', 'T', 'kappa'] as const;

function fromURL(): { inputs: DesignInputs; view: View } {
  const q = new URLSearchParams(window.location.search);
  const inputs: DesignInputs = { ...INITIAL };
  for (const k of NUM_KEYS) {
    const v = Number(q.get(k));
    if (Number.isFinite(v) && v > 0 && q.get(k) !== null) inputs[k] = v;
  }
  if (q.get('model') === 'boschHale') inputs.model = 'boschHale';
  const view: View = q.get('view') === 'walk' ? 'walk' : 'explore';
  return { inputs, view };
}

function toURL(inputs: DesignInputs, view: View) {
  const q = new URLSearchParams();
  for (const k of NUM_KEYS) {
    if (inputs[k] !== DEFAULTS[k]) q.set(k, String(inputs[k]));
  }
  if (inputs.model !== 'chapter') q.set('model', inputs.model);
  if (view !== 'explore') q.set('view', view);
  const s = q.toString();
  window.history.replaceState(null, '', s ? `?${s}` : window.location.pathname);
}

/* ----------------------------------------------------------------------- */

export function App() {
  const [{ inputs, view }, setState] = useState(fromURL);
  const setInputs = (next: DesignInputs) => setState({ inputs: next, view });
  const setView = (v: View) => setState({ inputs, view: v });
  const [copied, setCopied] = useState(false);

  useEffect(() => toURL(inputs, view), [inputs, view]);

  const result = useMemo(() => design(inputs), [inputs]);

  const atDefaults =
    inputs.model === 'chapter' &&
    (Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>).every(
      (k) => inputs[k] === DEFAULTS[k],
    );

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (e.g. file://) — the URL bar still has the state */
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Build-a-Tokamak</h1>
          <p className="subtitle">
            Freidberg, <em>Plasma Physics and Fusion Energy</em>, Ch.&nbsp;5 —
            &ldquo;Design of a simple magnetic fusion reactor&rdquo;
          </p>
        </div>
        <div className="header-actions">
          <div className="view-toggle" role="radiogroup" aria-label="View">
            <button className={view === 'explore' ? 'seg-sm active' : 'seg-sm'}
              onClick={() => setView('explore')}>
              Explore
            </button>
            <button className={view === 'walk' ? 'seg-sm active' : 'seg-sm'}
              onClick={() => setView('walk')}>
              Design Walk
            </button>
          </div>
          <select
            className="preset-select"
            value=""
            aria-label="Load a scenario"
            onChange={(e) => {
              const p = PRESETS.find((x) => x.id === e.target.value);
              if (p) setInputs({ ...INITIAL, ...p.inputs });
            }}
          >
            <option value="" disabled>
              Scenarios…
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id} title={p.hint}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="share-slot">
            <button className="btn" onClick={share}>
              {copied ? 'Copied!' : 'Share link'}
            </button>
          </span>
          <button
            className="btn"
            title="Download a Markdown report of the current design"
            onClick={() => {
              const now = new Date();
              downloadText(
                reportFilename(now),
                buildReport(result, window.location.href, now),
              );
            }}
          >
            Export
          </button>
          <span className="status-slot">
            {atDefaults ? (
              <span className="badge badge-book">textbook design point</span>
            ) : (
              <button className="btn" onClick={() => setInputs(INITIAL)}>
                Reset to textbook
              </button>
            )}
          </span>
        </div>
      </header>

      <NotesBar notes={result.notes} />

      <main className="layout">
        <SliderPanel inputs={inputs} onChange={setInputs} />
        <CrossSection result={result} />
        {view === 'explore' ? (
          <OutputsPanel result={result} />
        ) : (
          <WalkPanel result={result} />
        )}
      </main>

      {view === 'explore' && <PlotsPanel result={result} />}

      <footer className="footer">
        All quantities follow the chapter&rsquo;s symbolic equations
        (1&nbsp;atm&nbsp;=&nbsp;10⁵&nbsp;Pa, E<sub>Li</sub>&nbsp;=&nbsp;4.8&nbsp;MeV).
        Small differences from the printed Table&nbsp;5.3 (≤&nbsp;7%, worst
        τ<sub>E</sub>) are the book&rsquo;s intermediate rounding, not model differences.
        {' '}Script it yourself: <a className="footer-link" href="./build_a_tokamak.py"
          download>build_a_tokamak.py</a> — the same verified design chain as a
        single-file Python module (standard library only).
      </footer>
    </div>
  );
}
