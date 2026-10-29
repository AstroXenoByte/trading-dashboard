# Trading Dashboard
Next.js 15 + Prisma/PostgreSQL. Owner-only login. Target-based earnings come only from your daily check-ins (not broker data).
## Setup
1. `cp .env.example .env` and edit OWNER_USERNAME, OWNER_PASSWORD, AUTH_SECRET, DATABASE_URL.
2. `npm install`
3. `npx prisma migrate dev --name init` (local) — on a server: `npx prisma migrate deploy`. Commit the generated `prisma/migrations`.
4. `npm run dev` → http://localhost:3000, log in, set your start date in Settings.
5. `npm test` runs the calculation tests.
## Deploy (Vercel)
Create a managed Postgres (Neon/Supabase/Vercel Postgres), set the 5 env vars in Vercel, run `npx prisma migrate deploy` once against that DATABASE_URL, deploy.
## Change the login later
Edit OWNER_USERNAME / OWNER_PASSWORD in the environment and redeploy. Changing AUTH_SECRET logs everyone out.
## Not built yet
Trade journal + screenshots, trading rules page, weekly/monthly review pages & notes, charts/analytics, calendar view, date-range filters, DB integration/e2e tests, password reset. The schema for these already exists.
Notes: login rate limit is in-memory (per server instance). Not yet compiled/run against a live database.
