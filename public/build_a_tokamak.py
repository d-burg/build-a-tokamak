"""
build_a_tokamak.py -- scriptable backend of https://d-burg.github.io/build-a-tokamak/

The complete reactor-design chain of Freidberg, *Plasma Physics and Fusion
Energy* (Cambridge, 2007), Chapter 5, "Design of a simple magnetic fusion
reactor", including the Problem 5.5 elongation (kappa) generalization.
Single file, standard library only (no NumPy needed).

Quick start
-----------
    from build_a_tokamak import design_reactor, sigmav_dt

    d = design_reactor()                 # the chapter's Table 5.3 design point
    print(d.R0, d.a, d.B0, d.beta)      # 5.0 m, 1.99 m, 4.70 T, 0.0843

    d = design_reactor(Bmax=20.0, kappa=1.8)     # your own machine
    for w in d.warnings: print("WARNING:", w)

    sigmav_dt(15.0)                      # Bosch-Hale <sigma v>(T) [m^3/s]

    # parameter scan example
    for B in range(8, 26, 2):
        d = design_reactor(Bmax=float(B))
        print(f"Bmax={B:2d} T  a={d.a:5.2f} m  R0={d.R0:5.2f} m  "
              f"beta={100*d.beta:5.2f} %  VI/PE={d.VI_over_PE:5.2f} m^3/MW")

Conventions (identical to the web app; see the repo README for why)
-------------------------------------------------------------------
* 1 "atm" = 1e5 Pa (the chapter's atm is really a bar; required by its
  "300 MPa ~ 3000 atm" and the 8.4e-12 coefficient of Eq. 5.37).
* E_Li = 4.8 MeV, so E_tot = 22.4 MeV reproduces the chapter's 0.04 / 0.79 /
  1.58 shortcut coefficients exactly.
* lambda_sd = 0.055 m (the chapter's stated value; its own formula
  1/(n_L sigma_sd) gives 0.222 m -- a known factor-4 inconsistency in the
  text; 0.055 m is what reproduces Delta-x ~ 0.88 m).
* Default sigmav = 3e-22 m^3/s at T = 15 keV (the chapter's frozen value);
  pass sigmav=sigmav_dt(T_keV) to use Bosch-Hale instead.
* kappa = 1 reduces exactly to the chapter's circular design (Eqs. 5.27,
  5.29, 5.30); the elongated forms follow Problem 5.5's conventions, with
  its missing square root restored: C = 2 pi a sqrt((1+kappa^2)/2).

MIT licensed. The textbook is cited, not reproduced.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict

# ---------------------------------------------------------------- constants
MU0 = 4.0e-7 * math.pi           # [H/m]   vacuum permeability
QE = 1.602176634e-19             # [C]     elementary charge (J per eV)
BARN = 1.0e-28                   # [m^2]
MEV = 1.0e6 * QE                 # [J]     joules per MeV
ATM_BOOK = 1.0e5                 # [Pa]    the chapter's de-facto "atm" (= bar)
ATM_SI = 1.01325e5               # [Pa]    true standard atmosphere


class DesignError(ValueError):
    """Raised when inputs put the model outside its region of validity."""


# ====================================================================
# Bosch-Hale (1992) D-T reactivity  <sigma v>(T)
# H.-S. Bosch and G.M. Hale, Nucl. Fusion 32 (1992) 611, Table VII,
# T(d,n)4He, Eqs. (12)-(14).  Valid 0.2-100 keV, accuracy ~0.25%.
# ====================================================================
_BG_DT = 34.3827          # Gamow constant, keV^(1/2)
_MRC2_DT = 1124656.0      # reduced mass energy mr*c^2, keV
_C1, _C2, _C3 = 1.17302e-9, 1.51361e-2, 7.51886e-2
_C4, _C5, _C6, _C7 = 4.60643e-3, 1.35000e-2, -1.06750e-4, 1.36600e-5


def sigmav_dt(T_keV: float) -> float:
    """D-T Maxwellian reactivity [m^3/s] at temperature T [keV] (Bosch-Hale).

    sigmav_dt(15.0) = 2.740e-22, vs. the chapter's rounded 3e-22.
    T^2/<sigma v> (and hence the ignition p*tauE) is minimized at 13.54 keV,
    flat to 1% over 12.2-15.1 keV -- the chapter's "15 keV" is that minimum,
    rounded.
    """
    T = float(T_keV)
    if T <= 0.0:
        return 0.0
    num = T * (_C2 + T * (_C4 + T * _C6))
    den = 1.0 + T * (_C3 + T * (_C5 + T * _C7))
    theta = T / (1.0 - num / den)
    xi = (_BG_DT ** 2 / (4.0 * theta)) ** (1.0 / 3.0)
    cm3 = _C1 * theta * math.sqrt(xi / (_MRC2_DT * T ** 3)) * math.exp(-3.0 * xi)
    return 1.0e-6 * cm3


def p_tauE_ignition(T_keV: float, E_alpha_MeV: float = 3.5,
                    atm_Pa: float = ATM_BOOK) -> float:
    """Ignition threshold p*tau_E [atm s] for a 50-50 D-T plasma.

    Alpha heating = transport loss:  (1/4) n^2 <sv> E_alpha = 3 n T / tauE,
    with p = 2nT  =>  p tauE = 24 T^2 / (<sv> E_alpha).
    """
    T_J = T_keV * 1.0e3 * QE
    Ea_J = E_alpha_MeV * MEV
    return 24.0 * T_J ** 2 / (sigmav_dt(T_keV) * Ea_J) / atm_Pa


# ====================================================================
# Ellipse geometry helpers (Problem 5.5)
# ====================================================================
def _ellipe_agm(m: float) -> float:
    """Complete elliptic integral of the 2nd kind E(m), m = e^2 in [0, 1)."""
    if m == 0.0:
        return 0.5 * math.pi
    if m < 0.0 or m >= 1.0:
        raise DesignError(f"ellipe: m must lie in [0,1), got {m}")
    a_n, b_n, c_n = 1.0, math.sqrt(1.0 - m), math.sqrt(m)
    total = 0.5 * c_n * c_n
    pw = 1.0
    for _ in range(60):
        a_next, b_next, c_next = 0.5 * (a_n + b_n), math.sqrt(a_n * b_n), 0.5 * (a_n - b_n)
        pw *= 2.0
        total += 0.5 * pw * c_next * c_next
        a_n, b_n, c_n = a_next, b_next, c_next
        if abs(c_n) < 1.0e-17:
            break
    K = 0.5 * math.pi / a_n
    return K * (1.0 - total)


def f_kappa_rms(kappa: float) -> float:
    """Problem 5.5 perimeter factor: C = 2 pi a f, f = sqrt((1+kappa^2)/2).

    (The problem as printed drops the square root -- a typo, +62% at kappa=2.)
    """
    return math.sqrt((1.0 + kappa * kappa) / 2.0)


def f_kappa_exact(kappa: float) -> float:
    """Perimeter factor from the exact elliptic-integral perimeter."""
    A, B = max(1.0, kappa), min(1.0, kappa)
    return 4.0 * A * _ellipe_agm(1.0 - (B / A) ** 2) / (2.0 * math.pi)


# ---------------------------------------------------------------- container
@dataclass
class ReactorDesign:
    """Everything the design chain produces. `asdict(d)` gives a plain dict."""
    # echoed inputs
    PE: float; PW: float; Bmax: float; sigma_max: float; sigmav: float
    T_keV: float; b: float; kappa: float
    # ellipse factor
    f_kappa: float = 0.0
    # blanket (kappa-independent)
    lambda_sd: float = 0.0
    lambda_br: float = 0.0
    delta_x: float = 0.0
    x_boundary: float = 0.0
    # coil / cost
    xi: float = 0.0
    a: float = 0.0
    c: float = 0.0
    VI_over_PE: float = 0.0
    V_I: float = 0.0
    # geometry
    R0: float = 0.0
    aspect_ratio: float = 0.0
    a_vertical: float = 0.0
    A_P: float = 0.0
    V_P: float = 0.0
    # plasma
    S_pd: float = 0.0
    p_atm: float = 0.0
    p_Pa: float = 0.0
    n: float = 0.0
    tau_E: float = 0.0
    B0: float = 0.0
    beta: float = 0.0
    warnings: list = field(default_factory=list)

    def as_dict(self):
        return asdict(self)


def cost_VI_over_PE(a: float, kappa: float, b: float, xi: float, PW: float,
                    K_VI: float, f_k: float) -> float:
    """V_I/P_E [m^3/MW] vs minor radius a (generalized Eq. 5.28), for plotting."""
    A = max(kappa, 1.0) * a
    c = 2.0 * xi / (1.0 - xi) * (A + b)
    return K_VI * ((a + b + c) * (kappa * a + b + c) - kappa * a * a) / (a * f_k * PW)


# ---------------------------------------------------------------- the model
def design_reactor(
    # --- Table 5.2 engineering / nuclear constraints -----------------------
    PE: float = 1000.0,          # [MW]      electric power output
    PW: float = 4.0,             # [MW/m^2]  max neutron wall loading
    Bmax: float = 13.0,          # [T]       max field at the coil
    sigma_max: float = 300.0e6,  # [Pa]      max allowable coil stress
    sigmav: float = 3.0e-22,     # [m^3/s]   <sigma v> at T (chapter value;
    #                                        pass sigmav_dt(T_keV) for Bosch-Hale)
    # --- shape (Problem 5.5) ----------------------------------------------
    kappa: float = 1.0,          # plasma elongation; semi-axes (a, kappa*a)
    # --- energetics --------------------------------------------------------
    eta_t: float = 0.4,          # thermal conversion efficiency
    E_n: float = 14.1,           # [MeV] D-T neutron
    E_alpha: float = 3.5,        # [MeV] D-T alpha
    E_Li: float = 4.8,           # [MeV] blanket lithium reactions (chapter fit)
    # --- blanket / neutronics ---------------------------------------------
    n_L: float = 4.5e28,         # [m^-3] natural-lithium number density
    f_Li6: float = 0.075,        # Li-6 fraction
    sigma_br: float = 950.0,     # [barn] Li-6 thermal breeding cross-section
    E_t: float = 0.025,          # [eV]   thermal energy
    attenuation: float = 100.0,  # required flux reduction Gamma0/Gamma
    lambda_sd: float = 0.055,    # [m] slowing-down mean free path (chapter value)
    b: float = 1.2,              # [m] blanket-and-shield thickness (designer's choice)
    # --- plasma ------------------------------------------------------------
    T_keV: float = 15.0,
    p_tauE: float = 8.3,         # [atm s] ignition threshold (book Ch. 4)
    # --- conventions -------------------------------------------------------
    atm_Pa: float = ATM_BOOK,
) -> ReactorDesign:
    """Run the full Freidberg Ch. 5 design chain; returns a ReactorDesign.

    kappa = 1 (default) is exactly the chapter's circular design and
    reproduces Table 5.3 to within the book's own rounding.  Guard-rail
    violations are collected in .warnings (hard impossibilities raise
    DesignError).
    """
    warn: list[str] = []

    for name, val in (("PE", PE), ("PW", PW), ("Bmax", Bmax),
                      ("sigma_max", sigma_max), ("sigmav", sigmav),
                      ("T_keV", T_keV), ("b", b), ("kappa", kappa)):
        if val <= 0:
            raise DesignError(f"{name} must be > 0 (got {val})")
    if not 0 < eta_t <= 1:
        raise DesignError("eta_t must lie in (0, 1]")
    if attenuation <= 1:
        raise DesignError("attenuation must be > 1")

    # step 0 -- energetics
    E_tot = E_alpha + E_n + E_Li
    K_R0 = (1.0 / (4.0 * math.pi ** 2 * eta_t)) * (E_n / E_tot)   # -> 0.04
    K_VI = 2.0 * math.pi ** 2 * K_R0                              # -> 0.79
    f_k = f_kappa_rms(kappa)

    # step 1 -- blanket (Eqs. 5.3-5.11); 1-D, so kappa-independent
    lam_br = 1.0 / (f_Li6 * n_L * sigma_br * BARN)
    sqrt_ratio = math.sqrt((E_n * 1.0e6) / E_t)
    arg = 1.0 + 0.5 * sqrt_ratio * (lam_br / lambda_sd) * math.log(attenuation)
    delta_x = 2.0 * lambda_sd * math.log(arg)
    ratio = lambda_sd / (lam_br * sqrt_ratio)
    x_boundary = -2.0 * lambda_sd * math.log(ratio) if 0 < ratio < 1 else 0.0
    if b < delta_x:
        warn.append(f"b = {b:.3f} m is thinner than the required "
                    f"moderator-breeder depth Delta x = {delta_x:.3f} m")

    # step 2 -- coil thickness (Eq. 5.27 / M5) and cost-optimum a (Eq. 5.29 / M7)
    xi = Bmax ** 2 / (4.0 * MU0 * sigma_max)
    if xi >= 1.0:
        raise DesignError(
            f"xi = Bmax^2/(4 mu0 sigma_max) = {xi:.3f} >= 1: the coil cannot "
            f"support itself; need Bmax < {math.sqrt(4*MU0*sigma_max):.2f} T")
    m_k, n_k = max(kappa, 1.0), min(kappa, 1.0)
    Sfac = (kappa + m_k * m_k) + xi * (m_k * m_k - kappa)
    D = math.sqrt(2.0 * xi * Sfac)
    a = (1.0 + xi) / D * b
    c = 2.0 * xi / (1.0 - xi) * (m_k * a + b)
    if xi > 0.5:
        warn.append(f"xi = {xi:.3f} > 0.5: thin-coil stress model is being "
                    f"pushed outside its validity")
    VI_over_PE = (K_VI * (1.0 + xi) * b
                  * (2.0 * D + m_k * (1.0 + 3.0 * xi) + n_k * (1.0 - xi))
                  / ((1.0 - xi) ** 2 * f_k * PW))

    # step 3 -- major radius from wall loading (Eq. 5.20 / M4) and geometry
    R0 = K_R0 * PE / (a * f_k * PW)
    aspect = R0 / a
    if aspect <= 1.0:
        warn.append(f"aspect ratio R0/a = {aspect:.2f} <= 1: torus degenerate")
    A_P = 4.0 * math.pi ** 2 * R0 * a * f_k
    V_P = 2.0 * math.pi ** 2 * R0 * kappa * a ** 2
    V_I = 2.0 * math.pi ** 2 * R0 * ((a + b + c) * (kappa * a + b + c)
                                     - kappa * a * a)

    # step 4 -- power density, pressure, density (Eqs. 5.34-5.38)
    S_pd = (E_alpha + E_n) / E_tot * PE / (eta_t * V_P)      # [MW/m^3]
    S_SI = S_pd * 1.0e6
    Ean_J = (E_alpha + E_n) * MEV
    T_J = T_keV * 1.0e3 * QE
    p_Pa = math.sqrt(16.0 * S_SI / Ean_J) * (T_J / math.sqrt(sigmav))
    p_atm = p_Pa / atm_Pa
    n = p_Pa / (2.0 * T_J)

    # step 5 -- tau_E, B0, beta (Eqs. 5.39-5.43)
    tau_E = p_tauE / p_atm
    bore = R0 - a - b
    if bore <= 0:
        warn.append(f"R0 - a - b = {bore:.3f} m <= 0: inboard leg does not "
                    f"fit; B0 is unphysical (raise PE, lower PW, or thin b)")
    elif R0 - a - b - c <= 0:
        warn.append(f"R0 - a - b - c = {R0-a-b-c:.3f} m <= 0: the inboard "
                    f"coil leg itself does not fit (the chapter's B0 formula "
                    f"ignores c)")
    B0 = bore / R0 * Bmax
    beta = p_Pa / (B0 ** 2 / (2.0 * MU0)) if B0 > 0 else float("inf")
    if 0.15 < beta < 1.0:
        warn.append(f"beta = {beta*100:.1f}% exceeds ~15%: not "
                    f"plasma-physics-realizable")
    if beta >= 1.0:
        warn.append("beta >= 1: magnetic confinement impossible here")
    if kappa < 0.5 or kappa > 2.5:
        warn.append(f"kappa = {kappa:.2f} outside the validated range 0.5-2.5")
    if kappa != 1.0:
        warn.append("NOTE: this simple model captures only the geometric "
                    "effects of elongation; the beta-limit physics that "
                    "actually motivates kappa > 1 is not included")

    return ReactorDesign(
        PE=PE, PW=PW, Bmax=Bmax, sigma_max=sigma_max, sigmav=sigmav,
        T_keV=T_keV, b=b, kappa=kappa, f_kappa=f_k,
        lambda_sd=lambda_sd, lambda_br=lam_br,
        delta_x=delta_x, x_boundary=x_boundary,
        xi=xi, a=a, c=c, VI_over_PE=VI_over_PE, V_I=V_I,
        R0=R0, aspect_ratio=aspect, a_vertical=kappa * a, A_P=A_P, V_P=V_P,
        S_pd=S_pd, p_atm=p_atm, p_Pa=p_Pa, n=n, tau_E=tau_E, B0=B0, beta=beta,
        warnings=warn,
    )


# ---------------------------------------------------------------- demo
if __name__ == "__main__":
    print("=== Chapter design point (Table 5.3) ===")
    d = design_reactor()
    book = {"a": 2.0, "c": 0.79, "R0": 5.0, "A_P": 400, "V_P": 400,
            "S_pd": 4.9, "B0": 4.7, "p_atm": 7.2, "tau_E": 1.2,
            "beta": 0.082, "delta_x": 0.88, "xi": 0.11, "VI_over_PE": 1.2}
    for k, bv in book.items():
        print(f"  {k:11s} computed {getattr(d, k):9.4g}   book {bv:g}")
    print(f"  n           computed {d.n:9.4g}   book 1.5e20")
    print("  (differences <= ~7% are the book's own rounding)")

    print("\n=== Elongation scan ===")
    for k in (1.0, 1.5, 2.0):
        d = design_reactor(kappa=k)
        print(f"  kappa={k}: a={d.a:.3f} c={d.c:.3f} R0={d.R0:.3f} "
              f"A_P={d.A_P:.1f} beta={100*d.beta:.2f}% VI/PE={d.VI_over_PE:.3f}")

    print("\n=== Bosch-Hale reactivity ===")
    print(f"  sigmav_dt(15) = {sigmav_dt(15.0):.4g} m^3/s (chapter: 3e-22)")
    d = design_reactor(sigmav=sigmav_dt(15.0))
    print(f"  with Bosch-Hale at 15 keV: p = {d.p_atm:.3f} atm, "
          f"beta = {100*d.beta:.2f}%")
