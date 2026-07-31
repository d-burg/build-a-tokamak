/**
 * Regression tests pinning the TypeScript port to the verified Python
 * reference (reference/reactor_core.py + reference/verify.py), which was
 * itself validated against Freidberg Table 5.3. Fixture values generated with
 * atm = 1e5 Pa, E_Li = 4.8 MeV, lambda_sd = 0.055 m.
 */

import { describe, expect, it } from 'vitest';
import { design } from './design';
import { sigmavDT, pTauEIgnition } from './reactivity';
import { DEFAULTS, TABLE_5_3 } from './constants';
import type { DesignInputs } from './types';

const chapterInputs: DesignInputs = { ...DEFAULTS, model: 'chapter' };

function rel(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.abs(expected);
}

describe('chapter mode reproduces the verified Python reference exactly', () => {
  const { out } = design(chapterInputs);
  const fixtures: Array<[keyof typeof out, number]> = [
    ['xi', 0.1120716058],
    ['a', 1.993132658],
    ['c', 0.8060548727],
    ['VIoverPE', 1.186377032],
    ['R0', 4.999829213],
    ['aspectRatio', 2.508528066],
    ['AP', 393.4151786],
    ['VP', 392.0643203],
    ['Spd', 5.010110873],
    ['p', 7.397980026],
    ['n', 1.539151982e20],
    ['tauE', 1.121927874],
    ['B0', 4.697571499],
    ['beta', 0.08425704353],
    ['deltaX', 0.8843765873],
    ['xBoundary', 0.7925975511],
    ['lambdaBr', 0.003118908382],
  ];
  it.each(fixtures)('%s matches Python reference', (key, expected) => {
    expect(rel(out[key] as number, expected)).toBeLessThan(1e-8);
  });
});

describe('chapter mode agrees with printed Table 5.3 within book rounding', () => {
  const { out, notes, fatal } = design(chapterInputs);
  it('no warnings or errors at the chapter design point', () => {
    expect(fatal).toBe(false);
    expect(notes).toHaveLength(0);
  });
  it('geometry within 2.5%', () => {
    expect(rel(out.a, TABLE_5_3.a)).toBeLessThan(0.01);
    expect(rel(out.c, TABLE_5_3.c)).toBeLessThan(0.025);
    expect(rel(out.R0, TABLE_5_3.R0)).toBeLessThan(0.001);
    expect(rel(out.AP, TABLE_5_3.AP)).toBeLessThan(0.02);
    expect(rel(out.VP, TABLE_5_3.VP)).toBeLessThan(0.02);
  });
  it('plasma within book rounding (tauE worst at ~7%)', () => {
    expect(rel(out.B0, TABLE_5_3.B0)).toBeLessThan(0.001);
    expect(rel(out.p, TABLE_5_3.p)).toBeLessThan(0.03);
    expect(rel(out.n, TABLE_5_3.n)).toBeLessThan(0.03);
    expect(rel(out.tauE, TABLE_5_3.tauE)).toBeLessThan(0.07);
    expect(rel(out.beta, TABLE_5_3.beta)).toBeLessThan(0.03);
    expect(rel(out.deltaX, TABLE_5_3.deltaX)).toBeLessThan(0.01);
  });
});

describe('Bosch-Hale reactivity (validated vs reference/reactivity_validation.md)', () => {
  it('sigmav(15 keV) = 2.7399e-22 m^3/s', () => {
    expect(rel(sigmavDT(15), 2.739929611e-22)).toBeLessThan(1e-6);
  });
  it('T^2/sigmav minimum near 13.5 keV', () => {
    let bestT = 0;
    let best = Infinity;
    for (let T = 5; T <= 40; T += 0.01) {
      const v = (T * T) / sigmavDT(T);
      if (v < best) {
        best = v;
        bestT = T;
      }
    }
    expect(bestT).toBeGreaterThan(13.3);
    expect(bestT).toBeLessThan(13.8);
  });
  it('ignition p*tauE at 15 keV ~ 9.02 atm s (atm = 1e5 Pa)', () => {
    expect(rel(pTauEIgnition(15), 9.021872876)).toBeLessThan(1e-6);
  });
  it('Bosch-Hale mode at 15 keV: p = 7.741 atm, beta = 8.82%', () => {
    const { out } = design({ ...DEFAULTS, model: 'boschHale' });
    expect(rel(out.p, 7.741124974)).toBeLessThan(1e-6);
    expect(rel(out.beta, 0.08816518856)).toBeLessThan(1e-6);
  });
});

describe('kappa elongation (fixtures from reference/reactor_core_kappa.py, atm = 1e5)', () => {
  it('kappa = 1.5 matches the Python reference', () => {
    const { out } = design({ ...DEFAULTS, kappa: 1.5, model: 'chapter' });
    const fx: Array<[number, number]> = [
      [out.a, 1.439534598],
      [out.c, 0.8480016187],
      [out.R0, 5.4305346],
      [out.AP, 393.4151786],
      [out.VP, 333.2021535],
      [out.VIoverPE, 1.239675331],
      [out.Spd, 5.895177128],
      [out.p, 8.024868329],
      [out.n, 1.669576283e20],
      [out.tauE, 1.034284883],
      [out.B0, 6.681294329],
      [out.beta, 0.04518107572],
      [out.fKappa, 1.274754878],
    ];
    for (const [actual, expected] of fx) {
      expect(rel(actual, expected)).toBeLessThan(1e-8);
    }
  });
  it('kappa = 2 matches the Python reference', () => {
    const { out } = design({ ...DEFAULTS, kappa: 2, model: 'chapter' });
    expect(rel(out.a, 1.12982561)).toBeLessThan(1e-8);
    expect(rel(out.c, 0.8733331879)).toBeLessThan(1e-8);
    expect(rel(out.R0, 5.578403901)).toBeLessThan(1e-8);
    expect(rel(out.beta, 0.03831174605)).toBeLessThan(1e-8);
  });
  it('kappa = 1 is identical to the circular chain (unified code path)', () => {
    const circ = design({ ...DEFAULTS, model: 'chapter' });
    const k1 = design({ ...DEFAULTS, kappa: 1, model: 'chapter' });
    expect(k1.out.a).toBe(circ.out.a);
    expect(k1.out.VIoverPE).toBe(circ.out.VIoverPE);
  });
  it('A_P is exactly kappa-independent', () => {
    const k15 = design({ ...DEFAULTS, kappa: 1.5, model: 'chapter' });
    const k1 = design({ ...DEFAULTS, kappa: 1, model: 'chapter' });
    expect(rel(k15.out.AP, k1.out.AP)).toBeLessThan(1e-12);
  });
  it('kappa <-> 1/kappa duality: a(0.5) = 2 a(2); c, R0, V_P invariant; beta breaks it', () => {
    const k2 = design({ ...DEFAULTS, kappa: 2, model: 'chapter' });
    const kHalf = design({ ...DEFAULTS, kappa: 0.5, model: 'chapter' });
    expect(rel(kHalf.out.a, 2 * k2.out.a)).toBeLessThan(1e-12);
    expect(rel(kHalf.out.c, k2.out.c)).toBeLessThan(1e-12);
    expect(rel(kHalf.out.R0, k2.out.R0)).toBeLessThan(1e-12);
    expect(rel(kHalf.out.VP, k2.out.VP)).toBeLessThan(1e-12);
    expect(kHalf.out.beta).not.toBeCloseTo(k2.out.beta, 4);
  });
  it('circular is the cost minimum over kappa', () => {
    const cost = (kappa: number) =>
      design({ ...DEFAULTS, kappa, model: 'chapter' }).out.VIoverPE;
    expect(cost(1)).toBeLessThan(cost(0.75));
    expect(cost(1)).toBeLessThan(cost(1.25));
    expect(cost(1)).toBeLessThan(cost(2));
  });
  it('model-scope info note appears only when kappa != 1', () => {
    const k15 = design({ ...DEFAULTS, kappa: 1.5, model: 'chapter' });
    expect(k15.notes.some((n) => n.id === 'kappa-scope' && n.severity === 'info')).toBe(true);
    const k1 = design({ ...DEFAULTS, kappa: 1, model: 'chapter' });
    expect(k1.notes).toHaveLength(0);
  });
});

describe('guard rails', () => {
  it('xi >= 1 is a fatal error (Bmax = 40 T at 300 MPa)', () => {
    const r = design({ ...DEFAULTS, Bmax: 40, model: 'chapter' });
    expect(r.fatal).toBe(true);
    expect(r.notes.some((n) => n.id === 'xi-ge-1')).toBe(true);
  });
  it('inboard leg does not fit at PE = 500 MW', () => {
    const r = design({ ...DEFAULTS, PE: 500, model: 'chapter' });
    expect(r.notes.some((n) => n.id === 'bore')).toBe(true);
  });
  it('thin blanket warning below deltaX', () => {
    const r = design({ ...DEFAULTS, b: 0.8, model: 'chapter' });
    expect(r.notes.some((n) => n.id === 'b-thin')).toBe(true);
  });
  it('PE moves only R0 — a and c are invariant', () => {
    const r1 = design({ ...DEFAULTS, model: 'chapter' });
    const r2 = design({ ...DEFAULTS, PE: 2000, model: 'chapter' });
    expect(r2.out.a).toBe(r1.out.a);
    expect(r2.out.c).toBe(r1.out.c);
    expect(rel(r2.out.R0, 2 * r1.out.R0)).toBeLessThan(1e-12);
  });
});
