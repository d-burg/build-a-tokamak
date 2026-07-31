# Fusion Reactor Designer — Project Plan

An interactive, GUI-based reactor designer for undergraduates, explicitly implementing the
physics of Freidberg, *Plasma Physics and Fusion Energy*, **Chapter 5: "Design of a simple
magnetic fusion reactor"** (pp. 85–108).

Status: **PLAN (verified)** — physics chain independently reproduced from the PDF and
validated against Table 5.3 (see §8 and `reference/`).

---

## 1. Why this chapter works as an app

The chapter's central pedagogical point is that a fusion reactor design is *fully determined*
by 7 engineering / nuclear-physics constraints, with plasma physics entering only as
"demands" (β and τ_E) that come out at the end. The whole design is a closed algebraic
chain — no iteration, no solvers — so every parameter updates instantly as students move
constraint sliders. The app's job is to make the causality of that chain visible:

```
Constraints (Table 5.2)                    Design chain
──────────────────────────                 ─────────────────────────────────────────────
σ_sd = 1 barn, σ_br = 950 barn   ──────▶   blanket thickness  Δx ≈ 0.88 m → b = 1.2 m
B_max = 13 T, σ_max = 300 MPa    ──────▶   ξ = B²/4μ₀σ_max → coil thickness c(a)
min cost (V_I/P_E)  + b, ξ       ──────▶   optimum minor radius a = (1+ξ)/(2√ξ)·b
P_E = 1000 MW, P_W = 4 MW/m²     ──────▶   major radius R₀ = [En/(4π²η_t E_tot)]·P_E/(a·P_W)
⟨σv⟩ at T minimizing T²/⟨σv⟩     ──────▶   p = 7.2 atm, T = 15 keV, n = 1.5e20 m⁻³
p·τ_E ≥ 8.3 atm·s (ignition)     ──────▶   τ_E = 1.2 s
1/R field falloff                ──────▶   B₀ = (R₀−a−b)/R₀·B_max = 4.7 T → β = 8.2 %
```

Reference design point (Table 5.3) — the app's built-in regression test:
b = 1.2 m, c = 0.79 m, a = 2.0 m, R₀ = 5.0 m, A_p ≈ 400 m², V_p ≈ 400 m³,
power density 4.9 MW/m³, B₀ = 4.7 T, p = 7.2 atm, T = 15 keV, n = 1.5×10²⁰ m⁻³,
τ_E = 1.2 s, β = 8.2 %, V_I/P_E ≈ 1.2 m³/MW.

## 2. Product vision

Two linked modes, one screen:

- **Design Walk (guided)** — steps through the chapter's five design stages in order
  (blanket → coil+radius → R₀ → plasma parameters → β, τ_E), one card per stage with the
  governing equation, a short "why", and the live number. Ideal for first contact / lecture.
- **Explore (free play)** — all 7 constraint sliders live at once; the full reactor cross
  section and all outputs update instantly. Students answer "what if" questions
  (What does a 20 T HTS magnet buy you? Why does low σ_max blow up the coil? What happens
  at P_W = 1 MW/m²?).

Always visible:
- **Scale cross-section drawing** of the torus (plasma / blanket / coil, poloidal cut) that
  morphs live — the single most instructive element.
- **Outputs panel** = Table 5.3, with a "Δ vs textbook" indicator on every quantity.
- **Physics plots** (tabbed): cost curve V_I/P_E vs a with the optimum marked (Fig 5.8);
  neutron energy & flux attenuation through the blanket (Eqs 5.4, 5.9); B_φ ∝ 1/R across
  the device (Fig 5.10); T²/⟨σv⟩ vs T and ignition curve p·τ_E(T) with the operating point.

## 3. Tech stack & deployment (chosen for "easy for students")

| Choice | Decision | Why |
|---|---|---|
| App type | **Static single-page web app** | Students need only a URL — nothing to install, works on any laptop/tablet in the lecture hall |
| Framework | **React + TypeScript + Vite** | Modern UI, componentized cards/plots, types keep the physics honest |
| Physics | Pure TypeScript module `src/physics/` — zero UI deps | Unit-testable against Table 5.3; portable |
| Plots | Recharts (or lightweight d3 wrappers) + hand-rolled SVG for the reactor cross-section | Small bundle, crisp SVG |
| Tests | Vitest: Table 5.3 regression + guard-rail cases | Physics can never silently drift |
| Deploy | **GitHub Pages via Actions** (push → build → publish) | Free, zero-maintenance, stable URL for the syllabus |
| Offline fallback | `npm run build` emits a folder that also works from `file://` | For exam settings / no-wifi rooms |

No backend, no accounts, no data collection. State (slider values) encoded in the URL query
string so instructors can share exact scenarios as links ("open this link and explain why β
doubled").

## 4. Physics core (src/physics/)

- `constants.ts` — Table 5.2 defaults + fundamental constants; E_n = 14.1 MeV, E_α = 3.5 MeV,
  **E_Li = 4.8 MeV (E_tot = 22.4 MeV)**, η_t = 0.4 — verified to reproduce the chapter's
  0.04 / 0.79 / 1.58 coefficients. **1 atm ≡ 10⁵ Pa** (the chapter's "atm" is a bar; this is
  what makes σ_max = 300 MPa ≈ 3000 atm and the 8.4×10⁻¹² coefficient come out right).
- `blanket.ts` — Eqs 5.3–5.10: λ_sd, λ_br, E(x), Γ_n(x), Δx; b as user-adjustable with the
  chapter's b = 1.2 m default. **λ_sd is the slider (default 0.055 m), not σ_sd** — see §8
  (chapter's λ_sd is 4× off its own formula; 0.055 m is what reproduces Δx = 0.88 m).
- `coilAndCost.ts` — Eqs 5.13–5.31: ξ, c(a), V_I/P_E(a), optimum a, back-substituted c.
- `geometry.ts` — Eqs 5.20, 5.32–5.33: R₀, aspect ratio, A_p, V_p.
- `plasma.ts` — Eqs 5.34–5.43: power density, p(T, ⟨σv⟩), n, τ_E, B₀, β.
- `reactivity.ts` — ⟨σv⟩(T): Bosch–Hale 1992 D-T fit (coefficients validated, see §8).
  **Scheme:** the chapter's frozen constants (⟨σv⟩ = 3×10⁻²², pτ_E = 8.3 atm·s, T = 15 keV)
  drive the default design point, so Table 5.3 reproduces without evaluating the fit; raw
  Bosch–Hale drives every plotted curve and any off-15-keV slider position, with both
  15 keV ("Freidberg design point") and 13.5 keV ("true minimum") annotated. No rescaling.
  When the student slides T, ⟨σv⟩ **must** follow via Bosch–Hale (frozen ⟨σv⟩ makes
  p ∝ T monotone — wrong physics, erases the chapter's key argument for 15 keV).
- All equations implemented **symbolically** (from the general forms), never the chapter's
  rounded shortcut coefficients — so the app stays correct off the default design point.
  Note Eq. 5.30's denominator is (1−ξ^½)², not (1−ξ)² — easy misread, factor-1.8 error.
  Also: a depends only on b and ξ (P_E, P_W factor out of the minimization — P_E moves
  *only* R₀); B₀ uses R₀−a−b (inner coil face), not R₀−a−b−c.

**Guard rails** (verified numerically; surfaced as amber warnings/errors, never silent
clamps):
- *Hard:* ξ ≥ 1 → coil thickness diverges (B_max ≥ 38.8 T at σ_max = 300 MPa); any
  input ≤ 0; η_t ∉ (0,1].
- *Dominant warning:* R₀ − a − b ≤ 0 → B₀ ≤ 0, β blows up. At nominal settings this
  triggers for P_E < 640 MW, P_W > 6.2 MW/m², b > 1.5 m, B_max ≲ 9.5 T, or
  σ_max ≳ 430 MPa — well inside plausible slider ranges, so the warning must be
  prominent and β clamped from plots near the boundary.
- *Soft:* ξ > 0.5 (thin-coil stress model invalid, B_max > 27.5 T); β > 15%
  (unrealizable plasma); b < Δx (blanket thinner than required attenuation depth);
  R₀/a ≤ 1.
  These are teachable moments — each warning links to a one-line physics explanation.

## 5. UI design

Layout (desktop-first, responsive down to tablet):

```
┌────────────────────────────────────────────────────────────────┐
│  header: title · mode toggle (Walk ▸ Explore) · reset · share  │
├──────────────┬─────────────────────────────┬───────────────────┤
│ CONSTRAINTS  │   REACTOR CROSS-SECTION     │  OUTPUTS          │
│ 7 sliders    │   (live scale SVG,          │  Table-5.3 panel  │
│ w/ units +   │    poloidal cut + person    │  w/ Δ-vs-book     │
│ book default │    silhouette for scale)    │  badges           │
│ tick marks   │                             │                   │
├──────────────┴─────────────────────────────┴───────────────────┤
│  PLOTS (tabs): cost curve · blanket attenuation · B(R) · σv/T  │
└────────────────────────────────────────────────────────────────┘
```

Design language: clean modern (system font stack or Inter, generous whitespace, one accent
color, dark-mode aware). Every displayed quantity hover-reveals its governing equation
(KaTeX) and chapter equation number — the app constantly points back at the book.

## 6. Pedagogy features

- **"Why?" popovers** on each stage: 2–3 sentence explanation lifted from the chapter's logic
  (e.g. why B_c = B_max despite cost — the β difficulty argument, §5.5.3).
- **Δ-vs-textbook badges**: green at defaults; when a student moves a slider, every affected
  output shows direction + magnitude of change, making the dependency graph tangible.
- **Fission/fossil comparison card** (§5.5.4–5.5.5): surface-to-volume argument, 4.9 vs
  ~100 MW/m³ power density — one of the chapter's key takeaways.
- **Challenge presets** (URL-sharable): "HTS future" (B_max = 20 T), "conservative wall"
  (P_W = 1 MW/m²), "no-stress-limit fantasy", plus instructor-authorable via URL params.
- **Problem-set hooks**: presets matching end-of-chapter problems 5.1/5.3/5.5 contexts
  (e.g. elongation κ is out of scope for v1 but noted as an extension).

## 7. Milestones

1. **M0 — Physics core + tests** ✅ done 2026-07-31 (28 Vitest tests pin the TS port to the
   verified Python reference to 1e-8, plus Table 5.3 rounding bands and guard rails).
2. **M1 — Explore mode** ✅ done 2026-07-31: sliders, to-scale cross-section SVG (draws the
   "impossible machine" when R₀ < a+b+c so students see the inboard collision), outputs
   panel with book-reference column, dark mode. Run: `npm run dev`.
   **κ-elongation extension** ✅ derived (Problem 5.5 conventions, `reference/
   reactor_core_kappa.py` + `kappa_spec.md`) and integrated as a slider (0.5–2.5) on
   2026-07-31; unified κ-general code path reduces bit-exactly to circular at κ=1.
   Notable findings: Problem 5.5's printed perimeter formula is missing its square root
   (typo, +62% at κ=2 — corrected form used); A_P is exactly κ-independent; a κ↔1/κ
   duality makes κ=1 the cost optimum (a cusp — never spline through it); the model shows
   only geometric effects of elongation, and the in-app info note says so (the real β-limit
   motivation for κ>1 is deliberately absent from the chapter).
3. **M2 — Plots** ✅ done 2026-07-31: four tabs (cost optimum V_I/P_E(a), blanket
   attenuation E(x)/Γ(x), 1/R field profile, Bosch–Hale ignition pτ_E(T) with the
   operating point and both minima annotated). Hand-rolled SVG plots, no chart deps.
4. **M3 — Design Walk mode** ✅ done 2026-07-31: 7-step guided walk (premise → blanket →
   coil+cost → R₀ → burn → demands → fission/fossil perspective card), KaTeX equations.
5. **M4 — Polish & deploy** ✅ done 2026-07-31: 6 preset scenarios, URL-shareable state,
   README + docs/STUDENT_HANDOUT.md + docs/INSTRUCTOR_NOTES.md (Opus-agent written),
   MIT license, GitHub Actions CI (test + build + deploy).
   **Live at https://d-burg.github.io/build-a-tokamak/** (repo d-burg/build-a-tokamak;
   project renamed from fusion-reactor-designer to build-a-tokamak).

## 8. Verification results (from Opus 5 agents)

Reference implementations live in `reference/` (`reactor_core.py`, `verify.py`,
`physics_spec.md`, `reactivity.py`, `reactivity_validation.md`). These are the spec for the
TypeScript port and the source of the test-fixture numbers.

### 8.1 Design chain vs Table 5.3 (exact symbolic implementation, SI, E_Li = 4.8 MeV)

| Quantity | Chapter | Computed | Err | Cause |
|---|---|---|---|---|
| b | 1.2 m | 1.2 | — | input (chosen) |
| c | 0.79 m | 0.806 | +2.0% | book used rounded ξ = 0.11 |
| a | 2.0 m | 1.993 | −0.3% | ξ rounding |
| R₀ | 5.0 m | 5.000 | ~0 | — |
| A_p | ≈400 m² | 393 | −1.7% | book used a=2.0, R₀=5.0 |
| V_p | ≈400 m³ | 392 | −2.0% | same |
| Power density | 4.9 MW/m³ | 5.01 | +2.3% | book used V_p = 400 |
| B₀ | 4.7 T | 4.698 | ~0 | — |
| p | 7.2 atm | 7.30 | +1.4% | book used S = 4.9 |
| n | 1.5×10²⁰ | 1.54×10²⁰ | +2.6% | follows p |
| τ_E | 1.2 s | 1.137 | −5.3% | book: 8.3/7.2 = 1.15, rounded up |
| β | 8.2% | 8.43% | +2.8% | book carried rounded intermediates |
| Δx | 0.88 m | 0.884 | +0.5% | — |
| ξ | 0.11 | 0.1121 | +1.9% | book truncated |
| V_I/P_E | 1.2 m³/MW | 1.186 | −1.1% | — |

**Every disagreement is a chapter rounding artifact, not a model error** — proven by
re-running the chain with the book's rounded intermediates, which reproduces the book's
printed values (e.g. ξ=0.11 → a=2.008, c=0.793; p=7.2 & B₀=4.7 & atm=10⁵ Pa → β=8.19%).
The outputs panel will therefore show the *consistent* computed values with the Table 5.3
column alongside, and a footnote explaining the ≤5% rounding drift (τ_E worst). We do not
fake-round to match the book.

### 8.2 Chapter quirks the app must handle (worth telling students about)

1. **λ_sd factor-of-4:** the chapter states λ_sd = 1/(n_L σ_sd) ≈ 0.055 m, but
   1/(4.5×10²⁸ × 1 barn) = 0.222 m. Only 0.055 m reproduces the chapter's Δx = 0.88 m and
   the 0.79 m moderator/breeder boundary. The app uses λ_sd = 0.055 m as the slider default
   and shows the formula value as an aside.
2. **The chapter's "atm" is a bar** (10⁵ Pa): required by "300 MPa ≈ 3000 atm" and the
   8.4×10⁻¹² coefficient; the printed p = 7.2 atm implies 101 325 Pa. ~1.3% internal
   inconsistency; β is invariant to the choice, τ_E is not. App standardizes on 10⁵ Pa.
3. **8.4×10⁻¹² in Eq. 5.37 is not a constant** — it scales as √(power density) and is
   recomputed per design point (8.45×10⁻¹² at the nominal point with atm = 10⁵ Pa).
4. **b = 1.2 m is a designer's choice**, not the computed Δx = 0.88 m — the app keeps b as
   a free slider with Δx shown as the advisory "physics floor."

### 8.3 Reactivity ⟨σv⟩(T) (Bosch–Hale 1992, validated two independent ways)

- ⟨σv⟩(15 keV) = 2.740×10⁻²² m³/s — 8.7% below the chapter's rounded 3×10⁻²².
- min of T²/⟨σv⟩ at **13.54 keV**, flat to 1% over 12.2–15.1 keV → chapter's "15 keV" is a
  fair rounding of a very flat minimum (pressure penalty at 15 keV: 0.45%).
- Ignition curve pτ_E = 24T²/(⟨σv⟩E_α): minimum **8.83 atm·s at 13.5 keV** vs the book's
  8.3 (+6.3%). With the chapter's ⟨σv⟩ = 3×10⁻²²: 8.13 atm·s (−2%). All consistent at the
  rounding level.
- The simple ⟨σv⟩ ∝ T² approximation makes pτ_E exactly T-independent (9.86 atm·s) — shown
  optionally to explain *why* the curve is flat near 15 keV, never used for plots.
- Scheme (per §4): frozen chapter constants at the design point, raw Bosch–Hale curves,
  both minima annotated, discrepancies displayed honestly — they're pedagogically useful.

## 9. Open decisions for the instructor (user)

- Project name / repo host (assumed GitHub Pages; institutional hosting also fine since the
  build is static files).
- Whether to include the elongation-κ extension (Problem 5.5) as a v2 toggle.
- Chapter PDF is copyrighted (Cambridge UP) — the app will reference equation numbers and
  paraphrase, never embed the text/figures.
