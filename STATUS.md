# HELLBOUND: Where it stands (25 Nov 2026)

## The focus: one great run of The Blood Altar

Until this feels great, it's the only thing being worked on:

> Start in the level → fight down the path → fill the blood vat → beat the Warden →
> get your reward in the Shack → go again.

**Why:** between 23 and 25 Nov there were about 47 commits across roughly 15 different systems
(level, shack, two sound passes, isometric camera, vat, feel pass, three art drops, skills, perks,
Stardust Engine, lava and blood pools, the Warden, sword combo, hitboxes, the Oculus, vessels),
and 24 ideas were logged. Nearly all of it already serves level 1. What's missing is time spent
playing that one run and tuning it.

## Punch list

| # | Item | State |
|---|---|---|
| 1 | Play the run start to finish 3 times; write down the 3 worst moments. Those go first. | To do (needs Dave) |
| 2 | Lock the enemy list (rat, imp, hound, archer, demon, Oculus, Warden). Each gets a clear warning before it attacks and one clear way to beat it. No new enemies. | **Archers now aim with a warning line**. Hounds, demons, the Oculus and the Warden already warn. Rats and imps just bite. |
| 3 | Every button has a reason: combo, dash, Fire Line, Flask, Cleave. | To do (needs play) |
| 4 | Each of the 7 areas teaches one thing; the vat fills naturally on the way, no grinding at the stairs. | **Vat needs 60% (was 65%), and the Warden's death pulls in every drop left on the floor.** Area tuning needs play. |
| 5 | The Warden is the payoff: about 60 to 90 seconds on a first try, hard but fair. | **His health bar shows as soon as he wakes, and he announces his second phase.** Length needs play. |
| 6 | Death back to fighting in under 10 seconds. | **Done: R, Space, Enter or a click rises you again after 0.6 s.** |
| 7 | You can always read your health, incoming hits and warnings in a crowd. | **Enemy shots have a dark outline; the screen edges flash red when you're hit.** |
| 8 | One strong reward choice in the Shack (perks or the Engine, not both). Don't add more reward systems. | To decide |

## Parked (log ideas in `docs/IDEAS.md`, don't build them)

- New levels: the Gardens, the mansion, the shipwreck opening
- The Void / PvP, the multiplayer quest line
- Classes and the big progression system
- Slot machines, the Wormhole endgame
- The blood-harvest minigame, flask and vessel progression tracks
- Story, the mind and visions
- The Unreal Engine question
- The art and style overhaul

## Loose ends

- **PR #13 (the Oculus, blood drops, vessels, style guide) isn't merged yet.** Merge it first; the fixes
  above are built on top of it.
- The **O** key still spawns an Oculus anywhere (a test tool). Remove it once the Oculus art is final.
- The `docs/ideas` branch holds `docs/IDEAS.md` and has never been merged to `main`.
- The reward chest (perks) and the Stardust Engine both live in the Shack; item 8 is about picking one.
