# Pokopia Planner

Pokopia Planner is a Next.js app for planning towns, voxel buildings, build materials, item libraries, and Pokemon-style construction helpers in an original monster world.

## What is included

- 2D town planner at `/map`
- 3D voxel builder at `/builder`
- Materials calculator and checklist views
- Scraped item and habitat catalog data for library/checklist use
- Prisma schema and Postgres-backed persistence
- Local JSON fallback for development-only saves when no database is configured

## Local development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/home`.

If you do not configure Postgres locally, the app can still run and save to JSON files inside `storage/`.

## Database setup

For persistent saves, copy the example environment file and point `DATABASE_URL` at PostgreSQL:

```bash
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
```

Local Postgres example:

```bash
createdb pokopia
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
```

After that, map and building saves will use Prisma/PostgreSQL.

## Vercel deployment

The app is now set up for Vercel, with two important behaviors:

- The scraped catalog JSON files in `storage/` are included in the production bundle so server routes and server components can read them at runtime.
- Build and map saves require `DATABASE_URL` on Vercel. Local JSON save fallback is intentionally limited to local development because Vercel Functions use a read-only filesystem outside `/tmp`.

### What you need on your end

1. A Vercel project connected to this repo
2. A PostgreSQL database
3. `DATABASE_URL` added in Vercel for the environments you want to use

### Deploy steps

1. Push the repo to GitHub, GitLab, or Bitbucket.
2. Import the repository into Vercel.
3. Add `DATABASE_URL` in Vercel Project Settings for `Production`, and `Preview` too if you want preview saves to work.
4. Run `npm run db:push` against that database before the first live use of saves.
5. Run `npm run db:seed` if you want the Prisma-backed material and helper records loaded into the database.
6. Trigger the deployment.

Vercel will automatically detect Next.js and run the project build. This repo also includes `postinstall: prisma generate` so Prisma Client is regenerated during deploys.

### Optional Vercel CLI flow

```bash
npm install -g vercel
vercel login
vercel
```

Useful local sync command after you add or change environment variables in Vercel:

```bash
vercel env pull .env.local
```

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run db:generate
npm run db:push
npm run db:seed
npm run scrape:materials
```

## Notes

- `/map` includes keyboard shortcuts, zoom controls, and editing tools for roads, decorations, and placed buildings.
- `/builder` includes keyboard shortcuts, multiple placement tools, camera presets, and per-block colors.
- `/library` uses the scraped item catalog with grouped categories and item images.
- The screenshot-to-blueprint flow is still a mocked approximation pipeline, ready for a future real vision service.
