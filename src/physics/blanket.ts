/**
 * Blanket-and-shield thickness, Freidberg Ch. 5, Eqs. 5.3-5.11.
 *
 * Fast neutrons slow down (E = En exp(-x/lambda_sd), Eqs. 5.3-5.4) while the
 * flux is eaten by Li-6 breeding with lambda = lambda_br (E/Et)^1/2
 * (Eqs. 5.5-5.7), giving the double-exponential flux decay of Eq. 5.9 and the
 * required moderator+breeder thickness Delta-x of Eq. 5.10.
 */

import { BARN, BLANKET, ENERGETICS } from './constants';

export interface BlanketResult {
  lambdaSd: number;
  lambdaSdFromXsec: number;
  lambdaBr: number;
  deltaX: number;
  xBoundary: number;
}

export function blanket(): BlanketResult {
  const { nL, fLi6, sigmaSd, sigmaBr, Et, attenuation, lambdaSd } = BLANKET;

  // The chapter's formula value (0.222 m) vs its stated value (0.055 m) —
  // known factor-4 inconsistency; 0.055 m reproduces the chapter's results.
  const lambdaSdFromXsec = 1 / (nL * sigmaSd * BARN);
  const lambdaBr = 1 / (fLi6 * nL * sigmaBr * BARN); // Eq. 5.7, 0.0031 m

  const sqrtRatio = Math.sqrt((ENERGETICS.En * 1e6) / Et); // (Ef/Et)^1/2
  const arg = 1 + 0.5 * sqrtRatio * (lambdaBr / lambdaSd) * Math.log(attenuation);
  const deltaX = 2 * lambdaSd * Math.log(arg); // Eq. 5.10, ~0.884 m

  // moderator/breeder boundary: lambda_sd = lambda_br (E/Et)^1/2, ~0.79 m
  const ratio = lambdaSd / (lambdaBr * sqrtRatio);
  const xBoundary = ratio > 0 && ratio < 1 ? -2 * lambdaSd * Math.log(ratio) : 0;

  return { lambdaSd, lambdaSdFromXsec, lambdaBr, deltaX, xBoundary };
}

/**
 * Neutron energy and flux profiles through the moderator-breeder region,
 * for the attenuation plot (Eqs. 5.4 and 5.9). x in metres.
 */
export function attenuationProfile(x: number): { E_MeV: number; flux: number } {
  const { lambdaSd, Et } = BLANKET;
  const lambdaBr = 1 / (BLANKET.fLi6 * BLANKET.nL * BLANKET.sigmaBr * BARN);
  const sqrtEt = Math.sqrt(Et / (ENERGETICS.En * 1e6)); // (Et/Ef)^1/2
  const E_MeV = ENERGETICS.En * Math.exp(-x / lambdaSd);
  const flux = Math.exp(
    -2 * sqrtEt * (lambdaSd / lambdaBr) * (Math.exp(x / (2 * lambdaSd)) - 1),
  );
  return { E_MeV, flux };
}
