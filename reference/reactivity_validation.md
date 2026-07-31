# D-T reactivity validation for the Freidberg Ch. 5 reactor-designer GUI

Code: `reactivity.py` (same directory). All numbers below reproduced by that module.

## 0. Parametrization

Bosch & Hale, *Nucl. Fusion* **32** (1992) 611, Table VII, reaction T(d,n)⁴He:

```
theta = T / [ 1 - T*(C2 + T*(C4 + T*C6)) / (1 + T*(C3 + T*(C5 + T*C7))) ]
xi    = ( B_G^2 / (4*theta) )^(1/3)
<sv>  = C1 * theta * sqrt( xi / (mr_c2 * T^3) ) * exp(-3*xi)     [cm^3/s], T in keV
```

| symbol | value |
|---|---|
| B_G   | 34.3827 keV^(1/2) |
| mr·c² | 1 124 656 keV |
| C1 | 1.17302e-9 |
| C2 | 1.51361e-2 |
| C3 | 7.51886e-2 |
| C4 | 4.60643e-3 |
| C5 | 1.35000e-2 |
| C6 | -1.06750e-4 |
| C7 | 1.36600e-5 |

Validity 0.2–100 keV, stated accuracy ≈0.25%. Result is cm³/s → ×1e-6 for m³/s.

**Independent check of the coefficients.** The Bosch–Hale *cross-section* fit
(Table IV, S-factor Padé form, A = [6.927e4, 7.454e8, 2.050e6, 5.2002e4, 0],
B = [6.38e1, -9.95e-1, 6.981e-5, 1.728e-4]) was integrated numerically over a
Maxwellian (Simpson, 4e5 points, E up to 40 kT, E interpreted as CM energy):

| T (keV) | ∫ Maxwellian (m³/s) | closed form (m³/s) | ratio |
|---|---|---|---|
| 2  | 2.997e-25 | 2.977e-25 | 1.0067 |
| 5  | 1.369e-23 | 1.366e-23 | 1.0024 |
| 10 | 1.142e-22 | 1.136e-22 | 1.0050 |
| 15 | 2.757e-22 | 2.740e-22 | 1.0063 |
| 20 | 4.363e-22 | 4.330e-22 | 1.0075 |
| 30 | 6.731e-22 | 6.681e-22 | 1.0074 |
| 50 | 8.674e-22 | 8.649e-22 | 1.0029 |

Agreement ≤0.8% (quadrature/tail truncation), i.e. the two independent coefficient
sets are mutually consistent. Cross-section fit peaks at 5.07 barn at 64.8 keV;
reactivity peaks at 8.947e-22 m³/s at 66.6 keV — both standard literature values.

## (a) Reactivity at the chapter design point, T = 15 keV

- Bosch–Hale: **⟨σv⟩(15 keV) = 2.7399e-22 m³/s**
- Chapter value: 3e-22 m³/s
- **ratio BH/chapter = 0.9133** → Bosch–Hale is **8.67% lower** than the chapter's round number (well inside the ~10–15% expected).
- Eq. 5.37 pressure at 15 keV: raw BH → **7.612 atm**; chapter ⟨σv⟩ → **7.275 atm** (the chapter's design pressure; with pτ_E = 8.3 atm·s this gives τ_E = 1.141 s and n = 1.53e20 m⁻³).

## (b) Minimizer of T²/⟨σv⟩ (Bosch–Hale)

- **T_min = 13.54 keV**, (T²/⟨σv⟩)_min = 8.1391e23 keV² s/m³, p(T_min) = 7.578 atm.
- The chapter's 15 keV is **0.89% above** the true minimum in T²/⟨σv⟩ (0.45% in pressure) — physically indistinguishable.

| T (keV) | T²/⟨σv⟩ (keV² s/m³) | normalized to min | p, Eq. 5.37 (atm) |
|---|---|---|---|
| 10 | 8.8015e23 | 1.0814 | 7.881 |
| 13 | 8.1505e23 | 1.0014 | 7.584 |
| 13.54 | 8.1391e23 | 1.0000 | 7.578 |
| 15 | 8.2119e23 | 1.0089 | 7.612 |
| 20 | 9.2374e23 | 1.1350 | 8.073 |
| 30 | 1.3471e24 | 1.6552 | 9.750 |

Flatness of the minimum: within 1% for **12.15–15.09 keV**, within 5% for
10.66–17.23 keV, within 10% for 9.69–18.98 keV. Because p ∝ (T²/⟨σv⟩)^(1/2),
the pressure penalty is half of these in percent. The chapter's claim "15 keV
minimizes T²/⟨σv⟩" is a rounding of a very flat minimum near 13.5 keV.

## (c) Ignition curve pτ_E(T)

Power balance for 50-50 D-T, n = n_e, n_D = n_T = n/2, p = 2nT:

    (1/4) n² ⟨σv⟩ E_α = 3 n T / τ_E   →   n τ_E = 12 T/(⟨σv⟩E_α)   →   **pτ_E = 24 T²/(⟨σv⟩E_α)**

with T and E_α = 3.5 MeV in joules, p converted Pa → atm (1 atm = 1.01325e5 Pa).
Note pτ_E ∝ T²/⟨σv⟩, so it minimizes at the same temperature as (b).

- **min pτ_E = 8.825 atm·s at T = 13.54 keV**
- Book value ≈ 8.3 atm·s near 15 keV → **ratio 1.063 (6.3% high)**.
- Using the chapter's ⟨σv⟩ = 3e-22 at 15 keV, the same formula gives **8.132 atm·s**, i.e. 2.0% below 8.3.
- The ⟨σv⟩(15 keV) that reproduces 8.3 atm·s exactly is 2.939e-22 m³/s (2.0% below the chapter's 3e-22, 7.3% above Bosch–Hale).

| T (keV) | pτ_E (atm·s) | normalized |
|---|---|---|
| 10 | 9.543 | 1.0814 |
| 13 | 8.837 | 1.0014 |
| 13.54 | 8.825 | 1.0000 |
| 14 | 8.833 | 1.0010 |
| 15 | 8.904 | 1.0089 |
| 20 | 10.016 | 1.1350 |
| 30 | 14.607 | 1.6552 |

Verdict: the simple 3nT/τ_E + alpha-heating balance with raw Bosch–Hale reproduces
the book's 8.3 atm·s to 6%, and its minimum sits at 13.5 keV rather than 15 keV.
The residual 6% is exactly the kind of gap expected from the book's slightly
different loss model (the book's Ch. 4 curve typically carries bremsstrahlung and
a marginally different numerical fit), not from a units error.

## (d) Freidberg's simple fit ⟨σv⟩ ≈ 1.1e-24 T_keV² m³/s

With ⟨σv⟩ ∝ T², T²/⟨σv⟩ = 1/1.1e-24 = 9.091e23 keV² s/m³ is **constant**, so:

- p (Eq. 5.37) = **8.009 atm at every T** — the minimum vanishes; no design-point structure to plot.
- pτ_E = 24 keV²_J/(1.1e-24 · E_α) / atm = **9.857 atm·s, T-independent**; ratio to 8.3 = **1.188 (19% high)**, ratio to the Bosch–Hale minimum 8.825 = 1.117.
- Accuracy of the T² fit against Bosch–Hale: 0.968 (10 keV), 0.907 (12), 0.903 (15), 0.958 (18), 1.016 (20) — i.e. ≤10% over 10–20 keV as advertised, but systematically ~9% low right at the design point, and ⟨σv⟩(15) = 2.475e-22 is 17.5% below the chapter's 3e-22.

Conclusion for (d): the T² fit is fine as a pedagogical device for the *scaling*
(it shows why pτ_E is nearly flat around 15 keV) but it must **not** be used to
generate the T²/⟨σv⟩ or pτ_E curves — it erases the minimum that the whole
chapter argument rests on, and its constant is 19% off the book's 8.3 atm·s.

## 3. Recommendation for the GUI

**Scheme: chapter-exact constants at the design point + raw Bosch–Hale for all curves.**

1. `CHAPTER_CONSTANTS = {T=15 keV, ⟨σv⟩=3e-22 m³/s, pτ_E=8.3 atm·s, Eq.5.37 coefficient 8.4e-12}` — a frozen dict used by "chapter mode" so Table 5.3 reproduces digit-for-digit. Chapter mode should not evaluate ⟨σv⟩(T) at all at the design point; it reads the constant.
2. `sigmav_dt(T)` = raw Bosch–Hale, used for every plotted curve (T²/⟨σv⟩, p(T), pτ_E(T)) and whenever the temperature slider leaves 15 keV.
3. Do **not** rescale Bosch–Hale by 1.0949 to force 3e-22 at 15 keV as the default; offer it as an optional "match chapter at 15 keV" toggle. Rescaling makes the two modes continuous and makes the pτ_E minimum 8.06 atm·s (vs 8.3), but it publishes a reactivity curve that is wrong by 9% everywhere, which is worse for an educational tool than a footnote.
4. Annotate the plots: mark 15 keV as "Freidberg design point" and 13.5 keV as "true minimum of T²/⟨σv⟩ (Bosch–Hale)", and show the 1%-flat band 12.2–15.1 keV. That turns the discrepancy into the lesson.

**Tradeoffs (3–4 sentences).** Rescaling buys exact continuity between chapter mode
and slider mode and hides an 8.7% jump at 15 keV, but it silently corrupts a
well-established reference curve and would mislead anyone reading ⟨σv⟩ off the
plot. Using raw Bosch–Hale keeps every plotted number defensible against the 1992
paper at the cost of a visible mismatch with the chapter's rounded 3e-22 and 8.3
atm·s. Freezing the chapter constants for Table 5.3 removes any pressure to bend
the physics fit, since exact table reproduction no longer depends on ⟨σv⟩(15).
The honest discrepancies are small and pedagogically useful (8.7% in ⟨σv⟩, 6.3%
in the pτ_E minimum, 1.5 keV in the optimum temperature), so display them rather
than tune them away.
