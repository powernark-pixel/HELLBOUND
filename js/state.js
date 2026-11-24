/* HELLBOUND · js/state.js · Game state: the player (P), stats (calc), starting a new game
   (Files load in the order listed in index.html and share one global scope.) */

/* =====================================================================
   3. GAME STATE
   ===================================================================== */
let map,seen,rooms,stairsT,chests,enemies,boss,bullets,ebullets,ground,parts,texts,swings,corpses,
    floor,stardust,filter,dead,shake,invOpen,P,S,eq,inv;
let decor=[],decals=[],pickupSeq=0;
const keys={},mouse={x:LW/2,y:LH/2,down:false};

function rollRarity(ilvl){
  const f=1+ilvl*0.03;
  const w=RAR.map((r,i)=>i?r.w*f:r.w);
  let t=Math.random()*w.reduce((a,b)=>a+b,0);
  for(let i=0;i<w.length;i++){t-=w[i];if(t<=0)return i}
  return 0;
}
function genAffixes(r,ilvl){
  const R=RAR[r],n=ri(R.aff[0],R.aff[1]),pool=AFF.slice(),out=[];
  for(let i=0;i<n&&pool.length;i++){
    const a=pool.splice(ri(0,pool.length-1),1)[0];
    let v=rnd(a.min,a.max)*(1+ilvl*0.015)*R.m;
    v=a.int?Math.max(1,Math.round(v)):Math.round(v*10)/10;
    out.push({k:a.k,v});
  }
  return out;
}
function makeItem(slot,ilvl,minR=0){
  const r=Math.max(minR,rollRarity(ilvl));
  const base=pick(BASES[slot]);
  const bv=Math.round((BVBASE[slot]+ilvl*BVGROW[slot])*RAR[r].m);
  return {
    id:uid++,slot,base,r,ilvl,bv,
    name:r===5?`${pick(MPRE)} ${base}${pick(MSUF)}`:base,
    aff:genAffixes(r,ilvl),
    trait:r===5?pick(TKEYS):null
  };
}
function fmtAff(a){return AFF.find(x=>x.k===a.k).t.replace('{v}',a.v)}
function colorOf(it){return it.r===5?`hsl(${(time*180)%360} 100% 62%)`:RAR[it.r].c}
function hasTrait(k){return S.traits.includes(k)}

// computeStats(): adds up stats from an equipment set, affixes and owned passive nodes.
// It has no side effects, so the inventory can use it to preview a swap.
function computeStats(eqx){
  const s={dmgB:0,hpB:0,wardB:0,spB:0,traits:[]};
  AFF.forEach(a=>s[a.k]=0);
  for(const slot of SLOTS){
    const it=eqx[slot];if(!it)continue;
    const m=1+(it.emp||0)/100;   // empowered by the Stardust Engine: +1% to every stat per feeding
    if(slot==='blade'||slot==='gloves')s.dmgB+=it.bv*m;
    if(slot==='plate'||slot==='helm')s.hpB+=it.bv*m;
    if(slot==='sigil'||slot==='ring')s.wardB+=it.bv*m;
    if(slot==='greaves'||slot==='boots')s.spB+=it.bv*m;
    for(const a of it.aff)s[a.k]+=a.v*m;
    if(it.trait)s.traits.push(it.trait);
  }
  for(const b of P.boons||[])if(!s.traits.includes(b))s.traits.push(b);   // boons from completed stages
  s.maxHp=100+s.hpB+s.hp+(P.bonusHp||0);   // +10 for every level completed
  s.maxSh=s.wardB+s.ward;
  s.damage=(12+s.dmgB)*(1+s.dmg/100);
  s.atkRate=1.5*(1+s.rate/100);
  s.critC=5+s.crit;
  s.critM=150+s.critd;
  s.spd=200*(1+(s.speed+s.spB)/100);
  s.mag=60+s.magnet;
  s.range=56+s.reach;
  s.arcDeg=70+s.arc;
  s.rollCD=2.2*(1-Math.min(.6,s.warp/100))*(P&&P.perks&&P.perks.includes('shadowstep')?0.65:1);
  return s;
}
// calc(): recompute the player's totals into S
function calc(){
  S=computeStats(eq);
  if(P){
    P.maxHp=S.maxHp;P.maxSh=S.maxSh;
    P.hp=Math.min(P.hp,P.maxHp);P.sh=Math.min(P.sh,P.maxSh);
  }
}
