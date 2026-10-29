// Published school sustainability policies, shown in the Library with a short summary and a link to the full original.
// Summaries are written in our own words; the full text stays with the school that wrote it.

export interface PolicyEntry {
  title: string;
  school: string;
  topic: string;
  summary: string;
  url: string;
}

const GS = 'https://sites.google.com/greenschool.org/environmental-hub';

export const POLICY_LIBRARY: PolicyEntry[] = [
  { title: 'Waste: reducing and reinventing', school: 'Green School Bali', topic: 'Waste', summary: 'Aims for zero waste and zero landfill. Refuse and reduce first, then repurpose and recycle, with procurement and food sharing the responsibility.', url: `${GS}/pledges` },
  { title: 'Water: conserving and replenishing', school: 'Green School Bali', topic: 'Water', summary: 'Commits to returning as much water to the aquifer as the school takes, through monitoring, harvesting, reuse and student-led solutions.', url: `${GS}/pledges` },
  { title: 'Energy: mixing solutions', school: 'Green School Bali', topic: 'Energy', summary: 'Use less energy, move to a mix of renewable sources, and aim to become energy-independent, later sharing surplus with the community.', url: `${GS}/pledges/energy` },
  { title: 'Food: nourishing all living things', school: 'Green School Bali', topic: 'Food', summary: 'Nutritious, seasonal, local and ethically sourced food, with little single-use packaging, and students learning the cycle from seed to compost.', url: `${GS}/pledges/food` },
  { title: 'Things we buy and use', school: 'Green School Bali', topic: 'Procurement', summary: 'Buy only what is needed and choose products with the least harm over their life cycle, preferring local, recycled, recyclable and low-chemical options.', url: `${GS}/pledges/things-we-consume` },
  { title: 'Transport: fuelling solutions', school: 'Green School Bali', topic: 'Transport', summary: 'Default to the lowest-carbon option, plan to cut trips, and support cycling, electric vehicle charging and the school’s biofuel buses.', url: `${GS}/pledges/transport` },
  { title: 'Biodiversity: part of the system', school: 'Green School Bali', topic: 'Biodiversity', summary: 'Students survey and record the species on campus, and the census guides building and regeneration.', url: `${GS}/pledges/biodiversity` },
  { title: 'Building and play', school: 'Green School Bali', topic: 'Buildings', summary: 'Protect green space when building, use local and sustainable materials, reuse structures, and include nature-based play and productive gardens.', url: `${GS}/pledges/building-play` },
  { title: 'Family sustainability guide', school: 'Green School Bali', topic: 'Community', summary: 'A parent-written guide to living sustainably alongside the school, kept up to date by the community.', url: `${GS}/sustainability-guide` },
];
