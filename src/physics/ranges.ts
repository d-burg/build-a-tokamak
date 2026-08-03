import { DEFAULTS } from './constants';

/**
 * Single source of truth for the allowed range of every input.
 * Used both by the sliders and by the URL parser, so a hand-edited or stale
 * share link can never inject a value the sliders could not produce (an
 * out-of-range value can drive the model to non-finite geometry).
 */
export interface RangeSpec {
  key: keyof typeof DEFAULTS;
  label: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

export const RANGES: RangeSpec[] = [
  { key: 'PE', label: 'Electric power output', symbol: 'P_E', unit: 'MW', min: 300, max: 3000, step: 25 },
  { key: 'PW', label: 'Max neutron wall loading', symbol: 'P_W', unit: 'MW/m²', min: 1, max: 8, step: 0.1 },
  { key: 'Bmax', label: 'Max field at the coil', symbol: 'B_max', unit: 'T', min: 5, max: 25, step: 0.1 },
  { key: 'sigmaMax', label: 'Max coil stress', symbol: 'σ_max', unit: 'MPa', min: 100, max: 800, step: 10 },
  { key: 'b', label: 'Blanket + shield thickness', symbol: 'b', unit: 'm', min: 0.6, max: 2.0, step: 0.02 },
  { key: 'T', label: 'Plasma temperature', symbol: 'T', unit: 'keV', min: 5, max: 30, step: 0.1 },
  { key: 'kappa', label: 'Plasma elongation', symbol: 'κ', unit: '', min: 0.5, max: 2.5, step: 0.05 },
];

const BY_KEY = new Map(RANGES.map((r) => [r.key, r]));

/** Clamp one input to its slider range; falls back to the default if unusable. */
export function clampInput(key: keyof typeof DEFAULTS, value: number): number {
  const spec = BY_KEY.get(key);
  if (!spec) return value;
  if (!Number.isFinite(value)) return DEFAULTS[key];
  return Math.min(spec.max, Math.max(spec.min, value));
}
