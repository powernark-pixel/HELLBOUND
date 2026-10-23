// Procedural textures. Every surface in The Crossing is painted here at load time,
// so the slice needs no image files. Swap any of these for hand-painted art later:
// each function returns a canvas of the same size the materials expect.
import * as THREE from 'three';

export function rng(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// Tileable value noise with period P lattice cells.
function noise2(seed, P) {
  const r = rng(seed), g = new Float32Array(P * P);
  for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = g[y0 * P + x0], b = g[y0 * P + x1], c = g[y1 * P + x0], d = g[y1 * P + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
// Fractal noise field (tileable), values roughly 0..1.
export function fbm(w, h, { seed = 1, base = 4, oct = 5, gain = 0.5 } = {}) {
  const out = new Float32Array(w * h), ns = [];
  let norm = 0, amp = 1;
  for (let o = 0; o < oct; o++) { ns.push(noise2(seed * 7 + o * 101, base << o)); norm += amp; amp *= gain; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0; amp = 1;
    for (let o = 0; o < oct; o++) { const p = base << o; v += ns[o]((x / w) * p, (y / h) * p) * amp; amp *= gain; }
    out[y * w + x] = v / norm;
  }
  // stretch contrast so thresholds behave predictably
  let mn = 1, mx = 0;
  for (const v of out) { if (v < mn) mn = v; if (v > mx) mx = v; }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - mn) / (mx - mn || 1);
  return out;
}
export function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// Fill a canvas pixel by pixel. fn(px, x, y, i) writes 0..255 values into px[0..3].
function paint(w, h, fn) {
  const c = canvas(w, h), ctx = c.getContext('2d'), id = ctx.createImageData(w, h), d = id.data, px = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; px[3] = 255; fn(px, x, y, i);
    const o = i * 4; d[o] = px[0]; d[o + 1] = px[1]; d[o + 2] = px[2]; d[o + 3] = px[3];
  }
  ctx.putImageData(id, 0, 0);
  return c;
}
function cracks(ctx, r, n, w, h, color, width, len = 20) {
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  const walk = (x, y, a, steps, lw) => {
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      a += (r() - 0.5) * 0.9; x += Math.cos(a) * 5; y += Math.sin(a) * 5; ctx.lineTo(x, y);
      if (r() < 0.08 && lw > 0.6) { ctx.stroke(); walk(x, y, a + (r() - 0.5) * 2, steps / 3 | 0, lw * 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y); }
    }
    ctx.stroke();
  };
  for (let k = 0; k < n; k++) walk(w * (0.15 + 0.7 * r()), h * (0.15 + 0.7 * r()), r() * 6.28, len * (0.5 + r()) | 0, width * (0.6 + r() * 0.8));
}
function blotches(ctx, r, n, w, h, color, rmin, rmax) {
  for (let k = 0; k < n; k++) {
    const x = r() * w, y = r() * h, rad = rmin + r() * (rmax - rmin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, 6.28); ctx.fill();
  }
}

// ---------------------------------------------------------------- surfaces
function asphalt() {
  const S = 512, n = fbm(S, S, { seed: 3, base: 16, oct: 4 }), m = fbm(S, S, { seed: 9, base: 3, oct: 3 }), r = rng(7);
  const wet = new Float32Array(S * S);
  const map = paint(S, S, (p, x, y, i) => {
    const w = sstep(0.55, 0.68, m[i]); wet[i] = w;
    let v = 0.15 + n[i] * 0.1; if (r() < 0.05) v += 0.07 * r();
    v *= 1 - 0.4 * w;
    p[0] = v * 245; p[1] = v * 250; p[2] = v * 262;
  });
  const ctx = map.getContext('2d');
  blotches(ctx, r, 10, S, S, 'rgba(8,6,10,0.35)', 20, 60);
  cracks(ctx, r, 7, S, S, 'rgba(4,4,5,0.85)', 1.6, 26);
  const rough = paint(S, S, (p, x, y, i) => { const v = clamp(0.92 - wet[i] * 0.58 - n[i] * 0.06) * 255; p[0] = p[1] = p[2] = v; });
  return { map, rough };
}
function concrete(seed = 21, tint = [1, 0.98, 0.93], seam = 128) {
  const S = 512, n = fbm(S, S, { seed, base: 8, oct: 5 }), st = fbm(S, S, { seed: seed + 1, base: 4, oct: 3 }), r = rng(seed);
  const map = paint(S, S, (p, x, y, i) => {
    let v = 0.34 + n[i] * 0.16 - sstep(0.6, 0.8, st[i]) * 0.12;
    if (r() < 0.03) v -= 0.05;
    if (seam && (x % seam < 2 || y % seam < 2)) v *= 0.5;
    p[0] = v * 255 * tint[0]; p[1] = v * 255 * tint[1]; p[2] = v * 255 * tint[2];
  });
  const ctx = map.getContext('2d');
  blotches(ctx, r, 6, S, S, 'rgba(30,24,16,0.25)', 20, 70);
  cracks(ctx, r, 5, S, S, 'rgba(10,10,10,0.7)', 1.3, 18);
  return map;
}
function brick() {
  const S = 512, n = fbm(S, S, { seed: 31, base: 16, oct: 4 }), drip = fbm(S, S, { seed: 33, base: 32, oct: 3 }), r = rng(31);
  const bh = 32, bw = 64, br = [];
  for (let i = 0; i < 400; i++) br.push(r());
  return paint(S, S, (p, x, y, i) => {
    const row = (y / bh) | 0, off = (row % 2) * 32, col = (((x + off) % S) / bw) | 0, k = br[(row * 9 + col) % 400];
    const mortar = y % bh < 3 || (x + off) % bw < 3;
    let c = mortar ? [66, 63, 58] : [lerp(84, 118, k), lerp(52, 70, k), lerp(42, 56, k)];
    const g = (c[0] + c[1] + c[2]) / 3; c = c.map(v => lerp(v, g, 0.35)); // desaturate
    let s = 0.78 + n[i] * 0.38;
    const streak = drip[((y * 0.12) | 0) * S + x];
    s *= 1 - sstep(0.62, 0.9, streak) * 0.45 * (1 - y / S);
    s *= 1 - sstep(0.55, 1, y / S) * 0.45; // ground grime
    p[0] = c[0] * s; p[1] = c[1] * s; p[2] = c[2] * s;
  });
}
function paintedWall(paintHex, seed = 41) {
  const S = 512, n = fbm(S, S, { seed, base: 8, oct: 5 }), pm = fbm(S, S, { seed: seed + 2, base: 4, oct: 5 }), drip = fbm(S, S, { seed: seed + 3, base: 32, oct: 3 });
  const pc = hexRGB(paintHex);
  return paint(S, S, (p, x, y, i) => {
    const conc = 0.32 + n[i] * 0.16;
    const m = pm[i];
    let c;
    if (m > 0.42) { const fade = 0.75 + n[i] * 0.3; c = pc.map(v => v * fade); }
    else c = [conc * 255, conc * 250, conc * 238];
    if (m > 0.4 && m < 0.44) c = c.map(v => v * 0.55); // peeled edge
    let s = 1;
    const streak = drip[((y * 0.1) | 0) * S + x];
    s *= 1 - sstep(0.6, 0.92, streak) * 0.5;
    s *= 1 - sstep(0.5, 1, y / S) * 0.5;
    p[0] = c[0] * s; p[1] = c[1] * s; p[2] = c[2] * s;
  });
}
function rust(seed = 51) {
  const S = 256, n = fbm(S, S, { seed, base: 8, oct: 5 }), pit = fbm(S, S, { seed: seed + 1, base: 32, oct: 2 });
  const amt = new Float32Array(S * S);
  const map = paint(S, S, (p, x, y, i) => {
    const a = sstep(0.3, 0.68, n[i]); amt[i] = a;
    const metal = [80, 82, 84].map(v => v * (0.75 + pit[i] * 0.4));
    const ru = [lerp(88, 150, pit[i]), lerp(44, 74, pit[i]), lerp(22, 32, pit[i])];
    let c = metal.map((v, k) => lerp(v, ru[k], a));
    if (pit[i] > 0.78) c = c.map(v => v * 0.55);
    p[0] = c[0]; p[1] = c[1]; p[2] = c[2];
  });
  const rough = paint(S, S, (p, x, y, i) => { p[0] = p[1] = p[2] = (0.45 + amt[i] * 0.45) * 255; });
  return { map, rough };
}
function corrugated(paintHex, seed = 61) {
  const S = 512, n = fbm(S, S, { seed, base: 8, oct: 5 }), st = fbm(S, S, { seed: seed + 5, base: 32, oct: 3 });
  const pc = hexRGB(paintHex);
  return paint(S, S, (p, x, y, i) => {
    const streak = st[((y * 0.08) | 0) * S + x];
    const rustAmt = sstep(0.45, 0.75, n[i] * 0.7 + streak * 0.3 + (y / S) * 0.35);
    const ru = [lerp(90, 140, n[i]), lerp(46, 66, n[i]), 26];
    const pa = pc.map(v => v * (0.7 + n[i] * 0.35));
    const c = pa.map((v, k) => lerp(v, ru[k], rustAmt));
    const shade = 0.82 + 0.18 * Math.sin((x / S) * Math.PI * 2 * 16);
    p[0] = c[0] * shade; p[1] = c[1] * shade; p[2] = c[2] * shade;
  });
}
function tile() {
  const S = 512, T = 32, n = fbm(S, S, { seed: 71, base: 16, oct: 3 }), st = fbm(S, S, { seed: 72, base: 4, oct: 4 }), st2 = fbm(S, S, { seed: 73, base: 3, oct: 4 }), r = rng(71);
  const tr = []; for (let i = 0; i < 256; i++) tr.push(r());
  return paint(S, S, (p, x, y, i) => {
    const k = tr[(((y / T) | 0) * 16 + ((x / T) | 0)) % 256];
    const grout = x % T < 2 || y % T < 2;
    let c;
    if (k > 0.95) c = [70, 68, 64].map(v => v * (0.8 + n[i] * 0.4)); // broken tile
    else if (grout) c = [52, 50, 44];
    else c = [170, 168, 156].map(v => v * (0.8 + k * 0.12) * (0.88 + n[i] * 0.16));
    const y1 = sstep(0.55, 0.85, st[i]), g1 = sstep(0.62, 0.9, st2[i]);
    c = [c[0] * (1 - y1 * 0.25), c[1] * (1 - y1 * 0.32), c[2] * (1 - y1 * 0.6)];
    c = [c[0] * (1 - g1 * 0.5), c[1] * (1 - g1 * 0.38), c[2] * (1 - g1 * 0.55)];
    p[0] = c[0]; p[1] = c[1]; p[2] = c[2];
  });
}
function chainlink() {
  const S = 256, c = canvas(S), x = c.getContext('2d');
  x.strokeStyle = '#a2a8ac'; x.lineWidth = 3;
  for (let k = -8; k <= 16; k++) {
    x.beginPath(); x.moveTo(k * 32, 0); x.lineTo(k * 32 + S, S); x.stroke();
    x.beginPath(); x.moveTo(k * 32, S); x.lineTo(k * 32 + S, 0); x.stroke();
  }
  return c;
}
function wood(seed = 81, base = [112, 88, 62]) {
  const S = 256, n = fbm(S, S, { seed, base: 8, oct: 4 }), g = fbm(S, S, { seed: seed + 1, base: 64, oct: 2 }), r = rng(seed);
  const pr = [r(), r(), r(), r()];
  return paint(S, S, (p, x, y, i) => {
    const plank = (y / 64) | 0, gap = y % 64 < 3;
    const grain = g[((x * 0.04) | 0) + y * S] ?? 0.5;
    let s = (0.7 + grain * 0.3) * (0.85 + pr[plank] * 0.25) * (0.8 + n[i] * 0.3);
    if (gap) s *= 0.3;
    const grey = (base[0] + base[1] + base[2]) / 3, w = 0.4 + n[i] * 0.3; // weathered grey
    p[0] = lerp(base[0], grey, w) * s; p[1] = lerp(base[1], grey, w) * s; p[2] = lerp(base[2], grey, w) * s;
  });
}
function hazard() {
  const S = 128, n = fbm(S, S, { seed: 91, base: 8, oct: 4 });
  return paint(S, S, (p, x, y, i) => {
    const band = ((x + y) / 22 | 0) % 2 === 0;
    const worn = n[i] > 0.7;
    let c = band && !worn ? [205, 160, 32] : [24, 22, 20];
    if (worn) c = [70, 66, 60];
    const s = 0.75 + n[i] * 0.35;
    p[0] = c[0] * s; p[1] = c[1] * s; p[2] = c[2] * s;
  });
}
function cloth(seed = 101) {
  const S = 256, n = fbm(S, S, { seed, base: 8, oct: 4 }), st = fbm(S, S, { seed: seed + 1, base: 4, oct: 3 });
  return paint(S, S, (p, x, y, i) => {
    const weave = ((x >> 1) + (y >> 1)) % 2 ? 0.04 : -0.02;
    let v = 0.86 + n[i] * 0.12 + weave;
    v *= 1 - sstep(0.62, 0.85, st[i]) * 0.35;
    p[0] = v * 255; p[1] = v * 250; p[2] = v * 244;
  });
}
function plastic(seed = 111) {
  const S = 128, n = fbm(S, S, { seed, base: 8, oct: 3 });
  return paint(S, S, (p, x, y, i) => {
    let v = 0.8 + n[i] * 0.2;
    if (y % 32 > 18 && y % 32 < 28 && x % 32 > 4 && x % 32 < 28) v *= 0.25; // slots
    p[0] = p[1] = p[2] = v * 255;
  });
}
function gravel() {
  const S = 256, n = fbm(S, S, { seed: 121, base: 32, oct: 3 }), r = rng(121);
  return paint(S, S, (p, x, y, i) => { const v = (0.14 + n[i] * 0.12 + (r() < 0.1 ? 0.06 : 0)) * 255; p[0] = v; p[1] = v * 0.98; p[2] = v * 0.95; });
}
function dirt() {
  const S = 256, n = fbm(S, S, { seed: 131, base: 8, oct: 5 });
  return paint(S, S, (p, x, y, i) => { const v = 0.18 + n[i] * 0.16; p[0] = v * 255; p[1] = v * 230; p[2] = v * 190; });
}

// ---------------------------------------------------------------- decals (RGBA)
function oilDecal(seed) {
  const S = 256, n = fbm(S, S, { seed, base: 4, oct: 4 });
  return paint(S, S, (p, x, y, i) => {
    const dx = x / S - 0.5, dy = y / S - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = sstep(0.95, 0.4, d + (n[i] - 0.5) * 0.7);
    p[0] = 8; p[1] = 8 + n[i] * 6; p[2] = 12; p[3] = a * 200;
  });
}
function crackDecal(seed) {
  const S = 256, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
  cracks(x, r, 4, S, S, 'rgba(0,0,0,0.85)', 2, 22);
  return c;
}
function trashDecal(seed) {
  const S = 256, c = canvas(S), x = c.getContext('2d'), r = rng(seed);
  const cols = ['#cfc8b8', '#b9b19e', '#8a9a7a', '#a33a2a', '#2b5a8a', '#d0b04a', '#6a6a6a'];
  for (let k = 0; k < 26; k++) {
    x.save(); x.translate(r() * S, r() * S); x.rotate(r() * 6.28);
    x.fillStyle = cols[(r() * cols.length) | 0]; x.globalAlpha = 0.65 + r() * 0.3;
    const w = 6 + r() * 18, h = 4 + r() * 12;
    if (r() < 0.3) { x.beginPath(); x.ellipse(0, 0, w / 2, h / 3, 0, 0, 6.28); x.fill(); }
    else { x.beginPath(); x.moveTo(-w / 2, -h / 2); x.lineTo(w / 2, -h / 2 + r() * 4); x.lineTo(w / 2 - r() * 4, h / 2); x.lineTo(-w / 2, h / 2); x.fill(); }
    x.restore();
  }
  return c;
}
export function graffiti(text, fill, outline, { seed = 5, w = 512, h = 256, font = '900 150px Impact, "Arial Black", sans-serif', crown = false } = {}) {
  const c = canvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font; x.lineJoin = 'round';
  x.save(); x.translate(w / 2, h / 2 + 10); x.rotate(-0.06);
  x.shadowColor = fill; x.shadowBlur = 18; x.lineWidth = 20; x.strokeStyle = outline; x.strokeText(text, 0, 0);
  x.shadowBlur = 0; x.fillStyle = fill; x.fillText(text, 0, 0);
  x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,0.35)'; x.strokeText(text, -3, -4);
  x.restore();
  x.fillStyle = fill;
  for (let k = 0; k < 14; k++) { const dx = w * (0.18 + r() * 0.64), dy = h * 0.68; x.fillRect(dx, dy, 3, 10 + r() * 50); }
  if (crown) {
    x.save(); x.translate(w / 2, 34); x.strokeStyle = fill; x.lineWidth = 7; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(-60, 20); x.lineTo(-60, -14); x.lineTo(-30, 8); x.lineTo(0, -24); x.lineTo(30, 8); x.lineTo(60, -14); x.lineTo(60, 20); x.closePath(); x.stroke(); x.restore();
  }
  // weather it
  const n = fbm(w, h, { seed: seed + 9, base: 8, oct: 4 }), id = x.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) id.data[i * 4 + 3] *= sstep(0.15, 0.55, n[i]);
  x.putImageData(id, 0, 0);
  return c;
}
function neonSign(text, color) {
  const w = 1024, h = 160, c = canvas(w, h), x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 96px "Barlow Condensed", Impact, sans-serif';
  for (const [blur, a] of [[28, 0.9], [12, 1], [4, 1]]) { x.shadowColor = color; x.shadowBlur = blur; x.fillStyle = color; x.globalAlpha = a; x.fillText(text, w / 2, h / 2 + 4); }
  x.shadowBlur = 0; x.globalAlpha = 1; x.fillStyle = '#fff';
  x.globalAlpha = 0.85; x.fillText(text, w / 2, h / 2 + 4);
  return c;
}
function windowTex(lit, seed) {
  const W = 128, H = 160, n = fbm(W, H, { seed, base: 4, oct: 4 }), r = rng(seed);
  const blind = r() < 0.5;
  return paint(W, H, (p, x, y, i) => {
    const frame = x < 6 || x > W - 7 || y < 6 || y > H - 7 || Math.abs(x - W / 2) < 3 || Math.abs(y - H / 2) < 3;
    if (frame) { const v = 40 + n[i] * 30; p[0] = v; p[1] = v; p[2] = v * 1.05; return; }
    let c;
    if (lit) { const g = 0.6 + 0.4 * (1 - y / H); c = [255 * g, 170 * g, 80 * g]; if (blind && (y % 10) < 3) c = c.map(v => v * 0.35); }
    else c = [18, 22, 26];
    const grime = sstep(0.4, 0.9, n[i]);
    c = c.map(v => v * (1 - grime * 0.6) + grime * 20);
    p[0] = c[0]; p[1] = c[1]; p[2] = c[2];
  });
}

// ---------------------------------------------------------------- sprites
function soft(S = 64, power = 2) {
  return paint(S, S, (p, x, y) => {
    const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5, d = clamp(1 - Math.sqrt(dx * dx + dy * dy) * 2);
    p[0] = p[1] = p[2] = 255; p[3] = Math.pow(d, power) * 255;
  });
}
function spark() {
  const S = 64;
  return paint(S, S, (p, x, y) => {
    const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
    const core = Math.pow(clamp(1 - d * 2.2), 2), halo = Math.pow(clamp(1 - d), 3) * 0.6;
    p[0] = p[1] = p[2] = 255; p[3] = clamp(core + halo) * 255;
  });
}
function smoke() {
  const S = 128, n = fbm(S, S, { seed: 141, base: 4, oct: 4 });
  return paint(S, S, (p, x, y, i) => {
    const dx = x / S - 0.5, dy = y / S - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
    p[0] = p[1] = p[2] = 255; p[3] = clamp(sstep(1, 0.2, d) * (0.4 + n[i] * 0.9)) * 255;
  });
}
function ring() {
  const S = 128;
  return paint(S, S, (p, x, y) => {
    const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = Math.exp(-Math.pow((d - 0.82) / 0.07, 2)) + clamp(1 - d) * 0.12;
    p[0] = p[1] = p[2] = 255; p[3] = clamp(a) * 255;
  });
}
function blob() {
  const S = 128;
  return paint(S, S, (p, x, y) => {
    const dx = (x + 0.5) / S - 0.5, dy = (y + 0.5) / S - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
    p[0] = p[1] = p[2] = 0; p[3] = Math.pow(clamp(1 - d), 1.4) * 255;
  });
}
function splat(seed) {
  const S = 128, n = fbm(S, S, { seed, base: 4, oct: 4 }), r = rng(seed);
  const c = paint(S, S, (p, x, y, i) => {
    const dx = x / S - 0.5, dy = y / S - 0.5, d = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = sstep(0.75, 0.35, d + (n[i] - 0.5) * 0.8);
    p[0] = 70; p[1] = 8; p[2] = 8; p[3] = a * 230;
  });
  const x = c.getContext('2d'); x.fillStyle = 'rgba(70,8,8,0.9)';
  for (let k = 0; k < 8; k++) { const a = r() * 6.28, d = 30 + r() * 28; x.beginPath(); x.arc(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, 1.5 + r() * 3, 0, 6.28); x.fill(); }
  return c;
}

// ---------------------------------------------------------------- build all
export function makeTextures(renderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const T = {};
  const tex = (c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const a = asphalt(); T.asphalt = tex(a.map); T.asphaltR = tex(a.rough, false);
  T.concrete = tex(concrete(21));
  T.concreteWall = tex(concrete(25, [0.98, 0.98, 0.96], 0));
  T.brick = tex(brick());
  T.wallTeal = tex(paintedWall('#3f5c56', 41));
  T.wallRed = tex(paintedWall('#6a3a2c', 45));
  T.wallCream = tex(paintedWall('#8c8670', 49));
  const ru = rust(51); T.rust = tex(ru.map); T.rustR = tex(ru.rough, false);
  T.corrTeal = tex(corrugated('#47625f', 61));
  T.corrRed = tex(corrugated('#743a2c', 63));
  T.corrGrey = tex(corrugated('#6b6e6c', 65));
  T.tile = tex(tile());
  T.chain = tex(chainlink());
  T.wood = tex(wood(81));
  T.plywood = tex(wood(85, [150, 122, 84]));
  T.hazard = tex(hazard());
  T.cloth = tex(cloth(101));
  T.plastic = tex(plastic());
  T.gravel = tex(gravel());
  T.dirt = tex(dirt());
  T.oil = [tex(oilDecal(201)), tex(oilDecal(202))];
  T.crack = [tex(crackDecal(211)), tex(crackDecal(212))];
  T.trash = [tex(trashDecal(221)), tex(trashDecal(222))];
  T.tagKings = tex(graffiti('KINGS', '#d4231c', '#1a0505', { seed: 5, crown: true }));
  T.tagZero = tex(graffiti('ZERO', '#b6ff3a', '#0d1a02', { seed: 8 }));
  T.tagMisc = [tex(graffiti('NO GODS', '#6f8fb8', '#0a0d14', { seed: 13, font: '900 110px Impact, sans-serif' })),
               tex(graffiti('RAT CITY', '#b8a14a', '#140f02', { seed: 17, font: '900 104px Impact, sans-serif' })),
               tex(graffiti('☠ 4L', '#9a6ab8', '#0d0614', { seed: 19, font: '900 130px Impact, sans-serif' }))];
  T.neon = tex(neonSign('CASH • 4 • ANYTHING', '#ff3ea5'));
  T.winLit = [tex(windowTex(true, 301)), tex(windowTex(true, 302))];
  T.winDark = [tex(windowTex(false, 311)), tex(windowTex(false, 312))];
  T.soft = tex(soft(64, 2)); T.softHard = tex(soft(64, 0.8));
  T.spark = tex(spark()); T.smoke = tex(smoke()); T.ring = tex(ring()); T.blob = tex(blob());
  T.splat = [tex(splat(401)), tex(splat(402)), tex(splat(403))];
  return T;
}
