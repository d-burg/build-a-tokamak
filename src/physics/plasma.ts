/**
 * Plasma parameters, Freidberg Ch. 5, Eqs. 5.34-5.43.
 *
 * Power density S = (P_alpha + P_n)/V_P; pressure from
 * S_f = (n^2/4) <sigma v> E_f with p = 2nT (Eq. 5.37 — its 8.4e-12
 * coefficient embeds sqrt(S) and the atm = 1e5 Pa convention, so it is NOT a
 * universal constant; everything here is symbolic); tauE from the ignition
 * threshold p tauE (Eq. 5.39); B0 = (R0 - a - b)/R0 * Bmax at the inboard
 * coil face (Eq. 5.42, note: not R0 - a - b - c); beta = p / (B0^2/2mu0).
 */

import { ATM, MEV, MU0, QE, ENERGETICS } from './constants';

export interface PlasmaResult {
  Spd: number; // MW/m^3
  p: number; // atm (1e5 Pa)
  pPa: number;
  n: number; // m^-3
  tauE: number; // s
  B0: number; // T
  beta: number;
}

export function plasma(
  PE: number,
  VP: number,
  T: number,
  sigmav: number,
  pTauEreq: number,
  R0: number,
  a: number,
  b: number,
  Bmax: number,
  Etot: number,
): PlasmaResult {
  const { etaT, En, Ealpha } = ENERGETICS;

  // Eqs. 5.34-5.35: alpha + neutron power per plasma volume
  const Spd = (((Ealpha + En) / Etot) * PE) / (etaT * VP); // MW/m^3

  // Eq. 5.37, symbolic: p[Pa] = sqrt(16 S / E_f) * T[J] / sqrt(<sigma v>)
  const S_SI = Spd * 1e6; // W/m^3
  const Ef_J = (Ealpha + En) * MEV;
  const T_J = T * 1e3 * QE;
  const pPa = Math.sqrt((16 * S_SI) / Ef_J) * (T_J / Math.sqrt(sigmav));
  const p = pPa / ATM;

  const n = pPa / (2 * T_J); // p = 2nT

  const tauE = pTauEreq / p; // Eq. 5.39

  const bore = R0 - a - b; // inboard coil face
  const B0 = (bore / R0) * Bmax; // Eq. 5.42 (1/R falloff)
  const beta = B0 > 0 ? pPa / ((B0 * B0) / (2 * MU0)) : Infinity; // Eq. 5.1

  return { Spd, p, pPa, n, tauE, B0, beta };
}
