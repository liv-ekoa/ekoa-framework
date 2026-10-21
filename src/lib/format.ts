const DAY = 86_400_000;

export const fmtDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-GB', opts) : '—';
export const fmtShort = (iso: string | null | undefined) => fmtDate(iso, { day: 'numeric', month: 'short' });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const daysBetween = (a: string, b: string | null = null) =>
  Math.round(((b ? new Date(b).getTime() : Date.now()) - new Date(a).getTime()) / DAY);
export const daysUntil = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : null);

export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : n.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export const relative = (iso: string) => {
  const d = daysBetween(iso);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  const m = Math.round(d / 30);
  return m === 1 ? 'a month ago' : `${m} months ago`;
};

export const initials = (name: string) =>
  name
    .replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
