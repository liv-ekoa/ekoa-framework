# Ekoa

> **Preview branch.** This branch runs on fictional data only. See [PREVIEW.md](PREVIEW.md). Never merge it into `main`.

The implementation network for student-led school sustainability. Schools run projects through the six-stage Ekoa cycle, and every project ends as an Implementation Record — failures included — that another school can find, adapt and measure against.

This codebase follows the build outline (“Ekoa Platform — Detailed Build Outline”). Every module in that outline, M1 to M13, is here.

## Run it on your computer

You need [Node.js 20 or newer](https://nodejs.org).

```bash
npm install
cp .env.production .env.local   # or point .env.local at a separate test project
npm run dev
```

Open http://localhost:5173. There is no demo data: you sign in with a magic link sent to your email, and you see only what your role allows. A new account with no role sees a notice until a steward or a school's faculty liaison adds them.

## What changed in the October 2026 update

- **New look.** Colours, fonts and the homepage come from the Ekoa deck: cream paper, moss and sage greens, terracotta accent, Cormorant Garamond headlines and Karla text. The gecko photo is in `public/img/`, in its natural colours. Fonts are self-hosted in `src/fonts/`. All colour tokens are in `tailwind.config.js`.
- **EKOA meaning.** Education, Knowledge transfer, Outcomes and observation, Adoption and administration, on Home, How it works, About and the footer (`EKOA_LETTERS` in `src/lib/ekoa.ts`).
- **No sustainability head needed.** The role is now **Project Lead**, any student. The minimum team is one teacher (Faculty Liaison) and one student. Members can carry their school's own title, hold several roles, or co-lead. The Join form asks whether the school has a lead. The Implement gate asks for the next Project Lead to be named.
- **Peer audit.** T3 audits come only from the two Ekoa audit schools, Shiv Nadar School, Faridabad and Green School, Bali, never from the school being audited. Auditors work from **More → Audit desk** and see numbers and evidence, never people. Enforced in the database (`guard_verification_request`, `complete_verification`).
- **Budget on every project.** Line-by-line planned spend at Design (required by the gate) and actual spend at Implement (also required). Records show planned against actual; the library filters by cost.
- **School ranking** at `/ranking`, scored only on verified, named, public records and on adoptions by other schools. The formula is on the page and in the `public_school_ranking` view.
- **Villars-style workspace.** Top tabs (Home, Projects, My school, Network, Library, Governance, Funding, More). **Network** holds the Wall, the **Connections** map (centred on your school, other schools appear as schools, never as people) and **Possible collaborators**. **Projects** holds the Metrics view.
- **Safety.** Posts, photo captions, policy links and thread titles are screened for bullying, sexual content, violence, hate, self-harm and contact details (`src/lib/moderation.ts`, mirrored in the database as `moderation_hit`). Photos get an in-browser nudity check before upload. Anything caught or reported is hidden at once and goes to the school's liaison (My school, Safety) and the Ekoa admins, who remove it for good or restore it.
- **Possible collaborators.** Schools whose policies share clauses, sections and wording are suggested to each other (`collaborator_suggestions`). This replaced school twins.
- **Helpful links on policies.** Any member can add a Google Doc or other https link to a policy; anyone can report one.
- **Two ways in.** Sign in as a school, or join as an independent student with a private workspace (`/join/student`). Schools list student emails when they register or from My school; Ekoa admins assign roles and can move an independent student's projects into their school (Steward console, Students).
- **Policy library.** Every policy a school adopts is public at once in Library → Policies (`public_policies` view), alongside nine Ekoa model policies (`src/lib/modelPolicies.ts`, loaded by migration 0009; regenerate with `npm run policies:sql`). Drafts stay private. Any school can copy a policy as its own draft.
- **Funding.** Starts from each project's budget and writes a funding ask, with a platform list per country.
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
| M9 Network | `src/pages/app/Network.tsx` (the Wall, Connections, Possible collaborators), `Connections.tsx` with `src/lib/connections.ts`, `ThreadView.tsx` |
| M10 Reports | `src/pages/app/AppReports.tsx`, `CohortReport.tsx` |
| M11 AI assist | `src/lib/ai.ts`, `supabase/functions/ai-draft` |
| M12 Safeguarding | `src/components/ReportConcern.tsx`, post screening in `src/lib/api.ts` and the database trigger `screen_post` |
| M13 Steward console | `src/pages/app/Steward.tsx`, `PartnerDesk.tsx`, `AuditDesk.tsx` |
| Ranking | `src/pages/public/Ranking.tsx`, view `public_school_ranking` in the security migration |
| Budgets | `src/lib/budget.ts`, budget panel in `project/PlanTab.tsx`, `BudgetBox` in `RecordDetail.tsx` |

The method itself — stages, gate checklists, roles, obstacle taxonomy, metric library, templates — is data in `src/lib/ekoa.ts`. Change the method there.

Every read and write goes through `src/lib/api.ts`, straight to the database.

## The database (Supabase)

The live database is the Supabase project **ekoa** (ref `gpwsedgicmpkxjqashbn`, Mumbai region), in the Supabase organisation **Ekoa**. Its address and publishable key are in `.env.production`; both are meant to be public, because row-level security decides what each person can read or change.

Already done on that project:

1. `supabase/migrations/` applied in order:
   - `…0001_schema` and `…0002_security`: tables, row-level security, guard triggers, consent and audit functions, the evidence bucket.
   - `…0003_function_grants`: visitors can call only the guardian consent pair; trigger functions cannot be called directly.
   - `…0004_hardening`: minors always start with consent pending; projects move one stage at a time, after the gate is signed.
   - `…0005_view_grants`: the two public views are read-only.
   - `…0006_roles_and_consent`: adult roles need adults; only stewards give steward or partner roles; consent changes only through the guardian's link.
   - `…0007_school_boundaries`: only stewards change a school's type or audit status; liaisons cannot pull in another school's people; consent records start empty; moderators remove posts but cannot rewrite them; the audit log always names who acted.
2. `supabase/seed.sql`: the metric library, circles, policy clause library, the Founding Cohort, the Ekoa Stewards organisation, and the two audit schools, Shiv Nadar School, Faridabad and Green School, Bali.
3. The private `evidence` storage bucket, with photos filed under each school's id.

Still to do, by a person signed in to Supabase:

1. **First stewards.** Edit the names and emails in `supabase/bootstrap-steward.sql`, then run it in **SQL Editor**. Stewards must be adults; one should be the safeguarding lead. They then sign in on the site with those emails.
2. **Authentication → URL Configuration.** Site URL `https://ekoa-framework.org`. Redirect URLs `https://ekoa-framework.org/**` and `http://localhost:5173/**`.
3. **Authentication → Emails → SMTP settings.** Supabase's built-in mailer only delivers to members of the Supabase team and only a few emails an hour, so sign-in links to schools need your own email service (for example Resend, from `hello@ekoagsin.org`). Enter its SMTP details there.
4. In the steward console, **Schools → Invite faculty liaison** for each school. Liaisons then invite their Project Lead, team and peer auditors under **My school → People**.

The live project's migration history has different version numbers from the files here (they were applied from Claude's Supabase connection on 21 October 2026, the security file in four parts and the last file in three). Before using `npx supabase db push` against it, line the history up with these files (this changes only the history table, not the database):

```bash
npx supabase migration repair --status reverted 20261021153254 20261021153357 20261021153631 20261021153708 20261021153800 20261021154203 20261021154440 20261021155654 20261021160216 20261021160607 20261021160621 20261021160655
npx supabase migration repair --status applied 20261008000001 20261008000002 20261008000003 20261008000004 20261008000005 20261008000006 20261008000007
```

To set up a fresh project instead (for testing): create it, run the files in `supabase/migrations/` in order in **SQL Editor** (or `npx supabase link --project-ref <ref>` then `npx supabase db push`), then `supabase/seed.sql` and `supabase/bootstrap-steward.sql`, and put its URL and publishable key in `.env.local`.

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

Until they are deployed the app still works: applications are saved and stewards see them in the console, liaisons copy each guardian's consent link from **My school → People** and send it themselves, and record drafts are composed from project data.

## Put it on ekoa-framework.org (Cloudflare)

The site lives in the GitHub repository `liv-ekoa/ekoa-framework`, which is connected to a Cloudflare Worker called `ekoa-framework`. Cloudflare rebuilds the site whenever the repository changes:

- **Pushing to `main` updates the live site** at ekoa-framework.org.
- Pushing to any other branch (for example `new-site`) builds a preview version only, if preview builds are switched on in Cloudflare. The live site does not change.

Cloudflare runs `npm run build` and then `npx wrangler deploy`, which serves the `dist/` folder using `wrangler.jsonc`. Every unknown path falls back to `index.html`, so the app's own routes work.

The build reads the database address and publishable key from `.env.production`, so nothing needs setting in Cloudflare. Build variables set in Cloudflare with the same names would override it.

To deploy by hand from your own computer instead: `npm run deploy` (asks you to sign in to Cloudflare the first time).

## Before any student account goes live

The platform is built for minors, so these are launch requirements, not extras:

- [ ] A trained adult safeguarding lead is named and listed as a steward.
- [ ] Each pilot school has a faculty liaison and has signed the participation and safeguarding agreement.
- [ ] Qualified counsel in India and Indonesia has reviewed the consent page and data handling (DPDP Act 2023; Indonesia PDP Law No. 27 of 2022).
- [ ] Adults with access to students have completed their country’s background check.
- [ ] Sign-in emails go through your own email service (see **The database** above).
- [ ] The security tests pass (below).

## Security tests

`supabase/tests/security_test.sql` checks 86 rules, including peer audit (no self-audit, only audit schools, access ends when an audit closes), budget lines and the ranking: students cannot see other schools, cannot verify their own data or publish, unconsented minors see nothing, contact details in posts are held, anonymised public records hide the school, guardians can consent without an account, and more. Run `npm run test:db -- -h <host> -p <port> -U <user>` against a throwaway local PostgreSQL 15 or newer: it builds a fresh database from `supabase/tests/supabase_stubs.sql`, the migrations and the seed, then runs the tests. Every line should print PASS. Never run the stubs on Supabase.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run typecheck` | Type-check only |
| `npm run seed:sql` | Regenerate `supabase/seed.sql` from `src/lib/ekoa.ts` and `src/lib/clauses.ts` |
| `npm run test:db` | Run the database security tests on a local PostgreSQL |
| `npm run deploy` | Build and deploy to Cloudflare by hand |

## Built, and not yet built

Built: everything in modules M1 to M13 at pilot depth, the live database with row-level security, three server functions (written, not yet deployed).

Next, in rough order of need:
- Semantic search: the `records.embedding` column (pgvector) is ready; the Library currently uses plain-language keyword matching.
- Translations (Hindi, Bahasa Indonesia) through a translation library.
- Scheduled reminders by email (weekly measurement due, handover eight weeks out). The alerts already show on dashboards.
- Meter integrations for energy and water.
- Push notifications for the installed phone app.
