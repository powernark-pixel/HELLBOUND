# HELLBOUND sound

Every sound in the game is synthesised live by `audio/sfx.js`, so the game has sound with no audio files.
Any sound can be **replaced with your own** (for example made in Reason). A file you add always wins
over the synthesised version.

## Replacing a sound with your own

1. Make the sound in Reason and export it: **File → Export Song/Loop as Audio File**, as **WAV, 44.1 kHz, 16-bit**.
   - Keep short sounds short: trim silence at the start so they feel instant.
   - Leave a little headroom: peaks around −3 dB. The game mixes many sounds at once.
   - Mono is fine for effects. Stereo is nice for the ambience.
2. Name the file after the sound it replaces (see the list below), for example `swing.wav`.
3. Put it in `audio/sfx/` (ambience goes in `audio/music/`).
4. Add one line to `SOUND_FILES` at the top of `audio/sfx.js`:
   ```js
   swing:'audio/sfx/swing.wav',
   ```
   (Or send the files to Claude and ask for them to be wired in.)

Long sounds (ambience, music) are better as **MP3** to keep the game small. Reason exports WAV;
the free program Audacity can convert WAV to MP3.

## Every sound name

| Name | When it plays | Feel |
|---|---|---|
| `swing` | Every sword swing | Fast whoosh |
| `hit` | Sword hits an enemy | Meaty thud |
| `crit` | Critical hit | Thud plus a metallic ring |
| `kill` | An enemy dies | Wet splat |
| `bigkill` | The Warden dies | Huge splatter, then a bell |
| `hurt` | The knight takes damage | Grunt, armour knock |
| `death` | The knight dies | Funeral bell, low groan |
| `roll` | Dodge roll | Cloth and air |
| `pickup` | Loot picked up (higher rarity plays more notes) | Bright chime |
| `chest` | Chest opened | Creaking wood, coins |
| `levelup` | Level up | Rising organ arpeggio |
| `descend` | Taking the stairs down | Deep boom |
| `area` | Entering a new area of a level | Distant bell |
| `roar` | The Warden wakes | Monstrous roar |
| `bolt` | The Warden fires his ring of bolts | Dark magic whoosh |
| `arrow` | A skeleton archer shoots | Bowstring twang |
| `sizzle` | Standing in lava or blood | Hiss |
| `equip` | Equipping an item | Metal clank |
| `salvage` | Salvaging an item | Falling sparkle |
| `node` | Taking a passive node, rerolling | Magical chime |
| `ui` | Clicking a menu button | Soft click |
| `hover` | Moving through the title menu | Faint tick |
| `ambience` | Loops under the whole game | Dark cathedral drone (currently drone, rumbles and drips) |

Players can mute with **M**, and set the volume under **Esc → Sound**.
