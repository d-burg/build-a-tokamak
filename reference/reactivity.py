"""
Bosch-Hale (1992) parametrization of the Maxwellian-averaged D-T fusion reactivity.

Reference
---------
H.-S. Bosch and G.M. Hale, "Improved formulas for fusion cross-sections and thermal
reactivities", Nuclear Fusion 32 (1992) 611, Table VII (T(d,n)4He) and Eqs. (12)-(14).

Formulation
-----------
    theta = T / [ 1 - ( T*(C2 + T*(C4 + T*C6)) ) / ( 1 + T*(C3 + T*(C5 + T*C7)) ) ]
    xi    = ( B_G^2 / (4*theta) )^(1/3)
    <sigma v> = C1 * theta * sqrt( xi / (mr_c2 * T^3) ) * exp(-3*xi)      [cm^3/s]

with T in keV, B_G the Gamow constant in keV^(1/2), and mr_c2 the reduced-mass
energy in keV.  Valid range quoted by Bosch-Hale for D-T: 0.2 <= T <= 100 keV,
with a stated accuracy of about 0.25%.

Bosch-Hale returns cm^3/s; multiply by 1e-6 to obtain m^3/s.
"""

import math

# --- Bosch-Hale Table VII coefficients, T(d,n)4He reaction -------------------
BG_DT = 34.3827          # Gamow constant, keV^(1/2)
MRC2_DT = 1124656.0      # reduced mass energy mr*c^2, keV

C1_DT = 1.17302e-9       # cm^3/s (carries the dimensional prefactor)
C2_DT = 1.51361e-2
C3_DT = 7.51886e-2
C4_DT = 4.60643e-3
C5_DT = 1.35000e-2
C6_DT = -1.06750e-4
C7_DT = 1.36600e-5

# Physical constants used by the derived quantities
E_ALPHA_MEV = 3.5                 # alpha particle energy per D-T fusion, MeV
E_ALPHA_J = 3.5e6 * 1.602176634e-19   # J
KEV_J = 1.602176634e-16           # J per keV
ATM_PA = 1.01325e5                # Pa per atm


def sigmav_dt_cm3(T_keV):
    """D-T Maxwellian reactivity in cm^3/s (raw Bosch-Hale)."""
    T = float(T_keV)
    if T <= 0.0:
        return 0.0
    num = T * (C2_DT + T * (C4_DT + T * C6_DT))
    den = 1.0 + T * (C3_DT + T * (C5_DT + T * C7_DT))
    theta = T / (1.0 - num / den)
    xi = (BG_DT ** 2 / (4.0 * theta)) ** (1.0 / 3.0)
    return C1_DT * theta * math.sqrt(xi / (MRC2_DT * T ** 3)) * math.exp(-3.0 * xi)


def sigmav_dt(T_keV):
    """D-T Maxwellian reactivity in m^3/s."""
    return 1.0e-6 * sigmav_dt_cm3(T_keV)


# ---- Freidberg's simple analytic fit, valid ~10-20 keV, <sigma v> in m^3/s ---
def sigmav_dt_simple(T_keV):
    """<sigma v> ~= 1.1e-24 * T_keV^2  [m^3/s]  (Freidberg, 10-20 keV)."""
    return 1.1e-24 * float(T_keV) ** 2


# ---- Derived design quantities ---------------------------------------------
def T2_over_sigmav(T_keV, sigmav=sigmav_dt):
    """T^2/<sigma v> with T in keV, <sigma v> in m^3/s  ->  keV^2 s/m^3."""
    return T_keV ** 2 / sigmav(T_keV)


def pressure_atm(T_keV, sigmav=sigmav_dt):
    """Freidberg Eq. 5.37: p = 8.4e-12 * (T_keV^2/<sigma v>)^(1/2) atm."""
    return 8.4e-12 * math.sqrt(T2_over_sigmav(T_keV, sigmav))


def p_tauE(T_keV, sigmav=sigmav_dt):
    """Ignition condition p*tau_E [atm s] for a 50-50 D-T plasma.

    Power balance, alpha heating = transport loss:
        (1/4) n^2 <sigma v> E_alpha = 3 n T / tau_E     (n = n_e = n_D + n_T)
    =>  n tau_E = 12 T / (<sigma v> E_alpha)
    with p = 2 n T:
        p tau_E = 24 T^2 / (<sigma v> E_alpha)
    T and E_alpha in the same energy units (J here); p converted Pa -> atm.
    """
    T_J = T_keV * KEV_J
    p_tau_SI = 24.0 * T_J ** 2 / (sigmav(T_keV) * E_ALPHA_J)   # Pa s
    return p_tau_SI / ATM_PA


# ---- Chapter-consistent rescaled variant -----------------------------------
CHAPTER_T_KEV = 15.0
CHAPTER_SIGMAV = 3.0e-22          # m^3/s, Freidberg Ch. 5 design point
SCALE_TO_CHAPTER = CHAPTER_SIGMAV / sigmav_dt(CHAPTER_T_KEV)


def sigmav_dt_chapter(T_keV):
    """Bosch-Hale shape renormalized to hit exactly 3e-22 m^3/s at 15 keV."""
    return SCALE_TO_CHAPTER * sigmav_dt(T_keV)


if __name__ == "__main__":
    for T in (1, 2, 5, 10, 13, 15, 20, 30, 50, 100):
        print(f"T={T:6.1f} keV  <sv>={sigmav_dt(T):.4e} m^3/s  "
              f"p*tauE={p_tauE(T):8.3f} atm s")
