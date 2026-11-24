/* HELLBOUND · js/core.js · Canvas, scaling to the window, small helpers ($, rnd, dist, hash...)
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   0. CORE SETUP AND PIXEL PIPELINE
   The game is drawn on a small internal canvas (LW x LH = 640 x 360).
   fitCanvas() scales it to the window: a whole number when that fills the
   window well, so pixels stay perfectly even. Smoothing is always off.
   The HTML UI (#ui) sits exactly over the canvas and uses --u = 1 game pixel.
   ===================================================================== */
const LW=640, LH=360;
const cv=document.getElementById('c'), ctx=cv.getContext('2d');
cv.width=LW; cv.height=LH;
let SCALE=2;
function fitCanvas(){
  const fit=Math.min(innerWidth/LW,innerHeight/LH);
  const whole=Math.floor(fit);
  // Whole-number scale unless that would waste a lot of the window
  SCALE=whole>=1&&whole/fit>=0.8?whole:Math.max(0.5,fit);
  const w=LW*SCALE,h=LH*SCALE,l=Math.round((innerWidth-w)/2),t=Math.round((innerHeight-h)/2);
  cv.style.width=w+'px';cv.style.height=h+'px';cv.style.left=l+'px';cv.style.top=t+'px';
  const ui=document.getElementById('ui');
  ui.style.left=l+'px';ui.style.top=t+'px';ui.style.width=w+'px';ui.style.height=h+'px';
  document.documentElement.style.setProperty('--u',SCALE+'px');
  ctx.imageSmoothingEnabled=false;   // nearest-neighbour: no blur on sprites
}
addEventListener('resize',fitCanvas);fitCanvas();

const $=id=>document.getElementById(id);
const TAU=Math.PI*2, T=32, MW=72, MH=72, VIS=230;   // T = size of one tile in logical pixels
const SPR=2;                                       // scale for the 16px code-drawn fallback art
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
let uid=1,time=0,ready=false;
let scene='title', paused=false;
const PXFONT='Silkscreen, Consolas, monospace';
