/* ==========================================================================
   Z&Z — storefront app (vanilla, zero dependencies, ~30KB)
   Home · Collections · Product · Cart · Currency · Night mode · VIP capture
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money0 = (v) => Math.round(v).toLocaleString('en-US');

  /* --------------------------------- state -------------------------------- */
  const S = {
    data: null,
    liveRates: null,
    cart: [],
    currency: 'PKR',
    theme: 'light',
    route: { name: 'home' },
    wheelTimer: null
  };

  try { S.cart = JSON.parse(localStorage.getItem('zz_cart') || '[]') || []; } catch (e) { S.cart = []; }
  try { S.currency = localStorage.getItem('zz_cur') || 'PKR'; } catch (e) {}
  try { S.theme = localStorage.getItem('zz_theme') || 'light'; } catch (e) {}

  const saveCart = () => { try { localStorage.setItem('zz_cart', JSON.stringify(S.cart)); } catch (e) {} };

  /* --------------------------------- icons -------------------------------- */
  /* every animation effect the site can play — offered wherever a wheel/grid choice is */
  const TRANS = [
    ['fade', 'Fade'], ['slide', 'Slide'], ['zoom', 'Zoom'], ['cube', 'Cube'],
    ['flip', 'Card flip'], ['coverflow', 'Cover flow'], ['curl', 'Page curl'],
    ['bounce', 'Bounce'], ['accordion', 'Accordion'], ['parallax', 'Parallax'],
    ['morph', 'Morphing'], ['stack', 'Stacked cards'], ['rotate', 'Slow spin']
  ];
  function applyTransition(name) {
    document.documentElement.setAttribute('data-transition', name || 'fade');
    const grid = document.getElementById('collBody') || document.getElementById('view');
    if (grid) {
      grid.classList.remove('tr-anim');
      void grid.offsetWidth;
      grid.classList.add('tr-anim');
    }
  }
  const I = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 8h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 8Z"/><path d="M9 8V6.6a3 3 0 0 1 6 0V8"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M5 12h13M12 5l7 7-7 7"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6.5 9.6 17 4 11.6"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" width="13" height="13"><circle cx="8" cy="8" r="4"/><path d="M11 11l9 9M16.5 16.5l2-2M14 14l1.6-1.6"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1s-.8 1-1 1.2c-.2.2-.4.3-.7.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 1.9 3 4.7 4.2 2.8 1.1 2.8.8 3.3.7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4ZM12 21.6a9.5 9.5 0 0 1-4.8-1.3L3 21.6l1.4-4A9.6 9.6 0 1 1 12 21.6Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7h2.6l.4-3h-3V9.2c0-.9.2-1.5 1.5-1.5H16.7V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.2V11H8v3h2.3v7h3.2Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.3 8.2a2.6 2.6 0 0 0-1.8-1.8C17.8 6 12 6 12 6s-5.8 0-7.5.4A2.6 2.6 0 0 0 2.7 8.2C2.3 9.9 2.3 12 2.3 12s0 2.1.4 3.8a2.6 2.6 0 0 0 1.8 1.8C6.2 18 12 18 12 18s5.8 0 7.5-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.7.4-3.8.4-3.8s0-2.1-.4-3.8ZM10.2 15V9l5.2 3-5.2 3Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3h-2.7v11.2a2.6 2.6 0 1 1-2-2.5V9a5.2 5.2 0 1 0 4.7 5.2V9.1c.9.7 2 1.1 3.2 1.1V7.5a4.4 4.4 0 0 1-3.2-4.5Z"/></svg>',
    snapchat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c2.4 0 4.1 1.8 4.1 4.2 0 .8-.1 1.6-.1 2 .3.2.7.2 1.1.1.6-.1 1 .4.9.9-.1.6-.8.9-1.4 1.1l-.8.3c.3.9 1 1.9 1.9 2.6.6.5.2 1.4-.5 1.5l-1.1.2c-.2 0-.3.1-.3.3-.1.5-.4.8-1 .8l-.9-.1c-.9 0-1.6.4-2.4.9-.6.4-1.2.6-1.9.6s-1.3-.2-1.9-.6c-.8-.5-1.5-.9-2.4-.9l-.9.1c-.6 0-.9-.3-1-.8 0-.2-.1-.3-.3-.3l-1.1-.2c-.7-.1-1.1-1-.5-1.5.9-.7 1.6-1.7 1.9-2.6l-.8-.3c-.6-.2-1.3-.5-1.4-1.1-.1-.5.3-1 .9-.9.4.1.8.1 1.1-.1 0-.4-.1-1.2-.1-2C7.9 4.8 9.6 3 12 3Z"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 3C7.7 3 5 6 5 9.3c0 1.6.9 3.5 2.4 4.1.2.1.4 0 .4-.2l.3-1.2c0-.1 0-.2-.1-.3-.6-.7-1-1.7-1-2.6 0-2.4 1.8-4.6 4.8-4.6 2.6 0 4.4 1.6 4.4 3.9 0 2.6-1.3 4.5-3 4.5-.9 0-1.6-.8-1.4-1.7.3-1.2.8-2.4.8-3.3 0-.8-.4-1.4-1.3-1.4-1 0-1.9 1.1-1.9 2.5 0 .9.3 1.5.3 1.5l-1.3 5.4c-.4 1.6 0 4 .1 4.2 0 .1.2.1.2 0 .1-.1 1.5-2 2-3.4l.7-2.6c.4.8 1.5 1.4 2.7 1.4 3.1 0 5.3-2.9 5.3-6.4C20.9 5.7 17.6 3 12.2 3Z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.6 2.5 5.3 5.8.8-4.2 4 1 5.8L12 16.8 6.9 19.5l1-5.8-4.2-4 5.8-.8L12 3.6Z"/></svg>'
  };
  const SOCIALS = [
    ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'],
    ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['pinterest', 'Pinterest']
  ];

  /* -------------------------------- helpers ------------------------------- */
  function waNumber(raw) {
    const d = String(raw || '').replace(/[^\d]/g, '');
    if (!d) return '';
    if (d.startsWith('0')) return '92' + d.slice(1);
    return d;
  }
  function waLink(text) {
    const n = waNumber(S.data.contact.whatsapp);
    if (!n) return '';
    const msg = encodeURIComponent(text || S.data.contact.whatsappMessage || 'Hello Z&Z!');
    return `https://wa.me/${n}?text=${msg}`;
  }
  function stars(n) {
    return `<span style="color:var(--gold);letter-spacing:.12em;font-size:12px">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  }
  function curList() {
    const c = S.data.currency || {};
    const base = Array.isArray(c.list) && c.list.length ? c.list : [{ code: 'PKR', symbol: 'Rs', rate: 1 }];
    if (!S.liveRates) return base;
    return base.map((x) => (x.code !== 'PKR' && S.liveRates[x.code] ? { ...x, rate: S.liveRates[x.code] } : x));
  }
  function activeCur() {
    return curList().find((x) => x.code === S.currency) || curList()[0];
  }
  /** price is always stored in the base currency (PKR) */
  function money(pkr, opts) {
    const p = Number(pkr) || 0;
    if (!p) return opts && opts.plain ? '' : 'Contact for pricing';
    const c = activeCur();
    const v = p * (Number(c.rate) || 1);
    const dec = v < 1000 && v % 1 !== 0 ? 0 : 0;
    return `${c.symbol} ${v.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  const isPlaceholder = (u) => !u || /placeholder/i.test(u);
  function imgTag(src, alt, cls, eager) {
    if (!src) return `<div class="ph sk ${cls || ''}"></div>`;
    /* /x.webp → /x-md.webp (640 px) + /x.webp, so phones and slow connections pull ~70 % less */
    const big = /\.webp$/i.test(src) ? src.replace(/-sm\.webp$/i, '.webp') : src;
    const md = /\.webp$/i.test(src) ? big.replace(/\.webp$/i, '-md.webp') : '';
    const set = md ? ` srcset="${esc(md)} 640w, ${esc(big)} 1024w" sizes="(max-width: 700px) 50vw, 300px"` : '';
    return `<img src="${esc(md || src)}"${set} alt="${esc(alt)}" ${cls ? `class="${cls}"` : ''} loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? 'fetchpriority="high"' : ''}>`;
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 3200);
  }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then((r) => r.json().catch(() => ({ ok: false, error: 'Network error' })));
  }
  function allItems() {
    const out = [];
    (S.data.collections || []).forEach((c) => c.items.forEach((it) => out.push({ ...it, collectionId: c.id, collectionName: c.name })));
    return out;
  }
  function findItem(cid, iid) {
    const c = (S.data.collections || []).find((x) => x.id === cid);
    const it = c && c.items.find((x) => x.id === iid);
    return it ? { item: it, col: c } : null;
  }

  /* -------------------------------- theming ------------------------------- */
  function applyTheme() {
    const t = S.data.theme || {};
    const styleId = 'zz-theme-vars';
    let tag = document.getElementById(styleId);
    if (!tag) { tag = document.createElement('style'); tag.id = styleId; document.head.appendChild(tag); }
    const light = t.bgLight || '#f7f2e8';
    const dark = t.bgDark || '#08080a';
    const gold = t.gold || '#c9a54e';
    const gold2 = t.goldDeep || '#8a6a26';
    tag.textContent = `:root{--bg:${light};--gold:${gold};--gold-2:${gold2};}
      html[data-theme="dark"]{--bg:${dark};}`;
    /* entrance wallpaper chosen by the owner */
    const wps = (t.wallpapers || []);
    const active = wps.find((w) => w.id === t.activeWallpaper) || wps[0];
    if (active) {
      const wall = active.mode === 'image' ? `url("${active.url}")` : (active.css || '');
      document.documentElement.style.setProperty('--wall', wall);
      document.documentElement.style.setProperty('--wall-size', active.size || 'cover');
      document.documentElement.setAttribute('data-wall-anim', active.anim || '');
      document.documentElement.classList.toggle('wall-dark', !!active.dark);
    }
    /* logo motion + transitions chosen by the owner */
    const anim = S.data.animations || {};
    document.documentElement.setAttribute('data-logo-anim', anim.logo === 'none' ? 'none' : (anim.logo === 'soft' ? 'soft' : anim.logo === 'float' ? 'float' : 'spin'));
    document.documentElement.style.setProperty('--logo-sec', (Number(anim.logoSeconds) || 9) + 's');
    document.documentElement.setAttribute('data-transition', anim.transition || 'fade');

    document.documentElement.setAttribute('data-theme', S.theme === 'dark' ? 'dark' : 'light');
    const mt = document.querySelector('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', S.theme === 'dark' ? dark : light);
    const btn = $('#themeBtn');
    if (btn) btn.innerHTML = S.theme === 'dark' ? I.sun : I.moon;
  }

  /* -------------------------------- header -------------------------------- */
  function brandLogo(cls) {
    const logo = (S.data.brand && S.data.brand.logo) || '/assets/img/logo-3d@2x.png';
    return `<div class="lw"><div class="${cls || 'logo3d-sm'}"><img src="${esc(logo)}" alt="${esc((S.data.brand && S.data.brand.name) || 'Z&Z')} logo" width="325" height="360"></div></div>`;
  }

  function renderHeader() {
    const b = S.data.brand || {};
    const cur = curList();
    const curSel = cur.length > 1 ? `
      <select class="cur-select" id="curSel" aria-label="Currency">
        ${cur.map((c) => `<option value="${esc(c.code)}" ${c.code === S.currency ? 'selected' : ''}>${esc(c.code)}</option>`).join('')}
      </select>` : '';
    $('#siteHead').innerHTML = `
      <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>
      <a class="brand-lockup" href="/" data-link aria-label="${esc(b.name || 'Z&Z')} home">
        ${brandLogo()}
        <span class="brand-txt"><b>${esc(b.name || 'Z&Z')}</b><i>${esc(b.fullName || '')}</i></span>
      </a>
      <div class="head-actions">
        ${curSel}
        <button class="icon-btn" id="themeBtn" aria-label="Toggle night mode">${S.theme === 'dark' ? I.sun : I.moon}</button>
        <button class="icon-btn" id="cartBtn" aria-label="Open shopping bag">${I.cart}<span class="cart-count" id="cartCount" hidden></span></button>
      </div>`;
    updateCartCount();
  }

  function renderDrawer() {
    const cols = S.data.collections || [];
    const n = S.data.notice || {};
    const vip = S.data.valuable || {};
    $('#drawer').innerHTML = `
      <div class="drawer-head">
        <a href="/" data-link style="display:flex;align-items:center;gap:10px">
          ${brandLogo('logo3d-sm')}
          <span class="dname">${esc((S.data.brand || {}).name || 'Z&Z')}<small>${esc((S.data.brand || {}).fullName || '')}</small></span>
        </a>
        <button class="icon-btn" id="drawerClose" aria-label="Close menu">${I.close}</button>
      </div>
      <ul class="drawer-list">
        <li><a href="/" data-link>Home</a></li>
        ${n.enabled && n.text ? `<li><a href="/#offers" data-link>Offers &amp; Discounts <span class="tag">New</span></a></li>` : ''}
        ${cols.map((c) => `<li><a href="/c/${esc(c.id)}" data-link>${esc(c.name)} <span class="tag">${c.items.length}</span></a></li>`).join('')}
        <li><a href="/#collections" data-link>All Collections</a></li>
        <li><a href="/look" data-link>Try-On Studio <span class="tag">New</span></a></li>
        <li><a href="/#reviews" data-link>Rates &amp; Reviews</a></li>
        <li><button data-act="complaint">Complaint</button></li>
        ${vip.enabled ? `<li><button data-act="vip">Become our valuable customer</button></li>` : ''}
        <li><a href="/#about" data-link>About Us</a></li>
        <li><a href="/#contact" data-link>Contact Us</a></li>
        <li><a href="/#terms" data-link>Terms &amp; Conditions</a></li>
      </ul>
      <div class="drawer-foot">
        ${(S.data.contact.phone ? `<div style="margin-bottom:6px">${esc(S.data.contact.phone)}</div>` : '')}
        <div style="letter-spacing:.24em;text-transform:uppercase;font-size:9px">Couture · Made to measure</div>
      </div>`;
  }

  /* ------------------------------- navigation ----------------------------- */
  function openDrawer(open) {
    const d = $('#drawer'), s = $('#scrim');
    d.classList.toggle('open', open);
    d.setAttribute('aria-hidden', open ? 'false' : 'true');
    s.hidden = !open;
    requestAnimationFrame(() => s.classList.toggle('show', open));
    $('#menuBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('locked', open);
  }

  function navigate(path, replace) {
    if (path === location.pathname + location.hash) return;
    history[replace ? 'replaceState' : 'pushState']({}, '', path);
    route();
  }

  /* tell the owner's panel we are here (no personal data, just "someone is browsing") */
  function ping() {
    try {
      fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: location.pathname || '/' }),
        keepalive: true
      }).then((r) => r.json()).then((j) => { if (j && typeof j.live === 'number') paintLive(j.live); })
        .catch(() => {});
    } catch (e) {}
  }

  /* small "N browsing now" pill — the number comes from the server (owner can set a floor) */
  function mountLivePill() {
    if (document.getElementById('livePill')) return;
    const cfg = ((S.data && S.data.settings && S.data.settings.live) || {});
    if (cfg.show === false) return;
    const el = document.createElement('button');
    el.id = 'livePill';
    el.type = 'button';
    el.className = 'live-pill';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span class="dot"></span><b>—</b> <em>' + esc(cfg.label || 'browsing now') + '</em>';
    el.addEventListener('click', () => {
      navigate('/');
      setTimeout(() => {
        const t = document.getElementById('look');
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    });
    document.body.appendChild(el);
  }

  function paintLive(n) {
    const el = document.getElementById('livePill');
    if (!el) return;
    const b = el.querySelector('b');
    if (b && b.textContent !== String(n)) {
      b.textContent = String(n);
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  function route() {
    const path = location.pathname;
    closeWheel();
    setTimeout(() => { try { mountFloatingAds(); ping(); } catch (e) {} }, 60);
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'look') return renderLook();
    if (parts[0] === 'c' && parts[1]) return renderCollection(parts[1]);
    if (parts[0] === 'd' && parts[1] && parts[2]) return renderProduct(parts[1], parts[2]);
    return renderHome();
  }

  /* --------------------------------- home --------------------------------- */
  function homeSections() {
    const d = S.data;
    const cols = d.collections || [];
    const out = [];

    /* notice */
    const n = d.notice || {};
    if (n.enabled && n.text) {
      const body = `<b>Notice</b><span>${esc(n.text)}</span>`;
      out.push(`<div class="notice-bar" id="offers">${n.link ? `<a href="${esc(n.link)}" target="_blank" rel="noopener">${body}</a>` : body}</div>`);
    }

    /* hero posters */
    const posters = ((d.hero && d.hero.posters) || []).filter((p) => p && p.url);
    if (posters.length) {
      out.push(`
      <section class="hero" aria-label="Campaign posters">
        <div class="hero-frame" id="heroFrame">
          <div class="hero-track" id="heroTrack">
            ${posters.map((p, i) => `
              <div class="hero-slide">
                ${imgTag(p.url, p.alt || 'Z&Z campaign poster', '', i === 0)}
              </div>`).join('')}
          </div>
          ${posters.length > 1 ? `
            <button class="hero-nav prev" id="heroPrev" aria-label="Previous poster">${I.left}</button>
            <button class="hero-nav next" id="heroNext" aria-label="Next poster">${I.right}</button>
            <div class="hero-dots" id="heroDots">${posters.map((_, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}" aria-label="Poster ${i + 1}"></button>`).join('')}</div>` : ''}
        </div>
        ${posters.length > 1 ? `<div class="hero-strip" id="heroStrip">
          ${posters.slice(0, 3).map((p, i) => `<button class="box ${i === 0 ? 'on' : ''}" data-i="${i}" aria-label="Show poster ${i + 1}">${imgTag(p.url, p.alt || 'Poster thumbnail')}</button>`).join('')}
        </div>` : ''}
      </section>`);
    }

    /* collections */
    if (cols.length) {
      out.push(`
      <section class="sec" id="collections">
        <div class="wrap">
          <div class="sec-head">
            <p class="eyebrow">The Edit</p>
            <h2 class="sec-title">Our <span class="thin">Collections</span></h2>
            <div class="hr-orn"><span></span></div>
            <p class="sec-sub">Hand-embroidered couture for every celebration — tap a collection to explore every piece.</p>
          </div>
          <div class="col-grid">
            ${cols.map((c) => `
              <a class="col-card" href="/c/${esc(c.id)}" data-link>
                <div class="ph">${c.image ? `<img src="${esc(c.imageThumb || c.image)}" alt="${esc(c.name)} collection — Z&Z luxury bridal wear" loading="lazy" decoding="async">` : '<div class="sk" style="width:100%;height:100%"></div>'}</div>
                <span class="arrow">${I.arrow}</span>
                <div class="meta">
                  <h3>${esc(c.name)}</h3>
                  <small>${c.items.length} piece${c.items.length === 1 ? '' : 's'}</small>
                </div>
              </a>`).join('')}
          </div>
        </div>
      </section>`);
    }

    /* most loved / hot selling */
    const hs = d.hotSelling || {};
    if (hs.enabled !== false) {
      let items = [];
      const limit = Math.max(4, Math.min(24, Number(hs.limit) || 12));
      if (hs.mode === 'collection') {
        const c = cols.find((x) => x.id === hs.collectionId) || cols[0];
        if (c) items = c.items.map((it) => ({ ...it, collectionId: c.id, collectionName: c.name }));
      } else if (hs.mode === 'first') {
        items = cols.map((c) => (c.items[0] ? { ...c.items[0], collectionId: c.id, collectionName: c.name } : null)).filter(Boolean);
      } else if (hs.mode !== 'off') {
        items = allItems().sort((a, b) => (b.views || 0) - (a.views || 0));
      }
      items = items.slice(0, limit);
      if (items.length && hs.mode !== 'off') {
        out.push(`
        <section class="sec wheel-sec" id="loved" style="background:linear-gradient(180deg,transparent,rgba(201,165,78,.07),transparent)">
          <div class="wrap">
            <div class="sec-head">
              <p class="eyebrow">Client Favourites</p>
              <h2 class="sec-title">${esc(hs.title || 'Most Loved This Season')}</h2>
              <div class="hr-orn"><span></span></div>
            </div>
            <div class="view-toggle" id="lovedToggle" style="margin:0 0 14px">
              <button data-v="wheel" class="${((S.data.layout && S.data.layout.homeLoved) || hs.layout) === 'wheel' ? 'on' : ''}">Circular</button>
              <button data-v="grid" class="${((S.data.layout && S.data.layout.homeLoved) || hs.layout) === 'grid' ? 'on' : ''}">Grid</button>
              <select class="trans-pick" id="lovedTrans" aria-label="Transition">
                ${TRANS.map(([v, l]) => `<option value="${v}" ${((S.data.animations || {}).cardTransition || 'zoom') === v ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div id="lovedBody">
              ${((S.data.layout && S.data.layout.homeLoved) || hs.layout) === 'wheel' ? wheelMarkup(items, 'loved') : itemGrid(items)}
            </div>
          </div>
        </section>`);
      }
    }

    /* home switcher: circular / grid + any of the 13 transitions */
    setTimeout(() => {
      const tg = document.getElementById('lovedToggle');
      const ts = document.getElementById('lovedTrans');
      if (ts) ts.addEventListener('change', () => applyTransition(ts.value));
      if (!tg) return;
      tg.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        tg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        const body = document.getElementById('lovedBody');
        body.innerHTML = b.dataset.v === 'wheel' ? wheelMarkup(items, 'loved') : itemGrid(items);
        if (b.dataset.v === 'wheel') initWheel(document.querySelector('[data-wheel="loved"]'));
        bindLinks();
        applyTransition((S.data.animations || {}).cardTransition || 'fade');
      });
    }, 0);

    /* owner's advert — top strip */
    out.push(adsSlot('top'));

    /* check your look */
    const look = d.look || {};
    if (look.enabled) {
      out.push(`
      <section class="sec" id="look" style="background:linear-gradient(180deg,transparent,rgba(201,165,78,.07),transparent)">
        <div class="wrap">
          <div class="panel" style="display:grid;gap:22px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));align-items:center">
            <div >
              <p class="eyebrow" style="font-family:'Jost',sans-serif">VIRTUAL FITTING ROOM</p>
              <h2 class="sec-title" style="font-size:clamp(24px,3.4vw,36px)">${esc(look.heading || 'Try-On Studio')}</h2>
              <div class="hr-orn" style="justify-content:flex-start"><span></span></div>
              <p style="color:var(--ink-2);font-size:14.5px;margin:14px 0 0">${esc(look.intro || 'See our couture on your own photo — fitted to your body in moments.')}</p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;justify-content:flex-end">
                <a class="btn btn-gold" href="/look" data-link>Try it now ${I.arrow}</a>
              </div>
            </div>
            <div class="look-teaser" style="position:relative;border-radius:18px;overflow:hidden;border:1px solid var(--line);aspect-ratio:4/3;background:#000 center/cover no-repeat;box-shadow:var(--shadow)">
              <img src="${esc(look.background || '/assets/img/look/garden.webp')}" alt="Garden try-on preview" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover">
              <span style="position:absolute;inset:auto 0 0 0;padding:12px 14px;background:linear-gradient(0deg,rgba(20,14,5,.65),transparent);color:#fff8e6;font-size:12.5px;font-family:'Nastaliq Urdu',serif">Your photo · our couture</span>
            </div>
          </div>
        </div>
      </section>`);
    }

    /* owner's advert — middle of the page */
    out.push(adsSlot('inline'));

    /* terms & conditions */
    const t = d.terms || {};
    if ((t.text && t.text.trim()) || t.image) {
      out.push(`
      <section class="sec" id="terms">
        <div class="wrap">
          <div class="panel terms-box ${t.image && t.text ? '' : 'single'}">
            <div>
              <p class="eyebrow">Please Read</p>
              <h2 class="sec-title" style="font-size:clamp(22px,3vw,32px)">Terms &amp; Conditions</h2>
              ${t.text ? `<p style="margin-top:12px">${esc(t.text)}</p>` : ''}
            </div>
            ${t.image ? `<img src="${esc(t.image)}" alt="Z&Z terms and conditions" loading="lazy" decoding="async">` : ''}
          </div>
        </div>
      </section>`);
    }

    /* reviews + complaint + vip */
    out.push(`
    <section class="sec" id="reviews">
      <div class="wrap">
        <div class="sec-head">
          <p class="eyebrow">Your Voice</p>
          <h2 class="sec-title">Rates &amp; <span class="thin">Feedback</span></h2>
          <div class="hr-orn"><span></span></div>
          <p class="sec-sub">Rate your experience or share a complaint — it goes straight to our team (kept private).</p>
        </div>
        <div class="split">
          <form class="panel" id="rateForm">
            <h3 style="font-size:20px;margin-bottom:4px">Rate us</h3>
            <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 14px">Tap a star — your feedback helps us improve.</p>
            <div class="stars" id="rateStars" role="group" aria-label="Rating">${[1,2,3,4,5].map((s) => `<button type="button" data-s="${s}" aria-label="${s} star">★</button>`).join('')}</div>
            <input type="hidden" id="rateVal" value="5">
            <div class="field" style="margin-top:14px"><span>Your name (optional)</span><input id="rateName" maxlength="80" autocomplete="name"></div>
            <div class="field"><span>Anything to add?</span><textarea id="rateMsg" maxlength="500" style="min-height:70px"></textarea></div>
            <button class="btn btn-gold btn-sm" type="submit">Submit rating</button>
            <div class="form-msg" id="rateMsgOut"></div>
          </form>
          <form class="panel" id="compForm">
            <h3 style="font-size:20px;margin-bottom:4px">Complaint</h3>
            <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 14px">Tell us what went wrong — we reply personally.</p>
            <div class="field"><span>Your name</span><input id="compName" maxlength="80" autocomplete="name"></div>
            <div class="field"><span>Phone / WhatsApp</span><input id="compPhone" maxlength="40" inputmode="tel" autocomplete="tel"></div>
            <div class="field"><span>Your complaint</span><textarea id="compMsg" maxlength="800" required></textarea></div>
            <button class="btn btn-ghost btn-sm" type="submit">Send complaint</button>
            <div class="form-msg" id="compOut"></div>
          </form>
        </div>
      </div>
    </section>`);

    /* about + branches */
    const ab = d.about || {};
    const branches = d.branches || [];
    if ((ab.text && ab.text.trim()) || ab.image || branches.length) {
      out.push(`
      <section class="sec" id="about" style="background:linear-gradient(180deg,transparent,rgba(201,165,78,.06),transparent)">
        <div class="wrap">
          <div class="split" style="align-items:center">
            <div>
              <p class="eyebrow">Our Story</p>
              <h2 class="sec-title">${esc(ab.heading || 'The House of ' + ((S.data.brand || {}).name || 'Z&Z'))}</h2>
              ${ab.text ? `<p style="color:var(--ink-2);font-size:14.5px;white-space:pre-wrap;margin-top:14px">${esc(ab.text)}</p>` : ''}
              ${branches.length ? `<div style="margin-top:20px">${branches.map((b) => `
                <div class="branch">
                  <span class="pin">${I.pin}</span>
                  <div><b>${esc(b.name || 'Branch')}</b><span>${esc(b.address || '')}${b.phone ? `\n${esc(b.phone)}` : ''}</span></div>
                </div>`).join('')}</div>` : ''}
            </div>
            ${ab.image ? `<div class="about-img">${imgTag(ab.image, 'About Z&Z')}</div>` : ''}
          </div>
        </div>
      </section>`);
    }

    /* contact + social */
    const c = d.contact || {};
    const socials = SOCIALS.filter(([k]) => (d.social || {})[k]);
    out.push(`
    <section class="sec" id="contact">
      <div class="wrap">
        <div class="panel" style="text-align:center">
          <p class="eyebrow">Let's Talk</p>
          <h2 class="sec-title" style="font-size:clamp(24px,3.6vw,38px)">Contact Us</h2>
          <div class="hr-orn"><span></span></div>
          <p class="sec-sub">Message us on WhatsApp for sizing, fabric details, custom orders or a video call viewing.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:20px">
            ${waLink() ? `<a class="btn btn-gold wa-btn" href="${waLink()}" target="_blank" rel="noopener">${I.wa} WhatsApp us</a>` : ''}
            ${c.phone ? `<a class="btn btn-ghost" href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>` : ''}
            ${c.email ? `<a class="btn btn-ghost" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}
            <button class="btn btn-ghost" data-act="vip">Become a valuable customer</button>
          </div>
          ${socials.length ? `<div class="socials" style="justify-content:center;margin-top:26px">
            ${socials.map(([k, label]) => `<a href="${esc(d.social[k])}" target="_blank" rel="noopener" aria-label="${label}">${I[k]}</a>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </section>`);

    return out.join('');
  }

  function tcls() {
    const a = (S.data && S.data.animations) || {};
    const map = {
      fade: 't-fade', slide: 't-slide', zoom: 't-zoom', flip: 't-flip', cube: 't-cube',
      bounce: 't-bounce', accordion: 't-accordion', coverflow: 't-coverflow', curl: 't-curl',
      parallax: 't-parallax', morph: 't-morph', stack: 't-stack'
    };
    return map[a.cardTransition] || 't-zoom';
  }

  function itemGrid(items) {
    if (!items.length) return '<div class="empty">No pieces here yet.</div>';
    const t = tcls();
    return `<div class="item-grid stagger ${t}">
      ${items.map((it) => `
        <a class="item-card" href="/d/${esc(it.collectionId)}/${esc(it.id)}" data-link>
          <div class="ph">
            ${imgTag((it.thumbs && it.thumbs[0]) || it.images[0], it.name, '', false)}
            ${it.views > 6 ? '<span class="badge">Most loved</span>' : ''}
          </div>
          <div class="body">
            <h3>${esc(it.name)}</h3>
            <div class="price">${it.price ? money(it.price) : '<small>Contact for pricing</small>'}</div>
            ${it.price
              ? `<button class="add" data-add="${esc(it.collectionId)}|${esc(it.id)}">${I.cart} Add to bag</button>`
              : `<button class="add" data-ask="${esc(it.collectionId)}|${esc(it.id)}">Ask price</button>`}
          </div>
        </a>`).join('')}
    </div>`;
  }

  function wheelMarkup(items, key) {
    if (!items.length) return '<div class="empty">No pieces here yet.</div>';
    const wstyle = ((S.data.animations || {}).wheelStyle) || 'arc';
    return `
      <div class="wheel-stage ${wstyle === 'half' ? 'half' : ''}" data-wheel="${key}" ${wstyle !== 'arc' ? 'style="height:clamp(420px,56vw,560px)"' : ''}>
        ${items.map((it, i) => `
          <article class="wheel-card" data-i="${i}" data-href="/d/${esc(it.collectionId)}/${esc(it.id)}" tabindex="0" aria-label="${esc(it.name)}">
            <div class="ph">${imgTag((it.thumbs && it.thumbs[0]) || it.images[0], it.name, '', i === 0)}</div>
            <div class="wm">
              <h3>${esc(it.name)}</h3>
              <span>${it.price ? money(it.price) : 'Contact for pricing'}</span>
            </div>
          </article>`).join('')}
      </div>
      <div class="wheel-ctl">
        <button class="icon-btn" data-wheel-prev aria-label="Previous piece" style="border:1px solid var(--line)">${I.left}</button>
        <div class="wheel-dots" data-wheel-dots>${items.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
        <button class="icon-btn" data-wheel-next aria-label="Next piece" style="border:1px solid var(--line)">${I.right}</button>
      </div>
      <div style="text-align:center;margin-top:16px">
        <button class="btn btn-gold btn-sm" data-wheel-open>View this piece ${I.arrow}</button>
      </div>`;
  }

  /* wheel behaviour (arc / circular carousel with drag + swipe) */
  let wheelState = null;
  function initWheel(stage, { autoplay = false } = {}) {
    if (!stage) return;
    const cards = $$('.wheel-card', stage);
    if (!cards.length) return;
    const ctl = stage.parentElement.querySelector('.wheel-ctl');
    const dots = ctl ? $$('i', ctl.querySelector('[data-wheel-dots]')) : [];
    const openBtn = stage.parentElement.querySelector('[data-wheel-open]');
    let active = 0, startX = 0, dragging = false, moved = 0;

    const style = ((S.data.animations || {}).wheelStyle) || 'arc';
    stage.dataset.style = style;

    function layout() {
      const mobile = window.innerWidth < 620;
      const step = mobile ? Math.min(window.innerWidth * 0.42, 168) : Math.min(window.innerWidth * 0.2, 214);
      const n = cards.length;

      if (style === 'half') {
        /* half of the collection fans out on the left, the other half on the right */
        const gapX = mobile ? 118 : 152;
        cards.forEach((c, i) => {
          let d = i - active;
          const n2 = Math.ceil(n / 2);
          if (d > n2) d -= n;
          if (d < -n2) d += n;
          const k = Math.abs(d);
          const side = d === 0 ? 0 : (d > 0 ? 1 : -1);
          const x = side * (k === 0 ? 0 : 168 + (k - 1) * gapX);
          const y = k === 0 ? 0 : 26 + k * 14;
          const rot = side * Math.min(22, k * 7);
          const sc = k === 0 ? 1 : Math.max(0.62, 0.94 - (k - 1) * 0.1);
          const op = k === 0 ? 1 : Math.max(0, 0.92 - (k - 1) * 0.3);
          c.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${-k * 70}px) rotate(${rot}deg) scale(${sc})`;
          c.style.opacity = op.toFixed(2);
          c.style.zIndex = String(100 - k);
          c.classList.toggle('center', d === 0);
          c.classList.toggle('side', d !== 0);
          c.style.pointerEvents = op < 0.25 ? 'none' : 'auto';
        });
        dots.forEach((x, i) => x.classList.toggle('on', i === active));
        return;
      }

      if (style === 'circle') {
        /* every piece sits on one ring, the front one face-on */
        const rx = mobile ? Math.min(window.innerWidth * 0.36, 168) : Math.min(window.innerWidth * 0.3, 380);
        const ry = mobile ? 96 : 148;
        cards.forEach((c, i) => {
          let d = i - active;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const ang = (d / n) * 360 - 90;
          const rad = (ang * Math.PI) / 180;
          const depth = Math.cos(rad);
          const x = Math.cos(rad) * rx;
          const y = Math.sin(rad) * ry;
          const sc = 0.58 + 0.42 * ((depth + 1) / 2);
          const op = 0.3 + 0.7 * ((depth + 1) / 2);
          c.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,${depth * 80}px) rotate(${Math.sin(rad) * 6}deg) scale(${sc})`;
          c.style.opacity = op.toFixed(2);
          c.style.zIndex = String(100 + Math.round(depth * 20));
          c.classList.toggle('center', d === 0);
          c.classList.toggle('side', d !== 0);
          c.style.pointerEvents = op < 0.3 ? 'none' : 'auto';
        });
        dots.forEach((x, i) => x.classList.toggle('on', i === active));
        return;
      }

      cards.forEach((c, i) => {
        const d = i - active;
        const ad = Math.abs(d);
        const rot = Math.max(-30, Math.min(30, d * 10));
        const tx = d * step;
        const ty = Math.min(ad * ad * 11, 130);
        const sc = Math.max(0.6, 1 - ad * 0.13);
        const op = ad > 2.7 ? 0 : 1 - ad * 0.24;
        c.style.transform = `translate(-50%,-50%) translate3d(${tx}px,${ty - 10}px,${-ad * 90}px) rotate(${rot * 0.22}deg) scale(${sc})`;
        c.style.opacity = op;
        c.style.zIndex = String(100 - Math.round(ad * 10));
        c.classList.toggle('center', d === 0);
        c.classList.toggle('side', d !== 0);
        c.style.pointerEvents = op < 0.15 ? 'none' : 'auto';
      });
      dots.forEach((x, i) => x.classList.toggle('on', i === active));
    }

    function go(i) {
      active = (i + cards.length) % cards.length;
      layout();
    }
    function open(i) {
      const href = cards[i].getAttribute('data-href');
      if (href) navigate(href);
    }

    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(active + 1);
      if (e.key === 'ArrowLeft') go(active - 1);
      if (e.key === 'Enter') {
        const card = document.activeElement && document.activeElement.closest('.wheel-card');
        if (card) {
          const i = Number(card.dataset.i);
          if (i === active) open(i); else go(i);
        } else open(active);
      }
    });
    let downCard = -1;
    stage.addEventListener('pointerdown', (e) => {
      dragging = true; startX = e.clientX; moved = 0;
      const card = e.target.closest('.wheel-card');
      downCard = card ? Number(card.dataset.i) : -1;
      stage._lastTouch = Date.now();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      moved = e.clientX - startX;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(moved) > 42) {
        go(active + (moved < 0 ? 1 : -1));
      } else if (downCard > -1) {
        /* a tap: open the tapped card, or bring a side card to the front */
        if (downCard === active) open(downCard); else go(downCard);
      }
      moved = 0; downCard = -1;
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', () => { dragging = false; moved = 0; downCard = -1; });
    stage.addEventListener('pointerleave', () => { if (dragging && Math.abs(moved) > 42) endDrag(); else { dragging = false; moved = 0; downCard = -1; } });

    const prev = stage.parentElement.querySelector('[data-wheel-prev]');
    const next = stage.parentElement.querySelector('[data-wheel-next]');
    if (prev) prev.onclick = () => go(active - 1);
    if (next) next.onclick = () => go(active + 1);
    if (openBtn) openBtn.onclick = () => open(active);

    layout();
    wheelState = { go, layout, stage };
    stage.addEventListener('click', (e) => { if (e.target.closest('.wheel-card')) e.preventDefault(); });

    if (autoplay && cards.length > 2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clearInterval(S.wheelTimer);
      S.wheelTimer = setInterval(() => {
        if (document.hidden) return;
        if (Date.now() - (stage._lastTouch || 0) < 9000) return;
        go(active + 1);
      }, 5200);
      ['pointerdown', 'keydown', 'wheel'].forEach((ev) => stage.addEventListener(ev, () => { stage._lastTouch = Date.now(); }, { passive: true }));
    }
  }
  function closeWheel() { clearInterval(S.wheelTimer); S.wheelTimer = null; wheelState = null; }

  /* hero poster behaviour */
  function initHero() {
    const frame = $('#heroFrame');
    if (!frame) return;
    const track = $('#heroTrack');
    const slides = $$('.hero-slide', track);
    const dots = $$('#heroDots button');
    const thumbs = $$('#heroStrip .box');
    const hero = S.data.hero || {};
    let i = 0, timer = null, startX = 0, dx = 0, down = false;

    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      thumbs.forEach((d, k) => d.classList.toggle('on', k === i));
      slides.forEach((s, k) => {
        const img = s.querySelector('img');
        if (img) img.style.animation = k === i ? '' : 'none';
      });
    }
    const autoplay = hero.autoplay !== false && slides.length > 1;
    const delay = Math.max(1.5, Number(hero.intervalSec) || 3) * 1000;
    function start() { if (!autoplay) return; stop(); timer = setInterval(() => { if (!document.hidden) go(i + 1); }, delay); }
    function stop() { clearInterval(timer); timer = null; }

    const prev = $('#heroPrev'), next = $('#heroNext');
    if (prev) prev.onclick = () => { go(i - 1); start(); };
    if (next) next.onclick = () => { go(i + 1); start(); };
    dots.forEach((d) => (d.onclick = () => { go(Number(d.dataset.i)); start(); }));
    thumbs.forEach((t) => (t.onclick = () => { go(Number(t.dataset.i)); start(); }));

    frame.addEventListener('pointerdown', (e) => { down = true; startX = e.clientX; dx = 0; stop(); });
    frame.addEventListener('pointermove', (e) => { if (down) dx = e.clientX - startX; });
    const up = () => {
      if (!down) return;
      down = false;
      if (Math.abs(dx) > 45) go(i + (dx < 0 ? 1 : -1));
      start();
    };
    frame.addEventListener('pointerup', up);
    frame.addEventListener('pointerleave', up);
    frame.addEventListener('pointercancel', up);
    frame.addEventListener('mouseenter', stop);
    frame.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    go(0);
    start();
  }

  function renderHome() {
    S.route = { name: 'home' };
    document.title = (S.data.seo && S.data.seo.title) || `${(S.data.brand || {}).name || 'Z&Z'} — ${(S.data.brand || {}).tagline || 'Luxury Bridals & Formals'}`;
    $('#view').innerHTML = homeSections();
    initHero();
    initWheel($('[data-wheel="loved"]'), { autoplay: true });
    initForms();
    maybeShowVip();
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  /* ------------------------------ collection ------------------------------ */
  function renderCollection(id) {
    const col = (S.data.collections || []).find((c) => c.id === id);
    if (!col) {
      $('#view').innerHTML = `<div class="wrap sec"><div class="empty">This collection is not available. <a class="link-gold" href="/" data-link>Back home</a></div></div>`;
      bindLinks(); return;
    }
    S.route = { name: 'collection', id };
    document.title = `${col.name} — ${(S.data.brand || {}).name || 'Z&Z'} Luxury Bridal Collection`;
    const banner = col.banner || col.image;
    const layout = (S.data.layout && S.data.layout.collectionPage) || (S.data.collectionPage && S.data.collectionPage.layout) || 'grid';
    const anim = S.data.animations || {};
    const items = col.items;
    $('#view').innerHTML = `
      ${col.video ? `<div class="page-banner clip-banner">
        <video src="${esc(col.video)}" autoplay muted loop playsinline preload="metadata" poster="${esc(banner || '')}"></video>
        <div class="ov"><p class="eyebrow" style="color:#f3e6c4">Z&Z Couture</p><h1>${esc(col.name)}</h1>
        ${col.description ? `<p>${esc(col.description)}</p>` : ''}</div></div>` : banner ? `<div class="page-banner">${imgTag(banner, `${col.name} collection banner`, '', true)}
        <div class="ov"><p class="eyebrow" style="color:#f3e6c4">Z&Z Couture</p><h1>${esc(col.name)}</h1>
        ${col.description ? `<p>${esc(col.description)}</p>` : ''}</div></div>` : `<div class="wrap" style="padding-top:26px"><h1 class="sec-title">${esc(col.name)}</h1></div>`}
      <div class="wrap">
        <div class="crumbs" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <span><a href="/" data-link>Home</a> &nbsp;/&nbsp; ${esc(col.name)}</span>
          <div class="view-toggle" id="viewToggle">
            <button data-v="wheel" class="${layout === 'wheel' ? 'on' : ''}">Circular</button>
            <button data-v="grid" class="${layout === 'grid' ? 'on' : ''}">Grid</button>
            <select class="trans-pick" id="transPick" aria-label="Transition">
              ${TRANS.map(([v, l]) => `<option value="${v}" ${(anim.cardTransition || 'zoom') === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <section class="sec" style="padding-top:18px" id="collBody">
          ${items.length ? (layout === 'wheel' ? wheelMarkup(items.map((it) => ({ ...it, collectionId: col.id })), 'coll') : itemGrid(items.map((it) => ({ ...it, collectionId: col.id })))) : '<div class="empty">New pieces are being added to this collection. Please check back soon.</div>'}
        </section>
      </div>`;
    initWheel($('[data-wheel="coll"]'));
    bindLinks();
    const tsel = $('#transPick');
    if (tsel) tsel.addEventListener('change', () => { applyTransition(tsel.value); });
    const toggle = $('#viewToggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        $$('button', toggle).forEach((x) => x.classList.toggle('on', x === b));
        const body = $('#collBody');
        const list = col.items.map((it) => ({ ...it, collectionId: col.id }));
        body.innerHTML = b.dataset.v === 'wheel' ? wheelMarkup(list, 'coll') : itemGrid(list);
        if (b.dataset.v === 'wheel') initWheel($('[data-wheel="coll"]'));
        bindLinks();
        applyTransition((S.data.animations || {}).cardTransition || 'fade');
      });
    }
  }

  /* -------------------------------- product ------------------------------- */
  function renderProduct(cid, iid) {
    const found = findItem(cid, iid);
    if (!found) {
      $('#view').innerHTML = `<div class="wrap sec"><div class="empty">This piece is no longer available. <a class="link-gold" href="/" data-link>Back home</a></div></div>`;
      bindLinks(); return;
    }
    const { item, col } = found;
    S.route = { name: 'product', cid, iid };
    document.title = `${item.name} — ${col.name} | ${(S.data.brand || {}).name || 'Z&Z'}`;
    const imgs = (item.images || []).filter(Boolean);
    const first = imgs[0] || '';
    const wa = waLink(`Hello Z&Z! I'm interested in "${item.name}" (${col.name}). Is it available?`);
    $('#view').innerHTML = `
      <div class="wrap">
        <div class="crumbs"><a href="/" data-link>Home</a> / <a href="/c/${esc(col.id)}" data-link>${esc(col.name)}</a> / ${esc(item.name)}</div>
        <section class="sec" style="padding-top:16px">
          <div class="product">
            <div class="gallery">
              <div class="gal-main" id="galMain">
                ${imgs.length ? `<img src="${esc(first)}" alt="${esc(item.name)} — Z&Z ${esc(col.name)}" id="galImg" fetchpriority="high" decoding="async">` : '<div class="sk" style="width:100%;height:100%"></div>'}
                ${imgs.length > 1 ? `<button class="nav prev" id="galPrev" aria-label="Previous photo">${I.left}</button><button class="nav next" id="galNext" aria-label="Next photo">${I.right}</button>` : ''}
              </div>
              ${imgs.length > 1 ? `<div class="gal-thumbs" id="galThumbs">${imgs.map((u, i) => `<button class="${i === 0 ? 'on' : ''}" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
            </div>
            <div class="pd">
              <p class="coll">${esc(col.name)}</p>
              <h1>${esc(item.name)}</h1>
              <div class="price">${item.price ? `${money(item.price)} <small>${item.price ? activeCur().code : ''}</small>` : '<small>Contact for pricing</small>'}</div>
              ${item.desc ? `<p class="desc">${esc(item.desc)}</p>` : ''}
              <div class="actions">
                ${item.price ? `<button class="btn btn-gold" id="addCart">Add to bag</button>` : `<button class="btn btn-gold" id="askPrice">Contact for pricing</button>`}
                ${wa ? `<a class="btn btn-ghost wa-btn" href="${wa}" target="_blank" rel="noopener">${I.wa} WhatsApp</a>` : ''}
              </div>
              <div class="trust">
                <div>${I.check} Made to measure — share your size on WhatsApp</div>
                <div>${I.check} Nationwide delivery &amp; worldwide shipping</div>
                <div>${I.check} Video call viewing available</div>
              </div>
              ${item.video ? `<div class="clip" style="margin-top:16px">
                <video src="${esc(item.video)}" controls playsinline preload="metadata" poster="${esc(first)}" style="width:100%;border-radius:14px;border:1px solid var(--line);background:#000"></video>
                <p style="font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-top:8px">Video of this piece</p>
              </div>` : ''}
              ${imgs.length > 1 ? `<p style="font-size:11.5px;color:var(--ink-3);margin-top:18px;letter-spacing:.06em">Swipe the photo or tap a thumbnail to see all ${imgs.length} views.</p>` : ''}
            </div>
          </div>
        </section>
        ${col.items.length > 1 ? `
        <section class="sec">
          <div class="sec-head"><p class="eyebrow">More from</p><h2 class="sec-title" style="font-size:clamp(20px,3vw,30px)">${esc(col.name)}</h2><div class="hr-orn"><span></span></div></div>
          ${itemGrid(col.items.filter((x) => x.id !== item.id).map((it) => ({ ...it, collectionId: col.id })))}
        </section>` : ''}
      </div>`;
    bindLinks();

    /* gallery */
    let gi = 0;
    const galImg = $('#galImg');
    function show(i) {
      if (!galImg) return;
      gi = (i + imgs.length) % imgs.length;
      galImg.src = imgs[gi];
      $$('#galThumbs button').forEach((b, k) => b.classList.toggle('on', k === gi));
    }
    const gl = $('#galPrev'), gr = $('#galNext');
    if (gl) gl.onclick = () => show(gi - 1);
    if (gr) gr.onclick = () => show(gi + 1);
    const thumbs = $('#galThumbs');
    if (thumbs) thumbs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); });
    const main = $('#galMain');
    if (main) {
      let sx = 0, ddx = 0, dn = false;
      main.addEventListener('pointerdown', (e) => { dn = true; sx = e.clientX; ddx = 0; });
      main.addEventListener('pointermove', (e) => { if (dn) ddx = e.clientX - sx; });
      const end = () => { if (dn && Math.abs(ddx) > 40) show(gi + (ddx < 0 ? 1 : -1)); dn = false; ddx = 0; };
      main.addEventListener('pointerup', end);
      main.addEventListener('pointercancel', end);
      main.addEventListener('pointerleave', end);
      document.addEventListener('keydown', (e) => {
        if (S.route.name !== 'product') return;
        if (e.key === 'ArrowRight') show(gi + 1);
        if (e.key === 'ArrowLeft') show(gi - 1);
      });
    }

    /* add to cart */
    const addBtn = $('#addCart');
    if (addBtn) addBtn.onclick = () => addToCart(item, col);
    const ask = $('#askPrice');
    if (ask) ask.onclick = () => openModal(contactModalHTML(item, col));

    /* private view tracking */
    post('/api/track/view', { collectionId: col.id, itemId: item.id });
  }

  function contactModalHTML(item, col) {
    const wa = waLink(`Hello Z&Z! I would like the price of "${item.name}" (${col.name}).`);
    return `
      <h2>${esc(item.name)}</h2>
      <p style="color:var(--ink-2);font-size:13.5px;margin:8px 0 18px">Pricing for this piece is shared privately. Message us and our team will send you details, fabric options and delivery time.</p>
      ${wa ? `<a class="btn btn-gold wa-btn btn-block" href="${wa}" target="_blank" rel="noopener">${I.wa} Chat on WhatsApp</a>` : `<p class="form-msg err">Add your WhatsApp number in the admin panel to enable this button.</p>`}
      ${S.data.contact.phone ? `<p style="text-align:center;margin-top:14px;font-size:13px;letter-spacing:.1em">${esc(S.data.contact.phone)}</p>` : ''}`;
  }

  /* -------------------------------- adverts -------------------------------- */
  function adCard(a, variant) {
    const media = a.video
      ? `<video src="${esc(a.video)}" autoplay muted loop playsinline preload="metadata"${a.image ? ` poster="${esc(a.image)}"` : ''}></video>`
      : a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title || 'Z&Z advert')}" loading="lazy" decoding="async">` : '';
    const href = a.link || '#';
    const ext = /^https?:/i.test(href);
    const inner = `
      ${media ? `<div class="ad-media">${media}</div>` : ''}
      <div class="ad-copy">
        ${a.title ? `<strong>${esc(a.title)}</strong>` : ''}
        ${a.text ? `<span>${esc(a.text)}</span>` : ''}
        ${a.link ? `<em class="ad-cta">${esc(a.cta || 'Shop now')}</em>` : ''}
      </div>`;
    const cls = `ad ad-${variant}`;
    return ext
      ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>`
      : `<a class="${cls}" href="${esc(href)}" data-link>${inner}</a>`;
  }

  function adsByPlacement() {
    const a = (S.data && S.data.ads) || { enabled: false, items: [] };
    if (!a.enabled) return {};
    const out = {};
    (a.items || []).forEach((x) => { (out[x.placement] = out[x.placement] || []).push(x); });
    return out;
  }

  function adsSlot(placement) {
    const map = adsByPlacement();
    const list = map[placement] || [];
    if (!list.length) return '';
    return `<div class="ad-slot ad-slot-${placement}">${list.map((a) => adCard(a, placement)).join('')}</div>`;
  }

  function mountFloatingAds() {
    const map = adsByPlacement();
    $$('.ad-float-fixed').forEach((n) => n.remove());
    const floaty = (map.float || [])[0];
    const bar = (map.bottom || [])[0];
    if (floaty) {
      const el = document.createElement('div');
      el.className = 'ad-float-fixed';
      el.innerHTML = `<button class="ad-x" aria-label="Close advert">✕</button>${adCard(floaty, 'float')}`;
      document.body.appendChild(el);
      el.querySelector('.ad-x').onclick = () => el.remove();
      bindLinks(el);
    }
    if (bar) {
      const el = document.createElement('div');
      el.className = 'ad-bar-fixed';
      el.innerHTML = `<button class="ad-x" aria-label="Close advert">✕</button>${adCard(bar, 'bottom')}`;
      document.body.appendChild(el);
      el.querySelector('.ad-x').onclick = () => el.remove();
      bindLinks(el);
    }
  }

  /* ------------------------------ try-on studio --------------------------- */
  function renderLook() {
    const cfg = S.data.look || {};
    if (cfg.enabled === false) {
      $('#view').innerHTML = `<div class="wrap sec"><div class="empty">This feature is coming soon. <a class="link-root" href="/" data-link>Back home</a></div></div>`;
      bindLinks(); return;
    }
    S.route = { name: 'look' };
    document.title = `${cfg.heading || 'Try-On Studio'} — ${(S.data.brand || {}).name || 'Z&Z'}`;
    const items = allItems().filter((x) => x.images && x.images.length);
    $('#view').innerHTML = `
      <div class="wrap">
        <div class="crumbs"><a href="/" data-link>Home</a> / ${esc(cfg.heading || 'Try-On Studio')}</div>
        <section class="sec" style="padding-top:6px">
          <div class="sec-head">
            <p class="eyebrow" style="font-family:'Jost',sans-serif">VIRTUAL FITTING ROOM</p>
            <h1 class="sec-title">${esc(cfg.heading || 'Try-On Studio')}</h1>
            <div class="hr-orn"><span></span></div>
            <p class="sec-sub">${esc(cfg.intro || 'See our couture on your own photo — fitted to your body in moments.')}</p>
          </div>
          <div id="tryonRoot"></div>
        </section>
      </div>`;
    bindLinks();
    if (!window.ZZTryOn) {
      $('#tryonRoot').innerHTML = '<div class="empty">The fitting room is loading. Please refresh.</div>';
      return;
    }
    window.ZZTryOn.mount($('#tryonRoot'), {
      esc,
      toast,
      money,
      waLink: (t) => waLink(t),
      I,
      items: items.map((it) => {
        const col = (S.data.collections || []).find((c) => c.id === it.collectionId) || {};
        return Object.assign({}, it, { collectionName: col.name || '' });
      }),
      backgrounds: (cfg.backgrounds || []).slice(),
      order: (item) => { const col = (S.data.collections || []).find((c) => c.id === item.collectionId); if (item.price) { addToCart(item, col); openCart(true); } else openModal(contactModalHTML(item, col)); }
    });
  }

  /* --------------------------------- cart --------------------------------- */
  function addToCart(item, col) {
    if (!item.price) return openModal(contactModalHTML(item, col));
    const line = S.cart.find((l) => l.itemId === item.id && l.collectionId === col.id);
    if (line) line.qty += 1;
    else S.cart.push({ collectionId: col.id, itemId: item.id, name: item.name, image: (item.thumbs && item.thumbs[0]) || item.images[0] || '', price: item.price, qty: 1 });
    saveCart();
    updateCartCount();
    toast('Added to your bag');
  }
  function updateCartCount() {
    const n = S.cart.reduce((a, l) => a + l.qty, 0);
    const el = $('#cartCount');
    if (!el) return;
    el.hidden = n === 0;
    el.textContent = n > 9 ? '9+' : n;
  }
  function cartTotal() { return S.cart.reduce((a, l) => a + l.price * l.qty, 0); }

  function openCart(open) {
    const wrap = $('#cartWrap');
    if (!open) { wrap.hidden = true; document.body.classList.remove('locked'); bindLinks(); return; }
    const lines = S.cart;
    wrap.hidden = false;
    document.body.classList.add('locked');
    wrap.innerHTML = `
      <div class="sheet-bg" data-close-cart></div>
      <aside class="cart-panel" role="dialog" aria-label="Shopping bag">
        <div class="cart-head">
          <h2>Your Bag <span style="font-size:12px;letter-spacing:.1em;color:var(--ink-3)">(${lines.length})</span></h2>
          <button class="icon-btn" data-close-cart aria-label="Close bag">${I.close}</button>
        </div>
        <div class="cart-body">
          ${lines.length ? lines.map((l, i) => `
            <div class="cart-item">
              ${l.image ? `<img src="${esc(l.image)}" alt="${esc(l.name)}" loading="lazy">` : '<div class="sk" style="width:62px;height:78px"></div>'}
              <div>
                <h3>${esc(l.name)}</h3>
                <div class="cp">${money(l.price * l.qty)}</div>
                <div class="qty">
                  <button data-q="-1" data-i="${i}" aria-label="Decrease">−</button>
                  <span>${l.qty}</span>
                  <button data-q="1" data-i="${i}" aria-label="Increase">+</button>
                </div>
              </div>
              <button class="rm" data-rm="${i}">Remove</button>
            </div>`).join('') : '<div class="cart-empty">Your bag is empty.<br><br><a class="link-gold" href="/" data-link>Browse the collections</a></div>'}
        </div>
        ${lines.length ? `
        <div class="cart-foot">
          <div class="cart-total"><span>Subtotal</span><b>${money(cartTotal())}</b></div>
          <form id="checkoutForm">
            <div class="field"><span>Full name</span><input id="coName" maxlength="80" autocomplete="name" required></div>
            <div class="field"><span>Phone / WhatsApp *</span><input id="coPhone" maxlength="40" inputmode="tel" autocomplete="tel" required></div>
            <div class="field"><span>City</span><input id="coCity" maxlength="60" autocomplete="address-level2"></div>
            <div class="field"><span>Note (size, colour, date)</span><textarea id="coNote" maxlength="400" style="min-height:62px"></textarea></div>
            <button class="btn btn-gold btn-block" type="submit">Place order</button>
            <div class="form-msg" id="coOut"></div>
          </form>
          ${waLink() ? `<a class="btn btn-ghost wa-btn btn-block" style="margin-top:8px" href="${waLink('Hello Z&Z! I want to order: ' + lines.map((l) => l.name + ' x' + l.qty).join(', '))}" target="_blank" rel="noopener">${I.wa} Order on WhatsApp</a>` : ''}
          <p class="cart-note">Prices shown in ${activeCur().code}. Final confirmation, delivery and payment details are shared on call/WhatsApp.</p>
        </div>` : ''}
      </aside>`;
    wrap.querySelectorAll('[data-close-cart]').forEach((b) => (b.onclick = () => openCart(false)));
    wrap.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.i), d = Number(b.dataset.q);
      S.cart[i].qty = Math.max(1, Math.min(20, S.cart[i].qty + d));
      saveCart(); updateCartCount(); openCart(true);
    }));
    wrap.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => {
      S.cart.splice(Number(b.dataset.rm), 1);
      saveCart(); updateCartCount(); openCart(true);
      if (!S.cart.length) { openCart(false); toast('Bag cleared'); }
    }));
    const form = $('#checkoutForm');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = $('#coOut');
      const phone = $('#coPhone').value.trim();
      if (!phone) { out.className = 'form-msg err'; out.textContent = 'Please add your phone number.'; return; }
      out.className = 'form-msg'; out.textContent = 'Placing your order…';
      const res = await post('/api/order', {
        name: $('#coName').value.trim(), phone, city: $('#coCity').value.trim(),
        note: $('#coNote').value.trim(), currency: activeCur().code, items: S.cart
      });
      if (res.ok) {
        S.cart = []; saveCart(); updateCartCount();
        openCart(false);
        openModal(`
          <div class="thanks">
            <div class="tick">✓</div>
            <h2>Thank you!</h2>
            <p style="margin-top:8px">${esc(res.message)}</p>
            <p style="font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-top:12px">Order reference ${esc(res.orderId)}</p>
            <button class="btn btn-gold btn-sm" style="margin-top:18px" data-close-modal>Continue shopping</button>
          </div>`);
      } else {
        out.className = 'form-msg err';
        out.textContent = res.error || 'Could not place the order. Please try again or use WhatsApp.';
      }
    });
    bindLinks();
  }

  /* --------------------------------- modal -------------------------------- */
  function openModal(html) {
    const root = $('#modalRoot');
    root.hidden = false;
    document.body.classList.add('locked');
    root.innerHTML = `<div class="sheet-bg" data-close-modal></div><div class="modal" role="dialog" aria-modal="true"><button class="x" data-close-modal aria-label="Close">${I.close}</button>${html}</div>`;
    root.querySelectorAll('[data-close-modal]').forEach((b) => (b.onclick = () => closeModal()));
    bindLinks();
  }
  function closeModal() {
    const root = $('#modalRoot');
    root.hidden = true;
    root.innerHTML = '';
    if ($('#cartWrap').hidden && !$('#drawer').classList.contains('open')) document.body.classList.remove('locked');
  }

  /* ------------------------------- VIP popup ------------------------------ */
  function vipHTML() {
    const v = S.data.valuable || {};
    return `
      <div class="vip-card" role="dialog" aria-label="Become our valuable customer">
        <button class="x" data-vip-close aria-label="Close">${I.close}</button>
        <p class="eyebrow">Members Only</p>
        <h3>${esc(v.title || 'Become Our Valuable Customer')}</h3>
        <p>${esc(v.text || 'Join our VIP list for early access to new drops and private discounts.')}</p>
        <form class="vip-row" id="vipForm">
          <input id="vipContact" placeholder="Email or WhatsApp number" maxlength="120" required aria-label="Email or WhatsApp number">
          <button class="btn btn-gold btn-sm" type="submit">Join</button>
        </form>
        <div class="form-msg" id="vipOut" style="margin-top:8px"></div>
      </div>`;
  }
  function maybeShowVip(force) {
    const v = S.data.valuable || {};
    if (!v.enabled && !force) return;
    let dismissed = 0;
    try { dismissed = Number(localStorage.getItem('zz_vip_dismiss') || 0); } catch (e) {}
    if (!force && dismissed && Date.now() - dismissed < 1000 * 60 * 60 * 24 * 7) return;
    setTimeout(showVip, force ? 0 : Math.max(600, Number(v.delayMs) || 3500));
  }
  function showVip() {
    const root = $('#vipRoot');
    if (!root.hidden) return;
    root.hidden = false;
    root.innerHTML = vipHTML();
    const close = () => { root.hidden = true; root.innerHTML = ''; try { localStorage.setItem('zz_vip_dismiss', String(Date.now())); } catch (e) {} };
    root.querySelectorAll('[data-vip-close]').forEach((b) => (b.onclick = close));
    document.addEventListener('click', function onDoc(e) {
      if (root.hidden) { document.removeEventListener('click', onDoc); return; }
      if (!e.target.closest('.vip-card')) close();
    });
    const form = $('#vipForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const contact = $('#vipContact').value.trim();
      const out = $('#vipOut');
      if (!contact) return;
      out.className = 'form-msg';
      out.textContent = 'Sending…';
      const res = await post('/api/lead', { contact, type: 'valuable_customer', page: location.pathname });
      if (res.ok) {
        out.className = 'form-msg ok';
        out.textContent = res.message;
        try { localStorage.setItem('zz_vip_dismiss', String(Date.now())); } catch (err) {}
        setTimeout(() => { root.hidden = true; root.innerHTML = ''; }, 2200);
      } else {
        out.className = 'form-msg err';
        out.textContent = res.error || 'Please try again.';
      }
    });
  }

  /* --------------------------------- forms -------------------------------- */
  function initForms() {
    const starsWrap = $('#rateStars');
    if (starsWrap) {
      const val = $('#rateVal');
      const paint = (n) => $$('button', starsWrap).forEach((b, i) => b.classList.toggle('on', i < n));
      paint(5);
      starsWrap.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        val.value = b.dataset.s;
        paint(Number(b.dataset.s));
      });
    }
    const rateForm = $('#rateForm');
    if (rateForm) rateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = $('#rateMsgOut');
      const res = await post('/api/rating', { stars: $('#rateVal').value, name: $('#rateName').value, message: $('#rateMsg').value });
      out.className = 'form-msg ' + (res.ok ? 'ok' : 'err');
      out.textContent = res.ok ? res.message : res.error || 'Please try again.';
      if (res.ok) rateForm.reset();
    });
    const compForm = $('#compForm');
    if (compForm) compForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = $('#compOut');
      if (!$('#compMsg').value.trim()) { out.className = 'form-msg err'; out.textContent = 'Please write your complaint.'; return; }
      const res = await post('/api/complaint', { name: $('#compName').value, contact: $('#compPhone').value, message: $('#compMsg').value });
      out.className = 'form-msg ' + (res.ok ? 'ok' : 'err');
      out.textContent = res.ok ? res.message : res.error || 'Please try again.';
      if (res.ok) compForm.reset();
    });
  }

  /* -------------------------------- footer -------------------------------- */
  function renderFooter() {
    const b = S.data.brand || {};
    const social = SOCIALS.filter(([k]) => (S.data.social || {})[k]);
    $('#siteFoot').innerHTML = `
      <div class="wrap">
        <div class="foot-grid">
          <div class="foot-brand">
            ${brandLogo('logo3d-sm')}
            <div style="font-family:'Cormorant Garamond',serif;font-size:22px;letter-spacing:.14em" class="gold-text">${esc(b.name || 'Z&Z')}</div>
            <div style="font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--ink-3);margin-top:4px">${esc(b.fullName || '')}</div>
            <p style="font-size:12.5px;color:var(--ink-2);margin-top:12px;max-width:30ch">${esc(b.tagline || 'Luxury Bridals & Formals')}</p>
          </div>
          <div>
            <h4>Explore</h4>
            <a class="fl" href="/" data-link>Home</a>
            ${(S.data.collections || []).map((c) => `<a class="fl" href="/c/${esc(c.id)}" data-link>${esc(c.name)}</a>`).join('')}
          </div>
          <div>
            <h4>Help</h4>
            <a class="fl" href="/#reviews" data-link>Rates &amp; Feedback</a>
            <a class="fl" href="/#terms" data-link>Terms &amp; Conditions</a>
            <a class="fl" href="/#about" data-link>About Us</a>
            <a class="fl" href="/#contact" data-link>Contact Us</a>
          </div>
          <div>
            <h4>Follow</h4>
            ${social.length ? `<div class="socials">${social.map(([k, label]) => `<a href="${esc(S.data.social[k])}" target="_blank" rel="noopener" aria-label="${label}">${I[k]}</a>`).join('')}</div>` : `<p style="font-size:12px;color:var(--ink-3)">Social links coming soon.</p>`}
          </div>
        </div>
        <div class="foot-bottom">
          <span>© ${new Date().getFullYear()} ${esc(b.name || 'Z&Z')} · All rights reserved</span>
          <span>Crafted with love in Pakistan</span>
          <a class="admin-key" href="/admin" aria-label="Admin">${I.key} Admin</a>
        </div>
      </div>`;
  }

  /* quick add-to-bag / ask price buttons anywhere on the page */
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      e.stopPropagation();
      const [cid, iid] = add.dataset.add.split('|');
      const f = findItem(cid, iid);
      if (f) { addToCart(f.item, f.col); }
      return;
    }
    const ask = e.target.closest('[data-ask]');
    if (ask) {
      e.preventDefault();
      e.stopPropagation();
      const [cid, iid] = ask.dataset.ask.split('|');
      const f = findItem(cid, iid);
      if (f) openModal(contactModalHTML(f.item, f.col));
    }
  }, true);

  /* ------------------------------- link wiring ---------------------------- */
  function bindLinks() {
    $$('[data-link]').forEach((a) => {
      if (a._bound) return;
      a._bound = true;
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('http')) return;
        e.preventDefault();
        openDrawer(false);
        closeModal();
        if (href.startsWith('/#')) {
          if (location.pathname !== '/') { navigate('/'); setTimeout(() => { const t = document.querySelector(href.slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth' }); }, 250); }
          else { const t = document.querySelector(href.slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth' }); }
          return;
        }
        navigate(href);
      });
    });
  }

  /* --------------------------------- boot --------------------------------- */
  function bindShell() {
    $('#siteHead').addEventListener('click', (e) => {
      if (e.target.closest('#menuBtn')) return openDrawer(true);
      if (e.target.closest('#themeBtn')) {
        S.theme = S.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('zz_theme', S.theme); } catch (err) {}
        applyTheme();
        return;
      }
      if (e.target.closest('#cartBtn')) return openCart(true);
    });
    $('#siteHead').addEventListener('change', (e) => {
      if (e.target.id === 'curSel') {
        S.currency = e.target.value;
        try { localStorage.setItem('zz_cur', S.currency); } catch (err) {}
        route();
        toast('Prices in ' + S.currency);
      }
    });
    $('#drawer').addEventListener('click', (e) => {
      if (e.target.closest('#drawerClose')) openDrawer(false);
      const act = e.target.closest('[data-act]');
      if (act) {
        openDrawer(false);
        if (act.dataset.act === 'vip') showVip();
        if (act.dataset.act === 'complaint') {
          if (location.pathname !== '/') { navigate('/'); setTimeout(() => $('#compForm') && $('#compForm').scrollIntoView({ behavior: 'smooth' }), 300); }
          else $('#compForm') && $('#compForm').scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
    $('#scrim').addEventListener('click', () => openDrawer(false));
    window.addEventListener('popstate', route);
    window.addEventListener('scroll', () => {
      $('#siteHead').classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { openDrawer(false); closeModal(); openCart(false); } });
  }

  /* ------- instant paint on slow connections: last-good data from localStorage -------
     The cached copy is painted immediately, then refreshed in the background. */
  const BOOT_KEY = 'zz_boot_v1';
  function readBootCache() {
    try { const j = JSON.parse(localStorage.getItem(BOOT_KEY) || '0'); return j && j.data ? j : null; } catch (e) { return null; }
  }
  function writeBootCache(data) {
    try { localStorage.setItem(BOOT_KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
  }
  function paint(res) {
    S.data = res.data;
    try { mountLivePill(); } catch (e) {}
    if (!curList().some((c) => c.code === S.currency)) S.currency = (curList()[0] || {}).code || 'PKR';
    applyTheme(); renderHeader(); renderDrawer(); renderFooter(); route();
  }

  async function boot() {
    let res;
    const cached = readBootCache();
    try {
      res = await fetch('/api/bootstrap').then((r) => r.json());
    } catch (e) {
      if (cached && cached.data) { paint(cached); bindShell(); bindLinks(); return; }  /* offline: show the last saved catalogue */
      $('#view').innerHTML = '<div class="wrap sec"><div class="empty">Could not load the store. Please refresh.</div></div>';
      return;
    }
    if (!res.ok) return;
    writeBootCache(res.data);
    S.data = res.data;
    try { mountLivePill(); } catch (e) {}
    if (!curList().some((c) => c.code === S.currency)) S.currency = (curList()[0] || {}).code || 'PKR';
    /* live exchange rates (auto-adjusts with the real market) */
    fetch('/api/rates').then((r) => r.json()).then((j) => {
      if (j && j.ok && j.rates) {
        S.liveRates = j.rates;
        if (S.route.name === 'home') route();
      }
    }).catch(() => {});
    applyTheme();
    renderHeader();
    renderDrawer();
    renderFooter();
    bindShell();
    route();
    bindLinks();

    /* keep the header/welcome branding in sync with admin settings */
    const b = S.data.brand || {};
    const ww = document.getElementById('welcomeWord');
    if (ww && b.welcomeWord) ww.textContent = b.welcomeWord;
    const wb = document.getElementById('welcomeBrand');
    if (wb && b.name) wb.textContent = b.name;
    const wt = document.getElementById('welcomeTag');
    if (wt && b.tagline) wt.textContent = b.tagline;
    const wl = document.querySelector('#welcome .lw img');
    if (wl && b.logo) wl.src = b.logo;

    /* floating WhatsApp button (only when you add a number in the admin panel) */
    const waHref = waLink();
    if (waHref && !document.querySelector('.wa-fab')) {
      const fab = document.createElement('a');
      fab.className = 'wa-fab';
      fab.href = waHref;
      fab.target = '_blank';
      fab.rel = 'noopener';
      fab.setAttribute('aria-label', 'Chat with us on WhatsApp');
      fab.innerHTML = I.wa;
      document.body.appendChild(fab);
    }

    window.__znzSetCurrency = (code) => { S.currency = code; if (S.route.name) route(); };
  window.addEventListener('zz:enter', () => { maybeShowVip(); });
  }

  ping();
  setInterval(() => { if (!document.hidden) { ping(); } }, 25000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
