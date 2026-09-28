/* Shared shell (top bar, theme toggle) and the pose figure renderer. */
(function(){
  const PAGES=[["index.html","Studio"],["course.html","Modules"],["lesson.html","Sample lesson"],["poses.html","Pose explorer"],["flashcards.html","Flashcards"],["chase/index.html","The Chase"]];
  let here=(location.pathname.split("/").pop()||"index.html"); if(/^module\d/.test(here)) here="course.html";
  const bar=document.getElementById("bar");
  if(bar){
    bar.className="bar";
    bar.innerHTML=`<div class="bar-in"><a class="brand" href="index.html"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.2" r="2.4" fill="var(--muscle)"/><path d="M12 7v7M5 10l7 1 7-1M12 14l-5 7M12 14l5 7" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>Anatomy on the Mat</a>
    <nav class="nav" aria-label="Site">${PAGES.map(([h,t])=>`<a href="${h}"${h===here||(here===""&&h==="index.html")?' aria-current="page"':""}>${t}</a>`).join("")}</nav>
    <button class="theme-btn" id="themeBtn" type="button" aria-label="Switch colour theme">Theme</button></div>`;
    const root=document.documentElement;
    try{const t=localStorage.getItem("aotm-theme");if(t)root.dataset.theme=t;}catch(e){}
    document.getElementById("themeBtn").addEventListener("click",()=>{
      const dark=root.dataset.theme?root.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme=dark?"light":"dark";
      try{localStorage.setItem("aotm-theme",root.dataset.theme);}catch(e){}
    });
  }
})();

/* ---------- Pose figure ----------
   Angles in degrees, y up, 0 = pointing right, 90 = up, -90 = down.
   Segments: trunk (pelvis -> shoulders), neck, uL/fL/uR/fR arms, tL/sL/ftL tR/sR/ftR legs. */
const SEG={trunk:60,neck:14,u:32,f:30,t:44,s:42,ft:14,hipW:9,shW:17,head:10};
function poseGeometry(p){
  const r=d=>d*Math.PI/180, add=(a,len,deg)=>[a[0]+len*Math.cos(r(deg)),a[1]+len*Math.sin(r(deg))];
  const P=[0,0], front=p.view==="front";
  const perp=p.trunk+90; // left side direction
  const off=(pt,w,sign)=>front?add(pt,w*sign,perp):pt;
  const S=add(P,SEG.trunk,p.trunk);
  const H=add(S,SEG.neck,p.neck), Hc=add(H,SEG.head*0.9,p.neck);
  const shL=off(S,SEG.shW,1), shR=off(S,SEG.shW,-1), hpL=off(P,SEG.hipW,1), hpR=off(P,SEG.hipW,-1);
  const eL=add(shL,SEG.u,p.uL), wL=add(eL,SEG.f,p.fL), eR=add(shR,SEG.u,p.uR), wR=add(eR,SEG.f,p.fR);
  const kL=add(hpL,SEG.t,p.tL), aL=add(kL,SEG.s,p.sL), toeL=add(aL,SEG.ft,p.ftL);
  const kR=add(hpR,SEG.t,p.tR), aR=add(kR,SEG.s,p.sR), toeR=add(aR,SEG.ft,p.ftR);
  return {P,S,H,Hc,shL,shR,hpL,hpR,eL,wL,eR,wR,kL,aL,toeL,kR,aR,toeR,front};
}
function drawFigure(svg,pose,opts={}){
  const g=poseGeometry(pose), hl=new Set(opts.highlight||[]);
  const pts=Object.values(g).filter(Array.isArray);
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const minX=Math.min(...xs)-16,maxX=Math.max(...xs)+16,minY=Math.min(...ys),maxY=Math.max(...ys)+SEG.head*2+6;
  if(opts.box){ // fixed frame: feet anchored at x=0, lowest point on the floor (y=0)
    const dx=-g.aR[0], dy=-minY;
    const moved={};
    for(const k in g){ if(Array.isArray(g[k])) moved[k]=[g[k][0]+dx,g[k][1]+dy]; else moved[k]=g[k]; }
    Object.assign(g,moved);
    svg.setAttribute("viewBox",opts.box.join(" "));
    return render(svg,g,hl,opts,opts.box[0],opts.box[2],0);
  }
  const floor=minY-2;
  const W=Math.max(maxX-minX,140), Hh=Math.max(maxY-floor+14,120);
  const cx=(minX+maxX)/2;
  const vbX=cx-W/2, vbY=-(maxY+4);
  svg.setAttribute("viewBox",`${vbX.toFixed(1)} ${vbY.toFixed(1)} ${W.toFixed(1)} ${Hh.toFixed(1)}`);
  return render(svg,g,hl,opts,vbX,W,floor);
}
function render(svg,g,hl,opts,vbX,W,floor){
  const line=(a,b,cls,w)=>`<line x1="${a[0].toFixed(1)}" y1="${(-a[1]).toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${(-b[1]).toFixed(1)}" stroke="${cls}" stroke-width="${w}" stroke-linecap="round"/>`;
  const far=g.front?"var(--bone)":"color-mix(in srgb,var(--bone) 55%,var(--bg))";
  const segs={
    thighL:[g.hpL,g.kL,far],shinL:[g.kL,g.aL,far],footL:[g.aL,g.toeL,far],
    armL:[g.shL,g.eL,far],foreL:[g.eL,g.wL,far],
    trunk:[g.P,g.S,"var(--bone)"],neck:[g.S,g.H,"var(--bone)"],
    thighR:[g.hpR,g.kR,"var(--bone)"],shinR:[g.kR,g.aR,"var(--bone)"],footR:[g.aR,g.toeR,"var(--bone)"],
    armR:[g.shR,g.eR,"var(--bone)"],foreR:[g.eR,g.wR,"var(--bone)"]
  };
  let out=`<line x1="${(vbX+4).toFixed(1)}" y1="${(-floor).toFixed(1)}" x2="${(vbX+W-4).toFixed(1)}" y2="${(-floor).toFixed(1)}" stroke="var(--line)" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>`;
  // muscle highlights under bones
  for(const k in segs){ if(hl.has(k)){const [a,b]=segs[k]; out+=line(a,b,"var(--muscle)",15).replace("<line","<line opacity=\"0.35\"");} }
  if(hl.has("core")) out+=line(g.P,g.S,"var(--muscle)",18).replace("<line","<line opacity=\"0.3\"");
  if(g.front){ out+=line(g.shL,g.shR,"var(--bone)",5)+line(g.hpL,g.hpR,"var(--bone)",6); }
  for(const k of ["thighL","shinL","footL","armL","foreL"]) {const [a,b,c]=segs[k]; out+=line(a,b,c,5.5);}
  for(const k of ["trunk","neck"]) {const [a,b,c]=segs[k]; out+=line(a,b,c,k==="trunk"?7:5);}
  for(const k of ["thighR","shinR","footR","armR","foreR"]) {const [a,b,c]=segs[k]; out+=line(a,b,c,5.5);}
  const joints=[g.hpL,g.hpR,g.kL,g.kR,g.aL,g.aR,g.shL,g.shR,g.eL,g.eR,g.P];
  const jh=new Set(opts.joints||[]);
  const jnames=["hipL","hipR","kneeL","kneeR","ankleL","ankleR","shoulderL","shoulderR","elbowL","elbowR","pelvis"];
  joints.forEach((j,i)=>{const on=jh.has(jnames[i]); out+=`<circle cx="${j[0].toFixed(1)}" cy="${(-j[1]).toFixed(1)}" r="${on?4.6:3}" fill="${on?"var(--muscle)":"var(--surface)"}" stroke="var(--ink)" stroke-width="1.4"/>`;});
  out+=`<circle cx="${g.Hc[0].toFixed(1)}" cy="${(-g.Hc[1]).toFixed(1)}" r="${SEG.head}" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.6"/>`;
  svg.innerHTML=out;
}
