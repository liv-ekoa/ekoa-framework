import type { ContextProfile } from './types';

const BUDGET = { zero: 0, low: 1, medium: 2, high: 3 } as const;

/** 0..1 similarity between two school contexts. Used to rank "similar context" records. */
export function similarity(a: ContextProfile | null | undefined, b: ContextProfile | null | undefined): number {
  if (!a || !b) return 0;
  let score = 0;
  let weight = 0;
  const add = (w: number, s: number) => {
    score += w * s;
    weight += w;
  };
  add(3, a.climate_zone === b.climate_zone ? 1 : a.climate_zone.split(' ')[0] === b.climate_zone.split(' ')[0] ? 0.5 : 0);
  add(2, 1 - Math.abs(BUDGET[a.budget_band] - BUDGET[b.budget_band]) / 3);
  add(2, a.size_band === b.size_band ? 1 : 0.4);
  add(1, a.curriculum === b.curriculum ? 1 : 0);
  add(2, a.waste_contractor.split(',')[0] === b.waste_contractor.split(',')[0] ? 1 : 0.3);
  const shared = a.infrastructure.filter((x) => b.infrastructure.includes(x)).length;
  add(1, a.infrastructure.length ? shared / a.infrastructure.length : 0);
  add(1, 1 - Math.min(1, Math.abs(a.governance_chain_length - b.governance_chain_length) / 4));
  return weight ? score / weight : 0;
}

export function contextDifferences(a: ContextProfile, b: ContextProfile): Record<string, string> {
  const out: Record<string, string> = {};
  if (a.climate_zone !== b.climate_zone) out.climate = `${b.climate_zone} here, ${a.climate_zone} there`;
  if (a.budget_band !== b.budget_band) out.budget = `${b.budget_band} budget here, ${a.budget_band} there`;
  if (a.size_band !== b.size_band) out.size = `${b.size_band} students here, ${a.size_band} there`;
  if (a.waste_contractor !== b.waste_contractor) out.contractor = `${b.waste_contractor} here; ${a.waste_contractor} there`;
  if (a.governance_chain_length !== b.governance_chain_length)
    out.governance = `${b.governance_chain_length}-step approval chain here, ${a.governance_chain_length} there`;
  return out;
}
