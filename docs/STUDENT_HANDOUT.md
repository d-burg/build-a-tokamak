# Build-a-Tokamak — student handout

<https://d-burg.github.io/build-a-tokamak/>

Companion to Freidberg, *Plasma Physics and Fusion Energy*, Ch. 5, "Design of a simple
magnetic fusion reactor" (pp. 85–108), and its Problem 5.5.

## The big idea

**A fusion reactor design is essentially fixed by seven engineering and nuclear
constraints; plasma physics does not get to choose anything — it arrives at the end of the
chain as a pair of demands, β and τ_E, that the plasma physicists are then told to
deliver.** This app makes that chain live: move a constraint, and every downstream number
and the drawing of the machine move with it.

## How to read the screen

- **Sliders (left).** The seven constraints: electric power P_E, neutron wall loading P_W,
  peak field at the coil B_max, allowable coil stress σ_max, blanket-and-shield thickness
  b, plasma temperature T, and elongation κ. Each has a tick at the textbook value; the
  set of ticks *is* Table 5.2, and it produces Table 5.3.
- **Reactivity toggle.** *Textbook* uses the chapter's frozen numbers (⟨σv⟩ = 3×10⁻²² m³/s
  at 15 keV, pτ_E = 8.3 atm·s) and locks T at 15 keV, because with ⟨σv⟩ frozen a T slider
  would be lying to you. *Bosch–Hale* uses the standard 1992 reactivity fit and unlocks T.
- **Cross-section (middle).** A true-to-scale poloidal cut: plasma, blanket-and-shield of
  thickness b, coil of thickness c, at major radius R₀. If the machine cannot close —
  the inboard blanket and coil overlapping the axis — it is drawn overlapping anyway.
  Believe the drawing, not your intuition.
- **Outputs (right).** The Table 5.3 quantities, each with the printed book value beside
  it and a Δ badge. Small disagreements at the default point are the *book's* rounding,
  not a bug; the app computes self-consistently instead of matching digits.
- **Warnings (top).** Physics guard rails, not error messages. Each one marks a place
  where the chapter's model breaks, and each is worth reading.
- **Plots (bottom tabs).** Cost per watt V_I/P_E against minor radius with the optimum
  marked (Fig. 5.8); neutron energy and flux through the blanket (Eqs. 5.4, 5.9); the
  1/R falloff of the toroidal field (Fig. 5.10); and the ignition requirement pτ_E(T).
- **Share.** The URL carries the whole design. Copy it into your write-up when a question
  asks you to report a machine.

## Five things to try

**(a) Push B_max up.** Watch the capital cost per watt V_I/P_E climb while β falls. The
chapter still chooses the highest field it can build. Why is it willing to pay? *Hint:*
β and τ_E are demands handed to the plasma physicist, and the chapter argues in §5.5.3
that a large cost premium is worth paying to make those demands easier. Decide for
yourself whether a factor of a few in cost buys enough β relief — and notice which of the
two you can actually buy with money.

**(b) Turn P_E down until the machine stops fitting together.** Somewhere between 500 and
1000 MW two different things break, at two different thresholds. Find both, and say in
words what each one is. *Hint:* the optimum minor radius a does not depend on P_E at all
(check this!), so shrinking P_E shrinks only R₀ — while a + b + c stays put. One of the
two failures makes B₀ meaningless; the other is invisible in every number the chapter
computes, because Eq. 5.42 never mentions c. Which quantity would you have to add to the
model to catch it?

**(c) Switch to Bosch–Hale and hunt for the best temperature.** The chapter picks 15 keV
because it minimizes T²/⟨σv⟩ and hence the plasma pressure. Slide T and find where the
real minimum sits. It is not at 15 keV. *Hint:* look at how *flat* the curve is on either
side before you conclude the book is wrong — quote a temperature range over which the
required pressure changes by less than 1%, and then defend "15 keV" in one sentence.

**(d) Set κ = 2.** The plasma is now twice as tall as it is wide. Note what happened to a,
to R₀, to β — and note what did *not* happen to the first-wall area A_P, which does not
move at all, to the last digit. Explain why it cannot move. *Hint:* work out A_P from
Eqs. 5.19 and 5.20 without ever mentioning the shape: what physically sets it? Then ask
what elongation is actually free to change, given that constraint. (Bonus: the cost curve
against κ has a *kink* at κ = 1, not a smooth minimum. Try κ = 0.5 versus κ = 2 and see
which outputs are identical.)

**(e) Read the power density.** This reactor runs at about 5 MW of fusion power per cubic
meter of plasma. A fission core runs near 100 MW/m³. Fusion is not the dense one. *Hint:*
a reactor's power comes out through its surface, and that surface is limited to P_W by
neutron damage — so what does a 20× lower power density force you to do to the volume,
and hence to R₀ and to the amount of steel, concrete and superconductor you buy per watt?
Say what that implies about the smallest sensible fusion power plant, and compare with
the size of a coal plant of the same output.

## What this model leaves out

Everything below is deliberately absent from Chapter 5, and none of it is small:

- **No plasma current and no MHD.** There is no safety factor q, no current profile, no
  disruptions, no vertical-stability system — and an elongated plasma is vertically
  unstable without one.
- **No Troyon β limit.** Here β is an *output*, computed from B_max and P_W. A real design
  compares it with an achievable limit (the chapter's own Problem 5.3 imposes
  β = 0.12 a/R₀); this app cannot show you the β-limit benefit that is the actual
  motivation for elongating a tokamak.
- **No divertor, no exhaust, no impurities.** Helium ash, radiated power and the
  power-handling problem at the strike point — arguably the hardest engineering problem
  in the field — simply do not appear.
- **Thin-shell stress only.** The coil is treated as a membrane in pure tension. Real
  coils bend, which is why they are D-shaped; the model therefore *under*-estimates the
  structural cost of a flat-sided, elongated coil.
- **One-dimensional neutronics.** Exponential attenuation along the wall normal, one
  slowing-down length, one breeding cross-section. No transport calculation, no tritium
  breeding-ratio accounting, no penetrations or ports.
- **τ_E is a demand, not a prediction.** It comes from an ignition requirement, not from a
  confinement scaling law, so nothing here tells you whether the plasma will actually
  confine that well.
