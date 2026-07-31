# Build-a-Tokamak

An interactive, browser-based reactor designer that implements the full design chain of
J. P. Freidberg, *Plasma Physics and Fusion Energy* (Cambridge, 2007), Chapter 5,
"Design of a simple magnetic fusion reactor" (pp. 85–108), including the elongation (κ)
extension posed by that chapter's Problem 5.5. Students move seven engineering and
nuclear-physics constraints and watch a complete reactor — geometry, fields, plasma
pressure, β, τ_E and capital cost per watt — follow from them algebraically, with no
solvers and no iteration. The chapter's own Table 5.3 design point is the app's default
and its regression test.

## Quick start (students)

<https://d-burg.github.io/build-a-tokamak/>

Nothing to install. See [`docs/STUDENT_HANDOUT.md`](docs/STUDENT_HANDOUT.md) for a
one-page orientation and five suggested exercises.

## Running locally

```sh
npm install
npm run dev     # Vite dev server
npm test        # 35 Vitest regression tests against the verified reference
npm run build   # type-check + static build into dist/
```

`dist/` is fully self-contained (`base: './'` in `vite.config.ts`), so it also opens
directly from `file://` for rooms without wifi.

## Physics fidelity

The chain is implemented **symbolically** from the chapter's general equations, never
from its rounded shortcut coefficients, so it stays correct off the design point.
Conventions that had to be pinned down, and the chapter quirks the app surfaces rather
than hides:

- **1 atm ≡ 10⁵ Pa.** The chapter's "atm" is a bar: this is what makes "σ_max = 300 MPa
  ≈ 3000 atm" and the 8.4×10⁻¹² coefficient of Eq. 5.37 come out. The printed p = 7.2 atm
  implies the SI atmosphere instead — an internal inconsistency of about 1.3%. β is
  invariant under the choice; τ_E is not.
- **E_Li = 4.8 MeV** (E_tot = E_α + E_n + E_Li = 22.4 MeV) reproduces the chapter's 0.04,
  0.79 and 1.58 coefficients (Eqs. 5.20, 5.21, 5.30) to 0.3%.
- **λ_sd = 0.055 m.** The chapter states λ_sd = 1/(n_L σ_sd) ≈ 0.055 m, but that formula
  gives 0.222 m — a factor-4 inconsistency. Only 0.055 m reproduces both published
  neutronics numbers (Δx = 0.88 m and the 0.79 m moderator/breeder boundary), so it is
  the value used; the formula value is shown as an aside.
- **Eq. 5.30's denominator is (1 − ξ^{1/2})², not (1 − ξ)².** Misreading it gives
  0.66 m³/MW instead of 1.19 — a factor 1.8.
- **Problem 5.5's printed perimeter formula is missing its square root**; the app uses
  C = 2πa[(1+κ²)/2]^{1/2}, which is within 2.6% of the exact ellipse perimeter over
  0.5 ≤ κ ≤ 2 (the printed form is 62% high at κ = 2).
- **Book-rounding drift.** Computing consistently does not reproduce Table 5.3
  digit-for-digit. Every output lands within 3% of the printed value except τ_E, which
  reads 1.12 s against the book's 1.2 s (the book took 8.3/7.2 = 1.15 and rounded up).
  Each disagreement was traced to a specific rounded intermediate in the text — e.g.
  ξ = 0.11 reproduces the printed a = 2.0 and c = 0.79; V_P = 400 m³ reproduces
  S_pd = 4.9 MW/m³; carrying p = 7.2 atm forward reproduces β = 8.2%. The app shows the
  self-consistent numbers next to a Table 5.3 reference column and explains the gap.
  It does not fake-round to match.
- **Reactivity scheme.** *Textbook* mode uses the chapter's frozen constants
  (T = 15 keV, ⟨σv⟩ = 3×10⁻²² m³/s, pτ_E = 8.3 atm·s) so Table 5.3 reproduces without
  evaluating any fit, and the T slider is locked. *Bosch–Hale* mode (Nucl. Fusion 32
  (1992) 611) drives ⟨σv⟩(T) for every curve and every off-15-keV slider position:
  ⟨σv⟩(15 keV) = 2.740×10⁻²² m³/s, 8.7% below the chapter's round number, with the
  minimum of T²/⟨σv⟩ at 13.54 keV and flat to 1% over 12.2–15.1 keV. The fit is never
  rescaled to match the book; the discrepancy is displayed, because it is the lesson.
  Freezing ⟨σv⟩ while sliding T would make p ∝ T monotone — wrong physics — so the
  temperature slider is only live in Bosch–Hale mode.
- **κ model scope.** Elongation is implemented per Problem 5.5's own conventions
  (elliptical plasma with semi-axes (a, κa); constant blanket and coil thicknesses; the
  "flattened side" stress hint). It therefore captures only the *geometric* consequences
  of elongation. A_P is exactly κ-independent; the cost optimum sits at κ = 1 and it is a
  cusp, not a smooth minimum; the κ ↔ 1/κ duality leaves everything but B₀ and β
  invariant. The real motivation for κ > 1 — the Troyon-type β limit and the plasma
  current — is structurally absent from this chapter, and the app says so on screen
  whenever κ ≠ 1.

## Architecture

```
src/physics/     pure TypeScript, zero UI dependencies
  constants.ts     Table 5.2 defaults, energetics, frozen chapter constants, Table 5.3
  blanket.ts       Eqs. 5.3–5.11  (attenuation, Δx, moderator/breeder boundary)
  coilAndCost.ts   Eqs. 5.12–5.31 (ξ, c, optimum a, V_I/P_E), κ-general
  geometry.ts      Eqs. 5.15, 5.20, 5.32–5.33 (R₀, A_P, V_P, V_I)
  plasma.ts        Eqs. 5.34–5.43 (S_pd, p, n, τ_E, B₀, β)
  reactivity.ts    Bosch–Hale ⟨σv⟩(T) and the ignition curve pτ_E(T)
  design.ts        the ordered chain + guard rails, returns outputs and notes
src/components/  sliders, to-scale cross-section SVG, outputs panel, notes bar
reference/       the verified Python reference and the specs written against the chapter
```

`reference/reactor_core.py`, `reactor_core_kappa.py` and `verify.py` are the spec; the
TypeScript port is pinned to them by `src/physics/design.test.ts` to a relative tolerance
of 1e-8, plus Table 5.3 rounding bands, the κ ↔ 1/κ duality, and each guard rail. The
markdown specs `reference/physics_spec.md`, `kappa_spec.md` and `reactivity_validation.md`
document every equation, discrepancy and verification number. Change the physics only with
the tests in front of you; if a fixture has to move, the reference must move first.

Guard rails are surfaced as notes, never as silent clamps: ξ ≥ 1 (coil cannot support
itself) is fatal; bore closure R₀ − a − b ≤ 0, the inboard coil leg not fitting
(R₀ − a − b − c ≤ 0), b < Δx, ξ > 0.5, β > 15%, aspect ratio ≤ 1 and κ outside 0.5–2.5 are
warnings. The cross-section deliberately draws the impossible machine so the collision is
visible.

## Deployment

Static build, published to GitHub Pages by a GitHub Actions workflow: on push to `main`,
`npm ci && npm run build`, upload `dist/` as the Pages artifact, deploy. Set
Settings → Pages → Source to "GitHub Actions". No backend, no accounts, no analytics, no
data collection; all state lives in the URL query string.

## License and attribution

Application code: MIT. The physics is Freidberg, *Plasma Physics and Fusion Energy*,
Cambridge University Press, 2007, Ch. 5 — **cited, not reproduced**. No chapter text,
tables or figures are embedded; the app refers to equation numbers and paraphrases the
argument in its own words. Table 5.3 reference values appear only as the handful of
numerical results needed for comparison. Instructors distributing this alongside the book
should keep it that way.
