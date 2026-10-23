// HUD helpers and the icon set. Icons are inline SVG so they stay sharp at any size
// and can be tinted per substance. Replace with painted icons later (same 32x32 frame).

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};
let gid = 0;

export function icon(kind, col = '#cccccc', size = 32) {
  const id = 'g' + (gid++), dk = shade(col, 0.55), lt = shade(col, 1.35);
  const wrap = body => `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${lt}"/><stop offset="1" stop-color="${dk}"/></radialGradient></defs>${body}</svg>`;
  switch (kind) {
    case 'scrap': return wrap(`<g fill="#8a8f94" stroke="#2a2d30" stroke-width="1"><path d="M16 5l2.2 2.6 3.3-.9.7 3.4 3.3 1.1-1.2 3.2 2.2 2.6-2.9 1.9.4 3.4-3.4.3-1.3 3.2-3.1-1.5-3.1 1.5-1.3-3.2-3.4-.3.4-3.4-2.9-1.9 2.2-2.6-1.2-3.2 3.3-1.1.7-3.4 3.3.9z"/><circle cx="16" cy="16" r="4" fill="#1b1d1f"/></g><path d="M22 22l6 6" stroke="#b06a3a" stroke-width="3" stroke-linecap="round"/>`);
    case 'powder': return wrap(`<path d="M3 27 Q16 6 29 27 Z" fill="url(#${id})"/><path d="M3 27h26" stroke="${dk}" stroke-width="1.5"/><g fill="${dk}" opacity=".6"><circle cx="12" cy="21" r=".9"/><circle cx="18" cy="18" r=".8"/><circle cx="21" cy="23" r=".9"/><circle cx="15" cy="24" r=".7"/></g>`);
    case 'crystal': return wrap(`<g stroke="#fff" stroke-opacity=".6" stroke-width=".8"><path d="M10 28 6 16l5-9 5 9z" fill="url(#${id})"/><path d="M18 28l-3-13 6-9 5 11z" fill="${col}"/><path d="M24 28l-2-7 3-4 3 5z" fill="url(#${id})"/></g>`);
    case 'gel': return wrap(`<path d="M5 25c0-7 4-14 11-14s11 6 11 13c0 3-3 4-11 4S5 28 5 25z" fill="url(#${id})"/><ellipse cx="12" cy="16" rx="3.5" ry="1.6" fill="#fff" opacity=".45" transform="rotate(-20 12 16)"/>`);
    case 'resin': return wrap(`<path d="M11 4c4 7 7 10 7 15a7 7 0 0 1-14 0c0-5 3-8 7-15z" fill="url(#${id})"/><path d="M23 12c2.5 4 4 6 4 9a4 4 0 0 1-8 0c0-3 1.5-5 4-9z" fill="${col}"/><path d="M8 18c0-2 1-4 2-5" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none"/>`);
    case 'spores': return wrap(`<g fill="${col}">${Array.from({ length: 26 }, (_, i) => { const a = i * 2.4, r = 3 + (i % 7) * 1.6; return `<circle cx="${(16 + Math.cos(a) * r).toFixed(1)}" cy="${(17 + Math.sin(a) * r * 0.8).toFixed(1)}" r="${(0.8 + (i % 3) * 0.5).toFixed(1)}" opacity="${(0.5 + (i % 4) * 0.15).toFixed(2)}"/>`; }).join('')}</g><circle cx="16" cy="17" r="5" fill="${col}" opacity=".25"/>`);
    case 'solvent': return wrap(`<path d="M12 3h8v5l4 5v15a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V13l4-5z" fill="#d4dade" fill-opacity=".18" stroke="#c9d2d6" stroke-width="1.2"/><path d="M8.6 17h14.8v11H8.6z" fill="url(#${id})"/><rect x="11.5" y="2" width="9" height="3" fill="#b02a20"/><rect x="10" y="20" width="12" height="5" fill="#e8e2c8" opacity=".75"/>`);
    case 'flakes': return wrap(`<g stroke="#2a2d30" stroke-width=".6">${[[9, 10, 20], [19, 8, -30], [14, 17, 60], [23, 18, 10], [8, 23, -40], [18, 25, 30], [25, 26, -10]].map(([x, y, r], i) => `<rect x="${x - 4}" y="${y - 1.6}" width="8" height="3.2" fill="${i % 2 ? lt : col}" transform="rotate(${r} ${x} ${y})"/>`).join('')}</g>`);
    case 'particulate': return wrap(`<defs><radialGradient id="${id}p"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>${[[16, 16, 7], [8, 9, 3.5], [24, 10, 4], [9, 24, 4], [24, 24, 3], [16, 5, 2.5], [4, 16, 2.5], [28, 17, 2.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id}p)"/>`).join('')}`);
    case 'vial': return wrap(`<rect x="12" y="3" width="8" height="4" rx="1" fill="#2a2d30"/><path d="M12.5 7h7v18a3.5 3.5 0 0 1-7 0z" fill="#d4dade" fill-opacity=".15" stroke="#c9d2d6" stroke-width="1"/><path d="M13 13h6v12a3 3 0 0 1-6 0z" fill="url(#${id})"/><rect x="14" y="14" width="1.4" height="9" fill="#fff" opacity=".5"/>`);
    case 'bag': return wrap(`<path d="M7 9h18l-1 18H8z" fill="#e6ecef" fill-opacity=".22" stroke="#cfd6da" stroke-width="1"/><path d="M7 6h18v3H7z" fill="#b02a20"/><g fill="url(#${id})" stroke="#fff" stroke-opacity=".5" stroke-width=".5"><path d="M11 25l2-8 3 5z"/><path d="M15 26l3-10 3 7z"/><path d="M19 26l1-5 3 3z"/><path d="M10 20l3-4 2 4z"/></g>`);
    case 'jar': return wrap(`<rect x="8" y="5" width="16" height="4" rx="1" fill="#3a3f45"/><rect x="7" y="9" width="18" height="19" rx="3" fill="#d4dade" fill-opacity=".14" stroke="#c9d2d6" stroke-width="1"/><rect x="8" y="14" width="16" height="13" rx="2" fill="url(#${id})"/><ellipse cx="13" cy="17" rx="3" ry="1.2" fill="#fff" opacity=".4"/>`);
    case 'fists': return wrap(`<path d="M9 13h12a3 3 0 0 1 3 3v6a6 6 0 0 1-6 6h-5a5 5 0 0 1-5-5v-6a4 4 0 0 1 1-4z" fill="#9a7056" stroke="#3a2a20"/><path d="M9 13v-2a2 2 0 0 1 4 0v2M13 13v-3a2 2 0 0 1 4 0v3M17 13v-2a2 2 0 0 1 4 0v2" fill="#9a7056" stroke="#3a2a20"/><path d="M9 21h8" stroke="#3a2a20"/>`);
    case 'pipe': return wrap(`<path d="M5 27 L20 12 Q23 9 26 9" stroke="#3a2010" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M5 27 L20 12 Q23 9 26 9" stroke="#8a5a32" stroke-width="3.5" fill="none" stroke-linecap="round"/><rect x="24" y="6" width="5" height="6" rx="1" fill="#55595e"/><path d="M5 27l4-4" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>`);
    case 'jacket': return wrap(`<path d="M11 4l5 3 5-3 6 3 2 9-4 1v12H7V17l-4-1 2-9z" fill="#4a5038" stroke="#1a1c14"/><path d="M16 7v22" stroke="#1a1c14"/><path d="M7 7l3 4M25 7l-3 4" stroke="#2a2e20" stroke-width="2"/><path d="M10 9l12 10" stroke="#2a2018" stroke-width="1.6"/>`);
    case 'rags': return wrap(`<path d="M11 6q5-3 10 0l6 4 1 7-4 1v11H8V18l-4-1 1-7z" fill="#5a5d5c" stroke="#222"/><path d="M12 6q4 6 8 0" fill="#444" stroke="#222"/><path d="M13 22l2 3M18 24l2-2" stroke="#2a2a2a"/>`);
    case 'glass': return wrap(`<path d="M13 4h6v8l7 13a2 2 0 0 1-2 3H8a2 2 0 0 1-2-3l7-13z" fill="#d4dade" fill-opacity=".15" stroke="#c9d2d6" stroke-width="1.2"/><path d="M9.5 20h13l2.5 5a1.4 1.4 0 0 1-1.3 2H8.3A1.4 1.4 0 0 1 7 25z" fill="#3ee6ff" opacity=".8"/>`);
    case 'bucket': return wrap(`<path d="M7 10h18l-2 18H9z" fill="#3a3f45" stroke="#1b1d1f"/><ellipse cx="16" cy="10" rx="9" ry="2.5" fill="#86b83a" opacity=".8"/><path d="M7 10q9-10 18 0" stroke="#888" fill="none"/>`);
    case 'none': return wrap(`<path d="M8 8l16 16M24 8L8 24" stroke="#3a3f45" stroke-width="2"/>`);
    case 'cash': return wrap(`<rect x="3" y="9" width="26" height="14" rx="1.5" fill="#4a6a30" stroke="#1f2e14"/><circle cx="16" cy="16" r="4" fill="#6a8a40" stroke="#1f2e14"/><text x="16" y="19" font-size="7" text-anchor="middle" fill="#1f2e14" font-family="monospace">$</text>`);
    case 'tag': return wrap(`<rect x="11" y="3" width="10" height="5" rx="1" fill="#222"/><rect x="9" y="8" width="14" height="21" rx="3" fill="${col}"/><rect x="11" y="13" width="10" height="9" fill="#111" opacity=".6"/>`);
    default: return wrap(`<circle cx="16" cy="16" r="10" fill="url(#${id})"/>`);
  }
}

export class UI {
  constructor() {
    this.$ = id => document.getElementById(id);
    this.toastEl = this.$('toasts'); this.world = this.$('worldLayer'); this.tipEl = this.$('tip');
    this.bars = new Map(); this.floats = [];
  }
  toast(html, iconSvg = '', acc = 'var(--amber)') {
    const d = document.createElement('div'); d.className = 'toast'; d.style.setProperty('--acc', acc);
    d.innerHTML = iconSvg + `<span>${html}</span>`;
    this.toastEl.prepend(d);
    while (this.toastEl.children.length > 6) this.toastEl.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 2800); setTimeout(() => d.remove(), 3500);
  }
  banner(title, sub, acc = 'var(--amber)', ms = 2600) {
    const b = this.$('banner'); b.querySelector('h1').textContent = title; b.querySelector('p').textContent = sub; b.style.setProperty('--acc', acc);
    b.classList.add('on'); clearTimeout(this.bannerT); this.bannerT = setTimeout(() => b.classList.remove('on'), ms);
  }
  tip(html, e) {
    if (!html) { this.tipEl.style.display = 'none'; return; }
    this.tipEl.innerHTML = html; this.tipEl.style.display = 'block';
    const r = e.currentTarget.getBoundingClientRect();
    this.tipEl.style.left = Math.min(innerWidth - 270, r.right + 8) + 'px'; this.tipEl.style.top = r.top + 'px';
  }
  // floating numbers / labels anchored to a world position
  float(text, cls, worldPos, project, life = 0.9) {
    const d = document.createElement('div'); d.className = 'dmg ' + cls; d.textContent = text; this.world.appendChild(d);
    this.floats.push({ d, p: worldPos.clone(), life, max: life, dx: (Math.random() - 0.5) * 30 });
  }
  updateFloats(dt, project) {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]; f.life -= dt; const k = 1 - f.life / f.max;
      const s = project(f.p);
      f.d.style.left = s.x + f.dx * k + 'px'; f.d.style.top = s.y - 30 - k * 46 + 'px';
      f.d.style.opacity = f.life < 0.3 ? f.life / 0.3 : 1;
      f.d.style.transform = `translate(-50%,-50%) scale(${k < 0.12 ? 1.5 - k * 4 : 1})`;
      if (f.life <= 0) { f.d.remove(); this.floats.splice(i, 1); }
    }
  }
  bar(id, name, frac, sx, sy, show, boss) {
    let b = this.bars.get(id);
    if (!b) { b = document.createElement('div'); b.className = 'ebar' + (boss ? ' boss' : ''); b.innerHTML = `<span>${name}</span><i></i>`; this.world.appendChild(b); this.bars.set(id, b); }
    b.style.display = show ? 'block' : 'none';
    if (show) { b.style.left = sx + 'px'; b.style.top = sy + 'px'; b.lastChild.style.width = Math.max(0, frac) * 100 + '%'; }
  }
}
