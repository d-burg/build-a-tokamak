"""
reactor_core.py -- Reference implementation of the design chain in

    J. P. Freidberg, *Plasma Physics and Fusion Energy*, Cambridge (2007),
    Chapter 5, "Design of a simple magnetic fusion reactor" (pp. 85-108).

Everything is implemented from the GENERAL SYMBOLIC equations.  None of the
chapter's rounded numerical shortcut coefficients (0.04, 0.79, 1.58, 8.4e-12,
...) are hard-coded; each is instead *derived* and returned as a diagnostic so
that the GUI can display "chapter coefficient vs. actual coefficient".

--------------------------------------------------------------------------
PROVENANCE OF EVERY CHAPTER "MAGIC NUMBER"
--------------------------------------------------------------------------

Let  E_tot == E_alpha + E_n + E_Li   (total recoverable energy per D-T
reaction, including the Li-6 breeding reaction Q-value).

  * 0.04  in Eq. (5.20),  R0 = 0.04 * PE / (a * PW)  [m]
        symbolic:  K_R0 = (1 / (4 pi^2 eta_t)) * E_n / E_tot
        with eta_t = 0.4, E_n = 14.1 MeV, E_tot = 22.4 MeV:
            K_R0 = (1/(4*pi^2*0.4)) * (14.1/22.4) = 0.063326 * 0.629464
                 = 0.039864  ->  rounds to 0.04
        Inverting: the coefficient is EXACTLY 0.04 when
            E_tot = E_n / (4 pi^2 * eta_t * 0.04) = 22.322 MeV
        i.e. E_Li = 22.322 - 17.6 = 4.72 MeV.

  * 0.79  in Eq. (5.21),  (V_I/PE) = 0.79 * ((a+b+c)^2 - a^2) / (a PW)
        symbolic:  K_VI = 2 pi^2 * K_R0 = E_n / (2 eta_t E_tot)
            = 14.1 / (2*0.4*22.4) = 0.786830  ->  rounds to 0.79
        Exactly 0.79 when E_tot = E_n/(2*eta_t*0.79) = 22.31 MeV
        (E_Li = 4.71 MeV).  Same E_Li as above, as it must be, since
        K_VI = 2 pi^2 K_R0 identically.

    ==> BOTH chapter coefficients are reproduced by
            E_Li = 4.8 MeV   (Li6 + n -> T + alpha + 4.8 MeV)
            E_tot = 3.5 + 14.1 + 4.8 = 22.4 MeV
        which is also the "about 22 MeV of thermal energy per fusion
        reaction" quoted in the chapter's Problem 5.4.  The exact-fit value
        is E_Li = 4.72 MeV; the difference is pure rounding (0.3%).

  * 1.58  in Eq. (5.30),  V_I/PE = 1.58 (1+xi)/(1-xi^(1/2))^2 * b/PW
        symbolic:  2 * K_VI = 2 * 0.786830 = 1.57366  ->  rounds to 1.58.
        NOTE the denominator is (1 - xi^(1/2))^2, NOT (1 - xi)^2.  Verified
        against the printed page.  Back-substituting the optimum a into
        Eq. (5.28) gives
            V_I/PE = 2 K_VI (1+xi)(1+sqrt(xi))^2 b / ((1-xi)^2 PW)
                   = 2 K_VI (1+xi) b / ((1-sqrt(xi))^2 PW)
        the two forms being identical since (1-xi)^2 = (1-sqrt(xi))^2
        (1+sqrt(xi))^2.  Using (1-xi)^2 without the (1+sqrt(xi))^2 numerator
        factor would give 0.66 m^3/MW instead of the correct 1.19 m^3/MW.

  * 8.4e-12  in Eq. (5.37),  p[atm] = 8.4e-12 * sqrt(T_k^2 / <sigma v>)
        symbolic:  p = sqrt(16 * S_pd / (E_alpha + E_n)) * sqrt(T^2/<sigma v>)
        in SI (S_pd in W/m^3, energies in J, T in J -> p in Pa).  Converting
        T to keV and p to atm:
            K_p = sqrt(16 * S_pd / (E_alpha+E_n)[J]) * (1.602e-16 J/keV) / atm
        With S_pd = 4.9e6 W/m^3, E_alpha+E_n = 17.6 MeV = 2.8198e-12 J:
            K_p = 8.448e-7 Pa -> /1.0e5      = 8.45e-12  (rounds to 8.4e-12)
                              -> /1.01325e5  = 8.34e-12  (rounds to 8.3e-12)
        ==> the printed 8.4e-12 uses 1 atm = 1e5 Pa (i.e. a *bar*), which is
        the same convention the chapter uses for "300 MPa ~ 3000 atm".
        *** K_p IS NOT A UNIVERSAL CONSTANT: it embeds the design's own
        power density S_pd = 4.9 MW/m^3 and must be recomputed for every
        off-nominal design point. ***

  * lambda_sd ~ 0.055 m (Sec. 5.5.2).  *** CHAPTER INCONSISTENCY ***
        The stated relation lambda_sd = 1/(n_L sigma_sd) with
        n_L = 4.5e28 m^-3 and sigma_sd = 1 barn gives 0.2222 m, NOT 0.055 m
        (factor of 4).  Only lambda_sd = 0.055 m reproduces BOTH quoted
        results, Delta x ~ 0.88 m (Eq. 5.10) and the moderator/breeder
        boundary x ~ 0.79 m.  Using 0.2222 m gives Delta x = 2.95 m.
        This module therefore exposes `lambda_sd_override` (default 0.055,
        the chapter value) and ALSO returns `lambda_sd_from_cross_section`
        so the GUI can show the discrepancy honestly.

--------------------------------------------------------------------------
UNITS CONVENTION
--------------------------------------------------------------------------
Inputs/outputs use the chapter's practical units:
    PE [MW electric], PW [MW/m^2], Bmax [T], sigma_max [Pa], <sigma v> [m^3/s],
    T [keV], energies [MeV], cross sections [barn], lengths [m],
    p [atm], n [m^-3], tau_E [s], S_pd [MW/m^3], V_I/PE [m^3/MW].
`atm_Pa` selects the atmosphere definition (see guard-rail notes).
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


# ---------------------------------------------------------------- container
@dataclass
class ReactorDesign:
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

    # ---- blanket (Eqs. 5.3-5.11)
    lambda_sd_from_cross_section: float = 0.0   # 1/(n_L sigma_sd)
    lambda_sd: float = 0.0                      # value actually used
    lambda_br: float = 0.0                      # 1/(f6 n_L sigma_br)
    delta_x: float = 0.0                        # Eq. 5.10, moderator+breeder
    x_boundary: float = 0.0                     # where lambda_sd = lambda(E)

    # ---- coil / cost (Eqs. 5.27-5.31)
    xi: float = 0.0                             # Bmax^2/(4 mu0 sigma_max)
    a: float = 0.0                              # Eq. 5.29
    c: float = 0.0                              # Eq. 5.30
    VI_over_PE: float = 0.0                     # Eq. 5.30 (corrected)
    V_I: float = 0.0                            # engineered volume, Eq. 5.15

    # ---- geometry (Eqs. 5.20, 5.32, 5.33)
    R0: float = 0.0
    aspect_ratio: float = 0.0
    A_P: float = 0.0
    V_P: float = 0.0

    # ---- plasma (Eqs. 5.34-5.43)
    S_pd: float = 0.0                           # (Pa+Pn)/VP  [MW/m^3]
    p_atm: float = 0.0
    p_Pa: float = 0.0
    n: float = 0.0
    tau_E: float = 0.0
    B0: float = 0.0
    beta: float = 0.0

    # ---- derived "magic number" diagnostics
    E_tot: float = 0.0
    K_R0: float = 0.0        # chapter 0.04
    K_VI: float = 0.0        # chapter 0.79
    K_VI_opt: float = 0.0    # chapter 1.58
    K_p: float = 0.0         # chapter 8.4e-12
    warnings: list = field(default_factory=list)

    def as_dict(self):
        return asdict(self)


# ---------------------------------------------------------------- the model
def design_reactor(
    # --- Table 5.2 engineering / nuclear constraints -----------------------
    PE: float = 1000.0,          # [MW]      electric power output
    PW: float = 4.0,             # [MW/m^2]  max neutron wall loading
    Bmax: float = 13.0,          # [T]       max field at the coil
    sigma_max: float = 300.0e6,  # [Pa]      max allowable coil stress
    sigmav: float = 3.0e-22,     # [m^3/s]   <sigma v> at T
    sigma_sd: float = 1.0,       # [barn]    fast-neutron slowing-down x-sec
    sigma_br: float = 950.0,     # [barn]    Li-6 breeding x-sec at E_t
    # --- energetics -------------------------------------------------------
    eta_t: float = 0.4,          # thermal conversion efficiency
    E_n: float = 14.1,           # [MeV] D-T neutron
    E_alpha: float = 3.5,        # [MeV] D-T alpha
    E_Li: float = 4.8,           # [MeV] Li6(n,alpha)T Q-value  (see header)
    # --- blanket / neutronics --------------------------------------------
    n_L: float = 4.5e28,         # [m^-3] natural lithium number density
    f_Li6: float = 0.075,        # Li-6 fraction of natural Li
    E_t: float = 0.025,          # [eV]  thermal energy
    attenuation: float = 100.0,  # Gamma_n0/Gamma_n required (flux reduction)
    lambda_sd_override: float | None = 0.055,   # [m] chapter value; None ->
                                                #     use 1/(n_L sigma_sd)
    b: float = 1.2,              # [m] CHOSEN blanket-and-shield thickness
    # --- plasma -----------------------------------------------------------
    T_keV: float = 15.0,         # [keV]
    p_tauE: float = 8.3,         # [atm s] ignition threshold
    # --- conventions ------------------------------------------------------
    atm_Pa: float = ATM_SI,      # Pa per "atm"; use 1e5 for chapter-exact
    strict: bool = False,        # raise instead of warn on guard-rail hits
) -> ReactorDesign:
    """Run the full Freidberg Ch.5 design chain.  See module docstring."""

    warn: list[str] = []

    def flag(msg: str):
        if strict:
            raise DesignError(msg)
        warn.append(msg)

    # ------------------------------------------------- basic input checks
    for name, val in (("PE", PE), ("PW", PW), ("Bmax", Bmax),
                      ("sigma_max", sigma_max), ("sigmav", sigmav),
                      ("T_keV", T_keV), ("b", b), ("eta_t", eta_t)):
        if val <= 0:
            raise DesignError(f"{name} must be > 0 (got {val})")
    if not 0 < eta_t <= 1:
        raise DesignError("eta_t must lie in (0, 1]")
    if attenuation <= 1:
        raise DesignError("attenuation must be > 1 (flux must be reduced)")

    # =====================================================================
    # STEP 0 -- energetics bookkeeping
    # =====================================================================
    E_tot = E_alpha + E_n + E_Li                      # MeV per D-T reaction
    K_R0 = (1.0 / (4.0 * math.pi**2 * eta_t)) * (E_n / E_tot)   # -> 0.04
    K_VI = 2.0 * math.pi**2 * K_R0                              # -> 0.79
    #      == E_n / (2 eta_t E_tot)

    # =====================================================================
    # STEP 1 -- blanket-and-shield thickness  (Eqs. 5.3 - 5.11)
    # =====================================================================
    # Eq. 5.3/5.4:  dE/dx + E/lambda_sd = 0  ->  E = E_n exp(-x/lambda_sd)
    lam_sd_xsec = 1.0 / (n_L * sigma_sd * BARN)
    lam_sd = lam_sd_xsec if lambda_sd_override is None else lambda_sd_override
    if lambda_sd_override is not None and \
            abs(lam_sd - lam_sd_xsec) / lam_sd_xsec > 0.02:
        warn.append(
            f"lambda_sd override {lam_sd:.4f} m differs from "
            f"1/(n_L*sigma_sd) = {lam_sd_xsec:.4f} m by a factor "
            f"{lam_sd_xsec/lam_sd:.2f} -- known chapter inconsistency; "
            f"the override is required to reproduce Delta x ~ 0.88 m.")

    # Eq. 5.6/5.7:  sigma = sigma_br (E_t/E)^1/2 ;  lambda = lambda_br (E/E_t)^1/2
    lam_br = 1.0 / (f_Li6 * n_L * sigma_br * BARN)

    # Eqs. 5.8-5.10.  E_f == E_n (fusion neutron birth energy), E_t in eV.
    sqrt_ratio = math.sqrt((E_n * 1.0e6) / E_t)       # (E_f/E_t)^(1/2)
    ln_atten = math.log(attenuation)                  # -ln(Gamma_n/Gamma_n0)
    arg = 1.0 + 0.5 * sqrt_ratio * (lam_br / lam_sd) * ln_atten
    if arg <= 1.0:
        raise DesignError("Eq. 5.10 argument <= 1: no finite blanket works.")
    delta_x = 2.0 * lam_sd * math.log(arg)            # Eq. 5.10

    # moderator/breeder boundary: where lambda_sd == lambda_br (E/E_t)^(1/2)
    ratio = lam_sd / (lam_br * sqrt_ratio)
    x_boundary = -2.0 * lam_sd * math.log(ratio) if 0 < ratio < 1 else 0.0

    if b < delta_x:
        flag(f"chosen b = {b:.3f} m is thinner than the required "
             f"moderator-breeder thickness Delta x = {delta_x:.3f} m")

    # =====================================================================
    # STEP 2 -- coil thickness and plasma minor radius (Eqs. 5.27 - 5.31)
    # =====================================================================
    xi = Bmax**2 / (4.0 * MU0 * sigma_max)            # Eq. 5.27 definition
    if xi >= 1.0:
        raise DesignError(
            f"xi = Bmax^2/(4 mu0 sigma_max) = {xi:.3f} >= 1: the coil cannot "
            f"support itself (c -> infinity).  Need Bmax < "
            f"{math.sqrt(4*MU0*sigma_max):.2f} T at this sigma_max.")
    if xi > 0.5:
        flag(f"xi = {xi:.3f} > 0.5: coil thickness c > a+b; the thin-coil "
             f"cost model is being pushed far outside its calibration.")

    sq = math.sqrt(xi)
    a = (1.0 + xi) / (2.0 * sq) * b                   # Eq. 5.29  (optimum)
    c = 2.0 * xi / (1.0 - xi) * (a + b)               # Eq. 5.27
    #   equivalently  c = sqrt(xi)(1+sqrt(xi))/(1-sqrt(xi)) * b   (Eq. 5.30)

    # Eq. 5.30 for V_I/PE.  Note (1 - sqrt(xi))^2 in the denominator.
    VI_over_PE = 2.0 * K_VI * (1.0 + xi) * b / ((1.0 - sq)**2 * PW)

    # =====================================================================
    # STEP 3 -- major radius and plasma geometry (Eqs. 5.20, 5.32, 5.33)
    # =====================================================================
    R0 = K_R0 * PE / (a * PW)                         # Eq. 5.20
    aspect = R0 / a
    if aspect <= 1.0:
        flag(f"aspect ratio R0/a = {aspect:.2f} <= 1: torus is degenerate.")
    A_P = 4.0 * math.pi**2 * R0 * a                   # Eq. 5.33
    V_P = 2.0 * math.pi**2 * R0 * a**2                # Eq. 5.33
    V_I = 2.0 * math.pi**2 * R0 * ((a + b + c)**2 - a**2)   # Eq. 5.15

    # =====================================================================
    # STEP 4 -- power density and plasma pressure (Eqs. 5.34 - 5.38)
    # =====================================================================
    # Eq. 5.34/5.35: (P_alpha+P_n)/V_P
    S_pd = (E_alpha + E_n) / E_tot * PE / (eta_t * V_P)      # [MW/m^3]

    # Eq. 5.37 in fully symbolic SI form, then converted.
    S_SI = S_pd * 1.0e6                                      # W/m^3
    Ean_J = (E_alpha + E_n) * MEV                            # J
    # p[Pa] = sqrt(16 S/(E_a+E_n)) * T[J] / sqrt(<sigma v>)
    K_p_Pa_per_keV = math.sqrt(16.0 * S_SI / Ean_J) * (1.0e3 * QE)
    K_p = K_p_Pa_per_keV / atm_Pa                            # -> 8.4e-12
    p_atm = K_p * math.sqrt(T_keV**2 / sigmav)
    p_Pa = p_atm * atm_Pa

    # p = 2 n T  ->  n
    T_J = T_keV * 1.0e3 * QE
    n = p_Pa / (2.0 * T_J)

    # =====================================================================
    # STEP 5 -- tau_E and beta (Eqs. 5.39 - 5.43)
    # =====================================================================
    tau_E = p_tauE / p_atm                            # Eq. 5.39

    # Eq. 5.41/5.42: B ~ 1/R, B = Bmax at R = R0 - a - b
    bore = R0 - a - b
    if bore <= 0:
        flag(f"R0 - a - b = {bore:.3f} m <= 0: the inboard leg does not fit; "
             f"B0 is unphysical.  Increase PE/PW or decrease b.")
    B0 = bore / R0 * Bmax                             # Eq. 5.42
    beta = p_Pa / (B0**2 / (2.0 * MU0)) if B0 > 0 else float("inf")  # Eq. 5.1/5.43
    if beta > 0.15:
        flag(f"beta = {beta*100:.1f}% exceeds ~15%: no tokamak has achieved "
             f"this; the design is not plasma-physics-realizable.")
    if beta >= 1.0:
        flag("beta >= 1: magnetic confinement is impossible at this point.")

    return ReactorDesign(
        PE=PE, PW=PW, Bmax=Bmax, sigma_max=sigma_max, sigmav=sigmav,
        T_keV=T_keV, eta_t=eta_t, E_n=E_n, E_alpha=E_alpha, E_Li=E_Li, b=b,
        lambda_sd_from_cross_section=lam_sd_xsec, lambda_sd=lam_sd,
        lambda_br=lam_br, delta_x=delta_x, x_boundary=x_boundary,
        xi=xi, a=a, c=c, VI_over_PE=VI_over_PE, V_I=V_I,
        R0=R0, aspect_ratio=aspect, A_P=A_P, V_P=V_P,
        S_pd=S_pd, p_atm=p_atm, p_Pa=p_Pa, n=n, tau_E=tau_E, B0=B0, beta=beta,
        E_tot=E_tot, K_R0=K_R0, K_VI=K_VI, K_VI_opt=2.0 * K_VI, K_p=K_p,
        warnings=warn,
    )


# ------------------------------------------------------------------ helpers
def eli_that_makes_coefficient_exact(target: float, eta_t: float = 0.4,
                                     E_n: float = 14.1, E_alpha: float = 3.5,
                                     which: str = "R0") -> tuple[float, float]:
    """Return (E_tot, E_Li) that makes the chapter coefficient exact.

    which='R0'  -> target is the 0.04 in Eq. 5.20
    which='VI'  -> target is the 0.79 in Eq. 5.21
    """
    if which == "R0":
        E_tot = E_n / (4.0 * math.pi**2 * eta_t * target)
    elif which == "VI":
        E_tot = E_n / (2.0 * eta_t * target)
    else:
        raise ValueError("which must be 'R0' or 'VI'")
    return E_tot, E_tot - E_alpha - E_n


if __name__ == "__main__":
    d = design_reactor()
    for k, v in d.as_dict().items():
        if isinstance(v, float):
            print(f"{k:32s} {v:14.6g}")
        else:
            print(f"{k:32s} {v}")
