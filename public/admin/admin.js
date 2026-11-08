/* =========================================================
   Out of Africa Studio · admin dashboard
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------- state & helpers */
  var S = { artworks: [], artists: [], site: {}, inbox: [], orders: [], media: [], stats: null, loaded: {}, me: null };
  var SECTIONS = [["artworks", "Artworks", "Add, edit and price artworks"], ["artists", "Artists", "Artist profiles"], ["inbox", "Inbox", "Messages and applications (contains buyer contact details)"], ["orders", "Orders", "Order requests, quotes and payment links"], ["photos", "Photos", "Photo library uploads and deletes"], ["settings", "Settings", "Contact details, homepage, terms"]];
  function can(sec, level) {
    if (!S.me) return false; if (S.me.owner) return true;
    var p = S.me.perms[sec]; return level === "edit" ? p === "edit" : !!p;
  }
  function setMe(sess) { S.me = sess && sess.me ? sess.me : null; }
  var app = document.getElementById("app");
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n, cur) { if (n === null || n === undefined || n === "" || isNaN(n)) return "On request"; return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (cur || S.site.currency || "USD"); }
  function ago(iso) {
    if (!iso) return ""; var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 604800) return Math.floor(s / 86400) + "d ago"; return new Date(iso).toLocaleDateString();
  }
  function artistName(id) { var a = S.artists.find(function (x) { return x.id === id; }); return a ? a.name : ""; }
  function labelize(k) { return String(k).replace(/_/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); }

  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || "GET", credentials: "same-origin", headers: { "x-oa-admin": "1" } };
    if (opts.body !== undefined) {
      if (opts.raw) { init.body = opts.body; init.headers["content-type"] = opts.type; }
      else { init.body = JSON.stringify(opts.body); init.headers["content-type"] = "application/json"; }
    }
    return fetch(path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (r.status === 401 && path.indexOf("/login") < 0) { renderLogin(); throw new Error("Please sign in"); }
        if (!r.ok) throw new Error(d.error || ("Something went wrong (" + r.status + ")"));
        return d;
      });
    });
  }

  var toastTimer;
  function toast(msg, kind) {
    var t = $("#toast");
    t.innerHTML = '<div class="pointer-events-auto flex items-center gap-3 px-5 py-3 text-sm font-medium shadow-[0_16px_32px_-16px_rgba(0,0,0,0.5)] ' + (kind === "err" ? "bg-red-700 text-white" : "bg-walnut text-ivory") + '">' + esc(msg) + "</div>";
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.innerHTML = ""; }, 2600);
  }
  function fail(e) { toast(e.message || String(e), "err"); }

  var ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    art: '<rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    orders: '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.1 6h17.8"/><path d="M3.4 5.5a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.7a2 2 0 0 0-.4-1.2l-2-2.7A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
    photo: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    ext: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>'
  };
  function ic(name, cls) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || "h-5 w-5") + '" aria-hidden="true">' + ICON[name] + "</svg>"; }
  var ARCH = '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" class="CLS" aria-hidden="true"><path d="M9.5 34V17.5a10.5 10.5 0 0 1 21 0V34" stroke-width="1.75"/><path d="M20 30.5c-4.4-3.7-5-9.4 0-15 5 5.6 4.4 11.3 0 15Z" stroke-width="1.5"/><path d="M20 30.5v-9.5" stroke-width="1.2"/><path d="M5 34h30" stroke-width="1.75"/></svg>';
  function arch(cls) { return ARCH.replace("CLS", cls); }
  function thumb(src, cls) {
    return src ? '<img src="' + esc(src.charAt(0) === "/" || /^https?:/.test(src) ? src : "/" + src) + '" alt="" loading="lazy" class="h-full w-full object-cover ' + (cls || "") + '">'
      : '<div class="flex h-full w-full items-center justify-center bg-sand text-walnut/30">' + arch("h-8 w-8") + "</div>";
  }
  function src(p) { return !p ? "" : (p.charAt(0) === "/" || /^https?:/.test(p) ? p : "/" + p); }

  // Tailwind class sets
  var BTN = "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap px-5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
  var B_DARK = BTN + " bg-walnut text-ivory hover:bg-olive";
  var B_OUT = BTN + " border border-walnut/25 bg-ivory text-walnut hover:border-walnut";
  var B_OLIVE = BTN + " bg-olive text-white hover:bg-terracotta-deep";
  var INP = "h-11 w-full border border-walnut/20 bg-ivory px-3.5 text-[15px] text-walnut placeholder:text-stone/60 transition-colors focus:border-walnut focus:outline-none";
  var TXT = "w-full border border-walnut/20 bg-ivory px-3.5 py-3 text-[15px] leading-relaxed text-walnut placeholder:text-stone/60 transition-colors focus:border-walnut focus:outline-none";
  var LBL = "mb-1.5 flex items-baseline justify-between gap-3 text-[13px] font-medium text-walnut";
  var CARD = "border border-walnut/10 bg-ivory";
  var PILL = { available: "bg-olive/15 text-terracotta-deep", reserved: "bg-sand text-walnut", sold: "bg-walnut text-ivory", commission: "bg-paper text-walnut border border-walnut/20",
    new: "bg-olive text-white", replied: "bg-sand text-walnut", closed: "bg-paper text-stone border border-walnut/15",
    requested: "bg-olive text-white", quoted: "bg-sand text-walnut", paid: "bg-terracotta-deep text-white", shipped: "bg-walnut text-ivory", delivered: "bg-paper text-walnut border border-walnut/20", cancelled: "bg-paper text-stone border border-walnut/15" };
  var STATUS_LABEL = { available: "Available", reserved: "Reserved", sold: "Sold", commission: "Made to order", new: "New", replied: "Replied", closed: "Closed",
    requested: "Requested", quoted: "Quote sent", paid: "Paid", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
  function pill(st) { return '<span class="inline-flex h-6 items-center whitespace-nowrap px-2 text-[10px] font-semibold uppercase tracking-[0.12em] ' + (PILL[st] || "bg-sand text-walnut") + '">' + esc(STATUS_LABEL[st] || st) + "</span>"; }
  function field(label, ctl, hint, opt) { return '<label class="block"><span class="' + LBL + '"><span>' + label + "</span>" + (opt ? '<span class="font-normal text-stone">Optional</span>' : "") + "</span>" + ctl + (hint ? '<span class="mt-1.5 block text-[13px] leading-relaxed text-stone">' + hint + "</span>" : "") + "</label>"; }
  function input(name, val, attrs) { return '<input name="' + name + '" value="' + esc(val == null ? "" : val) + '" class="' + INP + '" ' + (attrs || "") + ">"; }
  function textarea(name, val, rows, attrs) { return '<textarea name="' + name + '" rows="' + (rows || 4) + '" class="' + TXT + '" ' + (attrs || "") + ">" + esc(val == null ? "" : val) + "</textarea>"; }
  function toggle(name, on, label, hint) {
    return '<label class="flex cursor-pointer items-start gap-3 py-1"><input type="checkbox" name="' + name + '" class="peer sr-only"' + (on ? " checked" : "") + '><span class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-walnut/20 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-olive peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta"></span><span><span class="block text-[15px] font-medium text-walnut">' + label + "</span>" + (hint ? '<span class="block text-[13px] text-stone">' + hint + "</span>" : "") + "</span></label>";
  }
  function formData(form) {
    var d = {};
    $$("input,select,textarea", form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") d[el.name] = el.checked;
      else d[el.name] = el.value;
    });
    return d;
  }

  /* ---------------------------------------------------- image upload */
  function resize(file, max) {
    max = max || 2000;
    var load = window.createImageBitmap ? createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(file); })
      : new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(file); });
    return load.then(function (bmp) {
      var w = bmp.width, h = bmp.height, s = Math.min(1, max / Math.max(w, h));
      var c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
      var ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high"; ctx.drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.86); });
    });
  }
  function upload(file, name) {
    return resize(file).then(function (blob) {
      return api("/api/admin/media?name=" + encodeURIComponent(name || file.name.replace(/\.[^.]+$/, "")), { method: "POST", body: blob, raw: true, type: "image/jpeg" });
    }).then(function (r) { S.loaded.media = false; return r.url; });
  }

  /* ---------------------------------------------------- data loading */
  function load(what, force) {
    var map = { artworks: "/api/admin/artworks", artists: "/api/admin/artists", site: "/api/admin/settings", inbox: "/api/admin/submissions", orders: "/api/admin/orders", media: "/api/admin/media", stats: "/api/admin/stats" };
    if ((what === "inbox" || what === "orders") && !can(what, "view")) { S[what] = []; return Promise.resolve([]); }
    if (S.loaded[what] && !force) return Promise.resolve(S[what]);
    return api(map[what]).then(function (d) { S[what] = d; S.loaded[what] = true; return d; });
  }
  function loadAll(list, force) { return Promise.all(list.map(function (w) { return load(w, force); })); }

  /* ---------------------------------------------------- shell */
  var ALL_NAV = [["overview", "Overview", "home"], ["artworks", "Artworks", "art"], ["artists", "Artists", "people"], ["inbox", "Inbox", "inbox"], ["orders", "Orders", "orders"], ["photos", "Photos", "photo"], ["settings", "Settings", "settings"], ["team", "Team", "shield"]];
  function navAllowed(k) { return k === "overview" || (k === "team" ? !!(S.me && S.me.owner) : can(k, "view")); }
  var NAV = ALL_NAV, MOBILE_NAV = [];
  function buildNav() {
    NAV = ALL_NAV.filter(function (n) { return navAllowed(n[0]); });
    MOBILE_NAV = ["overview", "artworks", "inbox", "orders", "settings", "photos", "artists"].filter(navAllowed).slice(0, 5);
  }

  function shell(active, title, body, actions, back) {
    buildNav();
    if (S.me && !S.me.owner && SECTIONS.some(function (x) { return x[0] === active; }) && !can(active, "edit"))
      body = '<div class="mb-5 border border-walnut/15 bg-sand px-4 py-3 text-[14px] text-walnut">View only. You can look around this section, but changes won\'t save.</div>' + body;
    var newCount = (S.inbox || []).filter(function (m) { return m.status === "new"; }).length;
    var openOrders = (S.orders || []).filter(function (o) { return o.status === "requested"; }).length;
    function badge(k) { var n = k === "inbox" ? newCount : k === "orders" ? openOrders : 0; return n ? '<span class="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-olive px-1.5 text-[11px] font-semibold text-white">' + n + "</span>" : ""; }
    var side = NAV.map(function (n) {
      var on = n[0] === active;
      return '<a href="#' + n[0] + '" class="flex items-center gap-3 px-4 py-3 text-[14px] font-medium transition-colors ' + (on ? "bg-ivory/10 text-ivory" : "text-ivory/65 hover:bg-ivory/5 hover:text-ivory") + '">' + ic(n[2], "h-[18px] w-[18px]") + "<span>" + n[1] + "</span>" + badge(n[0]) + "</a>";
    }).join("");
    var bottom = MOBILE_NAV.map(function (k) {
      var n = NAV.find(function (x) { return x[0] === k; }), on = k === active;
      var b = k === "inbox" ? newCount : k === "orders" ? openOrders : 0;
      return '<a href="#' + k + '" class="relative flex flex-1 flex-col items-center gap-1 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] ' + (on ? "text-walnut" : "text-stone") + '">' + ic(n[2], "h-[22px] w-[22px]") + "<span>" + n[1] + "</span>" + (b ? '<span class="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-olive"></span>' : "") + "</a>";
    }).join("");
    app.innerHTML =
      '<div class="lg:grid lg:min-h-screen lg:grid-cols-[248px_1fr]">' +
        '<aside class="hidden bg-walnut text-ivory lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen">' +
          '<div class="flex items-center gap-2.5 px-5 py-6">' + arch("h-8 w-8") + '<div><p class="font-display text-[15px] font-bold leading-none tracking-[0.18em]">OUT <span class="font-accent font-normal normal-case italic tracking-normal">of</span> AFRICA</p><p class="mt-1 text-[11px] uppercase tracking-[0.2em] text-sand">Studio</p></div></div>' +
          '<nav class="flex-1 px-2">' + side + "</nav>" +
          '<div class="space-y-1 border-t border-ivory/10 p-2"><a href="/" target="_blank" rel="noopener" class="flex items-center gap-3 px-4 py-3 text-[14px] text-ivory/65 hover:text-ivory">' + ic("ext", "h-[18px] w-[18px]") + 'View live site</a><button type="button" data-logout class="flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] text-ivory/65 hover:text-ivory">' + ic("logout", "h-[18px] w-[18px]") + "Sign out</button>" + (S.me ? '<p class="px-4 pb-2 pt-1 text-[12px] text-ivory/45">Signed in as ' + esc(S.me.name) + (S.me.owner ? "" : (S.me.expires_at ? " · until " + esc(new Date(S.me.expires_at).toLocaleDateString()) : "")) + "</p>" : "") + "</div>" +
        "</aside>" +
        '<div class="min-w-0 pb-28 lg:pb-12">' +
          '<header class="sticky top-0 z-30 border-b border-walnut/10 bg-paper/95 backdrop-blur-sm"><div class="mx-auto flex min-h-[64px] max-w-5xl items-center gap-3 px-4 py-2 md:px-8">' +
            (back ? '<a href="' + back + '" class="-ml-2 flex h-10 w-10 items-center justify-center text-walnut" aria-label="Back">' + ic("back") + "</a>" : '<span class="lg:hidden">' + arch("h-7 w-7 text-walnut") + "</span>") +
            '<h1 class="min-w-0 flex-1 truncate font-display text-[22px] font-semibold leading-tight text-walnut md:text-[26px]">' + title + "</h1>" +
            '<div class="flex shrink-0 items-center gap-2">' + (actions || "") + (back ? "" : '<button type="button" data-logout class="flex h-10 w-10 items-center justify-center text-stone lg:hidden" aria-label="Sign out">' + ic("logout", "h-5 w-5") + "</button>") + "</div>" +
          "</div></header>" +
          '<main class="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">' + body + "</main>" +
        "</div>" +
        '<nav class="fixed inset-x-0 bottom-0 z-40 flex border-t border-walnut/10 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">' + bottom + "</nav>" +
      "</div>";
    $$("[data-logout]").forEach(function (b) { b.addEventListener("click", logout); });
    app.onclick = null;
    window.scrollTo(0, 0);
  }
  function loading(active, title) { shell(active, title, '<div class="flex items-center gap-3 py-20 text-stone"><span class="h-4 w-4 animate-pulse rounded-full bg-olive"></span>Loading…</div>'); }
  function logout() { api("/api/admin/logout", { method: "POST", body: {} }).finally(function () { S.loaded = {}; S.me = null; renderLogin(); }); }

  /* ---------------------------------------------------- login */
  function renderLogin(msg) {
    app.innerHTML =
      '<div class="flex min-h-screen items-center justify-center bg-walnut px-5 py-16 text-ivory"><div class="w-full max-w-sm">' +
        '<div class="mb-10 flex flex-col items-center text-center">' + arch("h-14 w-14") + '<p class="mt-5 font-display text-[22px] font-bold tracking-[0.18em]">OUT <span class="font-accent font-normal normal-case italic tracking-normal">of</span> AFRICA</p><p class="mt-2 text-[12px] uppercase tracking-[0.24em] text-sand">Studio</p></div>' +
        '<form id="login" class="grid gap-4"><label class="block"><span class="mb-1.5 flex justify-between text-sm font-medium text-ivory"><span>Username</span><span class="font-normal text-ivory/50">Owner: leave empty</span></span><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" class="h-12 w-full border border-ivory/25 bg-walnut-soft px-4 text-[16px] text-ivory placeholder:text-ivory/40 focus:border-ivory focus:outline-none" placeholder="Team members only"></label><label class="block"><span class="mb-1.5 block text-sm font-medium text-ivory">Password</span><input name="password" type="password" autocomplete="current-password" required class="h-12 w-full border border-ivory/25 bg-walnut-soft px-4 text-[16px] text-ivory placeholder:text-ivory/40 focus:border-ivory focus:outline-none" placeholder="Your dashboard password"></label>' +
        '<button class="inline-flex h-12 items-center justify-center bg-ivory text-[12px] font-semibold uppercase tracking-[0.14em] text-walnut hover:bg-white">Sign in</button>' +
        '<p id="login-msg" class="min-h-[20px] text-center text-sm text-red-300">' + esc(msg || "") + "</p></form>" +
        '<p class="mt-8 text-center text-[13px] text-ivory/50"><a href="/" class="underline underline-offset-4 hover:text-ivory">Back to the website</a></p>' +
      "</div></div>";
    var f = $("#login");
    f.username.focus();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var b = f.querySelector("button"); b.disabled = true; b.textContent = "Signing in…";
      api("/api/admin/login", { method: "POST", body: { username: f.username.value.trim(), password: f.password.value } })
        .then(function () { return api("/api/admin/session"); }).then(function (s) { setMe(s); S.loaded = {}; location.hash = "#overview"; route(); })
        .catch(function (err) { $("#login-msg").textContent = err.message; b.disabled = false; b.textContent = "Sign in"; });
    });
  }

  /* ---------------------------------------------------- overview */
  function viewOverview() {
    loading("overview", "Overview");
    Promise.all([load("stats", true), loadAll(["inbox", "orders", "site", "artworks"], true), api("/api/admin/session")]).then(function (r) {
      var st = r[0], sess = r[2];
      var newMsgs = S.inbox.filter(function (m) { return m.status === "new"; });
      var unpriced = S.artworks.filter(function (w) { return w.price == null && !w.draft && w.status !== "sold"; }).length;
      var hello = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";
      function stat(n, label, href, accent) { return '<a href="' + href + '" class="' + CARD + ' block p-5 transition-colors hover:border-walnut/30"><p class="font-display text-[40px] font-extrabold leading-none ' + (accent ? "text-olive" : "text-walnut") + '">' + n + '</p><p class="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-stone">' + label + "</p></a>"; }
      var checks = [
        [sess.passwordSet, "Dashboard password set", ""],
        [sess.storage.media, "Photo storage connected", "Connect the MEDIA store in Cloudflare so you can upload photos."],
        [!!(S.site.email || S.site.whatsapp), "Contact details added", "Add your email or WhatsApp in Settings so they show on the site."],
        [!!S.site.formAccessKey, "Email alerts for new messages", "Optional: add a Web3Forms key in Settings to get every enquiry by email too."],
        [unpriced === 0, "Every artwork has a price", unpriced + " artwork" + (unpriced === 1 ? " shows" : "s show") + " “Price on request”."]
      ];
      var body =
        '<p class="text-[15px] text-stone">' + hello + '. Here is what is happening on the site.</p>' +
        '<div class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">' +
          stat(newMsgs.length, "New messages", "#inbox", newMsgs.length > 0) + stat((st.orders.requested || 0), "Orders to quote", "#orders", (st.orders.requested || 0) > 0) +
          stat(st.artworks.available, "Works available", "#artworks") + stat(st.artworks.sold, "Works sold", "#artworks") +
        "</div>" +
        '<div class="mt-6 grid gap-3 sm:grid-cols-3">' +
          (can("artworks", "edit") ? '<a href="#artwork/new" class="' + B_DARK + ' h-14">' + ic("plus", "h-4 w-4") + "Add artwork</a>" : "") +
          (can("artists", "edit") ? '<a href="#artist/new" class="' + B_OUT + ' h-14">' + ic("plus", "h-4 w-4") + "Add artist</a>" : "") +
          '<a href="/" target="_blank" rel="noopener" class="' + B_OUT + ' h-14">' + ic("ext", "h-4 w-4") + "View live site</a>" +
        "</div>" +
        '<div class="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">' +
          '<section class="' + CARD + ' min-w-0 overflow-hidden"><div class="flex items-center justify-between border-b border-walnut/10 px-5 py-4"><h2 class="font-display text-[20px] text-walnut">Latest messages</h2><a href="#inbox" class="text-[13px] font-medium text-walnut underline underline-offset-4">View all</a></div>' +
            (!can("inbox", "view") ? '<p class="px-5 py-10 text-center text-[15px] text-stone">You don\'t have access to the Inbox.</p>' : S.inbox.slice(0, 6).map(inboxRow).join("") || '<p class="px-5 py-10 text-center text-[15px] text-stone">No messages yet. Enquiries, orders and applications will appear here.</p>') +
          "</section>" +
          (!S.me.owner ? '<section class="' + CARD + ' self-start p-5"><h2 class="font-display text-[20px] text-walnut">Your access</h2><ul class="mt-3 grid gap-2 text-[14px]">' + SECTIONS.filter(function (x) { return can(x[0], "view"); }).map(function (x) { return '<li class="flex justify-between gap-3"><span class="text-walnut">' + x[1] + '</span><span class="text-stone">' + (can(x[0], "edit") ? "Can edit" : "View only") + "</span></li>"; }).join("") + "</ul></section>" :
          '<section class="' + CARD + ' self-start"><div class="border-b border-walnut/10 px-5 py-4"><h2 class="font-display text-[20px] text-walnut">Setup checklist</h2></div><ul class="divide-y divide-walnut/10">' +
            checks.map(function (c) { return '<li class="flex gap-3 px-5 py-3.5"><span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ' + (c[0] ? "bg-olive text-white" : "border border-walnut/30") + '">' + (c[0] ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="h-3 w-3"><path d="M20 6 9 17l-5-5"/></svg>' : "") + '</span><span><span class="block text-[14px] font-medium ' + (c[0] ? "text-stone line-through decoration-walnut/30" : "text-walnut") + '">' + c[1] + "</span>" + (!c[0] && c[2] ? '<span class="block text-[13px] text-stone">' + esc(c[2]) + "</span>" : "") + "</span></li>"; }).join("") +
          "</ul></section>") +
        "</div>";
      shell("overview", "Overview", body);
    }).catch(fail);
  }

  /* ---------------------------------------------------- artworks */
  function viewArtworks() {
    loading("artworks", "Artworks");
    loadAll(["artworks", "artists", "inbox", "orders"]).then(function () {
      var state = { q: "", status: "all" };
      shell("artworks", "Artworks", '<div class="flex flex-col gap-3 sm:flex-row"><input id="aw-q" type="search" class="' + INP + ' sm:flex-1" placeholder="Search artworks"><select id="aw-st" class="' + INP + ' sm:w-48"><option value="all">All works</option><option value="available">Available</option><option value="sold">Sold</option><option value="reserved">Reserved</option><option value="commission">Made to order</option><option value="draft">Hidden drafts</option></select></div><p id="aw-count" class="mt-4 text-[13px] text-stone"></p><ul id="aw-list" class="mt-3 divide-y divide-walnut/10 border border-walnut/10 bg-ivory"></ul><p class="mt-4 text-[13px] text-stone">Tip: use the arrows to set the order works appear in on the site. Starred works show first on the homepage.</p>',
        '<a href="#artwork/new" class="' + B_DARK + ' h-10 px-4">' + ic("plus", "h-4 w-4") + '<span class="hidden sm:inline">Add artwork</span></a>');
      function render() {
        var list = S.artworks.filter(function (w) {
          if (state.status === "draft") { if (!w.draft) return false; } else if (state.status !== "all" && w.status !== state.status) return false;
          return !state.q || (w.title + " " + artistName(w.artist) + " " + (w.category || "")).toLowerCase().indexOf(state.q) > -1;
        });
        $("#aw-count").textContent = list.length + " of " + S.artworks.length + " artworks";
        $("#aw-list").innerHTML = list.map(function (w) {
          return '<li class="flex items-center gap-3 p-3 md:gap-4 md:p-4" data-id="' + esc(w.id) + '">' +
            '<a href="#artwork/' + encodeURIComponent(w.id) + '" class="h-16 w-14 shrink-0 overflow-hidden bg-sand md:h-20 md:w-16">' + thumb(w.images && w.images[0]) + "</a>" +
            '<a href="#artwork/' + encodeURIComponent(w.id) + '" class="min-w-0 flex-1"><p class="truncate text-[15px] font-medium text-walnut">' + esc(w.title) + (w.draft ? ' <span class="ml-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone">Hidden</span>' : "") + '</p><p class="truncate text-[13px] text-stone">' + esc(artistName(w.artist)) + " · " + esc(money(w.price)) + "</p></a>" +
            '<select data-quick-status class="hidden h-9 border border-walnut/15 bg-ivory px-2 text-[13px] text-walnut sm:block">' + ["available", "reserved", "sold", "commission"].map(function (s) { return '<option value="' + s + '"' + (w.status === s ? " selected" : "") + ">" + STATUS_LABEL[s] + "</option>"; }).join("") + "</select>" +
            '<span class="sm:hidden">' + pill(w.status) + "</span>" +
            '<button type="button" data-star class="flex h-9 w-9 items-center justify-center ' + (w.featured ? "text-olive" : "text-walnut/25 hover:text-walnut/60") + '" aria-label="Feature on homepage">' + ic("star", "h-5 w-5" + (w.featured ? " fill-current" : "")) + "</button>" +
            '<div class="hidden flex-col md:flex"><button type="button" data-move="-1" class="flex h-6 w-8 items-center justify-center text-stone hover:text-walnut" aria-label="Move up">' + ic("up", "h-4 w-4") + '</button><button type="button" data-move="1" class="flex h-6 w-8 items-center justify-center text-stone hover:text-walnut" aria-label="Move down">' + ic("down", "h-4 w-4") + "</button></div>" +
          "</li>";
        }).join("") || '<li class="p-10 text-center text-[15px] text-stone">No artworks match.</li>';
      }
      function save(w, msg) { return api("/api/admin/artworks", { method: "POST", body: w }).then(function (r) { Object.assign(w, r.item); toast(msg || "Saved"); render(); }).catch(fail); }
      $("#aw-q").addEventListener("input", function (e) { state.q = e.target.value.toLowerCase(); render(); });
      $("#aw-st").addEventListener("change", function (e) { state.status = e.target.value; render(); });
      $("#aw-list").addEventListener("change", function (e) {
        var li = e.target.closest("[data-id]"); if (!li || !e.target.hasAttribute("data-quick-status")) return;
        var w = S.artworks.find(function (x) { return x.id === li.getAttribute("data-id"); }); w.status = e.target.value; save(w, "Marked " + STATUS_LABEL[w.status].toLowerCase());
      });
      $("#aw-list").addEventListener("click", function (e) {
        var li = e.target.closest("[data-id]"); if (!li) return;
        var idx = S.artworks.findIndex(function (x) { return x.id === li.getAttribute("data-id"); }), w = S.artworks[idx];
        if (e.target.closest("[data-star]")) { w.featured = !w.featured; save(w, w.featured ? "Featured on homepage" : "Removed from homepage"); }
        var mv = e.target.closest("[data-move]");
        if (mv) {
          var to = idx + Number(mv.getAttribute("data-move")); if (to < 0 || to >= S.artworks.length) return;
          S.artworks.splice(to, 0, S.artworks.splice(idx, 1)[0]); render();
          api("/api/admin/artworks", { method: "POST", body: { order: S.artworks.map(function (x) { return x.id; }) } }).then(function () { toast("Order updated"); }).catch(fail);
        }
      });
      render();
    }).catch(fail);
  }

  function photoManager(images, onChange, single) {
    var id = "pm" + Math.random().toString(36).slice(2, 7);
    function html() {
      return '<div id="' + id + '"><div class="grid grid-cols-3 gap-3 sm:grid-cols-4">' +
        images.map(function (s, i) {
          return '<div class="group relative aspect-[4/5] overflow-hidden bg-sand">' + thumb(s) +
            (i === 0 && !single ? '<span class="absolute left-2 top-2 bg-ivory px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-walnut">Main</span>' : "") +
            '<div class="absolute inset-x-0 bottom-0 flex justify-between bg-walnut/80 p-1">' +
              (single ? "" : '<button type="button" data-pm="left" data-i="' + i + '" class="flex h-8 w-8 items-center justify-center text-ivory" aria-label="Move left">' + ic("left", "h-4 w-4") + '</button><button type="button" data-pm="right" data-i="' + i + '" class="flex h-8 w-8 items-center justify-center text-ivory" aria-label="Move right">' + ic("right", "h-4 w-4") + "</button>") +
              '<button type="button" data-pm="remove" data-i="' + i + '" class="ml-auto flex h-8 w-8 items-center justify-center text-ivory" aria-label="Remove photo">' + ic("trash", "h-4 w-4") + "</button></div></div>";
        }).join("") +
        ((single && images.length) ? "" : '<label class="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-walnut/30 bg-ivory text-center text-[13px] font-medium text-walnut hover:border-walnut">' + ic("photo", "h-7 w-7") + '<span data-pm-label>' + (single ? "Add photo" : "Add photos") + '</span><input type="file" accept="image/*" ' + (single ? "" : "multiple") + ' class="sr-only" data-pm-file></label>') +
        "</div>" +
        '<button type="button" data-pm-lib class="mt-3 text-[13px] font-medium text-walnut underline underline-offset-4">Choose from photo library</button></div>';
    }
    function bind() {
      var root = document.getElementById(id); if (!root) return;
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-pm]");
        if (b) {
          var i = Number(b.getAttribute("data-i")), act = b.getAttribute("data-pm");
          if (act === "remove") images.splice(i, 1);
          if (act === "left" && i > 0) images.splice(i - 1, 0, images.splice(i, 1)[0]);
          if (act === "right" && i < images.length - 1) images.splice(i + 1, 0, images.splice(i, 1)[0]);
          redraw();
        }
        if (e.target.closest("[data-pm-lib]")) libraryPicker(function (url) { if (single) images.splice(0, images.length, url); else images.push(url); redraw(); });
      });
      var f = root.querySelector("[data-pm-file]");
      if (f) f.addEventListener("change", function () {
        var files = Array.prototype.slice.call(f.files); if (!files.length) return;
        var lbl = root.querySelector("[data-pm-label]"), done = 0;
        lbl.textContent = "Uploading 1 of " + files.length + "…";
        files.reduce(function (p, file) {
          return p.then(function () { return upload(file).then(function (url) { if (single) images.splice(0, images.length, url); else images.push(url); done++; lbl.textContent = "Uploading " + Math.min(done + 1, files.length) + " of " + files.length + "…"; }); });
        }, Promise.resolve()).then(function () { toast(files.length > 1 ? files.length + " photos added" : "Photo added"); redraw(); }).catch(function (e) { fail(e); redraw(); });
      });
    }
    function redraw() { var root = document.getElementById(id); if (root) { root.outerHTML = html(); bind(); } onChange && onChange(images); }
    return { html: html, bind: bind };
  }

  function libraryPicker(onPick) {
    var wrap = document.createElement("div");
    wrap.className = "fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-6";
    wrap.innerHTML = '<div class="flex max-h-[85vh] w-full max-w-3xl flex-col bg-ivory"><div class="flex items-center justify-between border-b border-walnut/10 px-5 py-4"><h2 class="font-display text-[20px] text-walnut">Photo library</h2><button type="button" data-close class="h-10 w-10 text-2xl text-walnut" aria-label="Close">&times;</button></div><div data-grid class="grid flex-1 grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-5"><p class="col-span-full text-stone">Loading…</p></div></div>';
    document.body.appendChild(wrap);
    function close() { wrap.remove(); }
    wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.closest("[data-close]")) close(); var p = e.target.closest("[data-url]"); if (p) { onPick(p.getAttribute("data-url")); close(); } });
    load("media", true).then(function () {
      var site = [];
      S.artworks.forEach(function (w) { (w.images || []).forEach(function (s) { site.push(s); }); });
      S.artists.forEach(function (a) { if (a.portrait) site.push(a.portrait); });
      var all = S.media.map(function (m) { return m.url; }).concat(site.filter(function (s, i) { return site.indexOf(s) === i; }));
      $("[data-grid]", wrap).innerHTML = all.map(function (u) { return '<button type="button" data-url="' + esc(u) + '" class="aspect-[4/5] overflow-hidden bg-sand hover:outline hover:outline-2 hover:outline-walnut">' + thumb(u) + "</button>"; }).join("") || '<p class="col-span-full text-stone">No photos yet. Upload from the artwork editor or the Photos page.</p>';
    }).catch(fail);
  }

  function viewArtwork(id) {
    loading("artworks", "Artwork");
    loadAll(["artworks", "artists", "inbox", "orders"]).then(function () {
      var isNew = id === "new";
      var w = isNew ? { title: "", artist: (S.artists[0] || {}).id, status: "available", images: [], price: null } : S.artworks.find(function (x) { return x.id === id; });
      if (!w) { shell("artworks", "Not found", '<p class="text-stone">This artwork no longer exists.</p>', "", "#artworks"); return; }
      var images = (w.images || []).slice();
      var pm = photoManager(images);
      var cats = S.artworks.map(function (x) { return x.category; }).filter(function (c, i, a) { return c && a.indexOf(c) === i; });
      var statusSeg = ["available", "reserved", "sold", "commission"].map(function (s) {
        return '<label class="flex-1"><input type="radio" name="status" value="' + s + '" class="peer sr-only"' + (w.status === s ? " checked" : "") + '><span class="flex h-11 cursor-pointer items-center justify-center border border-walnut/20 bg-ivory px-2 text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-stone peer-checked:border-walnut peer-checked:bg-walnut peer-checked:text-ivory">' + STATUS_LABEL[s] + "</span></label>";
      }).join("");
      var body =
        '<form id="aw-form" class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">' +
          '<div class="grid content-start gap-5">' +
            '<section class="' + CARD + ' grid gap-5 p-5"><h2 class="font-display text-[20px] text-walnut">Photos</h2>' + pm.html() + '<p class="text-[13px] text-stone">The first photo is the main image. Photos are resized automatically before upload. For a studio finish, send raw photos to Claude to edit first.</p></section>' +
            '<section class="' + CARD + ' grid gap-5 p-5"><h2 class="font-display text-[20px] text-walnut">Details</h2>' +
              field("Title", input("title", w.title, 'required placeholder="e.g. Sleeping Lion"')) +
              '<div class="grid gap-5 sm:grid-cols-2">' +
                field("Artist", '<select name="artist" class="' + INP + '">' + S.artists.map(function (a) { return '<option value="' + esc(a.id) + '"' + (a.id === w.artist ? " selected" : "") + ">" + esc(a.name) + "</option>"; }).join("") + "</select>") +
                field("Art form", input("category", w.category, 'list="cats" placeholder="e.g. Wood carving"') + '<datalist id="cats">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist>") +
              "</div>" +
              field("Medium", input("medium", w.medium, 'placeholder="e.g. Hand carved mahogany, polished"')) +
              '<div class="grid gap-5 sm:grid-cols-3">' + field("Dimensions", input("dimensions", w.dimensions, 'placeholder="60 x 30 x 25 cm"'), "", true) + field("Weight", input("weight", w.weight, 'placeholder="8 kg"'), "", true) + field("Year", input("year", w.year, 'placeholder="2026"'), "", true) + "</div>" +
              field("Description", textarea("description", w.description, 5, 'placeholder="What it is, how it was made, what makes it special"')) +
              field("The story behind it", textarea("story", w.story, 3), "", true) +
              field("Provenance", textarea("provenance", w.provenance, 2, 'placeholder="Made by … in … and offered directly from the artist."'), "", true) +
              field("Image description", input("alt", w.alt), "Describes the photo for screen readers and Google.", true) +
            "</section>" +
          "</div>" +
          '<div class="grid content-start gap-5">' +
            '<section class="' + CARD + ' grid gap-5 p-5 lg:sticky lg:top-24"><h2 class="font-display text-[20px] text-walnut">Price &amp; status</h2>' +
              field("Price (" + esc(S.site.currency || "USD") + ")", input("price", w.price == null ? "" : w.price, 'type="number" min="0" step="1" inputmode="decimal" placeholder="Leave empty for Price on request"')) +
              '<div><span class="' + LBL + '">Status</span><div class="grid grid-cols-2 gap-2">' + statusSeg + "</div></div>" +
              toggle("featured", !!w.featured, "Feature on homepage", "Shows first in the collection and homepage.") +
              toggle("draft", !!w.draft, "Hide from website", "Keep it private while you finish the details.") +
              '<div class="grid gap-2 pt-2"><button type="submit" class="' + B_DARK + ' h-12">' + (isNew ? "Publish artwork" : "Save changes") + "</button>" +
              (isNew ? "" : '<a href="/artwork?id=' + encodeURIComponent(w.id) + '" target="_blank" rel="noopener" class="' + B_OUT + '">' + ic("ext", "h-4 w-4") + "View on site</a>") + "</div>" +
              (isNew ? "" : '<button type="button" id="aw-del" class="justify-self-start text-[13px] font-medium text-red-700 underline underline-offset-4">Delete artwork</button>') +
            "</section>" +
          "</div>" +
        "</form>";
      shell("artworks", isNew ? "New artwork" : esc(w.title), body, "", "#artworks");
      pm.bind();
      $("#aw-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var d = formData(e.target);
        d.status = (e.target.querySelector('input[name="status"]:checked') || {}).value || "available";
        if (!d.title.trim()) { toast("Please add a title", "err"); return; }
        var out = Object.assign({}, w, d, { images: images, price: d.price === "" ? null : Number(d.price) });
        if (isNew) delete out.id;
        var b = e.target.querySelector('button[type="submit"]'); b.disabled = true;
        api("/api/admin/artworks", { method: "POST", body: out }).then(function (r) {
          S.loaded.artworks = false; toast(isNew ? "Artwork published" : "Saved");
          if (isNew) location.hash = "#artwork/" + encodeURIComponent(r.item.id); else { b.disabled = false; Object.assign(w, r.item); }
        }).catch(function (err) { b.disabled = false; fail(err); });
      });
      var del = $("#aw-del");
      if (del) del.addEventListener("click", function () {
        if (!confirm("Delete “" + w.title + "” permanently? This cannot be undone.")) return;
        api("/api/admin/artworks?id=" + encodeURIComponent(w.id), { method: "DELETE" }).then(function () { S.loaded.artworks = false; toast("Deleted"); location.hash = "#artworks"; }).catch(fail);
      });
    }).catch(fail);
  }

  /* ---------------------------------------------------- artists */
  function viewArtists() {
    loading("artists", "Artists");
    loadAll(["artists", "artworks", "inbox", "orders"]).then(function () {
      var body = '<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">' + S.artists.map(function (a) {
        var n = S.artworks.filter(function (w) { return w.artist === a.id; }).length;
        return '<li><a href="#artist/' + encodeURIComponent(a.id) + '" class="' + CARD + ' flex gap-4 p-4 hover:border-walnut/30"><span class="h-20 w-16 shrink-0 overflow-hidden bg-sand">' + thumb(a.portrait) + '</span><span class="min-w-0"><span class="block truncate font-display text-[20px] text-walnut">' + esc(a.name) + '</span><span class="block text-[13px] text-stone">' + esc((a.disciplines || []).join(", ")) + (a.country ? " · " + esc(a.country) : "") + '</span><span class="mt-2 block text-[13px] font-medium text-walnut">' + n + " work" + (n === 1 ? "" : "s") + "</span></span></a></li>";
      }).join("") + '<li><a href="#artist/new" class="flex h-full min-h-[112px] items-center justify-center gap-2 border border-dashed border-walnut/30 bg-ivory p-4 text-[14px] font-medium text-walnut hover:border-walnut">' + ic("plus", "h-4 w-4") + "Add an artist</a></li></ul>";
      shell("artists", "Artists", body, '<a href="#artist/new" class="' + B_DARK + ' h-10 px-4">' + ic("plus", "h-4 w-4") + '<span class="hidden sm:inline">Add artist</span></a>');
    }).catch(fail);
  }

  function viewArtist(id) {
    loading("artists", "Artist");
    loadAll(["artists", "artworks", "inbox", "orders"]).then(function () {
      var isNew = id === "new";
      var a = isNew ? { name: "", disciplines: [], highlights: [], bio: [], acceptsCommissions: true } : S.artists.find(function (x) { return x.id === id; });
      if (!a) { shell("artists", "Not found", '<p class="text-stone">This artist no longer exists.</p>', "", "#artists"); return; }
      var portrait = a.portrait ? [a.portrait] : [];
      var pm = photoManager(portrait, null, true);
      var body =
        '<form id="ar-form" class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">' +
          '<div class="grid content-start gap-5"><section class="' + CARD + ' grid gap-5 p-5"><h2 class="font-display text-[20px] text-walnut">Profile</h2>' +
            field("Full name", input("name", a.name, "required")) +
            '<div class="grid gap-5 sm:grid-cols-2">' + field("Country", input("country", a.country)) + field("City", input("city", a.city), "", true) + "</div>" +
            field("Art forms", input("disciplines", (a.disciplines || []).join(", "), 'placeholder="Wood carving, Sculpture"'), "Separate with commas. Used for filters and the artist wall.") +
            field("Short introduction", textarea("short", a.short, 2, 'maxlength="400"'), "One or two sentences shown on artist cards.") +
            field("Highlights", textarea("highlights", (a.highlights || []).join("\n"), 4), "One per line.", true) +
            field("Biography", textarea("bio", (a.bio || []).join("\n\n"), 6), "Leave an empty line between paragraphs.", true) +
            field("Artistic approach", textarea("approach", a.approach, 3), "Tools, materials and process, in the artist's words.", true) +
            '<div class="grid gap-5 sm:grid-cols-2">' + field("Instagram link", input("instagram", a.instagram, 'type="url" placeholder="https://"'), "", true) + field("Facebook link", input("facebook", a.facebook, 'type="url" placeholder="https://"'), "", true) + "</div>" +
          "</section></div>" +
          '<div class="grid content-start gap-5"><section class="' + CARD + ' grid gap-5 p-5 lg:sticky lg:top-24"><h2 class="font-display text-[20px] text-walnut">Portrait</h2>' + pm.html() +
            toggle("acceptsCommissions", !!a.acceptsCommissions, "Accepts commissions", "Shows the Commission button on their profile.") +
            toggle("featured", !!a.featured, "Featured artist", "Shown in the homepage feature section.") +
            '<div class="grid gap-2 pt-2"><button type="submit" class="' + B_DARK + ' h-12">' + (isNew ? "Add artist" : "Save changes") + "</button>" +
            (isNew ? "" : '<a href="/artist?id=' + encodeURIComponent(a.id) + '" target="_blank" rel="noopener" class="' + B_OUT + '">' + ic("ext", "h-4 w-4") + "View profile</a>") + "</div>" +
            (isNew ? "" : '<button type="button" id="ar-del" class="justify-self-start text-[13px] font-medium text-red-700 underline underline-offset-4">Delete artist</button>') +
          "</section></div>" +
        "</form>";
      shell("artists", isNew ? "New artist" : esc(a.name), body, "", "#artists");
      pm.bind();
      $("#ar-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var d = formData(e.target);
        var out = Object.assign({}, a, d, {
          portrait: portrait[0] || "",
          disciplines: d.disciplines.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
          highlights: d.highlights.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
          bio: d.bio.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean)
        });
        if (isNew) delete out.id;
        api("/api/admin/artists", { method: "POST", body: out }).then(function (r) {
          S.loaded.artists = false; toast(isNew ? "Artist added" : "Saved");
          if (isNew) location.hash = "#artist/" + encodeURIComponent(r.item.id); else Object.assign(a, r.item);
        }).catch(fail);
      });
      var del = $("#ar-del");
      if (del) del.addEventListener("click", function () {
        var n = S.artworks.filter(function (w) { return w.artist === a.id; }).length;
        if (!confirm("Delete " + a.name + "?" + (n ? " Their " + n + " artwork(s) will stay but show no artist until reassigned." : "") + " This cannot be undone.")) return;
        api("/api/admin/artists?id=" + encodeURIComponent(a.id), { method: "DELETE" }).then(function () { S.loaded.artists = false; toast("Deleted"); location.hash = "#artists"; }).catch(fail);
      });
    }).catch(fail);
  }

  /* ---------------------------------------------------- inbox */
  function inboxRow(m) {
    var preview = m.data.message || m.data.idea || m.data.about || m.data.works || m.data.artwork || "";
    return '<a href="#message/' + m.id + '" class="flex gap-3 border-b border-walnut/10 px-5 py-4 last:border-b-0 hover:bg-paper">' +
      '<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (m.status === "new" ? "bg-olive" : "bg-transparent") + '"></span>' +
      '<span class="min-w-0 flex-1"><span class="flex items-baseline justify-between gap-3"><span class="truncate text-[15px] ' + (m.status === "new" ? "font-semibold" : "font-medium") + ' text-walnut">' + esc(m.name || m.email || "Someone") + '</span><span class="shrink-0 text-[12px] text-stone">' + ago(m.created_at) + "</span></span>" +
      '<span class="block text-[12px] font-semibold uppercase tracking-[0.1em] text-terracotta-deep">' + esc(m.kind) + '</span><span class="block truncate text-[14px] text-stone">' + esc(String(preview).slice(0, 140)) + "</span></span></a>";
  }
  function viewInbox() {
    loading("inbox", "Inbox");
    loadAll(["inbox", "orders"], true).then(function () {
      var st = { status: "all", kind: "all" };
      var kinds = S.inbox.map(function (m) { return m.kind; }).filter(function (k, i, a) { return a.indexOf(k) === i; });
      var chip = function (v, l) { return '<button type="button" data-chip="' + v + '" class="h-9 border px-3.5 text-[13px] font-medium">' + l + "</button>"; };
      shell("inbox", "Inbox", '<div class="flex flex-wrap items-center gap-2">' + chip("all", "All") + chip("new", "New") + chip("replied", "Replied") + chip("closed", "Closed") +
        '<select id="ib-kind" class="ml-auto h-9 border border-walnut/20 bg-ivory px-2 text-[13px]"><option value="all">All types</option>' + kinds.map(function (k) { return "<option>" + esc(k) + "</option>"; }).join("") + "</select></div>" +
        '<div id="ib-list" class="mt-4 border border-walnut/10 bg-ivory"></div>');
      function render() {
        $$("[data-chip]").forEach(function (b) { var on = b.getAttribute("data-chip") === st.status; b.className = "h-9 border px-3.5 text-[13px] font-medium " + (on ? "border-walnut bg-walnut text-ivory" : "border-walnut/20 bg-ivory text-walnut hover:border-walnut"); });
        var list = S.inbox.filter(function (m) { return (st.status === "all" || m.status === st.status) && (st.kind === "all" || m.kind === st.kind); });
        $("#ib-list").innerHTML = list.map(inboxRow).join("") || '<p class="px-5 py-12 text-center text-[15px] text-stone">Nothing here.</p>';
      }
      $$("[data-chip]").forEach(function (b) { b.addEventListener("click", function () { st.status = b.getAttribute("data-chip"); render(); }); });
      $("#ib-kind").addEventListener("change", function (e) { st.kind = e.target.value; render(); });
      render();
    }).catch(fail);
  }

  function viewMessage(id) {
    loading("inbox", "Message");
    loadAll(["inbox", "orders", "site", "artworks"]).then(function () {
      var m = S.inbox.find(function (x) { return String(x.id) === String(id); });
      if (!m) { shell("inbox", "Not found", '<p class="text-stone">This message no longer exists.</p>', "", "#inbox"); return; }
      var order = S.orders.find(function (o) { return String(o.submission_id) === String(m.id); });
      var phone = m.data.whatsapp || m.data.phone || "";
      var digits = String(phone).replace(/\D/g, "");
      var skip = { page: 1, items_json: 1, subtotal: 0 };
      var rows = Object.keys(m.data).filter(function (k) { return !skip[k] && m.data[k]; }).map(function (k) {
        var v = String(m.data[k]); var isLink = /^https?:\/\//.test(v);
        return '<div class="grid gap-1 border-b border-walnut/10 py-3 sm:grid-cols-[160px_1fr]"><dt class="text-[13px] text-stone">' + esc(labelize(k)) + '</dt><dd class="whitespace-pre-wrap break-words text-[15px] text-walnut">' + (isLink ? '<a class="underline underline-offset-4" target="_blank" rel="noopener" href="' + esc(v) + '">' + esc(v) + "</a>" : esc(v)) + "</dd></div>";
      }).join("");
      var subj = "Re: your " + m.kind.toLowerCase() + " · " + (S.site.name || "Out of Africa");
      var greet = "Hello " + (m.name ? m.name.split(" ")[0] : "") + ",\n\nThank you for getting in touch with " + (S.site.name || "Out of Africa") + ".\n\n";
      var body =
        '<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">' +
          '<section class="' + CARD + ' p-5"><div class="flex flex-wrap items-center gap-3"><span class="text-[12px] font-semibold uppercase tracking-[0.12em] text-terracotta-deep">' + esc(m.kind) + "</span>" + pill(m.status) + '<span class="text-[13px] text-stone">' + new Date(m.created_at).toLocaleString() + "</span></div>" +
            '<h2 class="mt-3 font-display text-[28px] leading-tight text-walnut">' + esc(m.name || "Unknown") + "</h2>" +
            (m.email ? '<p class="text-[15px] text-stone">' + esc(m.email) + "</p>" : "") +
            '<dl class="mt-5 border-t border-walnut/10">' + rows + "</dl>" +
          "</section>" +
          '<section class="grid content-start gap-3">' +
            (m.email ? '<a href="mailto:' + esc(m.email) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(greet) + '" class="' + B_DARK + ' h-12" data-replied>' + ic("mail", "h-4 w-4") + "Reply by email</a>" : "") +
            (digits.length >= 8 ? '<a href="https://wa.me/' + digits + "?text=" + encodeURIComponent(greet) + '" target="_blank" rel="noopener" class="' + B_OLIVE + ' h-12" data-replied>' + ic("chat", "h-4 w-4") + "Reply on WhatsApp</a>" : "") +
            (order ? '<a href="#order/' + encodeURIComponent(order.id) + '" class="' + B_OUT + ' h-12">' + ic("orders", "h-4 w-4") + "Open order " + esc(order.id) + "</a>"
              : (/enquiry/i.test(m.kind) && m.data.artwork ? '<button type="button" id="mk-quote" class="' + B_OUT + ' h-12">' + ic("orders", "h-4 w-4") + "Create a quote</button>" : "")) +
            '<div class="' + CARD + ' mt-2 grid gap-3 p-4"><span class="' + LBL + '">Status</span><div class="grid grid-cols-3 gap-2">' + ["new", "replied", "closed"].map(function (s) { return '<button type="button" data-status="' + s + '" class="h-10 border text-[12px] font-semibold uppercase tracking-[0.08em] ' + (m.status === s ? "border-walnut bg-walnut text-ivory" : "border-walnut/20 text-walnut") + '">' + STATUS_LABEL[s] + "</button>"; }).join("") + "</div>" +
              field("Private notes", textarea("notes", m.notes, 4, 'id="mnotes" placeholder="Only you can see these"')) + '<p id="notes-state" class="text-[12px] text-stone"></p></div>' +
            '<button type="button" id="m-del" class="justify-self-start text-[13px] font-medium text-red-700 underline underline-offset-4">Delete message</button>' +
          "</section>" +
        "</div>";
      shell("inbox", esc(m.kind), body, "", "#inbox");
      function setStatus(s) { m.status = s; return api("/api/admin/submissions", { method: "PATCH", body: { id: m.id, status: s } }); }
      if (m.status === "new") { /* opening doesn't change status; replying does */ }
      $$("[data-replied]").forEach(function (a) { a.addEventListener("click", function () { if (m.status === "new") setStatus("replied").then(function () { viewMessage(id); }); }); });
      $$("[data-status]").forEach(function (b) { b.addEventListener("click", function () { setStatus(b.getAttribute("data-status")).then(function () { toast("Marked " + STATUS_LABEL[m.status].toLowerCase()); viewMessage(id); }).catch(fail); }); });
      var t, notes = $("#mnotes");
      notes.addEventListener("input", function () { clearTimeout(t); $("#notes-state").textContent = "Saving…"; t = setTimeout(function () { api("/api/admin/submissions", { method: "PATCH", body: { id: m.id, notes: notes.value } }).then(function () { m.notes = notes.value; $("#notes-state").textContent = "Saved"; }).catch(fail); }, 700); });
      $("#m-del").addEventListener("click", function () { if (!confirm("Delete this message permanently?")) return; api("/api/admin/submissions?id=" + m.id, { method: "DELETE" }).then(function () { S.loaded.inbox = false; toast("Deleted"); location.hash = "#inbox"; }).catch(fail); });
      var mk = $("#mk-quote");
      if (mk) mk.addEventListener("click", function () {
        var aid = (String(m.data.artwork).match(/\(([^)]+)\)\s*$/) || [])[1];
        var w = S.artworks.find(function (x) { return x.id === aid; });
        var items = [{ id: aid || "", title: w ? w.title : String(m.data.artwork).replace(/\s*\([^)]*\)\s*$/, ""), artist: w ? artistName(w.artist) : (m.data.artist || ""), price: w ? w.price : null }];
        api("/api/admin/orders", { method: "POST", body: { submission_id: m.id, buyer: { name: m.name, email: m.email, phone: phone, address: m.data.country || "" }, items: items } })
          .then(function (r) { S.loaded.orders = false; location.hash = "#order/" + encodeURIComponent(r.id); }).catch(fail);
      });
    }).catch(fail);
  }

  /* ---------------------------------------------------- orders */
  function orderTotal(o) {
    var d = o.data, items = d.items || [];
    var known = items.filter(function (i) { return i.price !== null && i.price !== "" && !isNaN(i.price); });
    var sub = known.reduce(function (s, i) { return s + Number(i.price); }, 0);
    var complete = known.length === items.length && d.shipping !== null && d.shipping !== "" && d.shipping !== undefined;
    return { sub: sub, total: sub + (Number(d.shipping) || 0), complete: complete };
  }
  function viewOrders() {
    loading("orders", "Orders");
    loadAll(["orders", "inbox"], true).then(function () {
      var groups = ["requested", "quoted", "paid", "shipped", "delivered", "cancelled"];
      var st = { s: "open" };
      shell("orders", "Orders",
        '<div class="flex flex-wrap gap-2" id="or-chips"></div><div id="or-list" class="mt-4 border border-walnut/10 bg-ivory"></div>' +
        '<p class="mt-4 text-[13px] leading-relaxed text-stone">Orders arrive from the checkout. Add shipping and a payment link, then send the buyer their private quote page.</p>');
      function render() {
        var count = function (s) { return S.orders.filter(function (o) { return s === "open" ? ["requested", "quoted", "paid", "shipped"].indexOf(o.status) > -1 : s === "all" || o.status === s; }).length; };
        $("#or-chips").innerHTML = ["open", "all"].concat(groups).map(function (s) {
          var on = st.s === s, l = s === "open" ? "Open" : s === "all" ? "All" : STATUS_LABEL[s];
          return '<button type="button" data-s="' + s + '" class="h-9 border px-3.5 text-[13px] font-medium ' + (on ? "border-walnut bg-walnut text-ivory" : "border-walnut/20 bg-ivory text-walnut hover:border-walnut") + '">' + l + ' <span class="opacity-60">' + count(s) + "</span></button>";
        }).join("");
        var list = S.orders.filter(function (o) { return st.s === "open" ? ["requested", "quoted", "paid", "shipped"].indexOf(o.status) > -1 : st.s === "all" || o.status === st.s; });
        $("#or-list").innerHTML = list.map(function (o) {
          var t = orderTotal(o), items = o.data.items || [];
          return '<a href="#order/' + encodeURIComponent(o.id) + '" class="flex items-center gap-3 border-b border-walnut/10 px-5 py-4 last:border-b-0 hover:bg-paper"><span class="min-w-0 flex-1"><span class="flex items-center gap-2"><span class="text-[15px] font-semibold text-walnut">' + esc(o.id) + "</span>" + pill(o.status) + '</span><span class="block truncate text-[14px] text-stone">' + esc((o.data.buyer && o.data.buyer.name) || "Buyer") + " · " + items.length + " work" + (items.length === 1 ? "" : "s") + " · " + esc(items.map(function (i) { return i.title; }).join(", ")) + '</span></span><span class="shrink-0 text-right"><span class="block text-[14px] font-semibold text-walnut">' + (t.complete ? esc(money(t.total, o.data.currency)) : "To quote") + '</span><span class="block text-[12px] text-stone">' + ago(o.updated_at) + "</span></span></a>";
        }).join("") || '<p class="px-5 py-12 text-center text-[15px] text-stone">No orders here yet.</p>';
        $$("#or-chips [data-s]").forEach(function (b) { b.addEventListener("click", function () { st.s = b.getAttribute("data-s"); render(); }); });
      }
      render();
    }).catch(fail);
  }

  function viewOrder(id) {
    loading("orders", "Order");
    loadAll(["orders", "artworks", "artists", "site", "inbox"], true).then(function () {
      var o = S.orders.find(function (x) { return x.id === id; });
      if (!o) { shell("orders", "Not found", '<p class="text-stone">This order no longer exists.</p>', "", "#orders"); return; }
      var d = JSON.parse(JSON.stringify(o.data)); d.items = d.items || []; d.buyer = d.buyer || {};
      var link = location.origin + "/quote?id=" + encodeURIComponent(o.id) + "&t=" + encodeURIComponent(o.token);
      function itemsHTML() {
        return d.items.map(function (it, i) {
          var w = S.artworks.find(function (x) { return x.id === it.id; });
          return '<li class="flex items-center gap-3 border-b border-walnut/10 py-3"><span class="h-14 w-12 shrink-0 overflow-hidden bg-sand">' + thumb(w && w.images && w.images[0]) + '</span><span class="min-w-0 flex-1"><span class="block truncate text-[15px] font-medium text-walnut">' + esc(it.title) + '</span><span class="block truncate text-[13px] text-stone">' + esc(it.artist || (w ? artistName(w.artist) : "")) + '</span></span><input data-item-price="' + i + '" type="number" min="0" step="1" inputmode="decimal" value="' + (it.price == null ? "" : it.price) + '" placeholder="Price" class="h-10 w-28 border border-walnut/20 bg-ivory px-2 text-right text-[15px] focus:border-walnut focus:outline-none"><button type="button" data-item-del="' + i + '" class="flex h-10 w-9 items-center justify-center text-stone hover:text-red-700" aria-label="Remove item">' + ic("trash", "h-4 w-4") + "</button></li>";
        }).join("");
      }
      var statusOpts = ["requested", "quoted", "paid", "shipped", "delivered", "cancelled"].map(function (s) { return '<option value="' + s + '"' + (o.status === s ? " selected" : "") + ">" + STATUS_LABEL[s] + "</option>"; }).join("");
      var body =
        '<div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">' +
          '<div class="grid content-start gap-5">' +
            '<section class="' + CARD + ' p-5"><div class="flex items-center justify-between"><h2 class="font-display text-[20px] text-walnut">Works</h2><select id="add-item" class="h-9 max-w-[180px] border border-walnut/20 bg-ivory px-2 text-[13px]"><option value="">+ Add a work</option>' + S.artworks.map(function (w) { return '<option value="' + esc(w.id) + '">' + esc(w.title) + "</option>"; }).join("") + '</select></div><ul id="items" class="mt-3 border-t border-walnut/10">' + itemsHTML() + "</ul>" +
              '<div class="mt-4 grid gap-4 sm:grid-cols-2">' + field("Shipping to buyer (" + esc(d.currency || "USD") + ")", input("shipping", d.shipping == null ? "" : d.shipping, 'type="number" min="0" step="1" inputmode="decimal" id="o-ship" placeholder="e.g. 180"'), "Insured, tracked delivery to their address.") +
              field("Quote valid until", input("valid_until", d.valid_until || "", 'type="date" id="o-valid"'), "", true) + "</div>" +
              '<dl id="totals" class="mt-5 border-t border-walnut/10 text-[15px]"></dl></section>' +
            '<section class="' + CARD + ' grid gap-4 p-5"><h2 class="font-display text-[20px] text-walnut">Quote for the buyer</h2>' +
              field("Payment link", input("payment_link", d.payment_link, 'type="url" id="o-pay" placeholder="Paste a Paystack, Flutterwave or PayPal payment link"'), "The buyer sees a Pay now button on their quote page.") +
              field("Message to the buyer", textarea("message", d.message, 4, 'id="o-msg" placeholder="Thank you for your interest. Here is your quote including insured shipping to your address…"')) +
              field("Private notes", textarea("notes", d.notes, 2, 'id="o-notes"'), "Not shown to the buyer.", true) +
            "</section>" +
          "</div>" +
          '<div class="grid content-start gap-5"><section class="' + CARD + ' grid gap-4 p-5 lg:sticky lg:top-24">' +
            '<div><p class="text-[12px] font-semibold uppercase tracking-[0.12em] text-stone">Buyer</p><p class="mt-1 font-display text-[22px] leading-tight text-walnut">' + esc(d.buyer.name || "Unknown") + '</p><p class="text-[14px] text-stone">' + esc(d.buyer.email || "") + (d.buyer.phone ? "<br>" + esc(d.buyer.phone) : "") + (d.buyer.address ? "<br>" + esc(d.buyer.address) : "") + "</p></div>" +
            field("Status", '<select id="o-status" class="' + INP + '">' + statusOpts + "</select>") +
            '<button type="button" id="o-save" class="' + B_DARK + ' h-12">Save order</button>' +
            '<div class="grid gap-2 border-t border-walnut/10 pt-4"><p class="text-[13px] font-medium text-walnut">Send the quote</p>' +
              '<button type="button" id="o-copy" class="' + B_OUT + '">' + ic("copy", "h-4 w-4") + "Copy quote link</button>" +
              (d.buyer.email ? '<button type="button" id="o-mail" class="' + B_OUT + '">' + ic("mail", "h-4 w-4") + "Send by email</button>" : "") +
              (String(d.buyer.phone || "").replace(/\D/g, "").length >= 8 ? '<button type="button" id="o-wa" class="' + B_OLIVE + '">' + ic("chat", "h-4 w-4") + "Send on WhatsApp</button>" : "") +
              '<a href="' + esc(link) + '" target="_blank" rel="noopener" class="text-center text-[13px] font-medium text-walnut underline underline-offset-4">Preview quote page</a>' +
            "</div>" +
            (o.submission_id ? '<a href="#message/' + o.submission_id + '" class="text-[13px] font-medium text-walnut underline underline-offset-4">Open the original request</a>' : "") +
            '<button type="button" id="o-del" class="justify-self-start text-[13px] font-medium text-red-700 underline underline-offset-4">Delete order</button>' +
          "</section></div>" +
        "</div>";
      shell("orders", "Order " + esc(o.id), body, "", "#orders");

      function totals() {
        var t = orderTotal({ data: d });
        $("#totals").innerHTML = '<div class="flex justify-between py-2.5"><dt class="text-stone">Works</dt><dd>' + esc(money(t.sub, d.currency)) + '</dd></div><div class="flex justify-between py-2.5"><dt class="text-stone">Shipping</dt><dd>' + (d.shipping === null || d.shipping === "" || d.shipping === undefined ? "Not set" : esc(money(d.shipping, d.currency))) + '</dd></div><div class="flex justify-between border-t border-walnut/10 py-3 font-display text-[22px] font-bold"><dt>Total</dt><dd>' + esc(money(t.total, d.currency)) + "</dd></div>" + (t.complete ? "" : '<p class="pb-1 text-[13px] text-terracotta-deep">Add a price for every work and the shipping cost before sending.</p>');
      }
      function bindItems() {
        $$("[data-item-price]").forEach(function (inp) { inp.addEventListener("input", function () { var i = Number(inp.getAttribute("data-item-price")); d.items[i].price = inp.value === "" ? null : Number(inp.value); totals(); }); });
        $$("[data-item-del]").forEach(function (b) { b.addEventListener("click", function () { d.items.splice(Number(b.getAttribute("data-item-del")), 1); $("#items").innerHTML = itemsHTML(); bindItems(); totals(); }); });
      }
      bindItems(); totals();
      $("#add-item").addEventListener("change", function (e) {
        var w = S.artworks.find(function (x) { return x.id === e.target.value; }); if (!w) return;
        d.items.push({ id: w.id, title: w.title, artist: artistName(w.artist), price: w.price }); e.target.value = "";
        $("#items").innerHTML = itemsHTML(); bindItems(); totals();
      });
      $("#o-ship").addEventListener("input", function (e) { d.shipping = e.target.value === "" ? null : Number(e.target.value); totals(); });
      function collect() { d.payment_link = $("#o-pay").value.trim(); d.message = $("#o-msg").value; d.notes = $("#o-notes").value; d.valid_until = $("#o-valid").value; }
      function save(status, quiet) {
        collect();
        var prev = o.status; status = status || $("#o-status").value;
        return api("/api/admin/orders", { method: "PATCH", body: { id: o.id, status: status, data: d } }).then(function () {
          o.status = status; o.data = JSON.parse(JSON.stringify(d)); $("#o-status").value = status;
          if (!quiet) toast("Order saved");
          if (status === "paid" && prev !== "paid") {
            var sellable = d.items.filter(function (it) { var w = S.artworks.find(function (x) { return x.id === it.id; }); return w && w.status !== "sold"; });
            if (sellable.length && confirm("Mark " + sellable.map(function (i) { return "“" + i.title + "”"; }).join(", ") + " as sold on the website?")) {
              return Promise.all(sellable.map(function (it) { var w = S.artworks.find(function (x) { return x.id === it.id; }); return api("/api/admin/artworks", { method: "POST", body: Object.assign({}, w, { status: "sold" }) }); }))
                .then(function () { S.loaded.artworks = false; toast("Marked as sold on the site"); });
            }
          }
        });
      }
      $("#o-save").addEventListener("click", function () { save().catch(fail); });
      function ready() { var t = orderTotal({ data: d }); collect(); if (!t.complete) { toast("Add every price and the shipping first", "err"); return false; } return true; }
      function sendPrep() { if (!ready()) return Promise.reject(new Error("")); return save(o.status === "requested" ? "quoted" : o.status, true); }
      var msg = function () { return "Hello " + ((d.buyer.name || "").split(" ")[0] || "") + ",\n\nThank you for your interest in " + d.items.map(function (i) { return i.title; }).join(", ") + ". Your quote, including shipping to your address, is ready here:\n" + link + "\n\nWarm regards,\n" + (S.site.name || "Out of Africa"); };
      $("#o-copy").addEventListener("click", function () {
        sendPrep().then(function () { return navigator.clipboard.writeText(link); }).then(function () { toast("Quote link copied"); }).catch(function (e) { if (e.message) fail(e); });
      });
      var om = $("#o-mail"); if (om) om.addEventListener("click", function () { sendPrep().then(function () { location.href = "mailto:" + d.buyer.email + "?subject=" + encodeURIComponent("Your quote from " + (S.site.name || "Out of Africa") + " · " + o.id) + "&body=" + encodeURIComponent(msg()); }).catch(function (e) { if (e.message) fail(e); }); });
      var ow = $("#o-wa"); if (ow) ow.addEventListener("click", function () { sendPrep().then(function () { window.open("https://wa.me/" + String(d.buyer.phone).replace(/\D/g, "") + "?text=" + encodeURIComponent(msg()), "_blank", "noopener"); }).catch(function (e) { if (e.message) fail(e); }); });
      $("#o-del").addEventListener("click", function () { if (!confirm("Delete order " + o.id + " permanently?")) return; api("/api/admin/orders?id=" + encodeURIComponent(o.id), { method: "DELETE" }).then(function () { S.loaded.orders = false; toast("Deleted"); location.hash = "#orders"; }).catch(fail); });
    }).catch(fail);
  }

  /* ---------------------------------------------------- photos */
  function viewPhotos() {
    loading("photos", "Photos");
    Promise.all([load("media", true), loadAll(["inbox", "orders", "artworks", "artists"])]).then(function () {
      var inUse = {};
      S.artworks.forEach(function (w) { (w.images || []).forEach(function (s) { inUse[src(s)] = w.title; }); });
      S.artists.forEach(function (a) { if (a.portrait) inUse[src(a.portrait)] = a.name; });
      var body = '<label class="' + B_DARK + ' h-12 w-full cursor-pointer sm:w-auto">' + ic("photo", "h-4 w-4") + '<span id="ph-label">Upload photos</span><input id="ph-file" type="file" accept="image/*" multiple class="sr-only"></label>' +
        '<p class="mt-3 text-[13px] text-stone">Uploaded photos can be used for artworks, portraits and homepage images.</p>' +
        '<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">' + S.media.map(function (m) {
          return '<div class="' + CARD + '"><div class="aspect-[4/5] overflow-hidden bg-sand">' + thumb(m.url) + '</div><div class="flex items-center gap-1 p-2"><span class="min-w-0 flex-1 truncate text-[12px] text-stone">' + (inUse[m.url] ? "Used: " + esc(inUse[m.url]) : "Not used yet") + '</span><button type="button" data-copy="' + esc(m.url) + '" class="flex h-8 w-8 items-center justify-center text-stone hover:text-walnut" aria-label="Copy link">' + ic("copy", "h-4 w-4") + '</button><button type="button" data-del="' + esc(m.url) + '" class="flex h-8 w-8 items-center justify-center text-stone hover:text-red-700" aria-label="Delete">' + ic("trash", "h-4 w-4") + "</button></div></div>";
        }).join("") + "</div>" + (S.media.length ? "" : '<p class="mt-6 border border-dashed border-walnut/25 p-10 text-center text-[15px] text-stone">No uploads yet. The original site photos are still in use and appear in the library picker.</p>');
      shell("photos", "Photos", body);
      $("#ph-file").addEventListener("change", function (e) {
        var files = Array.prototype.slice.call(e.target.files), i = 0;
        files.reduce(function (p, f) { return p.then(function () { $("#ph-label").textContent = "Uploading " + (++i) + " of " + files.length + "…"; return upload(f); }); }, Promise.resolve())
          .then(function () { toast("Uploaded"); viewPhotos(); }).catch(function (err) { fail(err); viewPhotos(); });
      });
      app.onclick = function (e) {
        var c = e.target.closest("[data-copy]"), d = e.target.closest("[data-del]");
        if (c) { navigator.clipboard.writeText(location.origin + c.getAttribute("data-copy")).then(function () { toast("Link copied"); }); }
        if (d) {
          var u = d.getAttribute("data-del");
          if (!confirm(inUse[u] ? "This photo is used by “" + inUse[u] + "”. Delete anyway?" : "Delete this photo?")) return;
          api("/api/admin/media?url=" + encodeURIComponent(u), { method: "DELETE" }).then(function () { toast("Deleted"); viewPhotos(); }).catch(fail);
        }
      };
    }).catch(fail);
  }

  /* ---------------------------------------------------- settings */
  function viewSettings() {
    loading("settings", "Settings");
    loadAll(["site", "inbox", "orders"], true).then(function () {
      var s = S.site, t = s.terms || {}, im = s.images || {};
      var imgPick = function (key, label, hint) {
        return '<div class="grid grid-cols-[96px_1fr] items-center gap-4"><div class="aspect-[4/5] overflow-hidden bg-sand" data-imgprev="' + key + '">' + thumb(im[key]) + '</div><div><p class="text-[14px] font-medium text-walnut">' + label + '</p><p class="text-[13px] text-stone">' + hint + '</p><div class="mt-2 flex gap-3"><button type="button" data-imgpick="' + key + '" class="text-[13px] font-medium text-walnut underline underline-offset-4">Choose</button><button type="button" data-imgclear="' + key + '" class="text-[13px] text-stone underline underline-offset-4">Use automatic</button></div></div></div>';
      };
      var oc = (s.openCall || []).map(function (o) { return o.form + " | " + o.who + " | " + o.text; }).join("\n");
      var sec = function (title, inner, hint) { return '<section class="' + CARD + ' grid gap-5 p-5"><div><h2 class="font-display text-[20px] text-walnut">' + title + "</h2>" + (hint ? '<p class="mt-1 text-[13px] text-stone">' + hint + "</p>" : "") + "</div>" + inner + "</section>"; };
      var body =
        '<form id="st-form" class="grid gap-5">' +
          sec("Brand", field("Site name", input("name", s.name)) + field("Announcement bar", input("announcement", s.announcement), "The thin bar at the top of every page. Leave empty to hide it.", true) + field("Footer credit", input("credit", s.credit), "", true)) +
          sec("Contact details", '<div class="grid gap-5 sm:grid-cols-2">' + field("Email", input("email", s.email, 'type="email" placeholder="hello@…"'), "Shown in the footer and contact page.", true) + field("WhatsApp number", input("whatsapp", s.whatsapp, 'inputmode="tel" placeholder="2348012345678"'), "Digits only, with country code. Adds a WhatsApp button.", true) + field("Instagram", input("instagram", (s.social || {}).instagram, 'type="url" placeholder="https://instagram.com/…"'), "", true) + field("Facebook", input("facebook", (s.social || {}).facebook, 'type="url" placeholder="https://facebook.com/…"'), "", true) + "</div>") +
          sec("Email alerts", field("Web3Forms access key", input("formAccessKey", s.formAccessKey, 'autocomplete="off" placeholder="Paste your free key from web3forms.com"'), "Every message already arrives in this Inbox. Add a free Web3Forms key and you also get each one by email.", true)) +
          sec("Shop", '<div class="grid gap-5 sm:grid-cols-2">' + field("Currency", input("currency", s.currency || "USD", 'maxlength="3"')) + field("Price filter steps", input("priceBands", (s.priceBands || []).join(", "), 'placeholder="500, 1500, 3000"'), "Used for the price filter on Explore.") + "</div>" + toggle("showDrafts", !!s.showDrafts, "Show hidden drafts on the website", "Only for previewing. Keep this off for visitors.")) +
          sec("Artist terms", '<div class="grid gap-5 sm:grid-cols-2">' + field("Artist share (%)", input("artistShare", t.artistShare != null ? t.artistShare : 75, 'type="number" min="0" max="100" id="st-share"')) + field("Marketplace share (%)", '<input id="st-mkt" disabled class="' + INP + ' opacity-70" value="' + (100 - (t.artistShare != null ? t.artistShare : 75)) + '">') + field("Shipping", input("termsShipping", t.shipping)) + field("Payouts", input("termsPayout", t.payout)) + "</div>" + field("Label", input("termsLabel", t.label)), "Shown on the For Artists page.") +
          sec("Homepage", field("Moving strip text", textarea("marquee", (s.marquee || []).join("\n"), 4), "One phrase per line.") +
            '<div class="grid gap-5 md:grid-cols-2">' + imgPick("hero", "Hero image", "Big image behind the headline. A wide photo works best.") + imgPick("pov", "Banner image", "The “Every piece, a point of view” banner.") + imgPick("detail", "Detail image", "Beside “Browse by art form”.") + imgPick("story-2", "Our Story image", "Second image on the Our Story page.") + "</div>") +
          sec("Open call spaces", field("Spaces on the artist wall", textarea("openCall", oc, 8), "One per line: Art form | who | short line. Forms that already have an artist are hidden automatically.")) +
          '<div class="sticky bottom-20 z-20 lg:bottom-4"><button type="submit" class="' + B_DARK + ' h-12 w-full shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)]">Save settings</button></div>' +
        "</form>";
      shell("settings", "Settings", body);
      var imgs = Object.assign({}, im);
      $("#st-share").addEventListener("input", function (e) { $("#st-mkt").value = 100 - (Number(e.target.value) || 0); });
      $$("[data-imgpick]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-imgpick"); libraryPicker(function (u) { imgs[k] = u; $('[data-imgprev="' + k + '"]').innerHTML = thumb(u); }); }); });
      $$("[data-imgclear]").forEach(function (b) { b.addEventListener("click", function () { var k = b.getAttribute("data-imgclear"); delete imgs[k]; $('[data-imgprev="' + k + '"]').innerHTML = thumb(""); }); });
      $("#st-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var d = formData(e.target), share = Math.max(0, Math.min(100, Number(d.artistShare) || 0));
        var out = {
          name: d.name, announcement: d.announcement, credit: d.credit, email: d.email.trim(), whatsapp: d.whatsapp.replace(/\D/g, ""),
          social: { instagram: d.instagram.trim(), facebook: d.facebook.trim() }, formAccessKey: d.formAccessKey.trim(),
          currency: (d.currency || "USD").toUpperCase(), priceBands: d.priceBands.split(",").map(function (x) { return Number(x.trim()); }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; }),
          showDrafts: d.showDrafts,
          terms: { artistShare: share, marketplaceShare: 100 - share, shipping: d.termsShipping, payout: d.termsPayout, label: d.termsLabel },
          marquee: d.marquee.split("\n").map(function (x) { return x.trim(); }).filter(Boolean),
          openCall: d.openCall.split("\n").map(function (l) { var p = l.split("|").map(function (x) { return x.trim(); }); return p[0] ? { form: p[0], who: p[1] || p[0].toLowerCase(), text: p[2] || "" } : null; }).filter(Boolean),
          images: imgs
        };
        if (!out.priceBands.length) out.priceBands = [500, 1500, 3000];
        api("/api/admin/settings", { method: "PUT", body: out }).then(function (r) { S.site = r.site; toast("Settings saved"); }).catch(fail);
      });
    }).catch(fail);
  }


  /* ---------------------------------------------------- team (owner only) */
  var TEAM = { team: [], activity: [] };
  function loadTeam() { return api("/api/admin/team").then(function (d) { TEAM = d; return d; }); }
  function memberState(m) {
    if (!m.active) return ["Switched off", "bg-paper text-stone border border-walnut/15"];
    if (m.expires_at && new Date(m.expires_at) <= new Date()) return ["Expired", "bg-paper text-stone border border-walnut/15"];
    return ["Active", "bg-olive text-white"];
  }
  function viewTeam() {
    loading("team", "Team");
    Promise.all([loadTeam(), loadAll(["inbox", "orders"])]).then(function () {
      var rows = TEAM.team.map(function (m) {
        var st = memberState(m), access = SECTIONS.filter(function (x) { return m.perms[x[0]]; }).map(function (x) { return x[1] + (m.perms[x[0]] === "view" ? " (view)" : ""); }).join(", ") || "No sections yet";
        return '<li><a href="#member/' + encodeURIComponent(m.id) + '" class="flex items-center gap-4 p-4 hover:bg-paper"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand font-display text-[15px] font-semibold uppercase text-walnut">' + esc((m.name || m.username).charAt(0)) + '</span><span class="min-w-0 flex-1"><span class="block truncate text-[15px] font-medium text-walnut">' + esc(m.name || m.username) + ' <span class="font-normal text-stone">@' + esc(m.username) + '</span></span><span class="block truncate text-[13px] text-stone">' + esc(access) + "</span>" +
          '<span class="block text-[12px] text-stone">' + (m.expires_at ? "Until " + esc(new Date(m.expires_at).toLocaleString()) : "No end date") + " · " + (m.last_login ? "Last in " + esc(ago(m.last_login)) : "Never signed in") + '</span></span><span class="inline-flex h-6 shrink-0 items-center px-2 text-[10px] font-semibold uppercase tracking-[0.12em] ' + st[1] + '">' + st[0] + "</span></a></li>";
      }).join("");
      var log = TEAM.activity.slice(0, 60).map(function (a) { return '<li class="flex gap-3 px-5 py-2.5 text-[14px]"><span class="w-24 shrink-0 truncate font-medium text-walnut">' + esc(a.who) + '</span><span class="min-w-0 flex-1 text-stone">' + esc(a.action) + '</span><span class="shrink-0 text-[12px] text-stone">' + esc(ago(a.at)) + "</span></li>"; }).join("");
      var body =
        '<div class="' + CARD + ' p-5"><p class="text-[15px] leading-relaxed text-walnut"><strong>You are the owner.</strong> Your login is the master password stored in Cloudflare, outside this dashboard, so no team member can change it, see it or lock you out. Only you can see this page.</p><p class="mt-2 text-[14px] text-stone">Changing anything on a login signs that person out straight away, so new limits apply at once.</p></div>' +
        '<section class="mt-6 ' + CARD + ' overflow-hidden"><div class="flex items-center justify-between border-b border-walnut/10 px-5 py-4"><h2 class="font-display text-[20px] text-walnut">Team logins</h2><span class="text-[13px] text-stone">' + TEAM.team.length + "</span></div>" +
          (rows ? '<ul class="divide-y divide-walnut/10">' + rows + "</ul>" : '<p class="px-5 py-10 text-center text-[15px] text-stone">No team logins yet. Create one to give someone limited, temporary access.</p>') + "</section>" +
        (TEAM.team.length ? '<button type="button" id="tm-signout" class="' + B_OUT + ' mt-4">Sign out every team member now</button>' : "") +
        '<section class="mt-6 ' + CARD + ' overflow-hidden"><div class="border-b border-walnut/10 px-5 py-4"><h2 class="font-display text-[20px] text-walnut">Activity</h2><p class="mt-1 text-[13px] text-stone">Every change made in the dashboard, and who made it.</p></div>' +
          (log ? '<ul class="divide-y divide-walnut/10">' + log + "</ul>" : '<p class="px-5 py-8 text-center text-[14px] text-stone">Nothing yet.</p>') + "</section>";
      shell("team", "Team", body, '<a href="#member/new" class="' + B_DARK + ' h-10 px-4">' + ic("plus", "h-4 w-4") + '<span class="hidden sm:inline">New login</span></a>');
      var so = $("#tm-signout");
      if (so) so.addEventListener("click", function () { if (!confirm("Sign out every team member? They can sign in again with their password.")) return; api("/api/admin/team", { method: "POST", body: { action: "signout-all" } }).then(function () { toast("Everyone has been signed out"); }).catch(fail); });
    }).catch(fail);
  }
  function genPassword() { var c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", a = new Uint32Array(14); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (n) { return c[n % c.length]; }).join(""); }
  function localInput(iso) { if (!iso) return ""; var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function viewMember(id) {
    loading("team", "Team");
    loadTeam().then(function () {
      var isNew = id === "new", m = isNew ? { username: "", name: "", perms: {}, expires_at: new Date(Date.now() + 7 * 864e5).toISOString(), active: true } : TEAM.team.find(function (x) { return x.id === id; });
      if (!m) { location.hash = "#team"; return; }
      var permRows = SECTIONS.map(function (x) {
        var v = m.perms[x[0]] || "";
        return '<div class="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p class="text-[15px] font-medium text-walnut">' + x[1] + '</p><p class="text-[13px] text-stone">' + x[2] + '</p></div><div class="inline-flex border border-walnut/20" role="radiogroup">' +
          [["", "No access"], ["view", "View"], ["edit", "Edit"]].map(function (o) { return '<label class="cursor-pointer"><input type="radio" name="perm_' + x[0] + '" value="' + o[0] + '" class="peer sr-only"' + (v === o[0] ? " checked" : "") + '><span class="block px-3.5 py-2 text-[13px] font-medium text-stone peer-checked:bg-walnut peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2">' + o[1] + "</span></label>"; }).join("") +
          "</div></div>";
      }).join("");
      var body =
        '<form id="tm-form" class="grid gap-5">' +
          '<section class="' + CARD + ' grid gap-5 p-5"><h2 class="font-display text-[20px] text-walnut">Login details</h2><div class="grid gap-5 sm:grid-cols-2">' +
            field("Their name", input("name", m.name, 'placeholder="e.g. Sharyn"'), "", true) +
            field("Username", input("username", m.username, 'required autocapitalize="none" spellcheck="false" placeholder="e.g. sharyn"'), "Letters, numbers, dots or dashes.") +
          "</div>" +
          field(isNew ? "Password" : "New password", '<div class="flex gap-2"><input name="password" id="tm-pw" type="text" autocomplete="new-password" class="' + INP + ' font-mono" placeholder="' + (isNew ? "At least 8 characters" : "Leave empty to keep the current one") + '"' + (isNew ? " required" : "") + '><button type="button" id="tm-gen" class="' + B_OUT + ' shrink-0 px-4">Generate</button></div>', "Send it to them privately, for example on WhatsApp. It isn't shown again after you save.") +
          "</section>" +
          '<section class="' + CARD + ' grid gap-5 p-5"><div><h2 class="font-display text-[20px] text-walnut">How long</h2><p class="mt-1 text-[13px] text-stone">The login stops working at this time, automatically.</p></div>' +
            '<div class="flex flex-wrap gap-2">' + [["1 day", 1], ["7 days", 7], ["30 days", 30], ["No end date", 0]].map(function (o) { return '<button type="button" data-days="' + o[1] + '" class="h-9 border border-walnut/20 px-3 text-[13px] font-medium text-walnut hover:border-walnut">' + o[0] + "</button>"; }).join("") + "</div>" +
            field("Access ends", '<input name="expires_at" id="tm-exp" type="datetime-local" value="' + localInput(m.expires_at) + '" class="' + INP + '">', "Leave empty for no end date.", true) +
            toggle("active", m.active !== false, "Login switched on", "Turn off to block this person instantly without deleting the login.") +
          "</section>" +
          '<section class="' + CARD + ' p-5"><h2 class="font-display text-[20px] text-walnut">What they can reach</h2><p class="mt-1 text-[13px] text-stone">The Team page and your owner login are never available to them.</p><div class="mt-2 divide-y divide-walnut/10">' + permRows + "</div></section>" +
          '<div class="flex flex-col gap-3 sm:flex-row"><button type="submit" class="' + B_DARK + ' h-12 flex-1">' + (isNew ? "Create login" : "Save changes") + "</button>" + (isNew ? "" : '<button type="button" id="tm-del" class="' + B_OUT + ' h-12 text-red-700">' + ic("trash", "h-4 w-4") + "Delete login</button>") + "</div>" +
        "</form>";
      shell("team", isNew ? "New team login" : esc(m.name || m.username), body, "", "#team");
      $("#tm-gen").addEventListener("click", function () { $("#tm-pw").value = genPassword(); });
      $$("[data-days]").forEach(function (b) { b.addEventListener("click", function () { var d = Number(b.getAttribute("data-days")); $("#tm-exp").value = d ? localInput(new Date(Date.now() + d * 864e5).toISOString()) : ""; }); });
      var del = $("#tm-del");
      if (del) del.addEventListener("click", function () { if (!confirm("Delete this login? They will be signed out and can't sign in again.")) return; api("/api/admin/team?id=" + encodeURIComponent(m.id) + "&name=" + encodeURIComponent(m.username), { method: "DELETE" }).then(function () { toast("Login deleted"); location.hash = "#team"; }).catch(fail); });
      $("#tm-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var d = formData(e.target), perms = {};
        SECTIONS.forEach(function (x) { var r = e.target.querySelector('input[name="perm_' + x[0] + '"]:checked'); if (r && r.value) perms[x[0]] = r.value; });
        var out = { id: isNew ? undefined : m.id, name: d.name.trim(), username: d.username.trim().toLowerCase(), password: d.password, perms: perms, active: d.active, expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null };
        var pw = d.password;
        api("/api/admin/team", { method: "POST", body: out }).then(function (r) {
          if (pw) {
            var msg = "Sign in at " + location.origin + "/admin\nUsername: " + r.username + "\nPassword: " + pw;
            shell("team", "Login ready", '<div class="' + CARD + ' p-6"><p class="font-display text-[22px] text-walnut">Send these details privately.</p><p class="mt-1 text-[14px] text-stone">The password won\'t be shown again. If it gets lost, set a new one.</p><pre id="tm-msg" class="mt-5 whitespace-pre-wrap border border-walnut/15 bg-paper p-4 font-mono text-[14px] text-walnut">' + esc(msg) + '</pre><div class="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" id="tm-copy" class="' + B_DARK + '">' + ic("copy", "h-4 w-4") + 'Copy</button><a class="' + B_OUT + '" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">' + ic("chat", "h-4 w-4") + 'Send on WhatsApp</a><a href="#team" class="' + B_OUT + '">Done</a></div></div>', "", "#team");
            $("#tm-copy").addEventListener("click", function () { navigator.clipboard.writeText(msg).then(function () { toast("Copied"); }); });
          } else { toast("Saved"); location.hash = "#team"; }
        }).catch(fail);
      });
    }).catch(fail);
  }

  /* ---------------------------------------------------- router */
  function noAccess() { shell("", "No access", '<div class="' + CARD + ' p-10 text-center"><p class="font-display text-[22px] text-walnut">This part of the dashboard isn\'t available to you.</p><p class="mt-2 text-[15px] text-stone">Ask the owner if you need access.</p><a href="#overview" class="' + B_DARK + ' mt-6">Back to overview</a></div>'); }
  var NEEDS = { artworks: "artworks", artwork: "artworks", artists: "artists", artist: "artists", inbox: "inbox", message: "inbox", orders: "orders", order: "orders", photos: "photos", settings: "settings" };
  function route() {
    var h = (location.hash || "#overview").slice(1), parts = h.split("/"), v = parts[0], arg = decodeURIComponent(parts.slice(1).join("/"));
    if ((v === "team" || v === "member") && !(S.me && S.me.owner)) return noAccess();
    if (NEEDS[v] && !can(NEEDS[v], "view")) return noAccess();
    ({ team: viewTeam, member: function () { viewMember(arg); }, overview: viewOverview, artworks: viewArtworks, artwork: function () { viewArtwork(arg); }, artists: viewArtists, artist: function () { viewArtist(arg); },
       inbox: viewInbox, message: function () { viewMessage(arg); }, orders: viewOrders, order: function () { viewOrder(arg); }, photos: viewPhotos, settings: viewSettings }[v] || viewOverview)();
  }
  window.addEventListener("hashchange", function () { api("/api/admin/session").then(function (s) { setMe(s); if (s.signedIn) route(); else renderLogin(); }); });

  api("/api/admin/session").then(function (s) {
    if (!s.passwordSet) { renderLogin("The dashboard password has not been set yet in Cloudflare."); return; }
    setMe(s); if (s.signedIn) route(); else renderLogin();
  }).catch(function () { renderLogin("Could not reach the server."); });
})();
