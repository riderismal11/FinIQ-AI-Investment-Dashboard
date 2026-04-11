export function formatCurrency(value: number, opts?: { compact?: boolean; maxFractionDigits?: number }) {
  const compact = opts?.compact ?? false;
  const maxFractionDigits = opts?.maxFractionDigits ?? (compact ? 1 : 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: maxFractionDigits,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, digits = 1, withSign = false) {
  const n = Number.isFinite(value) ? value : 0;
  const sign = withSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function compactLabel(value: string, max = 12) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

