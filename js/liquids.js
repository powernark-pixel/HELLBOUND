/* HELLBOUND · js/liquids.js · Lava and blood pools
   (Files load in the order listed in index.html and share one global scope.)

   A pool is drawn in four layers, all in the iso floor pass:
   1. SURFACE: two seamless 64x64 textures (made once from noise at start-up) that drift
      in different directions. Because they are sampled in WORLD coordinates, the surface
      flows across tile borders with no seams. The second layer is added with 'lighter' so
      the two drifting layers make the surface shimmer.
   2. BANKS: where a pool meets floor on its far side (north or west), a strip of dark stone
      is drawn going down into it, so the liquid sits below the floor instead of on top.
   3. RIM: a glowing (lava) or clotted (blood) line where liquid meets stone on the near side.
   4. BUBBLES: rise, swell and pop near the knight. */

const LIQ={
  lava:{
    base:['#1c0504','#3a0b06','#6a1607','#a8300c','#e2581a','#ff8a2a','#ffc35a','#fff0a0'],
    glow:['#000000','#3a0c00','#a83000','#ff7a1a','#ffd27a'],
    flow:[5,3],flow2:[-4,5],glowAlpha:0.45,rim:'#ffb347',rimLo:'#a8300c',bank:['#2a1f22','#1a1214','#0e0809'],
    bubble:'#ffd27a',bubbleDark:'#6a1607',light:[40,0.4]},
  blood:{
    base:['#120103','#25030a','#3a0610','#540a16','#6e1019','#8f1a1f','#b0282a','#d8484a'],
    glow:['#000000','#1a0204','#4a0a10','#8f1a1f','#ff8a8a'],
    flow:[3,2],flow2:[-2,3],glowAlpha:0.35,rim:'#5a0a12',rimLo:'#2a0306',bank:['#2b2226','#1c1517','#100b0c'],
    bubble:'#c4302c',bubbleDark:'#3a0610',light:[34,0.22]},
};

// Seamless value noise on a 64x64 grid (wraps at the edges), several octaves summed.
function liqNoise(seed){
  const N=64,out=new Float32Array(N*N);
  const rnd=(i,j,c)=>{const n=Math.sin((i%c)*127.1+(j%c)*311.7+seed*74.7)*43758.5453;return n-Math.floor(n)};
  let amp=1,tot=0;
  for(const cells of [4,8,16,32]){
    const s=N/cells;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const gx=x/s,gy=y/s,i=Math.floor(gx),j=Math.floor(gy),fx=gx-i,fy=gy-j;
      const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
      const a=rnd(i,j,cells),b=rnd(i+1,j,cells),c=rnd(i,j+1,cells),d=rnd(i+1,j+1,cells);
      out[y*N+x]+=amp*(a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v);
    }
    tot+=amp;amp*=0.5;
  }
  for(let i=0;i<out.length;i++)out[i]/=tot;
  return out;
}
function liqTexture(pal,fn,seed){
  const N=64,cv=document.createElement('canvas');cv.width=cv.height=N;
  const g=cv.getContext('2d'),img=g.createImageData(N,N),n=liqNoise(seed),hex=pal.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const v=fn(n[y*N+x],x,y),c=hex[Math.max(0,Math.min(hex.length-1,Math.floor(v*hex.length)))],k=(y*N+x)*4;
    img.data[k]=c[0];img.data[k+1]=c[1];img.data[k+2]=c[2];img.data[k+3]=255;
  }
  g.putImageData(img,0,0);
  return cv;
}
let liqPat=null;
function liquidPatterns(){
  if(liqPat)return liqPat;
  const ridge=v=>1-Math.abs(v*2-1);          // bright thin veins where the noise crosses 0.5
  liqPat={
    // lava: mostly dark cooling crust, with thin molten cracks glowing through
    lava:{a:ctx.createPattern(liqTexture(LIQ.lava.base,v=>0.08+v*0.28+Math.pow(ridge(v),6)*0.7,1),'repeat'),
          b:ctx.createPattern(liqTexture(LIQ.lava.glow,v=>Math.pow(ridge(v),9),2),'repeat')},
    blood:{a:ctx.createPattern(liqTexture(LIQ.blood.base,v=>0.15+v*0.75,3),'repeat'),
           b:ctx.createPattern(liqTexture(LIQ.blood.glow,v=>Math.pow(ridge(v),7),4),'repeat')},
  };
  return liqPat;
}

const isLiquid=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH&&map[y][x]===2;
// Draw one pool tile. (cx,cy) is the screen position of the tile's top corner; S_ maps world to screen.
function drawLiquid(tx,ty,cx,cy,kind,S_){
  const L=LIQ[kind],P2=liquidPatterns()[kind];
  // Everything is drawn in the tile's own flat space (0..32 on each side), so nothing can spill
  // outside the diamond. Sides that touch more liquid are pushed out a hair to hide seams.
  const lw=isLiquid(tx-1,ty),ln=isLiquid(tx,ty-1),le=isLiquid(tx+1,ty),ls=isLiquid(tx,ty+1);
  const x0=lw?-0.6:0,y0=ln?-0.6:0,x1=le?T+0.6:T,y1=ls?T+0.6:T;
  ctx.setTransform(0.5,0.25,-0.5,0.25,cx,cy);
  const ox=tx*T,oy=ty*T;
  // 1. surface: two drifting layers sampled in world space, so it flows across tiles
  P2.a.setTransform(new DOMMatrix([1,0,0,1,-ox+time*L.flow[0],-oy+time*L.flow[1]]));
  ctx.fillStyle=P2.a;ctx.fillRect(x0,y0,x1-x0,y1-y0);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=L.glowAlpha*(0.75+0.25*Math.sin(time*1.7+tx*0.6+ty*0.4));
  P2.b.setTransform(new DOMMatrix([1,0,0,1,-ox+time*L.flow2[0],-oy+time*L.flow2[1]]));
  ctx.fillStyle=P2.b;ctx.fillRect(x0,y0,x1-x0,y1-y0);ctx.restore();
  // 2. banks on the far sides (north, west): stone shading into the pool, so it sits below the floor
  const B=7;
  if(!ln){ctx.fillStyle=L.bank[2];ctx.fillRect(0,0,T,2);ctx.fillStyle=L.bank[1];ctx.fillRect(0,2,T,B-4);ctx.globalAlpha=0.5;ctx.fillRect(0,B-2,T,2);ctx.globalAlpha=1}
  if(!lw){ctx.fillStyle=L.bank[2];ctx.fillRect(0,0,2,T);ctx.fillStyle=L.bank[1];ctx.fillRect(2,0,B-4,T);ctx.globalAlpha=0.5;ctx.fillRect(B-2,0,2,T);ctx.globalAlpha=1}
  // 3. rim on the near sides (south, east): the floor's edge catching the glow
  const pulse=0.6+0.4*Math.sin(time*2.4+tx*0.9+ty*0.5);
  ctx.globalAlpha=pulse;ctx.fillStyle=L.rim;
  if(!ls)ctx.fillRect(0,T-2,T,2);
  if(!le)ctx.fillRect(T-2,0,2,T);
  ctx.globalAlpha=1;ctx.fillStyle=L.rimLo;
  if(!ls)ctx.fillRect(0,T-4,T,2);
  if(!le)ctx.fillRect(T-4,0,2,T);
  ctx.setTransform(1,0,0,1,0,0);
}

// 4. bubbles: spawned on pool tiles near the knight, they swell and pop
let liqBubbles=[];
function updateBubbles(dt,kind){
  for(const b of liqBubbles)b.t+=dt;
  liqBubbles=liqBubbles.filter(b=>b.t<b.max);
  if(liqBubbles.length<14&&Math.random()<dt*(kind==='lava'?14:6)){
    const x=P.x+rnd(-300,300),y=P.y+rnd(-300,300);
    if(isLiquid(Math.floor(x/T),Math.floor(y/T)))liqBubbles.push({x,y,t:0,max:rnd(0.6,1.4),kind,r:rnd(1.5,3.5)});
  }
}
function drawBubbles(S_){
  for(const b of liqBubbles){
    const L=LIQ[b.kind],[x,y]=S_(b.x,b.y),k=b.t/b.max;
    if(k<0.85){const r=Math.round(b.r*Math.min(1,k*1.6));
      ctx.fillStyle=L.bubbleDark;ctx.fillRect(x-r,y-Math.ceil(r/2),r*2+1,r+1);
      ctx.fillStyle=L.bubble;ctx.fillRect(x-r+1,y-Math.ceil(r/2),Math.max(1,r*2-1),1);
    }else{   // pop: a few specks fly out
      ctx.fillStyle=L.bubble;const s=Math.round((k-0.85)*40);
      ctx.fillRect(x-s,y-1,1,1);ctx.fillRect(x+s,y-1,1,1);ctx.fillRect(x,y-1-Math.round(s/2),1,1);
    }
  }
}
