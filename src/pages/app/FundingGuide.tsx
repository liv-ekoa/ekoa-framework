import { useState } from 'react';
import { ExternalLink, Printer } from 'lucide-react';
import { ALL_COUNTRIES, FUNDING_ROLES, FUNDING_STEPS, PAYING_RULES, PLATFORM_QUESTIONS, PROJECT_SUMMARY, ROUTES, guideFor } from '@/lib/funding';
import { Badge, Button, Field, Notice, PageHeader, Panel, Select } from '@/components/ui';

export default function FundingGuide() {
  const [country, setCountry] = useState('');
  const guide = guideFor(country);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund your project"
        lead="Some projects need money and some students have none. This packet helps your team raise funds in your own country. Ekoa does not collect or hold the money."
        actions={<Button variant="quiet" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print the packet</Button>}
      />

      <Notice tone="clay">
        Ekoa is built for minors. A teacher or another adult should hold any fundraising account, and no student under 18 should be named or photographed without guardian consent.
      </Notice>

      <Panel title="Steps">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {FUNDING_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Panel>

      <Panel title="Who is in charge">
        <p className="mb-3 text-sm text-ink-soft">A funding team has several students, a teacher and an advisor, so no single person handles the money alone.</p>
        <dl className="divide-y divide-paper-line">
          {FUNDING_ROLES.map((r) => (
            <div key={r.who} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr]">
              <dt><span className="font-bold">{r.who}</span><span className="block text-xs text-ink-mute">{r.role}</span></dt>
              <dd className="text-sm">{r.does}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="What your project summary should say">
        <div className="grid gap-4 md:grid-cols-2">
          {PROJECT_SUMMARY.map((p) => (
            <div key={p.heading} className="rounded-field border border-paper-line p-3">
              <h3 className="font-bold">{p.heading}</h3>
              <p className="text-sm text-ink-soft">{p.prompt}</p>
              <p className="mt-2 text-sm italic text-ink-mute">Example: {p.example}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Four ways to collect the money">
        <div className="grid gap-3 md:grid-cols-2">
          {ROUTES.map((r) => (
            <div key={r.name} className="rounded-field border border-paper-line p-3 text-sm">
              <h3 className="font-bold">{r.name}</h3>
              <p className="text-xs text-ink-mute">{r.best}</p>
              <p className="mt-1">{r.how}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Where to raise the money in your country">
        <div className="no-print mb-3 max-w-xs">
          <Field label="Your country">
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Select your country</option>
              {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        {!country ? <p className="text-sm text-ink-soft">Pick your country to see where students there can raise money.</p> : <>
        <p className="mb-3 text-sm text-ink-soft">{guide.summary}</p>
        <ul className="space-y-3">
          {guide.options.map((p) => (
            <li key={p.name} className="rounded-field border border-paper-line p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{p.name} <Badge>{p.kind}</Badge></span>
                <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-moss hover:underline">Open <ExternalLink className="h-3 w-3" aria-hidden /></a>
              </div>
              <p className="mt-1">{p.note}</p>
              <p className="mt-1 text-ink-soft"><span className="font-bold">Check:</span> {p.confirm}</p>
            </li>
          ))}
        </ul>
        <h3 className="mt-4 font-bold">Ask any platform or sponsor these five questions</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
          {PLATFORM_QUESTIONS.map((q) => <li key={q}>{q}</li>)}
        </ul>
        <p className="mt-3 text-xs text-ink-mute">Platform rules change and we cannot promise these are current. Confirm with the platform before you commit.</p>
        </>}
      </Panel>

      <Panel title="How the project actually gets paid for">
        <dl className="divide-y divide-paper-line">
          {PAYING_RULES.map((r) => (
            <div key={r.title} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr]">
              <dt className="font-bold">{r.title}</dt>
              <dd className="text-sm">{r.body}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
