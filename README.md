# Poly Studio (working title)

A browser editor for low-poly game props, built from the PRD "Platform 3D Polygon Asset untuk Pemula".
A beginner can draw shapes, size and color them, watch a live triangle count, and export a game-ready
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
| FR-08 Real-time triangle counter | Changed | Shows the total and the heaviest parts. The budget feature (targets, limits, warnings, auto-reduce) was removed on request: there is no limit. |
| FR-09 One-click export to a game engine | Done | Pick Unity, Godot, Unreal or Web, then a format (below). Pivot is the bottom center, 1 unit = 1 m. Before download the app re-opens the generated file and checks triangle count, size and pivot. |
| FR-10 Unlimited undo/redo + auto-save | Done | History is capped at 500 steps. Project and history survive closing the tab. |
| FR-11 Guided first project | Done | 7 steps for a wooden chest. Each step detects completion, and "Do it for me" performs it. |
| FR-12 Pre-export checks | Partial | Empty scene, near-flat parts, skewed groups, default names, hidden parts. Auto-fix for tiny parts. |
| FR-16 Edit Shape mode | Done | See "Edit Shape" below. Entering and leaving never damages the model, and every step can be undone. |
| FR-13, FR-14, FR-15, FR-17, FR-18 | Not started | Boolean/bevel (mirror exists only inside Edit Shape), template library, style presets, version history, FBX/OBJ. |

Also included: Preview mode, new project / open / save project file (`.polyproj.json`), keyboard shortcuts
(press `?`), and a local-only event log (`localStorage`, key `polystudio.events.v1`) that records
project creation, onboarding steps and exports so time-to-first-export can be measured later.

## Asset library (use directly, or learn from it)

The **Assets** button (top bar) opens nine ready-made assets, lit with a warm backdrop and a soft shadow:

| Asset | Parts | Triangles | What it shows off |
|---|---|---|---|
| **Police Officer** | ~85 | ~2,400 | one-piece tapered limbs, a head with a jaw and a face that sits on its surface, layered uniform, cap, gear |
| **Car** | ~84 | ~1,700 | sloped hood and glass, wheel wells, tire + rim + hub wheels, lights, grille, trim, roof rack |
| **House** | ~155 | ~2,000 | half-timber walls, tiled roof with a dormer, doors, windows, shutters, porch, chimney with smoke, garden, fence, tree |
| **Football Player** | ~85 | ~2,600 | a standing pose holding a classic football (12 black pentagons), bent one-piece limbs, kit with number and stripes, spiky hair |
| **Soldier** | ~100 | ~2,900 | black and gray tactical uniform: helmet with wrap-around visor and mask, headset, vest with pouches, backpack, belt, holster, knife, gold rank chevrons on the chest and sleeves |
| **Forest Island** | ~190 | ~3,500 | a floating diorama laid out from a reference picture: river and waterfall, white rock mountain with a goat, pines, a leafy tree, a camp with a fire, a bear and a deer |
| **Pink Anime Girl** | ~95 | ~3,000 | a stylised bust-friendly character: big layered violet eyes, spiky pink hair built from tapered strips, black bows, a navy top, wide white sleeves and a skeleton |
| **Red Ribbon Girl** | ~55 | ~700 | a hard-edged low-poly girl modelled from a reference picture: every flat colour patch is one thick plate, so from the picture's own viewpoint (front, from above) it matches point by point |
| **Nurse** | ~110 | ~2,600 | the same hard-edged low-poly style as the Red Ribbon Girl, as a real 3D figure that stands on the ground: slim faceted limbs, white dress with blue panels, twin tails, a cap with a cross and the same flat face planes in new colours |

**Seamless by construction.** Limbs are one continuous tube that bends at the joints and runs into the boot, so there are no
gaps. Faces, pockets, badges, ties and patches are placed by firing a ray at the body they sit on, so nothing floats. A unit test
(`tests/connected.test.ts`) fails if any part of an asset is left detached from the rest.
Everything is a closed, editable mesh: open any part with Edit shape.

- **Add to project** puts the asset into the current project as a group, to the right of what is already there. Every part has a
  clear name (Torso, Eye White Left, Front Tire Right, Roof…), so you can recolor, resize, reshape or export it.
- **Learn how it is made** rebuilds the asset in 6 to 8 steps. Each step shows the new parts (highlighted on the canvas), the tools
  and ideas used, and a closing challenge. The lesson only hides parts on screen: the project data is never changed.
- The first-run dialog has **Browse ready-made assets**.
- **Preview** shows the model with a warm backdrop, soft light and a real floor shadow.

Assets are data in `src/core/library/*.ts`. `organic.ts` has the seamless builders (`sweep` a tube along a path, `blob`, `headBlob`,
`plate`/`ribbon`/`onSurface` for details on a surface, `faceOn`), `body.ts` builds boots, and `kit.ts` has the box-based helpers
the car and house use.

## Edit Shape (turn a box into something else)

Select a shape and press **Edit shape** (toolbar, `Tab`, or double-click it). The toolbar switches to a bar made for beginners:

- **Points / Edges / Faces**: choose what to select. Click to select, Shift-click to add, Shift-drag to select an area. Orbiting still works by dragging empty space.
- **Drag directly**: drag a selected face to push or pull it along the way it points; drag selected edges or points to move them. The cursor turns into a hand over anything you can drag. Dragging empty space still orbits.
- **Move / Rotate / Size**: handles sit on the selection and work on points, edges or faces. Movement is fully smooth; turn on **Snap** for round 0.25 m steps counted from where the drag started.
- **Pull out** (extrude): grows a new part from a face or an edge right away; drag it afterwards to adjust. **Shrink face** (inset) adds a smaller face inside; right after it, drag the orange face (toward its middle shrinks more, away shrinks less) or use the **Shrink** slider to set the amount by hand, until you do something else. **Add cut** (loop cut) adds a ring of points around the shape. **Merge points** squeezes points into one (merge the four top points of a box for a pyramid). **Round off** smooths the whole shape (Catmull-Clark subdivision, about 4x the triangles). **Delete** removes the selection.
- **Mirror** moves the matching point on the other side too, which makes symmetrical heads easy. **See-through** shows points on the far side.
- Greyed-out actions say why when clicked ("Switch to Faces", "Select a face first"). A hint line always says what to do next, and the polygon counter keeps running.
- **Tour: reshape a box** in the top-left menu (or "Show me how" in the edit banner) walks through select, pull out, round off, done.

While editing, points are in real metres; on Done the shape's size is recalculated, so Properties show the real width, height and depth.
"Reset to the original shape" returns to the parametric shape. Edited shapes export like any other (the export self-test re-opens them).
Limits: concave faces are drawn with a simple fan, Round off is capped at 60,000 triangles, and edge extrude on a closed shape makes a thin flap.

## Export to a game engine

| Engine | Formats offered | Extra |
|---|---|---|
| Unity | `.glb`, OBJ + MTL (`.zip`), package | `.glb` needs the glTFast package; OBJ + MTL imports with no plugin. The package has both. |
| Godot | `.glb`, package | Optional collision box: a hidden mesh named `<name>-convcolonly`, which Godot's importer turns into a collision shape. |
| Unreal | `.glb`, package | Import with the glTF Importer / Interchange plugin; add collision in the Static Mesh Editor. |
| Web | `.glb`, `.gltf`, package | three.js, Babylon.js, model-viewer, PlayCanvas. |

A package is a `.zip` with the model plus `IMPORT_<ENGINE>.txt` (step-by-step import instructions). The same steps show in the
dialog under "How to import". Engine conventions used here come from the official docs for
[Godot import suffixes](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/node_type_customization.html)
and [Unity glTFast](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@5.2/manual/ImportEditor.html).
Not covered by official docs, so left out: collision naming inside glTF for Unreal and Unity.

## Decisions taken for the PRD's open questions

- Platform: web (WebGL via three.js).
- Model: parametric (shape + size + a few parameters), no free-form mesh yet.
- Storage: local only (localStorage for the project, IndexedDB for undo history), no login.
- UI language: English.
- No triangle budget: the counter only shows the total.
- Product name: "Poly Studio" is a working title (`APP_NAME` in `src/ui/topbar.ts`).

## Known limits

- **Not yet tested inside Unity, Godot or Unreal.** The `.glb` files pass the Khronos glTF validator and the app re-opens
  every export itself, but the PRD's "90% import without fixes" target needs real engine runs. The OBJ + MTL route in Unity
  and the Godot collision box are based on the engines' documentation and have not been run in the engines.
- FBX is not offered (PRD FR-18, P2).
- Moving several selected objects together is not supported yet. Group them first, then move the group.
- A group that is stretched unevenly and holds rotated parts can shear. The export check warns about it.
- Desktop first: under about 820 px wide the Layers and Properties panels are hidden.
- Performance was only checked in headless software rendering, not on low-end laptops.
- No wireframe toggle, style presets, or edit mode (P1/P2).

## Layout

```
src/core    document model, undo/redo, persistence, shapes, checks, presets, asset library (no DOM)
src/engine  three.js viewport (camera, gizmo, picking, snapping), scene build, glTF export
src/ui      top bar, Layers, Properties, toolbar, poly counter, dialogs, onboarding
tests       unit tests      e2e   browser tests
```

## Surface look (smooth + painted color)
Select a shape (or a group) and open **Surface** in Properties: **Flat / Smooth** shading and **Color variation**
(painted per-vertex gradients, not image textures). Ready-made assets use smooth faces/skin/hair and faceted painted clothes.
GLB/glTF export carries normals and `COLOR_0`; OBJ/MTL only carries the base color.

## Export targets
Unity, Godot, Unreal, Construct 3, Web, plus 3D software: **Blender**, **Cinema 4D**, **Maya / 3ds Max** (OBJ+MTL opens everywhere, GLB in newer versions; the package adds a per-app import guide).

## Public link (GitHub Pages)
Every push to `main` builds and publishes the app through `.github/workflows/pages.yml`.
One-time setup: GitHub repo > Settings > Pages > Source: **GitHub Actions**. The site is then at
`https://<your-username>.github.io/3D-asset-poly/`.

## Saves and the .3pi bag
**Saves** (top bar) lists your projects. They are kept in the browser (IndexedDB), so they disappear if browser data is cleared; the dialog says so.
**Download all (.3pi)** writes one file holding every save (gzipped JSON). On another computer, open **Saves > Import bag (.3pi)** to bring them back.
Importing never loses work: new projects are added, newer ones replace older ones, and an older project that differs is kept as "… (imported)".
Inside the claude.ai artifact the host only saves some extensions, so the bag arrives as `.zip`; Import accepts that too.

## Skeleton: joints and bones
**Skeleton** (under Layers) holds the joints. A bone is the line between a joint and its parent joint, so turning a joint swings everything below it.
- The ready-made characters (Police Officer, Football Player, Soldier) come with a 22-joint person skeleton. For any other figure, select it and press **Add person skeleton**; or build your own with **Add joint**.
- Joints are the white balls in the scene (orange when picked). Drag one to move it; hold **Shift** to carry the joints below it. The panel edits name, position and parent.
- **GLB / glTF export** skins the model to the skeleton automatically: long parts (arms, legs, torso) bend smoothly at the joints, small parts (helmet, pouch) follow their nearest joint. A character becomes one skinned mesh with one skin, which Blender and game engines pose directly. OBJ ignores the skeleton.

### Pose mode
Press **Pose** in the Skeleton section, click a joint and turn it with the rings (or type degrees): the character bends live. With **Pose on**, Preview shows the posed character with its shadow; with Pose off, Preview (like the editing view) shows the character at rest. The pose is saved with the project (and in a save or a `.3pi` bag), and **GLB/glTF export bakes it in while Pose is on** (with Pose off the character is exported at rest), so the file holds the posed mesh with its skeleton in that pose. Undo/redo cover every turn; **Reset whole pose** goes back to rest.

## Pivot and spin
- **Pivot:** a group turns, spins and resizes around its pivot (its origin). Select a group and look for the orange diamond in the scene (with small X / Y / Z lines): drag it to move the pivot, for example onto a wheel's axle. What is inside the group stays exactly where it is. In Properties, **Pivot** has *Middle / Bottom / Top* buttons. A new group's pivot starts at the bottom middle of its parts.
- **Spin:** in Properties, **Spin** makes an object turn by itself around its pivot (Off / X / Y / Z, and turns per second). Preview shows it turning, and GLB/glTF export writes a looping animation called **Spin** that every engine and 3D app can play.
- The car's four wheels are groups with the pivot on the axle and a spin around X, so they roll in Preview and in the exported file. Plain objects need no bones for this: a bone is only for bending things.

## Animation
With a skeleton, **Animation** (under Skeleton) makes clips of poses that play over time.
- **Ready-made:** pick *Walk*, *Run*, *Idle* or *Wave* and the character moves right away (found by joint names, so any figure with the person skeleton works).
- **Your own:** press **New**, then for each moment: move the time slider, press **Edit pose here**, turn the joints (Pose mode), press **Key here**. Between two keys every joint turns smoothly. A diamond on the timeline is a key; click one to jump to it, **Delete key** removes it. A clip has a length in seconds and can **Loop**.
- **Play** shows the clip in the editor, and in **Preview**. Playing never changes your saved pose.
- **Export:** GLB/glTF carries every clip as a glTF animation turning the bones (the character itself is exported at rest), together with **Spin**. Untick *Include the animations* in the export dialog to export a single static pose instead. Clips are saved with the project, Saves and `.3pi` bags, and a duplicated character gets its own copy of its clips.
- Clips move joints only (rotation), so the body does not travel. Move a character in your game or 3D app while the Walk plays.

`node e2e/island.mjs` renders the Forest Island in the picture's isometric framing to `e2e/out/island/island.png` (dev server on :5199).
`node e2e/anime.mjs` renders the Pink Anime Girl as a bust on a dark navy backdrop to `e2e/out/anime/anime.png`.
`node e2e/ribbon.mjs` renders the Red Ribbon Girl from the reference picture's viewpoint (near-orthographic, front view from above) to `e2e/out/ribbon/ribbon.png`. The patch outlines live in `src/core/library/ribbonData.ts`.
`node e2e/nurse.mjs` renders the Nurse from several angles (`AZS=0,35,90,180`) to `e2e/out/nurse/`.
