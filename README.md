# Pokopia Planner

Pokopia Planner is a playful planning tool for designing original monster-world towns, voxel buildings, and build checklists.

This first milestone includes:

- Next.js App Router foundation
- Prisma schema for the core domain
- Sample materials, buildings, and Pokemon-style construction helpers
- Interactive map planner prototype
- Interactive voxel builder prototype
- Materials calculator and helper recommendations
- Mock screenshot-to-blueprint upload flow

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000/home`.

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:generate
npm run db:push
npm run scrape:materials
```

## Notes

- API routes currently use simple file-backed storage in `storage/` so the app works before a real database is wired in.
- The Prisma schema is prepared for PostgreSQL and can replace the bootstrap storage layer next.
- The screenshot scanner is a mocked approximation pipeline for now, designed so a real vision service can plug in later.
