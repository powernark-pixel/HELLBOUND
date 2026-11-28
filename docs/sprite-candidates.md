# Sprite and sound candidates

Third-party art and audio that might fit HELLBOUND. Nothing here is downloaded or in the game yet: these are links and notes
so Dave can look and pick. A scheduled Claude task adds new finds every week (newest batch at the bottom).

## What we're looking for

From `docs/STYLE_GUIDE.md` and `docs/ideas.md`:

- **Look:** gothic dark fantasy pixel art, light from the top left, 1 px dark outline, 5 to 7 step colour ramps.
  Blood red, gold, fire, bone and ash. Recolouring to the `COL` palette is fine (we did it for Blood FX).
- **Sizes:** monsters 24 to 56 px frames (imp 24, hound/archer/rat 32, demon 40, bosses 56+), item icons 16 × 16
  (32 × 32 drawn at half size works too), effects 16 to 32 px. The world is isometric (32 × 16 diamonds), but
  characters are side-view sheets facing right.
- **Animations:** monster sheets ideally have idle, walk, attack, hurt and death rows.
- **Needs:** more monsters (undead, demons, horrors), crafting-material icons for the biome loot idea, biome tiles
  and props (flooded crypt, foundry, flesh pit), a slot machine and its symbols, spell and hit effects.
- **Licences we can use:** CC0, CC-BY (credit in `CREDITS.md`), or a pack page that clearly allows commercial use.
  Avoid "no derivatives" (we recolour and re-sheet), non-commercial-only, GPL/CC-BY-SA art, and AI-generated packs.
- **Sounds:** dark, gothic, weighty (not cartoony or chiptune). Needs: monster growls, hurt and death cries, spell
  impacts (fire, lightning, blood), loot and crafting, slot machine (reels, lever, jackpot), UI, and ambience or music
  loops per biome (crypt drips, foundry machinery, flesh pit). OGG or WAV; long loops as OGG/MP3. Every sound name the
  game uses is in `audio/README.md`. Kenney's CC0 RPG Audio already covers swings, hits, footsteps and coins.

**Fit** is a quick guess: ★★★ strong, ★★ worth a look, ★ long shot.

## Batch 1 (27 Nov 2026)

### Monsters

| Pack | Artist | Price | Licence | Size | What's in it | Fit | Would be used for |
|---|---|---|---|---|---|---|---|
| [2D Pixel Art Demon Sprites](https://elthen.itch.io/2d-pixel-art-demon-sprites) | Elthen | $3 | Commercial use allowed (page text) | 32 × 32, fire slash 64 × 32 | Idle, move, attack, damage, death, jump + fire slash effect | ★★★ | A lesser demon; full animation set matches our rows |
| [Mini Daemon](https://opengameart.org/content/mini-daemon) | Timelot | Free | CC0 | 32 × 32 | 9-frame walk in 8 directions | ★★ | Small demon/imp variant; walk only, would need attack and death drawn |
| [Lich, death knight and fallen warrior](https://opengameart.org/content/lich-death-knight-and-fallen-warrior) | Jastiv (Lori Angela Nagel) | Free | CC-BY 3.0/4.0 (credit) | not stated | Skeletal undead with glowing red eyes | ★★ | Crypt elites or a lich mini-boss; comments mention uneven pixel scale |
| [Skeletons Rework](https://opengameart.org/content/skeletons-rework) | AntumDeluge et al. | Free | CC0 | 24 × 32 | 4-direction walk, no attack or death | ★ | Base for a skeleton enemy; needs extra rows |
| [Creatures Asset Pack](https://vnitti.itch.io/creatures) | vnitti | $1.99 (free 5-sprite demo) | Commercial use allowed; demo needs credit | 32 × 32 | 12 horror monsters + 8 variants (zombies, ghosts, wolves, mimic chests); **not animated** | ★★ | Style reference, or mimic chests / ghosts with live-drawn motion |

### Crafting materials and item icons

| Pack | Artist | Price | Licence | Size | What's in it | Fit | Would be used for |
|---|---|---|---|---|---|---|---|
| [Crafting Materials](https://beast-pixels.itch.io/crafting-materials) | Beast Pixels | Free / PWYW | CC0 | ~24 × 24 (unconfirmed) | Gems, ores, ingots, herbs, pelts, potions, with outlines | ★★★ | Biome crafting materials (recolour per biome) |
| [Fantasy RPG Items Icons](https://pixelscapestudio.itch.io/free-fantasy-rpg-items-icons-pixel-art) | PixelScapeStudio | Free | Commercial use, no credit; don't redistribute as-is | 16 × 16 | Potions, rings, scrolls, **orbs**, crystals in 11 colours | ★★★ | PoE-style currency orbs for rerolling / adding affixes |
| [Ore, Ingot, and Gem Icons](https://direpixel.itch.io/ores-ingots-and-gems) | direpixel | $5 | **Not stated** (ask the artist) | 16 × 16 | 48 ores, gems and ingots | ★ | Foundry-biome materials, if the licence checks out |

### Biome tiles and props (isometric)

| Pack | Artist | Price | Licence | Size | What's in it | Fit | Would be used for |
|---|---|---|---|---|---|---|---|
| [Dungeon Isometric Assets](https://philtacular.itch.io/pixel-art-tileset-isometric-dungeon-pack) | philtacular | $7.49 | Commercial use allowed (full licence on a linked page) | 32 px iso grid | Floors, walls, chests incl. a mimic, skulls, cauldrons, chains, banners, torches | ★★★ | Props for crypt and foundry rooms; same grid as ours. No outlines, so props would need ours added |
| [Twilight Dungeons Isometric](https://vitaly-frog.itch.io/twilight-dungeons-isometric-asset-pack) | Night Quest Games | $2 | CC BY-ND 4.0, but page also says you may modify (conflict) | 128 px surface | Floors, walls, gates, candles, sconces, vampire coffins | ★ | Too large for our 32 px tiles, and ND is a risk; look for the coffins and candles only |
| [Castle Crypts Tileset](https://mftinyturtle.itch.io/castle-crypts-tileset) | mftinyturtle | PWYW; commercial licence £3.99 | Non-commercial unless you buy the commercial licence | 16/32/48 | Crypt walls, floors, tombs, statues, animated torch; **top-down, not iso** | ★ | Reference for a crypt palette and tomb shapes |

### Slot machine

| Pack | Artist | Price | Licence | Size | What's in it | Fit | Would be used for |
|---|---|---|---|---|---|---|---|
| [Pixel art slot machine](https://opengameart.org/content/pixel-art-slot-machine) | Vircon32 (Carra) | Free | CC-BY 4.0 (credit) | made for a 640 × 360 screen (same as ours) | Frame, reels, buttons, bonus screens, fruit symbols | ★★ | Slot machine UI; swap fruit for skulls, blood drops and sigils |
| [Pixel Slot Machine](https://cazwolf.itch.io/pixel-slot-machine) | Caz | PWYW | Commercial OK per artist's comment; EULA on linked page | not stated | Machine, lever up/down, cherry, 7, bell, BAR | ★★ | An in-world slot machine prop in the Shack |
| [32x32 Slot Machine](https://kia.itch.io/32x32-slot-machine-pixel-art) | Kia | PWYW | Non-commercial free; commercial = pay what's fair | 32 × 32 | One slot machine sheet | ★ | Small prop, if we pay |

### Spell and hit effects

| Pack | Artist | Price | Licence | Size | What's in it | Fit | Would be used for |
|---|---|---|---|---|---|---|---|
| [Pixel Magic Sprite Effects](https://foozlecc.itch.io/pixel-magic-sprite-effects) | Foozle | Free / PWYW | CC0 | 32 × 32 | 10 animated spells: fireball, molten spear, earth spikes, tornado, portal, explosion | ★★★ | Fire Line upgrades, portal between levels, explosions |
| [Simple Pixel Spell Effects](https://willibab.itch.io/simple-pixel-spell-effects) | Willibab | PWYW | Free for commercial use | not stated | Fire, healing, support, lightning, with Aseprite files | ★★ | Lightning and Blood Flask heal effect |
| [Tiny Spells: Tome of Fire](https://bigwander.itch.io/tiny-spells-tome-of-fire) | BigWander | $5 | Commercial use and edits OK; no redistribution | 32 × 32 canvas, small sprites | Fire bolts with spawn/loop/end rows, diagonal versions | ★★ | Fire projectiles that suit our small scale |

### Looked at and skipped

- [Pixel-MonsterPack-32x32](https://jinosoda.itch.io/monsterpack-32x32) (jinosoda): dark fantasy and the right size, but CC BY-ND (no recolouring) and not animated.
- [Assorted 32x32 creatures](https://opengameart.org/content/assorted-32x32-creatures) (AndHeGames): CC0 but cute and cartoony.

### Sounds

| Pack | Artist | Price | Licence | Format | What's in it | Fit | Would be used for |
|---|---|---|---|---|---|---|---|
| [Free Monster Voice Pack](https://lazyspar7an.itch.io/free-monster-voice-pack-growls-grunts-death-sounds-wav) | lazyspar7an | Free / PWYW | Commercial use, no credit | WAV | Growls, grunts, pain and death screams, "darker, monster-like" | ★★★ | Imp, hound and demon voices, hurt and death |
| [80 CC0 creature SFX](https://opengameart.org/content/80-cc0-creature-sfx) | rubberduck | Free | CC0 | 80 sounds | Grunts, hurts, monsters, trolls, bugs (some cute) | ★★ | Rats, bugs and filler grunts; pick the darker ones |
| [Free Audio Creature Sample Pack](https://fairlight1337.itch.io/free-audio-creature-sample-pack) | fairlight1337 | Free | Commercial OK, credit required, no redistribution | not stated | Creature growls and voice bits | ★★ | Extra monster voices for variety |
| [Basic Spell Impacts](https://lentikula.itch.io/freecc0-basic-spell-impacts-sfx) | lentikula | Free / PWYW | CC0 | WAV, 20 sounds | Lightning, fire, ice, water impacts | ★★★ | Fire Line hits and lightning |
| [FIRE SPELL SFX pack](https://darkfantasystudio.itch.io/fire-spell-sfx-pack) | Dark Fantasy Studio | €9 | Royalty-free for commercial use; no AI | WAV, 21 sounds | Cinematic fire spells | ★★ | A heavier Fire Line and lava |
| [Slot Machine sounds](https://mixkit.co/free-sound-effects/slot-machine/) | Mixkit | Free | Mixkit Licence (free incl. commercial; check before use) | 12 sounds | Reels spinning, coin wins, payout, bonus | ★★ | The slot machine, pitched down to sound grimmer |
| [Ironchest's Dungeon Music Loops](https://ironchestgames.itch.io/ironchests-dungeon-music-loops) | Ironchest Games | Free / PWYW | CC0; no AI | OGG/WAV, 9 loops | Ambient dungeon music loops | ★★★ | Background ambience per biome (`ambience` in `audio/sfx.js`) |
| [Music Loops Pack 1: Dark Fantasy](https://torone.itch.io/music-loops-pack-1-dark-fantasy) | Torone | Free / PWYW | CC-BY 4.0 (credit) | OGG, 4 loops | Combat, 2 exploration, story | ★★★ | Boss fights (combat loop) and the Shack |
| [Dark chamber](https://opengameart.org/content/dark-chamber) | Marcelo Fernandez | Free | CC-BY 4.0 (credit) | MP3, 1 track | Mysterious, melodic dungeon track | ★★ | The Blood Altar or a crypt biome |

Sounds looked at and skipped:

- [Magic Spell SFX Soundpack](https://thesoundrack.itch.io/freemagicspellsfx) (425 spells incl. dark magic): no licence stated on the page. Worth asking the artist, it's big.
- [80 CC0 creture SFX #2](https://opengameart.org/content/80-cc0-creture-sfx-2) and [Dark Dungeon Ambience](https://opengameart.org/content/dark-dungeon-ambience): no licence shown; check the live page.
- [Medieval Fantasy Inventory Sounds Lite](https://visionaryeight.itch.io/medieval-fantasy-inventory-item-sounds-lite) ($9.99) and [Rummage & Loot](https://justinjetzorbas.itch.io/rummage-loot) ($8): no licence stated.
- Gaps still open: biome ambience beds (dripping crypt, foundry machinery, flesh pit), crafting sounds, and UI.
