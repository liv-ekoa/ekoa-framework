// Policy areas, used to filter the Policy library. A policy's area is guessed from its words.

export type Area = 'waste' | 'energy' | 'water' | 'food' | 'procurement' | 'biodiversity' | 'transport' | 'learning' | 'governance';

export const AREA_LABEL: Record<Area, string> = {
  waste: 'Waste', energy: 'Energy', water: 'Water', food: 'Food', procurement: 'Buying and supplies',
  biodiversity: 'Biodiversity', transport: 'Transport', learning: 'Teaching and learning', governance: 'Governance and continuity',
};

const WORDS: [Area, RegExp][] = [
  ['waste', /\b(waste|recycl\w*|compost\w*|plastic|landfill|litter|bins?)\b/g],
  ['energy', /\b(energy|electric\w*|solar|lighting|lights|power|carbon|emissions?)\b/g],
  ['water', /\b(water|rain\w*|taps?|leaks?|irrigation)\b/g],
  ['food', /\b(food|canteen|cafeteria|meals?|menu|kitchen)\b/g],
  ['procurement', /\b(procurement|purchas\w*|suppliers?|buying|vendors?|paper)\b/g],
  ['biodiversity', /\b(biodiversity|trees?|garden\w*|plants?|habitats?|wildlife|native)\b/g],
  ['transport', /\b(transport|travel|bus(es)?|cycl\w*|walk\w*|vehicles?|car\s?pool\w*)\b/g],
  ['learning', /\b(curriculum|lessons?|teach\w*|learning|classes)\b/g],
];

/** The area a policy is mostly about, by counting its words. Falls back to governance. */
export function areaOf(p: { title: string; sections: { title: string; body: string }[] }): Area {
  const text = `${p.title} ${p.title} ${p.sections.map((s) => `${s.title} ${s.body}`).join(' ')}`.toLowerCase();
  let best: Area = 'governance';
  let n = 0;
  for (const [a, re] of WORDS) {
    const c = text.match(re)?.length ?? 0;
    if (c > n) { best = a; n = c; }
  }
  return best;
}
