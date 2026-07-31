/**
 * Coil thickness and minimum-cost minor radius — Freidberg Ch. 5,
 * Eqs. 5.22-5.31, generalized to an elliptic plasma per the chapter's own
 * Problem 5.5 (see reference/kappa_spec.md; kappa = 1 reduces bit-exactly to
 * the circular equations).
 *
 * Stress: the separating force is magnetic pressure x projected bore width;
 * the larger cut governs, and for kappa > 1 that is the force pressing on the
 * ellipse's FLAT sides (Problem 5.5's hint), giving
 *   c = 2 xi (max(kappa,1) a + b) / (1 - xi),  xi = Bmax^2/(4 mu0 sigma_max).
 * Cost: minimizing V_I/PE over a is analytic for all kappa:
 *   a = (1 + xi) b / D,  D = sqrt(2 xi [kappa(1-xi) + m^2(1+xi)]), m=max(kappa,1)
 * (at kappa = 1: D = 2 sqrt(xi), Eq. 5.29). NOTE: a depends only on b, xi,
 * kappa — PE and PW factor out, so PE moves *only* R0. The circular Eq. 5.30
 * denominator is (1 - sqrt(xi))^2, not (1 - xi)^2 (factor-1.8 error if
 * misread).
 *
 * The kappa <-> 1/kappa duality (a rotated ellipse is the same coil): a scales
 * by kappa while c, R0 and all volumes are invariant; only B0/beta break it
 * (the 1/R toroidal field knows which axis is which). Hence the cost optimum
 * over kappa sits at kappa = 1 — and it is a CUSP (the governing stress cut
 * switches there), so never spline-fit trends through kappa = 1.
 */

import { MU0 } from './constants';

export interface CoilCostResult {
  xi: number;
  a: number;
  c: number;
  VIoverPE: number; // m^3/MW
}

export function xiOf(Bmax: number, sigmaMaxMPa: number): number {
  return (Bmax * Bmax) / (4 * MU0 * sigmaMaxMPa * 1e6);
}

/** Problem 5.5 perimeter factor: C = 2 pi a f, f = sqrt((1+kappa^2)/2).
 * (The printed problem drops the square root — a typo: +62% at kappa = 2.) */
export function fKappa(kappa: number): number {
  return Math.sqrt((1 + kappa * kappa) / 2);
}

export function coilAndCost(
  Bmax: number,
  sigmaMaxMPa: number,
  b: number,
  PW: number,
  KVI: number,
  kappa: number,
): CoilCostResult {
  const xi = xiOf(Bmax, sigmaMaxMPa);
  const mK = Math.max(kappa, 1);
  const nK = Math.min(kappa, 1);
  // Written as (kappa + m^2) + xi (m^2 - kappa) so the bracket is exactly 2
  // at kappa = 1 and D reduces bit-for-bit to 2 sqrt(xi).
  const Sfac = kappa + mK * mK + xi * (mK * mK - kappa);
  const D = Math.sqrt(2 * xi * Sfac);
  const a = ((1 + xi) / D) * b;
  const c = ((2 * xi) / (1 - xi)) * (mK * a + b);
  const VIoverPE =
    (KVI * (1 + xi) * b * (2 * D + mK * (1 + 3 * xi) + nK * (1 - xi))) /
    ((1 - xi) * (1 - xi) * fKappa(kappa) * PW);
  return { xi, a, c, VIoverPE };
}

/** V_I/PE as a function of a at fixed kappa, b, xi (generalized Eq. 5.28) —
 * for the cost-curve plot. */
export function costOfA(
  a: number,
  b: number,
  xi: number,
  PW: number,
  KVI: number,
  kappa: number,
): number {
  const mK = Math.max(kappa, 1);
  const c = ((2 * xi) / (1 - xi)) * (mK * a + b);
  return (
    (KVI * ((a + b + c) * (kappa * a + b + c) - kappa * a * a)) /
    (a * fKappa(kappa) * PW)
  );
}
