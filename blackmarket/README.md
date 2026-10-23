# Black Market: Zero (vertical slice)

One district, The Crossing, and one arc: **street rat to local threat**.
Wake up in a hovel, dig through junk, set up a lab, cook, sell to the Fence,
buy a pipe and a jacket, take the corner from the Kings, tag their wall.

## Play it

It needs a local web server, because it uses JavaScript modules.

- In Claude Code: start the `hellbound` preview, then open `http://localhost:8000/HELLBOUND/blackmarket/`
- After merging to `main`, it will also be live at `https://powernark-pixel.github.io/HELLBOUND/blackmarket/`

Controls: WASD to move, aim with the mouse, LMB or Space to attack, Shift to dodge, E to interact, M to mute, Esc to close panels.
You need a keyboard and mouse; there are no touch controls yet.

## Files

| File | What it does |
|---|---|
| `index.html`, `style.css` | Page, HUD, panels and the industrial UI look |
| `src/main.js` | Renderer and post-processing, camera, combat, enemy AI, interactions, objectives, HUD |
| `src/level.js` | The Crossing: layout, every prop, lights, lab tiers, territory capture visuals |
| `src/characters.js` | Procedural humanoid rig: stance, gear, animations, rival and Fence presets |
| `src/lab.js` | The lab panel and the animated flask scene |
| `src/data.js` | Ingredients, mixing chemistry, junk loot, shop prices |
| `src/fx.js` | Particles, swing arcs, attack telegraphs, blood decals, rain |
| `src/textures.js` | Every texture is painted in code at load time (no image files) |
| `src/ui.js` | SVG icon set, toasts, banners, floating numbers |
| `src/audio.js` | Synthesised sound effects |

three.js 0.160 loads from the jsDelivr CDN. Fonts come from Google Fonts.

## Art the slice is built around (all placeholders today)

Everything is procedural right now. These are the first assets worth replacing with real art, in rough priority order:

**Characters:** player model with idle, walk, punch, pipe swing, hit, dodge, use/rummage, downed and get-up animations. Two looks: rags and padded jacket. Kings runner (fists or knife), Big Dex (bat), the Fence (leaning, smoking).

**Environment:** cracked concrete tiles, wet asphalt with puddles, rusted corrugated metal, chain-link fence, brick and peeling-paint wall panels, 3 to 4 junk pile variants, barrels, plastic crates, fridge, washer, CRT, utility poles and cables, roll-up shutter door, grimy windows (lit and dark), lab bench (crude and steel), shelf clutter, chemical drums, extractor fan, jersey barriers, pallets, tyres, burned car, van, neon sign.

**Items (icons and in-world):** scrap; the eight ingredients (powder, crystal, gel, resin, spores, solvent, metal flakes, glowing particulate); product vial, bag and jar; bent pipe; padded jacket; glassware kit.

**FX sprites:** dust puff, hit spark, blood splat, chemical bubble, vapour plume, glow pulse, loot pop, interaction ring, spray paint mist, fire and embers.

## Next polish

- Merge static props into a few large meshes (about 950 meshes today) to cut draw calls
- Real skinned characters to replace the capsule rigs, keeping the same posture system
- Footstep splashes and wet footprints, rain ripples in puddles
- Decal pass: more graffiti, torn posters, cigarette butts, street litter
- Lab: a short "first cook" tutorial overlay, and a recipe hint from the Fence
- Combat: enemy hit reactions with directional knockdown, a block or parry for the pipe
- Sound: real foley for the lab and the pipe
- Gamepad support, and a settings menu for quality and volume
