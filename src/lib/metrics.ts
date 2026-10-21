import { metricByCode } from './ekoa';
import type { Measurement, MetricDefinition, Organisation, ProjectMetric } from './types';

/** Turn raw inputs into the metric's normalised value, using the school's enrolment where needed. */
export function computeValue(code: string, raw: Record<string, number>, org: Organisation | null): number | null {
  const students = org?.student_count ?? 0;
  const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);
  switch (code) {
    case 'waste_per_student':
      return students && raw.school_days ? (raw.total_kg * 1000) / students / raw.school_days : null;
    case 'diversion_rate':
      return pct(raw.diverted_kg, raw.total_kg);
    case 'compost_contamination':
      return pct(raw.contaminant_kg, raw.sample_kg);
    case 'segregation_accuracy':
      return pct(raw.correct, raw.checked);
    case 'single_use_plastic':
      return raw.items ?? null;
    case 'canteen_waste_per_meal':
      return raw.meals ? (raw.food_kg * 1000) / raw.meals : null;
    case 'energy_per_student':
      return students ? raw.kwh / students : null;
    case 'renewable_share':
      return pct(raw.renewable_kwh, raw.total_kwh);
    case 'water_per_student':
      return students && raw.school_days ? raw.litres / students / raw.school_days : null;
    case 'participation':
      return pct(raw.classes_engaged, raw.classes_total);
    case 'cost':
      return raw.local_amount ?? null;
    default:
      return null;
  }
}

export const shortUnit = (m: MetricDefinition | undefined) => {
  if (!m) return '';
  if (m.unit.startsWith('%')) return '%';
  if (m.unit.startsWith('g per')) return 'g';
  return '';
};

export function formatMetric(code: string, value: number | null | undefined) {
  const m = metricByCode(code);
  if (value === null || value === undefined) return '—';
  const digits = Math.abs(value) < 10 && !m?.unit.startsWith('%') ? 1 : 0;
  const n = value.toLocaleString('en-GB', { maximumFractionDigits: digits });
  return m?.unit.startsWith('%') ? `${n}%` : n;
}

export interface Series {
  code: string;
  def: MetricDefinition | undefined;
  points: { date: string; value: number; tier: number; baseline: boolean }[];
  baseline: number | null;
  target: number | null;
  latest: number | null;
  change: number | null; // signed change from baseline in the metric's own unit
  improving: boolean | null;
  progress: number | null; // 0..1 share of the way from baseline to target
}

export function seriesFor(projectId: string, code: string, ms: Measurement[], targets: ProjectMetric[]): Series {
  const def = metricByCode(code);
  const pts = ms
    .filter((m) => m.project_id === projectId && m.metric_code === code)
    .sort((a, b) => a.period_end.localeCompare(b.period_end))
    .map((m) => ({ date: m.period_end, value: m.value, tier: m.tier, baseline: m.is_baseline }));
  const t = targets.find((x) => x.project_id === projectId && x.metric_code === code);
  const baseline = t?.baseline ?? pts.find((p) => p.baseline)?.value ?? null;
  const target = t?.target ?? null;
  const nonBase = pts.filter((p) => !p.baseline);
  const latest = nonBase.length ? nonBase[nonBase.length - 1].value : null;
  const change = latest !== null && baseline !== null ? latest - baseline : null;
  const improving = change === null || !def ? null : def.higher_is_better ? change > 0 : change < 0;
  const progress =
    latest !== null && baseline !== null && target !== null && target !== baseline
      ? Math.max(0, Math.min(1, (latest - baseline) / (target - baseline)))
      : null;
  return { code, def, points: pts, baseline, target, latest, change, improving, progress };
}

/** Share of weeks since the project started that have at least one measurement. */
export function completeness(projectId: string, ms: Measurement[], startedOn: string) {
  const weeks = Math.max(1, Math.floor((Date.now() - new Date(startedOn).getTime()) / (7 * 86_400_000)));
  const logged = new Set(
    ms.filter((m) => m.project_id === projectId).map((m) => Math.floor((new Date(m.period_end).getTime() - new Date(startedOn).getTime()) / (7 * 86_400_000))),
  );
  return Math.min(1, logged.size / weeks);
}
