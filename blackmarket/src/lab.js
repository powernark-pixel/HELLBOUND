// The lab: a hand-drawn flask scene that reacts to the mix.
// Ratio  -> how full each source jar is, and the pour streams
// Purity -> clarity of the liquid (murk, floating residue, sediment, stain rings)
// Instability -> bubbling, vapour, colour flicker, risk of a flare-up
// Value / strength -> glow, sparkles, the colour of the light on the wall
import { ING, ING_KEYS, FORM_LABEL, TAG_COL, GRADE_COL, evaluate, failChance, pairInfo, mixHex } from './data.js';
import { clamp, lerp, rng } from './textures.js';
import { icon } from './ui.js';

const W = 560, H = 380, CX = 280, NECK_Y = 92, SHOULDER_Y = 150, BASE_Y = 312;
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a) => { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

function flaskPath(x) {
  x.beginPath();
  x.moveTo(CX - 22, NECK_Y); x.lineTo(CX - 22, SHOULDER_Y);
  x.lineTo(CX - 112, BASE_Y - 22); x.quadraticCurveTo(CX - 124, BASE_Y, CX - 98, BASE_Y);
  x.lineTo(CX + 98, BASE_Y); x.quadraticCurveTo(CX + 124, BASE_Y, CX + 112, BASE_Y - 22);
  x.lineTo(CX + 22, SHOULDER_Y); x.lineTo(CX + 22, NECK_Y);
}
const halfWidthAt = y => (y <= SHOULDER_Y ? 22 : lerp(22, 112, clamp((y - SHOULDER_Y) / (BASE_Y - 22 - SHOULDER_Y))));

export class Lab {
  constructor(game) {
    this.game = game; this.G = game.G;
    this.cv = document.getElementById('flask'); this.x = this.cv.getContext('2d');
    this.a = null; this.b = null; this.r = 0.5;
    this.bubbles = []; this.vapour = []; this.residue = []; this.sparkles = []; this.fire = [];
    this.cook = null; this.result = null; this.time = 0; this.open = false;
    this.disp = { fill: 0, purity: 1, inst: 0, glow: 0, color: '#30363a' };
    this.bg = this.makeBg();
    const r = rng(9); for (let i = 0; i < 80; i++) this.residue.push({ x: r(), y: r(), s: 0.5 + r() * 1.6, p: r() * 6 });
    for (let i = 0; i < 40; i++) this.sparkles.push({ x: r(), y: r(), p: r() * 6, s: 0.6 + r() });
    document.getElementById('ratio').addEventListener('input', e => { this.r = e.target.value / 100; this.refresh(); });
    document.getElementById('labCook').addEventListener('click', () => this.startCook());
    document.getElementById('labClear').addEventListener('click', () => { this.a = this.b = null; this.result = null; this.hideResult(); this.refresh(); });
  }

  makeBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rng(4);
    // stained tile wall
    x.fillStyle = '#1c1e1e'; x.fillRect(0, 0, W, H);
    for (let ty = 0; ty < 300; ty += 28) for (let tx = 0; tx < W; tx += 28) {
      const v = 46 + r() * 14; x.fillStyle = `rgb(${v},${v + 2},${v - 2})`; x.fillRect(tx + 1, ty + 1, 26, 26);
      if (r() < 0.08) { x.fillStyle = 'rgba(20,18,12,0.6)'; x.fillRect(tx + 1, ty + 1, 26, 26); }
    }
    const g = x.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(0.6, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, W, 300);
    for (let i = 0; i < 9; i++) { const sx = r() * W, sy = r() * 200; const gg = x.createLinearGradient(sx, sy, sx, sy + 120); gg.addColorStop(0, 'rgba(60,50,20,0.25)'); gg.addColorStop(1, 'rgba(60,50,20,0)'); x.fillStyle = gg; x.fillRect(sx, sy, 3 + r() * 8, 120); }
    // steel bench
    const t = x.createLinearGradient(0, 300, 0, H); t.addColorStop(0, '#5b6168'); t.addColorStop(0.06, '#30353a'); t.addColorStop(1, '#16181b');
    x.fillStyle = t; x.fillRect(0, 300, W, H - 300);
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, 300, W, 1.5);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * W, 304 + r() * 76, 6 + r() * 30, 1); }
    for (let i = 0; i < 5; i++) { const sx = r() * W, sy = 320 + r() * 50; const gg = x.createRadialGradient(sx, sy, 0, sx, sy, 30 + r() * 30); gg.addColorStop(0, 'rgba(10,8,4,0.5)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(sx - 60, sy - 40, 120, 80); }
    return c;
  }

  // ---------------------------------------------------------- panel
  show() {
    this.open = true; this.result = null; this.hideResult();
    const G = this.G;
    // keep selections valid
    if (this.a && !G.ing[this.a]) this.a = null; if (this.b && !G.ing[this.b]) this.b = null;
    document.getElementById('labTier').textContent = G.labTier >= 2 ? 'TIER 2 · GLASSWARE' : 'TIER 1 · BUCKET CHEMISTRY';
    document.getElementById('readAcc').textContent = G.labTier >= 2 ? '± fine' : '± rough';
    this.refresh();
  }
  pick(k) {
    if (this.cook) return;
    if (!this.G.ing[k]) return;
    if (this.a === k) this.a = null; else if (this.b === k) this.b = null;
    else if (!this.a) this.a = k; else if (!this.b) this.b = k; else { this.a = this.b; this.b = k; }
    this.result = null; this.hideResult(); this.game.sfx.play('click');
    this.refresh();
  }
  preview() { return this.a && this.b ? evaluate(this.a, this.b, this.r, this.G.labTier) : null; }
  uncertainty(ev) {
    const nb = ev && this.G.notebook[ev.key];
    if (nb && Math.abs(nb.rA(ev.a) - this.r) < 0.05) return 0.03;
    return this.G.labTier >= 2 ? 0.06 : 0.16;
  }
  refresh() {
    const G = this.G, list = document.getElementById('labIngs');
    list.innerHTML = '';
    for (const k of ING_KEYS) {
      const d = ING[k], n = G.ing[k] ?? 0;
      const row = document.createElement('div');
      row.className = 'ing' + (n ? '' : ' none') + (this.a === k ? ' selA' : '') + (this.b === k ? ' selB' : '');
      row.innerHTML = `${icon(d.form, d.col)}<div class="nm">${d.name}<small>${FORM_LABEL[d.form]}</small></div>${this.a === k ? '<span class="badge">A</span>' : this.b === k ? '<span class="badge">B</span>' : ''}<span class="ct">×${n}</span>`;
      row.addEventListener('click', () => this.pick(k));
      row.addEventListener('mouseenter', e => this.game.ui.tip(`<b>${d.name}</b><br>Pushes mixtures towards <span style="color:${TAG_COL[d.tag]}">${d.tag}</span>.<br>Volatility ${Math.round(d.vol * 100)}% · Potency ${Math.round(d.pot * 100)}%`, e));
      row.addEventListener('mouseleave', () => this.game.ui.tip(null));
      list.appendChild(row);
    }
    const A = this.a && ING[this.a], B = this.b && ING[this.b];
    document.getElementById('ratioA').innerHTML = A ? `${A.name} <i>${Math.round(this.r * 100)}%</i>` : '<i>load A</i>';
    document.getElementById('ratioB').innerHTML = B ? `<i>${Math.round((1 - this.r) * 100)}%</i> ${B.name}` : '<i>load B</i>';
    const rr = document.getElementById('ratio');
    rr.style.setProperty('--ca', A ? A.col : '#444'); rr.style.setProperty('--cb', B ? B.col : '#444');
    const ev = this.preview(), u = this.uncertainty(ev);
    const meters = [
      ['Purity', ev?.purity, '#e9e4d4', true], ['Instability', ev?.inst, '#ff6a3a', true], ['Strength', ev && ev.strength / 1.2, '#3ee6ff', true],
      ['Street value', ev && ev.value / 140, '#b6ff3a', false],
    ];
    document.getElementById('meters').innerHTML = meters.map(([label, v, c, fuzzy]) => {
      if (v == null) return `<div class="meter" style="--mc:${c}"><label>${label}<b>—</b></label><div class="track"></div></div>`;
      const vv = clamp(v), lo = clamp(vv - (fuzzy ? u : 0)), hi = clamp(vv + (fuzzy ? u : 0));
      const txt = label === 'Street value' ? `~$${Math.round(ev.value * (1 - u * 0.5))}–${Math.round(ev.value * (1 + u * 0.5))}` : fuzzy ? `${Math.round(lo * 100)}–${Math.round(hi * 100)}%` : '';
      return `<div class="meter" style="--mc:${c}"><label>${label}<b>${txt}</b></label><div class="track"><div class="fill" style="width:${lo * 100}%"></div><div class="fuzz" style="left:${lo * 100}%;width:${(hi - lo) * 100}%"></div></div></div>`;
    }).join('');
    const fc = ev ? failChance(ev.inst) : 0;
    document.getElementById('effects').innerHTML = ev
      ? ev.tags.map(({ t, w }) => `<span style="--tc:${TAG_COL[t]}">${t} ${w > 0.6 ? '●●●' : w > 0.35 ? '●●' : '●'}</span>`).join('') + (fc > 0 ? `<span style="--tc:#ff4a3a">Flare risk ${Math.round(fc * 100)}%</span>` : '')
      : '<span style="--tc:#5d635f">load two ingredients</span>';
    const nb = Object.values(G.notebook);
    document.getElementById('notebook').innerHTML = nb.length
      ? nb.sort((p, q) => q.best - p.best).map(n => `<div><b>${n.name}</b><span>${Math.round(n.share * 100)}/${100 - Math.round(n.share * 100)} · <span class="g" style="color:${GRADE_COL[n.grade]}">${n.grade}</span></span></div>`).join('')
      : '<div>No recipes yet. Experiment.</div>';
    const can = !!(ev && !this.cook);
    document.getElementById('labCook').disabled = !can;
  }
  hideResult() { const r = document.getElementById('labResult'); r.className = ''; r.innerHTML = ''; }

  startCook() {
    const ev = this.preview(); if (!ev || this.cook) return;
    const G = this.G;
    if (!G.ing[this.a] || !G.ing[this.b]) return;
    G.ing[this.a]--; G.ing[this.b]--;
    const jitter = Math.random() * 2 - 1;
    const res = evaluate(this.a, this.b, this.r, G.labTier, jitter);
    const failed = Math.random() < failChance(res.inst);
    this.cook = { t: 0, dur: 3.4, res, failed, flared: false };
    this.result = null; this.hideResult();
    this.game.sfx.play('pour');
    this.refresh();
    this.game.onCookStart(res);
  }
  finishCook() {
    const { res, failed } = this.cook; this.cook = null;
    const card = document.getElementById('labResult');
    if (failed) {
      card.className = 'on fail';
      card.innerHTML = `<div class="gr">BATCH RUINED</div><h3>FLARE-UP</h3><p>Too unstable. Ingredients lost.<br><span style="color:var(--muted)">Lower the instability: change the ratio, or upgrade your glassware.</span></p>`;
      this.game.onCookDone(null, res);
    } else {
      this.result = res;
      card.className = 'on'; card.style.setProperty('--res', res.pure);
      card.innerHTML = `${icon(res.form, res.color, 54)}<h3>${res.name}</h3><div class="gr">GRADE<b style="color:${GRADE_COL[res.grade]}">${res.grade}</b>PURITY ${Math.round(res.purity * 100)}%</div><p>×${res.yieldN} ${res.form === 'bag' ? 'bags' : res.form === 'jar' ? 'jars' : 'vials'} · $${res.value} each</p>`;
      this.game.onCookDone(res, res);
      const prev = this.G.notebook[res.key];
      const first = res.key.startsWith(res.a + '+');
      if (!prev || res.purity > prev.best) this.G.notebook[res.key] = { name: res.name, best: res.purity, grade: res.grade, share: first ? res.rA : 1 - res.rA, rA(a) { return this.key0 === a ? this.share : 1 - this.share; }, key0: res.key.split('+')[0] };
    }
    if (this.a && !this.G.ing[this.a]) this.a = null; if (this.b && !this.G.ing[this.b]) this.b = null;
    this.refresh();
  }

  // ---------------------------------------------------------- render
  frame(dt) {
    if (!this.open) return;
    this.time += dt;
    const x = this.x, t = this.time;
    const ev = this.preview();
    const ck = this.cook; if (ck) { ck.t += dt; if (ck.t >= ck.dur) this.finishCook(); }
    const c = this.cook, ct = c ? c.t : 0;
    const res = c ? c.res : this.result ?? ev;
    // phases while cooking: pour 0-0.9, boil 0.9-2.7, settle 2.7-3.4
    const pour = c ? clamp(ct / 0.9) : 0, boil = c ? clamp((ct - 0.9) / 1.8) : 0, settle = c ? clamp((ct - 2.7) / 0.7) : 0;
    const heat = c ? (ct < 0.9 ? 0.25 : ct < 2.7 ? 1 : 1 - settle * 0.7) : this.result ? 0.15 : ev ? 0.3 : 0.08;
    const failNow = c && c.failed && ct > 2.0;
    if (failNow && !c.flared) { c.flared = true; this.game.sfx.play('flare'); for (let i = 0; i < 40; i++) this.fire.push({ x: CX + (Math.random() - 0.5) * 30, y: NECK_Y, vx: (Math.random() - 0.5) * 140, vy: -80 - Math.random() * 180, l: 0.6 + Math.random() * 0.6, m: 1.2 }); }

    // target display state (eases so slider moves feel liquid)
    const D = this.disp;
    let fillT = 0, colT = '#30363a', purT = 1, instT = 0, glowT = 0;
    if (this.a && this.b) { fillT = 0.42; }
    else if (this.a || this.b) fillT = 0;
    if (res) { colT = res.color; purT = res.purity; instT = res.inst; glowT = res.glow; }
    if (c) { fillT = 0.42 * Math.max(0.02, pour); if (failNow) { colT = '#2e2318'; purT = 0.1; instT = 1; glowT = 0; } }
    if (this.result) fillT = 0.42;
    const k = 1 - Math.pow(0.002, dt);
    D.fill = lerp(D.fill, fillT, c ? 1 : k); D.purity = lerp(D.purity, purT, k); D.inst = lerp(D.inst, instT, k); D.glow = lerp(D.glow, glowT, k);
    D.color = mixHex(D.color, colT, k);

    x.clearRect(0, 0, W, H);
    x.drawImage(this.bg, 0, 0);
    // coloured light spilling on the wall
    if (D.fill > 0.02) {
      const gl = x.createRadialGradient(CX, 220, 10, CX, 220, 260);
      gl.addColorStop(0, rgba(D.color, 0.12 + D.glow * 0.35 + heat * 0.05)); gl.addColorStop(1, rgba(D.color, 0));
      x.globalCompositeOperation = 'lighter'; x.fillStyle = gl; x.fillRect(0, 0, W, 330); x.globalCompositeOperation = 'source-over';
    }

    // ---- source jars (fill level shows the ratio)
    const share = { a: this.r, b: 1 - this.r };
    const tilt = c ? Math.sin(pour * Math.PI) * 0.9 : 0;
    this.drawJar(x, 92, this.a, share.a, -tilt, t, c && pour < 1);
    this.drawJar(x, W - 92, this.b, share.b, tilt, t, c && pour < 1);

    // ---- burner
    this.drawBurner(x, heat, t);

    // ---- liquid
    x.save(); flaskPath(x); x.closePath(); x.clip();
    const liqTop = BASE_Y - D.fill * (BASE_Y - NECK_Y) * 1.1;
    if (D.fill > 0.01) {
      const amp = 1.5 + D.inst * 4 * heat;
      const surf = xx => liqTop + Math.sin(xx * 0.05 + t * 3) * amp + Math.sin(xx * 0.11 - t * 4.3) * amp * 0.5;
      // colour: layered A/B during the pour, mixing as it boils
      let topCol = D.color, botCol = D.color;
      if (c && boil < 1 && this.a && this.b) { const m = boil; topCol = mixHex(ING[this.b].col, D.color, m); botCol = mixHex(ING[this.a].col, D.color, m); }
      const flick = D.inst > 0.45 ? (Math.sin(t * 7) * 0.5 + 0.5) * (D.inst - 0.45) * 0.7 : 0;
      topCol = mixHex(topCol, '#ff3ea5', flick * 0.6);
      const lg = x.createLinearGradient(0, liqTop, 0, BASE_Y);
      lg.addColorStop(0, rgba(topCol, 0.92)); lg.addColorStop(0.55, rgba(mixHex(topCol, botCol, 0.6), 0.95)); lg.addColorStop(1, rgba(mixHex(botCol, '#000000', 0.45), 1));
      x.beginPath(); x.moveTo(0, BASE_Y + 10);
      for (let xx = 0; xx <= W; xx += 8) x.lineTo(xx, surf(xx));
      x.lineTo(W, BASE_Y + 10); x.closePath(); x.fillStyle = lg; x.fill();
      // inner glow
      if (D.glow > 0.15) {
        const ig = x.createRadialGradient(CX, BASE_Y - 40, 5, CX, BASE_Y - 40, 140);
        ig.addColorStop(0, rgba(D.color, D.glow * 0.7)); ig.addColorStop(1, rgba(D.color, 0));
        x.globalCompositeOperation = 'lighter'; x.fillStyle = ig; x.fillRect(CX - 140, liqTop, 280, BASE_Y - liqTop); x.globalCompositeOperation = 'source-over';
      }
      // murk + floating residue (impurity)
      const imp = 1 - D.purity;
      if (imp > 0.03) {
        x.fillStyle = `rgba(70,58,40,${imp * 0.42})`; x.fillRect(0, liqTop, W, BASE_Y - liqTop);
        const n = Math.round(imp * 80);
        for (let i = 0; i < n; i++) {
          const p = this.residue[i];
          const yy = lerp(liqTop + 6, BASE_Y - 6, (p.y + Math.sin(t * 0.3 + p.p) * 0.04 + 1) % 1);
          const xx = CX + (p.x - 0.5) * 2 * halfWidthAt(yy) * 0.9 + Math.sin(t * 0.7 + p.p) * 4;
          x.fillStyle = `rgba(40,30,20,${0.35 + imp * 0.4})`; x.fillRect(xx, yy, p.s * 1.6, p.s * 1.6);
        }
        // sediment
        const sh = imp * 20;
        const sg = x.createLinearGradient(0, BASE_Y - sh, 0, BASE_Y);
        sg.addColorStop(0, 'rgba(30,24,14,0)'); sg.addColorStop(1, `rgba(30,24,14,${0.4 + imp * 0.5})`);
        x.fillStyle = sg; x.fillRect(0, BASE_Y - sh - 4, W, sh + 6);
      }
      // sparkles (strength / glowing particulate)
      const ns = Math.round(D.glow * 36);
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ns; i++) {
        const p = this.sparkles[i];
        const yy = lerp(liqTop + 8, BASE_Y - 8, p.y), xx = CX + (p.x - 0.5) * 2 * halfWidthAt(yy) * 0.85;
        const a = Math.max(0, Math.sin(t * 3 * p.s + p.p)) * 0.9;
        x.fillStyle = `rgba(255,255,255,${a})`; x.fillRect(xx - 1, yy - 1, 2, 2);
        x.fillStyle = rgba(D.color, a * 0.5); x.fillRect(xx - 3, yy - 0.5, 6, 1); x.fillRect(xx - 0.5, yy - 3, 1, 6);
      }
      x.globalCompositeOperation = 'source-over';
      // bubbles
      const rate = (D.inst * 22 + heat * 34) * (D.fill > 0.1 ? 1 : 0);
      this.bubAcc = (this.bubAcc ?? 0) + rate * dt;
      while (this.bubAcc > 1) { this.bubAcc--; this.bubbles.push({ x: CX + (Math.random() - 0.5) * 150, y: BASE_Y - 4, r: 1.5 + Math.random() * (2 + D.inst * 4), v: 40 + Math.random() * 60 + heat * 40, p: Math.random() * 6 }); }
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i]; b.y -= b.v * dt; b.x += Math.sin(t * 5 + b.p) * 0.4;
        const hw = halfWidthAt(b.y) - 6; b.x = clamp(b.x, CX - hw, CX + hw);
        if (b.y < liqTop + 2) { this.bubbles.splice(i, 1); this.vapour.push({ x: b.x, y: liqTop, r: 3, a: 0.25, vx: 0, vy: -10 }); if (Math.random() < 0.08) this.game.sfx.play('bubble'); continue; }
        x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 1; x.beginPath(); x.arc(b.x, b.y, b.r, 0, 6.28); x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(b.x - b.r * 0.4, b.y - b.r * 0.5, 1.4, 1.4);
      }
      // surface highlight
      x.strokeStyle = rgba(mixHex(D.color, '#ffffff', 0.5), 0.6); x.lineWidth = 1.5; x.beginPath();
      for (let xx = CX - 120; xx <= CX + 120; xx += 6) xx === CX - 120 ? x.moveTo(xx, surf(xx)) : x.lineTo(xx, surf(xx)); x.stroke();
      // crystals forming while it settles (bags)
      if (res && res.form === 'bag' && (settle > 0 || this.result)) {
        const kk = this.result ? 1 : settle, r = rng(3);
        for (let i = 0; i < 26 * kk; i++) { const xx = CX + (r() - 0.5) * 190, yy = BASE_Y - 4 - r() * 14; x.fillStyle = rgba(mixHex(D.color, '#ffffff', 0.4), 0.85); x.beginPath(); x.moveTo(xx, yy - 6); x.lineTo(xx + 3, yy); x.lineTo(xx, yy + 2); x.lineTo(xx - 3, yy); x.fill(); }
      }
    }
    x.restore();

    // ---- glass
    // stain rings left by previous levels (impurity)
    if (D.fill > 0.01 && D.purity < 0.8) { const y = liqTop - 6; const hw = halfWidthAt(y); x.strokeStyle = `rgba(60,46,26,${(0.8 - D.purity) * 0.8})`; x.lineWidth = 3; x.beginPath(); x.moveTo(CX - hw, y); x.lineTo(CX + hw, y); x.stroke(); }
    flaskPath(x); x.strokeStyle = 'rgba(210,235,240,0.55)'; x.lineWidth = 2.5; x.stroke();
    flaskPath(x); x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 7; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(CX - 15, NECK_Y + 8); x.lineTo(CX - 15, SHOULDER_Y - 4); x.lineTo(CX - 88, BASE_Y - 34); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 10; x.beginPath(); x.moveTo(CX + 60, SHOULDER_Y + 40); x.lineTo(CX + 92, BASE_Y - 40); x.stroke();
    x.fillStyle = 'rgba(230,240,240,0.5)'; x.beginPath(); x.ellipse(CX, NECK_Y, 27, 5, 0, 0, 6.28); x.fill();
    x.fillStyle = 'rgba(10,12,14,0.9)'; x.beginPath(); x.ellipse(CX, NECK_Y, 21, 3.2, 0, 0, 6.28); x.fill();
    // graduations
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.font = '10px "Share Tech Mono", monospace';
    for (let i = 1; i <= 4; i++) { const y = BASE_Y - i * 32; const hw = halfWidthAt(y); x.fillRect(CX + hw - 22, y, 14, 1); x.fillText(i * 100, CX + hw - 46, y + 4); }

    // ---- pour streams
    if (c && pour > 0 && pour < 1 && this.a && this.b) {
      for (const [jx, kk, s] of [[92, this.a, share.a], [W - 92, this.b, share.b]]) {
        const mouthX = jx + (jx < CX ? 40 : -40), mouthY = 215;
        x.strokeStyle = rgba(ING[kk].col, 0.9); x.lineWidth = 2 + s * 9; x.lineCap = 'round';
        x.beginPath(); x.moveTo(mouthX, mouthY); x.quadraticCurveTo((mouthX + CX) / 2, 70, CX, NECK_Y + 10); x.stroke();
      }
    }

    // ---- vapour from the neck
    const vrate = (D.inst * 16 + heat * 10 + (failNow ? 40 : 0)) * (D.fill > 0.05 ? 1 : 0.1);
    this.vapAcc = (this.vapAcc ?? 0) + vrate * dt;
    while (this.vapAcc > 1) { this.vapAcc--; this.vapour.push({ x: CX + (Math.random() - 0.5) * 20, y: NECK_Y - 2, r: 6 + Math.random() * 6, a: 0.3 + Math.random() * 0.2, vx: (Math.random() - 0.5) * 18, vy: -24 - Math.random() * 30 }); }
    const vcol = failNow ? '#1a1612' : mixHex('#b8bcc0', D.color, 0.25 + D.inst * 0.4);
    for (let i = this.vapour.length - 1; i >= 0; i--) {
      const v = this.vapour[i]; v.x += v.vx * dt + Math.sin(t + i) * 0.2; v.y += v.vy * dt; v.r += dt * 14; v.a -= dt * 0.18;
      if (v.a <= 0 || v.y < -40) { this.vapour.splice(i, 1); continue; }
      if (v.y > NECK_Y) continue; // bubble pops inside are drawn by the liquid
      const g = x.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r); g.addColorStop(0, rgba(vcol, v.a)); g.addColorStop(1, rgba(vcol, 0));
      x.fillStyle = g; x.beginPath(); x.arc(v.x, v.y, v.r, 0, 6.28); x.fill();
    }
    // ---- flare-up fire
    if (this.fire.length) {
      x.globalCompositeOperation = 'lighter';
      for (let i = this.fire.length - 1; i >= 0; i--) {
        const f = this.fire[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 60 * dt; f.l -= dt;
        if (f.l <= 0) { this.fire.splice(i, 1); continue; }
        const r = 8 + (1 - f.l) * 26, g = x.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, `rgba(255,200,90,${f.l * 0.7})`); g.addColorStop(0.5, `rgba(255,90,20,${f.l * 0.35})`); g.addColorStop(1, 'rgba(255,40,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(f.x, f.y, r, 0, 6.28); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
    }
    if (failNow && ct < 2.25) { x.fillStyle = `rgba(255,220,160,${(2.25 - ct) * 2})`; x.fillRect(0, 0, W, H); }

    // ---- hint text
    if (!this.a || !this.b) {
      x.fillStyle = 'rgba(220,224,218,0.7)'; x.font = '600 18px "Barlow Condensed", sans-serif'; x.textAlign = 'center';
      x.fillText(!this.a && !this.b ? 'LOAD TWO INGREDIENTS FROM THE SHELF' : 'LOAD ONE MORE INGREDIENT', CX, 40); x.textAlign = 'left';
    } else if (!c && !this.result) {
      x.fillStyle = 'rgba(220,224,218,0.55)'; x.font = '600 15px "Barlow Condensed", sans-serif'; x.textAlign = 'center';
      x.fillText('DRAG THE RATIO · WATCH THE MIX CLEAR', CX, 36); x.textAlign = 'left';
    }
  }

  drawBurner(x, heat, t) {
    const by = 326;
    x.fillStyle = '#2a2d31'; x.fillRect(CX - 60, by, 120, 26); x.fillStyle = '#3d4248'; x.fillRect(CX - 60, by, 120, 3);
    x.fillStyle = '#121416'; x.fillRect(CX - 44, by + 8, 88, 10);
    x.fillStyle = '#b02a20'; x.fillRect(CX + 34, by + 9, 8, 8);
    // flame
    const n = 9, fh = 6 + heat * 20;
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const fx = CX - 40 + i * 10, h = fh * (0.7 + 0.3 * Math.sin(t * 20 + i * 1.7));
      const g = x.createLinearGradient(0, by, 0, by - h);
      g.addColorStop(0, `rgba(60,120,255,${0.6 + heat * 0.3})`); g.addColorStop(0.6, `rgba(120,170,255,${0.3 + heat * 0.2})`); g.addColorStop(1, 'rgba(255,200,120,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(fx - 4, by); x.quadraticCurveTo(fx, by - h * 1.2, fx + 4, by); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#4a4f55'; x.fillRect(CX - 70, BASE_Y + 1, 140, 4); // grate under the flask
  }

  drawJar(x, cx, key, share, tilt, t, pouring) {
    const by = 320, w = 64, h = 88;
    x.save(); x.translate(cx, by); x.rotate(tilt); x.translate(-cx, -by);
    // glass jar
    const left = cx - w / 2, top = by - h;
    x.fillStyle = 'rgba(160,200,210,0.07)'; x.fillRect(left, top, w, h);
    if (key) {
      const d = ING[key], lvl = (0.15 + share * 0.8) * (pouring ? 0.6 : 1), ch = (h - 10) * lvl, cy = by - 4 - ch, col = d.col;
      x.save(); x.beginPath(); x.rect(left + 3, top + 6, w - 6, h - 9); x.clip();
      this.drawSubstance(x, d.form, col, left + 3, cy, w - 6, ch, t);
      x.restore();
      x.fillStyle = 'rgba(220,224,218,0.85)'; x.font = '600 13px "Barlow Condensed", sans-serif'; x.textAlign = 'center';
      x.fillText(d.name.toUpperCase(), cx, by + 18);
      x.fillStyle = col; x.font = '12px "Share Tech Mono", monospace'; x.fillText(Math.round(share * 100) + '%', cx, by + 33); x.textAlign = 'left';
    }
    x.strokeStyle = 'rgba(210,235,240,0.5)'; x.lineWidth = 2; x.strokeRect(left, top, w, h);
    x.fillStyle = '#3a3f45'; x.fillRect(left - 3, top - 7, w + 6, 8);
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(left + 6, top + 8, 3, h - 18);
    x.restore();
  }

  drawSubstance(x, form, col, l, top, w, h, t) {
    const r = rng(form.length * 13), b = top + h;
    if (form === 'solvent') {
      const g = x.createLinearGradient(0, top, 0, b); g.addColorStop(0, rgba(col, 0.55)); g.addColorStop(1, rgba(col, 0.85));
      x.fillStyle = g; x.fillRect(l, top + Math.sin(t * 2) * 1, w, h);
      x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillRect(l, top, w, 1.5);
    } else if (form === 'powder') {
      x.fillStyle = col; x.beginPath(); x.moveTo(l, b); x.quadraticCurveTo(l + w / 2, top - h * 0.3, l + w, b); x.closePath(); x.fill();
      x.fillRect(l, top + h * 0.45, w, h * 0.56);
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.25})`; x.fillRect(l + r() * w, top + h * 0.2 + r() * h * 0.8, 1.5, 1.5); }
    } else if (form === 'crystal') {
      for (let i = 0; i < 18; i++) {
        const cx = l + r() * w, cy = top + h * 0.2 + r() * h * 0.85, s = 5 + r() * 8;
        x.fillStyle = rgba(col, 0.75 + r() * 0.25); x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.5, cy); x.lineTo(cx, cy + s * 0.4); x.lineTo(cx - s * 0.5, cy); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 0.8; x.stroke();
      }
    } else if (form === 'gel') {
      x.fillStyle = rgba(col, 0.9); x.beginPath(); x.moveTo(l, b);
      for (let i = 0; i <= 10; i++) x.lineTo(l + (w * i) / 10, top + Math.sin(i * 1.3 + t * 1.5) * 3);
      x.lineTo(l + w, b); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(l + w * 0.35, top + 8, 8, 3, -0.2, 0, 6.28); x.fill();
    } else if (form === 'resin') {
      x.fillStyle = rgba(col, 0.95); x.fillRect(l, top + h * 0.4, w, h * 0.6);
      for (let i = 0; i < 7; i++) { const cx = l + 6 + r() * (w - 12), cy = top + r() * h * 0.5, s = 4 + r() * 4; x.beginPath(); x.moveTo(cx, cy - s * 1.6); x.quadraticCurveTo(cx + s, cy, cx, cy + s); x.quadraticCurveTo(cx - s, cy, cx, cy - s * 1.6); x.fill(); }
      x.fillStyle = 'rgba(255,230,180,0.3)'; x.fillRect(l + 4, top + h * 0.42, 2, h * 0.5);
    } else if (form === 'spores') {
      x.fillStyle = rgba(col, 0.25); x.fillRect(l, top, w, h);
      for (let i = 0; i < 160; i++) { x.fillStyle = rgba(col, 0.5 + r() * 0.5); const yy = top + ((r() * h + t * 6 * r()) % h); x.fillRect(l + r() * w, yy, 1.6, 1.6); }
    } else if (form === 'flakes') {
      for (let i = 0; i < 40; i++) {
        const cx = l + r() * w, cy = top + r() * h, a = r() * 3 + t * 0.2;
        const sh = 0.5 + 0.5 * Math.sin(t * 3 + i);
        x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = `rgb(${150 + sh * 100},${155 + sh * 95},${165 + sh * 90})`; x.fillRect(-4, -1.5, 8, 3); x.restore();
      }
    } else if (form === 'particulate') {
      x.fillStyle = rgba(col, 0.12); x.fillRect(l, top, w, h);
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) { const a = Math.max(0, Math.sin(t * 4 + i)); x.fillStyle = rgba(col, 0.4 + a * 0.6); const s = 1 + a * 2; x.fillRect(l + r() * w, top + r() * h, s, s); }
      x.globalCompositeOperation = 'source-over';
    }
  }
}
