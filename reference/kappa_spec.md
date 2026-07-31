# Elongation (κ) specification — "Simple Magnetic Fusion Reactor Designer"

Source: J. P. Freidberg, *Plasma Physics and Fusion Energy* (Cambridge, 2007),
Ch. 5, pp. 85–108, **including its own Problem 5.5 (p. 108)**.
Baseline (circular) spec: `physics_spec.md`; baseline code: `reactor_core.py`.
Elongated implementation: `reactor_core_kappa.py` (`design_reactor_kappa`).

> **Nothing in `reference/` was modified.** This file and `reactor_core_kappa.py`
> are additive.

---

## 0. Did the chapter prescribe the conventions? — **YES, Problem 5.5 does.**

Problem 5.5 is a κ problem and it fixes almost everything. Its content:

* the plasma is an **ellipse with horizontal diameter `2a` and vertical diameter
  `2κa`** → semi-axes `(a, κa)`; κ multiplies the **vertical** axis;
* the **blanket-and-shield and the magnets are also elliptic, with `b` and `c`
  uniform around the cross section** → constant-thickness shells, and the
  offset surfaces are *treated as* ellipses with semi-axes
  `(a+b, κa+b)` and `(a+b+c, κa+b+c)`;
* the ellipse circumference is to be approximated (see typo note below);
* **"when calculating the maximum magnet stress note that the largest magnetic
  force occurs on the flattened side of the ellipse"**;
* compute `min V_I/P_E` and the Table 5.3 parameters for `0.5 ≤ κ ≤ 2`,
  **all other constraints unchanged**;
* answer: "what conclusions can be drawn about the desirability of a
  non-circular plasma?"

Only three things were left to us, all flagged below as **A1–A3**.

### ⚠️ P5.5 TYPO — the printed circumference formula is missing its exponent

The book prints

```
C = 2 π a (1 + κ²)/2                    ← as printed, p. 108
```

This is wrong. It must be

```
C = 2 π a [ (1 + κ²)/2 ]^{1/2}          ← what we use  (f(κ) ≡ [(1+κ²)/2]^{1/2})
```

Both reduce to `2πa` at κ = 1, which is why the error is easy to miss. Against
the exact perimeter (`4·a_maj·E(e)`) at `a = 1`:

| κ | exact perimeter | `f_rms = √((1+κ²)/2)` err | as-printed `(1+κ²)/2` err |
|---|---|---|---|
| 0.50 | 4.8442 | **+2.54 %** | −18.9 % |
| 0.75 | 5.5261 | **+0.50 %** | −11.2 % |
| 1.00 | 6.2832 | **0.00 %** | 0.00 % |
| 1.25 | 7.0904 | **+0.31 %** | +13.5 % |
| 1.50 | 7.9327 | **+0.97 %** | +28.7 % |
| 1.75 | 8.8007 | **+1.75 %** | +45.0 % |
| 2.00 | 9.6884 | **+2.54 %** | +62.1 % |
| 2.25 | 10.5915 | **+3.29 %** | +79.8 % |
| 2.50 | 11.5066 | **+3.97 %** | +97.9 % |
| 3.00 | 13.3649 | **+5.12 %** | +135.1 % |

`f_rms` is the RMS-semi-axis (Muir/"regime of interest") approximation and is
**good to ≤ 2.6 % over the Problem 5.5 range 0.5 ≤ κ ≤ 2, ≤ 4 % out to κ = 2.5**,
always on the **high** side. The as-printed form is off by 62 % at κ = 2 and is
certainly a dropped `^{1/2}`. `reactor_core_kappa` therefore uses `f_rms` by
default and exposes `perimeter_model="exact"` (AGM elliptic integral) so the GUI
can show the error honestly; both `f_kappa_rms`, `f_kappa_exact` and
`f_kappa_rel_err` are returned on every design point.

### Assumptions we had to make (Problem 5.5 is silent)

* **A1 — offset surfaces are ellipses.** The true constant-thickness offset of an
  ellipse is *not* an ellipse. Problem 5.5 explicitly says the blanket and
  magnets "are also elliptic in shape but their thicknesses b and c are uniform",
  i.e. it *asks* for the (mildly inconsistent) idealisation
  `(a, κa) → (a+b, κa+b) → (a+b+c, κa+b+c)`. We follow it literally. Consequence:
  the areas are `π(a+b)(κa+b)` etc., exact for those ellipses.
* **A2 — the `V_I` convention (see §2, M6).** Eq. (5.15) subtracts only the
  plasma, so the blanket-and-shield **is inside** the priced "nuclear island".
  The generalization must subtract `πκa²`, not `π(a+b)(κa+b)`.
  A magnet-only `V_I` would not reduce to Eq. (5.15) at κ = 1 and is not used.
* **A3 — which cut the "flattened side" hint selects.** Derived in §2, M5. The
  hint is unambiguous once the geometry is written down, and the resulting model
  reduces to Eq. (5.27) identically at κ = 1.

---

## 1. What is *not* changed

| block | why κ-independent |
|---|---|
| Step 0 energetics `E_tot, K_R0, K_VI` | pure nuclear bookkeeping |
| Step 1 blanket `λ_sd, λ_br, Δx, x_bnd, b` | attenuation is **1-D along the wall normal**; a constant-thickness shell presents the same optical depth around an ellipse as around a circle. `Δx = 0.884 m`, `x_bnd = 0.793 m` for every κ. |
| `ξ = B_max²/(4 μ₀ σ_max)` | definition only |
| `S_pd = [(Eα+En)/E_tot]·P_E/(η_t V_P)` | *form* unchanged; κ enters only through `V_P` |
| `p = √(16 S_pd/(Eα+En))·√(T²/⟨σv⟩)`, `n = p/2T`, `τ_E = 8.3/p` | form unchanged |
| `B0 = (R0 − a − b)/R0 · B_max` | `B_max` is at the inboard **midplane**, `R = R0 − a − b`; the horizontal build is unchanged in form. κ enters through `a` and `R0`. |
| `β = p/(B0²/2μ₀)` | definition |

---

## 2. The seven modified equations, in computational order

Symbols: `m ≡ max(κ,1)`, `n ≡ min(κ,1)`, `f ≡ f(κ)`.

### Step 0b — shape factor
```
M1   f(κ) = [ (1 + κ²) / 2 ]^{1/2}                       Problem 5.5 (typo-corrected)
            f(1) = 1 exactly (also exactly in IEEE-754)
```

### Step 2 — coil thickness and plasma minor radius

**M5 — stress → c.** The chapter unbends the torus into a straight solenoid of
length `L = 2πR0` (Fig. 5.7). Eq. (5.22) is exactly *"magnetic pressure
`B_c²/2μ₀` acting on the mid-thickness contour"*: for a circular bore of
mid-radius `r`, `dF = (B_c²/2μ₀)(r dθ)L`, and the 0→π vertical integral gives
Eq. (5.24). Equivalently

```
net separating force across a cut = (B_c²/2μ₀) × (bore width projected ⟂ to the cut) × L
```

For the elongated coil the mid-thickness ellipse has semi-axes
`A_x = a+b+c/2` and `A_y = κa+b+c/2`. Two candidate cuts, each resisted by **two**
legs of cross-section `c·L`:

| cut | separating force | resisted by | balance |
|---|---|---|---|
| horizontal (chapter's Eq. 5.26) | `(B_c²/2μ₀)(2A_x)L` | the two **side** legs | `2σ_max c = (B_c²/μ₀)(a+b+c/2)` |
| vertical | `(B_c²/2μ₀)(2A_y)L` | the two **top/bottom** legs | `2σ_max c = (B_c²/μ₀)(κa+b+c/2)` |

For κ > 1 the ellipse is tall and narrow: the radius of curvature is `A_x²/A_y`
at the top (small → sharply curved) and `A_y²/A_x` at the side (large → **flat**).
The larger force is the **horizontal** one, and it is precisely the force pushing
outward on those flat sides — Problem 5.5's "the largest magnetic force occurs on
the flattened side of the ellipse". For κ < 1 the flat sides are top/bottom and
the vertical force governs. Both cases collapse to:

```
M5   c = 2ξ (m·a + b) / (1 − ξ)              m = max(κ, 1)
     → κ = 1:  c = 2ξ(a+b)/(1−ξ)             ≡ Eq. (5.27)   ✅
```
Note `c` depends on κ **only through `m·a`** — the governing (larger) semi-axis
replaces `a` in Eq. (5.27).

**M7 — cost optimum.** Substituting M4 and M5 into M6/`P_E` (see below) gives the
generalization of Eq. (5.28):

```
V_I/P_E (a) = K_VI [ (a+b+c)(κa+b+c) − κa² ] / ( a · f(κ) · P_W )
            = K_VI/(f P_W) · [ α a + β b + γ b²/a ]

  α = 2ξ[ κ(1−ξ) + m²(1+ξ) ] / (1−ξ)²
  β = (1+ξ)[ m(1+3ξ) + n(1−ξ) ] / (1−ξ)²
  γ = (1+ξ)² / (1−ξ)²
```
`∂(V_I/P_E)/∂a = 0` ⟹ `a² = γb²/α`, i.e. **an analytic optimum exists for all κ**:

```
M7a  D    = { 2ξ [ κ(1−ξ) + m²(1+ξ) ] }^{1/2}
M7b  a    = (1+ξ) b / D
M7c  V_I/P_E |min = K_VI (1+ξ) b [ 2D + m(1+3ξ) + n(1−ξ) ] / [ (1−ξ)² f(κ) P_W ]

     → κ = 1:  D = 2√ξ ;  a = (1+ξ)b/(2√ξ)               ≡ Eq. (5.29)  ✅
               bracket = 4√ξ+2+2ξ = 2(1+√ξ)² and (1−ξ)² = (1−√ξ)²(1+√ξ)²
               ⟹ V_I/P_E = 2K_VI(1+ξ)b/[(1−√ξ)²P_W]     ≡ Eq. (5.30)  ✅
```
Numerical 1-D minimization (`a_opt_numeric`, golden section) agrees with M7b to
`≤ 4e-8` and with M7c to 8 significant figures for every κ in 0.5–2.5 — the
GUI may use either. `f(κ)` is an overall factor and **does not affect `a_opt`**.

### Step 3 — geometry
```
M4   R0   = K_R0 · P_E / ( a · f(κ) · P_W )                  → κ=1: Eq. (5.20) ✅
M2   A_P  = 4π² R0 a f(κ)                                    → κ=1: Eq. (5.33) ✅
M3   V_P  = 2π² R0 κ a²                                      → κ=1: Eq. (5.33) ✅
M6   V_I  = 2π² R0 [ (a+b+c)(κa+b+c) − κ a² ]                → κ=1: Eq. (5.15) ✅
```
Derivation of M4: `P_E = ¼η_t E_tot n²⟨σv⟩V_P` (5.18) and
`P_W·A_P = ¼E_n n²⟨σv⟩V_P` (5.19). `V_P` **cancels in the ratio**, so
`A_P = E_n P_E/(η_t E_tot P_W)` and only the *area* law M2 enters `R0`:
`4π²R0 a f = E_n P_E/(η_t E_tot P_W)`.

**Structural consequence (new, worth a GUI callout):**
```
A_P = 4π² K_R0 P_E / P_W          — INDEPENDENT of a, of f, and of κ
```
verified bit-identically: `A_P = 393.4151785714285 m²` at every κ. The neutron
power and the wall-load limit fix the first-wall area outright; shape only
decides how that fixed area is distributed between `R0` and the poloidal
circumference.

---

## 3. κ = 1 exactness check — **PASSED**

`design_reactor_kappa(kappa=1.0)` vs `design_reactor()`, 38 fields:

* **36 / 37 float fields are BIT-IDENTICAL** (`struct.pack` comparison), including
  every Table 5.3 quantity: `b, c, a, R0, R0/a, A_P, V_P, S_pd, B0, p, T, n, τ_E,
  β, Δx, x_bnd, ξ, V_I`.
* the single exception is **`VI_over_PE`**: `1.1863770317064481` (baseline) vs
  `1.1863770317064484` — **1 ulp, relative difference 1.9 × 10⁻¹⁶**. This is
  unavoidable: the general closed form M7c and Eq. (5.30) are algebraically
  identical but factor `(1−ξ)² = (1−√ξ)²(1+√ξ)²` differently, and the
  `(1+√ξ)²` does not cancel in floating point. `VI_over_PE_direct` (M6 evaluated
  at `a_opt`) is returned alongside as a cross-check and agrees to 8 s.f.
* the `warnings` list is identical at κ = 1 (the κ-scope warning fires only for
  κ > 1).

**Bit-exactness was engineered, not accidental** — three points a port must
preserve if the same guarantee is wanted:
1. `D` is computed from `Sfac = (κ + m²) + ξ(m² − κ)`, which is **exactly 2.0**
   at κ = 1. Writing the mathematically equal `κ(1−ξ) + m²(1+ξ)` gives
   `fl(1−ξ)+fl(1+ξ) ≠ 2.0` in general and loses the last bit.
2. `2·ξ·Sfac = 4ξ` exactly, and `fl(√(4ξ)) = 2·fl(√ξ)` exactly in IEEE-754
   (scaling by a power of two commutes with correct rounding), so `D` reduces
   bitwise to the baseline's `2*sqrt(xi)`.
3. `a = (1+ξ)/D * b` reproduces the baseline's `(1+xi)/(2*sq)*b` operation order.

---

## 4. κ-scan at nominal Table 5.2 constraints

`P_E = 1000 MW, P_W = 4 MW/m², B_max = 13 T, σ_max = 300 MPa, ⟨σv⟩ = 3e-22,
b = 1.2 m, T = 15 keV, η_t = 0.4, E_Li = 4.8 MeV, λ_sd = 0.055 m, atm = 1.01325e5 Pa,
perimeter_model = "rms"`.

| quantity | κ = 1.0 | κ = 1.5 | κ = 2.0 | κ = 2.5 |
|---|---|---|---|---|
| `f(κ)` | 1.0000 | 1.2748 | 1.5811 | 1.9039 |
| `a` (half-width) [m] | **1.9931** | **1.4395** | **1.1298** | **0.9308** |
| `κa` (half-height) [m] | 1.9931 | 2.1593 | 2.2597 | 2.3270 |
| `c` coil thickness [m] | **0.8061** | **0.8480** | **0.8733** | **0.8903** |
| `b` [m] | 1.2 | 1.2 | 1.2 | 1.2 |
| `R0` [m] | **5.0000** | **5.4305** | **5.5784** | **5.6231** |
| `R0/a` aspect ratio | 2.509 | 3.772 | 4.937 | 6.041 |
| `A_P` [m²] | 393.42 | 393.42 | 393.42 | 393.42 |
| `V_P` [m³] | 392.06 | 333.20 | 281.12 | 240.42 |
| `V_I` [m³] | 1186.4 | 1239.7 | 1247.2 | 1240.9 |
| **`V_I/P_E` [m³/MW]** | **1.1864** | **1.2397** | **1.2472** | **1.2409** |
| `S_pd` [MW/m³] | 5.010 | 5.895 | 6.987 | 8.170 |
| `p` [atm] | 7.301 | 7.920 | 8.622 | 9.324 |
| `n` [10²⁰ m⁻³] | 1.539 | 1.670 | 1.818 | 1.966 |
| `τ_E` [s] | 1.137 | 1.048 | 0.9626 | 0.8902 |
| `B0` [T] | 4.698 | 6.681 | 7.571 | 8.074 |
| **`β` [%]** | **8.426** | **4.518** | **3.831** | **3.642** |
| coil half-height `κa+b+c` [m] | 3.999 | 4.207 | 4.333 | 4.417 |
| `R0 − a − b` [m] | 1.807 | 2.791 | 3.249 | 3.492 |

Full Problem 5.5 sweep of the cost (0.5 ≤ κ ≤ 2.5):

| κ | 0.50 | 0.75 | 1.00 | 1.25 | 1.50 | 1.75 | 2.00 | 2.25 | 2.50 |
|---|---|---|---|---|---|---|---|---|---|
| `V_I/P_E` | 1.2472 | 1.2298 | **1.1864** | 1.2225 | 1.2397 | 1.2463 | 1.2472 | 1.2449 | 1.2409 |
| `a` [m] | 2.2597 | 2.1139 | 1.9931 | 1.6704 | 1.4395 | 1.2657 | 1.1298 | 1.0206 | 0.9308 |
| `β` [%] | 9.01 | 8.09 | 8.43 | 5.51 | 4.52 | 4.06 | 3.83 | 3.71 | 3.64 |

### Trend explanations (one line each)

* **`A_P` is exactly flat.** Neutron power ÷ wall-load limit fixes the first-wall
  area; shape only trades `R0` against poloidal circumference.
* **`a` falls ≈ 1/κ.** The stress penalty `c ∝ (κa + b)` makes a fat elongated
  plasma expensive, so the cost optimum shrinks the half-width; the half-height
  `κa` still grows slowly (+17 % at κ = 2.5).
* **`R0` *rises* ~12 %** (5.00 → 5.62 m). Careful: **at fixed `a`, elongation
  raises `A_P` and therefore lowers `R0`** (5.00 → 3.16 m at κ = 2 — and the bore
  closes, `B0 < 0`). With `a` re-optimized, `a` falls *faster* than `f` rises, so
  the product `a·f` falls (1.993 → 1.786) and `R0 = K_R0P_E/(a f P_W)` rises.
* **`V_P` falls 39 %** — `V_P = 2π²R0κa² ∝ κa²` and `a ∝ 1/κ`, so `V_P ∝ 1/κ` wins.
* **`S_pd` rises 63 %, `p` rises 28 %, `n` rises 28 %, `τ_E` falls 22 %.** Same
  fusion power in a smaller plasma volume ⇒ higher power density ⇒ higher `p`
  (`p ∝ √S_pd`) ⇒ shorter required `τ_E` (`pτ_E = 8.3` fixed).
* **`c` rises only 10 %** while `κa+b` rises — because `a` shrank, the governing
  semi-axis `κa` grows much less than κ.
* **`B0` rises 72 %** — the skinnier plasma (aspect ratio 2.5 → 6.0) sits farther
  from the inboard leg, so `(R0−a−b)/R0` improves from 0.361 to 0.621.
* **`β` falls by a factor 2.3** (8.43 % → 3.64 %). Decomposition:
  `β/β₁ = (p/p₁)/(B0/B0₁)²` = 1.28 / 2.95 = 0.43 at κ = 2.5 — **the β drop is
  almost entirely the `B0` gain (i.e. the higher aspect ratio), not elongation
  per se.**
* **`V_I/P_E` has a minimum at κ = 1** and rises ~5 % by κ = 2. It is a **cusp**,
  not a smooth minimum: the one-sided slopes converge to `∓0.1986` as ε → 0,
  because the governing stress cut switches from vertical to horizontal at κ = 1.
  The GUI's cost-vs-κ curve must show a kink at κ = 1.

### Internal consistency check — the exact κ ↔ 1/κ duality

The model possesses a **rigorous duality**, verified to 1 part in 10¹⁵:
```
a(1/κ) = κ·a(κ)      and      c, R0, A_P, V_P, V_I, V_I/P_E   are INVARIANT
```
(because `D(1/κ) = D(κ)/κ` and `f(1/κ) = f(κ)/κ`). Physically obvious: an
ellipse with semi-axes `(a, κa)` rotated 90° is the *same shape* relabelled, and
M1/M3/M5/M6/M7 depend only on the shape. **`B0` and `β` are the only quantities
that break the duality** — correctly, because `B0` uses the *horizontal* build
`R0 − a − b` and the toroidal `1/R` field distinguishes the two axes. This is a
strong regression test (`κ = 0.5` vs `κ = 2` in the sweep table: identical `c`,
`R0`, `V_I/P_E`; different `β`) and it also *proves* that the cost extremum must
sit at κ = 1.

### Sensitivity of the conclusion

`V_I/P_E` is **independent of `P_E`** (D8 generalizes unchanged) and **∝ `b`**, so
the cost ratio `(κ=2)/(κ=1) = 1.0512` is identical for `b = 0.8, 1.2, 2.0 m` and
for all `P_E`. It *does* depend on ξ — the elongation penalty **grows with field**:

| `B_max` [T] | ξ | `V_I/P_E` κ=1 | κ=2 | ratio |
|---|---|---|---|---|
| 8 | 0.0424 | 0.7807 | 0.7892 | 1.011 |
| 13 | 0.1121 | 1.1864 | 1.2472 | 1.051 |
| 20 | 0.2653 | 2.5397 | 2.8163 | 1.109 |
| 27 | 0.4834 | 7.5429 | 8.8040 | 1.167 |

### Effect of using the exact perimeter instead of the P5.5 approximation

`a` and `c` are unchanged (`f` does not enter M7b/M5); `R0` and `V_I/P_E` shift:

| κ | `R0` rms | `R0` exact | `V_I/P_E` rms | `V_I/P_E` exact | `β%` rms | `β%` exact |
|---|---|---|---|---|---|---|
| 1.0 | 5.0000 | 5.0000 | 1.1864 | 1.1864 | 8.426 | 8.426 |
| 1.5 | 5.4305 | 5.4831 | 1.2397 | 1.2517 | 4.518 | 4.416 |
| 2.0 | 5.5784 | 5.7201 | 1.2472 | 1.2789 | 3.831 | 3.653 |
| 2.5 | 5.6231 | 5.8461 | 1.2409 | 1.2901 | 3.642 | 3.412 |

The κ = 1 minimum and every qualitative trend survive; the elongation cost
penalty is *larger* (not smaller) with the exact perimeter.

---

## 5. Guard rails

All of G1–G11 from `physics_spec.md` §(d) carry over unchanged in *form*. What
changes with κ, plus two new rails:

| # | condition | κ-dependence |
|---|---|---|
| G1 | `ξ ≥ 1` | unchanged (no κ) |
| G2–G4 | positivity, `η_t ∈ (0,1]`, `A > 1` | unchanged; **`κ > 0` added to the positivity check (hard error)** |
| G5 | `R0 − a − b ≤ 0` (bore closure, `B0 ≤ 0`) | **relaxed by elongation.** Threshold `P_E > (a+b)·a·f·P_W/K_R0` = **639 MW (κ=1) → 486 (1.5) → 418 (2.0) → 379 MW (2.5)** because `a_opt` shrinks. |
| G6 | thin-coil model breach | The *condition* `c > a+b` generalizes to **`c > m·a + b`**, which from M5 is **exactly `ξ > 1/3`, independent of κ** (verified numerically at κ = 1 and κ = 2: the ratio `c/(m·a+b)` is 1.0000 at ξ = 1/3 for both). The code keeps the baseline's more permissive **trigger `ξ > 0.5`** so the two implementations warn identically; only the message text now quotes `m·a+b`. |
| G7/G8 | `β > 0.15` / `β ≥ 1` | unchanged in form; **far less likely to fire at high κ** (β falls with κ). |
| G9 | `R0/a ≤ 1` | unchanged in form; aspect ratio *rises* with κ, so also less likely. |
| G10 | `b < Δx` | fully κ-independent (Δx = 0.884 m always). |
| G11 | `λ_sd` override inconsistency | unchanged, always on with defaults. |
| **G12 (new)** | `κ < 0.5` or `κ > 2.5` | warns: outside the Problem 5.5 range (0.5–2) / our validated extension (2.5). The perimeter approximation degrades (>4 %) and the flat-side tension model becomes increasingly inadequate for a strongly-elongated coil, which in reality needs bending stiffness (this is why real TF coils are D-shaped). |
| **G13 (new)** | `R0 − a − b − c ≤ 0` | the inboard **coil leg itself** does not fit in the torus hole. The chapter's `B0` ignores `c`, so `B0` stays finite and *nothing else in the chain notices* — a silent unphysicality. Threshold `P_E > (a+b+c)·a·f·P_W/K_R0` = **800 MW (κ=1) → 642 (1.5) → 574 (2.0) → 537 MW (2.5)**. Note the nominal 1000 MW / κ = 1 design clears this by only 1.0 m. |
| **scope note (new)** | `κ > 1` | an always-on informational warning stating what this model does and does not capture (see §6). |

There is **no new vertical-build guard rail**: the torus imposes no closure
condition on the half-height `κa+b+c`, which grows only 10 % from κ = 1 to 2.5.

---

## 6. Honest limitations — what the GUI must say

**The model captures only the *geometric* consequences of elongation:**
1. a larger poloidal circumference per unit `a` (M1/M2 → `R0`, and the fixed `A_P`);
2. a larger plasma volume per unit `a` (M3);
3. a larger magnetic separating force across the flat side → a thicker coil (M5).

**It does not contain the physics that actually motivates elongation.** In real
tokamaks the benefit of κ is almost entirely in the *stability and current*
limits — `β_max` rises roughly with κ (Troyon-type scaling on `I_p/aB`), and the
plasma current at fixed safety factor rises like `(1+κ²)/2`. In this chapter's
chain **β is an OUTPUT** computed from a *fixed* `B_max` and `P_W`, not a
constraint, so no β-limit relief can appear. (Problem 5.3 in the same chapter
*does* impose a Troyon limit `β = 0.12 a/R0` — that is the machinery this problem
deliberately leaves out.)

**Consequently, the correct reading of the κ-scan is:**

* **Problem 5.5's literal answer:** on capital-cost-per-watt grounds the circular
  cross section wins. `V_I/P_E` is minimized at κ = 1 and is ~5 % worse at κ = 2
  (and ~5 % worse at κ = 0.5 — the duality). The penalty grows with field
  (~17 % at `B_max = 27 T`). *In this simple model a non-circular plasma is not
  desirable.*
* **But the same scan shows the required β dropping from 8.4 % to 3.8 %** at
  κ = 2, i.e. a factor ~2.2 easier plasma-physics demand for a ~5 % capital cost
  penalty. By the chapter's own argument in §5.5.3 — that paying a cost premium
  to relax the β demand is worth it (the text accepts a factor-2.5 cost penalty
  to run at `B_max`) — this trade actually looks *favourable*.
* **And that β drop is mostly aspect-ratio, not elongation.** `β/β₁ = 0.43` at
  κ = 2.5 decomposes as `p/p₁ = 1.28` over `(B0/B0₁)² = 2.95`; the `B0` gain
  comes from `a` shrinking, which pushes the plasma away from the inboard leg.
  A GUI that presents "elongation lowers β" without this caveat is misleading.

**Additional caveats to surface:**
* the perimeter formula is a ≤ 4 % approximation and Problem 5.5's printed
  version is missing its square root (§0);
* constant-thickness offsets of an ellipse are not ellipses (A1);
* the tension-only stress model ignores bending, which is exactly what a
  flat-sided coil cannot do without — the model *under*-estimates the structural
  penalty of elongation, so the real cost penalty is larger than 5 %;
* all baseline discrepancies D1–D10 of `physics_spec.md` still apply verbatim
  (λ_sd factor-4, "atm" = bar, `b` is chosen not computed, `T`/`⟨σv⟩`
  independence, `K_p` is design-dependent, etc.).

---

## 7. TypeScript porting notes

**Signature.** `designReactorKappa(opts)` with `kappa = 1.0` and
`perimeterModel: "rms" | "exact"` added to the baseline options. All units are
unchanged — no new unit conventions are introduced anywhere.

**Order of operations matters (§3).** To keep κ = 1 bit-identical to the circular
port, transcribe these three lines literally:
```ts
const m = Math.max(kappa, 1.0), nmin = Math.min(kappa, 1.0);
const sFac = (kappa + m*m) + xi*(m*m - kappa);   // EXACTLY 2.0 at kappa === 1
const D    = Math.sqrt(2.0 * xi * sFac);         // === 2*Math.sqrt(xi) at kappa === 1
const a    = (1.0 + xi) / D * b;                 // same op order as the circular code
```
Do **not** "simplify" `sFac` to `kappa*(1-xi) + m*m*(1+xi)`; it is mathematically
equal but loses the last bit at κ = 1.

**Elliptic integral (only for `perimeterModel: "exact"`).** `ellipe_agm` is pure
arithmetic (AGM loop, ≤ 60 iterations, no dependencies) and transcribes 1:1 to
TypeScript. If a closed form is preferred, **Ramanujan II** is more than adequate
and branchless:
```ts
// perimeter of ellipse with semi-axes A >= B
const h = ((A-B)/(A+B))**2;
const P = Math.PI*(A+B)*(1 + 3*h/(10 + Math.sqrt(4 - 3*h)));
```
measured relative error vs the AGM value: `0` at κ=1, `2.5e-12` at κ=1.5,
`4.6e-10` at κ=2, `6.3e-9` at κ=2.5, `3.3e-8` at κ=3 — negligible against the
2.5–4 % modelling error of `f_rms` itself.

**Cost curve for the GUI.** Export `costVIoverPE(a, kappa, b, xi, PW, K_VI, f)`
(the generalized Eq. 5.28) so Fig. 5.8 can be redrawn for any κ; the analytic
optimum M7b marks the minimum. A 1-D numeric scan is a perfectly acceptable
alternative and matches M7b to `4e-8` — but the closed form exists, so prefer it
and use the scan as a self-test.

**Two `V_I/P_E` values are returned on purpose.** `VI_over_PE` (M7c closed form,
the Eq. 5.30 analogue) and `VI_over_PE_direct` (M6 ÷ `P_E` at `a_opt`). They
agree to ~1e-16; a divergence in a port is an immediate signal that M5/M6/M7 were
transcribed inconsistently.

**Regression tests to port.**
1. `kappa = 1` reproduces every circular output (36/37 floats bit-identical,
   `VI_over_PE` within 1 ulp — see §3). Assert `relerr < 1e-12`.
2. κ ↔ 1/κ duality: for κ ∈ {1.25, 2, 2.5}, assert
   `a(1/κ) === κ·a(κ)`, and `c, R0, A_P, V_P, V_I, V_I/P_E` equal to 1e-12.
   **Assert that `B0` and `β` are *not* equal** — that asymmetry is the physics.
3. `A_P === 4π²·K_R0·P_E/P_W` for every κ (393.4151785714285 m² at nominal).
4. `V_I/P_E` independent of `P_E`; `∝ b`; ratio `(κ=2)/(κ=1) = 1.0512` at nominal.
5. The κ-scan table of §4 as golden values (5 s.f.).

**UI recommendations.**
* κ slider 0.5 → 2.5, default 1.0, with the Problem 5.5 range 0.5–2 shaded and
  2.0–2.5 marked "extrapolated" (G12).
* Draw the cost-vs-κ curve with its **kink at κ = 1** (do not spline through it).
* Show `f_rms` vs `f_exact` and the % error live — it is a good teaching moment
  and it exposes the book's typo.
* Always render the §6 scope statement next to any κ > 1 result. The single most
  important honesty point: **this model shows elongation costing ~5 % more per
  watt while asking for less β, and it structurally cannot show the β-limit
  benefit that motivates elongation in reality.**
