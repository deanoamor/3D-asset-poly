---
name: make-character
description: Make a good low-poly game character (or prop) with Poly Studio: write a JSON spec, build it, check it, LOOK at renders from several angles, fix, and export a validated GLB. Use whenever asked to create, modify or improve a character in this repository.
---

# Make a character with Poly Studio

Read `docs/CHARACTER_GUIDE.md` first (spec format, conventions, proportions, common mistakes), then work in a loop:

1. Write the spec (`my-character.json`). Start from `template: { "kind": "human", ... }` for people.
2. Run `node scripts/studio.mjs make my-character.json --out out/` (starts the dev server by itself).
3. **Open `out/my-character.sheet.png` with the Read tool and really look at it** (front, 3q, side, back, face). Read the check output too.
4. Fix everything that looks off or is reported, edit the spec, run `make` again. Do at least two rounds; do not stop at the first render.
5. Finish only when: no check ERRORs, the silhouette is readable and distinct from the side and the front, the face looks friendly/intentional, and the glTF validator says 0 errors.
6. Report to the user in their language with the sheet image (SendUserFile) and the GLB path. Say honestly what is still weak.

Rules of thumb: stylized proportions (head ≈ 1/5), few strong colours plus one accent, overlap parts at joints, details only where the eye goes, 1 000–3 000 triangles for a hero.
Do not change the editor code to make one character look right; change the spec. If the tool itself is the limit (a missing shape, a wrong template), say so and propose the tool change.
