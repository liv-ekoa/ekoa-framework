import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { parseEmails, submitApplication } from '@/lib/api';
import { Link } from 'react-router-dom';
import { useAction } from '@/lib/hooks';
import { Button, ErrorNote, Field, Input, Select, Textarea, cx } from '@/components/ui';
import type { Application } from '@/lib/types';

const LEAD_OPTIONS: { key: Application['has_lead']; label: string; hint: string }[] = [
  { key: 'yes', label: 'Yes, a sustainability head or coordinator', hint: 'They become the Project Lead or the faculty liaison.' },
  { key: 'eco_club', label: 'An eco club or student council runs it', hint: 'Its president or a council member can be the Project Lead.' },
  { key: 'no', label: 'Nobody yet', hint: 'That is fine. One teacher and one student are enough to start.' },
];

const ROLES = ['School / School Network', 'Sustainability Coordinator / Eco Club', 'Student Leader', 'Educator / Advisor', 'Climate-focused NGO / Partner', 'ESG Institution', 'Other'];
const LOOKING = [
  'Climate and school networks ready for implementation',
  'Sustainability coordinators and active eco clubs',
  'Student leaders and youth organisations',
  'Climate-focused NGOs and implementation partners',
  'Educators, advisors and ESG institutions',
];

export default function Join() {
  const [f, setF] = useState({ name: '', email: '', organisation: '', country: '', role: '', message: '', has_lead: '' as Application['has_lead'], lead_plan: '', students: '' });
  const [sent, setSent] = useState(false);
  const act = useAction();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void act.run(async () => {
      if (!f.name.trim()) throw new Error('Add your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new Error('Add an email address we can reply to.');
      if (f.has_lead === 'no' && !f.lead_plan.trim()) throw new Error('Tell us who could lead: one teacher and one student is enough.');
      const student_emails = parseEmails(f.students);
      if (student_emails.length > 500) throw new Error('Send up to 500 student emails at a time.');
      const { students: _s, ...rest } = f;
      await submitApplication({ ...rest, email: f.email.trim().toLowerCase(), kind: 'school', org_id: null, student_emails });
      setSent(true);
    });
  };

  if (sent)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" aria-hidden />
        <h1 className="mt-6 text-3xl font-bold">Application received</h1>
        <p className="mt-3 text-ink-soft">Thank you, {f.name.split(' ')[0]}. An Ekoa admin will reply to {f.email} within a week to book a 30-minute call.</p>
      </div>
    );

  return (
    <div className="mx-auto grid max-w-page gap-14 px-4 py-16 sm:px-6 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Help us build this from the ground up.</h1>
        <p className="mt-5 max-w-[48ch] text-lg text-ink-soft">We are forming an early global founding cohort of schools, student leaders, educators and organisations who want to shape the future of student-led sustainability infrastructure.</p>
        <h2 className="mt-10 text-lg font-semibold">Who we are looking for</h2>
        <ul className="mt-3 space-y-2">
          {LOOKING.map((l) => <li key={l} className="flex gap-3 text-ink-soft"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{l}</li>)}
        </ul>
        <h2 className="mt-10 text-lg font-semibold">What happens next</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-soft">
          <li>An Ekoa admin reads your application and replies within a week.</li>
          <li>We book a 30-minute call to check fit.</li>
          <li>Schools sign a participation and safeguarding agreement.</li>
          <li>You get your workspace and join a cohort.</li>
        </ol>
      </div>
      <form onSubmit={submit} className="space-y-5 rounded-panel border border-paper-line bg-white p-6 sm:p-8" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" id="j-name"><Input id="j-name" value={f.name} onChange={set('name')} autoComplete="name" required /></Field>
          <Field label="Email" id="j-email"><Input id="j-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="you@school.edu" required /></Field>
          <Field label="Organisation" id="j-org"><Input id="j-org" value={f.organisation} onChange={set('organisation')} placeholder="School or organisation" /></Field>
          <Field label="Country" id="j-country"><Input id="j-country" value={f.country} onChange={set('country')} autoComplete="country-name" /></Field>
        </div>
        <Field label="Your role" id="j-role">
          <Select id="j-role" value={f.role} onChange={set('role')}>
            <option value="">Select your role</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-ink">Does your school already have someone leading sustainability work?</legend>
          <p className="text-xs text-ink-mute">Many schools don’t. You don’t need a sustainability head to join.</p>
          <div className="grid gap-2">
            {LEAD_OPTIONS.map((o) => (
              <label key={o.key} className={cx('flex cursor-pointer items-start gap-3 rounded-field border px-3 py-2.5', f.has_lead === o.key ? 'border-leaf bg-leaf-50' : 'border-paper-line hover:border-ink/30')}>
                <input type="radio" name="has_lead" className="mt-1 accent-leaf" checked={f.has_lead === o.key} onChange={() => setF({ ...f, has_lead: o.key })} />
                <span><span className="block text-sm font-bold text-ink">{o.label}</span><span className="block text-xs text-ink-mute">{o.hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        {f.has_lead && (
          <Field label={f.has_lead === 'no' ? 'Who could lead it?' : 'Who would lead it?'} id="j-lead" hint="A teacher to be the faculty liaison, and a student to be the Project Lead. Titles are up to you.">
            <Textarea id="j-lead" value={f.lead_plan} onChange={set('lead_plan')} rows={2} placeholder="e.g. Ms Rao (Geography) as liaison; our eco club president as Project Lead" />
          </Field>
        )}
        <Field label="Message" id="j-msg" hint="Tell us about your work and how you would like to collaborate.">
          <Textarea id="j-msg" value={f.message} onChange={set('message')} rows={5} />
        </Field>
        <Field label="Student emails (optional)" id="j-stu" hint={`The students who will use Ekoa, one per line or separated by commas. The Ekoa team gives each one a role when your school is set up.${parseEmails(f.students).length ? ` ${parseEmails(f.students).length} found.` : ''}`}>
          <Textarea id="j-stu" value={f.students} onChange={set('students')} rows={4} placeholder={'asha.k@school.edu\nrohan.m@school.edu'} />
        </Field>
        <p className="text-xs text-ink-mute">This form is for schools and organisations. A student can also <Link to="/join/student" className="font-bold underline">join on their own</Link> before their school is on Ekoa. We only use these details to reply to you.</p>
        <ErrorNote>{act.error}</ErrorNote>
        <Button type="submit" variant="dark" size="lg" busy={act.busy} className="w-full">Submit application</Button>
      </form>
    </div>
  );
}
