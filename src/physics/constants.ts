/**
 * Physical constants and Table 5.2 defaults for the design chain of
 * Freidberg, *Plasma Physics and Fusion Energy*, Ch. 5 (pp. 85-108).
 *
 * Conventions (see reference/physics_spec.md):
 *  - 1 "atm" = 1e5 Pa. The chapter's "atm" is really a bar: this is what makes
 *    "300 MPa ~ 3000 atm" and the 8.4e-12 coefficient of Eq. 5.37 come out.
 *  - E_Li = 4.8 MeV (E_tot = 22.4 MeV) reproduces the chapter's 0.04 / 0.79 /
 *    1.58 shortcut coefficients.
 *  - lambda_sd = 0.055 m is the chapter's *stated* value; its own formula
 *    1/(n_L sigma_sd) gives 0.222 m (known factor-4 inconsistency in the
 *    text). 0.055 m is what reproduces Delta-x ~ 0.88 m and the 0.79 m
 *    moderator/breeder boundary, so it is the default here.
 */

export const MU0 = 4e-7 * Math.PI; // H/m
export const QE = 1.602176634e-19; // C (J per eV)
export const BARN = 1e-28; // m^2
export const MEV = 1e6 * QE; // J per MeV
export const ATM = 1e5; // Pa per "atm" (chapter convention = bar)

/** Table 5.2 constraint defaults + chapter energetics. */
export const DEFAULTS = {
  PE: 1000, // MW electric
  PW: 4, // MW/m^2 max neutron wall loading
  Bmax: 13, // T max field at the coil
  sigmaMax: 300, // MPa max coil structural stress
  b: 1.2, // m blanket-and-shield thickness (chapter's chosen value)
  T: 15, // keV
  kappa: 1, // plasma elongation (Problem 5.5; 1 = the chapter's circular case)
} as const;

export const ENERGETICS = {
  etaT: 0.4, // thermal conversion efficiency
  En: 14.1, // MeV, D-T neutron
  Ealpha: 3.5, // MeV, D-T alpha
  ELi: 4.8, // MeV, Li6(n,alpha)T Q-value (chapter-coefficient fit)
} as const;

export const BLANKET = {
  nL: 4.5e28, // m^-3 natural lithium number density
  fLi6: 0.075, // Li-6 fraction of natural lithium
  sigmaSd: 1, // barn, fast-neutron slowing-down cross-section
  sigmaBr: 950, // barn, Li-6 thermal breeding cross-section
  Et: 0.025, // eV, thermal energy
  attenuation: 100, // required flux reduction Gamma_n0/Gamma_n
  lambdaSd: 0.055, // m, chapter's stated slowing-down mean free path
} as const;

/** Frozen chapter design-point constants ("chapter" reactivity model). */
export const CHAPTER = {
  T: 15, // keV
  sigmav: 3e-22, // m^3/s, <sigma v> at 15 keV as used by the chapter
  pTauE: 8.3, // atm s, ignition threshold (book Ch. 4)
} as const;

/** Table 5.3 as printed — the reference column shown in the outputs panel. */
export const TABLE_5_3 = {
  b: 1.2,
  c: 0.79,
  a: 2.0,
  R0: 5.0,
  aspectRatio: 2.5,
  AP: 400,
  VP: 400,
  Spd: 4.9,
  B0: 4.7,
  p: 7.2,
  T: 15,
  n: 1.5e20,
  tauE: 1.2,
  beta: 0.082,
  deltaX: 0.88,
  xi: 0.11,
  VIoverPE: 1.2,
} as const;
