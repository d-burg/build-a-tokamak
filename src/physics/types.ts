export type ReactivityModel = 'chapter' | 'boschHale';

export interface DesignInputs {
  /** Electric power output [MW] */
  PE: number;
  /** Max neutron wall loading [MW/m^2] */
  PW: number;
  /** Max field at the coil [T] */
  Bmax: number;
  /** Max coil structural stress [MPa] */
  sigmaMax: number;
  /** Blanket-and-shield thickness [m] (designer's choice; Delta-x is the physics floor) */
  b: number;
  /** Plasma temperature [keV] (locked to 15 in chapter mode) */
  T: number;
  /** Plasma elongation kappa (Problem 5.5): semi-axes (a, kappa*a). 1 = circular. */
  kappa: number;
  /** 'chapter': frozen <sigma v> = 3e-22, p*tauE = 8.3 at T = 15 keV (reproduces Table 5.3).
   *  'boschHale': <sigma v>(T) and p*tauE(T) from the Bosch-Hale 1992 fit. */
  model: ReactivityModel;
}

export type Severity = 'error' | 'warning' | 'info';

export interface DesignNote {
  id: string;
  severity: Severity;
  message: string;
}

export interface DesignOutputs {
  // blanket
  lambdaSd: number; // m, value used (chapter 0.055)
  lambdaSdFromXsec: number; // m, 1/(n_L sigma_sd) — the chapter-inconsistent value
  lambdaBr: number; // m
  deltaX: number; // m, required moderator+breeder thickness (Eq. 5.10)
  xBoundary: number; // m, moderator/breeder boundary
  // shape
  fKappa: number; // ellipse perimeter factor sqrt((1+kappa^2)/2)
  aVertical: number; // m, plasma half-height kappa*a
  coilHalfHeight: number; // m, kappa*a + b + c
  // coil & cost
  xi: number; // Bmax^2 / (4 mu0 sigma_max)
  a: number; // m, optimum minor radius (Eq. 5.29)
  c: number; // m, coil thickness (Eq. 5.27)
  VIoverPE: number; // m^3/MW (Eq. 5.30, corrected denominator)
  VI: number; // m^3
  // geometry
  R0: number; // m (Eq. 5.20)
  aspectRatio: number;
  AP: number; // m^2 first-wall area
  VP: number; // m^3 plasma volume
  // plasma
  Spd: number; // MW/m^3, (P_alpha + P_n)/V_P
  sigmav: number; // m^3/s actually used
  pTauEreq: number; // atm s, ignition threshold used
  p: number; // atm (1 atm = 1e5 Pa)
  pPa: number; // Pa
  n: number; // m^-3
  tauE: number; // s
  B0: number; // T
  beta: number; // dimensionless
}

export interface DesignResult {
  inputs: DesignInputs;
  out: DesignOutputs;
  notes: DesignNote[];
  /** true when a hard error makes downstream outputs meaningless */
  fatal: boolean;
}
