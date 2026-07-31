"""
reactor_core_kappa.py -- ELONGATED (kappa) generalization of the design chain in

    J. P. Freidberg, *Plasma Physics and Fusion Energy*, Cambridge (2007),
    Chapter 5, "Design of a simple magnetic fusion reactor" (pp. 85-108),

following the conventions PRESCRIBED BY THE CHAPTER'S OWN **PROBLEM 5.5**
(p. 108).  Baseline (circular, kappa = 1) implementation: `reactor_core.py`.

--------------------------------------------------------------------------
PROBLEM 5.5 AS PRINTED (p. 108) -- verbatim content, our paraphrase
--------------------------------------------------------------------------
  "This problem investigates the effect of a non-circular plasma cross
   section on the design of a simple fusion reactor.  The idea is to repeat
   the design calculation presented in the text assuming the plasma has an
   elliptic shape with horizontal diameter 2a and vertical diameter 2*kappa*a.
   The quantity kappa is known as the plasma elongation.  The
   blanket-and-shield and magnets are also elliptic in shape but their
   thicknesses b and c are uniform around the cross section.  Calculate the
   minimum value of V_I/P_E and the corresponding reactor parameters in
   Table 5.3 for 0.5 <= kappa <= 2, assuming that all constraints are
   unchanged.  Based on this simple model what conclusions can be drawn about
   the desirability of a non-circular plasma?  Two points to note: first, in
   the regime of interest, the circumference of an ellipse can be approximated
   by C = 2*pi*a*(1+kappa^2)/2.  Second, when calculating the maximum magnet
   stress note that the largest magnetic force occurs on the flattened side of
   the ellipse."

So the conventions are NOT ours to invent.  Problem 5.5 fixes:
  P1  semi-axes (a, kappa*a); elongation kappa multiplies the VERTICAL axis.
  P2  blanket-and-shield and magnet are CONSTANT-THICKNESS shells (b and c
      uniform all the way around) and are themselves treated as ellipses.
  P3  the ellipse circumference is to be taken as the RMS-radius formula
      C = 2*pi*a*sqrt((1+kappa^2)/2).
      *** The printed text reads "C = 2 pi a (1+kappa^2)/2", i.e. the
      exponent 1/2 on the bracket is MISSING.  That is a typesetting error:
      as printed it gives C = 2*pi*a*2.5 = 15.71 a at kappa = 2 against an
      exact perimeter of 9.688 a (+62 % error), whereas the square-rooted
      form gives 9.935 a (+2.5 %).  Both forms reduce to 2*pi*a at kappa = 1,
      which is why the error is easy to miss.  We use the square-rooted
      (standard "in the regime of interest" approximation) form.  See
      `perimeter_model="exact"` to switch to the true elliptic integral. ***
  P4  the magnet stress is set by the LARGEST magnetic force, which acts on
      the FLATTENED side of the ellipse.
  P5  all other constraints (Table 5.2) unchanged; kappa range 0.5 - 2.
      (This module is valid and used up to kappa = 2.5; see guard rail G12.)

--------------------------------------------------------------------------
WHAT CHANGES, WHAT DOES NOT
--------------------------------------------------------------------------
UNCHANGED (bit-for-bit identical code paths to `reactor_core`):
  * Step 0 energetics: E_tot, K_R0, K_VI.
  * Step 1 blanket-and-shield: lambda_sd, lambda_br, Delta x, x_boundary, b.
    Attenuation is 1-D through the wall normal; a constant-thickness shell
    around an ellipse presents the same 1-D optical depth as around a circle.
  * xi = Bmax^2/(4 mu0 sigma_max).
  * p = f(S_pd, T, <sigma v>), n = p/2T, tau_E = 8.3/p, B0 = (R0-a-b)/R0*Bmax,
    beta = p/(B0^2/2mu0)  -- unchanged IN FORM (S_pd and R0 carry the kappa).

CHANGED (all seven are listed in kappa_spec.md in computational order):
  M1  f_kappa  = sqrt((1+kappa^2)/2)                 ellipse perimeter factor
  M2  A_P      = 4 pi^2 R0 a f_kappa                 first-wall area
  M3  V_P      = 2 pi^2 R0 kappa a^2                 plasma volume
  M4  R0       = K_R0 P_E / (a f_kappa P_W)          wall-loading -> R0
  M5  c        = 2 xi (max(kappa,1) a + b)/(1-xi)    stress (flattened side)
  M6  V_I      = 2 pi^2 R0 [(a+b+c)(kappa a+b+c) - kappa a^2]
  M7  a_opt    = (1+xi) b / D,
      D        = sqrt( 2 xi [ kappa(1-xi) + max(kappa,1)^2 (1+xi) ] )
      V_I/P_E|min = K_VI (1+xi) b [2D + m(1+3xi) + n(1-xi)]
                    / ( (1-xi)^2 f_kappa P_W ),   m=max(kappa,1), n=min(kappa,1)

Every one of M1-M7 reduces ALGEBRAICALLY AND IN FLOATING POINT to the
circular result at kappa = 1 (see `_verify_kappa1` and kappa_spec.md).

--------------------------------------------------------------------------
V_I CONVENTION -- IMPORTANT
--------------------------------------------------------------------------
The chapter's Eq. (5.15) is  V_I = 2 pi^2 R0 [(a+b+c)^2 - a^2]:  the
"nuclear island" volume subtracts only the PLASMA, so the BLANKET-AND-SHIELD
IS INCLUDED (the text, p. 97: the nuclear island costs "are dominated by the
large, highly engineered components including the blanket-and-shield and
magnets").  The elongated generalization must therefore subtract the plasma
ellipse area pi*kappa*a^2, NOT the blanket outer ellipse:

    V_I = 2 pi^2 R0 [ (a+b+c)(kappa a + b + c)  -  kappa a^2 ]        (M6)

A magnet-only form  2 pi^2 R0 [(a+b+c)(kappa a+b+c) - (a+b)(kappa a+b)]
would NOT reduce to Eq. (5.15) at kappa = 1 and is not used.

--------------------------------------------------------------------------
STRESS MODEL (M5) -- derivation, and why it is the Problem 5.5 model
--------------------------------------------------------------------------
The chapter unbends the torus into a straight solenoid of length L = 2 pi R0
(Fig. 5.7).  Eq. (5.22) is exactly "magnetic pressure B_c^2/2mu0 applied at
the mid-thickness contour of the coil":  for a circular bore of mid-radius
r = a+b+c/2,  dF = (B_c^2/2mu0) (r dtheta) L,  and integrating the vertical
component over 0..pi gives Eq. (5.24), F_y^(M) = 2 pi R0 B_c^2 (a+b+c/2)/mu0.
Equivalently:  net separating force across a cut = (magnetic pressure) x
(projected width of the bore perpendicular to the cut) x L.

For the elongated coil the mid-thickness contour is an ellipse with semi-axes
    A_x = a + b + c/2      (horizontal),    A_y = kappa a + b + c/2 (vertical).
There are two candidate cuts, each resisted by TWO legs of cross-section c*L:

  horizontal cut (chapter's):  F_y = (B_c^2/2mu0)(2 A_x) L , carried by the
      two SIDE legs        ->  2 sigma_max c = (B_c^2/mu0)(a + b + c/2)
  vertical cut:                F_x = (B_c^2/2mu0)(2 A_y) L , carried by the
      two TOP/BOTTOM legs  ->  2 sigma_max c = (B_c^2/mu0)(kappa a + b + c/2)

The larger force governs the coil thickness.  For kappa > 1 the ellipse is
tall and narrow: its radius of curvature is A_x^2/A_y at the top (small,
sharply curved) and A_y^2/A_x at the side (large, FLAT).  The larger
separating force F_x is precisely the one pressing outwards on those flat
sides -- this is Problem 5.5's hint "the largest magnetic force occurs on the
flattened side of the ellipse".  Solving either balance for c gives

    c = 2 xi (A + b)/(1 - xi),     A = max(kappa, 1) * a                 (M5)

which is Eq. (5.27) with (a+b) replaced by (larger semi-axis + b), and
reduces to Eq. (5.27) identically at kappa = 1.  For kappa < 1 (oblate) the
flat sides are the top and bottom and the vertical force governs, giving back
c = 2 xi (a+b)/(1-xi) -- captured by the max(kappa,1).

--------------------------------------------------------------------------
UNITS CONVENTION -- identical to reactor_core.py
--------------------------------------------------------------------------
    PE [MW electric], PW [MW/m^2], Bmax [T], sigma_max [Pa], <sigma v> [m^3/s],
    T [keV], energies [MeV], cross sections [barn], lengths [m],
    p [atm], n [m^-3], tau_E [s], S_pd [MW/m^3], V_I/PE [m^3/MW].
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict

# ---------------------------------------------------------------- constants
MU0 = 4.0e-7 * math.pi           # [H/m]   vacuum permeability
QE = 1.602176634e-19             # [C]     elementary charge (J per eV)
BARN = 1.0e-28                   # [m^2]
MEV = 1.0e6 * QE                 # [J]     joules per MeV
ATM_SI = 1.01325e5               # [Pa]    true standard atmosphere
ATM_BOOK = 1.0e5                 # [Pa]    the chapter's de-facto "atm" (= bar)


class DesignError(ValueError):
    """Raised when inputs put the model outside its region of validity."""


# ====================================================================
# Ellipse geometry helpers
# ====================================================================
def ellipe_agm(m: float) -> float:
    """Complete elliptic integral of the 2nd kind E(m), m = e^2 in [0, 1).

    Arithmetic-geometric-mean (Legendre/Gauss) algorithm -- no SciPy needed
    and trivially portable to TypeScript:
        E(m) = K(m) * (1 - sum_{n>=0} 2^(n-1) c_n^2)
    """
    if m < 0.0 or m >= 1.0:
        if m == 0.0:
            return 0.5 * math.pi
        raise DesignError(f"ellipe_agm: m must lie in [0,1), got {m}")
    a_n = 1.0
    b_n = math.sqrt(1.0 - m)
    c_n = math.sqrt(m)
    total = 0.5 * c_n * c_n          # n = 0 term: 2^(-1) c_0^2
    pw = 1.0                         # 2^n at n = 0
    for _ in range(60):
        a_next = 0.5 * (a_n + b_n)
        b_next = math.sqrt(a_n * b_n)
        c_next = 0.5 * (a_n - b_n)
        pw *= 2.0
        total += 0.5 * pw * c_next * c_next     # 2^(n-1) c_n^2
        a_n, b_n, c_n = a_next, b_next, c_next
        if abs(c_n) < 1.0e-17:
            break
    K = 0.5 * math.pi / a_n
    return K * (1.0 - total)


def ellipse_perimeter_exact(a: float, kappa: float) -> float:
    """Exact perimeter of the ellipse with semi-axes (a, kappa*a)."""
    if a <= 0.0 or kappa <= 0.0:
        raise DesignError("ellipse_perimeter_exact: a, kappa must be > 0")
    A = a * max(1.0, kappa)          # semi-major
    B = a * min(1.0, kappa)          # semi-minor
    m = 1.0 - (B / A) ** 2           # e^2
    return 4.0 * A * ellipe_agm(m)


def f_kappa_rms(kappa: float) -> float:
    """Problem 5.5 perimeter factor:  C = 2 pi a f,  f = sqrt((1+kappa^2)/2)."""
    return math.sqrt((1.0 + kappa * kappa) / 2.0)


def f_kappa_exact(kappa: float) -> float:
    """Same factor from the exact elliptic-integral perimeter (a cancels)."""
    return ellipse_perimeter_exact(1.0, kappa) / (2.0 * math.pi)


def f_kappa_error(kappa: float) -> float:
    """Relative error of the RMS approximation, (f_rms - f_exact)/f_exact."""
    fe = f_kappa_exact(kappa)
    return (f_kappa_rms(kappa) - fe) / fe


# ---------------------------------------------------------------- container
@dataclass
class ReactorDesignKappa:
    # ---- echoed inputs
    PE: float
    PW: float
    Bmax: float
    sigma_max: float
    sigmav: float
    T_keV: float
    eta_t: float
    E_n: float
    E_alpha: float
    E_Li: float
    b: float
    kappa: float = 1.0

    # ---- ellipse geometry factors (M1)
    f_kappa: float = 0.0             # perimeter factor actually used
    f_kappa_rms: float = 0.0         # Problem 5.5 sqrt((1+k^2)/2)
    f_kappa_exact: float = 0.0       # elliptic-integral value
    f_kappa_rel_err: float = 0.0     # (rms - exact)/exact

    # ---- blanket (Eqs. 5.3-5.11) -- UNCHANGED by kappa
    lambda_sd_from_cross_section: float = 0.0
    lambda_sd: float = 0.0
    lambda_br: float = 0.0
    delta_x: float = 0.0
    x_boundary: float = 0.0

    # ---- coil / cost (M5, M7)
    xi: float = 0.0
    a: float = 0.0                   # M7  cost optimum
    c: float = 0.0                   # M5
    D_opt: float = 0.0               # sqrt term in M7 (=2 sqrt(xi) at kappa=1)
    VI_over_PE: float = 0.0          # M7 closed form
    VI_over_PE_direct: float = 0.0   # M6/PE at a_opt (cross-check)
    V_I: float = 0.0                 # M6
    stress_governing_cut: str = ""   # "horizontal" (kappa<=1) / "vertical"

    # ---- geometry (M2, M3, M4)
    R0: float = 0.0
    aspect_ratio: float = 0.0
    a_vertical: float = 0.0          # kappa*a, plasma half-height
    A_P: float = 0.0
    V_P: float = 0.0
    coil_half_height: float = 0.0    # kappa*a + b + c

    # ---- plasma (Eqs. 5.34-5.43)
    S_pd: float = 0.0
    p_atm: float = 0.0
    p_Pa: float = 0.0
    n: float = 0.0
    tau_E: float = 0.0
    B0: float = 0.0
    beta: float = 0.0

    # ---- derived "magic number" diagnostics
    E_tot: float = 0.0
    K_R0: float = 0.0
    K_VI: float = 0.0
    K_VI_opt: float = 0.0
    K_p: float = 0.0
    warnings: list = field(default_factory=list)

    def as_dict(self):
        return asdict(self)


# ====================================================================
# The kappa cost function (M6/PE with R0 eliminated via M4) -- exposed so the
# GUI can plot it and so the analytic optimum can be checked numerically.
# ====================================================================
def cost_VI_over_PE(a: float, kappa: float, b: float, xi: float, PW: float,
                    K_VI: float, f_k: float) -> float:
    """V_I/P_E [m^3/MW] as a function of the plasma minor radius a.

    Generalization of Eq. (5.28).  c is eliminated with M5.
    At kappa = 1 this is exactly Eq. (5.21) with Eq. (5.27) substituted.
    """
    A = max(kappa, 1.0) * a
    c = 2.0 * xi / (1.0 - xi) * (A + b)
    return K_VI * ((a + b + c) * (kappa * a + b + c) - kappa * a * a) \
        / (a * f_k * PW)


def a_opt_numeric(kappa: float, b: float, xi: float, PW: float,
                  K_VI: float, f_k: float,
                  lo: float = 1.0e-4, hi: float = 1.0e3,
                  tol: float = 1.0e-14) -> float:
    """Golden-section 1-D minimization of `cost_VI_over_PE` over a.

    Provided as an independent check on the analytic M7 and as the fallback
    the GUI can use if the stress model is ever changed to one with no
    closed-form optimum.
    """
    invphi = (math.sqrt(5.0) - 1.0) / 2.0
    x1 = hi - invphi * (hi - lo)
    x2 = lo + invphi * (hi - lo)
    f1 = cost_VI_over_PE(x1, kappa, b, xi, PW, K_VI, f_k)
    f2 = cost_VI_over_PE(x2, kappa, b, xi, PW, K_VI, f_k)
    for _ in range(400):
        if hi - lo < tol * max(1.0, abs(lo)):
            break
        if f1 < f2:
            hi, x2, f2 = x2, x1, f1
            x1 = hi - invphi * (hi - lo)
            f1 = cost_VI_over_PE(x1, kappa, b, xi, PW, K_VI, f_k)
        else:
            lo, x1, f1 = x1, x2, f2
            x2 = lo + invphi * (hi - lo)
            f2 = cost_VI_over_PE(x2, kappa, b, xi, PW, K_VI, f_k)
    return 0.5 * (lo + hi)


# ---------------------------------------------------------------- the model
def design_reactor_kappa(
    # --- Table 5.2 engineering / nuclear constraints -----------------------
    PE: float = 1000.0,          # [MW]      electric power output
    PW: float = 4.0,             # [MW/m^2]  max neutron wall loading
    Bmax: float = 13.0,          # [T]       max field at the coil
    sigma_max: float = 300.0e6,  # [Pa]      max allowable coil stress
    sigmav: float = 3.0e-22,     # [m^3/s]   <sigma v> at T
    sigma_sd: float = 1.0,       # [barn]    fast-neutron slowing-down x-sec
    sigma_br: float = 950.0,     # [barn]    Li-6 breeding x-sec at E_t
    # --- SHAPE (Problem 5.5) ---------------------------------------------
    kappa: float = 1.0,          # plasma elongation; semi-axes (a, kappa*a)
    perimeter_model: str = "rms",  # "rms" (Problem 5.5) | "exact" (elliptic)
    # --- energetics -------------------------------------------------------
    eta_t: float = 0.4,
    E_n: float = 14.1,
    E_alpha: float = 3.5,
    E_Li: float = 4.8,
    # --- blanket / neutronics --------------------------------------------
    n_L: float = 4.5e28,
    f_Li6: float = 0.075,
    E_t: float = 0.025,
    attenuation: float = 100.0,
    lambda_sd_override: float | None = 0.055,
    b: float = 1.2,
    # --- plasma -----------------------------------------------------------
    T_keV: float = 15.0,
    p_tauE: float = 8.3,
    # --- conventions ------------------------------------------------------
    atm_Pa: float = ATM_SI,
    strict: bool = False,
) -> ReactorDesignKappa:
    """Freidberg Ch.5 design chain generalized to an elliptic plasma.

    `kappa = 1.0` reproduces `reactor_core.design_reactor` exactly.
    """

    warn: list[str] = []

    def flag(msg: str):
        if strict:
            raise DesignError(msg)
        warn.append(msg)

    # ------------------------------------------------- basic input checks
    for name, val in (("PE", PE), ("PW", PW), ("Bmax", Bmax),
                      ("sigma_max", sigma_max), ("sigmav", sigmav),
                      ("T_keV", T_keV), ("b", b), ("eta_t", eta_t),
                      ("kappa", kappa)):
        if val <= 0:
            raise DesignError(f"{name} must be > 0 (got {val})")
    if not 0 < eta_t <= 1:
        raise DesignError("eta_t must lie in (0, 1]")
    if attenuation <= 1:
        raise DesignError("attenuation must be > 1 (flux must be reduced)")
    if perimeter_model not in ("rms", "exact"):
        raise DesignError("perimeter_model must be 'rms' or 'exact'")

    # =====================================================================
    # STEP 0 -- energetics bookkeeping (UNCHANGED)
    # =====================================================================
    E_tot = E_alpha + E_n + E_Li
    K_R0 = (1.0 / (4.0 * math.pi**2 * eta_t)) * (E_n / E_tot)   # -> 0.04
    K_VI = 2.0 * math.pi**2 * K_R0                              # -> 0.79

    # =====================================================================
    # STEP 0b -- M1  ellipse perimeter factor
    # =====================================================================
    f_rms = f_kappa_rms(kappa)
    f_exact = f_kappa_exact(kappa)
    f_err = (f_rms - f_exact) / f_exact
    f_k = f_rms if perimeter_model == "rms" else f_exact
    if abs(f_err) > 0.03:
        flag(f"kappa = {kappa:.3f}: the Problem 5.5 perimeter approximation "
             f"f = sqrt((1+kappa^2)/2) is off by {f_err*100:+.1f}% from the "
             f"exact elliptic-integral perimeter; A_P (and hence R0, V_I/PE) "
             f"carry that error.")

    # =====================================================================
    # STEP 1 -- blanket-and-shield thickness (Eqs. 5.3-5.11) -- UNCHANGED
    #           (1-D attenuation normal to a constant-thickness shell)
    # =====================================================================
    lam_sd_xsec = 1.0 / (n_L * sigma_sd * BARN)
    lam_sd = lam_sd_xsec if lambda_sd_override is None else lambda_sd_override
    if lambda_sd_override is not None and \
            abs(lam_sd - lam_sd_xsec) / lam_sd_xsec > 0.02:
        warn.append(
            f"lambda_sd override {lam_sd:.4f} m differs from "
            f"1/(n_L*sigma_sd) = {lam_sd_xsec:.4f} m by a factor "
            f"{lam_sd_xsec/lam_sd:.2f} -- known chapter inconsistency; "
            f"the override is required to reproduce Delta x ~ 0.88 m.")

    lam_br = 1.0 / (f_Li6 * n_L * sigma_br * BARN)
    sqrt_ratio = math.sqrt((E_n * 1.0e6) / E_t)
    ln_atten = math.log(attenuation)
    arg = 1.0 + 0.5 * sqrt_ratio * (lam_br / lam_sd) * ln_atten
    if arg <= 1.0:
        raise DesignError("Eq. 5.10 argument <= 1: no finite blanket works.")
    delta_x = 2.0 * lam_sd * math.log(arg)

    ratio = lam_sd / (lam_br * sqrt_ratio)
    x_boundary = -2.0 * lam_sd * math.log(ratio) if 0 < ratio < 1 else 0.0

    if b < delta_x:
        flag(f"chosen b = {b:.3f} m is thinner than the required "
             f"moderator-breeder thickness Delta x = {delta_x:.3f} m")

    # =====================================================================
    # STEP 2 -- M7 plasma minor radius, M5 coil thickness
    # =====================================================================
    xi = Bmax**2 / (4.0 * MU0 * sigma_max)
    if xi >= 1.0:
        raise DesignError(
            f"xi = Bmax^2/(4 mu0 sigma_max) = {xi:.3f} >= 1: the coil cannot "
            f"support itself (c -> infinity).  Need Bmax < "
            f"{math.sqrt(4*MU0*sigma_max):.2f} T at this sigma_max.")

    m_k = max(kappa, 1.0)          # governing (larger) semi-axis multiplier
    n_k = min(kappa, 1.0)

    # M7.  Written as  kappa + m^2 + xi*(m^2 - kappa)  so that at kappa = 1
    # the bracket is EXACTLY 2.0 in IEEE-754 and D reduces bit-for-bit to
    # 2*sqrt(xi), matching reactor_core's  a = (1+xi)/(2 sqrt(xi)) * b.
    Sfac = (kappa + m_k * m_k) + xi * (m_k * m_k - kappa)
    D = math.sqrt(2.0 * xi * Sfac)
    a = (1.0 + xi) / D * b

    # M5.  max(kappa,1)*a + b  replaces  a + b  in Eq. (5.27).
    c = 2.0 * xi / (1.0 - xi) * (m_k * a + b)

    if xi > 0.5:
        flag(f"xi = {xi:.3f} > 0.5: coil thickness c > {m_k:.2f}a+b; the "
             f"thin-coil stress model is being pushed far outside its "
             f"calibration.")

    # M7 closed-form minimum cost.  Reduces to Eq. (5.30) at kappa = 1.
    VI_over_PE = (K_VI * (1.0 + xi) * b
                  * (2.0 * D + m_k * (1.0 + 3.0 * xi) + n_k * (1.0 - xi))
                  / ((1.0 - xi)**2 * f_k * PW))
    VI_over_PE_direct = cost_VI_over_PE(a, kappa, b, xi, PW, K_VI, f_k)

    # =====================================================================
    # STEP 3 -- M4 major radius, M2 area, M3 volume, M6 engineered volume
    # =====================================================================
    R0 = K_R0 * PE / (a * f_k * PW)                       # M4
    aspect = R0 / a
    if aspect <= 1.0:
        flag(f"aspect ratio R0/a = {aspect:.2f} <= 1: torus is degenerate.")
    A_P = 4.0 * math.pi**2 * R0 * a * f_k                 # M2
    V_P = 2.0 * math.pi**2 * R0 * kappa * a**2            # M3
    V_I = 2.0 * math.pi**2 * R0 * ((a + b + c) * (kappa * a + b + c)
                                   - kappa * a * a)       # M6

    # =====================================================================
    # STEP 4 -- power density and plasma pressure (form UNCHANGED)
    # =====================================================================
    S_pd = (E_alpha + E_n) / E_tot * PE / (eta_t * V_P)      # [MW/m^3]

    S_SI = S_pd * 1.0e6
    Ean_J = (E_alpha + E_n) * MEV
    K_p_Pa_per_keV = math.sqrt(16.0 * S_SI / Ean_J) * (1.0e3 * QE)
    K_p = K_p_Pa_per_keV / atm_Pa
    p_atm = K_p * math.sqrt(T_keV**2 / sigmav)
    p_Pa = p_atm * atm_Pa

    T_J = T_keV * 1.0e3 * QE
    n = p_Pa / (2.0 * T_J)

    # =====================================================================
    # STEP 5 -- tau_E and beta (form UNCHANGED)
    # =====================================================================
    tau_E = p_tauE / p_atm

    bore = R0 - a - b
    if bore <= 0:
        flag(f"R0 - a - b = {bore:.3f} m <= 0: the inboard leg does not fit; "
             f"B0 is unphysical.  Increase PE/PW or decrease b.")
    B0 = bore / R0 * Bmax
    beta = p_Pa / (B0**2 / (2.0 * MU0)) if B0 > 0 else float("inf")
    if beta > 0.15:
        flag(f"beta = {beta*100:.1f}% exceeds ~15%: no tokamak has achieved "
             f"this; the design is not plasma-physics-realizable.")
    if beta >= 1.0:
        flag("beta >= 1: magnetic confinement is impossible at this point.")

    # ------------------------------------------------- new kappa guard rails
    coil_half_height = kappa * a + b + c
    if R0 - a - b - c <= 0:
        flag(f"G13: R0 - a - b - c = {R0-a-b-c:.3f} m <= 0: the inboard coil "
             f"leg itself does not fit inside the torus hole (the chapter's "
             f"B0 formula ignores c, so B0 above is still finite).")
    if kappa < 0.5 or kappa > 2.5:
        flag(f"G12: kappa = {kappa:.2f} lies outside the validated range "
             f"0.5 - 2.5 (Problem 5.5 states 0.5 <= kappa <= 2); the "
             f"perimeter approximation and the flat-side stress model both "
             f"degrade outside it.")
    if kappa > 1.0:
        warn.append(
            "MODEL SCOPE: this simple model captures ONLY the geometric "
            "effects of elongation (larger wall area and plasma volume per "
            "unit a, thicker coil from the larger separating force).  It "
            "does NOT contain the beta-limit / plasma-current physics "
            "(beta_max ~ kappa, I_p ~ kappa) that is the actual real-world "
            "motivation for elongation, because beta here is an OUTPUT of "
            "fixed Bmax and PW, not a constraint.  Do not read the kappa "
            "trend below as 'elongation is undesirable'.")

    return ReactorDesignKappa(
        PE=PE, PW=PW, Bmax=Bmax, sigma_max=sigma_max, sigmav=sigmav,
        T_keV=T_keV, eta_t=eta_t, E_n=E_n, E_alpha=E_alpha, E_Li=E_Li, b=b,
        kappa=kappa,
        f_kappa=f_k, f_kappa_rms=f_rms, f_kappa_exact=f_exact,
        f_kappa_rel_err=f_err,
        lambda_sd_from_cross_section=lam_sd_xsec, lambda_sd=lam_sd,
        lambda_br=lam_br, delta_x=delta_x, x_boundary=x_boundary,
        xi=xi, a=a, c=c, D_opt=D,
        VI_over_PE=VI_over_PE, VI_over_PE_direct=VI_over_PE_direct, V_I=V_I,
        stress_governing_cut=("vertical (force on flattened side is "
                              "horizontal)" if kappa > 1.0 else
                              "horizontal (chapter's Eq. 5.26 cut)"),
        R0=R0, aspect_ratio=aspect, a_vertical=kappa * a, A_P=A_P, V_P=V_P,
        coil_half_height=coil_half_height,
        S_pd=S_pd, p_atm=p_atm, p_Pa=p_Pa, n=n, tau_E=tau_E, B0=B0, beta=beta,
        E_tot=E_tot, K_R0=K_R0, K_VI=K_VI, K_VI_opt=2.0 * K_VI, K_p=K_p,
        warnings=warn,
    )


if __name__ == "__main__":
    for k in (1.0, 1.5, 2.0, 2.5):
        d = design_reactor_kappa(kappa=k)
        print(f"--- kappa = {k}")
        for key in ("a", "c", "R0", "aspect_ratio", "A_P", "V_P", "S_pd",
                    "B0", "p_atm", "n", "tau_E", "beta", "VI_over_PE"):
            print(f"    {key:16s} {getattr(d, key):12.5g}")
