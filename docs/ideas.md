# HELLBOUND ideas

Game ideas that aren't built yet. One short entry each: what it is and a few notes on how it could work.
Nothing here is a plan or a promise. When an idea gets built, delete its entry.

## Biome-specific crafting loot (Path of Exile style)

Monsters in certain biomes drop certain kinds of crafting loot, so where you farm decides what you can craft.

- **Each biome has its own crafting materials.** For example, a flooded crypt drops reroll-type materials, a foundry drops upgrade materials, a flesh pit drops corruption materials. Each one does one clear job, like PoE currency orbs (reroll affixes, add an affix, raise rarity, corrupt).
- **Drop weighting.** A biome's own materials are common there, other biomes' materials are rare there but not impossible. A rare "signature" material only drops in one biome, mostly off its elites or boss.
- **Farming pull.** Players pick which area to run based on what they want to craft, which gives every biome a reason to be revisited. Trials or modifiers on a level could raise its material drop rate.
- **Fits what's there.** Rides on the existing drop roll in `js/combat.js` and the loot and affix data in `js/data.js`; biomes would just add a material table per level.
- **Open questions.** Where crafting happens (the blood altar?), whether materials stack in their own stash tab, and whether blood sigils can buy them.
