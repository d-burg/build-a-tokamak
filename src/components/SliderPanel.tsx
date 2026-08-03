import { DEFAULTS } from '../physics/constants';
import { RANGES, clampInput } from '../physics/ranges';
import type { DesignInputs } from '../physics/types';

const SLIDERS = RANGES;

const SYMBOL_HTML: Record<string, JSX.Element> = {
  P_E: <>P<sub>E</sub></>,
  P_W: <>P<sub>W</sub></>,
  B_max: <>B<sub>max</sub></>,
  'σ_max': <>σ<sub>max</sub></>,
  b: <>b</>,
  T: <>T</>,
  'κ': <>κ</>,
};

export function SliderPanel({
  inputs,
  onChange,
}: {
  inputs: DesignInputs;
  onChange: (next: DesignInputs) => void;
}) {
  return (
    <section className="panel sliders" aria-label="Design constraints">
      <h2>Constraints</h2>
      <p className="panel-hint">
        The seven limits of Table&nbsp;5.2 — engineering and nuclear physics,
        no plasma physics required.
      </p>

      <div className="model-toggle" role="radiogroup" aria-label="Reactivity model">
        <button
          className={inputs.model === 'chapter' ? 'seg active' : 'seg'}
          onClick={() => onChange({ ...inputs, model: 'chapter', T: 15 })}
        >
          Textbook
          <small>⟨σv⟩ = 3×10⁻²², T = 15 keV</small>
        </button>
        <button
          className={inputs.model === 'boschHale' ? 'seg active' : 'seg'}
          onClick={() => onChange({ ...inputs, model: 'boschHale' })}
        >
          Bosch–Hale
          <small>⟨σv⟩(T), T adjustable</small>
        </button>
      </div>

      {SLIDERS.map((s) => {
        const locked = s.key === 'T' && inputs.model === 'chapter';
        const value = locked ? 15 : inputs[s.key];
        const isDefault = value === DEFAULTS[s.key];
        // position of the textbook-default tick, as a % of the track
        const tickPct = ((DEFAULTS[s.key] - s.min) / (s.max - s.min)) * 100;
        return (
          <label className={locked ? 'slider locked' : 'slider'} key={s.key}>
            <div className="slider-head">
              <span className="slider-label">
                {s.label} <span className="sym">{SYMBOL_HTML[s.symbol]}</span>
              </span>
              <span className={isDefault ? 'slider-value default' : 'slider-value'}>
                {value} {s.unit}
              </span>
            </div>
            <div className="track-wrap">
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={value}
                disabled={locked}
                onChange={(e) =>
                  onChange({ ...inputs, [s.key]: clampInput(s.key, Number(e.target.value)) })
                }
              />
              <span className="tick" style={{ left: `${tickPct}%` }} title="textbook value" />
            </div>
            {locked && (
              <div className="lock-hint">
                fixed at 15 keV — the chapter&rsquo;s optimum; switch to
                Bosch–Hale to vary T
              </div>
            )}
          </label>
        );
      })}
    </section>
  );
}
