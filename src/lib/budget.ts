// Budget roll-ups shared by the Plan tab, the record drafter and the library.
import { budgetCategoryLabel, toUsd } from './ekoa';
import type { BudgetCategory, BudgetLine, BudgetPathway } from './types';

export interface BudgetSummary {
  zeroCost: boolean;
  currency: string;
  planned: number;
  /** Sum of the lines that have an actual figure. */
  actual: number;
  /** Lines still waiting for an actual figure. */
  pending: number;
  usdPlanned: number;
  usdActual: number;
  byCategory: { category: BudgetCategory; planned: number; actual: number }[];
  text: string;
}

const money = (currency: string, n: number) => `${currency} ${Math.round(n).toLocaleString('en-GB')}`;

export function summariseBudget(pathways: BudgetPathway[], lines: BudgetLine[], fallbackCurrency = 'USD'): BudgetSummary {
  const zeroCost = pathways.some((p) => p.source_type === 'zero_cost');
  const currency = lines[0]?.currency ?? pathways[0]?.currency ?? fallbackCurrency;
  const planned = lines.reduce((s, l) => s + l.planned, 0);
  const actual = lines.reduce((s, l) => s + (l.actual ?? 0), 0);
  const pending = lines.filter((l) => l.actual === null).length;
  const cats = new Map<BudgetCategory, { planned: number; actual: number }>();
  for (const l of lines) {
    const c = cats.get(l.category) ?? { planned: 0, actual: 0 };
    c.planned += l.planned;
    c.actual += l.actual ?? 0;
    cats.set(l.category, c);
  }
  const byCategory = [...cats.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.planned - a.planned);
  const sources = [...new Set(pathways.filter((p) => p.source_type !== 'zero_cost').map((p) => p.source_type.replace(/_/g, ' ')))];
  let text: string;
  if (zeroCost && planned === 0) text = 'Zero-cost: no money was needed.';
  else if (!lines.length) text = 'Not recorded.';
  else {
    const top = byCategory.slice(0, 3).map((c) => budgetCategoryLabel(c.category).toLowerCase()).join(', ');
    const diff = actual - planned;
    const vs = pending
      ? `${money(currency, actual)} spent so far`
      : diff === 0
        ? `spent exactly as planned`
        : `${money(currency, actual)} spent, ${money(currency, Math.abs(diff))} ${diff > 0 ? 'over' : 'under'} plan`;
    text = `Planned ${money(currency, planned)} (about USD ${toUsd(planned, currency).toLocaleString('en-GB')}), mostly ${top}; ${vs}.${sources.length ? ` Funded by ${sources.join(' and ')}.` : ''}`;
  }
  return {
    zeroCost, currency, planned, actual, pending,
    usdPlanned: toUsd(planned, currency),
    usdActual: toUsd(pending ? planned : actual, currency),
    byCategory,
    text,
  };
}

/** Cost bands used by the library filter, in USD. */
export const COST_BANDS = [
  { key: 'zero', label: 'Zero-cost', test: (usd: number) => usd === 0 },
  { key: 'u100', label: 'Under USD 100', test: (usd: number) => usd > 0 && usd < 100 },
  { key: 'u500', label: 'USD 100–500', test: (usd: number) => usd >= 100 && usd < 500 },
  { key: 'o500', label: 'USD 500 or more', test: (usd: number) => usd >= 500 },
] as const;
