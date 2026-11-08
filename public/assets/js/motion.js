/* =========================================================
   Out of Africa · motion
   Intro reveal, page curtains, split headlines, image unveils,
   gallery-light card tilt, custom cursor, parallax, magnetic buttons.
   Everything switches off for people who prefer reduced motion.
   ========================================================= */
(function () {
  "use strict";
  var doc = document.documentElement;
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(pointer: fine)").matches;
  if (REDUCED) { doc.classList.add("motion-off"); return; }
  doc.classList.add("motion");
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ------------------------------------------------ intro + page curtain */
  var first = !ss("oa_seen");
  var curtain = document.createElement("div");
  curtain.className = "oa-curtain" + (first ? " is-intro" : "");
  curtain.setAttribute("aria-hidden", "true");
  curtain.innerHTML = first
    ? '<div class="oa-intro"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path class="d1" d="M9.5 34V17.5a10.5 10.5 0 0 1 21 0V34" stroke-width="1.6"/><path class="d2" d="M20 30.5c-4.4-3.7-5-9.4 0-15 5 5.6 4.4 11.3 0 15Z" stroke-width="1.4"/><path class="d3" d="M20 30.5v-9.5" stroke-width="1.1"/><path class="d4" d="M5 34h30" stroke-width="1.6"/></svg><p><span>OUT</span> <em>of</em> <span>AFRICA</span></p><small>Art from across a continent</small></div>'
    : "";
  document.body.appendChild(curtain);
  function lift() {
    setTimeout(function () { curtain.classList.add("is-up"); doc.classList.add("is-ready"); }, first ? 1650 : 60);
    setTimeout(function () { curtain.classList.add("is-gone"); }, first ? 2600 : 900);
    ss("oa_seen", "1");
  }
  if (document.readyState === "complete") lift(); else window.addEventListener("load", lift);
  setTimeout(function () { if (!curtain.classList.contains("is-up")) lift(); }, 3500);   // never block the page

  // leaving: curtain drops, then navigate
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var href = a.getAttribute("href");
    if (a.target === "_blank" || a.hasAttribute("download") || /^(mailto:|tel:|https?:|#|javascript:)/i.test(href) && !(href.indexOf(location.origin) === 0)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (url.pathname.indexOf("/admin") === 0) return;
    e.preventDefault();
    curtain.classList.remove("is-gone", "is-intro"); curtain.innerHTML = "";
    void curtain.offsetWidth;
    curtain.classList.remove("is-up"); curtain.classList.add("is-down");
    setTimeout(function () { location.href = url.href; }, 520);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) { curtain.classList.remove("is-down"); curtain.classList.add("is-up", "is-gone"); } });

  /* ------------------------------------------------ split headlines into words */
  function split(el) {
    if (el.__split) return; el.__split = true;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim() && !(n.parentNode.closest && n.parentNode.closest("svg"))) nodes.push(n);
    var k = 0;
    nodes.forEach(function (t) {
      var frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span"); w.className = "w";
        var i = document.createElement("span"); i.className = "wi"; i.textContent = part; i.style.setProperty("--i", k++);
        w.appendChild(i); frag.appendChild(w);
      });
      t.parentNode.replaceChild(frag, t);
    });
    el.classList.add("split");
  }

  /* ------------------------------------------------ reveal on scroll */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { var t = en.target; t.classList.add("in"); io.unobserve(t); if (t.classList.contains("m-unveil")) setTimeout(function () { t.classList.add("done"); }, 1700); } });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });

  function tag(el, cls) { if (el.__m) return; el.__m = 1; el.classList.add(cls); io.observe(el); }
  function scan(root) {
    root = root || document;
    $$("[data-split], main h2, main h1", root).forEach(function (h) { if (h.closest("[data-hero]") && !h.hasAttribute("data-split")) return; split(h); tag(h, "m-words"); });
    // images unveil like a cloth pulled off a sculpture
    $$("main [data-img], main a[href*='artwork.html'] > div:first-child, main .aspect-\\[4\\/5\\], main .aspect-\\[3\\/4\\]", root).forEach(function (el) { if (el.closest("[data-hero]")) return; if (el.querySelector("img")) tag(el, "m-unveil"); });
    // text blocks and cards rise in, staggered within their row
    $$("main section p, main section ul > li, main section dl, main .grid > a, main .grid > li, main .grid > div", root).forEach(function (el, idx) {
      if (el.closest("[data-hero]") || el.closest(".m-words") || el.__m) return;
      if (el.offsetHeight > innerHeight * 0.9 || el.querySelector(".grid")) return;   // layout columns stay put; their contents animate
      el.style.setProperty("--s", (idx % 4) * 70 + "ms"); tag(el, "m-rise");
    });
    // gallery light on artwork cards
    if (FINE) $$("main a[href*='artwork.html']", root).forEach(function (a) { if (!a.__tilt && a.querySelector("img")) tilt(a); });
    $$("[data-countup]", root).forEach(count);
  }

  /* ------------------------------------------------ card tilt + spotlight */
  function tilt(card) {
    card.__tilt = 1;
    var media = card.querySelector("div") || card;
    media.classList.add("m-tilt");
    var glare = document.createElement("span"); glare.className = "m-glare"; media.appendChild(glare);
    var raf;
    card.addEventListener("pointermove", function (e) {
      var r = media.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        media.style.transform = "perspective(900px) rotateY(" + ((x - .5) * 7) + "deg) rotateX(" + ((.5 - y) * 7) + "deg) scale(1.015)";
        glare.style.background = "radial-gradient(420px circle at " + (x * 100) + "% " + (y * 100) + "%, rgba(255,240,210,.28), transparent 45%)";
        glare.style.opacity = 1;
      });
    });
    card.addEventListener("pointerleave", function () { cancelAnimationFrame(raf); media.style.transform = ""; glare.style.opacity = 0; });
  }

  /* ------------------------------------------------ counters */
  function count(el) {
    if (el.__c) return; el.__c = 1;
    var end = Number(el.getAttribute("data-countup")) || 0;
    var o = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function step(t) { var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e); if (p < 1) requestAnimationFrame(step); })(t0);
    });
    o.observe(el);
  }

  /* ------------------------------------------------ rotating word */
  function rotator(el) {
    var words = $$("span", el), i = 0; if (words.length < 2) return;
    function fit() { el.style.width = words[i].offsetWidth + "px"; }
    el.style.transition = "width .6s cubic-bezier(.7,0,.2,1)";
    words[0].classList.add("on"); fit();
    setInterval(function () {
      words[i].classList.remove("on"); words[i].classList.add("off");
      var prev = words[i]; setTimeout(function () { prev.classList.remove("off"); }, 700);
      i = (i + 1) % words.length; words[i].classList.add("on"); fit();
    }, 2200);
  }

  /* ------------------------------------------------ custom cursor */
  function cursor() {
    if (!FINE) return;
    var dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "oa-dot"; ring.className = "oa-ring"; ring.innerHTML = "<span></span>";
    document.body.appendChild(dot); document.body.appendChild(ring);
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, shown = false;
    addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; doc.classList.add("cursor-on"); }
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      var t = e.target.closest ? e.target : null;
      var art = t && t.closest("a[href*='artwork.html'], [data-hero-wall], .hero-seal");
      var link = t && t.closest("a, button, [role='button'], select, label");
      var label = art ? (t.closest(".hero-seal") ? "Explore" : t.closest("[data-hero-wall]") ? "" : "View") : "";
      ring.className = "oa-ring" + (label ? " is-view" : link ? " is-link" : "") + (t && t.closest("[data-hero-wall]") ? " is-wall" : "");
      ring.firstChild.textContent = label;
    }, { passive: true });
    addEventListener("pointerdown", function () { ring.classList.add("is-press"); });
    addEventListener("pointerup", function () { ring.classList.remove("is-press"); });
    document.addEventListener("mouseleave", function () { doc.classList.remove("cursor-on"); shown = false; });
    (function loop() { rx += (mx - rx) * .16; ry += (my - ry) * .16; ring.style.transform = "translate(" + rx + "px," + ry + "px)"; requestAnimationFrame(loop); })();
  }

  /* ------------------------------------------------ magnetic buttons */
  function magnetic() {
    if (!FINE) return;
    $$("[data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) { var r = b.getBoundingClientRect(); b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .22) + "px," + ((e.clientY - r.top - r.height / 2) * .3) + "px)"; });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ------------------------------------------------ scroll: parallax, header, hero wall */
  function scrollFx() {
    var header = document.querySelector("header.sticky"), last = 0, ticking = false;
    var hero = document.querySelector("[data-hero]"), wall = document.querySelector("[data-hero-wall]");
    var px = $$("main [data-img]").filter(function (el) { return !el.closest("[data-hero]") && el.offsetHeight > 260; });
    px.forEach(function (el) { el.classList.add("m-par"); });
    function frame() {
      ticking = false;
      var y = scrollY;
      if (header) { header.classList.toggle("is-scrolled", y > 10); header.classList.toggle("is-hidden", y > 400 && y > last + 2); if (y < last - 2) header.classList.remove("is-hidden"); }
      last = y;
      if (hero && wall && y < hero.offsetHeight) { wall.style.setProperty("--sy", y * .25 + "px"); hero.style.setProperty("--hy", y); }
      var vh = innerHeight;
      px.forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh; var im = el.querySelector("img"); if (im) im.style.transform = "translateY(" + (p * -8) + "%) scale(1.16)";
      });
    }
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    frame();
    // hero wall follows the cursor a little, like walking past a gallery wall
    if (hero && wall && FINE) hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(); wall.style.setProperty("--mx", ((e.clientX - r.left) / r.width - .5).toFixed(3)); wall.style.setProperty("--my", ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
  }

  /* ------------------------------------------------ boot */
  function boot() {
    scan(document);
    $$("[data-rotator]").forEach(rotator);
    cursor(); magnetic(); scrollFx();
    // content rendered later by app.js (grids, filters, profiles) gets animated too
    var main = document.querySelector("main");
    if (main) {
      var t; new MutationObserver(function () { clearTimeout(t); t = setTimeout(function () { scan(main); }, 60); }).observe(main, { childList: true, subtree: true });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 30); }); else setTimeout(boot, 30);
})();
