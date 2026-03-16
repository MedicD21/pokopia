# AGENTS.md

# Pokéopia Planner – AI Development Guide

This document instructs AI coding agents (Codex or similar) how to build the **Pokéopia Planner Web App**.

The goal is to create a planning tool for a fictional Pokémon world called **Pokéopia** where users can:

1. Design towns on a **2D overhead map**
2. Build houses/buildings in a **3D builder**
3. Generate a **materials list**
4. See **where to obtain materials**
5. Get **recommended Pokémon that would help build the structure**

No copyrighted assets are required. Use **simple colored blocks and generated geometry only**.

---

# Core Concept

Pokéopia Planner is essentially a **city planner + voxel builder + crafting calculator**.

Users will:

1. Design town layout on a **2D grid map**
2. Design buildings using a **3D block builder**
3. Save the building
4. Place buildings on the map
5. Generate a **complete materials list**

---

# Tech Stack

Use modern, lightweight technologies.

Frontend:

- Next.js
- React
- Typescript
- TailwindCSS
- Zustand (state management)

3D Engine:

- Three.js
- React Three Fiber
- Drei helpers

2D Map:

- HTML Canvas OR PixiJS

Backend:

- Node.js
- Express or Next API routes

Database:

- PostgreSQL
- Prisma ORM

Hosting:

- Vercel

Optional:

- Redis for caching

---

# App Structure

```
/app
/components
/map
/builder3d
/materials
/pokemon
/api
/lib
/prisma
/data
```

---

# Feature 1 – 2D Map Planner

Create a **top-down grid map editor**.

Capabilities:

Users can:

- place roads
- place buildings
- place decorations
- move structures
- delete structures
- rotate buildings

Grid size:

Default map:
100 x 100 tiles

Each tile stores:

```
tile_type
building_id
rotation
metadata
```

Road types:

```
dirt
stone
wood
bridge
path
```

Render map using **Canvas or PixiJS** for performance.

---

# Feature 2 – 3D Building Builder

Users can design buildings using a **voxel-style builder**.

Blocks are simple colored cubes.

Block properties:

```
id
color
material_type
tags
```

Example materials:

```
wood
stone
metal
glass
brick
roof
decor
```

3D editor capabilities:

- add block
- remove block
- paint block color
- rotate camera
- zoom
- export building

Buildings save as **JSON voxel data**.

Example:

```
{
 "name": "Pokecenter",
 "blocks": [
  { "x":1,"y":0,"z":1,"material":"stone" },
  { "x":1,"y":1,"z":1,"material":"glass" }
 ]
}
```

---

# Feature 3 – Materials Calculator

When a user clicks **Generate Materials List**, the system:

1. Counts each block type
2. Converts blocks to **materials**
3. Returns a build checklist

Example output:

```
Stone Blocks: 120
Wood Planks: 75
Glass Panels: 30
Metal Beams: 12
```

---

# Feature 4 – Material Database

Create a table of **all materials in Pokéopia**.

Table:

```
materials
```

Columns:

```
id
name
category
obtain_method
crafting_recipe
location
notes
```

Example entry:

```
name: Iron Ore
category: metal
obtain_method: mining
location: Mt. Ember
crafting_recipe: smelt -> iron bar
```

Data can be scraped from community sources.

Scraper script:

```
/scripts/scrapeMaterials.ts
```

The scraper should extract:

- material name
- how to obtain
- crafting process
- location

Store text only (no images required).

---

# Feature 5 – Pokémon Builder Recommendations

Each structure can suggest **Pokémon useful for construction**.

Create table:

```
pokemon_helpers
```

Columns:

```
pokemon_name
type
build_skill
description
```

Example:

Machamp

```
build_skill: heavy lifting
description: can move massive stone blocks
```

Garchomp

```
build_skill: tunneling
description: digs tunnels and foundations
```

Blastoise

```
build_skill: water pressure cutting
description: helps carve stone
```

Suggested Pokémon categories:

```
heavy lifting
digging
stone cutting
transport
fire forging
precision work
electric power
```

Example suggestions returned with builds:

```
Machamp – lifting beams
Conkeldurr – structural support
Excadrill – foundation digging
Rotom – power grid
Charizard – metal forging
```

---

# Database Schema

Prisma models:

```
User
Map
Building
BuildingPlacement
Material
PokemonHelper
```

Example:

```
model Building {
 id String @id
 name String
 data Json
 ownerId String
 createdAt DateTime
}
```

---

# API Endpoints

```
POST /api/buildings/save
GET /api/buildings/:id
POST /api/maps/save
GET /api/materials
GET /api/pokemon/helpers
POST /api/generate-materials
```

---

# Materials Generation Algorithm

1. Load building voxel JSON
2. Count blocks by material
3. Map block → material
4. Aggregate totals

Pseudo code:

```
for block in building.blocks:
    materials[block.material] += 1
```

Return list with crafting information.

---

# UI Pages

Home

```
/home
```

Map planner

```
/map
```

3D builder

```
/builder
```

Materials generator

```
/materials
```

Building library

```
/library
```

---

# UI Style

Theme:

Pokémon-inspired but **original**

Use:

- bright colors
- rounded cards
- playful UI
- pixel grid overlay

No copyrighted Pokémon artwork.

---

# Performance Requirements

3D builder must handle:

```
5k–10k blocks
```

Use:

```
instanced meshes
```

for performance.

---

# Optional AI Enhancements

Future upgrades:

AI building generator

User types:

```
Generate a Pokécenter
```

System produces starter building blueprint.

AI town planner:

```
Suggest best layout for this town
```

---

# Development Phases

Phase 1

- database
- materials system
- pokemon helpers

Phase 2

- 3D builder

Phase 3

- map planner

Phase 4

- material generation

Phase 5

- building placement

Phase 6

- polish UI

---

# Testing

Unit tests:

- material counting
- map placement
- building save/load

---

# Deliverables

Working web app with:

- map planner
- building editor
- materials calculator
- pokemon helper suggestions
- materials database

---

# Success Criteria

Users can:

1. Design town layout
2. Build structures
3. Calculate materials
4. Discover how to obtain materials
5. See Pokémon that help build

Pokéopia Planner becomes a **creative planning tool for Pokémon-style towns**.

# AGENTS.md

# Pokéopia Planner – AI Screenshot → Blueprint Generator

This document describes how to implement an **AI feature that converts screenshots into building blueprints** for the Pokéopia Planner.

This system allows users to:

1. Upload a screenshot of a structure
2. AI analyzes the image
3. AI reconstructs a **voxel building blueprint**
4. The blueprint loads into the **3D builder**
5. The system generates a **materials list automatically**

The goal is **approximation**, not perfect reconstruction.

---

# Feature Overview

User workflow:

1. User uploads screenshot
2. AI detects structure blocks
3. AI reconstructs voxel grid
4. AI guesses materials
5. Blueprint loads into builder
6. Materials list generated

---

# Tech Stack

Frontend

- React
- Next.js
- Typescript
- React Dropzone

Backend

- Node.js
- Python microservice for AI

AI models

Use **free / low cost models** where possible.

Recommended:

Image Analysis

```
Qwen2-VL
```

OR

```
LLaVA
```

For segmentation

```
SAM (Segment Anything)
```

Optional block detection model

```
YOLOv8 custom trained
```

---

# Architecture

```
Frontend
   |
Upload Screenshot
   |
API Route
   |
AI Vision Service
   |
Voxel Reconstruction
   |
Return Blueprint JSON
   |
Load into Builder
```

---

# Upload System

Create page:

```
/scan
```

Upload component:

```
components/ScreenshotUploader.tsx
```

Allow:

```
jpg
png
webp
```

Max size

```
10MB
```

---

# Vision Processing Pipeline

Steps:

1. Preprocess image
2. Detect block edges
3. Detect material colors
4. Estimate depth
5. Convert to voxel grid

---

# Step 1 – Image Preprocessing

Normalize image.

Tasks:

```
resize
sharpen edges
increase contrast
```

Goal:

Make block edges easier to detect.

---

# Step 2 – Structure Segmentation

Use **Segment Anything Model (SAM)**.

Detect:

```
walls
roof
windows
doors
decor
```

Output masks.

---

# Step 3 – Block Grid Detection

Assume building uses a **grid system**.

Detect repeating edges.

Algorithm:

```
detect vertical lines
detect horizontal lines
create grid intersections
```

Use OpenCV.

---

# Step 4 – Color Material Classification

Each block's average color maps to a material.

Example mapping:

```
brown → wood
gray → stone
light gray → concrete
red → brick
blue → glass
black → metal
```

Return block type.

---

# Step 5 – Depth Estimation

If screenshot is angled:

Use **MiDaS depth estimation**.

Convert depth map into voxel height.

---

# Step 6 – Voxel Reconstruction

Convert grid + materials + depth → blocks.

Example output:

```
{
 "name": "Imported Build",
 "blocks": [
  {"x":0,"y":0,"z":0,"material":"stone"},
  {"x":1,"y":0,"z":0,"material":"stone"},
  {"x":0,"y":1,"z":0,"material":"glass"}
 ]
}
```

Return blueprint JSON.

---

# API Endpoint

```
POST /api/scan-build
```

Input

```
image
```

Response

```
{
 blueprint: JSON,
 detected_materials: []
}
```

---

# Material Estimation

Count detected blocks.

Return material totals.

Example:

```
Stone Blocks: 120
Wood Planks: 80
Glass Panels: 20
```

---

# Builder Integration

After processing:

1. Load blueprint
2. Open in **3D builder**
3. Allow user edits

User can:

```
fix blocks
replace materials
add details
```

---

# Pokemon Builder Suggestions

After generating blueprint, suggest Pokémon.

Example logic:

```
if stone_blocks > 100
    recommend Machamp
```

Possible suggestions:

```
Machamp – heavy lifting
Excadrill – digging foundation
Conkeldurr – structural beams
Rotom – power systems
Charizard – metal forging
```

---

# Database Storage

Store imported builds.

Table:

```
imported_builds
```

Columns

```
id
user_id
image_path
blueprint_json
created_at
```

---

# Accuracy Expectations

This feature **does not need perfect accuracy**.

Goal:

```
80% approximate reconstruction
```

User will refine structure in builder.

---

# Performance Requirements

Processing time target

```
<10 seconds
```

Use background job queue if needed.

---

# Future Improvements

Multi-image reconstruction

```
front
side
top
```

AI building refinement

```
clean up block alignment
```

AI blueprint suggestions

```
complete missing sections
```

---

# Success Criteria

User can:

1. Upload screenshot
2. Generate blueprint
3. Edit building
4. Calculate materials

This creates an **AI-assisted build planner** that dramatically speeds up design workflows.
