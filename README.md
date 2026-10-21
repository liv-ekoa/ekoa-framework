# Ekoa

The implementation network for student-led school sustainability. Schools run projects through the six-stage Ekoa cycle, and every project ends as an Implementation Record — failures included — that another school can find, adapt and measure against.

This codebase follows the build outline (“Ekoa Platform — Detailed Build Outline”). Every module in that outline, M1 to M13, is here.

## See it working in two minutes (demo mode)

You need [Node.js 20 or newer](https://nodejs.org).

```bash
npm install
npm run dev
```

Open http://localhost:5173. Click **Sign in** and pick anyone in the fictional pilot cohort: a Project Lead, a Faculty Liaison, the Ekoa steward, a partner, a peer auditor at one of the audit schools, or a student still waiting for guardian consent. Each role sees a different app.

Demo data lives only in your browser. **Settings → Reset demo data** starts it again.

## What changed in the October 2026 update

- **New look.** Colours, fonts and the homepage come from the Ekoa deck: cream paper, moss and sage greens, terracotta accent, Cormorant Garamond headlines and Karla text. The lizard photo is `public/img/` (recoloured to the palette). Fonts are self-hosted in `src/fonts/`. All colour tokens are in `tailwind.config.js`.
- **EKOA meaning.** Education, Knowledge transfer, Outcomes and observation, Adoption and administration, on Home, How it works, About and the footer (`EKOA_LETTERS` in `src/lib/ekoa.ts`).
- **No sustainability head needed.** The role is now **Project Lead**, any student. The minimum team is one teacher (Faculty Liaison) and one student. Members can carry their school's own title, hold several roles, or co-lead. The Join form asks whether the school has a lead. The Implement gate asks for the next Project Lead to be named.
- **Peer audit.** T3 audits come only from the two Ekoa audit schools, Shiv Nadar School, Faridabad and Green School, Bali, never from the school being audited. Auditors work from **More → Audit desk** and see numbers and evidence, never people. Enforced in the database (`guard_verification_request`, `complete_verification`).
- **Budget on every project.** Line-by-line planned spend at Design (required by the gate) and actual spend at Implement (also required). Records show planned against actual; the library filters by cost.
- **School ranking** at `/ranking`, scored only on verified, named, public records and on adoptions by other schools. The formula is on the page and in the `public_school_ranking` view.
- **Villars-style workspace.** Top tabs (Home, Projects, My school, Wall, Connections, Library, More) and a **Connections** map centred on your school, with filters, depth, back and forward, and labelled links. Other schools appear as schools, never as people.
- **One name: Ekoa.** The site is called Ekoa everywhere, including role names (Ekoa Representative, Ekoa Steward), emails and the database. The official logo is traced to vector in `src/components/EkoaLogo.tsx`, with static copies in `public/logo/`, and the O symbol is the favicon and app icon. The contact address is still `hello@ekoagsin.org` until a new mailbox exists; change `VITE_CONTACT_EMAIL` and `EMAIL_FROM` when it does.
- **Live-site copy.** The problem and solution sections and the closing quote from the original ekoa-framework.org are on the new homepage.

## What is where

| Outline module | Where in the code |
| --- | --- |
| M1 Public site and intake | `src/pages/public/*`, `src/components/PublicLayout.tsx` |
| M2 Accounts, roles, consent | `src/lib/auth.tsx`, `src/pages/public/SignIn.tsx`, `GuardianConsent.tsx`, `src/pages/app/MySchool.tsx` |
| M3 Project workspace (Ekoa cycle) | `src/pages/app/project/*`, `src/lib/gates.ts`, `src/lib/ekoa.ts` |
| M4 Implementation Record and Library | `src/components/RecordTag.tsx`, `RecordDetail.tsx`, `LibraryBrowser.tsx`, `src/pages/app/Library.tsx`, `RecordView.tsx`, `RecordEditor.tsx` |
| M5 Failure Ledger and obstacles | `src/pages/app/Library.tsx` (Failure Ledger, Resistance patterns), `project/ObstaclesTab.tsx`, `project/StatusControl.tsx` |
| M6 Governance and Policy Builder | `src/pages/app/Governance.tsx`, `PolicyEditor.tsx`, `project/ApprovalsTab.tsx` |
| M7 Metrics and verification | `src/lib/metrics.ts`, `src/pages/app/QuickLog.tsx`, `Metrics.tsx`, `Kiosk.tsx` |
| M8 Continuity | `src/pages/app/Handover.tsx`, `src/lib/handover.ts`, alerts in `src/lib/bundle.ts` |
| M9 Network | `src/pages/app/Network.tsx` (the Wall), `Connections.tsx` with `src/lib/connections.ts`, `ThreadView.tsx` |
| M10 Reports | `src/pages/app/AppReports.tsx`, `CohortReport.tsx` |
| M11 AI assist | `src/lib/ai.ts`, `supabase/functions/ai-draft` |
| M12 Safeguarding | `src/components/ReportConcern.tsx`, post screening in `src/lib/api.ts` and the database trigger `screen_post` |
| M13 Steward console | `src/pages/app/Steward.tsx`, `PartnerDesk.tsx`, `AuditDesk.tsx` |
| Ranking | `src/pages/public/Ranking.tsx`, `computeRanking` in `src/lib/api.ts`, view `public_school_ranking` |
| Budgets | `src/lib/budget.ts`, budget panel in `project/PlanTab.tsx`, `BudgetBox` in `RecordDetail.tsx` |

The method itself — stages, gate checklists, roles, obstacle taxonomy, metric library, templates — is data in `src/lib/ekoa.ts`. Change the method there.

Every read and write goes through `src/lib/api.ts`. In demo mode it talks to an in-browser store (`src/lib/demoStore.ts`); with Supabase keys it talks to your database. Pages never know the difference.

## Connect a real database (Supabase)

1. Create a project at [supabase.com](https://supabase.com). Choose the **Mumbai** or **Singapore** region.
2. In **SQL Editor**, run these files in order:
   1. `supabase/migrations/20261008000001_schema.sql`
   2. `supabase/migrations/20261008000002_security.sql`
   3. `supabase/seed.sql` (metric library, circles, policy clauses, and the two audit schools)
   4. `supabase/bootstrap-steward.sql` — edit the names and emails first. Stewards must be adults.

   Or with the Supabase CLI: `npx supabase link --project-ref <ref>` then `npx supabase db push`, then run the last two files.
3. **Authentication → Providers → Email**: keep email sign-in on (magic links). **Authentication → URL configuration**: set the Site URL to your domain and add `http://localhost:5173` as a redirect URL.
4. Copy `.env.example` to `.env.local` and paste the project URL and anon key from **Project settings → API**.
5. Restart `npm run dev`. The sign-in page now emails a link instead of showing demo people.
6. Peer audit: Shiv Nadar School, Faridabad and Green School, Bali have both confirmed, and the seed adds them as active, public audit schools. Invite each school's faculty liaison; the liaison then invites their auditors with the **Peer Auditor** role under **My school → People**.

### Server functions (optional but recommended)

```bash
npx supabase functions deploy notify-application
npx supabase functions deploy send-consent
npx supabase functions deploy ai-draft
npx supabase secrets set RESEND_API_KEY=... STEWARD_EMAIL=you@example.org SITE_URL=https://ekoa-framework.org EMAIL_FROM="Ekoa <hello@ekoagsin.org>"
npx supabase secrets set ANTHROPIC_API_KEY=...   # only for AI drafting
```

- `notify-application` emails stewards when someone applies on /join.
- `send-consent` emails guardians their consent link when a liaison invites a student.
- `ai-draft` drafts record text from project facts. It never sends names or contact details. Set `ANTHROPIC_MODEL` to a current model from the Anthropic docs if the default is retired.

Without them the app still works: applications are saved, consent links can be copied from **My school → People**, and record drafts are composed from project data.

## Put it on ekoa-framework.org (Cloudflare)

The site lives in the GitHub repository `liv-ekoa/ekoa-framework`, which is connected to a Cloudflare Worker called `ekoa-framework`. Cloudflare rebuilds the site whenever the repository changes:

- **Pushing to `main` updates the live site** at ekoa-framework.org.
- Pushing to any other branch (for example `new-site`) builds a preview version only, if preview builds are switched on in Cloudflare. The live site does not change.

Cloudflare runs `npm run build` and then `npx wrangler deploy`, which serves the `dist/` folder using `wrangler.jsonc`. Every unknown path falls back to `index.html`, so the app's own routes work.

To connect the database, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **build variables** in the Worker's build settings in Cloudflare, then rebuild. Leave them out, or set `VITE_DEMO=true`, to publish the demo instead.

To deploy by hand from your own computer instead: `npm run deploy` (asks you to sign in to Cloudflare the first time).

## Before any student account goes live

The platform is built for minors, so these are launch requirements, not extras:

- [ ] A trained adult safeguarding lead is named and listed as a steward.
- [ ] Each pilot school has a faculty liaison and has signed the participation and safeguarding agreement.
- [ ] Qualified counsel in India and Indonesia has reviewed the consent page and data handling (DPDP Act 2023; Indonesia PDP Law No. 27 of 2022).
- [ ] Adults with access to students have completed their country’s background check.
- [ ] The security tests pass on your database (below).

## Security tests

`supabase/tests/security_test.sql` checks 55 rules, including peer audit (no self-audit, only audit schools, access ends when an audit closes), budget lines and the ranking: students cannot see other schools, cannot verify their own data or publish, unconsented minors see nothing, contact details in posts are held, anonymised public records hide the school, guardians can consent without an account, and more. Run it on a throwaway local Postgres after `supabase/tests/supabase_stubs.sql` and the migrations; every line should print PASS.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run typecheck` | Type-check only |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/lib/ekoa.ts` and `src/lib/clauses.ts` |

## Built, and not yet built

Built: everything in modules M1 to M13 at pilot depth, demo mode, the full database with row-level security, three server functions.

Next, in rough order of need:
- Semantic search: the `records.embedding` column (pgvector) is ready; the Library currently uses plain-language keyword matching.
- Translations (Hindi, Bahasa Indonesia) through a translation library.
- Scheduled reminders by email (weekly measurement due, handover eight weeks out). The alerts already show on dashboards.
- Meter integrations for energy and water.
- Push notifications for the installed phone app.
