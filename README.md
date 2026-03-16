# Pokopia Planner

Pokopia Planner is a playful planning tool for designing original monster-world towns, voxel buildings, and build checklists.

Current milestone includes:

- Next.js App Router foundation
- Prisma schema for the core domain
- Sample materials, buildings, and Pokemon-style construction helpers
- Interactive map planner prototype
- Interactive voxel builder prototype
- Materials calculator and helper recommendations
- Mock screenshot-to-blueprint upload flow
- Hand/edit tools for selecting existing map items and voxel blocks
- Camera presets plus orbit/pan/zoom controls in the 3D editor
- Prisma/Postgres persistence with automatic fallback to local file storage

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000/home`.

## Your Setup

You do not need to set up Postgres immediately. The app will save to local JSON files in `storage/` until `DATABASE_URL` is configured.

If you want real database persistence:

1. Copy `.env.example` to `.env.local`
2. Set `DATABASE_URL` to a PostgreSQL database you control
3. Run `npm run db:generate`
4. Run `npm run db:push`
5. Run `npm run db:seed`

Local Postgres example:

```bash
createdb pokopia
cp .env.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
```

After that, building and map saves will go through Prisma into PostgreSQL. If the database is missing or unavailable, the app falls back to local storage so you can keep working.

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:generate
npm run db:push
npm run db:seed
npm run scrape:materials
```

## Editor Notes

- `/map` now has a larger workspace plus a hand tool for selecting, moving, rotating, and editing existing roads, decorations, and building placements.
- `/builder` now has a larger workspace, hand mode for block inspection, and camera preset buttons for `iso`, `front`, `back`, `left`, `right`, and `top`.
- The screenshot scanner is still a mocked approximation pipeline for now, designed so a real vision service can plug in later.
