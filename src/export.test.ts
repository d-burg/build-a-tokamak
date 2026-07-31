import { describe, expect, it } from 'vitest';
import { design } from './physics/design';
import { DEFAULTS } from './physics/constants';
import { buildReport, reportFilename } from './export';

describe('design report export', () => {
  const when = new Date('2026-07-31T12:00:00Z');
  const url = 'https://d-burg.github.io/build-a-tokamak/?Bmax=13';

  it('contains inputs, key outputs, status, share URL, and JSON', () => {
    const r = design({ ...DEFAULTS, model: 'chapter' });
    const md = buildReport(r, url, when);
    expect(md).toContain('# Build-a-Tokamak design report');
    expect(md).toContain(url);
    expect(md).toContain('Electric power output P_E: 1000 MW');
    expect(md).toContain('Major radius R₀');
    expect(md).toContain('| 5'); // R0 = 5 m
    expect(md).toContain('All constraints satisfied');
    expect(md).toContain('"R0": 4.9998'); // JSON block carries full precision
    expect(md).toContain('```json');
  });

  it('lists warnings when present', () => {
    const r = design({ ...DEFAULTS, PE: 500, model: 'chapter' });
    const md = buildReport(r, url, when);
    expect(md).toContain('**ERROR**');
    expect(md).toContain('inboard blanket and coil do not fit');
    expect(md).not.toContain('All constraints satisfied');
  });

  it('filename is date-stamped markdown', () => {
    expect(reportFilename(when)).toMatch(/^build-a-tokamak_2026-07-31_\d{4}\.md$/);
  });
});
