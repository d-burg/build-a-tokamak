/**
 * D-T Maxwellian reactivity <sigma v>(T).
 *
 * Bosch & Hale, "Improved formulas for fusion cross-sections and thermal
 * reactivities", Nuclear Fusion 32 (1992) 611, Table VII (T(d,n)4He),
 * Eqs. (12)-(14). Valid 0.2-100 keV, quoted accuracy ~0.25%.
 *
 * Validated against the chapter (reference/reactivity_validation.md):
 *   <sigma v>(15 keV) = 2.740e-22 m^3/s  (chapter's rounded value: 3e-22)
 *   min of T^2/<sigma v> at 13.54 keV, flat to 1% over 12.2-15.1 keV
 *   min of p*tauE = 8.94 atm s (1 atm = 1e5 Pa) at 13.54 keV (book: 8.3)
 */

import { ATM, QE, ENERGETICS } from './constants';

const BG = 34.3827; // Gamow constant, keV^(1/2)
const MRC2 = 1124656; // reduced mass energy m_r c^2, keV
const C1 = 1.17302e-9; // cm^3/s
const C2 = 1.51361e-2;
const C3 = 7.51886e-2;
const C4 = 4.60643e-3;
const C5 = 1.35e-2;
const C6 = -1.0675e-4;
const C7 = 1.366e-5;

/** Bosch-Hale D-T reactivity [m^3/s], T in keV. */
export function sigmavDT(T: number): number {
  if (T <= 0) return 0;
  const num = T * (C2 + T * (C4 + T * C6));
  const den = 1 + T * (C3 + T * (C5 + T * C7));
  const theta = T / (1 - num / den);
  const xi = Math.cbrt((BG * BG) / (4 * theta));
  const cm3 = C1 * theta * Math.sqrt(xi / (MRC2 * T * T * T)) * Math.exp(-3 * xi);
  return 1e-6 * cm3;
}

/**
 * Ignition threshold p*tauE(T) [atm s] for a 50-50 D-T plasma.
 * Alpha heating = transport loss: (1/4) n^2 <sv> E_alpha = 3 n T / tauE,
 * with p = 2nT  =>  p tauE = 24 T^2 / (<sv> E_alpha).
 */
export function pTauEIgnition(T: number): number {
  const T_J = T * 1e3 * QE;
  const EalphaJ = ENERGETICS.Ealpha * 1e6 * QE;
  const paS = (24 * T_J * T_J) / (sigmavDT(T) * EalphaJ);
  return paS / ATM;
}
