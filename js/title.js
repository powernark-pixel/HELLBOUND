/* HELLBOUND · js/title.js · The title screen backdrop
   (Files load in the order listed in index.html and share one global scope.) */

/* ----- TITLE SCENE: painted backdrop, rising embers, a breathing rose window ----- */
let tparts=[];
function updateTitle(dt){
  if(Math.random()<dt*30)tparts.push({x:rnd(0,LW),y:LH+2,vx:rnd(-8,8),vy:rnd(-40,-14),life:rnd(4,9),max:9,c:pick(['#ff6a1a','#ffd27a','#a12a06','#5d5059'])});
  for(const p of tparts){p.x+=p.vx*dt+Math.sin(time+p.y*0.05)*0.2;p.y+=p.vy*dt;p.life-=dt}
  tparts=tparts.filter(p=>p.life>0&&p.y>-4);
}
function drawTitle(){
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#07030a';ctx.fillRect(0,0,LW,LH);
  if(IMG.title)ctx.drawImage(IMG.title,0,0,LW,LH);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const p=0.10+0.06*Math.sin(time*1.7)+0.03*Math.sin(time*7.3);
  const g=ctx.createRadialGradient(320,196,4,320,196,70);
  g.addColorStop(0,`rgba(255,120,40,${p})`);g.addColorStop(1,'rgba(255,60,20,0)');
  ctx.fillStyle=g;ctx.fillRect(250,126,140,140);
  const d=ctx.createRadialGradient(320,276,2,320,276,60);
  d.addColorStop(0,`rgba(255,140,60,${p*0.9})`);d.addColorStop(1,'rgba(255,60,20,0)');
  ctx.fillStyle=d;ctx.fillRect(260,216,120,120);
  ctx.restore();
  for(const q of tparts){ctx.globalAlpha=Math.min(1,q.life/q.max*1.5);ctx.fillStyle=q.c;ctx.fillRect(Math.round(q.x),Math.round(q.y),1,1)}
  ctx.globalAlpha=1;
  const v=ctx.createRadialGradient(LW/2,LH/2,LH*0.4,LW/2,LH/2,LW*0.7);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.6)');
  ctx.fillStyle=v;ctx.fillRect(0,0,LW,LH);
}
