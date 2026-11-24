/* =====================================================================
   HELLBOUND SOUND
   Every sound is synthesised live with the Web Audio API, so the game
   has sound with no audio files at all.

   YOUR OWN SOUNDS (e.g. made in Reason): export a file, put it in
   audio/sfx/, and list it in SOUND_FILES below with the sound's name.
   A listed file always replaces the synthesised version.
     e.g.  swing:'audio/sfx/swing.ogg',
   See audio/README.md for every sound name and export settings.
   ===================================================================== */
const SOUND_FILES={
  // name:'audio/sfx/file.ogg',
  // ambience:'audio/music/ambience.ogg',   (loops underneath the game)
};

const SFX=(()=>{
  let ac=null,master,sfxBus,ambBus,verbIn,amb=null,ambTimer=null,started=false;
  let vol=0.7,on=true;
  const last={},files={};
  try{const s=JSON.parse(localStorage.getItem('hb_audio')||'{}');if(typeof s.vol==='number')vol=s.vol;if(s.on===false)on=false}catch(e){}
  const save=()=>{try{localStorage.setItem('hb_audio',JSON.stringify({vol,on}))}catch(e){}};
  const R=(a,b)=>a+Math.random()*(b-a);

  /* ---------- building blocks (each takes the context, so sounds can also be rendered offline for testing) ---------- */
  function noiseBuf(ctx){
    if(ctx._noise)return ctx._noise;
    const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    return ctx._noise=b;
  }
  function env(ctx,t,a,d,peak){ // gain node with attack a, decay d
    const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);return g;
  }
  function osc(ctx,type,f0,f1,t,dur){
    const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t);
    if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    o.start(t);o.stop(t+dur+0.05);return o;
  }
  function noise(ctx,t,dur){
    const s=ctx.createBufferSource();s.buffer=noiseBuf(ctx);s.start(t,Math.random()*1.5);s.stop(t+dur+0.05);return s;
  }
  function filt(ctx,type,f0,f1,t,dur,q=1){
    const f=ctx.createBiquadFilter();f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);
    if(f1&&f1!==f0)f.frequency.exponentialRampToValueAtTime(f1,t+dur);return f;
  }
  // chain(a,b,c...) connects nodes in order and returns the last
  function chain(...n){for(let i=0;i<n.length-1;i++)n[i].connect(n[i+1]);return n[n.length-1]}
  function out(node,o,wet=0.2){node.connect(o.dry);if(o.wet&&wet>0){const g=o.ctx.createGain();g.gain.value=wet;node.connect(g);g.connect(o.wet)}}

  /* ---------- the sounds ---------- */
  const S={
    swing(o,t){const{ctx}=o;const p=R(.85,1.15);
      out(chain(noise(ctx,t,.16),filt(ctx,'bandpass',2600*p,700*p,t,.15,1.4),env(ctx,t,.01,.15,.95)),o,.1)},
    hit(o,t){const{ctx}=o;
      out(chain(osc(ctx,'sine',150*R(.9,1.1),50,t,.1),env(ctx,t,.002,.12,.75)),o,.1);
      out(chain(noise(ctx,t,.07),filt(ctx,'lowpass',2200,500,t,.07),env(ctx,t,.001,.07,.45)),o,.1)},
    crit(o,t){S.hit(o,t);const{ctx}=o;
      out(chain(osc(ctx,'triangle',1250,1180,t,.35),env(ctx,t,.001,.35,.16)),o,.35)},
    kill(o,t){const{ctx}=o;const p=R(.85,1.15);
      out(chain(noise(ctx,t,.3),filt(ctx,'lowpass',1100*p,220,t,.28,2),env(ctx,t,.003,.28,.6)),o,.15);
      out(chain(osc(ctx,'sine',95*p,38,t,.25),env(ctx,t,.003,.25,.42)),o,.1)},
    bigkill(o,t){const{ctx}=o;
      out(chain(noise(ctx,t,1.2),filt(ctx,'lowpass',900,90,t,1.1,1),env(ctx,t,.01,1.1,.65)),o,.4);
      out(chain(osc(ctx,'sine',70,28,t,1.2),env(ctx,t,.01,1.2,.55)),o,.3);
      S.toll(o,t+.25)},
    hurt(o,t){const{ctx}=o;const p=R(.9,1.1);
      out(chain(osc(ctx,'sawtooth',210*p,95*p,t,.2),filt(ctx,'lowpass',1100,500,t,.2),env(ctx,t,.004,.2,.4)),o,.1);
      out(chain(noise(ctx,t,.08),filt(ctx,'highpass',1800,1800,t,.08),env(ctx,t,.001,.08,.2)),o,0)},
    roll(o,t){const{ctx}=o;
      out(chain(noise(ctx,t,.3),filt(ctx,'bandpass',900,350,t,.28,.9),env(ctx,t,.04,.25,.8)),o,.1)},
    pickup(o,t,a={}){const{ctx}=o;const r=a.r||0;const notes=[523.3,659.3,784,1046.5,1318.5,1568];
      for(let i=0;i<=Math.min(5,r);i++){const tt=t+i*.065,f=notes[i];
        out(chain(osc(ctx,'sine',f,f,tt,.6),env(ctx,tt,.002,.45+r*.1,.22)),o,.35);
        out(chain(osc(ctx,'sine',f*2.76,f*2.76,tt,.3),env(ctx,tt,.002,.25,.06)),o,.35)}},
    chest(o,t){const{ctx}=o;
      const c=osc(ctx,'sawtooth',95,80,t,.45),lfo=ctx.createOscillator(),lg=ctx.createGain();
      lfo.frequency.value=9;lg.gain.value=18;lfo.connect(lg);lg.connect(c.frequency);lfo.start(t);lfo.stop(t+.5);
      out(chain(c,filt(ctx,'bandpass',650,650,t,.45,4),env(ctx,t,.06,.38,.6)),o,.2);
      for(let i=0;i<6;i++){const tt=t+.35+i*.045,f=R(2200,4200);
        out(chain(osc(ctx,'triangle',f,f*.97,tt,.12),env(ctx,tt,.001,.11,.22)),o,.3)}},
    levelup(o,t){const{ctx}=o;[261.6,329.6,392,523.3,659.3,784].forEach((f,i)=>{const tt=t+i*.085,d=i===5?1.1:.3;
      out(chain(osc(ctx,'sine',f,f,tt,d),env(ctx,tt,.005,d,.24)),o,.5);
      out(chain(osc(ctx,'square',f,f,tt,d),filt(ctx,'lowpass',1600,1600,tt,d),env(ctx,tt,.005,d,.05)),o,.5)})},
    descend(o,t){const{ctx}=o;
      out(chain(osc(ctx,'sine',80,30,t,1.8),env(ctx,t,.02,1.8,.8)),o,.5);
      out(chain(noise(ctx,t,1.6),filt(ctx,'lowpass',400,60,t,1.5),env(ctx,t,.05,1.5,.6)),o,.5)},
    toll(o,t){const{ctx}=o; // a distant funeral bell
      [[110,.5],[220,.25],[276,.18],[331,.12],[440,.06]].forEach(([f,a])=>out(chain(osc(ctx,'sine',f,f,t,3.2),env(ctx,t,.004,3,a)),o,.6))},
    area(o,t){S.toll({...o},t)},
    death(o,t){S.toll(o,t);const{ctx}=o;
      out(chain(osc(ctx,'sawtooth',90,45,t,1.4),filt(ctx,'lowpass',500,120,t,1.4),env(ctx,t,.02,1.4,.35)),o,.5)},
    arrow(o,t){const{ctx}=o;
      out(chain(osc(ctx,'triangle',230,170,t,.16),env(ctx,t,.001,.16,.3)),o,.1);
      out(chain(noise(ctx,t,.12),filt(ctx,'bandpass',3000,1500,t,.12,2),env(ctx,t,.001,.12,.18)),o,.05)},
    bolt(o,t){const{ctx}=o;
      out(chain(osc(ctx,'sawtooth',340,110,t,.45),filt(ctx,'lowpass',1400,300,t,.45),env(ctx,t,.01,.42,.3)),o,.4);
      out(chain(noise(ctx,t,.4),filt(ctx,'bandpass',1200,400,t,.4,3),env(ctx,t,.02,.38,.2)),o,.4)},
    roar(o,t){const{ctx}=o;const f=filt(ctx,'lowpass',180,180,t,2);
      f.frequency.setValueAtTime(180,t);f.frequency.linearRampToValueAtTime(900,t+.7);f.frequency.linearRampToValueAtTime(160,t+1.9);
      const g=env(ctx,t,.25,1.7,.36);f.connect(g);
      for(const fr of [55,57.5,82.5,110.3])osc(ctx,'sawtooth',fr,fr*.85,t,2).connect(f);
      chain(noise(ctx,t,2),filt(ctx,'lowpass',300,300,t,2),f);
      out(g,o,.5)},
    sizzle(o,t){const{ctx}=o;
      out(chain(noise(ctx,t,.18),filt(ctx,'highpass',2800,4000,t,.18),env(ctx,t,.01,.16,.13)),o,0)},
    equip(o,t){const{ctx}=o;
      out(chain(osc(ctx,'triangle',620,410,t,.18),env(ctx,t,.001,.18,.25)),o,.25);
      out(chain(noise(ctx,t,.1),filt(ctx,'bandpass',2600,2600,t,.1,3),env(ctx,t,.001,.1,.25)),o,.2)},
    salvage(o,t){const{ctx}=o;[1568,1318.5,1046.5,784].forEach((f,i)=>{const tt=t+i*.04;
      out(chain(osc(ctx,'sine',f,f,tt,.25),env(ctx,tt,.001,.2,.22)),o,.4)})},
    node(o,t){const{ctx}=o;[392,587.3,784].forEach((f,i)=>{const tt=t+i*.05;
      out(chain(osc(ctx,'sine',f,f*1.01,tt,.9),env(ctx,tt,.01,.8,.18)),o,.6)})},
    ui(o,t){const{ctx}=o;out(chain(osc(ctx,'triangle',880,820,t,.06),env(ctx,t,.001,.05,.14)),o,.05)},
    hover(o,t){const{ctx}=o;out(chain(osc(ctx,'sine',1400,1400,t,.04),env(ctx,t,.001,.03,.05)),o,0)}
  };
  const GAP={hit:.035,crit:.035,kill:.04,hurt:.12,sizzle:.22,pickup:.05,swing:.05,arrow:.06,bolt:.2,hover:.04};

  /* ---------- the mixer: master -> sfx + ambience, with a cathedral reverb ---------- */
  function makeVerb(ctx){
    const len=ctx.sampleRate*2.6,b=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
    const v=ctx.createConvolver();v.buffer=b;return v;
  }
  function init(){
    if(ac)return true;
    const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
    try{ac=new C()}catch(e){return false}
    master=ac.createGain();master.gain.value=on?vol:0;master.connect(ac.destination);
    const comp=ac.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(master);
    sfxBus=ac.createGain();sfxBus.connect(comp);
    ambBus=ac.createGain();ambBus.gain.value=.55;ambBus.connect(comp);
    const verb=makeVerb(ac);verbIn=ac.createGain();verbIn.connect(verb);verb.connect(comp);
    for(const [k,url] of Object.entries(SOUND_FILES))
      fetch(url).then(r=>r.arrayBuffer()).then(b=>ac.decodeAudioData(b)).then(buf=>{files[k]=buf;if(k==='ambience'&&started)startAmbience()}).catch(()=>{});
    return true;
  }
  function resume(){
    if(!init())return;
    if(ac.state!=='running')ac.resume().catch(()=>{});
    if(!started){started=true;startAmbience()}
  }
  function play(name,a){
    if(!ac||!on||ac.state!=='running')return;
    const t=ac.currentTime;if(last[name]&&t-last[name]<(GAP[name]||.02))return;last[name]=t;
    if(files[name]){const s=ac.createBufferSource();s.buffer=files[name];s.playbackRate.value=R(.95,1.05);
      const g=ac.createGain();g.gain.value=.9;s.connect(g);g.connect(sfxBus);const w=ac.createGain();w.gain.value=.15;g.connect(w);w.connect(verbIn);s.start(t);return}
    const f=S[name];if(!f)return;
    try{f({ctx:ac,dry:sfxBus,wet:verbIn},t+.005,a||{})}catch(e){}
  }
  /* ---------- ambience: a low cathedral drone, distant rumbles and dripping water ---------- */
  function startAmbience(){
    if(!ac)return;
    if(amb){try{amb.stop()}catch(e){}amb=null}
    clearTimeout(ambTimer);
    if(files.ambience){const s=ac.createBufferSource();s.buffer=files.ambience;s.loop=true;s.connect(ambBus);s.start();amb=s;return}
    const t=ac.currentTime,lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=240;lp.Q.value=2;
    const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=.06;lg.gain.value=110;lfo.connect(lg);lg.connect(lp.frequency);lfo.start(t);
    const g=ac.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(.16,t+4);
    for(const [f,type] of [[55,'sawtooth'],[55.4,'sawtooth'],[82.4,'triangle'],[27.5,'sine']]){const o=ac.createOscillator();o.type=type;o.frequency.value=f;o.connect(lp);o.start(t)}
    lp.connect(g);g.connect(ambBus);const w=ac.createGain();w.gain.value=.4;g.connect(w);w.connect(verbIn);
    amb={stop(){g.gain.cancelScheduledValues(ac.currentTime);g.gain.setTargetAtTime(0.0001,ac.currentTime,.3)}};
    const tick=()=>{
      if(on&&ac.state==='running'){
        const o={ctx:ac,dry:ambBus,wet:verbIn},tt=ac.currentTime+.05;
        if(Math.random()<.55){const f=R(1700,2900); // a drip
          chain(osc(ac,'sine',f,f*.6,tt,.12),env(ac,tt,.001,.12,.07)).connect(verbIn)}
        else chain(noise(ac,tt,3),filt(ac,'lowpass',110,60,tt,3),env(ac,tt,1.2,1.8,.35)).connect(ambBus); // distant rumble
      }
      ambTimer=setTimeout(tick,R(2500,7000));
    };
    ambTimer=setTimeout(tick,3000);
  }
  function setVol(v){vol=Math.max(0,Math.min(1,v));if(master)master.gain.setTargetAtTime(on?vol:0,ac.currentTime,.05);save()}
  function toggle(){on=!on;if(master)master.gain.setTargetAtTime(on?vol:0,ac.currentTime,.05);save();return on}
  // Render one sound offline (for testing): returns {peak, rms, seconds}
  async function measure(name,a){
    const ctx=new OfflineAudioContext(1,44100*4,44100);
    const dry=ctx.createGain();dry.connect(ctx.destination);
    S[name]({ctx,dry,wet:null},0.01,a||{});
    const buf=await ctx.startRendering(),d=buf.getChannelData(0);
    let peak=0,sum=0,lastLoud=0;for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>peak)peak=v;sum+=v*v;if(v>.01)lastLoud=i}
    return {peak:+peak.toFixed(3),rms:+Math.sqrt(sum/d.length).toFixed(4),seconds:+(lastLoud/44100).toFixed(2)};
  }
  return {resume,play,setVol,toggle,measure,names:Object.keys(S),get vol(){return vol},get on(){return on},get running(){return !!ac&&ac.state==='running'}};
})();
