// Demo seed: a believable pilot cohort, generated relative to today so the demo
// always looks live. All schools, people and organisations here are fictional, except the two
// Ekoa audit schools (Shiv Nadar School, Faridabad and Green School, Bali), which appear by name
// as auditors only. Their demo "audit team" accounts are placeholders, not real people.

import { METRIC_LIBRARY, TEMPLATES } from './ekoa';
import { CIRCLES, POLICY_CLAUSES } from './clauses';

type Row = Record<string, any>;

const DAY = 86_400_000;
const now = () => Date.now();
const day = (offset: number) => new Date(now() + offset * DAY).toISOString().slice(0, 10);
const ts = (offset: number, hour = 10) => {
  const d = new Date(now() + offset * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
let counter = 0;
const id = (prefix: string) => {
  counter += 1;
  const hex = (counter + 0x1000).toString(16).padStart(12, '0');
  const p = prefix.padEnd(8, '0').slice(0, 8).replace(/[^0-9a-f]/g, 'a');
  return `${p}-0000-4000-8000-${hex}`;
};

export function buildSeed(): Record<string, Row[]> {
  counter = 0;
  const T: Record<string, Row[]> = {};
  const add = (table: string, row: Row) => {
    const stored: Row = { created_at: ts(-200), ...row };
    (T[table] ??= []).push(stored);
    return stored;
  };

  // ---------- Organisations ----------
  const ekoaTeam = add('organisations', {
    id: id('a0'), name: 'Ekoa Stewards', org_type: 'ekoa', country: 'India', city: 'Faridabad', lat: null, lng: null,
    curriculum: null, student_count: null, grade_range: null, climate_zone: null, context_profile: null,
    status: 'active', public_visible: false, anonymised_label: null,
  });
  const aravalli = add('organisations', {
    id: id('a1'), name: 'Aravalli Valley School', org_type: 'school', country: 'India', city: 'Faridabad', lat: 28.408, lng: 77.317,
    curriculum: 'CBSE', student_count: 1640, grade_range: 'Grades 1–12', climate_zone: 'Hot semi-arid',
    context_profile: { size_band: '1,500–2,000', curriculum: 'CBSE', climate_zone: 'Hot semi-arid', budget_band: 'medium', infrastructure: ['Canteen', 'Garden space', 'Rooftop'], waste_contractor: 'Municipal contractor, mixed collection', governance_chain_length: 6 },
    status: 'active', public_visible: true, anonymised_label: 'CBSE school, North India, 1,500–2,000 students',
  });
  const ubud = add('organisations', {
    id: id('a2'), name: 'Ubud Hills Academy', org_type: 'school', country: 'Indonesia', city: 'Ubud, Bali', lat: -8.507, lng: 115.263,
    curriculum: 'IB', student_count: 520, grade_range: 'Grades 6–12', climate_zone: 'Tropical monsoon',
    context_profile: { size_band: '500–750', curriculum: 'IB', climate_zone: 'Tropical monsoon', budget_band: 'high', infrastructure: ['Open campus', 'Kitchen garden', 'Canteen'], waste_contractor: 'Private collector, separate streams', governance_chain_length: 4 },
    status: 'active', public_visible: true, anonymised_label: 'IB school, Bali, 500–750 students',
  });
  const lakeside = add('organisations', {
    id: id('a3'), name: 'Lakeside Secondary', org_type: 'school', country: 'India', city: 'Pune', lat: 18.52, lng: 73.856,
    curriculum: 'State board', student_count: 980, grade_range: 'Grades 5–12', climate_zone: 'Tropical wet and dry',
    context_profile: { size_band: '750–1,000', curriculum: 'State board', climate_zone: 'Tropical wet and dry', budget_band: 'low', infrastructure: ['Canteen', 'Junior block courtyard'], waste_contractor: 'Municipal contractor, mixed collection', governance_chain_length: 5 },
    status: 'active', public_visible: true, anonymised_label: 'State-board school, Western India, 750–1,000 students',
  });
  const tampines = add('organisations', {
    id: id('a4'), name: 'Tampines Green Secondary', org_type: 'school', country: 'Singapore', city: 'Singapore', lat: 1.353, lng: 103.945,
    curriculum: 'Singapore MOE', student_count: 1210, grade_range: 'Secondary 1–4', climate_zone: 'Tropical rainforest',
    context_profile: { size_band: '1,000–1,500', curriculum: 'Singapore MOE', climate_zone: 'Tropical rainforest', budget_band: 'medium', infrastructure: ['Canteen', 'Eco garden'], waste_contractor: 'Town council, recycling bins on site', governance_chain_length: 4 },
    status: 'active', public_visible: true, anonymised_label: 'Secondary school, Singapore, 1,000–1,500 students',
  });
  const viva = add('organisations', {
    id: id('a5'), name: 'Escola Viva Paulista', org_type: 'school', country: 'Brazil', city: 'São Paulo', lat: -23.561, lng: -46.656,
    curriculum: 'BNCC', student_count: 760, grade_range: 'Ensino Fundamental II – Médio', climate_zone: 'Humid subtropical',
    context_profile: { size_band: '750–1,000', curriculum: 'BNCC', climate_zone: 'Humid subtropical', budget_band: 'low', infrastructure: ['Sports ground', 'Canteen'], waste_contractor: 'Municipal cooperative collection', governance_chain_length: 4 },
    status: 'active', public_visible: true, anonymised_label: 'School in São Paulo, 750–1,000 students',
  });
  const commons = add('organisations', {
    id: id('a6'), name: 'Compost Commons', org_type: 'partner', country: 'India', city: 'Bengaluru', lat: 12.972, lng: 77.594,
    curriculum: null, student_count: null, grade_range: null, climate_zone: null, context_profile: null,
    status: 'active', public_visible: true, anonymised_label: null,
  });

  // ---------- Ekoa audit schools: they carry out T3 peer audits of other schools' records ----------
  const sns = add('organisations', {
    id: id('a7'), name: 'Shiv Nadar School, Faridabad', org_type: 'school', country: 'India', city: 'Faridabad', lat: 28.43, lng: 77.3,
    curriculum: null, student_count: null, grade_range: null, climate_zone: 'Hot semi-arid', context_profile: null,
    status: 'active', public_visible: true, anonymised_label: null, audit_school: true,
  });
  const greenSchool = add('organisations', {
    id: id('a8'), name: 'Green School, Bali', org_type: 'school', country: 'Indonesia', city: 'Badung, Bali', lat: -8.51, lng: 115.21,
    curriculum: null, student_count: null, grade_range: null, climate_zone: 'Tropical monsoon', context_profile: null,
    status: 'active', public_visible: true, anonymised_label: null, audit_school: true,
  });
  for (const o of T.organisations) o.audit_school ??= false;

  // ---------- Cohorts ----------
  const founding = add('cohorts', { id: id('b1'), name: 'Founding Cohort', starts_on: day(-240), ends_on: null });
  const pilot = add('cohorts', { id: id('b2'), name: 'Pilot Cohort 1 (waste)', starts_on: day(-130), ends_on: day(50) });
  for (const o of [aravalli, ubud, lakeside, tampines, viva]) add('cohort_members', { id: id('b3'), cohort_id: founding.id, org_id: o.id });
  for (const o of [aravalli, ubud, lakeside]) add('cohort_members', { id: id('b4'), cohort_id: pilot.id, org_id: o.id });

  // ---------- People and roles ----------
  const person = (name: string, email: string, age: string, consent: string) =>
    add('people', {
      id: id('c0'), auth_user_id: null, display_name: name, email, age_band: age, is_minor: age !== '18+', locale: 'en',
      consent_status: age === '18+' ? 'not_needed' : consent,
    });
  const role = (p: Row, org: Row, r: string, start: number, end: number | null, status = 'active', seat: number | null = null, localTitle: string | null = null) =>
    add('role_assignments', { id: id('d0'), person_id: p.id, org_id: org.id, role: r, seat, local_title: localTitle, term_start: day(start), term_end: end === null ? null : day(end), status });

  const aanya = person('Aanya Mehta', 'aanya@aravalli.example', '16-17', 'granted');
  const kabir = person('Kabir Rao', 'kabir@aravalli.example', '16-17', 'granted');
  const ishaan = person('Ishaan Gupta', 'ishaan@aravalli.example', '13-15', 'granted');
  const meher = person('Meher Sinha', 'meher@aravalli.example', '13-15', 'granted');
  const rohan = person('Rohan Batra', 'rohan@aravalli.example', '13-15', 'pending');
  const dev = person('Dev Arora', 'dev.alumni@example.com', '18+', 'not_needed');
  const ritu = person('Ritu Malhotra', 'ritu.malhotra@aravalli.example', '18+', 'not_needed');
  const verma = person('Dr Suresh Verma', 'principal@aravalli.example', '18+', 'not_needed');
  const putu = person('Putu Ayu Lestari', 'putu@ubudhills.example', '16-17', 'granted');
  const made = person('Made Wirawan', 'made@ubudhills.example', '16-17', 'granted');
  const wayan = person('Wayan Sudarta', 'wayan@ubudhills.example', '18+', 'not_needed');
  const sneha = person('Sneha Kulkarni', 'sneha@lakeside.example', '16-17', 'granted');
  const anil = person('Anil Deshpande', 'anil@lakeside.example', '18+', 'not_needed');
  const weiling = person('Tan Wei Ling', 'weiling@tampines.example', '16-17', 'granted');
  const rajesh = person('Rajesh Kumar', 'rajesh@tampines.example', '18+', 'not_needed');
  const lucas = person('Lucas Ferreira', 'lucas@escolaviva.example', '16-17', 'granted');
  const ana = person('Ana Souza', 'ana@escolaviva.example', '18+', 'not_needed');
  const steward = person('Noor Kapoor', 'steward@ekoa.example', '18+', 'not_needed');
  const lena = person('Lena Ortiz', 'lena@compostcommons.example', '18+', 'not_needed');
  const snsAudit = person('Shiv Nadar School audit team', 'audit@sns.example', '18+', 'not_needed');
  const gsAudit = person('Green School audit team', 'audit@greenschool.example', '18+', 'not_needed');

  role(aanya, aravalli, 'project_lead', -325, 40, 'active', 1, 'Sustainability Head');
  role(kabir, aravalli, 'ekoa_rep', -200, 165, 'active', 2);
  role(meher, aravalli, 'board_member', -140, 225, 'active', 3);
  role(meher, aravalli, 'project_lead', 40, 405, 'incoming', 3, 'Sustainability Head');
  role(ishaan, aravalli, 'implementation_team', -120, 245);
  role(rohan, aravalli, 'implementation_team', -10, 355);
  role(dev, aravalli, 'alumni', -700, -325, 'alumni');
  role(ritu, aravalli, 'faculty_liaison', -400, null);
  role(verma, aravalli, 'approver', -900, null);
  role(putu, ubud, 'project_lead', -260, 105, 'active', 1);
  role(made, ubud, 'ekoa_rep', -150, 215, 'active', 2);
  role(wayan, ubud, 'faculty_liaison', -500, null);
  role(sneha, lakeside, 'project_lead', -210, 155, 'active', 1, 'Eco Club President');
  role(anil, lakeside, 'faculty_liaison', -380, null);
  role(weiling, tampines, 'project_lead', -280, 85, 'active', 1, 'Environment Club Chair');
  role(rajesh, tampines, 'faculty_liaison', -600, null);
  // Escola Viva has no sustainability head: one student holds both roles, with one teacher.
  role(lucas, viva, 'project_lead', -190, 175, 'active', 1, 'Grêmio sustainability rep');
  role(lucas, viva, 'ekoa_rep', -190, 175, 'active', 2);
  role(ana, viva, 'faculty_liaison', -420, null);
  role(steward, ekoaTeam, 'steward', -240, null);
  role(lena, commons, 'partner', -180, null);
  role(snsAudit, sns, 'auditor', -60, null);
  role(gsAudit, greenSchool, 'auditor', -60, null);

  for (const p of [aanya, kabir, ishaan, meher, putu, made, sneha, weiling, lucas]) {
    add('consent_records', {
      id: id('e0'), person_id: p.id, guardian_name: 'Parent or guardian', guardian_email: `guardian.${p.email}`,
      scope: { account: true, cross_school: true, photos: false, name_on_records: false }, method: 'email_link',
      terms_version: '2026-10', token: `granted-${p.id.slice(-6)}`, granted_at: ts(-150), withdrawn_at: null,
    });
  }
  add('consent_records', {
    id: id('e1'), person_id: rohan.id, guardian_name: 'Mrs Batra', guardian_email: 'guardian.rohan@example.com',
    scope: { account: true, cross_school: true, photos: false, name_on_records: false }, method: 'email_link',
    terms_version: '2026-10', token: 'demo-consent-rohan', granted_at: null, withdrawn_at: null, created_at: ts(-10),
  });

  // ---------- Governance maps ----------
  const steps: Record<string, Row[]> = {};
  const chain = (org: Row, list: [string, string, number | null, number][]) => {
    steps[org.id] = list.map(([body, rights, limit, days], i) =>
      add('governance_steps', { id: id('f0'), org_id: org.id, position: i + 1, body, decision_rights: rights, budget_limit: limit, typical_days: days }),
    );
  };
  chain(aravalli, [
    ['Student Council', 'Endorses student proposals', null, 3],
    ['Sustainability Committee', 'Reviews feasibility and safety', null, 7],
    ['Faculty Liaison', 'Checks plan and data method', null, 3],
    ['Principal', 'Approves spending up to INR 10,000', 10000, 7],
    ['Management Committee', 'Approves spending above INR 10,000', null, 14],
    ['Finance Office', 'Releases funds', null, 7],
  ]);
  chain(ubud, [
    ['Student Council', 'Endorses student proposals', null, 3],
    ['Sustainability Coordinator', 'Reviews plan', null, 5],
    ['Head of School', 'Approves spending', null, 7],
    ['Operations', 'Releases funds and schedules works', null, 5],
  ]);
  chain(lakeside, [
    ['Eco Club Committee', 'Endorses proposal', null, 3],
    ['Faculty Liaison', 'Checks plan', null, 3],
    ['Vice Principal', 'Reviews timetable impact', null, 5],
    ['Principal', 'Approves spending', 5000, 7],
    ['Trust Office', 'Approves and releases funds', null, 14],
  ]);
  chain(tampines, [
    ['Student Council', 'Endorses', null, 3],
    ['HOD Science', 'Reviews', null, 5],
    ['Principal', 'Approves', null, 7],
    ['Operations Manager', 'Implements', null, 5],
  ]);
  chain(viva, [
    ['Grêmio Estudantil', 'Endorses', null, 4],
    ['Coordenação', 'Reviews', null, 6],
    ['Direção', 'Approves', null, 10],
    ['Administrativo', 'Releases funds', null, 7],
  ]);

  // ---------- Published records from other schools ----------
  const rec = (row: Row) =>
    add('records', {
      version: 1, ai_drafted: false, anonymised: false, materials: [], contributors: [], obstacles: [], approval_summary: [],
      budget_planned: 0, budget_actual: 0, budget_currency: 'USD', budget_lines: [],
      status: 'published', visibility: 'public', updated_at: row.published_at ?? ts(-20), ...row,
    });
  const ctx = (o: Row, descriptor?: string) => ({ ...o.context_profile, country: o.country, city: o.city, descriptor: descriptor ?? o.anonymised_label });

  const ubudSegProject = add('projects', {
    id: id('g1'), org_id: ubud.id, title: 'Three-bin segregation with picture signage', category: 'Waste', stage: 'scale', status: 'completed',
    owner_role: 'project_lead', template_key: 'segregation', starts_on: day(-170), ends_on: day(-95), adapted_from_record_id: null,
    problem: 'Mixed bins meant the collector could not recycle anything from the canteen and corridors.',
    solution: 'Nine three-bin stations with picture cards, class monitors and weekly unannounced audits.',
    monitoring_plan: [{ metric_code: 'segregation_accuracy', who: 'implementation_team', frequency: 'Weekly' }], risks: [], updated_at: ts(-95),
  });
  const R1 = rec({
    id: id('h1'), project_id: ubudSegProject.id, org_id: ubud.id, title: 'Three-bin segregation with picture signage', category: 'Waste',
    summary: 'Picture-based three-bin stations at nine points, with weekly unannounced audits, lifted sorting accuracy from 46% to 84% in ten weeks.',
    context: ctx(ubud),
    problem: 'Mixed bins at every station meant the private collector treated all canteen and corridor waste as residual.',
    intervention: 'Replaced single bins with nine three-bin stations (organic, recyclable, residual). Every bin carries a picture card instead of text. Class monitors run a 2-minute demo in each class; an Implementation Team member audits three stations every Thursday, unannounced.',
    timeline: '10 weeks of implementation after a 1-week baseline audit',
    budget_summary: 'Planned IDR 4,200,000 (about USD 260), mostly equipment and printing; IDR 4,300,000 spent, IDR 100,000 over plan. Funded by school budget.',
    budget_amount_usd: 267, budget_planned: 4200000, budget_actual: 4300000, budget_currency: 'IDR',
    budget_lines: [{ category: 'equipment', planned: 3400000, actual: 3550000 }, { category: 'printing', planned: 800000, actual: 750000 }],
    approval_summary: [{ body: 'Student Council', days: 2 }, { body: 'Sustainability Coordinator', days: 4 }, { body: 'Head of School', days: 6 }, { body: 'Operations', days: 5 }],
    obstacles: [{ category: 'behaviour', note: 'Younger students ignored text-only signs in the first week.' }, { category: 'vendor', note: 'In week 2 the collector loaded all three bins into one truck. Fixed after a meeting with Operations.' }],
    outcomes: [{ metric_code: 'segregation_accuracy', baseline: 46, result: 84, tier: 3 }, { metric_code: 'diversion_rate', baseline: 22, result: 51, tier: 3 }],
    outcome_class: 'worked', tier: 3,
    lessons: 'Pictures beat words for Grades 6–8. Audit unannounced or the numbers flatter you. Confirm the collector keeps streams separate before buying bins.',
    materials: [{ name: 'Picture card set (12 cards)', kind: 'Signage' }, { name: 'Thursday audit sheet', kind: 'Template' }, { name: 'Class demo script, 2 minutes', kind: 'Script' }],
    contributors: ['Project Lead, 2026', 'Ekoa Representative, 2026', 'Faculty Liaison'],
    published_at: ts(-90),
  });

  const tampProject = add('projects', {
    id: id('g2'), org_id: tampines.id, title: 'Canteen tray-return weighing', category: 'Food', stage: 'scale', status: 'completed',
    owner_role: 'project_lead', template_key: 'canteen_compost', starts_on: day(-230), ends_on: day(-160), adapted_from_record_id: null,
    problem: 'Plate waste at lunch was high, and nobody could see it.', solution: 'Weigh returned trays daily; post the number at the exit.',
    monitoring_plan: [], risks: [], updated_at: ts(-150),
  });
  const R2 = rec({
    id: id('h2'), project_id: tampProject.id, org_id: tampines.id, title: 'Canteen tray-return weighing', category: 'Food',
    summary: 'Weighing returned trays every lunch and posting the number at the canteen exit cut plate waste from 88 g to 61 g per meal in eight weeks.',
    context: ctx(tampines),
    problem: 'Students did not know how much food they left on trays, and stall holders had no feedback.',
    intervention: 'A digital platform scale at the tray return. Two students log the daily total. A whiteboard at the exit shows yesterday’s grams per meal and the weekly trend; stall holders get a weekly summary.',
    timeline: '8 weeks, after a 1-week baseline',
    budget_summary: 'Planned SGD 180 (about USD 133) for a platform scale; spent exactly as planned. Whiteboard reused.', budget_amount_usd: 133,
    budget_planned: 180, budget_actual: 180, budget_currency: 'SGD', budget_lines: [{ category: 'equipment', planned: 180, actual: 180 }],
    approval_summary: [{ body: 'Student Council', days: 1 }, { body: 'HOD Science', days: 3 }, { body: 'Principal', days: 5 }],
    obstacles: [{ category: 'monitoring', note: 'Logging lapsed on exam weeks until two Secondary 1 students joined the rota.' }],
    outcomes: [{ metric_code: 'canteen_waste_per_meal', baseline: 88, result: 61, tier: 3 }, { metric_code: 'diversion_rate', baseline: 15, result: 32, tier: 2 }],
    outcome_class: 'worked', tier: 3,
    lessons: 'Visibility did most of the work. Keep the rota with lower years so exams do not break the data.',
    materials: [{ name: 'Daily weighing log', kind: 'Template' }, { name: 'Exit whiteboard layout', kind: 'Signage' }],
    contributors: ['Project Lead, 2026', 'Faculty Liaison'], published_at: ts(-150),
  });

  const lakeVermi = add('projects', {
    id: id('g3'), org_id: lakeside.id, title: 'Vermicompost pilot in the junior block', category: 'Waste', stage: 'implement', status: 'ended',
    owner_role: 'project_lead', template_key: 'canteen_compost', starts_on: day(-190), ends_on: day(-125), adapted_from_record_id: null,
    problem: 'All canteen food waste went to a mixed municipal collection.', solution: 'Two worm bins in the junior block courtyard fed with canteen waste.',
    monitoring_plan: [{ metric_code: 'compost_contamination', who: 'implementation_team', frequency: 'Fortnightly' }],
    risks: [{ text: 'Contamination', mitigation: 'Sort at the canteen' }], updated_at: ts(-120),
  });
  rec({
    id: id('h3'), project_id: lakeVermi.id, org_id: lakeside.id, title: 'Vermicompost pilot in the junior block', category: 'Waste',
    summary: 'Worm bins in the junior block failed within nine weeks: contamination stayed above 40% and monitoring stopped during exams.',
    context: ctx(lakeside), anonymised: true,
    problem: 'Canteen food waste went to a mixed municipal collection with no composting.',
    intervention: 'Two 200-litre worm bins in the courtyard, fed daily with canteen plate waste collected by Grade 10 volunteers.',
    timeline: '9 weeks, ended early',
    budget_summary: 'Planned INR 6,000 (about USD 72) for bins and worms; INR 6,500 spent, INR 500 over plan. Funded by the eco club fund.', budget_amount_usd: 78,
    budget_planned: 6000, budget_actual: 6500, budget_currency: 'INR', budget_lines: [{ category: 'equipment', planned: 4500, actual: 4500 }, { category: 'materials', planned: 1500, actual: 2000 }],
    approval_summary: [{ body: 'Eco Club Committee', days: 2 }, { body: 'Faculty Liaison', days: 3 }, { body: 'Vice Principal', days: 9 }, { body: 'Principal', days: 6 }],
    obstacles: [
      { category: 'monitoring', note: 'Sampling stopped in week 5 when the Grade 10 volunteers began board-exam preparation.' },
      { category: 'behaviour', note: 'Plate waste arrived mixed with wrappers and spoons; no sorting at the canteen.' },
      { category: 'external', note: 'Afternoon heat in the courtyard dried out the bins; worms died in week 8.' },
      { category: 'approval', note: 'Vice Principal review took 9 days against a typical 5, delaying the start into the hot season.' },
    ],
    outcomes: [{ metric_code: 'compost_contamination', baseline: 47, result: 43, tier: 2 }, { metric_code: 'diversion_rate', baseline: 9, result: 11, tier: 2 }],
    outcome_class: 'did_not_work', tier: 2,
    lessons: 'Start with kitchen prep waste, which is clean, before plate waste. Put the sampling rota with Grades 8–9, never exam years. Agree sorting at the canteen in writing before buying bins. Worm bins need shade and drainage.',
    materials: [{ name: 'Post-mortem notes', kind: 'Post-mortem' }],
    contributors: ['Project Lead, 2026', 'Faculty Liaison'], published_at: ts(-118),
  });

  const vivaProject = add('projects', {
    id: id('g4'), org_id: viva.id, title: 'Plastic-free sports day', category: 'Waste', stage: 'scale', status: 'completed',
    owner_role: 'ekoa_rep', template_key: 'plastic_phaseout', starts_on: day(-110), ends_on: day(-60), adapted_from_record_id: null,
    problem: 'Sports day produced bags of bottles and cups.', solution: 'Refill points and reusable cups.', monitoring_plan: [], risks: [], updated_at: ts(-55),
  });
  const R4 = rec({
    id: id('h4'), project_id: vivaProject.id, org_id: viva.id, title: 'Plastic-free sports day', category: 'Waste',
    summary: 'Refill stations and a cup deposit cut single-use plastic at sports day from 1,850 to 720 items, short of the 300 target because vendors still sold sealed water.',
    context: ctx(viva),
    problem: 'The annual sports day produced about 1,850 single-use plastic items in one day.',
    intervention: 'Four refill stations, a reusable-cup deposit (BRL 2), and a request to vendors to stop selling bottled water.',
    timeline: '6 weeks of preparation, one event day',
    budget_summary: 'Planned BRL 900 (about USD 162) for cups and water dispensers; BRL 860 spent, BRL 40 under plan. Funded by parent association.', budget_amount_usd: 155,
    budget_planned: 900, budget_actual: 860, budget_currency: 'BRL', budget_lines: [{ category: 'equipment', planned: 600, actual: 600 }, { category: 'materials', planned: 300, actual: 260 }],
    approval_summary: [{ body: 'Grêmio Estudantil', days: 3 }, { body: 'Coordenação', days: 5 }, { body: 'Direção', days: 12 }],
    obstacles: [{ category: 'vendor', note: 'Two vendors sold sealed water anyway; their contracts did not mention packaging.' }],
    outcomes: [{ metric_code: 'single_use_plastic', baseline: 1850, result: 720, tier: 2 }],
    outcome_class: 'partly', tier: 2,
    lessons: 'Negotiate packaging terms with vendors at least six weeks ahead and put them in writing.',
    materials: [{ name: 'Vendor letter (Portuguese)', kind: 'Letter' }, { name: 'Cup deposit poster', kind: 'Signage' }],
    contributors: ['Ekoa Representative, 2026', 'Faculty Liaison'], published_at: ts(-50),
  });

  // ---------- Aravalli: the main pilot project ----------
  const compost = add('projects', {
    id: id('g5'), org_id: aravalli.id, title: 'Canteen food-waste composting', category: 'Food', stage: 'measure', status: 'active',
    owner_role: 'project_lead', template_key: 'canteen_compost', starts_on: day(-118), ends_on: null, adapted_from_record_id: R2.id,
    problem: 'Our 5-day audit found canteen food waste is 58% of all school waste by weight, and all of it leaves in the mixed municipal collection.',
    solution: 'Weigh returned plates daily (adapted from Tampines), divert canteen food waste into three compost drums behind the junior block, and sample contamination every fortnight. Results go on the corridor screen every Monday.',
    monitoring_plan: [
      { metric_code: 'diversion_rate', who: 'implementation_team', frequency: 'Weekly' },
      { metric_code: 'compost_contamination', who: 'implementation_team', frequency: 'Fortnightly' },
      { metric_code: 'canteen_waste_per_meal', who: 'implementation_team', frequency: 'Weekly' },
    ],
    risks: [
      { text: 'Contamination above 30% spoils the compost', mitigation: 'Fortnightly sampling and class-by-class feedback' },
      { text: 'Monitoring stops during board exams', mitigation: 'Rota drawn from Grades 8, 9 and 11 only' },
      { text: 'Contractor mixes compost-bound waste back in', mitigation: 'Faculty liaison agrees a separate pickup point in writing' },
    ],
    updated_at: ts(-2),
  });
  const plastic = add('projects', {
    id: id('g6'), org_id: aravalli.id, title: 'Single-use plastic phase-out at school events', category: 'Waste', stage: 'design', status: 'active',
    owner_role: 'board_member', template_key: 'plastic_phaseout', starts_on: day(-12), ends_on: null, adapted_from_record_id: R4.id,
    problem: 'A one-week count found 1,240 single-use plastic items, two-thirds from events and the tuck shop.',
    solution: 'Write packaging terms into event vendor agreements six weeks ahead, adapted from Escola Viva’s lesson.',
    monitoring_plan: [{ metric_code: 'single_use_plastic', who: 'implementation_team', frequency: 'Weekly' }],
    risks: [], updated_at: ts(-1),
  });
  const lakeSeg = add('projects', {
    id: id('g7'), org_id: lakeside.id, title: 'Three-bin segregation (adapted from Ubud Hills)', category: 'Waste', stage: 'implement', status: 'active',
    owner_role: 'project_lead', template_key: 'segregation', starts_on: day(-60), ends_on: null, adapted_from_record_id: R1.id,
    problem: 'Mixed bins in corridors; the vermicompost failure showed sorting has to come first.',
    solution: 'Five three-bin stations with Ubud’s picture cards translated into Marathi and Hindi.',
    monitoring_plan: [{ metric_code: 'segregation_accuracy', who: 'implementation_team', frequency: 'Weekly' }], risks: [], updated_at: ts(-3),
  });
  const ubudGarden = add('projects', {
    id: id('g8'), org_id: ubud.id, title: 'Kitchen-garden compost loop', category: 'Food', stage: 'identify', status: 'active',
    owner_role: 'project_lead', template_key: 'canteen_compost', starts_on: day(-6), ends_on: null, adapted_from_record_id: null,
    problem: '', solution: '', monitoring_plan: [], risks: [], updated_at: ts(-1),
  });
  void ubudGarden;

  add('adaptations', { id: id('i1'), source_record_id: R2.id, project_id: compost.id, org_id: aravalli.id, differences: { climate: 'Hot semi-arid instead of tropical', budget: 'Medium budget; scale funded by school', contractor: 'Mixed municipal collection, so a separate pickup point was needed', governance: 'Six-step chain instead of three' }, notes: 'Kept the daily weighing and the public number; added composting because our contractor does not compost.', result: null, created_at: ts(-112) });
  add('adaptations', { id: id('i2'), source_record_id: R1.id, project_id: lakeSeg.id, org_id: lakeside.id, differences: { budget: 'Low budget: reused bins, printed cards', language: 'Cards translated into Marathi and Hindi', contractor: 'Mixed municipal collection' }, notes: 'Started with five stations, not nine.', result: null, created_at: ts(-58) });
  add('adaptations', { id: id('i3'), source_record_id: R4.id, project_id: plastic.id, org_id: aravalli.id, differences: { scale: 'All school events, not one sports day', contracts: 'Tuck shop contract renews in two months' }, notes: 'Applying the vendor-terms lesson first.', result: null, created_at: ts(-10) });

  // Stage gates for the compost project
  const gate = (p: Row, stage: string, signer: Row | null, at: number | null) =>
    add('stage_gates', { id: id('j0'), project_id: p.id, stage, checklist: {}, signed_by: signer?.id ?? null, signed_at: at === null ? null : ts(at) });
  gate(compost, 'identify', aanya, -110);
  gate(compost, 'design', ritu, -96);
  gate(compost, 'implement', aanya, -40);
  gate(compost, 'collaborate', kabir, -12);
  gate(plastic, 'identify', aanya, -4);
  gate(lakeSeg, 'identify', sneha, -55);
  gate(lakeSeg, 'design', anil, -45);

  // Tasks
  const task = (p: Row, title: string, owner: string, status: string, due: number | null) =>
    add('tasks', { id: id('k0'), project_id: p.id, title, owner_role: owner, status, due_on: due === null ? null : day(due) });
  task(compost, 'Choose a compost method that fits the space', 'implementation_team', 'done', -100);
  task(compost, 'Agree daily handover with canteen staff', 'project_lead', 'done', -95);
  task(compost, 'Agree separate pickup point with contractor', 'faculty_liaison', 'done', -70);
  task(compost, 'Set contamination sampling rota (Grades 8, 9, 11)', 'implementation_team', 'done', -60);
  task(compost, 'Monday results on the corridor screen', 'ekoa_rep', 'doing', null);
  task(compost, 'Request peer audit from Ubud Hills (T3)', 'ekoa_rep', 'todo', 10);
  task(compost, 'Choose outcome class and finish the record', 'project_lead', 'todo', 20);
  task(plastic, 'Count items for one full week', 'implementation_team', 'done', -5);
  task(plastic, 'Meet tuck shop vendor about alternatives', 'project_lead', 'todo', 9);
  task(plastic, 'Draft event vendor terms', 'board_member', 'doing', 14);
  task(lakeSeg, 'Translate picture cards into Marathi and Hindi', 'implementation_team', 'done', -50);
  task(lakeSeg, 'Weekly unannounced audit', 'implementation_team', 'doing', null);

  // Project metric targets
  const pm = (p: Row, code: string, baseline: number | null, target: number | null) => add('project_metrics', { id: id('l0'), project_id: p.id, metric_code: code, baseline, target });
  pm(compost, 'diversion_rate', 18, 45);
  pm(compost, 'compost_contamination', 41, 15);
  pm(compost, 'canteen_waste_per_meal', 96, 75);
  pm(plastic, 'single_use_plastic', 1240, 400);
  pm(lakeSeg, 'segregation_accuracy', 42, 75);

  // Measurements
  const meas = (p: Row, code: string, value: number, raw: Row, offset: number, by: Row, roleKey: string, tier: number, baseline = false) =>
    add('measurements', {
      id: id('m0'), project_id: p.id, metric_code: code, value, raw, period_start: day(offset - 6), period_end: day(offset),
      is_baseline: baseline, method: baseline ? 'Baseline audit, library protocol v1' : 'Library protocol v1', entered_by: by.id, entered_role: roleKey,
      tier, evidence_id: null, replaces_id: null, created_at: ts(offset, 16),
    });
  meas(compost, 'diversion_rate', 18, { diverted_kg: 81, total_kg: 450 }, -112, ishaan, 'implementation_team', 2, true);
  meas(compost, 'canteen_waste_per_meal', 96, { food_kg: 197, meals: 2050 }, -112, ishaan, 'implementation_team', 2, true);
  meas(compost, 'compost_contamination', 41, { contaminant_kg: 2.05, sample_kg: 5 }, -84, ishaan, 'implementation_team', 2, true);
  const div = [24, 29, 31, 33, 30, 35, 38, 41, 43, 44, 46];
  div.forEach((v, i) => meas(compost, 'diversion_rate', v, { diverted_kg: Math.round(v * 4.4), total_kg: 440 }, -77 + i * 7, i % 3 === 0 ? kabir : ishaan, 'implementation_team', i < 8 ? 2 : i < 10 ? 1 : 0));
  const cont = [33, 27, 22, 18, 14, 12];
  cont.forEach((v, i) => meas(compost, 'compost_contamination', v, { contaminant_kg: +(v * 0.05).toFixed(2), sample_kg: 5 }, -70 + i * 14, ishaan, 'implementation_team', i < 4 ? 2 : 1));
  const cwm = [92, 88, 85, 84, 80, 78, 77, 74, 73, 71, 71];
  cwm.forEach((v, i) => meas(compost, 'canteen_waste_per_meal', v, { food_kg: +(v * 2.05).toFixed(1), meals: 2050 }, -77 + i * 7, ishaan, 'implementation_team', i < 8 ? 2 : 0));
  meas(plastic, 'single_use_plastic', 1240, { items: 1240 }, -5, ishaan, 'implementation_team', 1, true);
  meas(lakeSeg, 'segregation_accuracy', 42, { correct: 126, checked: 300 }, -52, sneha, 'implementation_team', 2, true);
  [51, 58, 63, 67, 66, 71].forEach((v, i) => meas(lakeSeg, 'segregation_accuracy', v, { correct: v * 3, checked: 300 }, -42 + i * 7, sneha, 'implementation_team', i < 3 ? 2 : 0));

  // Ubud Hills' completed segregation project: full measurement and approval history
  pm(ubudSegProject, 'segregation_accuracy', 46, 80);
  pm(ubudSegProject, 'diversion_rate', 22, 50);
  meas(ubudSegProject, 'segregation_accuracy', 46, { correct: 138, checked: 300 }, -165, putu, 'project_lead', 3, true);
  meas(ubudSegProject, 'diversion_rate', 22, { diverted_kg: 37, total_kg: 168 }, -165, putu, 'project_lead', 3, true);
  [55, 61, 66, 70, 74, 77, 79, 81, 83, 84].forEach((v, i) => meas(ubudSegProject, 'segregation_accuracy', v, { correct: v * 3, checked: 300 }, -158 + i * 7, made, 'ekoa_rep', 3));
  [27, 31, 35, 38, 41, 44, 46, 48, 50, 51].forEach((v, i) => meas(ubudSegProject, 'diversion_rate', v, { diverted_kg: Math.round(v * 1.68), total_kg: 168 }, -158 + i * 7, made, 'ekoa_rep', i < 8 ? 3 : 2));
  {
    const us = steps[ubud.id];
    const up = add('proposals', { id: id('n3'), project_id: ubudSegProject.id, title: 'Nine three-bin stations with picture cards', ask: 'IDR 4.2 million for bins and laminated cards', submitted_at: ts(-185), current_step_id: null, decision: 'approved', decided_at: ts(-168) });
    let c = -185;
    [2, 4, 6, 5].forEach((d, i) => {
      add('approval_events', { id: id('o5'), proposal_id: up.id, step_id: us[i].id, entered_at: ts(c), decided_at: ts(c + d), decision: 'passed', notes: '' });
      c += d;
    });
    add('budget_pathways', { id: id('p3'), project_id: ubudSegProject.id, source_type: 'school_budget', amount: 4200000, currency: 'IDR', approver: 'Head of School', status: 'released', rigidity_notes: '' });
    add('budget_lines', { id: id('p6'), project_id: ubudSegProject.id, category: 'equipment', item: 'Nine three-bin stations', planned: 3400000, actual: 3550000, currency: 'IDR', note: '' });
    add('budget_lines', { id: id('p6'), project_id: ubudSegProject.id, category: 'printing', item: 'Laminated picture cards', planned: 800000, actual: 750000, currency: 'IDR', note: '' });
    add('obstacles', { id: id('q1'), project_id: ubudSegProject.id, stage: 'implement', category: 'vendor', subcategory: 'Contractor mixes streams', severity: 'delayed', started_on: day(-150), resolved_on: day(-146), description: 'Collector loaded all three bins into one truck in week 2.', resolution: 'Operations agreed separate pickups with the collector.' });
  }

  // Proposals and approval timings
  const s = steps[aravalli.id];
  const prop = add('proposals', { id: id('n0'), project_id: compost.id, title: 'Three compost drums and a canteen weighing rota', ask: 'INR 18,000 for three rotating compost drums and a platform scale', submitted_at: ts(-95), current_step_id: null, decision: 'approved', decided_at: ts(-47) });
  const durations = [2, 6, 2, 5, 21, 4];
  let cursor = -95;
  durations.forEach((d, i) => {
    add('approval_events', { id: id('o0'), proposal_id: prop.id, step_id: s[i].id, entered_at: ts(cursor), decided_at: ts(cursor + d), decision: 'passed', notes: i === 4 ? 'Held for the quarterly management meeting.' : '' });
    cursor += d;
  });
  const prop2 = add('proposals', { id: id('n1'), project_id: plastic.id, title: 'Packaging terms in event vendor agreements', ask: 'Policy change, no spending', submitted_at: ts(-3), current_step_id: s[1].id, decision: 'pending', decided_at: null });
  add('approval_events', { id: id('o1'), proposal_id: prop2.id, step_id: s[0].id, entered_at: ts(-3), decided_at: ts(-2), decision: 'passed', notes: '' });
  add('approval_events', { id: id('o2'), proposal_id: prop2.id, step_id: s[1].id, entered_at: ts(-2), decided_at: null, decision: 'pending', notes: '' });
  const ls = steps[lakeside.id];
  const prop3 = add('proposals', { id: id('n2'), project_id: lakeSeg.id, title: 'Five three-bin stations', ask: 'INR 3,200 for laminating and labels', submitted_at: ts(-50), current_step_id: ls[4].id, decision: 'pending', decided_at: null });
  [[0, 2], [1, 2], [2, 6], [3, 4]].forEach(([i, d], k) => {
    const start = -50 + [0, 2, 4, 10][k];
    add('approval_events', { id: id('o3'), proposal_id: prop3.id, step_id: ls[i].id, entered_at: ts(start), decided_at: ts(start + d), decision: 'passed', notes: '' });
  });
  add('approval_events', { id: id('o4'), proposal_id: prop3.id, step_id: ls[4].id, entered_at: ts(-36), decided_at: null, decision: 'pending', notes: 'Stations installed with reused bins while funds wait.' });

  add('budget_pathways', { id: id('p0'), project_id: compost.id, source_type: 'school_budget', amount: 18000, currency: 'INR', approver: 'Management Committee', status: 'released', rigidity_notes: 'Students cannot request capital items directly; the faculty liaison submitted on their behalf.' });
  add('budget_pathways', { id: id('p1'), project_id: plastic.id, source_type: 'zero_cost', amount: 0, currency: 'INR', approver: 'Sustainability Committee', status: 'planned', rigidity_notes: '' });
  add('budget_pathways', { id: id('p2'), project_id: lakeSeg.id, source_type: 'school_budget', amount: 3200, currency: 'INR', approver: 'Trust Office', status: 'requested', rigidity_notes: 'Trust Office meets monthly; small requests wait for the meeting.' });
  const line = (p: Row, category: string, item: string, planned: number, actual: number | null, currency = 'INR') =>
    add('budget_lines', { id: id('p5'), project_id: p.id, category, item, planned, actual, currency, note: '' });
  line(compost, 'equipment', 'Three rotating compost drums', 12000, 12400);
  line(compost, 'equipment', 'Platform scale for the tray return', 4500, 4500);
  line(compost, 'printing', 'Bin labels and corridor posters', 1500, 900);
  line(lakeSeg, 'printing', 'Laminated picture cards in Marathi and Hindi', 2000, null);
  line(lakeSeg, 'materials', 'Cable ties and bin stands', 1200, null);

  // Obstacles
  const obs = (p: Row, stage: string, cat: string, sub: string, sev: string, start: number, end: number | null, desc: string, res: string) =>
    add('obstacles', { id: id('q0'), project_id: p.id, stage, category: cat, subcategory: sub, severity: sev, started_on: day(start), resolved_on: end === null ? null : day(end), description: desc, resolution: res });
  obs(compost, 'implement', 'approval', 'Stalled at a named step', 'delayed', -70, -49, 'Management Committee held the proposal for its quarterly meeting: 21 days against a typical 14.', 'Approved at the meeting; next time submit two weeks before it.');
  obs(compost, 'implement', 'vendor', 'Contractor mixes streams', 'blocked', -45, -36, 'Contractor emptied compost-bound bins into the mixed truck for a week.', 'Faculty liaison agreed a separate, signed pickup point.');
  obs(compost, 'implement', 'time', 'Exam season', 'minor', -30, -22, 'Two rota gaps during Grade 10 pre-boards.', 'Rota moved to Grades 8, 9 and 11.');
  obs(lakeSeg, 'implement', 'budget', 'Delayed release of funds', 'delayed', -36, null, 'Trust Office has not met since the request.', '');
  obs(lakeVermi, 'implement', 'monitoring', 'Nobody measuring', 'blocked', -160, null, 'Sampling stopped when Grade 10 volunteers began exam preparation.', '');

  // Aravalli's draft record (in review)
  rec({
    id: id('h5'), project_id: compost.id, org_id: aravalli.id, title: 'Canteen food-waste composting', category: 'Food', status: 'in_review', visibility: 'network', published_at: null,
    summary: 'Daily plate weighing plus three compost drums lifted diversion from 18% to 46% and cut compost contamination from 41% to 12% in eleven weeks.',
    context: ctx(aravalli),
    problem: 'Canteen food waste was 58% of school waste by weight and left in the mixed municipal collection.',
    intervention: 'Adapted Tampines Green’s tray-return weighing. Added three rotating compost drums, a separate signed pickup point and a fortnightly contamination sample. Results shown on the corridor screen every Monday.',
    timeline: '11 weeks after a 1-week baseline',
    budget_summary: 'Planned INR 18,000 (about USD 216), mostly equipment and printing; INR 17,800 spent, INR 200 under plan. Funded by school budget.', budget_amount_usd: 214,
    budget_planned: 18000, budget_actual: 17800, budget_currency: 'INR', budget_lines: [{ category: 'equipment', planned: 16500, actual: 16900 }, { category: 'printing', planned: 1500, actual: 900 }],
    approval_summary: [{ body: 'Student Council', days: 2 }, { body: 'Sustainability Committee', days: 6 }, { body: 'Faculty Liaison', days: 2 }, { body: 'Principal', days: 5 }, { body: 'Management Committee', days: 21 }, { body: 'Finance Office', days: 4 }],
    obstacles: [{ category: 'approval', note: 'Management Committee took 21 days against a typical 14.' }, { category: 'vendor', note: 'Contractor mixed compost-bound waste for a week.' }, { category: 'time', note: 'Rota gaps in pre-board exams.' }],
    outcomes: [{ metric_code: 'diversion_rate', baseline: 18, result: 46, tier: 2 }, { metric_code: 'compost_contamination', baseline: 41, result: 12, tier: 1 }, { metric_code: 'canteen_waste_per_meal', baseline: 96, result: 71, tier: 2 }],
    outcome_class: 'too_early', tier: 2,
    lessons: 'Submit to Management two weeks before its quarterly meeting. Get the contractor’s pickup arrangement in writing before day one.',
    materials: [{ name: 'Sampling rota', kind: 'Template' }, { name: 'Corridor screen slide', kind: 'Signage' }],
    contributors: ['Project Lead, 2026', 'Ekoa Representative, 2026', 'Implementation Team', 'Faculty Liaison'],
  });

  // ---------- Circles, threads, posts ----------
  const circles: Record<string, Row> = {};
  for (const [name, theme, d] of CIRCLES) circles[theme] = add('circles', { id: id('r0'), name, theme, description: d });
  for (const p of [kabir, made, sneha, weiling, lucas, aanya, putu, ritu, wayan, anil, rajesh, ana, steward, lena]) {
    add('circle_members', { id: id('r1'), circle_id: circles.waste.id, person_id: p.id });
  }
  for (const p of [kabir, aanya, ritu, steward, putu]) add('circle_members', { id: id('r2'), circle_id: circles.policy.id, person_id: p.id });

  const thread = (row: Row) => add('threads', { status: 'open', circle_id: null, org_id: null, org_b: null, record_id: null, ...row });
  const ROLE_LABEL: Record<string, string> = { auditor: 'Peer Auditor', project_lead: 'Project Lead', ekoa_rep: 'Ekoa Representative', faculty_liaison: 'Faculty Liaison', partner: 'Partner', steward: 'Ekoa Steward', implementation_team: 'Implementation Team', board_member: 'Board member', approver: 'Approver' };
  const post = (t: Row, p: Row, body: string, at: number, extra: Row = {}) => {
    const ra = T.role_assignments.find((r) => r.person_id === p.id && r.status !== 'alumni');
    const org = T.organisations.find((o) => o.id === ra?.org_id);
    return add('posts', {
      id: id('s0'), thread_id: t.id, person_id: p.id, body, created_at: ts(at, 15), flagged: false, hidden: false,
      author_name: p.display_name, author_role: ROLE_LABEL[ra?.role] ?? '', author_org: org?.name ?? '', author_is_minor: p.is_minor, ...extra,
    });
  };

  const t1 = thread({ id: id('t1'), kind: 'circle', circle_id: circles.waste.id, title: 'Contamination fell from 41% to 12%: what changed for us', created_by: kabir.id, created_at: ts(-6) });
  post(t1, kabir, 'Three things: a fortnightly 5 kg sample, telling each class its own sorting mistakes, and the corridor screen on Mondays. The screen made the biggest difference.', -6);
  post(t1, weiling, 'Same for us at Tampines. The number at the canteen exit did more than any assembly talk.', -5);
  post(t1, ritu, 'For other liaisons: get the contractor’s pickup arrangement signed. We lost a week before we did.', -5);

  const draftRec = T.records.find((r) => r.project_id === compost.id)!;
  const t2 = thread({ id: id('t2'), kind: 'circle', circle_id: circles.waste.id, record_id: draftRec.id, title: 'Peer review please: Canteen food-waste composting record', created_by: aanya.id, created_at: ts(-14) });
  post(t2, aanya, 'Our record draft is up. We would especially like feedback on the approval section.', -14);
  post(t2, putu, 'Could you add how you handled the contractor? Our collector problem looked similar.', -13);
  post(t2, aanya, 'Added a line on the signed pickup point. Thank you.', -12);

  const t3 = thread({ id: id('t3'), kind: 'partner_request', org_id: lakeside.id, title: 'Need help: keeping compost aerobic through the monsoon', created_by: sneha.id, created_at: ts(-9), status: 'answered' });
  post(t3, sneha, 'Before we try composting again, we want to know how to keep it from going anaerobic in heavy rain.', -9);
  post(t3, lena, 'Cover the drums, add dry leaves at roughly 2 parts brown to 1 part green, and turn twice a week. We can run a group call for your team.', -8);

  const t4 = thread({ id: id('t4'), kind: 'twin', org_id: aravalli.id, org_b: ubud.id, title: 'Aravalli Valley and Ubud Hills: working together', created_by: kabir.id, created_at: ts(-60) });
  post(t4, made, 'Our segregation accuracy is holding at 84%. How is your contamination trend?', -20);
  post(t4, kabir, 'Down to 12%. Would you peer-audit our next sample for T3?', -19);
  post(t4, made, 'T3 audits go to Shiv Nadar or Green School now, so request it from the record page. Happy to look over your sample sheet before you send it.', -18);

  const t5 = thread({ id: id('t5'), kind: 'circle', circle_id: circles.waste.id, title: 'Who has a cheap platform scale that works?', created_by: lucas.id, created_at: ts(-3) });
  post(t5, lucas, 'Looking for a scale under USD 50 that handles 30 kg bins.', -3);
  const held = post(t5, made, 'Message me on 98xxxxxx21 and I can share the model.', -2, { flagged: true, hidden: true, flag_reason: 'contact' });
  add('content_flags', { id: id('fl'), target_kind: 'post', target_id: held.id, org_id: ubud.id, reason: 'contact', source: 'filter', reporter_person_id: null, excerpt: held.body, note: '', status: 'open', decided_by: null, decided_at: null, created_at: ts(-2, 15) });
  const mean = post(t5, meher, 'You guys are such losers, just guess the weight.', -1, { flagged: true, hidden: true, flag_reason: 'bullying' });
  add('content_flags', { id: id('fl'), target_kind: 'post', target_id: mean.id, org_id: aravalli.id, reason: 'bullying', source: 'filter', reporter_person_id: null, excerpt: mean.body, note: '', status: 'open', decided_by: null, decided_at: null, created_at: ts(-1, 15) });


  // ---------- Campaigns, events ----------

  const cw = add('campaigns', { id: id('v0'), name: 'Canteen Waste Month', description: 'Four weeks, one metric: grams of food waste per meal served. Ranked by improvement, not by size.', starts_on: day(20), ends_on: day(48), metric_code: 'canteen_waste_per_meal', protocol: 'Weigh plate and kitchen food waste every school day; divide by meals served.', sponsor: 'Compost Commons' });
  for (const o of [aravalli, ubud, tampines]) add('campaign_participants', { id: id('v1'), campaign_id: cw.id, org_id: o.id, baseline: null, latest: null });
  const ss = add('campaigns', { id: id('v2'), name: 'Segregation Sprint', description: 'Three weeks to lift sorting accuracy at bin stations.', starts_on: day(-55), ends_on: day(-34), metric_code: 'segregation_accuracy', protocol: 'Weekly unannounced audit of 3 stations, 100 items each.', sponsor: null });
  add('campaign_participants', { id: id('v3'), campaign_id: ss.id, org_id: ubud.id, baseline: 79, latest: 86 });
  add('campaign_participants', { id: id('v4'), campaign_id: ss.id, org_id: lakeside.id, baseline: 42, latest: 63 });
  add('campaign_participants', { id: id('v5'), campaign_id: ss.id, org_id: viva.id, baseline: 38, latest: 52 });

  add('events', { id: id('w0'), title: 'Waste Circle monthly call', kind: 'circle_call', starts_at: ts(6, 17), circle_id: circles.waste.id, description: 'Contamination sampling: show and tell. Faculty liaisons attend.', adults_present: ['Noor Kapoor (Ekoa)', 'Ritu Malhotra'], recorded: false });
  add('events', { id: id('w1'), title: 'Climate Café for parents at Aravalli Valley', kind: 'climate_cafe', starts_at: ts(9, 18), circle_id: null, description: 'An informal evening for parents: what the compost project found and how to sort at home.', adults_present: ['Ritu Malhotra'], recorded: false });
  add('events', { id: id('w2'), title: 'Pilot cohort call', kind: 'cohort_call', starts_at: ts(13, 17), circle_id: null, description: 'Month 4 check-in: data completeness and handover planning.', adults_present: ['Noor Kapoor (Ekoa)', 'Wayan Sudarta'], recorded: false });
  add('events', { id: id('w3'), title: 'Workshop: running a contamination audit', kind: 'workshop', starts_at: ts(16, 16), circle_id: circles.waste.id, description: 'Run by Compost Commons, group session only.', adults_present: ['Lena Ortiz (Compost Commons)', 'Noor Kapoor (Ekoa)'], recorded: false });

  // ---------- Policies ----------
  const clauses = POLICY_CLAUSES;
  const clauseRows = clauses.map(([section, title, body], i) =>
    add('policy_clauses', { id: id('x0'), section, title, body, source_org_id: i % 3 === 0 ? ubud.id : null, adoption_count: [4, 3, 3, 2, 4, 3, 4, 2, 2, 3, 2, 1, 1, 3][i] }),
  );
  const section = (c: Row) => ({ key: c.section + '-' + c.id.slice(-4), title: c.title, body: c.body, clause_id: c.id });
  add('policies', { id: id('y0'), org_id: aravalli.id, title: 'School Sustainability & Continuity Policy', version: 2, status: 'internal_review', sections: clauseRows.slice(0, 10).map(section), adopted_at: null, updated_at: ts(-4) });
  const ubPolicy = add('policies', { id: id('y1'), org_id: ubud.id, title: 'Sustainability & Continuity Policy', version: 3, status: 'amended', sections: clauseRows.map(section), adopted_at: ts(-160), updated_at: ts(-40) });
  const avPolicy = T.policies.find((x) => x.org_id === aravalli.id)!;
  add('policies', { id: id('y4'), org_id: lakeside.id, title: 'Green School Policy', version: 1, status: 'draft', sections: clauseRows.slice(4, 12).map(section), adopted_at: null, updated_at: ts(-9) });
  add('policy_links', { id: id('yl'), policy_id: avPolicy.id, org_id: aravalli.id, url: 'https://docs.google.com/document/d/aravalli-compost-rota/edit', title: 'Compost sampling rota, this term', note: 'Who weighs the sample each fortnight. Edit it if you swap a slot.', added_by: kabir.id, added_by_name: kabir.display_name, hidden: false, created_at: ts(-8) });
  add('policy_links', { id: id('yl'), policy_id: avPolicy.id, org_id: aravalli.id, url: 'https://docs.google.com/spreadsheets/d/aravalli-vendor-terms/edit', title: 'Event vendor packaging terms (draft)', note: '', added_by: ritu.id, added_by_name: ritu.display_name, hidden: false, created_at: ts(-3) });
  add('policy_amendments', { id: id('y2'), policy_id: ubPolicy.id, summary: 'Added the six-seat staggered board.', adopted_on: day(-120) });
  add('policy_amendments', { id: id('y3'), policy_id: ubPolicy.id, summary: 'Required unannounced audits for all segregation data.', adopted_on: day(-40) });

  // ---------- Handover ----------
  add('handover_packets', {
    id: id('z0'), org_id: aravalli.id, role: 'project_lead', from_person_id: aanya.id, to_person_id: meher.id,
    snapshot: {
      generated_at: ts(-3),
      projects: [
        { id: compost.id, title: compost.title, stage: 'measure', status: 'active', next_step: 'Request the T3 peer audit from Ubud Hills, then choose the outcome class.' },
        { id: plastic.id, title: plastic.title, stage: 'design', status: 'active', next_step: 'Meet the tuck shop vendor before the contract renews.' },
      ],
      stalled_approvals: [{ proposal: 'Packaging terms in event vendor agreements', step: 'Sustainability Committee', days: 2 }],
      metrics: [
        { project: compost.title, metric: 'Diversion rate', latest: 46, unit: '%' },
        { project: compost.title, metric: 'Compost contamination', latest: 12, unit: '%' },
      ],
      lessons: ['Submit to Management two weeks before its quarterly meeting.', 'Keep the sampling rota out of exam years.'],
      contacts: [{ role: 'faculty_liaison', label: 'Faculty Liaison' }, { role: 'ekoa_rep', label: 'Ekoa Representative' }, { role: 'approver', label: 'Principal' }],
    },
    checklist: { packet_reviewed: true, shadow_started: true, meeting_held: false, archive_checked: false },
    note: 'The compost project is close to done. The main risk is the contractor: check the pickup point is still being used every week.',
    signed_out_at: null, signed_in_at: null, signed_liaison_at: null, term_switch_on: day(40), created_at: ts(-3),
  });

  // ---------- Independent students ----------
  const indie = (name: string, email: string, age: string, consent: string, school: string, city: string) => {
    const p = person(name, email, age, consent);
    const o = add('organisations', { id: id('ai'), name: `${name} (independent)`, org_type: 'independent', country: 'India', city, school_name: school, lat: null, lng: null, curriculum: null, student_count: null, grade_range: null, climate_zone: null, context_profile: null, status: 'active', public_visible: false, anonymised_label: null });
    add('role_assignments', { id: id('d0'), person_id: p.id, org_id: o.id, role: 'project_lead', seat: null, local_title: 'Independent student', term_start: day(-10), term_end: null, status: 'active' });
    return { p, o };
  };
  const diya = indie('Diya Sharma', 'diya@student.example', '16-17', 'granted', 'Sunrise Public School', 'Gurugram');
  add('consent_records', { id: id('cr'), person_id: diya.p.id, guardian_name: 'Anil Sharma', guardian_email: 'anil.sharma@family.example', scope: { account: true, cross_school: false, photos: true, name_on_records: false }, method: 'email_link', terms_version: '2026-10', token: id('tk'), granted_at: ts(-9), withdrawn_at: null });
  const bottles = add('projects', {
    id: id('g9'), org_id: diya.o.id, title: 'Water bottle refill station for the senior block', category: 'Waste', stage: 'identify', status: 'active',
    owner_role: 'project_lead', template_key: null, starts_on: day(-8), ends_on: null, adapted_from_record_id: null,
    problem: 'A three-day count found 410 plastic water bottles thrown away in the senior block.',
    solution: 'Ask the school to install one filtered refill station and track bottle counts for six weeks.',
    monitoring_plan: [{ metric_code: 'single_use_plastic', who: 'project_lead', frequency: 'Weekly' }], risks: [], updated_at: ts(-2),
  });
  add('budget_pathways', { id: id('bp'), project_id: bottles.id, source_type: 'sponsor', amount: 18500, currency: 'INR', approver: 'School principal', status: 'planned', rigidity_notes: '' });
  add('budget_lines', { id: id('bl'), project_id: bottles.id, category: 'equipment', item: 'Filtered refill station', planned: 16000, actual: null, currency: 'INR', note: 'Quote from a local supplier' });
  add('budget_lines', { id: id('bl'), project_id: bottles.id, category: 'printing', item: 'Posters for the launch', planned: 2500, actual: null, currency: 'INR', note: '' });
  const kian = indie('Kian Patel', 'kian@student.example', '13-15', 'pending', 'Green Valley School', 'Pune');
  add('consent_records', { id: id('cr'), person_id: kian.p.id, guardian_name: 'Rhea Patel', guardian_email: 'rhea.patel@family.example', scope: { account: false, cross_school: false, photos: false, name_on_records: false }, method: 'email_link', terms_version: '2026-10', token: id('tk'), granted_at: null, withdrawn_at: null });

  add('budget_pathways', { id: id('bp'), project_id: compost.id, source_type: 'school_budget', amount: 14500, currency: 'INR', approver: 'Bursar', status: 'approved', rigidity_notes: '' });
  add('budget_lines', { id: id('bl'), project_id: compost.id, category: 'equipment', item: 'Three compost drums', planned: 9000, actual: 9400, currency: 'INR', note: '' });
  add('budget_lines', { id: id('bl'), project_id: compost.id, category: 'equipment', item: 'Platform scale, 30 kg', planned: 3500, actual: 3500, currency: 'INR', note: '' });
  add('budget_lines', { id: id('bl'), project_id: compost.id, category: 'printing', item: 'Bin signs for the canteen', planned: 2000, actual: null, currency: 'INR', note: '' });

  // ---------- Steward data ----------
  const app = (name: string, email: string, org: string, country: string, r: string, msg: string, status: string, at: number, hasLead = '', leadPlan = '') =>
    add('applications', { id: id('aa'), name, email, organisation: org, country, role: r, message: msg, has_lead: hasLead, lead_plan: leadPlan, status, notes: '', created_at: ts(at) });
  app('Thandi Mokoena', 'thandi@harbourview.example', 'Harbourview College', 'South Africa', 'School / School Network', 'We run an eco club of 40 students and want help with continuity after Grade 12s leave.', 'new', -1, 'eco_club', 'Our eco club president would be Project Lead, with Ms Naidoo (Geography) as faculty liaison.');
  Object.assign(T.applications[T.applications.length - 1], { kind: 'school', org_id: null, student_emails: ['lwazi.d@harbourview.example', 'amahle.n@harbourview.example', 'sipho.k@harbourview.example'] });
  add('applications', { id: id('aa'), name: ritu.display_name, email: ritu.email, organisation: aravalli.name, country: 'India', role: 'Faculty liaison', message: 'Please add these 2 students to Aravalli Valley School.', has_lead: 'yes', lead_plan: '', status: 'new', notes: '', kind: 'students', org_id: aravalli.id, student_emails: ['ishaan.v@aravalli.example', 'tara.b@aravalli.example'], created_at: ts(-1, 9) });
  app('Joseph Kamau', 'joseph@nairobigreen.example', 'Nairobi Green Academy', 'Kenya', 'Sustainability Coordinator / Eco Club', 'Interested in the waste pilot for next term.', 'contacted', -6);
  app('Bea Santos', 'bea.santos@example.com', 'Quezon City Science High', 'Philippines', 'Student Leader', 'I lead our school’s climate club and want to join a circle.', 'new', -2, 'no', 'Nobody leads it yet. I would lead and ask our chemistry teacher to be the liaison.');
  app('Pema Sherpa', 'pema@riversalive.example', 'Rivers Alive', 'Nepal', 'Climate-focused NGO / Partner', 'We could support water audits in schools in the Kathmandu valley.', 'call_booked', -11);
  app('Clara Mendes', 'clara@meridianimpact.example', 'Meridian Impact Fund', 'Portugal', 'ESG Institution', 'Exploring sponsorship of a campaign.', 'agreement_sent', -20);

  add('safeguarding_reports', { id: id('ab'), reporter_person_id: null, reporter_contact: 'Automatic flag', subject_ref: 'Post in “Who has a cheap platform scale that works?”', category: 'privacy', details: 'A student shared a phone number in a circle thread. Post hidden automatically.', status: 'triaged', assigned_to: 'Noor Kapoor (Ekoa safeguarding lead)', actions: [{ at: ts(-2, 16), note: 'Post hidden by keyword filter.' }, { at: ts(-2, 18), note: 'Faculty liaison at Ubud Hills informed; student reminded of circle rules.' }], created_at: ts(-2, 16) });
  add('safeguarding_reports', { id: id('ac'), reporter_person_id: ritu.id, reporter_contact: 'Ritu Malhotra', subject_ref: 'External link in Policy circle', category: 'content', details: 'Link to an unrelated commercial site posted by an unknown account.', status: 'resolved', assigned_to: 'Noor Kapoor (Ekoa safeguarding lead)', actions: [{ at: ts(-30), note: 'Link removed.' }, { at: ts(-29), note: 'Account was a test account; deleted.' }], created_at: ts(-30) });

  add('verifications', { id: id('ad'), record_id: R2.id, requested_tier: 4, requested_by_org: tampines.id, verifier_org: commons.id, status: 'requested', notes: 'Raw daily logs attached.', created_at: ts(-8) });
  add('verifications', { id: id('ae'), record_id: R1.id, requested_tier: 3, requested_by_org: ubud.id, verifier_org: sns.id, status: 'verified', notes: 'Remote audit of three stations from photos and counts. Accuracy figures match the Thursday audit sheets.', created_at: ts(-95) });
  add('verifications', { id: id('ae'), record_id: R2.id, requested_tier: 3, requested_by_org: tampines.id, verifier_org: greenSchool.id, status: 'verified', notes: 'Checked 8 weeks of daily weighing logs against the exit whiteboard photos.', created_at: ts(-140) });
  add('verifications', { id: id('ae'), record_id: draftRec.id, requested_tier: 3, requested_by_org: aravalli.id, verifier_org: greenSchool.id, status: 'requested', notes: 'Raw sample weights and photos from the last four sampling days are attached.', created_at: ts(-4) });

  for (const [actor, action, entity, at] of [
    [ritu.id, 'verified 8 measurements', 'measurements', -20],
    [steward.id, 'hid post (keyword: phone number)', 'posts', -2],
    [aanya.id, 'signed gate: implement', 'stage_gates', -40],
    [steward.id, 'onboarded school', 'organisations', -130],
  ] as [string, string, string, number][]) {
    add('audit_log', { id: id('af'), actor_person_id: actor, action, entity, entity_id: '', meta: {}, at: ts(at) });
  }

  add('evidence', { id: id('ag'), org_id: aravalli.id, project_id: compost.id, file_name: 'compost-drums-week6.jpg', file_type: 'image/jpeg', data_url: null, storage_path: null, contains_people: false, consent_checked: true, exif_stripped: true, caption: 'Three drums behind the junior block, week 6', created_at: ts(-40) });

  T.metric_definitions = METRIC_LIBRARY.map((m) => ({ ...m }));
  T.templates = TEMPLATES.map((t) => ({ key: t.key, name: t.name }));
  return T;
}
