/**
 * Major radius and plasma geometry — Freidberg Ch. 5, Eqs. 5.20, 5.32-5.33,
 * generalized to an elliptic plasma (Problem 5.5 conventions).
 *
 * The wall-loading constraint spreads the neutron power (En/Etot) PE / etaT
 * over the first wall A_P = 4 pi^2 R0 a f(kappa), giving
 * R0 = K_R0 PE / (a f P_W). A_P itself is exactly kappa-INDEPENDENT
 * (neutron power / wall load fixes it outright); V_P = 2 pi^2 R0 kappa a^2.
 * V_I subtracts only the plasma (Eq. 5.15 convention — the blanket is inside
 * the priced nuclear island).
 */

import { fKappa } from './coilAndCost';

export interface GeometryResult {
  R0: number;
  aspectRatio: number;
  AP: number; // m^2
  VP: number; // m^3
  VI: number; // m^3
}

export function geometry(
  PE: number,
  PW: number,
  a: number,
  b: number,
  c: number,
  KR0: number,
  kappa: number,
): GeometryResult {
  const f = fKappa(kappa);
  const R0 = (KR0 * PE) / (a * f * PW); // M4 (Eq. 5.20 at kappa = 1)
  const AP = 4 * Math.PI ** 2 * R0 * a * f; // M2
  const VP = 2 * Math.PI ** 2 * R0 * kappa * a * a; // M3
  const abc = a + b + c;
  const VI = 2 * Math.PI ** 2 * R0 * (abc * (kappa * a + b + c) - kappa * a * a); // M6
  return { R0, aspectRatio: R0 / a, AP, VP, VI };
}
