# Lessons from real iterations

Characters made with `scripts/studio.mjs` (see `examples/`): Knight (3 specs, 4 rounds), Witch, Scout, Wizard.
Each lesson is something that looked wrong in a render and how it was fixed. Read this before the first round.

## 1. Know the scale before placing anything
The head of a 1.8 m character is only ~0.2 m wide: an eye is 0.05 m, a nose 0.025 m. In round 1 of the Knight a visor
"0.17 m wide" became sunglasses, and a nose guard "0.09 m tall" covered the mouth. **Run `info` first** (it prints every joint and
every part's centre and size) and size details as a fraction of the head (`hr`), not as round numbers.

## 2. Armour and clothes must be sized from the body they cover
With `weight: heavy` the torso grew wider than a hand-made breastplate and the body poked through it as grey diamonds.
Either keep `weight: normal` and widen the armour, or read the torso size from `info` and add 3–5 % margin.
A cover layer should be a few cm bigger than the layer under it, never equal (that z-fights) and never smaller.

## 3. Nothing may cross the eye line
A bar, visor or helmet rim at brow height reads as sunglasses or a blindfold. Either cover the whole face, or keep the face open
and put the rim **above the brows**. Cheek guards and nose guards must be tiny (a cm or two) or they look like blinders.

## 4. Hats and helmets: keep the blob above the brows and behind the face
A hat blob that reaches below ear height pokes grey / black triangles through the cheeks. Centre it above the head centre and a few
cm back; its lowest point should be at the brow line. Use `gear: helmet / cap / witch-hat`; they already respect this.

## 5. Held and worn items come from anchors, not guesses
A broom placed "next to the hand" floated beside the character. Use `gear: staff` (it passes through the fist) or read the hand
position with `info`. A sword on a hanging arm looks wrong: put it in a scabbard at the hip (`gear: sword`).

## 6. Capes are thin sweeps
A cape is a sweep of 3–4 rings with a very thin depth (about 0.02 × height), starting at the shoulders and a little behind the torso, 6 sides.
Start it at neck height or a triangle of body shows above it from behind.

## 7. The checker measures the body, not the hat
Hats and crests used to trigger "height" warnings. The check now measures feet to the top of the head. Gear does make the figure taller;
that is reported as info.

## 8. What the checker cannot see
It does not see that a visor looks like sunglasses, that a colour is ugly, or that a silhouette is boring.
Always read the contact sheet, and always the **face close-up**: most mistakes are there.

## 9. Workflow that worked
1. Template + `gear` for the first render (2 minutes, already presentable).
2. `info` to place the few custom parts (insignia, a unique hat, an unusual prop).
3. One change per theme per round (head gear, then body, then props), re-render, compare to the previous sheet.
4. Silhouette test: look at front and side only, squint: can you name the character? If not, exaggerate one feature (hat size, shoulder width, cape length).
5. Palette: 4–8 colours, one accent (gold trim on the knight, a yellow scarf on the scout). Greys alone look dead; add one warm or saturated colour.

## 10. Still weak (known limits)
- Hands are simple blobs; fingers are not modelled.
- Legs and arms are tubes: bulk (calf, thigh) comes from extra sweep parts.
- Skirts and robes are rigid sweeps (no cloth), so they do not swing when animated.
- Only the human template exists; animals and monsters must be built from parts without an automatic rig.

## 11. Layer order on the torso
A skirt or robe that starts at the hips swallows the belt (Witch: the sash vanished). Start the skirt just under the belt, or make the belt ring a few cm larger than the skirt's top ring.

## 12. Copying a reference picture (Operator example)
- Put the picture in `examples/ref/` and render **next to it**: `render spec.json --ref examples/ref/x.png --views angle:20,front,side`. `angle:<deg>[:<elevation>]` turns around the character (+ toward its Left).
- Pose first: `template.armAngle` (A-pose ≈ 30–35°, T-pose 90°) and `legSpread` (≈ 7°) set the skeleton **and** the body, so the pose is right before any gear is added.
- Read sizes with `info --json` and generate the spec from them (see `examples/operator.gen.py`): vest, pouches, holsters and pads are all placed from the torso / leg / hand numbers, so one change of build re-fits everything.
- A thick layer (trousers, muscle) **swallows** thin parts (pockets, pads) placed against the old surface: place details on the new, bigger radius.
- Hands: a flat sweep that continues the forearm reads better than a fist blob; for palm-facing-the-viewer use `r: [thin, wide]` (the first radius runs front-to-back for a diagonal limb).
- Realistic faces: remove cheeks (`remove: ["Cheek Left","Cheek Right"]`), shrink eyes (`eyeScale: 0.55`), add beard / moustache as blobs, raise helmet rims above the brow line.
- Honest limit: a spec of boxes, sweeps and blobs gets the silhouette, colours and equipment of a reference right, but not its texture (camo pattern, fabric folds), fingers or facial likeness.

## 13. Wrapped / stacked shapes (Mummy example)
- A ring of tilted bands is `kind: "band"` (centre, axis, radius, width, tilt in degrees, thickness): a closed slanted collar. Do **not** fake a slant by shifting the ring centres of a `sweep`: the off-centre ring pokes out of the limb as shards (first try) and a large tilt makes spikes. Keep `tilt` at 8–20° on limbs and up to ~20° for the chest criss-cross.
- Generate repeated parts in a script (`examples/mummy.gen.py`): radius along a limb comes from the template's own ring table, bands cycle through 5–6 shades, so a 70-part character is still ten lines of logic.
- Pose with `armAngle` + `elbowBend` (hands forward) + `legSpread`. Hands: palm box + 4 finger boxes + thumb, rotated forward-down, read as a claw.
- Glowing eyes: a dark pocket blob with a smaller `mat: { glow: 1 }` blob in front reads as light in a dark gap. Keep the glow shape small, or it looks like a cartoon hexagon.
- Faceted style = no `smooth`, few segments (6–7). Keep it consistent: one smooth head on a faceted body looks pasted.

## 14. Places and scenes (Island example)
- A scene is the same spec without a template (`"rig": "none"`): `examples/islands.gen.py` builds a 170-part diorama (island, cabin on a deck, stairs, pines, rocks, pond) from loops and helpers. Check it with `check`; ignore the character-only hints (one-sided, height).
- **Gable roof:** a `sweep` with `sides: 3`, `phase: 90` and two rings along the ridge is a solid triangular prism with the ridge up. `r = [span / 1.732, rise / 1.5]`, centre at `y0 + rise / 3`. No gable fillers needed.
- **Stairs:** make each step a solid block from the ground up to its tread (not a thin slab), so steps touch each other and the ground (nothing floats) and read as a real staircase.
- **Trees:** 3–4 stacked cones with alternating greens, wider than you think (width ≈ half the height), and a few in a lighter yellow-green.
- **Rocks in water:** lift them so they sit in the water, not below the floor; keep the lowest point at y = 0 with one `LIFT` for the whole scene.
- **Framing:** `render --focus "Cliff|Sand|Cabin|Pine"` frames only those parts, so the sea disc does not shrink the subject; `--views angle:-30:42` is a typical isometric diorama view (azimuth, elevation).
- Honest limit: the reference's soft lighting, water depth gradient and tiny details (lanterns, ripples) are not modelled; the layout, colours and building are.

## 15. Things that must connect (stairs, bridges, doors)
"Nothing floats" only proves each part touches *something*. The first Island stairs touched the ground, so the check passed, yet they stood 0.2 m away from the deck. A staircase must **start flush at the thing it serves** (deck edge, door sill) and each step must touch the next.
- Build stairs from `(x, z)` = the point on the deck edge, a unit direction, and steps of equal length: step *i* is centred at `0.15 + L·i` from that point, so the first step touches the deck.
- Put them where people go: straight in front of the door, with a gap in the railing the same width as the stairs.
- Keep the whole run inside the island (n·L must end before the shore).
- Add side boards and a handrail so they read as part of the building.
- The e2e test `e2e/studio.mjs` now measures the gap between the first step and the deck (`info --json`); do the same check (or `info`) after placing any connector.

## 16. Four seasons from one generator (Island Spring / Summer / Autumn / Winter)
`examples/islands.gen.py` builds the same island four times; `PAL[season]` holds the colours and `if SEASON == …` blocks hold the props. What made the four read as four seasons:
- **Colour alone is not a season.** Each one changes the *silhouette*: spring = pink round blossom trees and petals; summer = full green crowns, a parasol and sunflowers; autumn = orange / red / yellow crowns, pumpkins and leaf piles; winter = snow-capped pines, bare trees, snow on the roofs and a snowman.
- **Ground and water follow the season:** fresh light green → saturated green with bright blue water → ochre grass with cooler grey-blue water → white ground, pale water, ice floes, a frozen pond with cracks.
- **The big trunk becomes a crown** (a cluster of 6 blobs, in season colours, or bare branches with snow in winter): it ties the scene together and gives the strongest season cue. Lift the crown above the roof, or it hides the cabin from the usual angle.
- **Snow roof** = the same gable prism again, ~7 % larger and a hair higher, so shingle lines and ridge disappear under it. Icicles are small inverted cones under the eave.
- **Keep the layout identical across seasons** (same trees spots, cabin, stairs): the contact sheets compare cleanly and a bug fixed once is fixed in all four.
- **Mistakes the check caught** (it reported `floating`, so run it for every variant): smoke puffs hovering above the chimney (chain them: each touches the previous one); ice cracks placed with `G + …` while the pond top is a different height (derive the y from the surface you sit on); floes above the water surface; snowman eyes and arms made with `mirror`, which mirrors across **x = 0**, not across the snowman, so the twins landed metres away (write both sides explicitly for anything off-centre); snow on a branch not at the branch tip (compute the tip from the rotation).

## 17. Measuring instead of eyeballing (`compare`)
First measurements: Operator 67 %, Mummy 59 % against their references (before this tool I called both "close"). The notes pointed at real differences I had not seen in the contact sheets: the Operator's legs and hips are too wide and its arms not spread enough; the Mummy's legs stand together while the reference strides.
What went wrong while building the measurement (each is now a unit test or a rule):
- **Shadows counted as the subject.** A soft floor shadow is the background colour, darker. Remove regions of "darkened background" that are smooth **and in the lower half**; without the lower-half rule a grey-green sleeve (also colourless and smooth) was removed and the arm vanished.
- **Gradient backgrounds** (studio orange, vignette): use a per-row background model from a band just inside the edge, median per row. Sampling the very edge picked up a white margin strip.
- **Palette polluted** by the flat magenta behind my own render (it leaks into holes) and by background seen through gaps: skip those pixels when counting colours.
- **A mirrored match of a symmetric model is the opposite azimuth**: report the effective angle, not the raw one.
- **Free elevation overfits.** A tall camera made a worse model fit better; search only 2–26°.
Always look at the `cutout` / the overlay picture first: a number from a wrong cut-out is worse than no number.
