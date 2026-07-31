"""Verification of reactor_core.py against Freidberg Table 5.3 + sensitivity."""
import math
from reactor_core import design_reactor, eli_that_makes_coefficient_exact, ATM_SI, ATM_BOOK

d = design_reactor()                      # exact / consistent SI
dbook = design_reactor(atm_Pa=ATM_BOOK)   # chapter's "atm" = 1e5 Pa

print("=" * 78)
print("A. TABLE 5.3 VERIFICATION  (nominal Table 5.2 constraints)")
print("=" * 78)
rows = [
    ("b   blanket+shield [m]",       1.2,     d.b),
    ("c   coil thickness [m]",       0.79,    d.c),
    ("a   minor radius [m]",         2.0,     d.a),
    ("R0  major radius [m]",         5.0,     d.R0),
    ("R0/a aspect ratio",            2.5,     d.aspect_ratio),
    ("A_P plasma surface [m^2]",     400.,    d.A_P),
    ("V_P plasma volume [m^3]",      400.,    d.V_P),
    ("S   power density [MW/m^3]",   4.9,     d.S_pd),
    ("B0  field at R0 [T]",          4.7,     d.B0),
    ("p   pressure [atm]",           7.2,     d.p_atm),
    ("T   temperature [keV]",        15.0,    d.T_keV),
    ("n   density [1e20 m^-3]",      1.5,     d.n / 1e20),
    ("tau_E [s]",                    1.2,     d.tau_E),
    ("beta [%]",                     8.2,     d.beta * 100),
    ("Delta x [m] (Eq.5.10)",        0.88,    d.delta_x),
    ("x_boundary [m]",               0.79,    d.x_boundary),
    ("xi",                           0.11,    d.xi),
    ("V_I/P_E [m^3/MW]",             1.2,     d.VI_over_PE),
]
print(f"{'quantity':32s} {'chapter':>10s} {'computed':>12s} {'rel err %':>10s}")
for name, ch, co in rows:
    print(f"{name:32s} {ch:10.4g} {co:12.5g} {100*(co-ch)/ch:10.2f}")

print()
print("Derived chapter coefficients:")
print(f"  Eq5.20 K_R0  chapter 0.04     derived {d.K_R0:.6f}")
print(f"  Eq5.21 K_VI  chapter 0.79     derived {d.K_VI:.6f}")
print(f"  Eq5.30 2K_VI chapter 1.58     derived {d.K_VI_opt:.6f}")
print(f"  Eq5.37 K_p   chapter 8.4e-12  derived {d.K_p:.4e} (atm=1.01325e5)")
print(f"                               derived {dbook.K_p:.4e} (atm=1e5)")
for tgt, which, lbl in ((0.04, "R0", "0.04"), (0.79, "VI", "0.79")):
    Etot, ELi = eli_that_makes_coefficient_exact(tgt, which=which)
    print(f"  coefficient {lbl} exact  <=>  E_tot={Etot:.3f} MeV, E_Li={ELi:.3f} MeV")

print()
print("=" * 78)
print("B. REPRODUCING THE CHAPTER'S ROUNDED ARITHMETIC")
print("=" * 78)
# Chapter used xi = 0.11 (rounded), then a=2.0, R0=5.0, V_P=400, atm=1e5.
xi_r = 0.11
b = 1.2
a_r = (1 + xi_r) / (2 * math.sqrt(xi_r)) * b
c_r = math.sqrt(xi_r) * (1 + math.sqrt(xi_r)) / (1 - math.sqrt(xi_r)) * b
print(f"  with xi rounded to 0.11: a = {a_r:.4f} m, c = {c_r:.4f} m "
      f"(chapter 2.0, 0.79)  <-- explains c")
S_r = (3.5 + 14.1) / 22.4 * 1000 / (0.4 * 400.0)
print(f"  with V_P rounded to 400 m^3: S = {S_r:.3f} MW/m^3 (chapter 4.9)")
p_r = 7.2
print(f"  with p = 7.2 atm and 1 atm = 1e5 Pa, B0 = 4.7 T:")
beta_r = p_r * 1e5 / (4.7**2 / (2 * 4e-7 * math.pi))
print(f"      beta = {beta_r*100:.2f}%  (chapter 8.2%)  <-- explains beta")
print(f"  consistent-SI beta = {d.beta*100:.2f}% ; chapter-atm beta = "
      f"{dbook.beta*100:.2f}%")

print()
print("=" * 78)
print("C. SENSITIVITY SCANS")
print("=" * 78)
hdr = (f"{'case':>22s} {'xi':>7s} {'a':>7s} {'c':>7s} {'R0':>7s} {'R0-a-b':>8s} "
       f"{'B0':>6s} {'V_P':>8s} {'S':>6s} {'p':>6s} {'beta%':>7s} "
       f"{'tauE':>6s} {'VI/PE':>7s}")


def show(label, **kw):
    try:
        r = design_reactor(**kw)
    except Exception as e:
        print(f"{label:>22s}  ERROR: {e}")
        return
    print(f"{label:>22s} {r.xi:7.3f} {r.a:7.3f} {r.c:7.3f} {r.R0:7.3f} "
          f"{r.R0-r.a-r.b:8.3f} {r.B0:6.2f} {r.V_P:8.1f} {r.S_pd:6.2f} "
          f"{r.p_atm:6.2f} {r.beta*100:7.2f} {r.tau_E:6.2f} {r.VI_over_PE:7.3f}"
          + ("  *" if any("beta" in w or "<= 0" in w or "> 0.5" in w
                          for w in r.warnings) else ""))


for scan, key, vals in (
        ("Bmax [T]",       "Bmax",      [8, 10, 13, 16, 20, 30, 38, 39]),
        ("PW [MW/m2]",     "PW",        [1, 2, 4, 6, 10]),
        ("sigma_max [MPa]","sigma_max", [100e6, 200e6, 300e6, 400e6, 800e6]),
        ("PE [MW]",        "PE",        [200, 500, 1000, 2000, 4000]),
        ("b [m]",          "b",         [0.6, 0.9, 1.2, 1.5, 2.0]),
        ("T [keV]",        "T_keV",     [8, 10, 15, 20, 30]),
):
    print(f"\n-- scanning {scan}")
    print(hdr)
    for v in vals:
        lbl = f"{key}={v/1e6:g}MPa" if key == "sigma_max" else f"{key}={v:g}"
        show(lbl, **{key: v})

print("\n-- <sigma v> scan (T held at 15 keV)")
print(hdr)
for v in [1e-22, 3e-22, 1e-21]:
    show(f"sigmav={v:g}", sigmav=v)

print()
print("=" * 78)
print("D. GUARD-RAIL BOUNDARY PROBES")
print("=" * 78)
print(f"  xi = 1 at Bmax = sqrt(4 mu0 sigma_max) = "
      f"{math.sqrt(4*4e-7*math.pi*300e6):.2f} T (sigma_max=300 MPa)")
for sm in (100e6, 200e6, 300e6, 400e6, 800e6):
    print(f"     sigma_max={sm/1e6:5.0f} MPa -> Bmax_crit = "
          f"{math.sqrt(4*4e-7*math.pi*sm):.2f} T")
# bore-closure boundary in PE
print("\n  bore closure R0-a-b=0 (b=1.2, PW=4, Bmax=13, sig=300MPa):")
r = design_reactor()
PE_crit = (r.a + r.b) * r.a * r.PW / r.K_R0
print(f"     PE_min = (a+b) a PW / K_R0 = {PE_crit:.1f} MW  "
      f"(a={r.a:.3f} is independent of PE)")
for pe in (600, 640, 641, 700):
    show(f"PE={pe}", PE=pe)
print("\n  PW too large also closes the bore (R0 ~ 1/PW):")
for pw in (4, 6, 6.3, 8):
    show(f"PW={pw}", PW=pw)
print("\n  blanket b thinner than Delta x = 0.884 m:")
rr = design_reactor(b=0.7)
print(f"     b=0.7 -> warnings: {rr.warnings}")
