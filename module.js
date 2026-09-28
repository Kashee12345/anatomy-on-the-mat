/* Renders a module page from window.MOD (content/m<N>.json). Needs common.js + data-poses.js. */
(function(){
  const M = window.MOD, $ = s => document.querySelector(s);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const paras = t => t.split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join("");
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  let plate = 0;

  function visualHTML(v){
    plate++;
    if (v.kind === "diagram") return `<figure class="plate mplate"><img src="diagrams/${esc(v.id)}.svg" alt="${esc(v.caption||"Diagram")}" loading="lazy"><figcaption class="plate-cap"><b>Plate ${plate}</b> · ${esc(v.caption||"")}</figcaption></figure>`;
    const ang = v.kind === "figure" ? v.angles : (POSES.find(p => p.id === v.pose)||{}).fig;
    if (!ang) return "";
    const id = "fig" + plate;
    queueMicrotask(() => { const el = document.getElementById(id); if (el) drawFigure(el, ang, {highlight: v.highlight||[], joints: v.joints||[]}); });
    return `<figure class="plate mplate"><svg id="${id}" role="img" aria-label="${esc(v.caption||"Pose figure")}"></svg><figcaption class="plate-cap"><b>Plate ${plate}</b> · ${esc(v.caption||"")}</figcaption></figure>`;
  }

  // ---- header
  document.title = `Module ${M.n}: ${M.title} · Anatomy on the Mat`;
  $("#mEyebrow").textContent = `Module ${M.n} · ${M.hours} hours · ${M.lessons.length} lessons`;
  $("#mTitle").textContent = M.title;
  $("#mTag").textContent = M.tagline;
  $("#mOverview").innerHTML = paras(M.overview);
  $("#mObj").innerHTML = M.objectives.map(o => `<li>${esc(o)}</li>`).join("");
  $("#mLessonsToc").innerHTML = M.lessons.map(l => `<a href="#l${l.id.replace('.','-')}"><span class="mono">${l.id}</span> ${esc(l.title)} <span class="muted mono">${l.mins} min</span></a>`).join("");

  // ---- study guide
  $("#mLessons").innerHTML = M.lessons.map((l, i) => {
    const vis = l.slides.filter(s => s.visual && s.visual.kind !== "none");
    const pick = vis.filter(s => s.visual.kind === "diagram").concat(vis.filter(s => s.visual.kind !== "diagram")).slice(0, 3);
    return `<details class="lesson" id="l${l.id.replace('.','-')}" ${i === 0 ? "open" : ""}>
      <summary><span class="lnum">${l.id}</span><span class="ltitle">${esc(l.title)}</span><span class="mono muted">${l.mins} min</span></summary>
      <div class="lbody">
        <div class="lcols"><div class="prose">${paras(l.guide.brief)}</div>
          <aside class="keybox"><h4>Key points</h4><ul>${l.guide.key_points.map(k => `<li>${esc(k)}</li>`).join("")}</ul></aside></div>
        <div class="plates">${pick.map(s => visualHTML(s.visual)).join("")}</div>
        <div class="lcols">
          <div class="feel"><h4>Feel it</h4><p>${esc(l.guide.feel_it)}</p></div>
          <div class="cues"><h4>Cue it</h4>${l.guide.cue_it.map(c => `<p class="cueq">“${esc(c)}”</p>`).join("")}</div>
        </div>
      </div></details>`;
  }).join("");

  // ---- terms & myths
  $("#mTerms").innerHTML = M.terms.map(([t, d]) => `<tr><td><b>${esc(t)}</b></td><td>${esc(d)}</td></tr>`).join("");
  $("#mMyths").innerHTML = M.misconceptions.map(([m, t]) => `<div class="myth"><p class="mm">${esc(m)}</p><p class="mt">${esc(t)}</p></div>`).join("");

  // ---- flashcards
  let deck = M.flashcards.slice(), known = 0, total = deck.length;
  const card = $("#fc"), fcRender = () => {
    $("#fcLeft").textContent = `${deck.length} left · ${known} / ${total} known`;
    $("#fcBar").style.width = (known / total * 100) + "%";
    const done = !deck.length; card.hidden = done; $("#fcCtl").hidden = done; $("#fcDone").hidden = !done;
    if (done) return; card.classList.remove("flip");
    $("#fcF").textContent = deck[0][0]; $("#fcB").textContent = deck[0][1];
  };
  card.addEventListener("click", () => card.classList.toggle("flip"));
  $("#fcGot").addEventListener("click", () => { deck.shift(); known++; fcRender(); });
  $("#fcAgain").addEventListener("click", () => { deck.push(deck.shift()); fcRender(); });
  $("#fcShuf").addEventListener("click", () => { deck = shuffle(M.flashcards); known = 0; fcRender(); });
  $("#fcRestart").addEventListener("click", () => { deck = shuffle(M.flashcards); known = 0; fcRender(); });
  fcRender();

  // ---- exercises
  let score = 0; const ex = M.exercises, done = new Set();
  const mark = (i, ok) => { if (done.has(i)) return; done.add(i); if (ok) score++; $("#exScore").textContent = `${score} / ${ex.length} correct first try · ${done.size} attempted`; };
  $("#mEx").innerHTML = ex.map((e, i) => {
    const head = `<div class="exhead"><span class="chip c-${{mcq:"con",match:"ecc",sort:"iso",order:"len"}[e.type]}">${{mcq:"Scenario",match:"Match",sort:"Sort",order:"Order"}[e.type]}</span><span class="mono muted">${i + 1} / ${ex.length}</span></div>`;
    if (e.type === "mcq") return `<div class="ex" data-i="${i}">${head}<p class="exq">${esc(e.q)}</p><div class="opts">${e.options.map((o, k) => `<button type="button" data-k="${k}">${esc(o)}</button>`).join("")}</div><p class="fb" aria-live="polite"></p></div>`;
    if (e.type === "match") { const R = shuffle(e.pairs.map((p, k) => [p[1], k])); return `<div class="ex" data-i="${i}">${head}<p class="exq">${esc(e.title)}</p><p class="muted small">Tap an item on the left, then its partner on the right.</p><div class="match"><div class="mcol">${e.pairs.map((p, k) => `<button type="button" class="ml" data-k="${k}">${esc(p[0])}</button>`).join("")}</div><div class="mcol">${R.map(([t, k]) => `<button type="button" class="mr" data-k="${k}">${esc(t)}</button>`).join("")}</div></div><p class="fb" aria-live="polite"></p></div>`; }
    if (e.type === "sort") return `<div class="ex" data-i="${i}">${head}<p class="exq">${esc(e.title)}</p><p class="muted small">Tap an item, then tap the group it belongs in. Then check.</p><div class="pool">${shuffle(e.items.map((it, k) => [it, k])).map(([it, k]) => `<button type="button" class="chipbtn" data-k="${k}">${esc(it[0])}</button>`).join("")}</div><div class="buckets">${e.buckets.map(b => `<div class="bucket" data-b="${esc(b)}"><b>${esc(b)}</b><div class="bin"></div></div>`).join("")}</div><button type="button" class="btn small check">Check</button><p class="fb" aria-live="polite"></p></div>`;
    if (e.type === "order") return `<div class="ex" data-i="${i}">${head}<p class="exq">${esc(e.title)}</p><ol class="order">${shuffle(e.items.map((t, k) => [t, k])).map(([t, k]) => `<li data-k="${k}"><span>${esc(t)}</span><span class="arrows"><button type="button" class="up" aria-label="Move up">▲</button><button type="button" class="dn" aria-label="Move down">▼</button></span></li>`).join("")}</ol><button type="button" class="btn small check">Check order</button><p class="fb" aria-live="polite"></p></div>`;
    return "";
  }).join("");

  document.querySelectorAll("#mEx .ex").forEach(box => {
    const i = +box.dataset.i, e = ex[i], fb = box.querySelector(".fb");
    if (e.type === "mcq") box.querySelectorAll(".opts button").forEach(b => b.addEventListener("click", () => {
      const k = +b.dataset.k, ok = k === e.answer;
      box.querySelectorAll(".opts button").forEach((x, j) => { x.classList.remove("right", "wrong"); if (j === e.answer) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong"); fb.textContent = (ok ? "Correct. " : "Not quite. ") + e.explain; mark(i, ok);
    }));
    if (e.type === "match") { let sel = null, got = 0, miss = 0;
      box.querySelectorAll(".ml").forEach(b => b.addEventListener("click", () => { if (b.classList.contains("right")) return; box.querySelectorAll(".ml").forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = b; }));
      box.querySelectorAll(".mr").forEach(b => b.addEventListener("click", () => {
        if (!sel || b.classList.contains("right")) return;
        if (sel.dataset.k === b.dataset.k) { sel.classList.remove("sel"); sel.classList.add("right"); b.classList.add("right"); sel = null; got++; fb.textContent = got === e.pairs.length ? (miss ? `All matched, with ${miss} miss${miss > 1 ? "es" : ""}.` : "All matched, no misses.") : ""; if (got === e.pairs.length) mark(i, !miss); }
        else { miss++; b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 500); }
      })); }
    if (e.type === "sort") { let sel = null;
      box.querySelectorAll(".chipbtn").forEach(c => c.addEventListener("click", ev => { ev.stopPropagation(); box.querySelectorAll(".chipbtn").forEach(x => x.classList.remove("sel")); c.classList.add("sel"); sel = c; }));
      box.querySelectorAll(".bucket").forEach(bk => bk.addEventListener("click", () => { if (!sel) return; bk.querySelector(".bin").appendChild(sel); sel.classList.remove("sel", "right", "wrong"); sel = null; }));
      box.querySelector(".check").addEventListener("click", () => {
        let right = 0; const placed = box.querySelectorAll(".bucket .chipbtn");
        placed.forEach(c => { const ok = e.items[+c.dataset.k][1] === c.closest(".bucket").dataset.b; c.classList.toggle("right", ok); c.classList.toggle("wrong", !ok); if (ok) right++; });
        const left = e.items.length - placed.length;
        fb.textContent = left ? `${left} item${left > 1 ? "s" : ""} still to place.` : `${right} of ${e.items.length} in the right group.${right < e.items.length ? " Move the red ones and check again." : ""}`;
        if (!left) mark(i, right === e.items.length);
      }); }
    if (e.type === "order") {
      const ol = box.querySelector(".order");
      ol.addEventListener("click", ev => { const li = ev.target.closest("li"); if (!li) return;
        if (ev.target.classList.contains("up") && li.previousElementSibling) ol.insertBefore(li, li.previousElementSibling);
        if (ev.target.classList.contains("dn") && li.nextElementSibling) ol.insertBefore(li.nextElementSibling, li); });
      box.querySelector(".check").addEventListener("click", () => {
        const lis = [...ol.children]; let right = 0;
        lis.forEach((li, k) => { const ok = +li.dataset.k === k; li.classList.toggle("right", ok); li.classList.toggle("wrong", !ok); if (ok) right++; });
        fb.textContent = right === lis.length ? "Correct order." : `${right} of ${lis.length} in the right place. Adjust and check again.`; mark(i, right === lis.length);
      }); }
  });

  // ---- self check
  $("#mSelf").innerHTML = M.self_check.map(([q, a], k) => `<details class="sc"><summary>${k + 1}. ${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
})();
