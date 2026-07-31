import type { DesignResult } from './physics/types';
import { TABLE_5_3 } from './physics/constants';
import { fmt } from './format';

/**
 * Self-contained Markdown report of the current design state: inputs,
 * outputs vs Table 5.3, active warnings, the share URL that reproduces the
 * state, and a machine-readable JSON block. Suitable for problem-set
 * submissions.
 */
export function buildReport(result: DesignResult, shareUrl: string, when: Date): string {
  const { inputs, out, notes } = result;
  const T = inputs.model === 'chapter' ? 15 : inputs.T;

  const inputRows: Array<[string, string]> = [
    ['Electric power output P_E', `${inputs.PE} MW`],
    ['Max neutron wall loading P_W', `${inputs.PW} MW/m²`],
    ['Max field at the coil B_max', `${inputs.Bmax} T`],
    ['Max coil stress σ_max', `${inputs.sigmaMax} MPa`],
    ['Blanket + shield thickness b', `${inputs.b} m`],
    ['Plasma temperature T', `${T} keV`],
    ['Plasma elongation κ', `${inputs.kappa}`],
    ['Reactivity model', inputs.model === 'chapter'
      ? 'chapter (⟨σv⟩ = 3×10⁻²² m³/s, pτ_E = 8.3 atm·s at 15 keV)'
      : 'Bosch–Hale 1992 ⟨σv⟩(T)'],
  ];

  const outRows: Array<[string, string, string]> = [
    ['Minor radius a', `${fmt(out.a)} m`, `${TABLE_5_3.a}`],
    ['Plasma half-height κa', `${fmt(out.aVertical)} m`, `${TABLE_5_3.a}`],
    ['Coil thickness c', `${fmt(out.c)} m`, `${TABLE_5_3.c}`],
    ['Major radius R₀', `${fmt(out.R0)} m`, `${TABLE_5_3.R0}`],
    ['Aspect ratio R₀/a', fmt(out.aspectRatio), `${TABLE_5_3.aspectRatio}`],
    ['Wall area A_P', `${fmt(out.AP)} m²`, `≈${TABLE_5_3.AP}`],
    ['Plasma volume V_P', `${fmt(out.VP)} m³`, `≈${TABLE_5_3.VP}`],
    ['Required moderator depth Δx', `${fmt(out.deltaX)} m`, `${TABLE_5_3.deltaX}`],
    ['Stress parameter ξ', fmt(out.xi), `${TABLE_5_3.xi}`],
    ['Field on axis B₀', `${fmt(out.B0)} T`, `${TABLE_5_3.B0}`],
    ['Nuclear island volume V_I/P_E', `${fmt(out.VIoverPE)} m³/MW`, `${TABLE_5_3.VIoverPE}`],
    ['Power density S', `${fmt(out.Spd)} MW/m³`, `${TABLE_5_3.Spd}`],
    ['Pressure p', `${fmt(out.p)} atm`, `${TABLE_5_3.p}`],
    ['Density n', `${fmt(out.n)} m⁻³`, '1.5×10²⁰'],
    ['Temperature T', `${T} keV`, `${TABLE_5_3.T}`],
    ['Confinement time τ_E', `${fmt(out.tauE)} s`, `${TABLE_5_3.tauE}`],
    ['Plasma beta β', `${fmt(out.beta * 100)} %`, `${TABLE_5_3.beta * 100}`],
  ];

  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length));

  const lines: string[] = [
    '# Build-a-Tokamak design report',
    '',
    `- Generated: ${when.toISOString()}`,
    `- Reproduce this state: ${shareUrl}`,
    '- Model: Freidberg, *Plasma Physics and Fusion Energy*, Ch. 5 (conventions:',
    '  1 atm = 10⁵ Pa, E_Li = 4.8 MeV, λ_sd = 0.055 m; "book" column is Table 5.3,',
    '  printed for the circular κ = 1 design — differences ≤ ~7% at the textbook',
    '  point are the book\'s own rounding).',
    '',
    '## Constraints (inputs)',
    '',
    ...inputRows.map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Design outputs',
    '',
    `| ${pad('Quantity', 30)} | ${pad('Computed', 16)} | Book (κ=1) |`,
    `| ${'-'.repeat(30)} | ${'-'.repeat(16)} | ---------- |`,
    ...outRows.map(([k, v, bk]) => `| ${pad(k, 30)} | ${pad(v, 16)} | ${bk} |`),
    '',
    '## Status',
    '',
    ...(notes.length === 0
      ? ['All constraints satisfied — the design is self-consistent.']
      : notes.map((n) => `- **${n.severity.toUpperCase()}**: ${n.message}`)),
    '',
    '## Machine-readable',
    '',
    '```json',
    JSON.stringify({ generated: when.toISOString(), inputs, outputs: out }, null, 2),
    '```',
    '',
  ];
  return lines.join('\n');
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function reportFilename(when: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `build-a-tokamak_${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(
    when.getDate(),
  )}_${p(when.getHours())}${p(when.getMinutes())}.md`;
}
