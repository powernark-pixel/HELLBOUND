// Bot playtest for HELLBOUND: plays The Blood Altar with a simple bot and reports numbers.
// Why: to measure the run (time per area, damage, the blood vat, how long the Oculus and the
// Warden take) instead of guessing. It changes nothing in the game; it only drives the knight.
//
// How it plays: the real game loop is paused and the bot steps update() itself at 60 steps a
// second of game time, so a 10 minute run takes seconds. Each step it presses keys the way a
// player would: walk along the path to the next area (then the stairs), fight the nearest enemy
// it can reach, aim with the mouse, hold attack in range, roll out of red warnings and blue
// rings, drink a flask under 35% health, use Fire Line (Q) and Cleave (E) when they make sense.
//
// Run:  GAME_URL=http://127.0.0.1:8000/HELLBOUND/ node tests/playtest.mjs
// Optional: RUNS=3 (runs shown in detail), EXTRA=20 (more runs for steadier averages), RUN_CAP_MIN=15 (simulated minutes per run),
//           REACT=0.3 (the bot's reaction time in seconds), REPORT=path/to/playtest-report.md (where the report is written).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const URL = process.env.GAME_URL || 'http://127.0.0.1:8000/HELLBOUND/';
const RUNS = +(process.env.RUNS || 3);
const EXTRA = +(process.env.EXTRA ?? 20);   // extra quick runs, only for the "bigger sample" numbers and bug counts
const RUN_CAP_MIN = +(process.env.RUN_CAP_MIN || 15);   // a run stops after this many simulated minutes
const REACT = +(process.env.REACT ?? 0.3);   // seconds a warning is on screen before the bot reacts (a person: about 0.3)
const REPORT = process.env.REPORT || '/mnt/project-files/hellbound/playtest-report.md';

// Playwright: the repo's own copy if there is one, otherwise the globally installed one
async function loadChromium() {
  for (const m of ['playwright-core', 'playwright']) { try { return (await import(m)).chromium; } catch {} }
  const g = execSync('npm root -g').toString().trim();
  return (await import(path.join(g, 'playwright', 'index.mjs'))).chromium;
}
const chromium = await loadChromium();
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));

await page.goto(URL);
await page.waitForFunction(() => typeof ready !== 'undefined' && ready === true, null, { timeout: 20000 });
// stop the browser's own loop: from here on only the bot moves time forward
await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
await page.waitForTimeout(200);

await page.evaluate(r => { window.__botReact = r; }, REACT);
/* ---------- the bot (runs inside the page, sees the game's globals) ---------- */
await page.addScriptTag({ content: String.raw`
(function(){
const DT=1/60;
const B=window.__bot={};
// ---- measuring: wrap the game's own hurt / kill / flask functions (nothing about them changes)
const _hurt=hurt,_kill=killEnemy,_flask=drinkFlask;
hurt=function(d,noIF){const before=P.hp+P.sh;_hurt(d,noIF);const lost=before-(P.hp+P.sh);
  if(lost>0&&B.att){B.cur().dmg+=lost;B.att.lastHit={src:noIF?'blood river':B.nearestType(),t:B.simT}}};
killEnemy=function(e){const was=e.dead;_kill(e);if(!was&&e.dead&&B.att){B.cur().kills++;
  if(e.miniboss&&B.att.ocWake!=null&&B.att.ocDead==null)B.att.ocDead=B.simT;
  if(e.boss&&B.att.wardenDead==null){B.att.wardenDead=B.simT;B.att.vatAtWarden=vatPct()}}};
drinkFlask=function(){const f=P.flasks;_flask();if(P.flasks<f&&B.att)B.cur().flasks++};
const vatPct=()=>vatNeed?Math.min(100,Math.round(vat/vatNeed*100)):100;
B.nearestType=()=>{let best=null,bd=1e9;for(const e of enemies){if(e.dead)continue;const d=dist(e,P);if(d<bd){bd=d;best=e}}
  return !best?'?':best.boss?'Warden':best.miniboss?'Oculus':(best.elite?'elite ':'')+best.type};

// ---- path finding over the tile map (BFS from the knight; the blood river only if there's no other way)
const pass=(x,y,lava)=>{if(x<0||y<0||x>=MW||y>=MH)return false;const m=map[y][x];
  if(!m||level.solid[y*MW+x])return false;return lava||m!==2};
function bfs(lava){
  const f=new Int32Array(MW*MH).fill(-1),q=[];const sx=Math.floor(P.x/T),sy=Math.floor(P.y/T);
  f[sy*MW+sx]=0;q.push(sx,sy);
  for(let i=0;i<q.length;i+=2){const x=q[i],y=q[i+1],s=f[y*MW+x];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;
      if(!pass(nx,ny,lava)||f[ny*MW+nx]>=0)continue;f[ny*MW+nx]=s+1;q.push(nx,ny)}}
  return f;
}
let fieldDry=null,fieldWet=null,fieldAt=-1;
function fields(){if(B.simT-fieldAt>0.15||!fieldDry){fieldDry=bfs(false);fieldWet=bfs(true);fieldAt=B.simT}}
function pathLen(tx,ty){fields();const k=ty*MW+tx;return fieldDry[k]>=0?fieldDry[k]:fieldWet[k]>=0?fieldWet[k]+50:-1}
// the next point to walk toward on the way to tile (tx,ty): walk the path back from the goal
function steerTo(tx,ty){
  fields();let f=fieldDry[ty*MW+tx]>=0?fieldDry:fieldWet;if(f[ty*MW+tx]<0)return null;
  const tiles=[[tx,ty]];let x=tx,y=ty;
  while(f[y*MW+x]>0){let nx=x,ny=y,b=f[y*MW+x];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(y+dy)*MW+x+dx;if(x+dx>=0&&y+dy>=0&&x+dx<MW&&y+dy<MH&&f[k]>=0&&f[k]<b){b=f[k];nx=x+dx;ny=y+dy}}
    if(nx===x&&ny===y)break;x=nx;y=ny;tiles.push([x,y])}
  tiles.reverse();   // from the knight to the goal
  // look as far ahead along the path as is in a clear straight line
  let pt=tiles[Math.min(1,tiles.length-1)];
  for(let i=Math.min(6,tiles.length-1);i>=1;i--){const c=tiles[i];if(clearLine(P.x,P.y,c[0]*T+T/2,c[1]*T+T/2,f===fieldWet)){pt=c;break}}
  return {x:pt[0]*T+T/2,y:pt[1]*T+T/2};
}
function clearLine(x0,y0,x1,y1,lava){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/8);
  for(let i=1;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;
    for(const [ox,oy] of [[-11,-11],[11,-11],[-11,11],[11,11]]){const t=tileAt(x+ox,y+oy);if(!t||(!lava&&t===2))return false}}
  return true}

// ---- turning a world direction into WASD (isometric: the 8 key directions are not evenly spread)
const KEYDIRS=[];for(const mx of [-1,0,1])for(const my of [-1,0,1]){if(!mx&&!my)continue;const wx=mx+2*my,wy=2*my-mx,l=Math.hypot(wx,wy);KEYDIRS.push({mx,my,a:Math.atan2(wy/l,wx/l)})}
function press(wx,wy){
  keys.w=keys.a=keys.s=keys.d=false;if(!wx&&!wy)return;
  const a=Math.atan2(wy,wx);let best=null,second=null;
  const sorted=KEYDIRS.map(k=>({k,da:Math.abs(Math.atan2(Math.sin(a-k.a),Math.cos(a-k.a)))})).sort((p,q)=>p.da-q.da);
  best=sorted[0];second=sorted[1];
  // flick between the two nearest key directions so the average heading is right
  const useSecond=Math.random()<best.da/(best.da+second.da);const k=(useSecond?second:best).k;
  if(k.mx>0)keys.d=true;if(k.mx<0)keys.a=true;if(k.my>0)keys.s=true;if(k.my<0)keys.w=true;
}
// aim the mouse at a world point (the inverse of the aim line in update.js)
function aimAt(x,y){const wx=x-P.x,wy=y-P.y,l=Math.hypot(wx,wy)||1;const dsx=(wx-wy)/2/l*60,dsy=(wx+wy)/4/l*60;
  mouse.x=LW/2+dsx;mouse.y=LH/2+2+dsy}

// ---- danger: red warnings, blue rings and shots in flight. Returns where to go and how soon.
// Like a person, the bot only reacts once a warning has been on screen for REACT seconds.
const REACT=+(window.__botReact??0.3);
const warnT=new WeakMap();
function noticed(o,on){let w=warnT.get(o);if(!w){w={on:false,t:0};warnT.set(o,w)}
  if(on&&!w.on)w.t=B.simT;w.on=on;return on&&B.simT-w.t>=REACT}
function trackWarnings(){
  for(const e of enemies){noticed(e,e.act==='wind'||e.act==='lunge');if(e.ocs)noticed(e.ocs,e.ocs.mode==='aim'||e.ocs.mode==='strike')}
  for(const b of ebullets)noticed(b,true);
}
function danger(){
  let ex=0,ey=0,soon=9;
  const away=(x,y,w,t)=>{const dx=P.x-x,dy=P.y-y,l=Math.hypot(dx,dy)||1;ex+=dx/l*w;ey+=dy/l*w;soon=Math.min(soon,t)};
  const lane=(ox,oy,lx,ly,len,half,t)=>{const rx=P.x-ox,ry=P.y-oy,along=rx*lx+ry*ly,side=rx*ly*-1+ry*lx;
    if(along>-10&&along<len&&Math.abs(side)<half){const s=side>=0?1:-1;ex+=-ly*s;ey+=lx*s;soon=Math.min(soon,t);return true}return false};
  for(const e of enemies){
    if(e.dead||e.dormant)continue;const d=dist(e,P);
    if(e.type==='eye'&&e.ocs&&(e.ocs.mode==='aim'||e.ocs.mode==='strike')&&noticed(e.ocs,true)){
      for(const tg of e.ocs.targets)if(Math.hypot(P.x-tg.x,P.y-tg.y)<ocStrikeR(e)+PLAYER_BODY+8)away(tg.x,tg.y,1,e.ocs.t+(e.ocs.mode==='aim'?0.1:0))}
    if((e.act!=='wind'&&e.act!=='lunge')||!noticed(e,true))continue;
    if(e.boss){
      if(e.atk==='slam'&&d<WARDEN_SLAM_R+12)away(e.x,e.y,1,e.actT);
      if(e.atk==='burst'&&e.lanes)for(const a of e.lanes)if(lane(e.x,e.y,Math.cos(a),Math.sin(a),600,6+PLAYER_BODY+6,e.actT+0.3))break;
    }else if(e.type==='demon'){if(d<SLAM_R+PLAYER_BODY+8)away(e.x,e.y,1,e.actT)}
    else if(e.type==='hound'){lane(e.x,e.y,e.lx,e.ly,200,e.r*0.8+PLAYER_BODY+6,e.act==='lunge'?0:e.actT)}
    else if(e.type==='archer'){lane(e.x,e.y,e.lx,e.ly,700,4+PLAYER_BODY+5,e.actT+0.15)}
  }
  for(const b of ebullets){   // a shot heading for the knight: step aside
    if(!noticed(b,true))continue;
    const sp=Math.hypot(b.vx,b.vy)||1,lx=b.vx/sp,ly=b.vy/sp,rx=P.x-b.x,ry=P.y-b.y,along=rx*lx+ry*ly;
    if(along>0&&along<sp*0.6)lane(b.x,b.y,lx,ly,sp*0.6,b.r+PLAYER_BODY+4,along/sp);
  }
  if(!ex&&!ey)return null;
  // pick a free direction close to the escape direction (never into a wall or the river)
  const a0=Math.atan2(ey,ex);
  for(const off of [0,0.5,-0.5,1,-1,1.5,-1.5,2.2,-2.2,Math.PI]){const a=a0+off;
    if([24,48,80,130].every(r=>{const x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;return tileAt(x,y)!==2&&(r>48||tileAt(x,y)===1&&freeAt(x,y,10))}))return {x:Math.cos(a),y:Math.sin(a),soon}}
  return {x:Math.cos(a0),y:Math.sin(a0),soon};
}

// ---- one attempt: a fresh New Game, played until death, the Shack, or the time cap
B.cur=()=>{const n=B.att.phase;return B.att.areas[n]||(B.att.areas[n]={t:0,dmg:0,kills:0,flasks:0})};
B.start=function(){
  newGame();for(const k in keys)keys[k]=false;mouse.down=false;
  B.att={start:B.simT,phase:1,areas:{},reach:{1:{t:B.simT,vat:0}},ocWake:null,ocDead:null,wardenWake:null,wardenDead:null,
    vatAtAltar:null,vatAtWarden:null,stairsOpenAt:null,result:null,where:null,stuck:0,lastHit:null,events:[]};
  B.progT=0;B.progX=P.x;B.progY=P.y;B.unstick=0;
};
B.simT=0;
function nextGoal(){
  if(boss&&!boss.dead){const a=level.areas.filter(a=>!a.done).sort((p,q)=>p.n-q.n)[0];
    if(a)return {tx:a.tx,ty:a.ty,kind:'area '+a.n};return {tx:Math.floor(boss.x/T),ty:Math.floor(boss.y/T),kind:'warden'}}
  if(!vatFull()){   // the vat still isn't full after the Warden: go and hunt what's left
    let best=null,bl=1e9;for(const e of enemies){if(e.dead)continue;const l=pathLen(Math.floor(e.x/T),Math.floor(e.y/T));if(l>=0&&l<bl){bl=l;best=e}}
    for(const d of bloodDrops){const l=pathLen(Math.floor(d.x/T),Math.floor(d.y/T));if(l>=0&&l<bl){bl=l;best=d}}
    if(best)return {tx:Math.floor(best.x/T),ty:Math.floor(best.y/T),kind:'mop-up'};
    return null;
  }
  return {tx:stairsT.x,ty:stairsT.y,kind:'stairs'};
}
function pickTarget(){
  let best=null,bs=1e9;
  for(const e of enemies){
    if(e.dead||e.dormant)continue;const d=dist(e,P);if(d>(e.boss||e.miniboss?600:300))continue;
    const l=pathLen(Math.floor(e.x/T),Math.floor(e.y/T));if(l<0||l>12&&!e.boss&&!e.miniboss)continue;
    const s=d+(e.boss?-80:0);if(s<bs){bs=s;best=e}
  }
  return best;
}
// one frame of "player input"
function think(){
  trackWarnings();
  const tgt=pickTarget();let mvx=0,mvy=0;mouse.down=false;
  if(tgt){
    aimAt(tgt.x,tgt.y);const d=dist(tgt,P),reach=S.range+hurtR(tgt);
    if(d<reach-6)mouse.down=true;
    const want=tgt.boss&&tgt.act==='wind'?999:reach*0.55;   // close in (but not into a Warden attack)
    if(d>want){const p=clearLine(P.x,P.y,tgt.x,tgt.y,false)?tgt:steerTo(Math.floor(tgt.x/T),Math.floor(tgt.y/T));if(p){mvx=p.x-P.x;mvy=p.y-P.y}}
    if(P.fireCD<=0&&d>40&&d<190&&clearLine(P.x,P.y,tgt.x,tgt.y,true)&&(tgt.boss||tgt.miniboss||tgt.type==='archer'||tgt.type==='demon'||tgt.elite))castFireLine();
    const near=enemies.filter(e=>!e.dead&&!e.dormant&&dist(e,P)<S.range*1.4+hurtR(e)).length;
    if(P.spinCD<=0&&(near>=3||((tgt.boss||tgt.miniboss||tgt.type==='demon')&&d<S.range*1.4+hurtR(tgt))))castSpin();
  }else{
    // nothing to fight: scoop up nearby blood, else follow the path
    let drop=null,dd=150;for(const b of bloodDrops){const k=dist(b,P);if(k<dd&&clearLine(P.x,P.y,b.x,b.y,false)){dd=k;drop=b}}
    const g=nextGoal();
    if(drop){mvx=drop.x-P.x;mvy=drop.y-P.y}
    else if(g){const p=steerTo(g.tx,g.ty);if(p){mvx=p.x-P.x;mvy=p.y-P.y;aimAt(p.x,p.y)}}
  }
  const dg=danger();
  if(dg){mvx=dg.x;mvy=dg.y;
    if(dg.soon<0.3&&P.roll<=0){press(dg.x,dg.y);keys[' ']=true;return}}
  if(P.hp<P.maxHp*0.35&&P.flasks>0&&P.healT<=0)drinkFlask();
  // stuck (not moving while it wants to): roll a random way to come loose
  if(Math.hypot(mvx,mvy)>4&&!mouse.down&&freeAt(P.x,P.y,10)){   // (being shut in the gate is counted separately)
    if(Math.hypot(P.x-B.progX,P.y-B.progY)>24){B.progX=P.x;B.progY=P.y;B.progT=B.simT}
    else if(B.simT-B.progT>3){B.att.stuck++;B.progT=B.simT;B.unstick=0.4;B.uA=Math.random()*TAU}
  }else{B.progX=P.x;B.progY=P.y;B.progT=B.simT}
  if(B.unstick>0){B.unstick-=DT;mvx=Math.cos(B.uA);mvy=Math.sin(B.uA)}
  press(mvx,mvy);
}
// step the game n frames (the same as the browser loop, hit-stop included)
B.step=function(n,capT){
  for(let i=0;i<n;i++){
    const A=B.att;
    if(A.result)return;
    if(B.simT>=capT){A.result='time cap';A.where=A.phase;A.at={tx:Math.floor(P.x/T),ty:Math.floor(P.y/T)};
      const t=pickTarget();A.capInfo=t?{type:t.boss?'Warden':t.type,tx:Math.floor(t.x/T),ty:Math.floor(t.y/T),hp:Math.round(t.hp),d:Math.round(dist(t,P)),act:t.act||null}:{goal:nextGoal()};return}
    if(dead){A.result='died';A.where=A.phase;A.cause=A.lastHit?A.lastHit.src:'?';A.at={tx:Math.floor(P.x/T),ty:Math.floor(P.y/T)};return}
    if(level&&level.safe){A.result='reached the Shack';A.where=A.phase;return}
    // bookkeeping: which area are we in, when did the bosses wake
    let ph=A.phase;for(const a of level.areas)if(a.done&&a.n>ph&&ph<8)ph=a.n;
    if(boss&&!boss.dormant&&ph<7)ph=7;   // the Warden woke (you can wake him from the gate)
    if(boss&&boss.dead)ph=8;
    if(ph!==A.phase){A.phase=ph;A.reach[ph]={t:B.simT,vat:vatPct()};if(ph===7)A.vatAtAltar=vatPct()}
    if(A.ocWake==null&&enemies.some(e=>e.miniboss&&!e.dormant))A.ocWake=B.simT;
    if(A.wardenWake==null&&boss&&!boss.dormant){A.wardenWake=B.simT;
      // a real problem to report: the gate seals while the knight is still outside the arena
      fieldAt=-1;   // fresh paths: the gate has just changed the map
      if(pathLen(Math.floor(boss.x/T),Math.floor(boss.y/T))<0){
        const h=level.altarAt;A.result='locked out';A.where=A.phase;A.at={tx:Math.floor(P.x/T),ty:Math.floor(P.y/T)};
        A.bug={kind:'locked out',knight:A.at,warden:{tx:Math.floor(boss.x/T),ty:Math.floor(boss.y/T)},fromAltar:Math.round(Math.hypot(boss.x-h.x,boss.y-h.y)/T)};
        return}}
    if(A.stairsOpenAt==null&&!stairsLocked())A.stairsOpenAt=B.simT;
    if(A.vatFullIn==null&&vatFull())A.vatFullIn=A.phase;
    // a real problem to report: the gate closed on the knight's body and he can't move until something shoves him free
    if(level.sealed&&!freeAt(P.x,P.y,10)){
      if(A.frozenAt==null){A.frozenAt=B.simT;A.frozenPos={tx:Math.floor(P.x/T),ty:Math.floor(P.y/T),px:Math.round(P.x)}}
      if(B.simT-A.frozenAt>60){A.result='stuck in the gate';A.where=A.phase;A.at=A.frozenPos;A.bug={kind:'frozen',secs:60,knight:A.frozenPos,forever:true};return}
    }else if(A.frozenAt!=null&&!A.bug){
      if(B.simT-A.frozenAt>=0.5)A.bug={kind:'frozen',secs:B.simT-A.frozenAt,knight:A.frozenPos,tillGateOpened:!!(boss&&boss.dead)};
      A.frozenAt=null}
    if(A.wardenDead!=null&&!vatFull()&&enemies.length===0&&bloodDrops.length===0&&!A.noBlood){A.noBlood=true;A.events.push('The Warden is dead, no enemies or blood are left, and the vat is still '+vatPct()+'%: the stairs can never open.')}
    if(A.noBlood){A.result='vat can never fill';A.where=8;return}
    if(hitStop>0){hitStop-=DT}else{think();update(DT)}
    B.simT+=DT;B.cur().t+=DT;
  }
};
B.summary=()=>{const A=B.att;return {...A,lastHit:undefined,vatNow:vatPct(),wardenHp:boss&&!boss.dead?Math.round(boss.hp/boss.max*100):0,end:B.simT,areaNames:level&&level.areaNames}};
})();
` });

/* ---------- drive it from Node: RUNS runs, each restarting after a death, capped in time ---------- */
const areaName = { 1: 'The Narthex', 2: 'The Bone Corridor', 3: 'The Blood Nave', 4: 'The Ossuary Gallery', 5: 'The Chapel of Chains', 6: "The Penitent's Gauntlet", 7: 'The Blood Altar (Warden fight)', 8: 'After the Warden (to the stairs)' };
await page.evaluate(() => { scene = 'game'; document.getElementById('title').classList.remove('open'); });
const runs = [];
for (let r = 0; r < RUNS + EXTRA; r++) {
  const t0 = await page.evaluate(() => __bot.simT);
  const cap = t0 + RUN_CAP_MIN * 60;
  const attempts = [];
  while (true) {
    await page.evaluate(() => __bot.start());
    for (;;) {
      const done = await page.evaluate(([cap]) => { __bot.step(1800, cap); return !!__bot.att.result; }, [cap]);
      if (done) break;
    }
    const a = await page.evaluate(() => __bot.summary());
    attempts.push(a);
    if (a.capInfo && r < RUNS) console.log('  stopped at tile', JSON.stringify(a.at), 'bot was on', JSON.stringify(a.capInfo));
    if (r < RUNS) console.log(`run ${r + 1} attempt ${attempts.length}: ${a.result} in area ${a.where}` + (a.cause ? ` (killed by ${a.cause})` : '') + `, ${((a.end - a.start) / 60).toFixed(1)} min`);
    if (!['died', 'locked out', 'stuck in the gate'].includes(a.result)) break;
  }
  runs.push({ attempts, total: attempts.at(-1).end - t0 });
}
await browser.close();
const extraRuns = runs.splice(RUNS);   // the detailed tables use the first RUNS runs only
const everyRun = [...runs, ...extraRuns];

/* ---------- the report ---------- */
const fmt = s => s == null ? 'n/a' : s >= 60 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.round(s)}s`;
const pct = v => v == null ? 'n/a' : v + '%';
const lines = [];
const P = s => lines.push(s);
P('# HELLBOUND bot playtest: The Blood Altar');
P('');
P(`Made by \`tests/playtest.mjs\` on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. ${RUNS} runs, each capped at ${RUN_CAP_MIN} minutes of game time. The bot reacts to a warning ${REACT} s after it appears.`);
P('If the bot dies, the run starts again from the beginning (the same as pressing R to rise) and the time keeps counting.');
P('');
P('## Each run');
P('');
P('| Run | Result | Total time | Tries (deaths) | Vat at the altar | Vat when the Warden died | Oculus fight | Warden fight | Stairs opened |');
P('|---|---|---|---|---|---|---|---|---|');
runs.forEach((run, i) => {
  const L = run.attempts.at(-1), deaths = run.attempts.filter(a => a.result === 'died');
  const oc = L.ocWake != null && L.ocDead != null ? L.ocDead - L.ocWake : null;
  const wd = L.wardenWake != null && L.wardenDead != null ? L.wardenDead - L.wardenWake : null;
  P(`| ${i + 1} | ${L.result} | ${fmt(run.total)} | ${run.attempts.length} (${deaths.length}) | ${pct(L.vatAtAltar)} | ${pct(L.vatAtWarden)} | ${fmt(oc)}${L.ocWake != null && L.ocDead == null ? ' (not killed)' : ''} | ${fmt(wd)}${wd != null && L.bug?.kind === 'frozen' ? ` (frozen in the gate for ${fmt(L.bug.secs)} of it)` : ''}${L.wardenWake != null && L.wardenDead == null ? ` (not killed, ${L.wardenHp}% health left)` : ''} | ${L.stairsOpenAt != null ? 'yes, at ' + fmt(L.stairsOpenAt - L.start) : 'no'} |`);
});
P('');
const allDeaths = runs.flatMap((r, i) => r.attempts.filter(a => a.result === 'died').map(a => ({ run: i + 1, ...a })));
if (allDeaths.length) {
  P('Deaths: ' + allDeaths.map(d => `run ${d.run} in ${areaName[d.where]} (${d.cause}, after ${fmt(d.end - d.start)})`).join('; ') + '.');
  P('');
}
// per area: averaged over the runs' final (furthest) tries; deaths counted over every try
P('## Each area (average of the final try of each run)');
P('');
P('| Area | Time | Share of the run | Damage taken | Kills | Flasks drunk | Deaths (all tries) | Vat on arrival |');
P('|---|---|---|---|---|---|---|---|');
const finals = runs.map(r => r.attempts.at(-1));
const avg = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const runLen = avg(finals.map(a => a.end - a.start));
const areaRows = {};
for (let n = 1; n <= 8; n++) {
  const hit = finals.filter(a => a.areas[n]);
  if (!hit.length && !allDeaths.some(d => d.where === n)) continue;
  const t = avg(finals.map(a => a.areas[n]?.t || 0));
  const row = { n, t, share: runLen ? t / runLen * 100 : 0, dmg: avg(finals.map(a => a.areas[n]?.dmg || 0)), kills: avg(finals.map(a => a.areas[n]?.kills || 0)),
    flasks: avg(finals.map(a => a.areas[n]?.flasks || 0)), deaths: allDeaths.filter(d => d.where === n).length,
    vat: hit.filter(a => a.reach[n]).length ? Math.round(avg(hit.filter(a => a.reach[n]).map(a => a.reach[n].vat))) : null };
  areaRows[n] = row;
  P(`| ${n <= 7 ? n + '. ' : ''}${areaName[n]} | ${fmt(row.t)} | ${Math.round(row.share)}% | ${Math.round(row.dmg)} | ${row.kills.toFixed(1)} | ${row.flasks.toFixed(1)} | ${row.deaths} | ${pct(row.vat)} |`);
}
P('');
// plain-English findings, worked out from the numbers
P('## What the numbers say');
P('');
const F = [];
const rows = Object.values(areaRows).filter(r => r.n <= 7);
if (rows.length) {
  const longest = rows.reduce((a, b) => b.t > a.t ? b : a);
  F.push(`${areaName[longest.n]} takes the longest: about ${fmt(longest.t)}, ${Math.round(longest.share)}% of the run.`);
  const hurtMost = rows.reduce((a, b) => b.dmg > a.dmg ? b : a);
  if (hurtMost.dmg > 0) F.push(`The bot loses the most health in ${areaName[hurtMost.n]} (about ${Math.round(hurtMost.dmg)} damage on its final try).`);
}
const altarV = finals.map(a => a.vatAtAltar).filter(v => v != null), wardV = finals.map(a => a.vatAtWarden).filter(v => v != null);
const fullIn = everyRun.map(r => r.attempts.at(-1).vatFullIn).filter(n => n != null);
const fullCount = {}; for (const n of fullIn) fullCount[n] = (fullCount[n] || 0) + 1;
if (altarV.length) F.push(`The vat was ${[...new Set(altarV)].join('% / ')}% full when the bot reached the altar and ${[...new Set(wardV)].join('% / ')}% when the Warden died.` +
  (fullIn.length ? ` Over all ${everyRun.length} runs it filled up in: ${Object.entries(fullCount).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${areaName[n]} (${c})`).join(', ')}.` : '') +
  (fullIn.length && fullIn.filter(n => n < 7).length > fullIn.length / 2 ? ' So the vat is normally full before the Warden fight even starts: no grinding is needed, and the 60% target could ask for more.' : ''));
const wFights = finals.filter(a => a.wardenDead != null && a.wardenWake != null).map(a => a.wardenDead - a.wardenWake);
if (wFights.length) F.push(`The Warden fight took ${wFights.map(fmt).join(', ')} for the bot, from the moment he woke (target: 60 to 90 seconds on a first try). ` +
  (avg(wFights) < 60 ? 'That is shorter than the target.' : avg(wFights) > 90 ? 'That is longer than the target.' : 'That is inside the target.') +
  (finals.some(a => a.wardenDead != null && a.bug?.kind === 'frozen') ? ' Some of those fights started with the knight stuck in the gate (see the bug below), which makes them less reliable.' : ''));
else F.push('The bot never killed the Warden, so there is no fight length.');
const oFights = finals.filter(a => a.ocDead != null && a.ocWake != null).map(a => a.ocDead - a.ocWake);
if (oFights.length) F.push(`The Oculus fight took ${oFights.map(fmt).join(', ')}.`);
const mop = finals.map(a => a.areas[8]?.t).filter(Boolean);
if (mop.length && avg(mop) > 45) F.push(`After the Warden died the bot still spent about ${fmt(avg(mop))} before the stairs, mostly hunting for blood.`);
const stuck = finals.reduce((s, a) => s + a.stuck, 0);
if (stuck > 3) F.push(`The bot got stuck on walls ${stuck} times (it rolls free); a spot where it happens often could catch players too.`);
for (const a of runs.flatMap(r => r.attempts)) for (const ev of a.events) if (!F.includes(ev)) F.push(ev);
// game problems the bot ran into (real bugs: a person would hit them too)
const bugs = everyRun.flatMap(r => r.attempts).map(a => a.bug).filter(Boolean);
const lock = bugs.filter(b => b.kind === 'locked out'), jam = bugs.filter(b => b.kind === 'frozen');
const tries = everyRun.reduce((n, r) => n + r.attempts.length, 0);   // over every run, extra ones included
if (lock.length) F.push(`**Game bug: locked out of the Warden's arena** (${lock.length} of ${tries} tries). The Warden wanders while he sleeps and wakes when you come within 200 px, even through the gate. When that happens before you've walked through, the gate slams shut with you OUTSIDE and him inside: you can never reach him and the only way out is to abandon the run. Example: knight at tile ${lock[0].knight.tx},${lock[0].knight.ty}, Warden at tile ${lock[0].warden.tx},${lock[0].warden.ty}, ${lock[0].fromAltar} tiles from his altar.`);
if (jam.length) { const freedByDeath = jam.filter(b => b.tillGateOpened).length, never = jam.filter(b => b.forever).length;
  F.push(`**Game bug: frozen in the gate** (${jam.length} of ${tries} tries). The Warden wakes when you come within 2.4 tiles of the area-7 marker, and along the carpet (row 8) that point is only 3 px past the gate. So walking in along the carpet, the gate slams shut while the edge of the knight's body is still on it, and he is stuck in the wall: he can't walk or roll. He stayed stuck for ${fmt(avg(jam.map(b => b.secs)))} on average; ${freedByDeath} time${freedByDeath === 1 ? '' : 's'} he fought the whole Warden fight standing still and only came loose when the Warden died and the gate opened${never ? `, and ${never} time${never === 1 ? '' : 's'} he was still stuck after a minute (that try was started again)` : ''}. The gate only pushes the knight clear when his centre is on a gate tile. Example: knight at x = ${jam[0].knight.px}; the gate is column 41, x 1312 to 1344.`); }
if (pageErrors.length) F.push('The game threw script errors during the runs: ' + [...new Set(pageErrors)].slice(0, 3).join(' | '));
F.forEach(f => P('- ' + f));
P('');
if (extraRuns.length) {
  const med = xs => { const v = xs.filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const fin = everyRun.map(r => r.attempts.at(-1));
  const wf = fin.map(a => a.wardenDead != null && a.wardenWake != null ? a.wardenDead - a.wardenWake : null);
  const wfClean = fin.filter(a => a.bug?.kind !== 'frozen').map(a => a.wardenDead != null && a.wardenWake != null ? a.wardenDead - a.wardenWake : null);
  const of = fin.map(a => a.ocDead != null && a.ocWake != null ? a.ocDead - a.ocWake : null);
  const d = everyRun.flatMap(r => r.attempts.filter(a => a.result === 'died'));
  const dArea = {}; for (const x of d) dArea[x.where] = (dArea[x.where] || 0) + 1;
  const done = everyRun.filter(r => r.attempts.at(-1).result === 'reached the Shack');
  P(`## Bigger sample (${everyRun.length} runs: the ${RUNS} above plus ${extraRuns.length} more)`);
  P('');
  P(`- Reached the Shack: ${done.length} of ${everyRun.length} runs. Typical run (median): ${fmt(med(done.map(r => r.total)))}.`);
  P(`- Warden fight (median): ${fmt(med(wf))}, ${fmt(med(wfClean))} when the knight did not get stuck in the gate. Shortest ${fmt(Math.min(...wf.filter(x => x != null)))}, longest ${fmt(Math.max(...wf.filter(x => x != null)))}.`);
  P(`- Oculus fight (median): ${fmt(med(of))}.`);
  P(`- Deaths: ${d.length} in total` + (d.length ? `: ${Object.entries(dArea).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${areaName[n]} ${c}`).join(', ')}.` : '.'));
  P('');
}
P('## Caveat');
P('');
P('A bot plays differently from a person. Apart from its set reaction time it never misses a warning, rolls the right way every time,');
P('never explores side rooms or reads the hints, and fights whatever is closest along the path. It also never');
P('stops to look at loot. Treat these numbers as a floor for how fast the run can go and as a way to compare');
P('before and after a change, not as what Dave will feel on his first try.');
const report = lines.join('\n') + '\n';
console.log('\n' + report);

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, report);
console.log('report written to ' + REPORT);
