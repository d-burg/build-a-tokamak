import { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { DesignResult } from '../physics/types';
import { fmt } from '../format';

function Eq({ tex }: { tex: string }) {
  return (
    <div
      className="walk-eq"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, { displayMode: true, throwOnError: false }),
      }}
    />
  );
}

interface Step {
  title: string;
  eyebrow: string;
  tex: string[];
  why: string;
  numbers: (r: DesignResult) => Array<[string, string]>;
}

const STEPS: Step[] = [
  {
    eyebrow: 'The premise',
    title: 'Seven constraints, no plasma physics',
    tex: [],
    why:
      'The chapter’s central point: a fusion reactor’s size, shape, field and even its plasma parameters follow from basic engineering and nuclear physics alone — the power a plant should make (P_E), what a wall can survive (P_W), what a superconductor and its steel can hold (B_max, σ_max), and three nuclear cross-sections. Plasma physics enters only at the end, as demands (β and τ_E) the design hands to the physicists. Walk the five steps to see the whole chain.',
    numbers: (r) => [
      ['P_E', `${r.inputs.PE} MW`],
      ['P_W', `${r.inputs.PW} MW/m²`],
      ['B_max', `${r.inputs.Bmax} T`],
      ['σ_max', `${r.inputs.sigmaMax} MPa`],
    ],
  },
  {
    eyebrow: 'Step 1 · nuclear physics',
    title: 'The blanket sets its own thickness',
    tex: [
      String.raw`E = E_n\, e^{-x/\lambda_{sd}}, \qquad \lambda = \lambda_{br}\sqrt{E/E_t}`,
      String.raw`\Delta x = 2\lambda_{sd}\,\ln\!\Big[\,1 + \tfrac{1}{2}\sqrt{\tfrac{E_n}{E_t}}\,\tfrac{\lambda_{br}}{\lambda_{sd}}\,\ln\tfrac{\Gamma_{0}}{\Gamma}\Big] \approx 0.88\ \mathrm{m}`,
    ],
    why:
      '14.1 MeV neutrons must slow down (moderator) and then be captured in Li-6 to breed tritium (breeder). Slowing-down is exponential; breeding then eats the flux in a sharp front (Eqs. 5.3–5.10). Requiring 99% capture gives Δx ≈ 0.88 m — almost independent of everything else — and rounding up for multiplier, shield and structure, the chapter chooses b = 1.2 m. This one metre of nuclear real estate drives the whole machine size.',
    numbers: (r) => [
      ['Δx required', `${fmt(r.out.deltaX)} m`],
      ['moderator | breeder', `${fmt(r.out.xBoundary)} m`],
      ['b chosen', `${fmt(r.inputs.b)} m`],
    ],
  },
  {
    eyebrow: 'Step 2 · magnets + money',
    title: 'Stress sets the coil, cost sets the plasma radius',
    tex: [
      String.raw`\xi \equiv \frac{B_{max}^{2}}{4\mu_0 \sigma_{max}}, \qquad c = \frac{2\xi\,(\max(\kappa,1)\,a + b)}{1-\xi}`,
      String.raw`\min_a \frac{V_I}{P_E} \;\Rightarrow\; a = \frac{(1+\xi)\,b}{\sqrt{2\xi\left[\kappa(1-\xi) + \max(\kappa,1)^2(1+\xi)\right]}}\;\xrightarrow{\;\kappa=1\;}\;\frac{(1+\xi)}{2\sqrt{\xi}}\,b`,
    ],
    why:
      'The magnetic pressure trying to blow the coil apart must be held by steel at σ_max: that fixes the coil thickness c (Eq. 5.27). Then, minimizing the volume of highly-engineered "nuclear island" per watt — the capital-cost proxy — picks the plasma minor radius a (Eq. 5.29). Note what a does not depend on: P_E and P_W. Cost per watt is set by field, steel, and the blanket.',
    numbers: (r) => [
      ['ξ', fmt(r.out.xi)],
      ['a', `${fmt(r.out.a)} m`],
      ['c', `${fmt(r.out.c)} m`],
      ['V_I/P_E', `${fmt(r.out.VIoverPE)} m³/MW`],
    ],
  },
  {
    eyebrow: 'Step 3 · engineering',
    title: 'Wall loading sets the major radius',
    tex: [
      String.raw`4\pi^2 R_0\, a\, f(\kappa)\; P_W = \frac{E_n}{E_{tot}}\,\frac{P_E}{\eta_t} \;\Rightarrow\; R_0 = \frac{E_n}{4\pi^2 \eta_t E_{tot}}\,\frac{P_E}{a\,f(\kappa)\,P_W} \approx 0.04\,\frac{P_E}{a\,P_W}`,
    ],
    why:
      'All the neutron power must pass through the first wall, and the wall can only take P_W. With a already fixed, the only way to get enough wall area is to stretch the torus: R₀ follows immediately (Eq. 5.20). This is why the machine grows when you distrust the wall (lower P_W) and why the wall area itself never changes with elongation.',
    numbers: (r) => [
      ['R₀', `${fmt(r.out.R0)} m`],
      ['R₀/a', fmt(r.out.aspectRatio)],
      ['A_P', `${fmt(r.out.AP)} m²`],
      ['V_P', `${fmt(r.out.VP)} m³`],
    ],
  },
  {
    eyebrow: 'Step 4 · the fusion burn',
    title: 'Power density sets pressure and density',
    tex: [
      String.raw`S_{fus} = \frac{n^2}{4}\langle\sigma v\rangle\, E_f, \qquad p = 2nT \;\Rightarrow\; p = \sqrt{\frac{16\,S_{\alpha n}}{E_f}}\cdot\frac{T}{\sqrt{\langle\sigma v\rangle}}`,
    ],
    why:
      'The plasma volume must produce the required fusion power, and the burn rate scales as n²⟨σv⟩. Rewriting in terms of pressure, p ∝ T/√⟨σv⟩: pressure is minimized at the temperature minimizing T²/⟨σv⟩ — the chapter’s 15 keV (truly 13.5 keV with modern reactivity, flat to 1% across 12–15). That is why every tokamak on Earth aims for roughly this temperature.',
    numbers: (r) => [
      ['S (α+n)', `${fmt(r.out.Spd)} MW/m³`],
      ['p', `${fmt(r.out.p)} atm`],
      ['n', `${fmt(r.out.n)} m⁻³`],
      ['T', `${fmt(r.inputs.model === 'chapter' ? 15 : r.inputs.T)} keV`],
    ],
  },
  {
    eyebrow: 'Step 5 · the demands',
    title: 'What the plasma physicists owe you',
    tex: [
      String.raw`\tau_E = \frac{(p\tau_E)_{ign}}{p}, \qquad B_0 = \frac{R_0 - a - b}{R_0}\,B_{max}, \qquad \beta = \frac{p}{B_0^2/2\mu_0}`,
    ],
    why:
      'Ignition requires pτ_E above threshold, so the pressure just derived dictates the confinement time τ_E. The 1/R falloff of the toroidal field sets what B the plasma actually sees, and β — plasma pressure over magnetic pressure — measures how efficiently that field is used. These two numbers, τ_E and β, are the entire interface between this design and fifty years of plasma physics: turbulence must allow the τ_E, and stability must allow the β.',
    numbers: (r) => [
      ['τ_E', `${fmt(r.out.tauE)} s`],
      ['B₀', `${fmt(r.out.B0)} T`],
      ['β', `${fmt(r.out.beta * 100)} %`],
    ],
  },
  {
    eyebrow: 'Perspective',
    title: 'Why fusion reactors are big',
    tex: [
      String.raw`S_{fusion} \approx 5\ \mathrm{MW/m^3} \quad \text{vs.} \quad S_{fission} \approx 100\ \mathrm{MW/m^3}`,
    ],
    why:
      'A fission core packs ~20× more power into each cubic metre, and a gas turbine more still. Fusion’s power density is capped by the wall (surface) while power is made in the volume — so the machine must spread ~2500 MW of thermal power over hundreds of square metres of first wall. That is the deep reason a 1 GWe fusion plant is a 10-metre-class machine, and why every constraint you just walked — wall loading, blanket depth, magnet stress — is really a fight for power density. (§5.5.4–5.5.5.)',
    numbers: (r) => [
      ['this design', `${fmt(r.out.Spd)} MW/m³`],
      ['plasma volume', `${fmt(r.out.VP)} m³`],
      ['fission core (typ.)', '~100 MW/m³'],
    ],
  },
];

export function WalkPanel({ result }: { result: DesignResult }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  return (
    <section className="panel walk" aria-label="Design walk">
      <div className="walk-eyebrow">{s.eyebrow}</div>
      <h2 className="walk-title">{s.title}</h2>
      {s.tex.map((t, i) => (
        <Eq key={i} tex={t} />
      ))}
      <p className="walk-why">{s.why}</p>
      <div className="walk-numbers">
        {s.numbers(result).map(([k, v]) => (
          <div key={k} className="walk-num">
            <span className="walk-num-key">{k}</span>
            <span className="walk-num-val">{v}</span>
          </div>
        ))}
      </div>
      <div className="walk-nav">
        <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>
          ← Back
        </button>
        <div className="walk-dots">
          {STEPS.map((_, i) => (
            <button key={i} className={i === step ? 'dot active' : 'dot'}
              aria-label={`step ${i + 1}`} onClick={() => setStep(i)} />
          ))}
        </div>
        <button className="btn" disabled={step === STEPS.length - 1}
          onClick={() => setStep(step + 1)}>
          Next →
        </button>
      </div>
    </section>
  );
}
