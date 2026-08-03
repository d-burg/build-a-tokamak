/**
 * Robustness guards. These pin the fixes for the freeze reported by students:
 * an out-of-range input (reachable via a hand-edited or stale share link)
 * could drive the design chain to non-finite geometry, and the plot sampling
 * loops then never terminated.
 */

import { describe, expect, it } from 'vitest';
import { design } from './physics/design';
import { DEFAULTS } from './physics/constants';
import { RANGES, clampInput } from './physics/ranges';
import { costOfA, xiOf } from './physics/coilAndCost';
import type { DesignInputs } from './physics/types';

describe('input clamping', () => {
  it('clamps every key to its slider range', () => {
    for (const r of RANGES) {
      expect(clampInput(r.key, -1e9)).toBe(r.min);
      expect(clampInput(r.key, 1e9)).toBe(r.max);
      expect(clampInput(r.key, r.min)).toBe(r.min);
      expect(clampInput(r.key, r.max)).toBe(r.max);
    }
  });

  it('falls back to the default for non-finite values', () => {
    expect(clampInput('Bmax', NaN)).toBe(DEFAULTS.Bmax);
    expect(clampInput('Bmax', Infinity)).toBe(DEFAULTS.Bmax);
  });

  it('rejects the underflow that produced infinite geometry', () => {
    // 1e-200 T squares to 0 -> xi = 0 -> D = 0 -> a = Infinity (the freeze).
    expect(xiOf(1e-200, 300)).toBe(0);
    const unclamped = design({ ...DEFAULTS, Bmax: 1e-200, model: 'chapter' });
    expect(Number.isFinite(unclamped.out.a)).toBe(false); // the hazard is real
    const clamped = design({
      ...DEFAULTS,
      Bmax: clampInput('Bmax', 1e-200),
      model: 'chapter',
    });
    expect(Number.isFinite(clamped.out.a)).toBe(true); // clamping defuses it
  });
});

describe('design chain stays finite across the whole slider space', () => {
  it('never yields non-finite a, c, R0 or VI/PE for in-range inputs', () => {
    const g = (lo: number, hi: number, n: number) =>
      Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
    const R = Object.fromEntries(RANGES.map((r) => [r.key, r])) as Record<
      string,
      (typeof RANGES)[number]
    >;
    let checked = 0;
    for (const PE of g(R.PE.min, R.PE.max, 3))
      for (const PW of g(R.PW.min, R.PW.max, 3))
        for (const Bmax of g(R.Bmax.min, R.Bmax.max, 8))
          for (const sigmaMax of g(R.sigmaMax.min, R.sigmaMax.max, 5))
            for (const b of g(R.b.min, R.b.max, 3))
              for (const kappa of g(R.kappa.min, R.kappa.max, 3)) {
                const inputs: DesignInputs = {
                  PE, PW, Bmax, sigmaMax, b, kappa, T: 15, model: 'chapter',
                };
                const { out, fatal } = design(inputs);
                checked++;
                if (fatal) continue; // xi >= 1 is reported, not drawn
                for (const k of ['a', 'c', 'R0', 'VIoverPE', 'VP', 'AP'] as const) {
                  expect(Number.isFinite(out[k]), `${k} @ ${JSON.stringify(inputs)}`).toBe(true);
                }
              }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe('cost curve sampling terminates', () => {
  it('produces a bounded, finite sample set at the xi -> 1 wall', () => {
    // Bmax = 22.4 T at 100 MPa puts xi within 0.2% of 1 (coil thickness ~ km).
    const { out } = design({ ...DEFAULTS, Bmax: 22.4, sigmaMax: 100, model: 'chapter' });
    expect(out.xi).toBeGreaterThan(0.99);
    expect(Number.isFinite(out.a)).toBe(true);
    const pts = Array.from({ length: 300 }, (_, i) => {
      const a = 0.08 * out.a + ((3.2 * out.a - 0.08 * out.a) * i) / 299;
      return costOfA(a, DEFAULTS.b, out.xi, DEFAULTS.PW, 0.7868303571, DEFAULTS.kappa);
    });
    expect(pts).toHaveLength(300);
    expect(pts.every((p) => Number.isFinite(p))).toBe(true);
  });
});
