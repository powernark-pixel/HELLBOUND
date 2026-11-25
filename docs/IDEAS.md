# HELLBOUND: Ideas

Long-term ideas for where the game could go. These are not plans or promises: nothing here is
built yet. They're written down so they don't get lost, and so each one can be picked up later
as its own focused piece of work.

---

## The big picture (logged 2026-11-23)

### 1. The journey: down, then back up
- The game **starts in a mansion**.
- You **head down** through the levels (the circles of hell), then **come back up again**.
- Levels stay **mostly linear**: one long, flowing path rather than random backtracking,
  like The Blood Altar.
- Enemies get **progressively harder or more complicated** the further you go.

### 2. Side levels
- **Each level has side levels**: optional detours off the main path.

### 3. The Void (player vs player)
- After reaching **a certain level**, you unlock **the Void**.
- In the Void you could **battle other players**.
- Matches are **like against like**: melee vs melee, gun vs gun, and so on.

### 4. Classes and long-term character growth
- You **pick a starting class**.
- You **develop that character over its whole lifetime**, in the style of **Path of Exile**:
  a big passive tree, gear, and builds that grow deep over time.
- Classes imply different weapon styles (for example melee and guns), which ties into
  the Void's like-against-like matches.

---

## New direction: style and spells (logged 2026-11-23)

### 5. A major art and style rework
- Look and feel closer to **Death Must Die**, **early Path of Exile**, and **Noita** (for the weapons).
- The current script-drawn pixel art is a stand-in. This rework is about the overall style, not
  touching up individual sprites.

### 6. Spells through weapons
- Combat moves towards **spells** ("a spell arc").
- **Weapons carry spells**, and have **drop rates for extra-powerful items and rare spells**.
- Noita-like: the weapon you find shapes how you fight, and lucky drops can be wildly overpowered.

---

## Worlds, bosses and progression (logged 2026-11-23)

### 7. A big, expansive progression system
- Progression is a core pillar: lots to unlock and grow over the life of a character.

### 8. The route: gardens, then the mansion, room by room
- Start in **the Gardens**, then enter **the Mansion**: **corridor → stairs → kitchen → bedroom → toilet**.
- **Keep each new level fresh**: every area has **its own set of enemies** themed to the room.
- Enemy examples:
  - **Toilets** that jump around and splash water
  - **Sinks** that send out waves
  - **Big baths** that drop from the sky
- Boss example: **fight the giant turd** (the bathroom's boss).

### 9. Boss concept: the floating eye octopus
- A **big floating eye octopus**, with **eyes on its tentacles**.
- The tentacles **fizz with electricity** and **stab down into 4 areas** at a time
  (so the player reads the marked zones and dodges).

### 10. A multiplayer quest line for high-tier rewards
- A **multiplayer quest line** that leads to **certain high-tier items**.
- Fits with the Void (idea 3): co-operative content for the best loot.

---

## Weapon slots (logged 2026-11-23)

### 11. Themed weapon slot machines
- **Different themed slot machines** that **pay out weapons** from their theme.
- You **farm a theme's currency** to spin its slot. For example:
  - Farm **space rocks** → spin the **Galaxy slot** → win **galaxy weapons** that are a bit broken.
- Example jackpot: a **purple-shaded hologram blade** that does **insane void damage**.
- Ties in with idea 6 (weapons with drop rates for rare, overpowered items) and the Void (idea 3).

---

## Hideouts (logged 2026-11-23)

### 12. A rest area between levels: the hideout
- **The problem today:** there's no incentive or time to process loot, swap weapons or change gear,
  because the action never stops.
- **The fix:** a **hideout** between levels, a safe place to sort loot, change weapons and gear, and so on.
- The first hideout is **a shack** at the start.
- **More hideouts can be bought** later, unlocked at certain times or places or through **side quests**.
- Ties in with the slot machines (idea 11) and the big progression system (idea 7): the hideout is a natural
  home for them.

---

## Story, the mind, and the next level (logged 2026-11-23)

### 13. The opening: shipwrecked
- The very first step: the knight has **crashed on a boat, washed up on a beach**.
- Comes with a **weird perk** (to be decided).
- The beach leads into the Gardens (idea 8).

### 14. The mind: madness and visions
- Themes of **schizophrenia and mental health**, with **DMT-induced visions** that unfold as the game goes on.
- Not decided yet; to come back to. A note for later: handle these themes with care, as part of the story
  and atmosphere, so they don't become a gimmick.

### 15. Next level to rework: the Gardens
- **Rework the first level into the Garden level**, the start of the gardens → mansion route (idea 8).

### 16. The void blade: a "zip zip zip" dash weapon
- The purple hologram void blade (idea 11) works like **Noita's teleporting bolt ("Z" spell)**: you **zip
  from enemy to enemy**, slashing as you blink through them, like **Pyke** in League of Legends.
- Target: **at least Noita-level weapon art**: bright, animated, readable weapon effects.

### 17. Engine question: stay in HTML or move to Unreal Engine 5?
- Asked: is HTML still viable, or do we need Unreal Engine 5 for Noita-level weapon art?
- Short answer recorded here: **HTML can carry this game**. Noita-quality weapon art is about the art and effects,
  not the engine. UE5 is built for 3D and is a poor fit for a 2D pixel-art game. If HELLBOUND outgrows the browser
  (a Steam release, heavy physics, online play), **Godot** is the better move: free, excellent at 2D pixel art,
  and it can still export to the web.

---

## Decisions (2026-11-23)

### 18. Camera: isometric (decided)
- Move from top-down to an **isometric, diagonal view like Path of Exile / Diablo**, for a more 3D, realistic look.
- Game logic stays the same; the world is drawn on a diamond grid, walls and props get height.
- Decide this before the Gardens are built, so the Gardens are made isometric from the start.

### 19. The Gardens: hedge walls and filling the world outside the path
- The Gardens' walls are **bushes and hedges** instead of stone.
- The level stays **linear: always moving forwards**.
- The space outside the path is filled in layers, by distance from the path:
  1. **Hedge wall** right next to the path (what you bump into).
  2. **Garden dressing** just beyond it: flower beds, statues, fountains, iron railings, dead trees, a gazebo.
  3. **Tree canopy and dark foliage** further out, which fades into **fog and darkness**.
  4. **The mansion on the horizon**, getting closer as you go, so you always know which way is forward.
- **Gates close behind you** (wrought-iron gates that slam shut) so there's no backtracking.

### 20. Loot flow: rewards in the shack, not in the maps
- **No chests during maps.** Levels are for fighting; all chests are removed from the levels.
- **The shack always has a reward chest** with a **random drop** each time you arrive.
- **Monsters drop loot**, plus occasional **orbs that power the slot machines** (idea 11's currency).
- **Shops open at the end of a stage**, so spending happens between levels, alongside the stash
  and the slots, never in the middle of a fight.
- The rhythm: fight through a level → collect drops and orbs → back to the shack → open the chest,
  shop, spin the slots, sort gear → descend.

### 21. Boss concept: the Kung Fu Master ("Boss 01: The Crossing")
- From a concept sheet (Desktop\GAME): a **lanky, smug guy in a tracksuit hoodie**, hands in his pockets,
  walking with a weird, out-of-sync shambling sway.
- **Limbs stretch and lengthen in combat** (long kicks, reaching punches).
- **Special move, the Shambler Shake:** goes loose and floppy, laughs a nervous, closed-mouth laugh that
  **buzzes like electricity**, then **lunges**.
- **Arena:** a dojo with a punching bag, a 功夫 banner and candles.
- **Drop: the Black Belt** (+12% movement speed, +18% unarmed attack speed).
- Darkly comic, like the mansion ideas (idea 8).

### Style reference
- `Desktop\GAME	argeted-image.jpg` (a screenshot from "City of Berelaai"): a top-down/isometric camera,
  a lantern-lit circle of light, heavy blood splatter and a minimal gothic HUD. A good target for HELLBOUND's look.

### 22. The Wormhole: an endgame loop through harder tiers
- At the end of the game, a **wormhole** opens. Going through it **levels up the biomes you've already beaten
  into Tier 2**: the same places, at a higher difficulty.
- This is the endgame play loop: clear every biome, take the wormhole, play them all again at Tier 2 (and
  later Tier 3...), with better loot to match.
- Ties in with the Stardust Engine (stardust empowers your weapon by +1% per feeding), so each tier you push
  needs a stronger weapon. "Speed for example": every weapon stat grows, attack speed included.

### 23. Blood harvest: a button-mashing minigame
- A short **arcade-style cutscene / minigame**: a captured monster is **strapped to a chair** and you
  **drain its blood**, mashing buttons (or hitting timed prompts) to drain it faster and cleaner.
- The blood you drain can be **injected** for a **brief boost** (for example a few seconds of extra
  damage or speed): a burst ability fuelled by what you harvested.
- Ties into the blood vat and the flasks: blood as the currency for healing, boosts and progress.
- Loose idea, to shape later.

### 24. Goals to work towards (still within level 1 for now)
- **The vat as a vessel that grows**: a chipped shot glass at the start, upgraded over the run to a
  grand gold goblet, Path of Exile-style in its ornament. *(Built: four vessels, one step per level.)*
- **Flasks** as a progression track: more flasks, bigger flasks, flasks with effects.
- Keep stacking clear, visible goals: vessel upgrades, flask upgrades, weapon empowering
  (the Stardust Engine), perks.

---

## Questions to answer before building any of this
- **The mansion:** is it a hub you return to between descents, or the first level of the descent?
- **Coming back up:** new levels on the way up, or the same levels changed (harder, corrupted, reversed)?
- **Side levels:** what do they reward (loot, a class skill, lore, a shortcut)?
- **The Void:** real online play needs servers and accounts, which is a much bigger project than the
  game so far. A first step could be the Void against computer-controlled "echoes" of other builds.
- **Tone:** the gardens and mansion with killer toilets and a giant turd are darkly funny, while the Blood Altar
  is grim gothic. Do both live in one game (horror-comedy, like The Binding of Isaac), with the mansion above and
  hell below? Or does one tone win?
- **Where hell fits:** is the descent gardens → mansion → down into hell (the Blood Altar and the circles)?
- **Slots:** where do the machines live (a hub, the mansion, the Void)? What other themes and currencies
  (for example an inferno slot paid in brimstone)? How rare is a jackpot, and is there a guarantee after
  many spins so farming never feels hopeless?
- **Classes:** which ones to start with (for example a knight for melee, and a gunslinger for guns),
  and does the current passive tree become the first class's tree?

## Already built that these ideas can grow from
- The Knight, with gear and affixes, a two-hit sword combo and skills on Q, E and R
- Perks from the reward chest, and the Stardust Engine that empowers your weapon (+1% per feeding)
- The Blood Altar: a handcrafted, linear level with areas that get harder (the template for future levels)
- The title screen and the save-free run structure (death sends you back to the start)
