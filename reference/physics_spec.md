# Physics specification — "Simple Magnetic Fusion Reactor Designer"

Source: J. P. Freidberg, *Plasma Physics and Fusion Energy* (Cambridge, 2007),
Ch. 5 "Design of a simple magnetic fusion reactor", pp. 85–108.
Reference implementation: `reactor_core.py` (function `design_reactor`).
Verification driver: `verify.py`.

---

## (e) FIRST — what energy bookkeeping reproduces the chapter coefficients

Define `E_tot ≡ Eα + En + E_Li` = total recoverable thermal energy per D–T
reaction, including the Li-6 breeding Q-value.

| chapter coefficient | symbolic form | value with `E_Li = 4.8 MeV` (`E_tot = 22.4`) | `E_tot` making it exact |
|---|---|---|---|
| `0.04` (Eq. 5.20) | `K_R0 = En / (4π² ηt E_tot)` | **0.039861** | 22.322 MeV → `E_Li = 4.722` |
| `0.79` (Eq. 5.21) | `K_VI = En / (2 ηt E_tot) = 2π² K_R0` | **0.786830** | 22.310 MeV → `E_Li = 4.710` |
| `1.58` (Eq. 5.30) | `2 K_VI` | **1.573661** | same as above |

**Answer: `E_Li = 4.8 MeV`, `E_tot = Eα + En + E_Li = 3.5 + 14.1 + 4.8 = 22.4 MeV`.**
This is the Li6(n,α)T Q-value (4.78 MeV exact) and matches the "about 22 MeV of
thermal energy" stated in the chapter's own Problem 5.4. The best-fit value is
4.72 MeV; the 0.3 % difference is pure rounding in the book. The two coefficients
are not independent — `K_VI ≡ 2π² K_R0` identically — so a single `E_Li` fixes both.

`8.4e-12` (Eq. 5.37) is **not** an energy-bookkeeping constant:
```
K_p = sqrt(16 · S_pd[W/m³] / (Eα+En)[J]) · (1e3·q_e J/keV) / atm_Pa
```
With `S_pd = 4.9e6 W/m³`, `Eα+En = 17.6 MeV = 2.8198e-12 J`:
`K_p = 8.448e-7 Pa` → **8.45e-12 with 1 atm = 1e5 Pa** (rounds to 8.4e-12),
or 8.34e-12 with 1 atm = 1.01325e5 Pa. The printed 8.4e-12 therefore uses
1 atm ≡ 1e5 Pa (a *bar*), consistent with the chapter's "300 MPa ≈ 3000 atm".
**`K_p` embeds this design's own power density and must be recomputed for every
off-nominal point — it is not a universal constant.**

---

## (a) Complete ordered equation list — exact computational order

### Step 0 — energetics
```
0.1   E_tot   = Eα + En + E_Li                                  [MeV]
0.2   K_R0    = (1/(4π² ηt)) · En/E_tot                         (→ 0.04)
0.3   K_VI    = 2π² K_R0 = En/(2 ηt E_tot)                      (→ 0.79)
```

### Step 1 — blanket-and-shield thickness (Eqs. 5.3–5.11)
```
1.1   λ_sd_xs = 1/(n_L σ_sd)                    Eq. 5.3 text   [= 0.222 m]
1.2   λ_sd    = 0.055 m  (CHAPTER OVERRIDE — see Discrepancy D1)
1.3   λ_br    = 1/(f_Li6 · n_L · σ_br)          Eq. 5.7 text   [= 0.00312 m]
1.4   E(x)    = En·exp(−x/λ_sd)                 Eqs. 5.3, 5.4
1.5   σ(E)    = σ_br (E_t/E)^{1/2}              Eq. 5.6
1.6   λ(E)    = λ_br (E/E_t)^{1/2}              Eq. 5.7
1.7   dΓn/dx + (E_t/En)^{1/2} e^{x/2λ_sd} Γn/λ_br = 0           Eq. 5.8
1.8   Γn/Γn0  = exp[ −2 (E_t/En)^{1/2}(λ_sd/λ_br)(e^{x/2λ_sd} − 1) ]   Eq. 5.9
1.9   Δx      = 2 λ_sd · ln[ 1 + ½ (En/E_t)^{1/2}(λ_br/λ_sd)·ln(A) ]   Eq. 5.10
                A = attenuation factor = Γn0/Γn = 100     → Δx = 0.884 m
1.10  x_bnd   = 2 λ_sd · ln[ λ_br (En/E_t)^{1/2} / λ_sd ]      → 0.793 m
                (moderator/breeder boundary, chapter's "x ≈ 0.79 m")
1.11  b       = 1.2 m   ← *** CHOSEN BY THE AUTHOR, NOT COMPUTED ***  Eq. 5.11
                Δx is only a sanity estimate; neutronics studies give 1 < b < 1.5 m.
```
`En` here is written `E_f` in Eqs. 5.8–5.10 (fusion-neutron birth energy); they are
the same 14.1 MeV. Note `E_t` is in **eV** (0.025) so `En` must be converted to eV.

### Step 2 — coil thickness and plasma minor radius (Eqs. 5.12–5.31)
```
2.1   ξ       = B_max² / (4 μ0 σ_max)                          Eq. 5.27 def.
2.2   a       = (1+ξ)/(2√ξ) · b                                Eq. 5.29  (cost optimum)
2.3   c       = 2ξ/(1−ξ)·(a+b)  ≡  √ξ(1+√ξ)/(1−√ξ)·b           Eqs. 5.27, 5.30
2.4   V_I/P_E = 2 K_VI (1+ξ) b / [ (1−√ξ)² P_W ]               Eq. 5.30
                (= 1.58 (1+ξ)/(1−ξ^{1/2})² · b/P_W)
```
Supporting (not needed at run time, but for the GUI's "show the derivation" panel):
`K_F = C_F P_E` (5.13); `K_I = C_I V_I` (5.14); `V_I = 2π²R0[(a+b+c)²−a²]` (5.15);
`C = C_F + C_I V_I/P_E` (5.16, 5.17); coil force balance
`F_y^(M) = 2πR0 B_c²(a+b+c/2)/μ0` (5.22–5.24), `F_y^(T) = σ_max(2πR0 c)` (5.25),
`2F_y^(T) = F_y^(M)` (5.26); cost function in `a`
`V_I/P_E = K_VI/[P_W(1−ξ)²]·[4ξa + (1+ξ)²b²/a + 2(1+ξ)²b]` (5.28).

**Key structural fact: `a` and `c` depend ONLY on `b` and `ξ` — they are
independent of `P_E`, `P_W`, `T` and `⟨σv⟩`.** `V_I/P_E` additionally depends on
`P_W` (∝ 1/P_W) but not on `P_E`.

### Step 3 — major radius and plasma geometry (Eqs. 5.18–5.20, 5.32, 5.33)
```
3.1   P_E     = ¼ ηt E_tot n² ⟨σv⟩ (2π²R0a²)                   Eq. 5.18
3.2   P_W(4π²R0a) = ¼ En n² ⟨σv⟩ (2π²R0a²)                     Eq. 5.19
3.3   R0      = K_R0 · P_E/(a P_W)          [MW, MW/m², m]     Eq. 5.20
3.4   R0/a                                                     Eq. 5.33
3.5   A_P     = 4π² R0 a                                       Eq. 5.33
3.6   V_P     = 2π² R0 a²                                      Eq. 5.33
3.7   V_I     = 2π² R0 [(a+b+c)² − a²]                         Eq. 5.15
```

### Step 4 — power density and plasma pressure (Eqs. 5.34–5.38)
```
4.1   S_pd = (Pα+Pn)/V_P = [(Eα+En)/E_tot] · P_E/(ηt V_P)  [MW/m³]  Eqs. 5.34, 5.35
4.2   Pα+Pn = ¼(Eα+En) n² ⟨σv⟩ V_P                                  Eq. 5.36
4.3   p    = [16 S_pd/(Eα+En)]^{1/2} · [T²/⟨σv⟩]^{1/2}              Eq. 5.37
             = K_p · sqrt(T_keV²/⟨σv⟩)   with
             K_p = sqrt(16 S_pd[W/m³]/(Eα+En)[J]) · (1.602e-16 Pa·m³? per keV)/atm_Pa
             (evaluate in SI, then divide by atm_Pa)
4.4   n    = p / (2 T)      (from p = 2nT, SI)                      Eq. 5.38 text
```
The chapter chooses `T = 15 keV` because it minimizes `T²/⟨σv⟩` — i.e. minimizes `p`
and hence `β`. In this model `T` and `⟨σv⟩` are *independent* inputs (see D4).

### Step 5 — confinement time, field, beta (Eqs. 5.1, 5.39–5.43)
```
5.1   τ_E  = (pτ_E)_ign / p = 8.3 / p[atm]                          Eq. 5.39
5.2   B_φ  = B0 (R0/R)                                              Eqs. 5.40, 5.41
5.3   B0   = (R0 − a − b)/R0 · B_max                                Eq. 5.42
5.4   β    = p / (B0²/2μ0)                                          Eqs. 5.1, 5.43
```

---

## (b) Constraint table — defaults and GUI slider ranges

| symbol | meaning | default (Table 5.2) | suggested slider | hard limits |
|---|---|---|---|---|
| `P_E` | electric power out [MW] | **1000** | 200 – 3000 | > `(a+b)·a·P_W/K_R0` (bore closure, 639 MW at nominal) |
| `P_W` | max neutron wall load [MW/m²] | **4** | 1 – 6 | > 0; < ~6.2 at nominal (bore closure) |
| `B_max` | max field at coil [T] | **13** | 5 – 20 | `B_max < sqrt(4 μ0 σ_max)` (38.8 T at 300 MPa) |
| `σ_max` | max coil stress [MPa] | **300** | 100 – 800 | > `B_max²/(4μ0)` |
| `⟨σv⟩` | D–T reactivity [m³/s] | **3e-22** | 1e-22 – 1e-21 (or tie to `T`) | > 0 |
| `σ_sd` | fast-n slowing-down x-sec [barn] | **1** | 0.5 – 5 | > 0 |
| `σ_br` | Li-6 breeding x-sec [barn] @ 0.025 eV | **950** | 300 – 2000 | > 0 |
| `b` | blanket+shield thickness [m] | **1.2** (chosen) | 0.8 – 2.0 | ≥ Δx ≈ 0.88 m (warn below) |
| `T` | plasma temperature [keV] | **15** | 5 – 30 | > 0 |
| `η_t` | thermal conversion efficiency | **0.4** | 0.25 – 0.50 | (0, 1] |
| `E_n` | D–T neutron energy [MeV] | **14.1** | fixed | — |
| `E_α` | D–T alpha energy [MeV] | **3.5** | fixed | — |
| `E_Li` | Li-6 breeding Q [MeV] | **4.8** | 4.0 – 5.0 (advanced) | ≥ 0 |
| `n_L` | natural Li density [m⁻³] | **4.5e28** | 3e28 – 6e28 | > 0 |
| `f_Li6` | Li-6 fraction | **0.075** | 0.075 – 1.0 (enrichment) | (0, 1] |
| `E_t` | thermal energy [eV] | **0.025** | fixed | > 0 |
| `A` | required flux attenuation | **100** | 10 – 1000 | > 1 |
| `(pτ_E)` | ignition threshold [atm·s] | **8.3** | 5 – 15 | > 0 |
| `λ_sd` | slowing-down mfp [m] | **0.055** (chapter override) | 0.03 – 0.25 | > 0 — see D1 |
| `atm_Pa` | Pa per "atm" | 1.01325e5 (SI) / 1e5 (book) | toggle | — |

---

## (c) Verification table — chapter (Table 5.3) vs. computed

Computed with exact SI, `E_Li = 4.8 MeV`, `λ_sd = 0.055 m`, `atm = 1.01325e5 Pa`.

| quantity | Freidberg | computed | rel. err. | cause of difference |
|---|---|---|---|---|
| `b` blanket+shield [m] | 1.2 | 1.2 | 0 % | input |
| `c` coil thickness [m] | 0.79 | **0.806** | +2.0 % | book used rounded ξ = 0.11 |
| `a` minor radius [m] | 2.0 | **1.993** | −0.3 % | rounding of ξ |
| `R0` major radius [m] | 5.0 | **5.000** | −0.003 % | — |
| `R0/a` aspect ratio | 2.5 | **2.509** | +0.3 % | rounding |
| `A_P` [m²] | ≈400 | **393.4** | −1.7 % | book rounded a→2.0, R0→5.0 |
| `V_P` [m³] | ≈400 | **392.1** | −2.0 % | same |
| `S_pd` power density [MW/m³] | 4.9 | **5.010** | +2.3 % | book used V_P = 400 exactly |
| `B0` [T] | 4.7 | **4.698** | −0.05 % | — |
| `p` [atm] | 7.2 | **7.301** | +1.4 % | book: S_pd = 4.9, atm = 1.01325e5 |
| `T` [keV] | 15 | 15 | 0 % | input |
| `n` [10²⁰ m⁻³] | 1.5 | **1.539** | +2.6 % | follows p |
| `τ_E` [s] | 1.2 | **1.137** | −5.3 % | book: 8.3/7.2 = 1.153, rounded UP to 1.2 |
| `β` [%] | 8.2 | **8.43** | +2.8 % | see below |
| `Δx` [m] (Eq. 5.10) | 0.88 | **0.8844** | +0.5 % | — |
| `x` mod/breeder boundary [m] | 0.79 | **0.7926** | +0.3 % | — |
| `ξ` | 0.11 | **0.11207** | +1.9 % | book truncated |
| `V_I/P_E` [m³/MW] | 1.2 | **1.1864** | −1.1 % | book: 1.191 with literal 1.58 → "1.2" |

**Every disagreement is a chapter rounding artifact, not a transcription error.**
Demonstrations:
* Using ξ = 0.11 (the book's rounded value) reproduces `a = 2.008`, `c = 0.793`
  → the book's "2.0" and "0.79" exactly.
* Using `V_P = 400 m³` reproduces `S_pd = 4.911` → the book's "4.9".
* Using `p = 7.2 atm`, `B0 = 4.7 T` and `1 atm = 1e5 Pa` gives `β = 8.19 %`
  → the book's "8.2 %". A self-consistent evaluation gives 8.4 %.
  (β is invariant under the atm convention — it uses `p` in Pa — so the 8.2 %
  comes purely from carrying the *rounded* 7.2 atm forward as 7.2e5 Pa.)
* `V_I/P_E` cross-checked three independent ways — the derived symbolic form,
  the literal Eq. 5.30 with 1.58, and the direct volume ratio
  `2π²R0[(a+b+c)²−a²]/P_E` — all agree to 0.4 %.

**β is the most rounding-sensitive output in the table.** Do not expect a GUI
that computes consistently to print 8.2 %; it will print ≈8.4 %.

---

## (d) Model-validity guard rails

Hard errors (raise / block the design):

| # | condition | consequence | boundary |
|---|---|---|---|
| G1 | `ξ = B_max²/(4μ0σ_max) ≥ 1` | `c → ∞`; coil cannot support itself | `B_max ≥ sqrt(4μ0σ_max)`: **38.8 T @ 300 MPa**, 22.4 T @ 100 MPa, 31.7 @ 200, 44.8 @ 400, 63.4 @ 800 |
| G2 | any of `P_E, P_W, B_max, σ_max, ⟨σv⟩, T, b ≤ 0` | nonsense | — |
| G3 | `η_t ∉ (0,1]` | efficiency > 1 | — |
| G4 | `A ≤ 1` | Eq. 5.10 log argument ≤ 1 → no finite Δx | attenuation must reduce flux |

Warnings (allow, but flag prominently — these are the GUI's red zones):

| # | condition | meaning | nominal-case boundary |
|---|---|---|---|
| G5 | `R0 − a − b ≤ 0` | inboard coil leg does not fit; **`B0 ≤ 0`, `β → ∞` or negative** | `P_E < (a+b)a P_W/K_R0` = **639 MW**; or `P_W > 6.2 MW/m²`; or `b > 1.5 m`; or `B_max < ~9.5 T`; or `σ_max > ~430 MPa` |
| G6 | `ξ > 0.5` | `c > a + b`; thin-coil stress model far outside calibration | `B_max > 27.5 T @ 300 MPa` |
| G7 | `β > 0.15` | never achieved in a tokamak; design not realizable | triggered whenever G5 is near |
| G8 | `β ≥ 1` | magnetic confinement impossible | — |
| G9 | `R0/a ≤ 1` | degenerate torus | low `B_max` / low `P_E` |
| G10 | `b < Δx` | blanket too thin to breed/moderate | `b < 0.884 m` at nominal |
| G11 | `λ_sd` override differs from `1/(n_L σ_sd)` | chapter inconsistency, factor 4.04 | always on with defaults |

**G5 is the dominant practical guard rail.** Because `a` is fixed by `(b, ξ)` and
`R0 ∝ P_E/(a P_W)`, the bore closes whenever the reactor is made *small* — low
`P_E`, high `P_W`, thick `b`, weak `B_max`, or *strong* `σ_max` (which drives ξ down
and `a` up). β blows up violently (10²–10⁵ %) just before the crossing, so the GUI
must clamp/annotate rather than plot it.

### Monotonic trends confirmed by the sensitivity scans

| input ↑ | ξ | a | c | R0 | V_P | S_pd | p | β | τ_E | V_I/P_E (cost) |
|---|---|---|---|---|---|---|---|---|---|---|
| `B_max` | ↑ | ↓ | ↑ | ↑ | ↓ | ↑ | ↑ | **↓** | ↓ | **↑** |
| `σ_max` | ↓ | ↑ | ↓ | ↓ | ↑ | ↓ | ↓ | ↑ | ↑ | ↓ |
| `P_W` | – | – | – | ↓ (∝1/P_W) | ↓ | ↑ | ↑ | ↑ | ↓ | **↓ (∝1/P_W)** |
| `P_E` | – | – | – | ↑ (∝P_E) | ↑ | – | – | ↓ | – | **–** |
| `b` | – | ↑ (∝b) | ↑ (∝b) | ↓ (∝1/b) | ↑ | ↓ | ↓ | ↑ | ↑ | ↑ (∝b) |
| `T` (⟨σv⟩ fixed) | – | – | – | – | – | – | ↑ (∝T) | ↑ | ↓ | – |
| `⟨σv⟩` | – | – | – | – | – | – | ↓ (∝σv^{−½}) | ↓ | ↑ | – |

All thicknesses stay positive throughout; no negative Δx, a, c anywhere in the
scanned range. Higher field buys lower β at higher cost — exactly the chapter's
stated trade-off (V_I/P_E is ~2.5× larger at ξ = 0.11 than at ξ → 0).

---

## Discrepancies and subtleties the GUI implementation MUST handle

**D1 — `λ_sd` factor-of-4 inconsistency (the biggest one).**
The chapter states `λ_sd = 1/(n_L σ_sd) ≈ 0.055 m` with `n_L = 4.5e28 m⁻³`,
`σ_sd = 1 barn`. That formula actually gives **0.2222 m**. Only `λ_sd = 0.055 m`
reproduces *both* published numbers (Δx = 0.88 m and the 0.79 m
moderator/breeder boundary); `λ_sd = 0.2222 m` gives Δx = **2.95 m**.
`design_reactor` defaults to `lambda_sd_override = 0.055` and returns
`lambda_sd_from_cross_section` alongside, plus a standing warning. If the GUI
exposes `σ_sd` as a slider, it must either (a) rescale the override with `σ_sd`,
or (b) present `λ_sd` itself as the slider and label the `n_Lσ_sd` relation as
"as printed in the text (inconsistent by ×4)". Do not silently pick one.

**D2 — the chapter's "atm" is a bar.** `σ_max = 300 MPa ≈ 3000 atm` and the
8.4e-12 coefficient both imply 1 atm = 1e5 Pa; the quoted `p = 7.2 atm` implies
1.01325e5 Pa. Internally inconsistent at the ~1.3 % level. `atm_Pa` is an
explicit argument. Note `β` does not depend on the choice (it uses Pa), but
`τ_E = 8.3/p[atm]` does.

**D3 — `b = 1.2 m` is a designer's choice, not a result.** Δx = 0.88 m is only the
moderator+breeder estimate; the chapter adds multiplier/shield/structure and
picks 1.2 m from the neutronics range 1–1.5 m. The GUI must expose `b` as an
independent slider and show Δx as an advisory line, never auto-set `b = Δx`.

**D4 — `T` and `⟨σv⟩` are independent inputs in this model.** Physically
`⟨σv⟩ = ⟨σv⟩(T)`. If the GUI lets the user slide `T` with `⟨σv⟩` frozen at 3e-22,
`p ∝ T` rises monotonically, which is *wrong physics* — the real `T²/⟨σv⟩` has a
minimum at ~15 keV (that is precisely why the chapter picks 15 keV). Either
(i) lock `T = 15 keV` and hide the slider, or (ii) supply a `⟨σv⟩(T)` fit
(Bosch–Hale or the chapter's own Ch. 3 curve) and drive `⟨σv⟩` from `T`.
Option (ii) is strongly preferred for an educational tool, since the T²/⟨σv⟩
minimum is one of the chapter's main physics points.

**D5 — `K_p` (the 8.4e-12) is design-dependent.** It scales as `sqrt(S_pd)`.
Never hard-code it. `reactor_core` returns the recomputed `K_p` per design point
so a GUI panel can show it moving away from 8.4e-12.

**D6 — `K_VI ≡ 2π² K_R0` exactly.** The 0.04 and 0.79 coefficients are not
independent; a GUI "advanced" panel exposing `E_Li` or `η_t` must update both.

**D7 — Eq. 5.30 denominator is `(1 − ξ^{1/2})²`, not `(1 − ξ)²`.** Verified
against the printed page. Using `(1−ξ)²` (an easy misreading) gives
0.66 m³/MW instead of 1.19.

**D8 — `a` is independent of `P_E` and `P_W`.** A common GUI bug would be to
re-solve `a` after changing `P_E`. The minimisation of Eq. 5.28 over `a` has the
`P_W` factored out entirely, so the optimum `a = (1+ξ)b/(2√ξ)` depends only on
`b` and `ξ`. Only `R0` (and everything downstream of it) responds to `P_E`/`P_W`.

**D9 — `B0` uses `R0 − a − b`, not `R0 − a − b − c`.** `B_max` is the field on the
*inner* surface of the coil, i.e. at `R = R0 − a − b`.

**D10 — the chapter's `V_I/P_E` figure caption** (Fig. 5.8) plots the cost with
`P_W = 4` and `ξ = 0.11`, minimum ≈1.2 m³/MW at `a ≈ 2 m`; useful as a GUI
"cost curve" overlay and a regression check on Eq. 5.28.
