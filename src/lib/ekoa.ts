// The Ekoa method as data: stages, gates, roles, outcome classes, verification tiers,
// obstacle taxonomy, metric library and project templates. The UI and the gate
// engine both read from here, so changing the method means editing this file.

import type {
  BudgetCategory,
  MetricDefinition,
  OutcomeClass,
  RoleKey,
  StageKey,
  Tier,
} from './types';

export interface GateItem {
  key: string;
  label: string;
  /** Items with an auto check are ticked by the platform; the rest are ticked by people. */
  auto?: 'baseline' | 'problem' | 'targets' | 'budget' | 'approval_route' | 'monitoring' | 'risks' | 'four_weeks' | 'approval_log' | 'obstacles_or_none' | 'actuals' | 'successor' | 'shared' | 'peer_comment' | 'outcome' | 'tier2' | 'outcome_class' | 'published';
}

export interface StageDef {
  key: StageKey;
  n: number;
  name: string;
  does: string;
  captures: string;
  signer: RoleKey | 'automatic';
  gate: GateItem[];
}

export const STAGES: StageDef[] = [
  {
    key: 'identify',
    n: 1,
    name: 'Identify',
    does: 'Schools identify sustainability problems',
    captures: 'Baseline audit and a problem brief',
    signer: 'project_lead',
    gate: [
      { key: 'baseline', label: 'Baseline collected on the library protocol (at least 5 school days)', auto: 'baseline' },
      { key: 'problem', label: 'Problem brief written', auto: 'problem' },
    ],
  },
  {
    key: 'design',
    n: 2,
    name: 'Design',
    does: 'Students build actionable solutions',
    captures: 'Plan, budget and approval route',
    signer: 'faculty_liaison',
    gate: [
      { key: 'targets', label: 'Target metric with baseline and target', auto: 'targets' },
      { key: 'budget', label: 'Budget planned: funding source and a planned amount per line, or marked zero-cost', auto: 'budget' },
      { key: 'approval_route', label: 'Approval route set from the governance map', auto: 'approval_route' },
      { key: 'monitoring', label: 'Monitoring plan: who measures what, how often', auto: 'monitoring' },
      { key: 'risks', label: 'Risk list with mitigations', auto: 'risks' },
    ],
  },
  {
    key: 'implement',
    n: 3,
    name: 'Implement',
    does: 'Projects executed locally',
    captures: 'Approval timings, obstacles and measurements',
    signer: 'project_lead',
    gate: [
      { key: 'four_weeks', label: 'At least 4 weeks of measurements logged', auto: 'four_weeks' },
      { key: 'approval_log', label: 'Approval log complete', auto: 'approval_log' },
      { key: 'obstacles', label: 'Obstacles logged, or "none" stated', auto: 'obstacles_or_none' },
      { key: 'actuals', label: 'Actual spend recorded against every budget line', auto: 'actuals' },
      { key: 'successor', label: 'Next Project Lead named, so the work survives graduation', auto: 'successor' },
    ],
  },
  {
    key: 'collaborate',
    n: 4,
    name: 'Collaborate',
    does: 'Models shared globally',
    captures: 'Implementation Record and peer comments',
    signer: 'ekoa_rep',
    gate: [
      { key: 'shared', label: 'Record draft shared with a circle', auto: 'shared' },
      { key: 'peer', label: 'At least one peer comment addressed', auto: 'peer_comment' },
    ],
  },
  {
    key: 'measure',
    n: 5,
    name: 'Measure',
    does: 'Impact tracked and optimised',
    captures: 'Standard metrics and a verification tier',
    signer: 'faculty_liaison',
    gate: [
      { key: 'outcome', label: 'Outcome computed against baseline', auto: 'outcome' },
      { key: 'tier2', label: 'Verification tier T2 or higher', auto: 'tier2' },
      { key: 'outcome_class', label: 'Outcome class chosen, including "did not work"', auto: 'outcome_class' },
    ],
  },
  {
    key: 'scale',
    n: 6,
    name: 'Scale',
    does: 'Successful models replicated',
    captures: 'Adaptations and the lineage tree',
    signer: 'automatic',
    gate: [{ key: 'published', label: 'Record published; adaptations tracked', auto: 'published' }],
  },
];

/** What EKOA stands for, and where each letter lives in the platform. */
export const EKOA_LETTERS = [
  { letter: 'E', word: 'Education', line: 'Develop student knowledge and capabilities.', platform: 'Stage guides, project templates and measurement protocols teach students to run a real project, not a campaign.', to: '/how-it-works' },
  { letter: 'K', word: 'Knowledge transfer', line: 'Preserve and pass on project experience.', platform: 'The Implementation Library and handover packets keep what a team learned long after it graduates.', to: '/library' },
  { letter: 'O', word: 'Outcomes and observation', line: 'Measure progress and evaluate results.', platform: 'Baselines, weekly measurements and verification up to peer audit show what actually changed.', to: '/how-it-works#peer-audit' },
  { letter: 'A', word: 'Adoption and administration', line: 'Embed successful practices into school systems.', platform: 'Approval routes, budgets and the policy builder turn a project into the way the school runs.', to: '/how-it-works#roles' },
] as const;

export const stageByKey = (k: StageKey) => STAGES.find((s) => s.key === k)!;
export const nextStage = (k: StageKey): StageKey | null => {
  const i = STAGES.findIndex((s) => s.key === k);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1].key : null;
};

export const ROLES: Record<RoleKey, { label: string; short: string; adult: boolean; description: string }> = {
  project_lead: { label: 'Project Lead', short: 'Lead', adult: false, description: 'The student who runs sustainability work at the school. Use your school’s own title: Sustainability Head, Eco Club President or a council member. Co-leads are fine.' },
  board_member: { label: 'Board member', short: 'Board', adult: false, description: 'An optional seat on a student sustainability board, for schools that have one.' },
  implementation_team: { label: 'Implementation Team', short: 'Team', adult: false, description: 'Delivers tasks and logs measurements on a project.' },
  ekoa_rep: { label: 'Ekoa Representative', short: 'Ekoa Rep', adult: false, description: 'Links the school to circles, twins and other schools. At a small school the Project Lead can do this too.' },
  faculty_liaison: { label: 'Faculty Liaison', short: 'Liaison', adult: true, description: 'Any teacher. The one adult every school needs: owns the workspace, verifies data, can sign every stage and oversees safeguarding.' },
  approver: { label: 'Approver', short: 'Approver', adult: true, description: 'A decision-maker in the school governance chain.' },
  auditor: { label: 'Peer Auditor', short: 'Auditor', adult: false, description: 'Audits other schools’ records for tier T3. Only members of an Ekoa audit school hold this role.' },
  steward: { label: 'Ekoa Admin', short: 'Admin', adult: true, description: 'Runs the network: schools, roles, policies, moderation, safeguarding and peer audits.' },
  partner: { label: 'Partner', short: 'Partner', adult: true, description: 'NGO or institution that mentors in groups and verifies outcomes.' },
  alumni: { label: 'Alumni', short: 'Alumni', adult: false, description: 'Former team member with read access.' },
};

/** The minimum a school needs to start: one teacher and one student. Everything else is optional. */
export const MINIMUM_TEAM: RoleKey[] = ['faculty_liaison', 'project_lead'];

/** How a person's role reads on screen: their school's own title first, then the Ekoa role. */
export const roleTitle = (r: { role: RoleKey; local_title?: string | null }) =>
  r.local_title?.trim() ? `${r.local_title.trim()} (${ROLES[r.role].label})` : ROLES[r.role].label;

export const STUDENT_ROLES: RoleKey[] = ['project_lead', 'board_member', 'implementation_team', 'ekoa_rep'];

export const OUTCOMES: Record<OutcomeClass, { label: string; tone: 'leaf' | 'clay' | 'lesson' | 'mute'; blurb: string }> = {
  worked: { label: 'Worked', tone: 'leaf', blurb: 'Met or beat its target.' },
  partly: { label: 'Partly worked', tone: 'clay', blurb: 'Moved the metric but missed the target.' },
  did_not_work: { label: 'Did not work', tone: 'lesson', blurb: 'Stopped or failed. The lessons are the result.' },
  too_early: { label: 'Too early to tell', tone: 'mute', blurb: 'Not enough data yet.' },
};

/** A live project is still running and still collecting data. Its record is "too early to tell" until the outcome is known. */
export const isLiveRecord = (r: { outcome_class: OutcomeClass }) => r.outcome_class === 'too_early';

export const TIERS: Record<Tier, { label: string; who: string }> = {
  0: { label: 'T0 Self-reported', who: 'Entered by students' },
  1: { label: 'T1 Evidence attached', who: 'Photo or file attached' },
  2: { label: 'T2 Faculty-verified', who: 'Checked by the faculty liaison' },
  3: { label: 'T3 Peer-audited', who: 'Audited by an Ekoa audit school: Shiv Nadar School, Faridabad or Green School, Bali' },
  4: { label: 'T4 Partner-verified', who: 'Verified by a partner or third party' },
};

export const OBSTACLE_TAXONOMY: { key: string; label: string; examples: string[] }[] = [
  { key: 'approval', label: 'Approval', examples: ['Stalled at a named step', 'Returned for changes', 'No clear decision-maker'] },
  { key: 'budget', label: 'Budget', examples: ['No budget line', 'Rigid budget categories', 'Delayed release of funds'] },
  { key: 'behaviour', label: 'Behaviour', examples: ['Low participation', 'Sorting errors', 'Rules unclear to students'] },
  { key: 'monitoring', label: 'Monitoring', examples: ['Nobody measuring', 'Gaps in the data', 'Scale or meter missing'] },
  { key: 'vendor', label: 'Vendor or contract', examples: ['Contractor mixes streams', 'Contract lapsed', 'Collection irregular'] },
  { key: 'infrastructure', label: 'Infrastructure', examples: ['No space', 'No bins', 'No meters'] },
  { key: 'time', label: 'Time and staffing', examples: ['Exam season', 'Leadership turnover', 'Staff mentor left'] },
  { key: 'policy', label: 'Policy conflict', examples: ['Clashes with an existing school rule'] },
  { key: 'safety', label: 'Safety or compliance', examples: ['Hygiene rules', 'Fire or health regulations'] },
  { key: 'external', label: 'External', examples: ['Weather', 'Municipal services', 'Supply shortages'] },
];
export const obstacleLabel = (k: string) => OBSTACLE_TAXONOMY.find((o) => o.key === k)?.label ?? k;

export const BUDGET_CATEGORIES: { key: BudgetCategory; label: string }[] = [
  { key: 'materials', label: 'Materials' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'services', label: 'Services and labour' },
  { key: 'printing', label: 'Printing and signage' },
  { key: 'transport', label: 'Transport' },
  { key: 'food', label: 'Food and events' },
  { key: 'other', label: 'Other' },
];
export const budgetCategoryLabel = (k: string) => BUDGET_CATEGORIES.find((c) => c.key === k)?.label ?? k;

/** Rough USD value of one unit of each currency, fixed for the year. Only used to compare costs across countries, never for accounts. */
export const FX_TO_USD: Record<string, number> = {
  USD: 1, INR: 0.012, IDR: 0.000062, SGD: 0.74, BRL: 0.18, EUR: 1.08, GBP: 1.27, KES: 0.0077, AUD: 0.66, PHP: 0.017, ZAR: 0.055, NPR: 0.0075,
};
export const CURRENCIES = Object.keys(FX_TO_USD);
export const toUsd = (amount: number, currency: string) => Math.round(amount * (FX_TO_USD[currency] ?? 1));
export const currencyFor = (country: string) =>
  ({ India: 'INR', Indonesia: 'IDR', Singapore: 'SGD', Brazil: 'BRL', Kenya: 'KES', Philippines: 'PHP', 'South Africa': 'ZAR', Nepal: 'NPR', Australia: 'AUD', 'United Kingdom': 'GBP', 'United States': 'USD' } as Record<string, string>)[country] ?? 'USD';

export const CATEGORIES = ['Waste', 'Energy', 'Water', 'Food', 'Biodiversity', 'Policy & governance'] as const;

export const METRIC_LIBRARY: MetricDefinition[] = [
  {
    code: 'waste_per_student',
    name: 'Waste generated',
    unit: 'g per student per school day',
    category: 'waste',
    protocol: 'Weigh every waste stream at the collection point for the whole period. Divide by enrolled students and school days in the period.',
    frequency: 'Weekly',
    comparability_notes: 'Uses enrolled students, not attendance. Exclude construction waste.',
    higher_is_better: false,
    is_impact: true,
    inputs: [
      { key: 'total_kg', label: 'Total waste weighed', unit: 'kg' },
      { key: 'school_days', label: 'School days covered', unit: 'days' },
    ],
    version: 1,
  },
  {
    code: 'diversion_rate',
    name: 'Diversion rate',
    unit: '% of waste recycled or composted',
    category: 'waste',
    protocol: 'Weigh recycled and composted streams separately from residual waste over the same period.',
    frequency: 'Weekly',
    comparability_notes: 'Count only material that actually leaves for recycling or enters the compost, not what was put in the bins.',
    higher_is_better: true,
    is_impact: true,
    inputs: [
      { key: 'diverted_kg', label: 'Recycled + composted', unit: 'kg' },
      { key: 'total_kg', label: 'Total waste', unit: 'kg' },
    ],
    version: 1,
  },
  {
    code: 'compost_contamination',
    name: 'Compost contamination',
    unit: '% non-compostable by weight',
    category: 'waste',
    protocol: 'Take a 5 kg sample from the compost input stream, sort out non-compostable items and weigh them.',
    frequency: 'Fortnightly',
    comparability_notes: 'Poorly monitored systems often reach 30–50%. Sample on a normal school day.',
    higher_is_better: false,
    is_impact: true,
    inputs: [
      { key: 'contaminant_kg', label: 'Non-compostable found', unit: 'kg' },
      { key: 'sample_kg', label: 'Sample weight', unit: 'kg' },
    ],
    version: 1,
  },
  {
    code: 'segregation_accuracy',
    name: 'Segregation accuracy',
    unit: '% items correctly sorted',
    category: 'waste',
    protocol: 'Spot-audit 3 bin stations. Count items in each bin and how many are in the right bin.',
    frequency: 'Weekly',
    comparability_notes: 'Audit unannounced, at the same time of day each week.',
    higher_is_better: true,
    is_impact: true,
    inputs: [
      { key: 'correct', label: 'Items in the right bin', unit: 'items' },
      { key: 'checked', label: 'Items checked', unit: 'items' },
    ],
    version: 1,
  },
  {
    code: 'single_use_plastic',
    name: 'Single-use plastic items',
    unit: 'items per week',
    category: 'waste',
    protocol: 'Count single-use plastic items (bottles, cutlery, wrappers, cups) in a full week of collected waste from the canteen and events.',
    frequency: 'Weekly',
    comparability_notes: 'Report per week; normalise per 100 students when comparing schools.',
    higher_is_better: false,
    is_impact: true,
    inputs: [{ key: 'items', label: 'Items counted', unit: 'items' }],
    version: 1,
  },
  {
    code: 'canteen_waste_per_meal',
    name: 'Canteen food waste',
    unit: 'g per meal served',
    category: 'food',
    protocol: 'Weigh plate and kitchen food waste each day. Divide by meals served.',
    frequency: 'Weekly',
    comparability_notes: 'Include both plate waste and kitchen prep waste.',
    higher_is_better: false,
    is_impact: true,
    inputs: [
      { key: 'food_kg', label: 'Food waste weighed', unit: 'kg' },
      { key: 'meals', label: 'Meals served', unit: 'meals' },
    ],
    version: 1,
  },
  {
    code: 'energy_per_student',
    name: 'Electricity use',
    unit: 'kWh per student per month',
    category: 'energy',
    protocol: 'Read the main meter on the first school day of each month.',
    frequency: 'Monthly',
    comparability_notes: 'Note air-conditioning months separately.',
    higher_is_better: false,
    is_impact: true,
    inputs: [{ key: 'kwh', label: 'Meter reading difference', unit: 'kWh' }],
    version: 1,
  },
  {
    code: 'renewable_share',
    name: 'Renewable share',
    unit: '% of electricity from on-site renewables',
    category: 'energy',
    protocol: 'Read solar generation and main meter on the same day each month.',
    frequency: 'Monthly',
    comparability_notes: 'On-site generation only.',
    higher_is_better: true,
    is_impact: true,
    inputs: [
      { key: 'renewable_kwh', label: 'Solar generated', unit: 'kWh' },
      { key: 'total_kwh', label: 'Total used', unit: 'kWh' },
    ],
    version: 1,
  },
  {
    code: 'water_per_student',
    name: 'Water use',
    unit: 'litres per student per school day',
    category: 'water',
    protocol: 'Read the water meter weekly; divide by enrolled students and school days.',
    frequency: 'Weekly',
    comparability_notes: 'Exclude tanker deliveries for construction.',
    higher_is_better: false,
    is_impact: true,
    inputs: [
      { key: 'litres', label: 'Litres used', unit: 'L' },
      { key: 'school_days', label: 'School days covered', unit: 'days' },
    ],
    version: 1,
  },
  {
    code: 'participation',
    name: 'Participation',
    unit: '% of classes engaged',
    category: 'participation',
    protocol: 'Count classes that took part in the activity this period.',
    frequency: 'Monthly',
    comparability_notes: 'Participation, not impact. Never reported as an outcome.',
    higher_is_better: true,
    is_impact: false,
    inputs: [
      { key: 'classes_engaged', label: 'Classes engaged', unit: 'classes' },
      { key: 'classes_total', label: 'Total classes', unit: 'classes' },
    ],
    version: 1,
  },
  {
    code: 'cost',
    name: 'Cost',
    unit: 'USD (fixed annual rate)',
    category: 'cost',
    protocol: 'Record money spent or saved in local currency; the platform converts at the fixed annual rate.',
    frequency: 'Per transaction',
    comparability_notes: 'Rates are fixed once a year so comparisons stay stable.',
    higher_is_better: false,
    is_impact: false,
    inputs: [{ key: 'local_amount', label: 'Amount in local currency', unit: 'local' }],
    version: 1,
  },
];

export const metricByCode = (code: string) => METRIC_LIBRARY.find((m) => m.code === code);

/** Fixed annual conversion rates to USD, set once a year by stewards. */

export interface ProjectTemplate {
  key: string;
  name: string;
  category: (typeof CATEGORIES)[number];
  summary: string;
  problemPrompt: string;
  metrics: string[];
  tasks: { title: string; owner: RoleKey }[];
  monitoring: { metric_code: string; who: RoleKey; frequency: string }[];
  risks: { text: string; mitigation: string }[];
  phase: 'pilot' | 'phase2';
}

export const TEMPLATES: ProjectTemplate[] = [
  {
    key: 'waste_audit',
    name: '5-day waste audit',
    category: 'Waste',
    summary: 'Weigh every stream for five school days to find the biggest source of waste.',
    problemPrompt: 'Which waste stream is largest, and where does it come from?',
    metrics: ['waste_per_student', 'diversion_rate'],
    tasks: [
      { title: 'Borrow or buy a hanging scale (50 kg)', owner: 'implementation_team' },
      { title: 'Agree weighing point with housekeeping staff', owner: 'project_lead' },
      { title: 'Weigh each stream daily for 5 school days', owner: 'implementation_team' },
      { title: 'Enter totals and photos of the bins', owner: 'implementation_team' },
    ],
    monitoring: [{ metric_code: 'waste_per_student', who: 'implementation_team', frequency: 'Daily for 5 days' }],
    risks: [{ text: 'Housekeeping empties bins before weighing', mitigation: 'Agree a fixed weighing time with staff' }],
    phase: 'pilot',
  },
  {
    key: 'segregation',
    name: 'Segregation at source',
    category: 'Waste',
    summary: 'Three-bin stations with clear signage and weekly spot audits.',
    problemPrompt: 'Where do mixed bins make recycling or composting impossible?',
    metrics: ['segregation_accuracy', 'diversion_rate'],
    tasks: [
      { title: 'Map bin stations on a school plan', owner: 'implementation_team' },
      { title: 'Design signage with pictures, not words', owner: 'implementation_team' },
      { title: 'Brief class monitors in assembly', owner: 'project_lead' },
      { title: 'Run weekly unannounced spot audits', owner: 'implementation_team' },
    ],
    monitoring: [{ metric_code: 'segregation_accuracy', who: 'implementation_team', frequency: 'Weekly' }],
    risks: [{ text: 'Contractor re-mixes sorted waste', mitigation: 'Check contract terms; ask for separate collection' }],
    phase: 'pilot',
  },
  {
    key: 'canteen_compost',
    name: 'Canteen food-waste composting',
    category: 'Food',
    summary: 'Divert canteen food waste into an on-site compost system with monitored contamination.',
    problemPrompt: 'How much canteen food waste goes to landfill, and could it be composted on site?',
    metrics: ['diversion_rate', 'compost_contamination', 'canteen_waste_per_meal'],
    tasks: [
      { title: 'Choose a compost method that fits the space (pit, drum or vermicompost)', owner: 'implementation_team' },
      { title: 'Agree a daily handover from canteen staff', owner: 'project_lead' },
      { title: 'Set a contamination sampling rota', owner: 'implementation_team' },
      { title: 'Show weekly results on the corridor screen', owner: 'ekoa_rep' },
    ],
    monitoring: [
      { metric_code: 'compost_contamination', who: 'implementation_team', frequency: 'Fortnightly' },
      { metric_code: 'diversion_rate', who: 'implementation_team', frequency: 'Weekly' },
    ],
    risks: [
      { text: 'Contamination above 30% ruins the compost', mitigation: 'Sampling rota and visible feedback to classes' },
      { text: 'Monitoring stops during exams', mitigation: 'Assign Grades 8, 9 and 11 to the rota' },
    ],
    phase: 'pilot',
  },
  {
    key: 'plastic_phaseout',
    name: 'Single-use plastic phase-out',
    category: 'Waste',
    summary: 'Remove single-use plastic from the canteen and events, one item at a time.',
    problemPrompt: 'Which single-use plastic items appear most, and who buys them?',
    metrics: ['single_use_plastic'],
    tasks: [
      { title: 'Count items for one full week', owner: 'implementation_team' },
      { title: 'Meet canteen vendor about alternatives', owner: 'project_lead' },
      { title: 'Draft event guidelines for organisers', owner: 'board_member' },
    ],
    monitoring: [{ metric_code: 'single_use_plastic', who: 'implementation_team', frequency: 'Weekly' }],
    risks: [{ text: 'Vendor contract specifies packaged items', mitigation: 'Raise it before the contract renewal date' }],
    phase: 'pilot',
  },
  {
    key: 'energy_dashboard',
    name: 'Energy monitoring dashboard',
    category: 'Energy',
    summary: 'Monthly meter readings shown to students, so solar and savings change behaviour.',
    problemPrompt: 'Do students ever see how much energy the school uses?',
    metrics: ['energy_per_student', 'renewable_share'],
    tasks: [
      { title: 'Find the main meter and any solar inverter', owner: 'implementation_team' },
      { title: 'Set the monthly reading rota', owner: 'project_lead' },
      { title: 'Put the kiosk view on a corridor screen', owner: 'ekoa_rep' },
    ],
    monitoring: [{ metric_code: 'energy_per_student', who: 'implementation_team', frequency: 'Monthly' }],
    risks: [{ text: 'Meter not accessible to students', mitigation: 'Faculty liaison takes the reading with a student present' }],
    phase: 'phase2',
  },
  {
    key: 'water_audit',
    name: 'Water audit',
    category: 'Water',
    summary: 'Weekly meter readings and a leak walk to find the biggest losses.',
    problemPrompt: 'Where does the school lose the most water?',
    metrics: ['water_per_student'],
    tasks: [
      { title: 'Locate meters and tanks', owner: 'implementation_team' },
      { title: 'Run a leak walk with the estate manager', owner: 'project_lead' },
    ],
    monitoring: [{ metric_code: 'water_per_student', who: 'implementation_team', frequency: 'Weekly' }],
    risks: [{ text: 'Tanker deliveries distort readings', mitigation: 'Log deliveries separately' }],
    phase: 'phase2',
  },
  {
    key: 'policy_campaign',
    name: 'Policy adoption campaign',
    category: 'Policy & governance',
    summary: 'Draft a school sustainability and continuity policy and take it through approval.',
    problemPrompt: 'Which school rule or gap keeps sustainability work from lasting?',
    metrics: ['participation'],
    tasks: [
      { title: 'Draft the policy in the Policy Builder', owner: 'project_lead' },
      { title: 'Collect feedback from the student council', owner: 'board_member' },
      { title: 'Submit through the governance pathway', owner: 'project_lead' },
    ],
    monitoring: [{ metric_code: 'participation', who: 'board_member', frequency: 'Monthly' }],
    risks: [{ text: 'Policy stalls with management', mitigation: 'Brief the principal before formal submission' }],
    phase: 'phase2',
  },
];

export const templateByKey = (k: string | null) => TEMPLATES.find((t) => t.key === k);
