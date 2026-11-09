import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Field, Input, Notice, Select, Textarea, cx } from '@/components/ui';
import { fireConfetti } from '@/components/confetti';

// A preview of the student "start a project" flow, laid out like an application
// (sections on the left, one section at a time, review and submit at the end).
// Nothing is saved or sent: it exists so the submit celebration can be seen.
const STEPS = ['Basics', 'Your idea', 'Review & submit'] as const;

export default function StudentDemo() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Energy');
  const [problem, setProblem] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const complete = [title.trim() !== '', problem.trim() !== '', done];

  function next() {
    if (step === 0 && !title.trim()) { setError('Give the project a name.'); return; }
    setError(null);
    setStep(step + 1);
  }
  function submit() {
    setDone(true);
    fireConfetti();
  }

  return (
    <div className="mx-auto max-w-page px-4 py-12 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-label text-leaf-600">Student demo · nothing is saved</p>
      <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Project application</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Application sections" className="h-fit rounded-panel border border-paper-line bg-white p-3">
          <ol className="space-y-1">
            {STEPS.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => !done && setStep(i)}
                  aria-current={step === i ? 'step' : undefined}
                  className={cx('flex w-full items-center gap-3 rounded-field px-3 py-3 text-left text-sm font-bold', step === i ? 'bg-leaf-100 text-moss-800' : 'text-ink-soft hover:bg-paper-deep')}
                >
                  <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs', complete[i] ? 'border-leaf bg-leaf text-white' : 'border-paper-line')}>
                    {complete[i] ? <Check size={14} aria-hidden /> : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="rounded-panel border border-paper-line bg-white p-6 sm:p-8">
          {done ? (
            <div className="py-6 text-center">
              <h2 className="text-3xl font-bold">Application submitted</h2>
              <p className="mx-auto mt-3 max-w-prose text-ink-soft">Nice work. In the real app your project would now open in its workspace at the Identify stage.</p>
              <Button className="mt-6" onClick={() => { setDone(false); setStep(0); setTitle(''); setProblem(''); setPlan(''); }}>Start over</Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{STEPS[step]}</h2>
              <div className="mt-5 space-y-4">
                {step === 0 && (<>
                  <Field label="Project name" error={error}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Switch the library to LED lighting" /></Field>
                  <Field label="Category">
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {['Energy', 'Water', 'Waste', 'Biodiversity', 'Food', 'Transport'].map((c) => <option key={c}>{c}</option>)}
                    </Select>
                  </Field>
                </>)}
                {step === 1 && (<>
                  <Field label="What problem are you solving?"><Textarea rows={4} value={problem} onChange={(e) => setProblem(e.target.value)} /></Field>
                  <Field label="How will you try it?" hint="A rough first idea is fine."><Textarea rows={4} value={plan} onChange={(e) => setPlan(e.target.value)} /></Field>
                </>)}
                {step === 2 && (<>
                  <dl className="divide-y divide-paper-line rounded-field border border-paper-line">
                    {[['Project', title || 'Not filled in'], ['Category', category], ['Problem', problem || 'Not filled in'], ['Plan', plan || 'Not filled in']].map(([k, v]) => (
                      <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr]"><dt className="text-sm font-bold text-ink-soft">{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                  <Notice tone="sky">You can go back to any section before you submit.</Notice>
                </>)}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>Back</Button>
                {step < 2 ? <Button onClick={next}>Save &amp; continue</Button> : <Button onClick={submit}>Submit project</Button>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
