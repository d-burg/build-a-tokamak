# Instructor notes

Companion to Freidberg Ch. 5 (pp. 85–108) and Problem 5.5. See `README.md` for the physics
conventions and `docs/STUDENT_HANDOUT.md` for the student-facing page.

## Sharing scenarios by URL

The whole design state lives in the query string — one parameter per slider (`PE`, `PW`,
`Bmax`, `sigmaMax`, `b`, `T`, `kappa`) plus the reactivity model (`model=chapter` or
`model=boschHale`). Set the sliders, use Share to copy the link, and paste it into the
syllabus, the problem set or the lecture slide. Anything omitted falls back to the
Table 5.2 default, so a one-parameter link like `?Bmax=20` is a legitimate assignment.
Useful starting points: `?Bmax=20` (an HTS machine), `?PW=1` (a conservative first wall),
`?sigmaMax=800` (a near-fantasy structural limit — note it makes the bore *close*, which
students find counter-intuitive), `?PE=500` (a machine that does not fit together),
`?kappa=2` (Problem 5.5), `?model=boschHale&T=13.5` (the true reactivity optimum).

## What the guard rails are for

Each is a teaching moment, not an error handler. None of them silently clamps a value.

- **ξ = B²_max/(4μ₀σ_max) ≥ 1** (fatal; B_max ≥ 38.8 T at 300 MPa, 22.4 T at 100 MPa) —
  the coil cannot hold its own magnetic force at any thickness. This is the hard ceiling
  on magnetic fusion, and it is set by materials, not plasma physics.
- **ξ > 0.5** (B_max > 27.5 T at 300 MPa) — the thin-shell tension model is outside its
  calibration; c exceeds a + b. Teaches that the chapter's stress estimate has a domain.
- **R₀ − a − b ≤ 0** (below ~640 MW at nominal settings) — bore closure. The dominant
  practical rail: because a is fixed by b and ξ while R₀ ∝ P_E, making the machine
  *smaller* is what breaks it. B₀ goes to zero and β diverges just before the crossing.
- **R₀ − a − b − c ≤ 0** (below ~800 MW at nominal) — the inboard coil leg itself does not
  fit, yet Eq. 5.42 never mentions c, so nothing in the chapter's chain notices. The best
  single illustration of a model being silently wrong. The textbook design clears this by
  only about a meter.
- **b < Δx = 0.88 m** — the blanket is thinner than the moderating-plus-breeding depth
  the chapter's own Eq. 5.10 requires; neutrons reach the magnets.
- **β > 15%** — the design is asking the plasma physicists for something no configuration
  has delivered. Pair with exercise (a).
- **κ outside 0.5–2.5** — beyond Problem 5.5's range the perimeter approximation and the
  flat-side stress model both degrade.
- **κ ≠ 1 scope note** (always on) — states what the elongation model does and does not
  contain. Do not let κ results be quoted without it.

The cross-section keeps drawing when a rail fires, overlapping regions and all, so the
failure is visual before it is verbal.

## Δ-vs-book badges

Every output carries the printed Table 5.3 value and the deviation from it. The point is
twofold: at the default settings the badges show the *book's* rounding drift (≤3%
everywhere except τ_E at about −6.5%, because the text took 8.3/7.2 = 1.15 and rounded up
to 1.2), which is a useful lesson in error propagation through a hand calculation; and as
soon as a slider moves, the badges become a live picture of the dependency graph — which
outputs responded, which did not, and by how much. Ask students to predict the sign before
they move the slider. The invariances are as instructive as the responses: a and c do not
depend on P_E or P_W at all, and A_P does not depend on κ.

## Chapter inconsistencies the app deliberately surfaces

| Item | The book | The app's resolution |
|---|---|---|
| λ_sd | states 1/(n_L σ_sd) ≈ 0.055 m; the formula gives 0.222 m (factor 4) | uses 0.055 m, which alone reproduces Δx = 0.88 m and the 0.79 m boundary; shows the formula value as an aside |
| "atm" | 300 MPa ≈ 3000 atm and the 8.4×10⁻¹² coefficient need 10⁵ Pa; p = 7.2 atm implies 101 325 Pa | standardizes on 1 atm = 10⁵ Pa, notes the ~1.3% inconsistency; β is invariant, τ_E is not |
| 8.4×10⁻¹², Eq. 5.37 | printed as a constant | recomputed per design point; it scales as √S_pd |
| Eq. 5.30 denominator | (1 − ξ^{1/2})², easily misread as (1 − ξ)² | uses the correct form; the misreading costs a factor 1.8 |
| b = 1.2 m | presented alongside Δx = 0.88 m | kept as a free slider, with Δx drawn as the advisory floor |
| ⟨σv⟩ = 3×10⁻²², 15 keV, pτ_E = 8.3 atm·s | rounded constants | frozen in Textbook mode; Bosch–Hale mode shows ⟨σv⟩(15 keV) = 2.74×10⁻²² (−8.7%) and the true T²/⟨σv⟩ minimum at 13.5 keV |
| Problem 5.5 perimeter | 2πa(1+κ²)/2, missing the square root (+62% at κ = 2) | uses 2πa[(1+κ²)/2]^{1/2}, which is within 2.6% of the exact ellipse perimeter over 0.5 ≤ κ ≤ 2 |
| Table 5.3 | rounded intermediates carried forward | self-consistent values shown beside the printed column; no fake rounding |

## Suggested lecture flow (Design Walk mode)

Design Walk steps through the chapter's five stages, one card each, with the governing
equation and the live number. A 50-minute session that has worked:

1. **Blanket** (Eqs. 5.3–5.11) — attenuation and breeding fix Δx ≈ 0.88 m; note that
   b = 1.2 m is a *choice*, and let one student argue for 1.5 m.
2. **Coil and minor radius** (Eqs. 5.12–5.31) — introduce ξ, then the cost minimization.
   Stop on the result that a depends only on b and ξ; ask what that means before advancing.
3. **Major radius** (Eq. 5.20) — the wall-load limit sets the first-wall area outright,
   and hence R₀. Good place to raise P_W and watch the machine shrink into failure.
4. **Plasma** (Eqs. 5.34–5.38) — power density, then p, then n. Switch to Bosch–Hale here
   and let the class find 13.5 keV.
5. **The demands** (Eqs. 5.39–5.43) — β and τ_E arrive last. Close by sweeping B_max and
   asking whether the chapter's choice is defensible (§5.5.3), then run κ = 2 with the
   scope note on screen: five percent more capital cost for half the β demand, in a model
   that structurally cannot show the real reason tokamaks are elongated.

Then hand out the five exercises and switch to Explore mode.
