/* Palate site script. Shared by / and /es/. */
(() => {
const LANG = document.documentElement.lang === "es" ? "es" : "en";
const T = {
  en: { rev: "Revenue", eng: "Engagement", see: "See how we did it", open: "Open case study", close: "Close",
        pillars: ["Consulting", "Content", "Creative", "Reach"], full: "Full House ✓" },
  es: { rev: "Ventas", eng: "Interacción", see: "Mira cómo lo hicimos", open: "Abrir caso de éxito", close: "Cerrar",
        pillars: ["Consultoría", "Contenido", "Creativo", "Alcance"], full: "Full House ✓" }
}[LANG];

/* Shared helpers */
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Glide an animation's speed toward a target. The frame loop only runs while the speed is changing.
function speedEaser(getAnim) {
  let rate = 1, target = 1, raf = 0;
  const tick = () => {
    const a = getAnim();
    rate += (target - rate) * 0.08;
    if (Math.abs(target - rate) < 0.005) rate = target;
    if (a) a.playbackRate = rate;
    raf = rate === target ? 0 : requestAnimationFrame(tick);
  };
  return { set(t) { target = t; if (!raf) raf = requestAnimationFrame(tick); }, get rate() { return rate; } };
}
// Pause a looping animation while its section is off-screen (saves battery, keeps scrolling smooth).
function whileVisible(el, onShow, onHide) {
  if (!("IntersectionObserver" in window)) return;
  new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? onShow : onHide)()), { rootMargin: "200px 0px" }).observe(el);
}

/* ---------- CLIENT LOGOS: duplicate the track so the marquee loops ---------- */
(function(){
  var t = document.querySelector('.clients-track');
  if (t) t.innerHTML += t.innerHTML;
})();

/* ---------- VIDEO: tap to play ---------- */
(function(){
  var b = document.querySelector('.vsl-play'), box = b.parentNode, v = box.querySelector('video');
  b.addEventListener('click', function(){ v.controls = true; box.classList.add('is-playing'); v.play(); });
})();

/* ---------- SITE ---------- */
const nav = document.getElementById("nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 60), { passive: true });

/* MOBILE NAV TOGGLE */
(function(){
  const toggle = nav.querySelector('.nav-toggle');
  const links = nav.querySelector('.nav-links');
  if (!toggle || !links) return;
  function setOpen(open){
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false);
  });
})();
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add("on"); obs.unobserve(e.target); }});
}, {threshold:0.07});
document.querySelectorAll(".rv").forEach(el => obs.observe(el));

/* MANIFESTO: the rail fills and each beat lights up as you scroll through the story */
(function(){
  const list = document.getElementById("mnfBeats");
  if (!list || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const beats = list.querySelectorAll(".mnf-beat");
  list.classList.add("mnf-js");
  let ticking = false;
  function update(){
    ticking = false;
    const vh = innerHeight, line = vh * 0.62, r = list.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (line - r.top) / r.height));
    list.style.setProperty("--p", p.toFixed(3));
    beats.forEach(b => b.classList.toggle("is-lit", b.getBoundingClientRect().top < line));
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive:true });
  addEventListener("resize", update);
  update();
})();

const heroSlides = document.querySelectorAll(".hero-slide");
const loadSlides = () => heroSlides.forEach(img => { if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute("data-src"); } });
if (document.readyState === "complete") loadSlides(); else addEventListener("load", loadSlides);
if (heroSlides.length > 1) {
  let hi = 0;
  setInterval(() => {
    heroSlides[hi].classList.remove("is-active");
    hi = (hi + 1) % heroSlides.length;
    heroSlides[hi].classList.add("is-active");
  }, 4800);
}

/* REELS — hold the download until the section is reached.
   Observe the section, not each video: they sit in a horizontally
   scrolling deck whose overflow clips per-element intersection. */
(function(){
  const section = document.getElementById('media');
  const reels = document.querySelectorAll('video[data-reel]');
  if (!section || !reels.length) return;
  let loaded = false;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!loaded) {
          loaded = true;
          reels.forEach(v => { v.preload = 'auto'; v.load(); });
        }
        reels.forEach(v => v.play().catch(() => {}));
      } else {
        reels.forEach(v => v.pause());
      }
    });
  }, { rootMargin: '300px 0px' });
  io.observe(section);

  // Fallback: if the observer never reports, load on first scroll near the section.
  function nearby() {
    const r = section.getBoundingClientRect();
    return r.top < innerHeight + 300 && r.bottom > -300;
  }
  function onScroll() {
    if (!nearby()) return;
    if (!loaded) { loaded = true; reels.forEach(v => { v.preload = 'auto'; v.load(); }); }
    reels.forEach(v => v.play().catch(() => {}));
    removeEventListener('scroll', onScroll);
  }
  addEventListener('scroll', onScroll, { passive: true });
})();

/* CASE STUDIES — accordion: one open at a time, charts replay on open */
(function(){
  const items = Array.from(document.querySelectorAll('[data-cs-item]'));
  if (!items.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function format(v, decimals, comma) {
    if (comma) return Math.round(v).toLocaleString('en-US');
    return decimals ? v.toFixed(decimals) : String(Math.round(v));
  }
  function animateNumber(el) {
    const target = parseFloat(el.dataset.target) || 0;
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const comma = el.dataset.comma === '1';
    if (reduce) { el.textContent = format(target, decimals, comma); return; }
    el.textContent = format(0, decimals, comma);
    const start = performance.now();
    const dur = 1400;
    (function tick(t){
      const p = Math.min(1, Math.max(0, (t - start) / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased, decimals, comma);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = format(target, decimals, comma);
    })(start);
  }
  function play(item) {
    const platforms = item.querySelectorAll('[data-cse-platform]');
    platforms.forEach(p => p.classList.remove('is-live'));
    void item.offsetWidth;
    platforms.forEach(p => p.classList.add('is-live'));
    item.querySelectorAll('.cse-n[data-target]').forEach(animateNumber);
  }
  function setOpen(item, on) {
    item.classList.toggle('is-open', on);
    item.querySelector('.cs-row').setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) item.querySelectorAll('[data-cse-platform]').forEach(p => p.classList.remove('is-live'));
  }

  items.forEach(item => {
    item.querySelector('.cs-row').addEventListener('click', () => {
      if (item.classList.contains('is-open')) { setOpen(item, false); return; }
      const prev = items.find(i => i.classList.contains('is-open'));
      // When a study above collapses, the row you tapped would slide up out of view.
      // Glide to where it will land so the reader stays in place.
      let shift = 0;
      if (prev && (prev.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        shift = prev.querySelector('.cs-panel').getBoundingClientRect().height;
      }
      if (prev) setOpen(prev, false);
      setOpen(item, true);
      const navH = (document.querySelector('nav') || {}).offsetHeight || 80;
      const top = item.getBoundingClientRect().top;
      const landing = top - shift;
      if (shift || landing > innerHeight * 0.45 || landing < navH) {
        scrollTo({ top: scrollY + landing - navH - 12, behavior: reduce ? 'auto' : 'smooth' });
      }
      setTimeout(() => play(item), reduce ? 0 : 220);
    });
  });
})();


/* CASE STUDIES: count-ups for the stats strip and the study KPIs */
(function(){
  const sec = document.getElementById("case-studies");
  if (!sec) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (v, dec, comma) => comma ? Math.round(v).toLocaleString("en-US") : (dec ? v.toFixed(dec) : String(Math.round(v)));
  function countUp(el, target, dec, pre, suf, comma){
    if (reduce) return;
    const T = 1600; let t0 = null;
    requestAnimationFrame(function f(t){ if (t0 === null) t0 = t;
      const k = Math.min(1, Math.max(0, (t - t0) / T)), e = 1 - Math.pow(1 - k, 4);
      el.textContent = pre + fmt(target * e, dec, comma) + suf; if (k < 1) requestAnimationFrame(f); });
  }
  // stats strip
  if (!reduce) sec.querySelectorAll(".csx-stat b[data-count]").forEach(b => { b.textContent = fmt(0, +(b.dataset.dec || 0), false) + (b.dataset.suf || ""); });
  // row KPIs: parse "+17,100%", "3.4×", "1.7M", "5,100+"
  sec.querySelectorAll(".cs-row-kpi-v").forEach(v => {
    const m = v.textContent.trim().match(/^([+]?)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    v.dataset.pre = m[1]; v.dataset.num = m[2].replace(/,/g, ""); v.dataset.suf = m[3];
    v.dataset.dec = (m[2].split(".")[1] || "").length; v.dataset.comma = m[2].includes(",") ? "1" : "";
    if (!reduce) v.textContent = m[1] + fmt(0, +v.dataset.dec, v.dataset.comma) + m[3];
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; io.unobserve(el);
    if (el.classList.contains("csx-row")) {
      el.classList.add("in");
      const v = el.querySelector(".cs-row-kpi-v");
      if (v && v.dataset.num) setTimeout(() => countUp(v, +v.dataset.num, +v.dataset.dec, v.dataset.pre, v.dataset.suf, v.dataset.comma), 200);
    } else {
      countUp(el, +el.dataset.count, +(el.dataset.dec || 0), "", el.dataset.suf || "", false);
    }
  }), { threshold: 0.35 });
  sec.querySelectorAll(".csx-stat b[data-count]").forEach(b => io.observe(b));
  sec.querySelectorAll(".cs-list").forEach(list => list.querySelectorAll(".csx-row").forEach((r, i) => {
    r.style.transitionDelay = (i * 90) + "ms"; io.observe(r);
  }));
})();


/* PROGRAM: assemble the map / pop the pillar chips / count the facts */
(function(){
  const map = document.getElementById("pkgMap");
  if (!map) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  map.querySelectorAll(".ring-slot").forEach((el, i) => el.style.setProperty("--i", i));
  map.querySelectorAll(".ring-group").forEach((g, gi) => {
    const lab = g.querySelector(".ring-label");
    if (lab) { lab.style.setProperty("--g", gi); lab.querySelector("span").dataset.n = g.querySelectorAll(".ring-slot").length; }
    g.querySelectorAll(".ring-node").forEach((n, j) => n.style.setProperty("--j", j));
  });
  if (reduce || !("IntersectionObserver" in window)) return;
  map.classList.add("pkg-anim");
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("go"); io.unobserve(e.target);
  }), { threshold: 0.25 });
  io.observe(map);
  map.querySelectorAll(".ring-group").forEach(g => io.observe(g));
  // facts count up
  const sec = document.getElementById("packages");
  const fio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; fio.unobserve(e.target);
    const b = e.target, target = +b.dataset.pc; if (!target) return;
    const suf = b.dataset.suf || ""; let t0 = null; b.textContent = "0" + suf;
    requestAnimationFrame(function f(t){ if (t0 === null) t0 = t;
      const k = Math.min(1, Math.max(0, (t - t0) / 1200)); b.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(f); });
  }), { threshold: 0.6 });
  sec.querySelectorAll(".pkg-fact b[data-pc]").forEach(b => fio.observe(b));
})();


/* PROGRAM MAP: a spotlight walks around the ring, one service at a time */
(function(){
  const map = document.getElementById("pkgMap");
  if (!map || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const wide = matchMedia("(min-width:1081px)");
  const slots = Array.from(map.querySelectorAll(".ring-slot"));
  // walk clockwise by angle
  slots.sort((a, b) => (parseFloat(a.style.getPropertyValue("--a")) - parseFloat(b.style.getPropertyValue("--a"))));
  let idx = -1, timer = null, visible = false, hovering = false;
  function step(){
    if (idx >= 0) slots[idx].classList.remove("lit");
    idx = (idx + 1) % slots.length;
    slots[idx].classList.add("lit");
  }
  function sync(){
    const run = visible && !hovering && wide.matches && map.classList.contains("go");
    if (run && !timer) { timer = setInterval(step, 1300); }
    if (!run && timer) { clearInterval(timer); timer = null; if (idx >= 0) slots[idx].classList.remove("lit"); }
  }
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; setTimeout(sync, visible ? 2600 : 0); }), { threshold: 0.3 }).observe(map);
  map.addEventListener("mouseenter", () => { hovering = true; sync(); });
  map.addEventListener("mouseleave", () => { hovering = false; sync(); });
  wide.addEventListener("change", sync);
})();


/* CASE STUDY LOOPS: build cards from each study, loop them, open the study on tap */
(function(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const plus = '<svg viewBox="0 0 12 12" width="11" height="11"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>';
  document.querySelectorAll(".csl").forEach(loop => {
    const track = loop.querySelector(".csl-track");
    const rev = Array.from(document.querySelectorAll(".cs-group-rev .cs-item"));
    const eng = Array.from(document.querySelectorAll(".cs-group-eng .cs-item"));
    const items = [];
    for (let k = 0; k < Math.max(rev.length, eng.length); k++) { if (rev[k]) items.push(rev[k]); if (eng[k]) items.push(eng[k]); }
    const make = (item, clone) => {
      const row = item.querySelector(".cs-row");
      const brand = row.querySelector(".cs-row-brand").textContent, sub = row.querySelector(".cs-row-sub").textContent;
      const v = row.querySelector(".cs-row-kpi-v"), l = row.querySelector(".cs-row-kpi-l").textContent;
      const val = v.dataset.num ? (v.dataset.pre + (v.dataset.comma ? (+v.dataset.num).toLocaleString("en-US") : v.dataset.num) + v.dataset.suf) : v.textContent;
      const isRev = !!item.closest(".cs-group-rev");
      const tag = isRev ? T.rev : T.eng;
      const b = document.createElement("button");
      b.type = "button"; b.className = "csl-card " + (isRev ? "csl-rev" : "csl-eng");
      b.setAttribute("aria-controls", row.getAttribute("aria-controls"));
      b.setAttribute("aria-label", brand + " " + sub + ": " + val + " " + l + ". " + T.open);
      if (clone) { b.setAttribute("aria-hidden", "true"); b.tabIndex = -1; }
      b.innerHTML = '<img src="' + row.dataset.img + '" alt="" loading="lazy"><span class="csl-tag">' + tag + '</span>' +
        '<span class="csl-body"><span class="csl-v">' + val + '</span><span class="csl-l">' + l + '</span>' +
        '<span class="csl-brand">' + brand + '</span><span class="csl-sub">' + sub + '</span>' +
        '<span class="csl-more">' + T.see + ' <i>' + plus + '</i></span></span>';
      b.addEventListener("click", () => {
        if (loop.dataset.moved === "1") return;
        row.click();
        setTimeout(syncActive, 30);
      });
      return b;
    };
    items.forEach(it => track.appendChild(make(it, false)));
    // a title + close button inside each opened study, since the row itself is hidden
    items.forEach(it => {
      const body = it.querySelector(".cs-panel-body"), row = it.querySelector(".cs-row");
      if (!body || body.querySelector(".csx-close")) return;
      const t = document.createElement("h3"); t.className = "csx-ptitle";
      t.innerHTML = row.querySelector(".cs-row-brand").textContent + " <em>" + row.querySelector(".cs-row-sub").textContent + "</em>";
      const c = document.createElement("button"); c.type = "button"; c.className = "csx-close";
      c.innerHTML = T.close + ' <span aria-hidden="true">×</span>';
      c.addEventListener("click", () => { row.click(); setTimeout(syncActive, 30); loop.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); });
      body.prepend(t); body.prepend(c);
    });
    function syncActive(){
      document.querySelectorAll(".csl-card").forEach(card => {
        const it = document.getElementById(card.getAttribute("aria-controls"));
        card.classList.toggle("is-active", !!(it && it.closest(".cs-item").classList.contains("is-open")));
      });
    }
    if (reduce || !track.animate) { loop.style.overflowX = "auto"; return; }
    // fill the loop: clone the set until it is wide enough to never run dry
    const originals = Array.from(track.children);
    const setW = () => originals[originals.length - 1].offsetLeft + originals[originals.length - 1].offsetWidth - originals[0].offsetLeft + 20;
    let w = setW(); const need = innerWidth * 2 + w;
    while (track.scrollWidth < need) originals.forEach(it => track.appendChild(make(items[originals.indexOf(it)], true)));
    const dir = loop.dataset.dir === "right" ? 1 : -1;
    let anim = null;
    const speed = speedEaser(() => anim);
    function build(){
      w = setW();
      if (anim) anim.cancel();
      const from = dir > 0 ? -w : 0, to = dir > 0 ? 0 : -w;
      anim = track.animate([{ transform: "translate3d(" + from + "px,0,0)" }, { transform: "translate3d(" + to + "px,0,0)" }],
        { duration: w / 38 * 1000, iterations: Infinity, easing: "linear" });
      anim.playbackRate = speed.rate;
    }
    build();
    whileVisible(loop, () => anim.play(), () => anim.pause());
    let hover = false;
    loop.addEventListener("mouseenter", () => { hover = true; speed.set(0); });
    loop.addEventListener("mouseleave", () => { hover = false; speed.set(1); });
    // touch: hold to pause, swipe to scrub
    let sx = 0, st = 0, dragging = false;
    loop.addEventListener("pointerdown", e => { dragging = true; loop.dataset.moved = ""; sx = e.clientX; st = anim.currentTime || 0; speed.set(0); });
    addEventListener("pointermove", e => {
      if (!dragging) return; const dx = e.clientX - sx;
      if (Math.abs(dx) > 6) loop.dataset.moved = "1";
      const dur = w / 38 * 1000; anim.currentTime = ((st - dx * dir / 38 * 1000) % dur + dur) % dur;
    });
    const endDrag = () => { if (!dragging) return; dragging = false; speed.set(hover ? 0 : 1); setTimeout(() => { loop.dataset.moved = ""; }, 50); };
    addEventListener("pointerup", endDrag); addEventListener("pointercancel", endDrag);
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  });
})();




/* PROGRAM, PHONE + TABLET: step through what's included, card by card, to the Full House finale */
(function(){
  const loop = document.getElementById("svcLoop");
  if (!loop) return;
  const cards = Array.from(loop.querySelectorAll(".svc-card"));
  const prev = document.querySelector(".svc-prev"), next = document.querySelector(".svc-next");
  const now = document.getElementById("svcNow"), bars = document.getElementById("svcBars");
  let last = null;
  cards.forEach(c => {
    const tag = c.querySelector(".svc-tag"), i = document.createElement("i");
    const g = tag ? tag.textContent : T.full;
    if (last !== null && g !== last) i.className = "gap";
    last = g; bars.appendChild(i);
  });
  const segs = bars.children;
  let cur = -1;
  function show(i){
    if (i === cur) return; cur = i;
    cards.forEach((c, k) => c.classList.toggle("is-cur", k === i));
    Array.from(segs).forEach((s, k) => s.classList.toggle("on", k <= i));
    const tag = cards[i].querySelector(".svc-tag");
    now.textContent = tag ? tag.textContent : T.full;
    prev.disabled = i === 0; next.disabled = i === cards.length - 1;
  }
  function go(i){
    i = Math.max(0, Math.min(cards.length - 1, i));
    const c = cards[i];
    loop.scrollTo({ left: c.offsetLeft - (loop.clientWidth - c.offsetWidth) / 2, behavior: REDUCE ? "auto" : "smooth" });
    show(i);
  }
  prev.addEventListener("click", () => go(cur - 1));
  next.addEventListener("click", () => go(cur + 1));
  let t;
  loop.addEventListener("scroll", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const mid = loop.scrollLeft + loop.clientWidth / 2; let best = 0, bd = 1e9;
      cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      show(best);
    }, 60);
  }, { passive: true });
  cards.forEach((c, k) => c.addEventListener("click", e => { if (k !== cur && !e.target.closest("a")) go(k); }));
  show(0);
})();

/* TESTIMONIALS — always-moving, looping card wall (Web Animations API) */
(function(){
  const vp = document.getElementById('tstViewport');
  const track = document.getElementById('tstTrack');
  if (!vp || !track || !track.animate) return;
  const section = document.getElementById('testimonials');
  const originals = Array.from(track.children);
  // two extra copies so the loop never runs dry, even on very wide screens
  for (let k = 0; k < 2; k++) originals.forEach(c => {
    const d = c.cloneNode(true);
    d.setAttribute('aria-hidden', 'true');
    track.appendChild(d);
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 42;          // px per second
  const HOVER_RATE = 0;      // stops while a card is hovered, so the review is easy to read and tap
  let setW = 1, dur = 1, anim = null;

  const measure = () => {
    setW = Math.max(1, track.children[originals.length].offsetLeft - originals[0].offsetLeft);
    dur = setW / SPEED * 1000;
  };
  const getPx = () => anim ? ((anim.currentTime || 0) % dur) / dur * setW : 0;
  const setPx = px => { px = ((px % setW) + setW) % setW; anim.currentTime = px / setW * dur; };

  function build() {
    const keep = anim ? getPx() / setW : 0;
    measure();
    if (anim) anim.cancel();
    anim = track.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(' + (-setW) + 'px,0,0)' }],
      { duration: dur, iterations: Infinity, easing: 'linear' });
    anim.currentTime = keep * dur;
    anim.playbackRate = speed.rate;
    if (reduce || dragging) anim.pause();
  }

  // ease the speed between full and hover rate; pause entirely while off-screen
  const speed = speedEaser(() => anim);
  track.addEventListener('mouseover', e => { if (e.target.closest('.tst-card')) speed.set(HOVER_RATE); });
  track.addEventListener('mouseleave', () => speed.set(1));
  const modalOpen = () => { const m = document.getElementById('tstModal'); return m && !m.hidden; };
  whileVisible(vp, () => { if (anim && !reduce && !dragging && !modalOpen()) anim.play(); }, () => { if (anim) anim.pause(); });

  // drag (mouse) and horizontal swipe (touch); vertical page scrolling still works
  let dragging = false, startX = 0, startPx = 0, moved = false;
  vp.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; moved = false; startX = e.clientX; startPx = getPx();
    anim.pause();
  });
  vp.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 4) {
      moved = true; vp.classList.add('is-dragging');
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (moved) setPx(startPx - dx);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; vp.classList.remove('is-dragging');
    if (!reduce) anim.play();
  };
  vp.addEventListener('pointerup', end);
  vp.addEventListener('pointercancel', end);
  vp.addEventListener('lostpointercapture', end);
  vp.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  // arrows / keys: glide to the next or previous card, then keep moving
  let gliding = 0;
  function step(dir) {
    const base = originals[0].offsetLeft;
    const lefts = originals.map(c => c.offsetLeft - base);
    const from = getPx();
    let to = dir > 0 ? lefts.find(x => x > from + 8) : lefts.slice().reverse().find(x => x < from - 8);
    if (to === undefined) to = dir > 0 ? setW : lefts[lefts.length - 1] - setW;
    const id = ++gliding, t0 = performance.now(), T = reduce ? 0 : 650;
    anim.pause();
    (function frame(now) {
      if (id !== gliding) return;
      const k = T ? Math.min(1, (now - t0) / T) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      setPx(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(frame); else if (!reduce && !dragging) anim.play();
    })(t0);
  }
  const nextBtn = section && section.querySelector('.tst-next');
  const prevBtn = section && section.querySelector('.tst-prev');
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));
  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  vp.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
  });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
  addEventListener('load', build);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  build();
})();

/* REVIEWS: preview + full review pop-up (works for cloned cards too) */
(function(){
  const track = document.getElementById("tstTrack"), modal = document.getElementById("tstModal");
  if (!track || !modal) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function markFull(){
    track.querySelectorAll(".tst-card").forEach(c => {
      const q = c.querySelector(".tst-quote");
      c.classList.toggle("is-full", q.scrollHeight <= q.clientHeight + 2);
    });
  }
  let lastFocus = null;
  function open(card){
    lastFocus = document.activeElement;
    document.getElementById("tstModalLogos").innerHTML = card.querySelector(".tst-logos").innerHTML;
    document.getElementById("tstModalQ").textContent = card.querySelector(".tst-quote").textContent;
    document.getElementById("tstModalAttr").innerHTML = card.querySelector(".tst-attr").innerHTML;
    modal.hidden = false;
    track.getAnimations().forEach(a => a.pause());
    if (window.__lenis) window.__lenis.stop();
    modal.querySelector(".tst-modal-x").focus();
  }
  function close(){
    modal.hidden = true;
    if (!reduce) track.getAnimations().forEach(a => a.play());
    if (window.__lenis) window.__lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  track.addEventListener("click", e => {
    const b = e.target.closest(".tst-more, .tst-quote");
    const card = b && b.closest(".tst-card");
    if (card && !card.classList.contains("is-full")) { e.preventDefault(); open(card); }
  });
  modal.addEventListener("click", e => { if (e.target.closest("[data-close]")) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) close(); });
  addEventListener("load", markFull);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markFull);
  addEventListener("resize", markFull);
  markFull();
})();


/* MEDIA — segmented control picks one discipline; rows track swipe progress */
(function(){
  const tabs = Array.from(document.querySelectorAll('.deck-tab'));
  const pill = document.querySelector('.deck-tabs-pill');
  const panels = document.querySelectorAll('[data-deck-panel]');
  if (!tabs.length) return;
  function placePill(){
    const t = tabs.find(x => x.classList.contains('is-active'));
    if (!t || !pill) return;
    pill.style.width = t.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + t.offsetLeft + 'px)';
  }
  function track(deck){
    const bar = deck.parentElement.querySelector('.deck-progress');
    if (!bar || !deck.scrollWidth) return;
    const seen = (deck.scrollLeft + deck.clientWidth) / deck.scrollWidth;
    bar.style.setProperty('--p', Math.min(1, seen).toFixed(3));
  }
  function select(key){
    tabs.forEach(t => {
      const on = t.dataset.deck === key;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(p => {
      const on = p.dataset.deckPanel === key;
      p.classList.toggle('is-active', on);
      p.classList.remove('is-entering');
      if (on) {
        p.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
        p.classList.add('on');
        void p.offsetWidth; p.classList.add('is-entering');
        const deck = p.querySelector('.deck');
        if (deck) { deck.scrollLeft = 0; track(deck); }
      }
    });
    placePill();
  }
  tabs.forEach(t => t.addEventListener('click', () => select(t.dataset.deck)));
  document.querySelectorAll('#media .deck').forEach(deck => {
    deck.addEventListener('scroll', () => track(deck), { passive: true });
    track(deck);
  });
  placePill();
  addEventListener('resize', () => { placePill(); document.querySelectorAll('#media .deck').forEach(track); });
  addEventListener('load', () => document.querySelectorAll('#media .deck').forEach(track));
  if (document.fonts) document.fonts.ready.then(placePill);
})();

/* MEDIA — pause off-screen videos to save bandwidth/CPU */
(function(){
  const videos = document.querySelectorAll('#media .deck-video-item video');
  if (!videos.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { threshold: 0.25 });
  videos.forEach(v => io.observe(v));
})();

/* FULL HOUSE MAP — start each arrow on its pill's outline, end on the inner orbit */
(function(){
  const slots = document.querySelectorAll('.ring-slot');
  if (!slots.length) return;
  const TIP = 148; // radius of .ring-orbit-c, where every arrowhead lands
  function fit(){
    slots.forEach(slot => {
      const node = slot.querySelector('.ring-node');
      const a = parseFloat(slot.style.getPropertyValue('--a')) * Math.PI / 180;
      const r = parseFloat(slot.style.getPropertyValue('--r'));
      const R = node.offsetHeight / 2;               // radius of the pill's round ends
      const L = Math.max(0, node.offsetWidth / 2 - R); // half its straight run
      const dx = Math.abs(Math.sin(a)), dy = Math.abs(Math.cos(a));
      // distance from the pill's centre to its outline along the arrow
      let gap = dy ? R / dy : Infinity;
      if (gap * dx > L) gap = L * dx + Math.sqrt(Math.max(0, R * R - L * L * dy * dy));
      slot.style.setProperty('--gap', gap.toFixed(1) + 'px');
      slot.style.setProperty('--arrow', Math.max(0, r - gap - TIP).toFixed(1) + 'px');
    });
  }
  fit();
  addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);
})();

/* ---------- MOTION LAYER ---------- */
/* ===================== MOTION LAYER ===================== */
(function(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const hero = document.getElementById("hero");
  hero.querySelectorAll(".hero-svcs li:not(.svc-br)").forEach((li, i) => li.style.setProperty("--i", i));
  if (reduce) { hero.classList.add("ready"); return; }
  setTimeout(() => { hero.classList.add("ready"); const h = hero.querySelector("h1"); if (h) h.classList.add("words-in"); }, 2500);

  /* 1. Split headlines into words */
  const heads = document.querySelectorAll("#hero h1, #clients h2, .csx-title, .vsl-headline, #testimonials .tst-title, .mnf-title, .abt-title, #media h2, .pkg-title, #team h2, .faq-title, .clo-lede, .mnf-closer");
  heads.forEach(el => {
    let i = 0;
    (function walk(node){
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span"); w.className = "w";
            const wi = document.createElement("span"); wi.className = "wi"; wi.textContent = part;
            wi.style.setProperty("--i", i++); w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    })(el);
    el.classList.add("split");
  });

  /* 2. Media unveil */
  const clips = document.querySelectorAll(".abt-media, .deck-item");
  clips.forEach(el => el.classList.add("clip"));
  document.querySelectorAll(".deck").forEach(deck =>
    deck.querySelectorAll(".deck-item").forEach((el, i) => el.style.setProperty("--cd", (i % 8) * 70 + "ms")));

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add(e.target.classList.contains("split") ? "words-in" : "in");
    io.unobserve(e.target);
  }), { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  heads.forEach(el => { if (!el.closest("#hero")) io.observe(el); });
  clips.forEach(el => io.observe(el));
  /* deck tabs reveal hidden panels later: unveil them when they open */
  document.querySelectorAll("[data-deck-panel]").forEach(panel => new MutationObserver(() => {
    if (panel.classList.contains("is-active")) panel.querySelectorAll(".clip").forEach(c => requestAnimationFrame(() => c.classList.add("in")));
  }).observe(panel, { attributes: true, attributeFilter: ["class"] }));

  /* 3. Hero entrance */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero.querySelector("h1").classList.add("words-in");
    hero.classList.add("ready");
  }));

  /* 4. Scroll: progress bar + hero drifts away */
  const bar = document.getElementById("scrollbar");
  const heroContent = hero.querySelector(".hero-content");
  let ticking = false;
  function onScroll(){
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
    const y = scrollY, h = hero.offsetHeight;
    if (y < h) {
      heroContent.style.transform = "translateY(" + (y * 0.28) + "px)";
      heroContent.style.opacity = Math.max(0, 1 - y / (h * 0.75));
    }
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  if (!fine) return;

  /* 5. Magnetic buttons */
  document.querySelectorAll(".hero-btn, .clo-btn, .pill").forEach(btn => {
    btn.classList.add("magnetic");
    btn.addEventListener("mousemove", ev => {
      const r = btn.getBoundingClientRect();
      const x = (ev.clientX - r.left - r.width / 2) * 0.22, y = (ev.clientY - r.top - r.height / 2) * 0.3;
      btn.style.transform = "translate(" + x + "px," + y + "px)";
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });

  /* 6. Smooth scrolling */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    window.__lenis = lenis;
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener("click", ev => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      lenis.scrollTo(target, { offset: -70, duration: 1.4 });
    }));
  }
})();

})();
