// Game data: fictional ingredients, how two of them combine, scavenging, the Fence's stock.
import { clamp } from './textures.js';

// pot = potency, vol = volatility, val = base value. tag = the effect it pushes a mixture towards.
export const ING = {
  ash:   { name: 'Ashdust',        form: 'powder',      col: '#b9b2a4', glow: 0.0,  pot: 0.30, vol: 0.12, val: 5,  tag: 'Numb',  w: 22 },
  vitr:  { name: 'Vitrite',        form: 'crystal',     col: '#5fe3ff', glow: 0.45, pot: 0.60, vol: 0.38, val: 11, tag: 'Focus', w: 12 },
  gel:   { name: 'Bog Gel',        form: 'gel',         col: '#86b83a', glow: 0.15, pot: 0.40, vol: 0.20, val: 7,  tag: 'Calm',  w: 16 },
  resin: { name: 'Tar Resin',      form: 'resin',       col: '#d68a2a', glow: 0.05, pot: 0.45, vol: 0.18, val: 8,  tag: 'Grit',  w: 14 },
  spore: { name: 'Rustcap Spores', form: 'spores',      col: '#cc4f92', glow: 0.25, pot: 0.55, vol: 0.42, val: 10, tag: 'Dream', w: 10 },
  solv:  { name: 'Brake Solvent',  form: 'solvent',     col: '#9fdacb', glow: 0.05, pot: 0.20, vol: 0.55, val: 4,  tag: 'Rush',  w: 18 },
  flake: { name: 'Tin Flake',      form: 'flakes',      col: '#c8ccd4', glow: 0.10, pot: 0.35, vol: 0.25, val: 9,  tag: 'Edge',  w: 10 },
  glow:  { name: 'Glowdust',       form: 'particulate', col: '#b6ff3a', glow: 1.0,  pot: 0.90, vol: 0.50, val: 22, tag: 'Surge', w: 3 },
};
export const ING_KEYS = Object.keys(ING);
export const FORM_LABEL = { powder: 'powder', crystal: 'crystals', gel: 'gel', resin: 'resin', spores: 'spores', solvent: 'solvent', flakes: 'metal flakes', particulate: 'glowing particulate' };
export const TAG_COL = { Numb: '#b9b2a4', Focus: '#5fe3ff', Calm: '#86b83a', Grit: '#d68a2a', Dream: '#cc4f92', Rush: '#9fdacb', Edge: '#c8ccd4', Surge: '#b6ff3a' };

// Hand-tuned pairs that are worth discovering: [synergy, ideal share of the alphabetically-first ingredient]
const SPECIAL = { 'solv+vitr': [1.55, 0.3], 'gel+glow': [1.7, 0.62], 'ash+resin': [1.3, 0.45], 'flake+spore': [1.45, 0.35], 'glow+vitr': [1.85, 0.4], 'resin+spore': [1.35, 0.55] };
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }
export const pairKey = (a, b) => [a, b].sort().join('+');
export function pairInfo(a, b) {
  const key = pairKey(a, b);
  const [syn, ideal] = SPECIAL[key] ?? [0.78 + hash(key + 's') * 0.42, 0.28 + hash(key + 'r') * 0.44];
  const aFirst = key.startsWith(a + '+');
  return { key, syn, idealA: aFirst ? ideal : 1 - ideal };
}

const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mixHex = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
function hue(hex) {
  const [r, g, b] = hx(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.08) return { h: -1, s: 0 };
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d / mx };
}
const SUFFIX = { powder: 'Dust', crystal: 'Glass', gel: 'Drift', resin: 'Tar', spores: 'Bloom', solvent: 'Rush', flakes: 'Static', particulate: 'Halo' };
function colorWord(hex) {
  const { h, s } = hue(hex);
  if (h < 0 || s < 0.18) return 'Ghost';
  if (h < 25) return 'Rust'; if (h < 55) return 'Amber'; if (h < 100) return 'Lime'; if (h < 150) return 'Bog';
  if (h < 205) return 'Cyan'; if (h < 255) return 'Cold'; if (h < 300) return 'Violet'; if (h < 345) return 'Pink'; return 'Rust';
}
export function gradeOf(p) { return p >= 0.93 ? 'S' : p >= 0.82 ? 'A' : p >= 0.68 ? 'B' : p >= 0.5 ? 'C' : p >= 0.3 ? 'D' : 'F'; }
export const GRADE_COL = { S: '#b6ff3a', A: '#3ee6ff', B: '#e9e4d4', C: '#c9b98a', D: '#a57a5a', F: '#7a5a5a' };

// The core of the lab. rA = share of ingredient A (0..1). jitter adds the little randomness of a real cook.
export function evaluate(a, b, rA, tier, jitter = 0) {
  const A = ING[a], B = ING[b], { syn, idealA, key } = pairInfo(a, b);
  const dist = Math.abs(rA - idealA);
  const cap = tier >= 2 ? 1 : 0.84;
  const purity = clamp((1 - dist * 2.4) * cap + jitter * 0.07, 0.06, 1);
  const inst = clamp(A.vol * rA + B.vol * (1 - rA) + dist * 0.55 - (tier >= 2 ? 0.18 : 0), 0.02, 1);
  const strength = clamp((A.pot * rA + B.pot * (1 - rA)) * syn * (0.45 + 0.55 * purity), 0, 1.5);
  const value = Math.max(2, Math.round((A.val + B.val) * syn * (0.35 + purity * 1.45) * (1 + strength * 0.6)));
  const pure = mixHex(A.col, B.col, 1 - rA);
  const color = mixHex(pure, '#4a3a26', (1 - purity) * 0.5);
  const glow = clamp(A.glow * rA + B.glow * (1 - rA) + strength * 0.25);
  const dom = rA >= 0.5 ? A : B;
  const forms = [A.form, B.form];
  const form = forms.includes('crystal') && purity > 0.55 ? 'bag' : forms.some(f => f === 'gel' || f === 'resin') ? 'jar' : 'vial';
  const grade = gradeOf(purity);
  const name = (strength > 0.85 ? 'Hyper ' : '') + colorWord(pure) + ' ' + SUFFIX[dom.form];
  const tags = [[A.tag, rA], [B.tag, 1 - rA]].sort((x, y) => y[1] - x[1]).map(([t, w]) => ({ t, w }));
  const yieldN = 1 + (purity > 0.74 ? 1 : 0) + (tier >= 2 && purity > 0.9 ? 1 : 0);
  return { key, a, b, rA, purity, inst, strength, value, color, pure, glow, form, grade, name, tags, yieldN, idealA };
}
export function failChance(inst) { return inst > 0.72 ? Math.min(0.6, (inst - 0.72) * 2.2) : 0; }

// What a junk pile coughs up.
export function rollJunk(r = Math.random) {
  const out = { scrap: 1 + (r() < 0.55 ? 1 : 0), ing: {} };
  const pick = () => { const tot = ING_KEYS.reduce((s, k) => s + ING[k].w, 0); let x = r() * tot; for (const k of ING_KEYS) { x -= ING[k].w; if (x <= 0) return k; } return 'ash'; };
  const n = r() < 0.15 ? 0 : r() < 0.55 ? 1 : 2;
  for (let i = 0; i < n; i++) { const k = pick(); out.ing[k] = (out.ing[k] ?? 0) + 1; }
  return out;
}

export const LAB_COST = 6;
export const SHOP = [
  { id: 'pipe', name: 'Bent Pipe', slot: 'weapon', price: 60, desc: 'Rusted steel. Heavy enough to matter.', stats: ['Damage 3–5 → 11–15', 'Longer reach, wider swing', 'Staggers anyone it hits'] },
  { id: 'jacket', name: 'Padded Jacket', slot: 'body', price: 55, desc: 'Army surplus, stuffed with newspaper.', stats: ['Max health 40 → 70', 'Damage taken −30%'] },
  { id: 'glass', name: 'Glassware Kit', slot: 'lab', price: 90, desc: 'Real flasks. A condenser. A tube light that works.', stats: ['Purity cap 84% → 100%', 'Instability −18%', 'Sharper lab readout'] },
];
export const FENCE_LINES = [
  'Whatever you got, I can move it. Don\'t ask what I pay.',
  'Rain\'s good for business. Cops hate getting wet.',
  'The Kings take a cut off every corner on this block. For now.',
  'You cook it, I sell it, nobody remembers your face.',
  'Better grade, better price. Mud sells for mud money.',
];
