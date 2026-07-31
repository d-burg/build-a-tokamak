/**
 * The full Ch. 5 design chain, in the chapter's order:
 *   blanket -> coil & minor radius -> major radius -> plasma -> tauE, B0, beta
 * plus the guard rails verified in reference/physics_spec.md.
 */

import { MU0, CHAPTER, ENERGETICS } from './constants';
import { blanket } from './blanket';
import { coilAndCost, xiOf } from './coilAndCost';
import { geometry } from './geometry';
import { plasma } from './plasma';
import { sigmavDT, pTauEIgnition } from './reactivity';
import type { DesignInputs, DesignNote, DesignResult } from './types';

export function coefficients() {
  const { etaT, En, Ealpha, ELi } = ENERGETICS;
  const Etot = Ealpha + En + ELi; // 22.4 MeV
  const KR0 = (1 / (4 * Math.PI ** 2 * etaT)) * (En / Etot); // chapter's 0.04
  const KVI = 2 * Math.PI ** 2 * KR0; // chapter's 0.79
  return { Etot, KR0, KVI };
}

export function design(inputs: DesignInputs): DesignResult {
  const notes: DesignNote[] = [];
  const T = inputs.model === 'chapter' ? CHAPTER.T : inputs.T;
  const { kappa } = inputs;
  const { Etot, KR0, KVI } = coefficients();

  // ---- reactivity model
  const sigmav = inputs.model === 'chapter' ? CHAPTER.sigmav : sigmavDT(T);
  const pTauEreq = inputs.model === 'chapter' ? CHAPTER.pTauE : pTauEIgnition(T);

  // ---- step 1: blanket (independent of the other inputs at fixed neutronics)
  const bl = blanket();
  if (inputs.b < bl.deltaX) {
    notes.push({
      id: 'b-thin',
      severity: 'warning',
      message: `Blanket b = ${inputs.b.toFixed(2)} m is thinner than the required moderator-breeder depth Δx = ${bl.deltaX.toFixed(2)} m — neutrons reach the magnets.`,
    });
  }

  // ---- step 2: coil thickness + optimum minor radius
  const xi = xiOf(inputs.Bmax, inputs.sigmaMax);
  if (xi >= 1) {
    const BmaxLimit = Math.sqrt(4 * MU0 * inputs.sigmaMax * 1e6);
    notes.push({
      id: 'xi-ge-1',
      severity: 'error',
      message: `ξ = B²ₘₐₓ/(4μ₀σₘₐₓ) = ${xi.toFixed(2)} ≥ 1: the coil cannot support its own magnetic force (c → ∞). Need Bₘₐₓ < ${BmaxLimit.toFixed(1)} T at this stress limit.`,
    });
    return {
      inputs,
      out: emptyOutputs(bl, xi, sigmav, pTauEreq),
      notes,
      fatal: true,
    };
  }
  if (xi > 0.5) {
    notes.push({
      id: 'xi-thick',
      severity: 'warning',
      message: `ξ = ${xi.toFixed(2)} > 0.5: coil thicker than a + b — the thin-coil stress model is outside its validity.`,
    });
  }
  const cc = coilAndCost(inputs.Bmax, inputs.sigmaMax, inputs.b, inputs.PW, KVI, kappa);

  // ---- step 3: major radius from wall loading
  const geo = geometry(inputs.PE, inputs.PW, cc.a, inputs.b, cc.c, KR0, kappa);
  if (geo.aspectRatio <= 1) {
    notes.push({
      id: 'aspect',
      severity: 'error',
      message: `Aspect ratio R₀/a = ${geo.aspectRatio.toFixed(2)} ≤ 1: the torus is degenerate (raise P_E or lower P_W).`,
    });
  }

  // ---- steps 4-5: plasma parameters
  const pl = plasma(
    inputs.PE, geo.VP, T, sigmav, pTauEreq,
    geo.R0, cc.a, inputs.b, inputs.Bmax, Etot,
  );
  const bore = geo.R0 - cc.a - inputs.b;
  if (bore <= 0) {
    notes.push({
      id: 'bore',
      severity: 'error',
      message: `R₀ − a − b = ${bore.toFixed(2)} m ≤ 0: the inboard blanket and coil do not fit inside the hole of the torus, so B₀ is unphysical. Raise P_E, lower P_W, or thin the blanket.`,
    });
  } else if (geo.R0 - cc.a - inputs.b - cc.c <= 0) {
    notes.push({
      id: 'coil-leg',
      severity: 'warning',
      message: `R₀ − a − b − c = ${(geo.R0 - cc.a - inputs.b - cc.c).toFixed(2)} m ≤ 0: the inboard coil leg itself does not fit in the torus hole (the chapter's B₀ formula ignores c, so B₀ still reads finite).`,
    });
  } else if (pl.beta > 0.15) {
    notes.push({
      id: 'beta-high',
      severity: 'warning',
      message: `β = ${(pl.beta * 100).toFixed(1)}% — beyond ~15% no magnetic configuration has stably confined a plasma; this design asks more of the plasma physicists than they can deliver.`,
    });
  }

  if (kappa < 0.5 || kappa > 2.5) {
    notes.push({
      id: 'kappa-range',
      severity: 'warning',
      message: `κ = ${kappa.toFixed(2)} is outside Problem 5.5's validated range 0.5–2.5; the perimeter approximation and flat-side stress model both degrade.`,
    });
  }
  if (kappa !== 1) {
    notes.push({
      id: 'kappa-scope',
      severity: 'info',
      message: `Elongation here shows only the geometric effects (this model): wall area is fixed, a shrinks, the coil thickens, and cost rises slightly — the circular plasma is this model's cost optimum. The real-world case for κ > 1 is the β-limit and plasma-current physics (β_max ∝ κ), which this chapter deliberately leaves out.`,
    });
  }

  return {
    inputs,
    out: {
      ...bl,
      fKappa: Math.sqrt((1 + kappa * kappa) / 2),
      aVertical: kappa * cc.a,
      coilHalfHeight: kappa * cc.a + inputs.b + cc.c,
      xi: cc.xi,
      a: cc.a,
      c: cc.c,
      VIoverPE: cc.VIoverPE,
      VI: geo.VI,
      R0: geo.R0,
      aspectRatio: geo.aspectRatio,
      AP: geo.AP,
      VP: geo.VP,
      sigmav,
      pTauEreq,
      ...pl,
    },
    notes,
    fatal: notes.some((n) => n.severity === 'error'),
  };
}

function emptyOutputs(
  bl: ReturnType<typeof blanket>,
  xi: number,
  sigmav: number,
  pTauEreq: number,
) {
  return {
    ...bl,
    fKappa: NaN, aVertical: NaN, coilHalfHeight: NaN,
    xi,
    a: NaN, c: NaN, VIoverPE: NaN, VI: NaN,
    R0: NaN, aspectRatio: NaN, AP: NaN, VP: NaN,
    Spd: NaN, sigmav, pTauEreq, p: NaN, pPa: NaN, n: NaN,
    tauE: NaN, B0: NaN, beta: NaN,
  };
}
