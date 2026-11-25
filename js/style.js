/* HELLBOUND · js/style.js · The game's colours in one place
   (Files load in the order listed in index.html and share one global scope.)

   Use these names instead of typing hex codes, so the whole game keeps one look and a
   colour can be changed everywhere at once. docs/STYLE_GUIDE.md explains each one, plus
   the pixel sizes, fonts and art rules. The HUD's CSS has the same colours as --blood,
   --gold-hi and so on (css/hellbound.css), so keep the two in step.

   Older code still has some hex codes typed in; they're being moved over to COL as each
   file is touched. */
const COL={
  // BLOOD: the game's main colour (wounds, the vat, the altar, danger zones)
  bloodDark:'#6e0d18',   // shadows, undersides
  blood:    '#8f1a1f',   // the base red
  bloodHi:  '#c4302c',   // lit blood, health bars
  bloodLit: '#e05a4a',   // surfaces catching light
  bloodPale:'#ff8a7a',   // text on dark, highlights

  // GOLD: rewards, the way forward, legendary things
  goldDeep: '#b48a34',
  goldWarm: '#e0bf68',   // UI titles and labels
  gold:     '#ffe14f',   // stairs, "ONWARD", full vat, crits

  // FIRE: the Fire Line, embers, lava, torches
  fireDeep: '#a12a06',
  fire:     '#ff6a1a',
  ember:    '#ff7a2b',
  fireHi:   '#ffd27a',

  // BONE AND ASH: text, stone, dust
  bone:     '#d6cab2',   // main text
  boneLo:   '#a89a84',   // quieter text
  text:     '#c9a99a',   // log messages, small labels
  ash:      '#5d5059',   // dust, smoke, rubble
  ashDark:  '#4a3f48',

  // MAGIC: each kind of power has its own colour, so you can read a fight at a glance
  volt:     '#9ef0ff',   // electricity (the Oculus)
  voltDeep: '#5ad8ff',
  arcane:   '#8fa8ff',   // stardust and the Stardust Engine
  perk:     '#ff8ad8',   // perks and boons
  voidC:    '#b46bff',   // deeper circles
  danger:   '#ff4f6e',   // warnings, damage taken

  // ENEMY WARNINGS: the red shapes on the floor that say "an attack lands here"
  warnDeep: '#ff2a1a',   // the faint fill of a danger zone
  warn:     '#ff5a3a',   // the blinking edge of a danger zone, archer aim lines
  warnHi:   '#ff7a2a',   // the core that fills up as the attack gets closer
  arrow:    '#ffe6b0',   // archer arrows (pale, so they stand out from red orbs)

  // OUTLINES
  ink:      '#0a0608',   // the 1px dark outline around every sprite
  white:    '#ffffff',
};
