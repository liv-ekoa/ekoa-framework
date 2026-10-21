# CLAUDE.md

Guidance for Claude when working in this repository.

## What this is

Ekoa, the implementation network for student-led school sustainability, served at ekoa-framework.org. Public site plus a member app: projects move through the six-stage Ekoa cycle, end as Implementation Records (failures included), are peer-audited by the two Ekoa audit schools, and feed a school ranking. See README.md for the full map of modules.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173, needs .env.local (copy .env.production)
npm run build      # type-check, then build to dist/
npm run deploy     # build and deploy to Cloudflare by hand (normally Cloudflare builds from GitHub)
npm run seed:sql   # regenerate supabase/seed.sql
npm run test:db -- -h /tmp -p 5432   # database security tests on a throwaway local Postgres
```

## Stack

- React 18, TypeScript, Vite 5, Tailwind 3, React Router 6, lucide-react, Leaflet.
- Supabase project `ekoa` (ref `gpwsedgicmpkxjqashbn`, Mumbai): Postgres with row-level security, magic-link auth, storage, edge functions. There is no demo mode. The publishable key in `.env.production` is public by design; never commit a secret or service-role key.
- Cloudflare Worker `ekoa-framework` serves `dist/` (see `wrangler.jsonc`). Pushing to `main` deploys the live site.

## Rules that matter

- The name is **Ekoa** everywhere. Do not reintroduce "GSIN".
- Design tokens live in `tailwind.config.js` (cream paper, moss, sage, clay). Fonts are self-hosted in `src/fonts/`. The logo is `src/components/EkoaLogo.tsx`.
- The Ekoa method (stages, gates, roles, tiers, metrics) is data in `src/lib/ekoa.ts`. Every read and write goes through `src/lib/api.ts`.
- Security is enforced in the database (`supabase/migrations/*_security.sql`), and `supabase/tests/security_test.sql` must keep passing. New schema changes go in a new numbered file in `supabase/migrations/`, never by editing an applied one. The platform is built for minors: never weaken consent, cross-school or peer-audit rules.
