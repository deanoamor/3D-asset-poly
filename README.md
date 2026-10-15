# Poly Studio (working title)

A browser editor for low-poly game props, built from the PRD "Platform 3D Polygon Asset untuk Pemula".
A beginner can draw shapes, size and color them, watch a live triangle budget, and export a game-ready
glTF in one click. It runs fully in the browser; nothing is uploaded and there are no accounts.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm test           # unit tests (store, history, grouping, triangle counts)
npm run e2e        # browser tests; needs the dev server on :5199 (see below)
```

E2E runs Playwright against a running dev server and a local Chromium:

```bash
npx vite --port 5199 --strictPort &
CHROME=/path/to/chromium npm run e2e
```

Stack: Vite, TypeScript, three.js. No UI framework. The glTF output is checked with the Khronos
`gltf-validator` in the e2e run.

## What is built (PRD scope: all P0, plus the parts of P1 that the main flow needs)

| PRD | Status | Notes |
|---|---|---|
| FR-01 Canvas, grid, orbit/pan/zoom, view buttons | Done | Front / Side / Top / 3D / Focus. Drag orbits, right-drag pans, wheel zooms. |
| FR-02 Basic shapes in one gesture | Done | Box, cylinder, sphere, cone, pyramid, plane. Click or drag on the grid, or on the top of another object. |
| FR-03 Gizmos + number input in sync | Done | Move / Rotate / Size handles; Properties fields update live and the reverse. Labels can be scrubbed. |
| FR-04 Layers: rename, hide, lock, group, order | Done | Double-click to rename, drag and drop to reorder or move into a group, plus up/down buttons. |
| FR-05 Contextual Properties | Done | Group shows transform only; shapes add color and shape settings (sides, smoothness, top size). |
| FR-06 Snapping + duplicate | Done | Grid snap (0.25 m), snap to other objects' faces, Ctrl+D. Both toggles are in the canvas corner. |
| FR-07 Color per object | Done | Color picker plus a 24-swatch palette; Color tool paints on click. |
| FR-08 Real-time polygon counter | Done | Mobile 5,000 / PC 50,000 / Custom. Green under 70%, yellow 70-100%, red over. Names the heaviest part and offers a one-click "Reduce". |
| FR-09 One-click glTF export | Done | `.glb` or `.gltf`. Pivot is the bottom center, 1 unit = 1 m. Presets for Unity, Godot, Unreal, Web. |
| FR-10 Unlimited undo/redo + auto-save | Done | History is capped at 500 steps. Project and history survive closing the tab. |
| FR-11 Guided first project | Done | 7 steps for a wooden chest. Each step detects completion, and "Do it for me" performs it. |
| FR-12 Pre-export checks | Partial | Empty scene, near-flat parts, skewed groups, over budget, default names, hidden parts. Auto-fix for budget and tiny parts. |
| FR-13 to FR-18 | Not started | Mirror/boolean/bevel, template library, style presets, edit mode, version history, FBX/OBJ. |

Also included: Preview mode, new project / open / save project file (`.polyproj.json`), keyboard shortcuts
(press `?`), and a local-only event log (`localStorage`, key `polystudio.events.v1`) that records
project creation, onboarding steps and exports so time-to-first-export can be measured later.

## Decisions taken for the PRD's open questions

- Platform: web (WebGL via three.js).
- Model: parametric (shape + size + a few parameters), no free-form mesh yet.
- Storage: local only (localStorage for the project, IndexedDB for undo history), no login.
- UI language: English.
- Budgets: Mobile 5,000 and PC 50,000 triangles are placeholders to validate with real developers.
- Product name: "Poly Studio" is a working title (`APP_NAME` in `src/ui/topbar.ts`).

## Known limits

- **Not yet tested inside Unity, Godot or Unreal.** The files validate as glTF 2.0 with zero errors, but the PRD's
  "90% import without fixes" target needs real engine runs. The presets currently differ only in the guidance text.
- Moving several selected objects together is not supported yet. Group them first, then move the group.
- A group that is stretched unevenly and holds rotated parts can shear. The export check warns about it.
- Desktop first: under about 820 px wide the Layers and Properties panels are hidden.
- Performance was only checked in headless software rendering, not on low-end laptops.
- No wireframe toggle, style presets, or edit mode (P1/P2).

## Layout

```
src/core    document model, undo/redo, persistence, shapes, budget, checks, presets (no DOM)
src/engine  three.js viewport (camera, gizmo, picking, snapping), scene build, glTF export
src/ui      top bar, Layers, Properties, toolbar, poly counter, dialogs, onboarding
tests       unit tests      e2e   browser tests
```
