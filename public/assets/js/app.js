/* =========================================================
   Out of Africa · site script
   Content lives in data.js, settings in config.js.
   You should not need to edit this file.
   ========================================================= */
(function () {
  "use strict";

  var S = window.SITE || {};
  var ARTISTS = window.ARTISTS || [];
  var ALL = window.ARTWORKS || [];
  var WORKS = [];
  var API = false;                       // true once the live catalogue has loaded
  var PAGE = document.body.getAttribute("data-page");
  function useData(site, artists, artworks) {
    S = site || S; ARTISTS = artists || ARTISTS; ALL = artworks || ALL;
    if (S.social === undefined) S.social = {};
    WORKS = ALL.filter(function (w) { return S.showDrafts || !w.draft; });
  }
  useData();

  /* ---------------------------------------------------- helpers */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function param(n) { return new URLSearchParams(location.search).get(n); }
  function artist(id) { return ARTISTS.find(function (a) { return a.id === id; }); }
  function work(id) { return ALL.find(function (w) { return w.id === id && (S.showDrafts || !w.draft); }); }
  function worksBy(id) { return WORKS.filter(function (w) { return w.artist === id; }); }
  function disciplines(a) { return (a && (a.disciplines || (a.discipline ? [a.discipline] : []))) || []; }
  function first(name) { return String(name || "").split(" ")[0]; }
  function hasPrice(w) { return w.price !== null && w.price !== undefined && w.price !== ""; }
  function money(n) {
    if (n === null || n === undefined || n === "") return "Price on request";
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (S.currency || "USD");
  }
  function short$(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function store(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null"); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; }
  }
  var STATUS = { available: "Available", reserved: "Reserved", sold: "Sold", commission: "Made to order" };

  var I = {
    upRight: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
    right: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    left: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    chevR: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="CLS" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    arch: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="M9.5 34V17.5a10.5 10.5 0 0 1 21 0V34" stroke-width="1"/><path d="M20 30.5c-4.4-3.7-5-9.4 0-15 5 5.6 4.4 11.3 0 15Z" stroke-width="0.85"/><path d="M20 30.5v-9.5" stroke-width="0.7"/><path d="M5 34h30" stroke-width="1"/></svg>'
  };
  function icon(n, cls) { return I[n].replace("CLS", cls); }

  function img(src, alt, cls, dark) {
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="lazy" class="h-full w-full object-cover ' + (cls || "") + '">';
    return '<div class="flex h-full w-full items-center justify-center ' + (dark ? "bg-walnut-soft text-ivory/20" : "bg-sand text-walnut/30") + '">' + icon("arch", "h-16 w-16 md:h-20 md:w-20") + "</div>";
  }

  /* ---------------------------------------------------- bag */
  function bag() { var b = store("oa_bag") || []; return b.filter(function (id) { var w = work(id); return w && w.status !== "sold"; }); }
  function setBag(b) { store("oa_bag", b); updateBagCount(); }
  function inBag(id) { return bag().indexOf(id) > -1; }
  function addToBag(id) { var b = bag(); if (b.indexOf(id) === -1) b.push(id); setBag(b); }
  function removeFromBag(id) { setBag(bag().filter(function (x) { return x !== id; })); }
  function updateBagCount() {
    var n = bag().length;
    $$("[data-bag-count]").forEach(function (el) { el.textContent = n; el.classList.toggle("hidden", !n); el.classList.toggle("flex", !!n); });
  }

  /* ---------------------------------------------------- cards */
  function cardHTML(w) {
    var a = artist(w.artist) || {};
    var badge = w.status === "sold" ? '<span class="absolute left-3 top-3 bg-walnut px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ivory">Sold</span>'
      : w.status === "reserved" ? '<span class="absolute left-3 top-3 bg-ivory px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-walnut">Reserved</span>'
      : (w.category ? '<span class="absolute left-3 top-3 bg-ivory px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-walnut">' + esc(w.category) + "</span>" : "");
    var draft = w.draft ? '<span class="absolute bottom-3 left-3 bg-olive px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Draft</span>' : "";
    return '<a class="group flex h-full flex-col focus-visible:outline-offset-4" href="artwork.html?id=' + encodeURIComponent(w.id) + '">' +
      '<div class="relative aspect-[4/5] overflow-hidden bg-sand">' +
        '<div class="relative h-full w-full">' + img(w.images && w.images[0], w.alt || w.title, "transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none") + "</div>" +
        badge + draft +
        '<span class="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-ivory text-walnut opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">' + icon("upRight", "h-4 w-4") + "</span>" +
      "</div>" +
      '<div class="mt-3 flex flex-1 flex-col">' +
        '<h3 class="truncate text-[15px] font-medium text-walnut">' + esc(w.title) + "</h3>" +
        '<p class="truncate text-[13px] text-stone">' + esc(a.name || "") + "</p>" +
        '<p class="mt-auto pt-1.5 text-[14px] font-semibold text-walnut">' + (w.status === "sold" ? "Sold" : esc(money(w.price))) + "</p>" +
      "</div></a>";
  }

  function artistCardHTML(a) {
    var n = worksBy(a.id).length;
    var cover = a.portrait || ((worksBy(a.id).find(function (w) { return w.images && w.images.length; }) || {}).images || [])[0];
    return '<a class="group flex h-full flex-col" href="artist.html?id=' + encodeURIComponent(a.id) + '">' +
      '<div class="aspect-[4/5] overflow-hidden bg-walnut">' + img(cover, "Portrait of " + a.name, "transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none", true) + "</div>" +
      '<div class="mt-4 flex flex-1 flex-col">' +
        '<div class="flex items-baseline justify-between gap-3"><h3 class="font-display text-[28px] leading-tight text-walnut">' + esc(a.name) + "</h3>" + icon("upRight", "h-5 w-5 shrink-0 text-stone transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5") + "</div>" +
        '<p class="mt-1 text-sm text-stone">' + esc(disciplines(a).join(", ")) + " · " + plural(n, "work") + "</p>" +
        '<p class="mt-3 line-clamp-3 text-[15px] leading-relaxed text-walnut/85">' + esc(a.short || "") + "</p>" +
      "</div></a>";
  }

  function openCardHTML(o, num) {
    return '<a class="group flex h-full flex-col" href="for-artists.html?form=' + encodeURIComponent(o.form) + '#apply">' +
      '<div class="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-sand">' +
        '<div class="pointer-events-none absolute inset-3 border border-dashed border-walnut/35 transition-colors duration-200 ease-out group-hover:border-walnut/70"></div>' +
        '<span class="absolute left-5 top-5 bg-paper/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-walnut">Space ' + (num < 10 ? "0" : "") + num + "</span>" +
        '<span class="absolute right-5 top-5 bg-olive px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ivory">Open</span>' +
        icon("arch", "relative h-24 w-24 text-walnut/40 transition-opacity duration-200 ease-out group-hover:opacity-0 md:h-28 md:w-28") +
        '<span class="absolute inset-x-3 bottom-3 flex h-11 items-center justify-between bg-walnut px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory transition-[opacity,transform] duration-200 ease-out md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">Claim this space' + icon("upRight", "h-4 w-4") + "</span>" +
      "</div>" +
      '<div class="mt-4 flex flex-1 flex-col"><h3 class="font-accent text-[28px] italic leading-tight text-walnut/45">Your name here</h3><p class="mt-1 text-sm text-stone">Open to ' + esc(o.who) + '</p><p class="mt-3 line-clamp-3 text-[15px] leading-relaxed text-walnut/85">' + esc(o.text) + "</p></div></a>";
  }

  function wallItems() {
    var taken = {};
    ARTISTS.forEach(function (a) { disciplines(a).forEach(function (d) { taken[d.toLowerCase()] = 1; }); });
    var open = (S.openCall || []).filter(function (o) { return !taken[o.form.toLowerCase()]; });
    var total = Math.max(8, Math.ceil((ARTISTS.length + 1) / 4) * 4);
    open = open.slice(0, Math.max(0, total - ARTISTS.length));
    return { artists: ARTISTS, open: open };
  }
  function wallHTML(list) {
    var w = list || wallItems(), n = w.artists.length;
    return w.artists.map(artistCardHTML).join("") + w.open.map(function (o, i) { return openCardHTML(o, n + i + 1); }).join("");
  }

  /* ---------------------------------------------------- image pool */
  function pool() {
    var mains = [], extras = [];
    var ordered = WORKS.slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    ordered.forEach(function (w) { (w.images || []).forEach(function (src, i) { (i === 0 ? mains : extras).push({ src: src, alt: w.alt || w.title, work: w }); }); });
    return mains.concat(extras);
  }
  function fillImages() {
    var p = pool();
    var fw = featuredWork();
    var detail = fw && fw.images && fw.images[1] ? { src: fw.images[1], alt: "Detail of " + fw.title } : p[1];
    var map = { hero: p[0], feature: fw && fw.images && fw.images[0] ? { src: fw.images[0], alt: fw.alt || fw.title } : p[0], detail: detail, "feature-detail": detail || p[1],
      pov: p[2] || p[0], panel: p[3] || p[1], "artists-hero": p[1] || p[0], "story-1": p[2] || p[0], "story-2": p[3] || p[1], partner: p[4] || p[2], commission: p[5] || p[3] };
    $$("[data-img]").forEach(function (el) {
      var key = el.getAttribute("data-img"), fixed = (S.images || {})[key];
      var item = fixed ? { src: fixed, alt: "" } : (map[key] || (p.length ? p[0] : null));
      if (!item && (key === "hero" || key === "pov")) { el.innerHTML = ""; return; }
      el.innerHTML = img(item && item.src, item && item.alt, key === "hero" || key === "pov" ? "object-[70%_center]" : "", el.hasAttribute("data-dark"));
    });
  }
  function featuredWork() {
    return WORKS.find(function (w) { return w.featured && w.images && w.images.length && w.status !== "sold"; }) ||
           WORKS.find(function (w) { return w.featured && !w.draft; }) || WORKS.find(function (w) { return w.featured; }) || WORKS[0];
  }


  /* ---------------------------------------------------- hero wall */
  var HERO_WALL = [
    ["/media/2026-11/wall-painter-easel-a5kfvp.jpg", "Painting"], ["/media/2026-11/wall-woodcarver-fw5cs7.jpg", "Wood carving"],
    ["/media/2026-11/wall-beads-rm9tm7.jpg", "Beadwork"], ["/media/2026-11/wall-potter-y64aan.jpg", "Ceramics"],
    ["/media/2026-11/wall-textile-makers-rsc9zq.jpg", "Textiles"], ["/media/2026-11/wall-bronze-head-kwdffz.jpg", "Bronze"],
    ["/media/2026-11/wall-basket-weaver-gfmvu4.jpg", "Weaving"], ["/media/2026-11/wall-mural-painter-whccmb.jpg", "Murals"],
    ["/media/2026-11/wall-clay-pots-wu5tng.jpg", "Clay"], ["/media/2026-11/wall-wax-print-9cq2gc.jpg", "Wax print"],
    ["/media/2026-11/wall-painter-canvas-6vyjhe.jpg", "Painting"], ["/media/2026-11/wall-potters-mother-child-ab497x.jpg", "Pottery"],
    ["/media/2026-11/wall-woven-baskets-ww7ebp.jpg", "Basketry"], ["/media/2026-11/wall-wood-figure-kxubju.jpg", "Sculpture"]
  ];
  function buildHeroWall() {
    var wall = $("[data-hero-wall]"); if (!wall) return;
    var base = (S.heroWall && S.heroWall.length ? S.heroWall : HERO_WALL).map(function (x) { return { src: x[0], label: x[1] }; });
    var works = WORKS.filter(function (w) { return w.images && w.images.length; }).slice(0, 10).map(function (w) {
      var a = artist(w.artist) || {}; return { src: w.images[0], label: w.title, sub: [a.name, a.country].filter(Boolean).join(" · "), href: "artwork.html?id=" + encodeURIComponent(w.id) };
    });
    var mix = []; var i = 0, j = 0;
    while (i < base.length || j < works.length) { if (i < base.length) mix.push(base[i++]); if (i < base.length) mix.push(base[i++]); if (j < works.length) mix.push(works[j++]); }
    function tile(t) {
      return '<figure class="hero-tile"><img src="' + esc(t.src) + '" alt="" loading="eager" decoding="async"><figcaption><span>' + esc(t.label) + "</span>" + (t.sub ? "<em>" + esc(t.sub) + "</em>" : "") + "</figcaption></figure>";
    }
    var cols = [[], [], []]; mix.forEach(function (t, k) { cols[k % 3].push(t); });
    wall.innerHTML = cols.map(function (c, k) {
      var set = c.map(tile).join("");
      return '<div class="hero-col hero-col-' + (k + 1) + '"><div class="hero-track">' + set + set + "</div></div>";
    }).join("");
  }

  /* ---------------------------------------------------- layout */
  function initLayout() {
    var ann = $("[data-announcement]");
    if (ann && S.announcement) { ann.textContent = S.announcement; ann.classList.remove("hidden"); }
    if (S.showDrafts && ALL.some(function (w) { return w.draft; })) { var db = $("[data-draft-banner]"); if (db) db.classList.remove("hidden"); }
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    $$("[data-credit]").forEach(function (el) { el.textContent = S.credit || ""; });

    // footer contact
    var fc = $("[data-footer-contact]"), bits = [];
    if (S.email) bits.push('<a class="text-ivory underline underline-offset-4" href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a>");
    if (S.whatsapp) bits.push('<a class="text-ivory underline underline-offset-4" target="_blank" rel="noopener" href="' + waLink("Hello " + S.name + ", I have a question.") + '">WhatsApp</a>');
    if (S.social && S.social.instagram) bits.push('<a class="text-ivory underline underline-offset-4" target="_blank" rel="noopener" href="' + esc(S.social.instagram) + '">Instagram</a>');
    if (S.social && S.social.facebook) bits.push('<a class="text-ivory underline underline-offset-4" target="_blank" rel="noopener" href="' + esc(S.social.facebook) + '">Facebook</a>');
    if (fc && bits.length) fc.innerHTML = bits.join(' <span class="text-ivory/40">·</span> ') + '<br>Or use the <a href="contact.html" class="text-ivory underline underline-offset-4">contact form</a>.';

    var wa = $("[data-wa-float]");
    if (wa && S.whatsapp) { wa.href = waLink("Hello " + S.name + ", I have a question."); wa.classList.remove("hidden"); wa.classList.add("flex"); }

    // mobile menu
    var menu = $("[data-menu]"), overlay = $("[data-menu-overlay]");
    function menuOpen(open) {
      if (!menu) return;
      menu.classList.toggle("-translate-x-full", !open);
      overlay.classList.toggle("opacity-0", !open); overlay.classList.toggle("pointer-events-none", !open);
      document.documentElement.style.overflow = open ? "hidden" : "";
    }
    $$("[data-menu-open]").forEach(function (b) { b.addEventListener("click", function () { menuOpen(true); }); });
    $$("[data-menu-close]").forEach(function (b) { b.addEventListener("click", function () { menuOpen(false); }); });
    if (overlay) overlay.addEventListener("click", function () { menuOpen(false); });

    // search overlay
    var srch = $("[data-search]");
    function searchOpen(open) {
      if (!srch) return;
      srch.classList.toggle("opacity-0", !open); srch.classList.toggle("pointer-events-none", !open); srch.classList.toggle("-translate-y-3", !open);
      if (open) setTimeout(function () { $("#site-search").focus(); }, 60);
    }
    $$("[data-search-open]").forEach(function (b) { b.addEventListener("click", function () { searchOpen(true); }); });
    $$("[data-search-close]").forEach(function (b) { b.addEventListener("click", function () { searchOpen(false); }); });
    var tries = [];
    var fw = featuredWork(); if (fw) tries.push(fw.title);
    if (ARTISTS[0]) tries.push(ARTISTS[0].name);
    var cat = categories()[0]; if (cat) tries.push(cat.name);
    var tryBox = $("[data-search-try]");
    if (tryBox) tryBox.insertAdjacentHTML("beforeend", tries.map(function (t) { return '<a href="explore.html?q=' + encodeURIComponent(t) + '" class="border border-walnut/20 px-3 py-1.5 text-walnut hover:border-walnut">' + esc(t) + "</a>"; }).join(""));

    // account panel
    var at = $("[data-account-toggle]"), ap = $("[data-account-panel]");
    function acct(open) { if (!ap) return; ap.classList.toggle("opacity-0", !open); ap.classList.toggle("pointer-events-none", !open); ap.classList.toggle("scale-[0.98]", !open); at.setAttribute("aria-expanded", open ? "true" : "false"); }
    if (at) at.addEventListener("click", function (e) { e.stopPropagation(); acct(ap.classList.contains("opacity-0")); });
    document.addEventListener("click", function (e) { if (ap && !ap.contains(e.target)) acct(false); });

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { menuOpen(false); searchOpen(false); acct(false); closeFilters(); } });

    // share buttons
    var shareUrl = new URL("for-artists.html", location.href).href;
    var shareText = S.name + " is opening its walls to African artists: painters, sculptors, weavers, potters, photographers. Know someone whose work deserves to travel further?";
    $$("[data-share-to]").forEach(function (a) {
      var t = a.getAttribute("data-share-to"), u = encodeURIComponent(shareUrl), x = encodeURIComponent(shareText);
      a.href = { whatsapp: "https://wa.me/?text=" + x + "%20" + u, x: "https://twitter.com/intent/tweet?text=" + x + "&url=" + u,
        facebook: "https://www.facebook.com/sharer/sharer.php?u=" + u, linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + u }[t];
    });
    $$("[data-share-copy]").forEach(function (b) {
      b.addEventListener("click", function () {
        var lbl = b.querySelector("span");
        function done(ok) { lbl.textContent = ok ? "Link copied" : shareUrl; setTimeout(function () { lbl.textContent = "Copy link"; }, 2200); }
        try { navigator.clipboard.writeText(shareUrl).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
      });
    });

    updateBagCount();
  }

  function waLink(text) { return S.whatsapp ? "https://wa.me/" + String(S.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(text || "") : ""; }
  function categories() {
    var m = {}; WORKS.forEach(function (w) { if (w.category) m[w.category] = (m[w.category] || 0) + 1; });
    return Object.keys(m).sort().map(function (k) { return { name: k, count: m[k] }; });
  }

  /* ---------------------------------------------------- HOME */
  function pageHome() {
    var grid = $("[data-home-grid]");
    function renderGrid(mode) {
      var list = WORKS.slice();
      if (mode === "recent") list.sort(function (a, b) { return String(b.added || "").localeCompare(String(a.added || "")); });
      else list.sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
      grid.innerHTML = list.slice(0, 8).map(cardHTML).join("") || '<p class="col-span-full py-16 text-center text-stone">New works are being photographed. Check back soon.</p>';
      $$("[data-tab]").forEach(function (b) {
        var on = b.getAttribute("data-tab") === mode;
        b.className = "py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 " + (on ? "text-walnut underline decoration-olive decoration-2 underline-offset-[6px]" : "text-stone hover:text-walnut");
      });
    }
    $$("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { renderGrid(b.getAttribute("data-tab")); }); });
    renderGrid("curated");

    // hero: moving gallery wall of many artists, art forms and works
    buildHeroWall();

    // categories
    $("[data-home-cats]").innerHTML = categories().map(function (c) {
      return '<li class="border-b border-walnut/15"><a class="group flex items-center justify-between py-5" href="explore.html?category=' + encodeURIComponent(c.name) + '"><span class="font-display text-[30px] leading-none text-walnut">' + esc(c.name) + '</span><span class="flex items-center gap-3 text-sm text-stone">' + plural(c.count, "work") + icon("right", "h-4 w-4 text-walnut transition-transform duration-150 ease-out group-hover:translate-x-1") + "</span></a></li>";
    }).join("");

    // marquee
    var items = (S.marquee || []).map(function (t) { return '<span class="flex items-center whitespace-nowrap px-7 text-[12px] font-semibold uppercase tracking-[0.16em]">' + esc(t) + '<svg viewBox="0 0 10 10" class="ml-14 h-2.5 w-2.5 fill-white/80"><path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z"/></svg></span>'; }).join("");
    var half = '<div class="flex shrink-0">' + items + items + "</div>";
    $("[data-marquee]").innerHTML = half + half;

    // artist wall
    var w = wallItems();
    $("[data-wall]").innerHTML = wallHTML(w);
    $("[data-wall-count]").textContent = "The artist wall · " + plural(w.artists.length, "artist") + " in, " + plural(w.open.length, "space") + " open";
    $("[data-wall-title]").textContent = w.artists.length === 1 ? "One artist in." : (w.artists.length + " artists in.");
    if (w.artists[0]) $("[data-wall-lead]").textContent = (w.artists.length === 1 ? w.artists[0].name + " is the first artist on " + S.name + "." : w.artists.map(function (a) { return a.name; }).slice(0, 3).join(", ") + " are on the wall.") + " Every other space is open for painters, sculptors, weavers, potters and photographers from across the continent.";

    // featured artist
    var fArtist = ARTISTS.find(function (a) { return a.featured; }) || ARTISTS[0];
    var faBox = $("[data-fa-text]");
    if (fArtist && faBox) {
      var piece = (fw && fw.artist === fArtist.id) ? fw : worksBy(fArtist.id)[0];
      faBox.innerHTML = '<p class="text-sm text-stone">Featured artist · ' + esc(fArtist.name) + "</p>" +
        '<h2 class="mt-4 font-display text-[44px] leading-[1.02] text-walnut md:text-[56px]">Crafted by hand. Made to be remembered.</h2>' +
        '<p class="mt-6 text-[16px] leading-relaxed text-walnut/85">' + esc(piece ? (piece.description || fArtist.short) : fArtist.short) + "</p>" +
        '<div class="mt-9 flex flex-wrap items-center gap-6"><a href="artist.html?id=' + encodeURIComponent(fArtist.id) + '" class="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-7 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 ease-out bg-walnut text-ivory hover:bg-olive">Discover ' + esc(first(fArtist.name)) + "&rsquo;s Work</a>" +
        (piece ? '<a href="artwork.html?id=' + encodeURIComponent(piece.id) + '" class="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 ease-out hover:text-olive text-walnut">View the piece</a>' : "") + "</div>";
      if (piece) { $("[data-fa-link]").href = "artwork.html?id=" + encodeURIComponent(piece.id); $("[data-fa-title]").textContent = piece.title; $("[data-fa-meta]").textContent = piece.status === "sold" ? "Sold" : money(piece.price); }
    } else if ($("[data-featured-artist]")) $("[data-featured-artist]").remove();

    // point of view list
    var pov = WORKS.filter(function (x) { return !fw || x.id !== fw.id; }).slice(0, 3);
    $("[data-pov-list]").innerHTML = pov.map(function (x) {
      var a = artist(x.artist) || {};
      return '<li><a class="group flex items-center gap-5 p-5 md:p-7" href="artwork.html?id=' + encodeURIComponent(x.id) + '"><span class="h-24 w-20 shrink-0 overflow-hidden bg-sand">' + img(x.images && x.images[0], x.alt || x.title, "transition-transform duration-300 ease-out group-hover:scale-105") + '</span><span class="min-w-0"><span class="block truncate text-[15px] font-medium text-walnut">' + esc(x.title) + '</span><span class="block truncate text-[13px] italic text-stone">' + esc(a.name || "") + '</span><span class="mt-1.5 block text-[14px] font-semibold text-walnut">' + (x.status === "sold" ? "Sold" : esc(money(x.price))) + "</span></span></a></li>";
    }).join("");
  }

  /* ---------------------------------------------------- EXPLORE */
  var closeFilters = function () {};
  function pageExplore() {
    var st = { q: param("q") || "", category: [], artist: [], medium: [], country: [], price: "any", hideSold: false, sort: "curated" };
    if (param("category")) st.category = [param("category")];
    if (param("artist")) st.artist = [param("artist")];
    var q = $("#x-search"); q.value = st.q;

    function countryOf(w) { var a = artist(w.artist); return a && a.country; }
    function count(fn) { var m = {}; WORKS.forEach(function (w) { var v = fn(w); if (v) m[v] = (m[v] || 0) + 1; }); return m; }
    var bands = S.priceBands || [500, 1500, 3000];
    var priceOpts = [{ v: "any", l: "Any price" }];
    priceOpts.push({ v: "0-" + bands[0], l: "Under " + short$(bands[0]) });
    for (var i = 0; i < bands.length - 1; i++) priceOpts.push({ v: bands[i] + "-" + bands[i + 1], l: short$(bands[i]) + " to " + short$(bands[i + 1]) });
    priceOpts.push({ v: bands[bands.length - 1] + "-", l: "Over " + short$(bands[bands.length - 1]) });
    priceOpts.push({ v: "request", l: "Price on request" });
    function inPrice(w, v) {
      if (v === "any") return true;
      if (v === "request") return !hasPrice(w);
      if (!hasPrice(w)) return false;
      var p = v.split("-"), lo = Number(p[0] || 0), hi = p[1] === "" ? Infinity : Number(p[1]);
      return w.price >= lo && w.price < hi;
    }

    var groups = {
      category: { counts: count(function (w) { return w.category; }), label: function (k) { return k; } },
      artist: { counts: count(function (w) { return w.artist; }), label: function (k) { return (artist(k) || {}).name || k; } },
      medium: { counts: count(function (w) { return w.medium; }), label: function (k) { return k; } },
      country: { counts: count(countryOf), label: function (k) { return k; } }
    };
    var box = '<span class="flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-walnut/40 bg-paper text-transparent transition-colors duration-150 group-hover:border-walnut peer-checked:border-walnut peer-checked:bg-walnut peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta">' + icon("check", "h-3 w-3") + "</span>";
    Object.keys(groups).forEach(function (key) {
      var g = groups[key], keys = Object.keys(g.counts).sort(function (a, b) { return g.label(a).localeCompare(g.label(b)); });
      var ul = $('[data-filter-list="' + key + '"]');
      if (!keys.length) { ul.innerHTML = '<li class="text-sm text-stone">Appears as works are added.</li>'; return; }
      ul.innerHTML = keys.map(function (k) {
        return '<li><label class="group flex min-h-[40px] cursor-pointer items-center gap-3 text-[15px] text-walnut"><input type="checkbox" class="peer sr-only" data-f="' + key + '" value="' + esc(k) + '"' + (st[key].indexOf(k) > -1 ? " checked" : "") + ">" + box + '<span class="flex-1">' + esc(g.label(k)) + '</span><span class="text-sm text-stone">' + g.counts[k] + "</span></label></li>";
      }).join("");
    });
    $('[data-filter-list="price"]').innerHTML = priceOpts.map(function (o) {
      var n = o.v === "any" ? WORKS.length : WORKS.filter(function (w) { return inPrice(w, o.v); }).length;
      return '<li><label class="group flex min-h-[40px] cursor-pointer items-center gap-3 text-[15px] text-walnut"><input type="radio" name="price" class="peer sr-only" data-price value="' + o.v + '"' + (o.v === "any" ? " checked" : "") + '><span class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-walnut/40 text-transparent transition-colors duration-150 group-hover:border-walnut peer-checked:border-walnut peer-checked:text-walnut peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta"><span class="h-2 w-2 rounded-full bg-current"></span></span><span class="flex-1">' + esc(o.l) + "</span>" + (o.v === "any" ? "" : '<span class="text-sm text-stone">' + n + "</span>") + "</label></li>";
    }).join("");

    function run() {
      var term = st.q.trim().toLowerCase();
      var list = WORKS.filter(function (w) {
        var a = artist(w.artist) || {};
        if (st.category.length && st.category.indexOf(w.category) === -1) return false;
        if (st.artist.length && st.artist.indexOf(w.artist) === -1) return false;
        if (st.medium.length && st.medium.indexOf(w.medium) === -1) return false;
        if (st.country.length && st.country.indexOf(a.country) === -1) return false;
        if (!inPrice(w, st.price)) return false;
        if (st.hideSold && w.status === "sold") return false;
        if (term && [w.title, a.name, w.category, w.medium, a.country, w.description].join(" ").toLowerCase().indexOf(term) === -1) return false;
        return true;
      });
      list.sort(function (a, b) {
        if (st.sort === "recent") return String(b.added || "").localeCompare(String(a.added || ""));
        if (st.sort === "title") return a.title.localeCompare(b.title);
        if (st.sort === "low") return (hasPrice(a) ? a.price : 1e12) - (hasPrice(b) ? b.price : 1e12);
        if (st.sort === "high") return (hasPrice(b) ? b.price : -1) - (hasPrice(a) ? a.price : -1);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
      $("[data-explore-grid]").innerHTML = list.map(cardHTML).join("") ||
        '<div class="col-span-full border border-dashed border-walnut/25 px-6 py-16 text-center"><p class="font-display text-[28px] text-walnut">No works match these filters yet.</p><p class="mt-2 text-[15px] text-stone">Try clearing a filter, or <a class="font-medium text-walnut underline underline-offset-4" href="commission.html">commission something made for you</a>.</p></div>';
      $("[data-count]").textContent = list.length;
      $("[data-count-label]").textContent = list.length === 1 ? "artwork" : "artworks";

      var chips = [];
      ["category", "artist", "medium", "country"].forEach(function (k) { st[k].forEach(function (v) { chips.push({ k: k, v: v, l: groups[k].label(v) }); }); });
      if (st.price !== "any") chips.push({ k: "price", v: st.price, l: (priceOpts.find(function (o) { return o.v === st.price; }) || {}).l });
      if (st.q) chips.push({ k: "q", v: st.q, l: "“" + st.q + "”" });
      $("[data-active-chips]").innerHTML = chips.map(function (c) { return '<button type="button" data-chip-k="' + c.k + '" data-chip-v="' + esc(c.v) + '" class="inline-flex h-8 items-center gap-1.5 border border-walnut/20 px-3 text-[13px] text-walnut hover:border-walnut">' + esc(c.l) + icon("x", "h-3.5 w-3.5") + "</button>"; }).join("");
      $("[data-filters-clear]").classList.toggle("hidden", !chips.length);
      var url = new URL(location.href); url.search = "";
      if (st.q) url.searchParams.set("q", st.q);
      if (st.category.length === 1) url.searchParams.set("category", st.category[0]);
      if (st.artist.length === 1) url.searchParams.set("artist", st.artist[0]);
      try { history.replaceState(null, "", url); } catch (e) {}
    }

    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t.hasAttribute("data-f")) { var k = t.getAttribute("data-f"); st[k] = $$('[data-f="' + k + '"]:checked').map(function (x) { return x.value; }); run(); }
      if (t.hasAttribute("data-price")) { st.price = t.value; run(); }
      if (t.hasAttribute("data-hide-sold")) { st.hideSold = t.checked; run(); }
      if (t.id === "x-sort") { st.sort = t.value; run(); }
    });
    q.addEventListener("input", function () { st.q = q.value; run(); });
    $("[data-active-chips]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-chip-k]"); if (!b) return;
      var k = b.getAttribute("data-chip-k"), v = b.getAttribute("data-chip-v");
      if (k === "q") { st.q = ""; q.value = ""; }
      else if (k === "price") { st.price = "any"; $('[data-price][value="any"]').checked = true; }
      else { st[k] = st[k].filter(function (x) { return x !== v; }); $$('[data-f="' + k + '"]').forEach(function (x) { if (x.value === v) x.checked = false; }); }
      run();
    });
    $("[data-filters-clear]").addEventListener("click", function () {
      st.category = []; st.artist = []; st.medium = []; st.country = []; st.price = "any"; st.q = ""; q.value = "";
      $$("[data-f]").forEach(function (x) { x.checked = false; }); $('[data-price][value="any"]').checked = true; run();
    });

    var aside = $("[data-filters]");
    var drawer = ["fixed", "inset-0", "z-50", "!block", "overflow-y-auto", "bg-ivory", "p-5"];
    closeFilters = function () { drawer.forEach(function (c) { aside.classList.remove(c); }); document.documentElement.style.overflow = ""; };
    $("[data-filters-open]").addEventListener("click", function () { drawer.forEach(function (c) { aside.classList.add(c); }); document.documentElement.style.overflow = "hidden"; });
    $$("[data-filters-close]").forEach(function (b) { b.addEventListener("click", closeFilters); });
    run();
  }

  /* ---------------------------------------------------- forms (shared markup) */
  var INP = "h-12 w-full border bg-ivory px-4 text-[15px] text-walnut placeholder:text-stone/70 transition-colors duration-150 ease-out focus:border-walnut focus:outline-none border-walnut/20";
  var LBL = "mb-1.5 flex justify-between text-sm font-medium text-walnut";
  function enquiryForm(subject, regarding, hidden) {
    var h = Object.keys(hidden || {}).map(function (k) { return '<input type="hidden" name="' + k + '" value="' + esc(hidden[k]) + '">'; }).join("");
    return '<form class="grid gap-5" data-form="' + esc(subject) + '" novalidate>' +
      '<p class="text-sm text-stone">Regarding: <span class="font-medium text-walnut">' + esc(regarding) + "</span></p>" +
      '<input type="text" name="company_website" class="hidden" tabindex="-1" autocomplete="off" aria-hidden="true">' + h +
      '<div class="grid gap-5 sm:grid-cols-2"><div><label for="e-name" class="' + LBL + '"><span>Full name</span></label><input id="e-name" name="name" required autocomplete="name" class="' + INP + '"></div>' +
      '<div><label for="e-email" class="' + LBL + '"><span>Email</span></label><input id="e-email" name="email" type="email" required autocomplete="email" class="' + INP + '"></div></div>' +
      '<div class="grid gap-5 sm:grid-cols-2"><div><label for="e-country" class="' + LBL + '"><span>Country</span><span class="font-normal text-stone">Optional</span></label><input id="e-country" name="country" autocomplete="country-name" class="' + INP + '"><p class="mt-1.5 text-sm text-stone">Helps us quote shipping for your location.</p></div>' +
      '<div><label for="e-phone" class="' + LBL + '"><span>Phone or WhatsApp</span><span class="font-normal text-stone">Optional</span></label><input id="e-phone" name="phone" autocomplete="tel" class="' + INP + '"></div></div>' +
      '<div><label for="e-message" class="' + LBL + '"><span>Message</span></label><textarea id="e-message" name="message" rows="5" required class="' + INP + ' h-auto resize-y py-3" placeholder="Questions about price, size, timing or delivery"></textarea></div>' +
      '<div class="flex flex-wrap items-center gap-4 pt-1"><button type="submit" class="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-7 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 bg-walnut text-ivory hover:bg-olive">Send enquiry</button><p class="text-sm text-stone">We reply within one working day.</p></div>' +
      '<p data-status role="status" aria-live="polite" class="hidden"></p></form>';
  }

  /* ---------------------------------------------------- ARTWORK */
  var BTN = "inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-7 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50";
  var B_DARK = BTN + " bg-walnut text-ivory hover:bg-olive", B_OUT = BTN + " border border-walnut text-walnut hover:bg-walnut hover:text-ivory";
  var C = "mx-auto w-full max-w-site px-5 md:px-8";

  function pageArtwork() {
    var root = $("[data-artwork]"), w = work(param("id"));
    if (!w) {
      root.innerHTML = '<section class="' + C + ' py-24"><h1 class="font-display text-[54px] leading-none text-walnut">Work not found</h1><p class="mt-4 text-[17px] text-walnut/80">This piece may have sold or moved.</p><a href="explore.html" class="' + B_DARK + ' mt-8">Explore the Collection</a></section>';
      return;
    }
    var a = artist(w.artist) || { name: "", id: "" };
    document.title = w.title + " by " + a.name + " · " + S.name;
    var md = $('meta[name="description"]'); if (md) md.setAttribute("content", (w.description || "").slice(0, 155));
    var imgs = w.images || [], sold = w.status === "sold", canBag = !sold && w.status !== "reserved" && w.status !== "commission";

    var gallery = '<div><div class="relative aspect-[4/5] overflow-hidden bg-sand/45" data-gallery>' +
      '<div class="absolute inset-0" data-gallery-main>' + (imgs.length ? '<img src="' + esc(imgs[0]) + '" alt="' + esc(w.alt || w.title) + '" class="h-full w-full object-cover">' : img("", "", "")) + "</div>" +
      (imgs.length > 1 ? '<button type="button" data-g-prev class="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-paper/90 text-walnut hover:bg-paper" aria-label="Previous image">' + icon("left", "h-5 w-5") + '</button><button type="button" data-g-next class="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-paper/90 text-walnut hover:bg-paper" aria-label="Next image">' + icon("chevR", "h-5 w-5") + '</button><p class="absolute bottom-3 right-3 bg-paper/90 px-2 py-1 text-xs text-walnut"><span data-g-i>1</span> / ' + imgs.length + "</p>" : "") +
      "</div>" +
      (imgs.length > 1 ? '<ul class="mt-3 flex flex-wrap gap-3">' + imgs.map(function (s, i) { return '<li><button type="button" data-g-thumb="' + i + '" class="block h-20 w-20 overflow-hidden bg-sand/45 transition-opacity duration-150 ' + (i === 0 ? "outline outline-1 outline-offset-2 outline-walnut" : "opacity-60 hover:opacity-100") + '" aria-label="View image ' + (i + 1) + '"><img src="' + esc(s) + '" alt="" class="h-full w-full object-cover"></button></li>'; }).join("") + "</ul>" : "") +
      "</div>";

    var rows = [["Artist", a.id ? '<a class="underline underline-offset-4" href="artist.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.name) + "</a>" : ""], ["Art form", esc(w.category)], ["Medium", esc(w.medium)],
      ["Dimensions", esc(w.dimensions)], ["Weight", esc(w.weight)], ["Year", esc(w.year)], ["Availability", esc(STATUS[w.status] || "Available")], ["Origin", esc([a.city, a.country].filter(Boolean).join(", "))]]
      .filter(function (r) { return r[1]; });

    var actions = sold
      ? '<a href="commission.html?artist=' + encodeURIComponent(a.id) + "&ref=" + encodeURIComponent(w.id) + '" class="' + B_DARK + '">Commission something similar</a><a href="#enquire" class="' + B_OUT + '">Ask about this work</a>'
      : '<a href="#enquire" class="' + B_DARK + '">' + (hasPrice(w) ? "Enquire about this work" : "Request price") + "</a>" +
        (canBag ? '<button type="button" data-add class="' + B_OUT + '"></button>' : (w.status === "commission" ? '<a href="commission.html?artist=' + encodeURIComponent(a.id) + "&ref=" + encodeURIComponent(w.id) + '" class="' + B_OUT + '">Commission one</a>' : '<a href="#enquire" class="' + B_OUT + '">Join the waitlist</a>'));

    var acc = function (title, body, open) {
      return '<details class="border-b border-walnut/15"' + (open ? " open" : "") + '><summary class="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-walnut"><span>' + title + "</span>" + icon("plus", "acc-icon h-4 w-4 shrink-0 transition-transform duration-200 ease-out") + '</summary><div class="pb-6 text-[15px] leading-relaxed text-walnut/85">' + body + "</div></details>";
    };

    var more = worksBy(a.id).filter(function (x) { return x.id !== w.id; });
    more = more.concat(WORKS.filter(function (x) { return x.artist !== a.id; })).slice(0, 4);

    root.innerHTML =
      '<div class="' + C + ' pt-8"><nav class="text-sm text-stone" aria-label="Breadcrumb"><ol class="flex flex-wrap items-center gap-2"><li><a class="hover:text-walnut" href="explore.html">Explore Art</a></li><li>/</li><li><a class="hover:text-walnut" href="artist.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.name) + '</a></li><li>/</li><li class="text-walnut">' + esc(w.title) + "</li></ol></nav></div>" +
      '<section class="' + C + ' grid gap-10 py-8 lg:grid-cols-12 lg:gap-14 lg:py-10"><div class="lg:col-span-7">' + gallery + "</div>" +
        '<div class="lg:col-span-5"><div class="lg:sticky lg:top-24">' +
          '<a class="text-[15px] font-medium text-terracotta-deep hover:underline hover:underline-offset-4" href="artist.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.name) + "</a>" +
          '<h1 class="mt-2 font-display text-[48px] leading-[1] text-walnut md:text-[60px]">' + esc(w.title) + "</h1>" +
          (w.draft ? '<p class="mt-3 text-sm text-stone">Draft listing. Details are being added.</p>' : "") +
          '<p class="mt-7 text-[22px] text-walnut">' + (sold ? "Sold" : esc(money(w.price))) + "</p>" +
          '<div class="mt-6 grid gap-3 sm:grid-cols-2">' + actions + "</div>" +
          '<p class="mt-3 text-sm text-stone">' + (sold ? "This piece has found a home. The artist may be able to create something similar for you." : "Price, shipping and availability are confirmed with you before any payment.") + "</p>" +
          '<dl class="mt-9 border-t border-walnut/15">' + rows.map(function (r) { return '<div class="grid grid-cols-[120px_1fr] gap-4 border-b border-walnut/15 py-3.5 text-[15px]"><dt class="text-stone">' + r[0] + '</dt><dd class="text-walnut">' + r[1] + "</dd></div>"; }).join("") + "</dl>" +
          '<div class="mt-6">' +
            acc("About the work", "<p>" + esc(w.description || "Details coming soon.") + "</p>" + (w.story ? '<p class="mt-3">' + esc(w.story) + "</p>" : ""), true) +
            acc("Shipping &amp; purchasing", "<p>Shipping is quoted for your address before you pay, so you see one total. Every piece is packed for international travel and sent with tracking. Import duties, where they apply, are set by your country and usually paid on arrival.</p>") +
            acc("Authenticity &amp; provenance", "<p>" + esc(w.provenance || ("An original work made by hand by " + a.name + ".")) + "</p><p class=\"mt-3\">Your piece comes with the artist's name, the story behind it and written confirmation of its origin.</p>") +
          "</div>" +
        "</div></div></section>" +
      '<section class="bg-paper"><div class="' + C + ' grid gap-8 py-16 md:grid-cols-12 md:py-20"><p class="text-sm text-stone md:col-span-3">About the artist</p><div class="md:col-span-7"><h2 class="font-display text-[40px] leading-tight text-walnut">' + esc(a.name) + '</h2><p class="mt-4 text-[17px] leading-relaxed text-walnut/85">' + esc(a.short || "") + '</p><a href="artist.html?id=' + encodeURIComponent(a.id) + '" class="inline-flex items-center gap-1.5 border-b border-current pb-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 ease-out hover:text-olive mt-6 text-walnut">View profile and all works</a></div></div></section>' +
      '<section id="enquire" class="' + C + ' scroll-mt-24 py-16 md:py-20"><div class="grid gap-10 lg:grid-cols-12"><div class="lg:col-span-4"><h2 class="font-display text-[40px] leading-tight text-walnut">' + (sold ? "Ask about this work" : "Enquire about this work") + '</h2><p class="mt-4 max-w-sm text-[15px] leading-relaxed text-walnut/80">Ask about price, dimensions, shipping to your country or anything else you would like to know.</p>' + (S.whatsapp ? '<a target="_blank" rel="noopener" href="' + waLink("Hello, I am interested in “" + w.title + "” by " + a.name + ". " + location.href) + '" class="' + B_OUT + ' mt-6">Ask on WhatsApp</a>' : "") + '</div><div class="lg:col-span-7 lg:col-start-6">' + enquiryForm("Artwork enquiry", w.title, { artwork: w.title + " (" + w.id + ")", artist: a.name }) + "</div></div></section>" +
      (more.length ? '<section class="' + C + ' border-t border-walnut/10 py-16 md:py-20"><h2 class="font-display text-[40px] leading-tight text-walnut">You may also like</h2><div class="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">' + more.map(cardHTML).join("") + "</div></section>" : "");

    // gallery
    var gi = 0;
    function show(i) {
      gi = (i + imgs.length) % imgs.length;
      $("[data-gallery-main]").innerHTML = '<img src="' + esc(imgs[gi]) + '" alt="' + esc(w.alt || w.title) + '" class="h-full w-full object-cover">';
      if ($("[data-g-i]")) $("[data-g-i]").textContent = gi + 1;
      $$("[data-g-thumb]").forEach(function (b, j) { b.className = "block h-20 w-20 overflow-hidden bg-sand/45 transition-opacity duration-150 " + (j === gi ? "outline outline-1 outline-offset-2 outline-walnut" : "opacity-60 hover:opacity-100"); });
    }
    if ($("[data-g-prev]")) { $("[data-g-prev]").addEventListener("click", function () { show(gi - 1); }); $("[data-g-next]").addEventListener("click", function () { show(gi + 1); }); }
    $$("[data-g-thumb]").forEach(function (b) { b.addEventListener("click", function () { show(Number(b.getAttribute("data-g-thumb"))); }); });

    // bag button
    var add = $("[data-add]");
    function paint() { if (!add) return; add.innerHTML = inBag(w.id) ? "In your bag · View" : "Add to bag"; }
    if (add) { paint(); add.addEventListener("click", function () { if (inBag(w.id)) { location.href = "bag.html"; return; } addToBag(w.id); paint(); }); }
  }

  /* ---------------------------------------------------- ARTISTS */
  function pageArtists() {
    var grid = $("[data-artists-grid]"), all = wallItems();
    $("[data-stat-artists]").textContent = all.artists.length;
    $("[data-stat-open]").textContent = all.open.length;
    function run(term) {
      term = (term || "").toLowerCase();
      var list = { artists: all.artists.filter(function (a) { return !term || (a.name + " " + disciplines(a).join(" ") + " " + (a.country || "")).toLowerCase().indexOf(term) > -1; }),
                   open: all.open.filter(function (o) { return !term || (o.form + " " + o.who).toLowerCase().indexOf(term) > -1; }) };
      grid.innerHTML = wallHTML(list) || '<p class="col-span-full py-16 text-center text-stone">No artists match that search yet.</p>';
    }
    $("#a-search").addEventListener("input", function (e) { run(e.target.value); });
    run("");
  }

  function pageArtist() {
    var root = $("[data-artist]"), a = artist(param("id"));
    if (!a) { root.innerHTML = '<section class="' + C + ' py-24"><h1 class="font-display text-[54px] leading-none text-walnut">Artist not found</h1><a href="artists.html" class="' + B_DARK + ' mt-8">See all artists</a></section>'; return; }
    document.title = a.name + " · " + S.name;
    var works = worksBy(a.id), cover = a.portrait || ((works.find(function (w) { return w.images && w.images.length; }) || {}).images || [])[0];
    var loc = [a.city, a.country].filter(Boolean).join(", ");
    var bio = Array.isArray(a.bio) ? a.bio : (a.bio ? [a.bio] : []);
    var story = "";
    if ((a.highlights || []).length) story += '<div><h3 class="text-sm font-medium text-stone">Highlights</h3><ul class="mt-4 space-y-3">' + a.highlights.map(function (h) { return '<li class="border-l-2 border-terracotta pl-4 text-[17px] leading-relaxed text-walnut">' + esc(h) + "</li>"; }).join("") + "</ul></div>";
    if (bio.length) story += '<div><h3 class="text-sm font-medium text-stone">Biography</h3>' + bio.map(function (p) { return '<p class="mt-3 text-[16px] leading-relaxed text-walnut/85">' + esc(p) + "</p>"; }).join("") + "</div>";
    if (a.approach) story += '<div><h3 class="text-sm font-medium text-stone">Artistic approach</h3><p class="mt-3 text-[16px] leading-relaxed text-walnut/85">' + esc(a.approach) + "</p></div>";

    root.innerHTML =
      '<section class="bg-walnut text-ivory"><div class="mx-auto grid w-full max-w-site lg:grid-cols-12">' +
        '<div class="flex flex-col justify-end px-5 py-14 md:px-8 md:py-20 lg:col-span-6 lg:pr-14">' +
          '<nav class="mb-auto pb-12 text-sm text-ivory/65"><a class="hover:text-ivory" href="artists.html">Artists</a> <span>/</span> <span class="text-ivory">' + esc(a.name) + "</span></nav>" +
          '<h1 class="font-display text-[60px] font-medium leading-[0.95] md:text-[88px]">' + esc(a.name) + "</h1>" +
          '<p class="mt-6 max-w-lg text-[17px] leading-relaxed text-ivory/80">' + esc(a.short || "") + "</p>" +
          '<dl class="mt-10 grid grid-cols-3 gap-6 border-t border-ivory/20 pt-6"><div><dt class="text-sm text-sand">Art forms</dt><dd class="mt-1 text-[15px] text-ivory/80">' + esc(disciplines(a).join(", ")) + '</dd></div><div><dt class="text-sm text-sand">Location</dt><dd class="mt-1 text-[15px] text-ivory/80">' + esc(loc || "Africa") + '</dd></div><div><dt class="text-sm text-sand">Works listed</dt><dd class="mt-1 text-[15px] text-ivory/80">' + works.length + "</dd></div></dl>" +
          (a.acceptsCommissions ? '<div class="mt-8 flex flex-wrap gap-3"><a href="#works" class="' + BTN + ' bg-ivory text-walnut hover:bg-olive hover:text-white">View works</a><a href="commission.html?artist=' + encodeURIComponent(a.id) + '" class="' + BTN + ' border border-ivory/70 text-ivory hover:bg-ivory hover:text-walnut">Commission ' + esc(first(a.name)) + "</a></div>" : "") +
        "</div>" +
        '<figure class="relative min-h-[420px] lg:col-span-6 lg:min-h-[640px]"><div class="absolute inset-0">' + img(cover, "Portrait of " + a.name, "", true) + "</div></figure>" +
      "</div></section>" +
      (story ? '<section class="' + C + ' grid gap-12 py-16 md:py-24 lg:grid-cols-12"><div class="lg:col-span-4"><h2 class="font-display text-[40px] leading-tight text-walnut">The story so far</h2></div><div class="space-y-10 lg:col-span-7 lg:col-start-6">' + story + "</div></section>" : "") +
      '<section id="works" class="scroll-mt-24 bg-paper"><div class="' + C + ' py-16 md:py-20"><div class="flex items-end justify-between gap-6"><h2 class="font-display text-[40px] leading-tight text-walnut">Works by ' + esc(a.name) + '</h2><a class="hidden text-sm font-medium text-walnut underline underline-offset-4 sm:block" href="explore.html">Explore all artists&rsquo; work</a></div><div class="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">' + (works.map(cardHTML).join("") || '<p class="col-span-full py-12 text-stone">New works are being photographed.</p>') + "</div></div></section>" +
      '<section class="' + C + ' grid gap-10 py-16 md:py-20 lg:grid-cols-12"><div class="lg:col-span-4"><h2 class="font-display text-[40px] leading-tight text-walnut">Enquire about ' + esc(first(a.name)) + '&rsquo;s work</h2><p class="mt-4 text-[15px] leading-relaxed text-walnut/80">Interested in a piece, a commission or learning more? Send a note.</p>' + (a.acceptsCommissions ? '<a href="commission.html?artist=' + encodeURIComponent(a.id) + '" class="' + B_OUT + ' mt-6">Start a commission</a>' : "") + '</div><div class="lg:col-span-7 lg:col-start-6">' + enquiryForm("Artist enquiry", a.name, { artist: a.name }) + "</div></section>";
  }

  /* ---------------------------------------------------- simple pages */
  function pageForArtists() {
    var t = S.terms || {};
    if (t.artistShare != null) {
      $("[data-terms-artist]").textContent = t.artistShare + "%"; $("[data-terms-mkt]").textContent = t.marketplaceShare + "%";
      $("[data-terms-artist-dd]").textContent = t.artistShare + "%"; $("[data-terms-mkt-dd]").textContent = t.marketplaceShare + "%";
      $("[data-terms-artist-bar]").style.width = t.artistShare + "%"; $("[data-terms-mkt-bar]").style.width = t.marketplaceShare + "%";
    }
    $("[data-terms-shipping]").textContent = t.shipping || ""; $("[data-terms-payout]").textContent = t.payout || "";
    if (t.label) $("[data-terms-label]").textContent = t.label;
    var f = param("form"), sel = $("#f-art_form");
    if (f && sel) { var opt = Array.prototype.find.call(sel.options, function (o) { return o.text.toLowerCase() === f.toLowerCase(); }); if (opt) sel.value = opt.text; }
  }
  function pageCommission() {
    var sel = $("#c-artist");
    ARTISTS.filter(function (a) { return a.acceptsCommissions; }).forEach(function (a) { sel.insertAdjacentHTML("beforeend", "<option>" + esc(a.name + " · " + disciplines(a).join(", ")) + "</option>"); });
    var pre = artist(param("artist")); if (pre) sel.value = pre.name + " · " + disciplines(pre).join(", ");
    var ref = work(param("ref")); if (ref) $("#f-idea").value = "I love “" + ref.title + "” and would like something similar.\n\n";
  }
  function pageContact() {
    var d = $("[data-contact-direct]"), out = [];
    if (S.email) out.push('<p><span class="text-stone">Email</span><br><a class="font-medium text-walnut underline underline-offset-4" href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a></p>");
    if (S.whatsapp) out.push('<p><span class="text-stone">WhatsApp</span><br><a class="font-medium text-walnut underline underline-offset-4" target="_blank" rel="noopener" href="' + waLink("Hello " + S.name + ", I have a question.") + '">Chat with us</a></p>');
    if (d) d.innerHTML = out.join("");
    $$("[data-chip]").forEach(function (b) {
      b.addEventListener("click", function () {
        var c = b.getAttribute("data-chip");
        $$("[data-chip]").forEach(function (x) { x.className = "h-10 border px-4 text-sm transition-colors duration-150 " + (x === b ? "border-walnut bg-walnut text-ivory" : "border-walnut/20 text-walnut hover:border-walnut"); });
        $$("[data-faq]").forEach(function (f) { f.classList.toggle("hidden", c !== "all" && f.getAttribute("data-faq") !== c); });
      });
    });
  }

  /* ---------------------------------------------------- BAG + CHECKOUT */
  function summaryHTML(items, withList) {
    var priced = items.filter(hasPrice), sub = priced.reduce(function (s, w) { return s + Number(w.price); }, 0), onReq = items.length - priced.length;
    var dot = '<span class="inline-flex items-center gap-1.5 text-stone"><span class="h-1.5 w-1.5 rounded-full border border-terracotta"></span><span class="italic">';
    return '<div class="bg-paper p-6 md:p-8"><h2 class="font-display text-[30px] leading-tight text-walnut">Order summary</h2>' +
      (withList ? '<ul class="mt-5 divide-y divide-walnut/10">' + items.map(function (w) { var a = artist(w.artist) || {}; return '<li class="flex items-center gap-4 py-3"><span class="h-16 w-14 shrink-0 overflow-hidden bg-sand/50">' + img(w.images && w.images[0], w.title) + '</span><span class="min-w-0 flex-1"><span class="block truncate text-[15px] font-medium text-walnut">' + esc(w.title) + '</span><span class="block truncate text-sm text-stone">' + esc(a.name || "") + '</span></span><span class="text-sm text-walnut">' + esc(money(w.price)) + "</span></li>"; }).join("") + "</ul>" : "") +
      '<dl class="mt-5 divide-y divide-walnut/15 border-y border-walnut/15 text-[15px]">' +
        '<div class="flex justify-between gap-4 py-3.5"><dt class="text-stone">Subtotal (' + plural(items.length, "work") + ')</dt><dd class="text-right text-walnut">' + (priced.length ? esc(money(sub)) : dot + "On request</span></span>") + "</dd></div>" +
        (onReq && priced.length ? '<div class="flex justify-between gap-4 py-3.5"><dt class="text-stone">Price on request</dt><dd class="text-right">' + dot + plural(onReq, "work") + " quoted</span></span></dd></div>" : "") +
        '<div class="flex justify-between gap-4 py-3.5"><dt class="text-stone">Shipping</dt><dd class="text-right">' + dot + "Quoted for your location</span></span></dd></div>" +
        '<div class="flex justify-between gap-4 py-3.5"><dt class="text-stone">Taxes &amp; duties</dt><dd class="text-right">' + dot + "Where applicable</span></span></dd></div>" +
      "</dl>" +
      '<div class="flex items-baseline justify-between pt-5"><span class="text-[15px] font-medium text-walnut">Total</span><span class="text-right"><span class="block font-display text-[26px] font-bold text-walnut">' + (priced.length ? esc(money(sub)) : "To be quoted") + '</span><span class="block text-xs text-stone">+ shipping, quoted separately</span></span></div>' +
      '<p class="mt-4 text-sm leading-relaxed text-stone">You will see the full amount, including shipping, before any payment is requested.</p></div>';
  }

  function pageBag() {
    var root = $("[data-bag]");
    function render() {
      var items = bag().map(work);
      if (!items.length) {
        root.innerHTML = '<div class="border-t border-walnut/15 py-16"><p class="font-display text-[34px] leading-tight text-walnut">Your bag is empty.</p><p class="mt-3 max-w-md text-[15px] text-walnut/80">Works you add while browsing will appear here.</p><a href="explore.html" class="' + B_DARK + ' mt-8">Explore the Collection</a></div>';
        return;
      }
      root.innerHTML = '<div class="grid gap-10 lg:grid-cols-12"><ul class="border-t border-walnut/15 lg:col-span-7">' + items.map(function (w) {
        var a = artist(w.artist) || {};
        return '<li class="overflow-hidden border-b border-walnut/15"><div class="flex gap-5 py-6"><a href="artwork.html?id=' + encodeURIComponent(w.id) + '" class="h-36 w-28 shrink-0 overflow-hidden bg-sand/50 sm:h-40 sm:w-32">' + img(w.images && w.images[0], w.title) + '</a><div class="flex min-w-0 flex-1 flex-col"><div class="flex items-start justify-between gap-4"><div class="min-w-0"><a href="artwork.html?id=' + encodeURIComponent(w.id) + '" class="font-display text-[26px] leading-tight text-walnut hover:underline hover:underline-offset-4">' + esc(w.title) + '</a><a href="artist.html?id=' + encodeURIComponent(a.id || "") + '" class="mt-1 block text-sm text-stone hover:text-walnut">' + esc(a.name || "") + '</a></div><p class="shrink-0 text-[15px] text-walnut">' + esc(money(w.price)) + '</p></div><p class="mt-3 text-sm text-stone">Qty 1 · Original work</p><button type="button" data-remove="' + esc(w.id) + '" class="mt-auto self-start pt-3 text-sm font-medium text-walnut underline underline-offset-4 hover:text-terracotta-deep">Remove</button></div></div></li>';
      }).join("") + '</ul><div class="lg:col-span-4 lg:col-start-9">' + summaryHTML(items) +
        '<div class="mt-4 grid gap-3"><a href="checkout.html" class="' + B_DARK + '">Proceed to checkout</a><a href="explore.html" class="' + B_OUT + '">Continue shopping</a></div></div></div>';
      $$("[data-remove]").forEach(function (b) { b.addEventListener("click", function () { removeFromBag(b.getAttribute("data-remove")); render(); }); });
    }
    render();
  }

  function form0() { return $("[data-checkout-form]"); }
  function pageCheckout() {
    var items = bag().map(work), wrap = $("[data-checkout]");
    if (!items.length) {
      wrap.innerHTML = '<h1 class="font-display text-[52px] leading-none text-walnut md:text-[64px]">Checkout</h1><div class="mt-10 border-t border-walnut/15 py-16"><p class="font-display text-[34px] leading-tight text-walnut">Your bag is empty.</p><p class="mt-3 max-w-md text-[15px] text-walnut/80">Add works to your bag to request a quote.</p><a href="explore.html" class="' + B_DARK + ' mt-8">Explore the Collection</a></div>';
      return;
    }
    $("[data-order-summary]").innerHTML = summaryHTML(items, true);
    var ij = document.createElement("input"); ij.type = "hidden"; ij.name = "items_json";
    ij.value = JSON.stringify(items.map(function (w) { return { id: w.id, title: w.title, artist: (artist(w.artist) || {}).name || "", price: hasPrice(w) ? Number(w.price) : null }; }));
    form0().appendChild(ij);
    $("[data-order-works]").value = items.map(function (w) { var a = artist(w.artist) || {}; return w.title + " by " + a.name + " (" + w.id + "), " + money(w.price); }).join(" | ");
    var priced = items.filter(hasPrice);
    $("[data-order-subtotal]").value = priced.length ? money(priced.reduce(function (s, w) { return s + Number(w.price); }, 0)) + " + shipping" : "To be quoted";
    var form = $("[data-checkout-form]"), cur = 1;
    function go(n) {
      cur = n;
      $$("[data-step]").forEach(function (s) { s.classList.toggle("hidden", Number(s.getAttribute("data-step")) !== n); });
      $$("[data-step-bar]").forEach(function (b) { var i = Number(b.getAttribute("data-step-bar")); b.className = "h-0.5 " + (i <= n ? "bg-walnut" : "bg-walnut/15"); });
      $$("[data-step-go]").forEach(function (b) { var i = Number(b.getAttribute("data-step-go")); b.className = "mt-3 text-left text-sm " + (i === n ? "font-medium text-walnut" : "text-stone"); });
      if (n === 3) {
        var v = function (k) { return esc((form.elements[k] || {}).value || ""); };
        $("[data-review]").innerHTML = '<div><p class="text-sm text-stone">Contact</p><p class="mt-1 text-walnut">' + v("first_name") + " " + v("last_name") + "<br>" + v("email") + (v("phone") ? "<br>" + v("phone") : "") + '</p></div><div><p class="text-sm text-stone">Ship to</p><p class="mt-1 text-walnut">' + [v("address_line1"), v("address_line2"), [v("city"), v("region")].filter(Boolean).join(", "), [v("postcode"), v("country")].filter(Boolean).join(" ")].filter(Boolean).join("<br>") + "</p></div>";
      }
      window.scrollTo({ top: wrap.offsetTop - 90, behavior: "smooth" });
    }
    function valid(n) { var step = $('[data-step="' + n + '"]'); return validate(form, $$("[required]", step), $('[data-step="' + n + '"]')); }
    $$("[data-next]").forEach(function (b) { b.addEventListener("click", function () { var n = Number(b.getAttribute("data-next")); if (valid(n - 1)) go(n); }); });
    $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { go(Number(b.getAttribute("data-back"))); }); });
    $$("[data-step-go]").forEach(function (b) { b.addEventListener("click", function () { var n = Number(b.getAttribute("data-step-go")); if (n < cur || (n === cur + 1 && valid(cur))) go(n); }); });
    form.addEventListener("form:success", function () {
      setBag([]);
      wrap.innerHTML = '<h1 class="font-display text-[52px] leading-none text-walnut md:text-[64px]">Thank you.</h1><div class="mt-10 max-w-2xl border-t border-walnut/15 py-12"><p class="font-display text-[34px] leading-tight text-walnut">Your request is with us.</p><p class="mt-4 text-[16px] leading-relaxed text-walnut/80">We are confirming availability and shipping to your address now. You will receive one total by email, usually within 24 hours. No payment has been taken.</p><a href="explore.html" class="' + B_DARK + ' mt-8">Continue exploring</a></div>';
      updateBagCount();
    });
  }

  /* ---------------------------------------------------- QUOTE (buyer view) */
  function pageQuote() {
    var root = $("[data-quote]"), id = param("id"), tk = param("t");
    function notFound() { root.innerHTML = '<h1 class="font-display text-[52px] leading-none text-walnut md:text-[64px]">Quote not found</h1><p class="mt-4 max-w-md text-[16px] text-walnut/80">This link may be incomplete or the quote may have been withdrawn. Please contact us and we will help.</p><a href="contact.html" class="' + B_DARK + ' mt-8">Contact us</a>'; }
    if (!API || !id || !tk) { notFound(); return; }
    fetch("/api/quote?id=" + encodeURIComponent(id) + "&t=" + encodeURIComponent(tk)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (q) {
      var cur = q.currency || "USD", m = function (n) { return n == null || n === "" ? "To be confirmed" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + cur; };
      var sub = q.items.reduce(function (s, i) { return s + (Number(i.price) || 0); }, 0), total = sub + (Number(q.shipping) || 0);
      var paid = ["paid", "shipped", "delivered"].indexOf(q.status) > -1;
      var steps = ["quoted", "paid", "shipped", "delivered"], at = steps.indexOf(q.status);
      root.innerHTML =
        '<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-olive">Quote ' + esc(q.id) + '</p><h1 class="mt-3 font-display text-[52px] leading-none text-walnut md:text-[64px]">' + (paid ? "Thank you" : "Your quote") + (q.buyer.name ? ", " + esc(first(q.buyer.name)) : "") + ".</h1></div>" + (q.valid_until && !paid ? '<p class="text-sm text-stone">Valid until ' + esc(new Date(q.valid_until).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })) + "</p>" : "") + "</div>" +
        (q.status === "cancelled" ? '<p class="mt-6 bg-paper p-4 text-[15px] text-walnut">This quote has been withdrawn. Please contact us if you have any questions.</p>' :
        '<ol class="mt-10 grid grid-cols-4 gap-2">' + ["Quote ready", "Paid", "Shipped", "Delivered"].map(function (l, i) { return '<li><div class="h-0.5 ' + (i <= at ? "bg-walnut" : "bg-walnut/15") + '"></div><p class="mt-3 text-sm ' + (i <= at ? "font-medium text-walnut" : "text-stone") + '">' + l + "</p></li>"; }).join("") + "</ol>") +
        '<div class="mt-10 grid gap-10 lg:grid-cols-12"><div class="lg:col-span-7">' +
          (q.message ? '<div class="mb-8 whitespace-pre-line border-l-2 border-terracotta pl-5 text-[16px] leading-relaxed text-walnut/85">' + esc(q.message) + "</div>" : "") +
          '<ul class="border-t border-walnut/15">' + q.items.map(function (it) {
            var w = work(it.id) || {};
            return '<li class="flex gap-5 border-b border-walnut/15 py-5"><a href="artwork.html?id=' + encodeURIComponent(it.id) + '" class="h-32 w-24 shrink-0 overflow-hidden bg-sand/50">' + img(w.images && w.images[0], it.title) + '</a><div class="flex min-w-0 flex-1 items-start justify-between gap-4"><div><p class="font-display text-[24px] leading-tight text-walnut">' + esc(it.title) + '</p><p class="mt-1 text-sm text-stone">' + esc(it.artist || "") + '</p><p class="mt-2 text-sm text-stone">Original work · Qty 1</p></div><p class="shrink-0 text-[15px] text-walnut">' + esc(m(it.price)) + "</p></div></li>";
          }).join("") + "</ul></div>" +
          '<div class="lg:col-span-4 lg:col-start-9"><div class="bg-paper p-6 md:p-8"><h2 class="font-display text-[30px] leading-tight text-walnut">Summary</h2><dl class="mt-5 divide-y divide-walnut/15 border-y border-walnut/15 text-[15px]">' +
            '<div class="flex justify-between gap-4 py-3.5"><dt class="text-stone">Artwork' + (q.items.length > 1 ? "s" : "") + '</dt><dd class="text-walnut">' + esc(m(sub)) + '</dd></div><div class="flex justify-between gap-4 py-3.5"><dt class="text-stone">Insured shipping</dt><dd class="text-walnut">' + esc(m(q.shipping)) + "</dd></div></dl>" +
            '<div class="flex items-baseline justify-between pt-5"><span class="text-[15px] font-medium text-walnut">Total</span><span class="font-display text-[30px] font-bold text-walnut">' + esc(m(total)) + "</span></div>" +
            '<p class="mt-2 text-xs text-stone">Import duties, where they apply, are set by your country and paid on arrival.</p>' +
            (paid ? '<p class="mt-6 bg-ivory p-4 text-[15px] text-walnut">Payment received. We will share tracking as soon as your piece ships.</p>' :
              (q.payment_link ? '<a href="' + esc(q.payment_link) + '" target="_blank" rel="noopener" class="' + B_DARK + ' mt-6 w-full">Pay securely</a><p class="mt-3 text-center text-xs text-stone">You will be taken to our secure payment partner.</p>' : '<p class="mt-6 text-sm text-stone">We will send your secure payment link shortly.</p>')) +
            '<div class="mt-6 border-t border-walnut/15 pt-5 text-sm text-stone">Questions? ' + (q.site.whatsapp ? '<a class="font-medium text-walnut underline underline-offset-4" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(q.site.whatsapp).replace(/\D/g, "")) + '">WhatsApp us</a> or ' : "") + '<a class="font-medium text-walnut underline underline-offset-4" href="contact.html">send a message</a>.</div>' +
          "</div></div></div>";
    }).catch(notFound);
  }

  /* ---------------------------------------------------- form handling */
  function statusEl(form) { return form.querySelector("[data-step]:not(.hidden) [data-status]") || form.querySelector("[data-status]"); }
  function setStatus(form, kind, html) {
    var s = statusEl(form); if (!s) return;
    var dark = !!form.closest(".bg-walnut");
    s.className = "text-sm leading-relaxed " + (form.hasAttribute("data-inline") ? "mt-3 " : "") + (kind === "ok" ? (dark ? "text-sand" : "text-olive") : (dark ? "text-red-300" : "text-red-700"));
    s.innerHTML = html;
  }
  function validate(form, fields, scope) {
    var bad = fields.filter(function (el) {
      if (el.type === "checkbox") return !el.checked;
      if (!el.value.trim()) return true;
      if (el.type === "email") return !/^\S+@\S+\.\S+$/.test(el.value);
      return false;
    });
    fields.forEach(function (el) { el.classList.toggle("!border-red-700", bad.indexOf(el) > -1); });
    if (bad.length) {
      var names = bad.map(function (el) {
        if (el.type === "checkbox") return "the confirmation";
        var l = form.querySelector('label[for="' + el.id + '"] span'); return l ? l.textContent.toLowerCase() : el.name;
      });
      var s = (scope && scope.querySelector("[data-status]")) || statusEl(form);
      if (s) { var tmp = { closest: form.closest.bind(form), hasAttribute: form.hasAttribute.bind(form), querySelector: function () { return s; } }; setStatus(tmp, "err", "Please check " + names.join(", ") + "."); }
      bad[0].focus();
      return false;
    }
    var st = (scope && scope.querySelector("[data-status]")); if (st) st.className = "hidden";
    return true;
  }

  function initForms() {
    $$("form[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (form.company_website && form.company_website.value) return;
        if (!validate(form, $$("[required]", form))) return;
        var subject = form.getAttribute("data-form") + " · " + S.name;
        var data = {};
        new FormData(form).forEach(function (v, k) { if (k !== "company_website" && String(v).trim()) data[k] = v; });
        data.page = location.href;
        var btn = form.querySelector('button[type="submit"]');

        function ok(msg) {
          setStatus(form, "ok", msg || (form.getAttribute("data-form") === "Newsletter signup" ? "Thank you. You are on the list." : "Thank you. Your message has been received and we will reply within one working day."));
          form.dispatchEvent(new CustomEvent("form:success"));
          if (!form.hasAttribute("data-checkout-form")) form.reset();
        }

        if (API) {
          var lbl = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; if (btn.textContent.trim()) btn.textContent = "Sending..."; }
          fetch("/api/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({ form: form.getAttribute("data-form") }, data)) })
            .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); }); })
            .then(function () {
              ok();
              if (S.formAccessKey) {                          // optional email copy via Web3Forms (free plan needs a browser request)
                var copy = Object.assign({ access_key: S.formAccessKey, subject: subject, from_name: S.name || "Out of Africa" }, data);
                if (copy.items_json) { try { copy.items = JSON.parse(copy.items_json).map(function (i) { return i.title + (i.artist ? " by " + i.artist : ""); }).join("; "); } catch (x) {} delete copy.items_json; }
                try { fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(copy), keepalive: true }).catch(function () {}); } catch (x) {}
              }
            })
            .catch(function (err) { setStatus(form, "err", esc(err.message && isNaN(err.message) ? err.message : "Sorry, that did not send. Please try again.")); })
            .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = lbl; } });
          return;
        }
        if (S.formEndpoint) {
          var payload = Object.assign({ subject: subject, from_name: S.name }, data);
          if (S.formAccessKey) payload.access_key = S.formAccessKey;
          var label = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; if (btn.textContent.trim()) btn.textContent = "Sending..."; }
          fetch(S.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
            .then(function (r) { if (!r.ok) throw new Error(r.status); ok(); })
            .catch(function () { setStatus(form, "err", "Sorry, that did not send. Please try again" + (S.email ? ' or email <a class="underline" href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a>" : "") + "."); })
            .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
          return;
        }
        var body = Object.keys(data).map(function (k) { return k.replace(/_/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }) + ": " + data[k]; }).join("\n");
        if (S.email) { location.href = "mailto:" + S.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body); ok("Your email app should now open with your message ready to send."); }
        else if (S.whatsapp) { window.open(waLink(subject + "\n\n" + body), "_blank", "noopener"); ok("WhatsApp should now open with your message ready to send."); }
        else setStatus(form, "err", "This form is not connected yet. Add an email, WhatsApp number or form endpoint in config.js.");
      });
    });
  }

  /* ---------------------------------------------------- boot */
  function start() {
    initLayout();
    fillImages();
    ({ home: pageHome, explore: pageExplore, artwork: pageArtwork, artists: pageArtists, artist: pageArtist, "for-artists": pageForArtists,
       commission: pageCommission, contact: pageContact, bag: pageBag, checkout: pageCheckout, quote: pageQuote }[PAGE] || function () {})();
    initForms();
  }
  var done = false;
  function go() { if (!done) { done = true; start(); } }
  if (location.protocol.indexOf("http") === 0 && window.fetch) {
    var timer = setTimeout(go, 2500);                       // fall back to built-in data if the API is slow
    fetch("/api/catalog", { cache: "no-store", headers: { accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { if (done) return; clearTimeout(timer); API = true; useData(d.site, d.artists, d.artworks); go(); })
      .catch(function () { clearTimeout(timer); go(); });
  } else go();
})();
