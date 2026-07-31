const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};

function sup(n: number): string {
  return String(n).split('').map((ch) => SUPERSCRIPTS[ch] ?? ch).join('');
}

/** "1.54×10²⁰"-style formatting; em dash for non-finite values. */
export function fmt(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e4 || abs < 1e-2) {
    const exp = Math.floor(Math.log10(abs));
    const mant = v / 10 ** exp;
    return `${mant.toPrecision(digits)}×10${sup(exp)}`;
  }
  return String(Number(v.toPrecision(digits)));
}
