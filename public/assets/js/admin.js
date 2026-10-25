/* ==========================================================================
   Z&Z — admin panel
   Everything the owner needs: posters, collections, dresses, prices, colours,
   contact/socials, terms, about, branches, inbox, credentials.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = { data: null, tab: 'dashboard', inboxTab: 'orders', itemsCol: null, uploads: {} };

  const TITLES = {
    dashboard: 'Dashboard', posters: 'Posters & Hero', collections: 'Collections', items: 'Dresses & Prices',
    home: 'Home Sections', motion: 'Layout & Motion', looks: 'Client Photos', ads: 'Advertisements',
    inbox: 'Inbox', look: 'Look & Colours', contact: 'Contact & Social',
    pages: 'About / Terms / SEO', security: 'Security'
  };

  /* ------------------------------- transport ------------------------------ */
  async function api(url, opts) {
    const o = Object.assign({ headers: {} }, opts || {});
    if (o.body && !(o.body instanceof FormData)) {
      o.headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(o.body);
    }
    const r = await fetch(url, o);
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (r.status === 401) { showLogin(); throw new Error('Session expired — please log in again.'); }
    return j;
  }
  function toast(m) {
    const t = $('#toast');
    t.textContent = m; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function flash() {
    const s = $('#savedFlag');
    s.textContent = 'Saved ✓'; s.classList.add('on');
    clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 1800);
  }
  function setPath(obj, path, val) {
    const parts = path.split('.');
    let cur = obj;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) cur[p] = val;
      else { if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {}; cur = cur[p]; }
    });
    return obj;
  }

  /* the same 13 effects the client can pick between */
  const TRANS = [
    ['fade', 'Fade'], ['slide', 'Slide'], ['zoom', 'Zoom'], ['cube', 'Cube'],
    ['flip', 'Card flip'], ['coverflow', 'Cover flow'], ['curl', 'Page curl'],
    ['bounce', 'Bounce'], ['accordion', 'Accordion'], ['parallax', 'Parallax'],
    ['morph', 'Morphing'], ['stack', 'Stacked cards'], ['rotate', 'Slow spin']
  ];
  const transOptions = (cur) => TRANS.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('');
  const getPath = (obj, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj);

  /* --------------------------------- login -------------------------------- */
  function showLogin() {
    $('#panel').hidden = true;
    $('#loginScreen').hidden = false;
  }
  function showPanel() {
    $('#loginScreen').hidden = true;
    $('#panel').hidden = false;
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#lgMsg'), btn = $('#lgBtn');
    btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Checking…';
    const res = await api('/api/admin/login', {
      method: 'POST',
      body: { username: $('#lgUser').value.trim(), password: $('#lgPass').value, pin: $('#lgPin').value.trim() }
    }).catch(() => ({ ok: false, error: 'Network error' }));
    btn.disabled = false;
    if (res.ok) { msg.textContent = ''; await boot2(); }
    else { msg.className = 'msg err'; msg.textContent = res.error || 'Login failed.'; }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    showLogin();
  });

  /* ------------------------------ bootstrap -------------------------------- */
  async function boot2() {
    const res = await api('/api/admin/data');
    if (!res.ok) return showLogin();
    A.data = res.data;
    showPanel();
    $('#who').textContent = 'Signed in as ' + A.data.username;
    if (!A.itemsCol && A.data.collections.length) A.itemsCol = A.data.collections[0].id;
    const inboxCount = A.data.leads.length + A.data.complaints.length + A.data.ratings.length + A.data.orders.length;
    const dot = $('#inboxDot'); dot.hidden = inboxCount === 0;
    /* permissions: hide the tabs this account may not use */
    const perms = A.data.permissions || {};
    const gate = {
      posters: perms.adminCanPosters, collections: perms.adminCanCollections, items: perms.adminCanItems,
      home: perms.adminCanHome, look: perms.adminCanLook, contact: perms.adminCanContact,
      pages: perms.adminCanPages, security: perms.adminCanSecurity, inbox: perms.adminCanInbox, ads: perms.adminCanAds
    };
    $$('#sideNav button[data-tab]').forEach((b) => {
      const allowed = gate[b.dataset.tab];
      b.hidden = allowed === false;
    });
    if (gate[A.tab] === false) A.tab = 'dashboard';
    renderTab(A.tab);
  }

  async function reload(keepTab) {
    const res = await api('/api/admin/data');
    if (res.ok) { A.data = res.data; renderTab(keepTab || A.tab); }
  }

  /* ------------------------------ tab routing ------------------------------ */
  $('#sideNav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    A.tab = b.dataset.tab;
    $$('#sideNav button').forEach((x) => x.classList.toggle('on', x === b));
    $('.side').classList.remove('open');
    renderTab(A.tab);
  });
  $('#sideToggle').addEventListener('click', () => $('.side').classList.toggle('open'));

  function renderTab(tab) {
    A.tab = tab;
    $('#tabTitle').textContent = TITLES[tab] || tab;
    $$('#sideNav button').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab));
    const body = $('#tabBody');
    body.innerHTML = (VIEWS[tab] || VIEWS.dashboard)();
    if (BIND[tab]) BIND[tab]();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------ ui helpers ------------------------------- */
  function fld(label, path, value, opts) {
    const o = opts || {};
    const type = o.type || 'text';
    if (type === 'textarea') {
      return `<label class="fld"><span>${esc(label)}</span><textarea data-set="${path}" ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''}>${esc(value || '')}</textarea></label>`;
    }
    return `<label class="fld"><span>${esc(label)}</span><input data-set="${path}" ${o.num ? 'data-type="num"' : ''} type="${type}" value="${esc(value == null ? '' : value)}" ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''} ${o.max ? `maxlength="${o.max}"` : ''} ${o.step ? `step="${o.step}"` : ''} ${o.min != null ? `min="${o.min}"` : ''}></label>`;
  }
  function sw(label, path, checked) {
    return `<label class="switch"><input type="checkbox" data-set="${path}" data-type="bool" ${checked ? 'checked' : ''}><i></i><span>${esc(label)}</span></label>`;
  }
  function saveBtn(label) { return `<div class="actions" style="margin-top:14px"><button class="btn gold" data-save>${esc(label || 'Save changes')}</button></div>`; }
  function imgBox(url, kind, path) {
    return `<div class="actions" style="margin-top:6px;align-items:flex-start;gap:12px">
      ${url ? `<img src="${esc(url)}" alt="" style="width:104px;height:126px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">` : `<div style="width:104px;height:126px;border-radius:10px;border:1px dashed var(--line);display:grid;place-items:center;font-size:10px;color:var(--ink-3);text-align:center">No image</div>`}
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn sm" data-pick="${kind}" data-target="${path}">${url ? 'Change image' : 'Upload image'}</button>
        ${url ? `<button class="btn sm danger" data-clear="${path}">Remove</button>` : ''}
      </div>
    </div>`;
  }

  /* generic save handler for cards */
  document.addEventListener('click', async (e) => {
    const save = e.target.closest('[data-save]');
    if (save) {
      const card = save.closest('.card') || document;
      const patch = {};
      card.querySelectorAll('[data-set]').forEach((el) => {
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.dataset.type === 'num') v = Number(String(v).replace(/[^\d.\-]/g, '')) || 0;
        setPath(patch, el.dataset.set, v);
      });
      const custom = card.querySelector('[data-json]');
      if (custom) {
        try { setPath(patch, custom.dataset.json, JSON.parse(custom.value || '[]')); } catch (err) { return toast('Invalid JSON'); }
      }
      save.disabled = true;
      const res = await api('/api/admin/settings', { method: 'PUT', body: patch });
      save.disabled = false;
      if (res.ok) { A.data.settings = res.settings; flash(); toast('Saved'); }
      else toast(res.error || 'Could not save');
      return;
    }

    const clear = e.target.closest('[data-clear]');
    if (clear) {
      const path = clear.dataset.clear;
      const patch = setPath({}, path, '');
      await api('/api/admin/settings', { method: 'PUT', body: patch });
      await reload();
      flash();
      return;
    }

    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const target = pick.dataset.target;
      pickFile(pick.dataset.pick, async (files) => {
        const up = await uploadFiles(files, pick.dataset.pick);
        if (!up.length) return toast('Upload failed');
        const res = await api('/api/admin/settings', { method: 'PUT', body: setPath({}, target, up[0].url) });
        if (res.ok) { A.data.settings = res.settings; await reload(); flash(); }
      });
      return;
    }
  });

  /* ------------------------------- uploads -------------------------------- */
  async function uploadFiles(files, kind) {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    const r = await fetch('/api/admin/upload?kind=' + encodeURIComponent(kind || 'other'), { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { toast(j.error || 'Upload failed'); return []; }
    return j.files || [];
  }

  /* ------------------------------ video upload ----------------------------- */
  async function uploadVideo(files) {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    const r = await fetch('/api/admin/upload-video', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { toast(j.error || 'Video upload failed'); return []; }
    return j.files || [];
  }
  let fileCb = null;
  function pickFile(kind, cb) { fileCb = cb; $('#hiddenFile').dataset.kind = kind; $('#hiddenFile').click(); }
  $('#hiddenFile').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files && files.length && fileCb) await fileCb(files);
    e.target.value = '';
    fileCb = null;
  });

  /* one delegated listener per tab render (no duplicates, no dead handlers) */
  let tabHandler = null;
  function onTab(fn) {
    const body = $('#tabBody');
    if (tabHandler) body.removeEventListener('click', tabHandler);
    tabHandler = async (e) => { try { await fn(e); } catch (err) { console.error(err); toast('Something went wrong'); } };
    body.addEventListener('click', tabHandler);
  }

  /* ------------------------------- dashboard ------------------------------- */
  const VIEWS = {};
  const BIND = {};

  /* ---------------------------- layout & motion ---------------------------- */
  VIEWS.motion = () => {
    const a = A.data.settings.animations || {};
    const L = A.data.settings.layout || {};
    const B = A.data.settings.bubbles || {};
    const trans = [['fade', 'Fade'], ['slide', 'Slide'], ['zoom', 'Zoom'], ['cube', 'Cube'],
      ['flip', 'Card flip'], ['coverflow', 'Cover flow'], ['curl', 'Page curl'], ['bounce', 'Bounce'],
      ['accordion', 'Accordion'], ['parallax', 'Parallax'], ['morph', 'Morphing'], ['stack', 'Stacked']];
    return `
      <div class="card">
        <h2>Layout</h2>
        <p class="hint">Pick how collections open, and the effect used when a new view appears.</p>
        <div class="row">
          <label class="fld"><span>Home “most loved” layout</span>
            <select data-set="layout.homeLoved">
              <option value="grid" ${L.homeLoved !== 'wheel' ? 'selected' : ''}>Grid</option>
              <option value="wheel" ${L.homeLoved === 'wheel' ? 'selected' : ''}>Circular wheel</option>
            </select></label>
          <label class="fld"><span>Collection page layout</span>
            <select data-set="layout.collectionPage">
              <option value="grid" ${L.collectionPage !== 'wheel' ? 'selected' : ''}>Grid</option>
              <option value="wheel" ${L.collectionPage === 'wheel' ? 'selected' : ''}>Circular wheel</option>
            </select></label>
        </div>
        ${saveBtn('Save layout')}
      </div>
      <div class="card">
        <h2>Motion</h2>
        <div class="row">
          <label class="fld"><span>Card transition</span>
            <select data-set="animations.cardTransition">${trans.map(([v, l]) => `<option value="${v}" ${a.cardTransition === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="fld"><span>Page transition</span>
            <select data-set="animations.transition">${trans.map(([v, l]) => `<option value="${v}" ${a.transition === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${fld('Bubbles on entrance (approx.)', 'bubbles.count', B.count || 38, { type: 'number', num: true })}
        </div>
        ${saveBtn('Save motion')}
      </div>
`;
  };

  /* ------------------------------ adverts (if allowed) --------------------- */
  VIEWS.ads = () => {
    if (A.data.permissions && A.data.permissions.adminCanAds === false) {
      return `<div class="card"><h2>Advertisements</h2><p class="hint">Adverts are switched off for this panel.</p></div>`;
    }
    const ads = A.data.settings.ads || { enabled: true, items: [] };
    const list = ads.items || [];
    return `<div class="card">
      <h2>Advertisements</h2>
      <p class="hint">Owner ne aap ko ads ka access de diya hai. Yahan se poster / video ad laga ya hata sakte hain.</p>
      ${list.length ? list.map((a) => `<div class="listrow" style="padding:10px 0">
        ${a.image ? `<img class="sm" src="${esc(a.image)}" alt="">` : '<div style="width:56px;height:40px;border:1px dashed var(--line);border-radius:6px"></div>'}
        <div><h4>${esc(a.title || 'Untitled')}</h4><p>${esc(a.placement)}${a.enabled === false ? ' · paused' : ' · live'}</p></div>
      </div>`).join('') : '<div class="empty">No adverts.</div>'}
      <p class="hint" style="margin-top:12px">Yahan aap adverts dekh aur pause kar sakte hain.</p>
    </div>`;
  };

  /* ----------------------------- client photos ----------------------------- */
  VIEWS.looks = () => {
    const looks = A.data.looks || [];
    const tryons = A.data.tryons || [];
    const bgs = A.data.backgrounds || [];
    if (A.data.looksLocked || A.data.tryonsLocked) {
      return `<div class="card"><h2>Client photos</h2><p class="hint">These photos are private to each client.</p></div>`;
    }
    const tryonCard = `
      <div class="card">
        <h2>Try-On Studio — client looks</h2>
        <p class="hint">Made in the Try-On Studio. Private — never shown on the website. You can add or replace the backgrounds used in the fitting room.</p>
        <div class="actions" style="margin:0 0 12px">
          <label class="btn sm">Upload a background<input type="file" id="bgFileA" accept="image/*" hidden></label>
          <input id="bgNameA" placeholder="Background name" style="max-width:220px">
        </div>
        ${bgs.length ? `<div class="look-grid" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-bottom:14px">
          ${bgs.map((b) => `<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf8">
            <a href="${esc(b.url)}" target="_blank" rel="noopener"><img src="${esc(b.small || b.url)}" style="width:100%;height:110px;object-fit:cover" alt=""></a>
            <div style="padding:6px 8px;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--ink-3)">
              <span>${esc(b.name)}</span><button class="btn sm danger" data-bgdel="${esc(b.id)}">Remove</button></div>
          </div>`).join('')}</div>` : ''}
        ${tryons.length ? `<div class="look-grid" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
          ${tryons.map((l) => `<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf8">
            <a href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(l.thumb || l.url)}" style="width:100%;height:190px;object-fit:cover" alt=""></a>
            <div style="padding:8px 10px;font-size:10.5px;color:var(--ink-3)">${new Date(l.createdAt).toLocaleString()}<br>${esc(l.itemName || '')}${l.background ? ' · ' + esc(l.background) : ''}</div>
          </div>`).join('')}</div>` : '<div class="empty">No try-on photos yet.</div>'}
      </div>`;
    return tryonCard + `
      <div class="card">
        <h2>Older client photos</h2>
        <p class="hint">Uploaded by customers in “Check Your Look”. Private — never shown on the website.</p>
        ${looks.length ? `<div class="look-grid" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">
          ${looks.map((l) => `<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fffdf8">
            <a href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(l.thumb || l.url)}" style="width:100%;height:190px;object-fit:cover" alt=""></a>
            <div style="padding:8px 10px;font-size:10.5px;color:var(--ink-3)">${new Date(l.createdAt).toLocaleString()}</div>
          </div>`).join('')}</div>` : '<div class="empty">No client photos yet.</div>'}
      </div>`;
  };


  VIEWS.dashboard = () => {
    const s = A.data.stats, st = A.data.settings;
    const missing = [];
    if (!st.contact.whatsapp) missing.push('WhatsApp number (needed for the WhatsApp buttons)');
    if (!(st.hero.posters || []).length) missing.push('at least one hero poster');
    if (!A.data.collections.length) missing.push('a collection');
    if (!st.about.text) missing.push('about-us text');
    return `
      <div class="stats">
        <div class="stat"><span>Dresses</span><b>${s.items}</b></div>
        <div class="stat"><span>Collections</span><b>${s.collections}</b></div>
        <div class="stat"><span>Total views</span><b>${s.views}</b></div>
        <div class="stat"><span>Orders</span><b>${s.orders}</b></div>
        <div class="stat"><span>VIP leads</span><b>${s.leads}</b></div>
        <div class="stat"><span>Complaints</span><b>${s.complaints}</b></div>
        <div class="stat"><span>Avg. rating</span><b>${s.avgRating}</b></div>
      </div>
      ${missing.length ? `<div class="warn"><b>Finish your setup:</b><ul style="margin:8px 0 0 18px;padding:0">${missing.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <div class="card">
        <h2>Quick switches</h2>
        <p class="hint">Instantly turn the main customer-facing blocks on or off.</p>
        <div class="row">
          <div>${sw('Notice / offer bar', 'notice.enabled', A.data.settings.notice.enabled)}</div>
          <div>${sw('Most-loved (hot selling) section', 'hotSelling.enabled', A.data.settings.hotSelling.enabled !== false)}</div>
          <div>${sw('“Become our valuable customer” popup', 'valuable.enabled', A.data.settings.valuable.enabled)}</div>
        </div>
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Recent orders</h2>
        <p class="hint">Newest first. Manage everything from the Inbox tab.</p>
        ${A.data.orders.length ? A.data.orders.slice(0, 4).map((o) => `
          <div class="inboxrow" style="margin-bottom:8px">
            <div class="meta"><span class="pill on">${esc(o.id)}</span><span>${esc(o.name || '—')}</span><span>${esc(o.phone || '')}</span><span>${new Date(o.createdAt).toLocaleString()}</span></div>
            <div class="body">${o.items.map((i) => esc(i.name) + ' ×' + i.qty).join('<br>')}</div>
          </div>`).join('') : '<div class="empty">No orders yet.</div>'}
      </div>
      <div class="card">
        <h2>Credentials</h2>
        <p class="hint">Username, password and 4-digit PIN can be changed any time from the Security tab.${A.data.credentialsUpdatedAt ? ' Last changed: ' + esc(new Date(A.data.credentialsUpdatedAt).toLocaleString()) : ''}</p>
        <button class="btn sm" data-goto="security">Open security</button>
      </div>`;
  };
  /* try-on photos: background upload + delete (only when the owner allowed it) */
  BIND.looks = () => {
    const f = document.getElementById('bgFileA');
    if (f) f.onchange = async () => {
      const file = f.files && f.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', (document.getElementById('bgNameA') || {}).value || 'My background');
      const j = await api('/api/owner/backgrounds', { method: 'POST', body: fd });
      toast(j.ok ? 'Background added' : (j.error || 'Upload failed'));
      reload('looks');
    };
    const body = document.getElementById('tabBody');
    if (body) body.onclick = async (e) => {
      const b = e.target.closest('[data-bgdel]');
      if (!b) return;
      if (!confirm('Remove this background?')) return;
      await api('/api/owner/backgrounds/' + encodeURIComponent(b.dataset.bgdel), { method: 'DELETE' });
      reload('looks');
    };
  };

  BIND.dashboard = () => {
    $$('[data-goto]').forEach((b) => (b.onclick = () => renderTab(b.dataset.goto)));
  };

  /* -------------------------------- posters -------------------------------- */
  VIEWS.posters = () => {
    const h = A.data.settings.hero || {};
    const posters = h.posters || [];
    return `
      <div class="card">
        <h2>Hero posters</h2>
        <p class="hint">These appear as the big rotating poster on the home page. Add as many as you like — one poster, or many that rotate automatically. Upload JPG/PNG/WEBP (any size; the server auto-resizes to a crisp web format for fast loading).</p>
        <div class="drop" id="dropPoster">Click or drop images here to upload posters</div>
        <div class="thumbs" id="posterThumbs">
          ${posters.map((p, i) => `
            <div class="thumb">
              <img src="${esc(p.url)}" alt="">
              <span class="tag">${i + 1}</span>
              <div class="bar">
                <button data-po="up" data-id="${esc(p.id)}" title="Move up">↑</button>
                <button data-po="down" data-id="${esc(p.id)}" title="Move down">↓</button>
                <button data-po="del" data-id="${esc(p.id)}" title="Delete">✕</button>
              </div>
            </div>`).join('') || '<div class="empty">No posters yet.</div>'}
        </div>
      </div>
      <div class="card">
        <h2>Poster rotation</h2>
        <p class="hint">How long each poster stays before the next one appears. The customer can also swipe posters manually.</p>
        <div class="row">
          <div>${sw('Auto-rotate posters', 'hero.autoplay', h.autoplay !== false)}</div>
          ${fld('Seconds per poster', 'hero.intervalSec', h.intervalSec || 3, { type: 'number', num: true })}
        </div>
        ${saveBtn()}
      </div>`;
  };
  BIND.posters = () => {
    const drop = $('#dropPoster');
    const th = $('#posterThumbs');
    async function addPosters(files) {
      const up = await uploadFiles(files, 'poster');
      if (!up.length) return;
      const posters = (A.data.settings.hero.posters || []).concat(up.map((f, i) => ({ id: 'p' + Date.now().toString(36) + i, url: f.url, alt: '' })));
      const res = await api('/api/admin/posters', { method: 'PUT', body: { posters } });
      if (res.ok) { A.data.settings.hero.posters = res.posters; renderTab('posters'); flash(); }
    }
    drop.onclick = () => pickFile('poster', addPosters);
    ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) addPosters(e.dataTransfer.files); });

    th.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-po]');
      if (!b) return;
      const posters = (A.data.settings.hero.posters || []).slice();
      const i = posters.findIndex((p) => p.id === b.dataset.id);
      if (i < 0) return;
      if (b.dataset.po === 'del') posters.splice(i, 1);
      if (b.dataset.po === 'up' && i > 0) posters.splice(i - 1, 0, posters.splice(i, 1)[0]);
      if (b.dataset.po === 'down' && i < posters.length - 1) posters.splice(i + 1, 0, posters.splice(i, 1)[0]);
      const res = await api('/api/admin/posters', { method: 'PUT', body: { posters } });
      if (res.ok) { A.data.settings.hero.posters = res.posters; renderTab('posters'); flash(); }
    });
  };

  /* ------------------------------ collections ------------------------------ */
  VIEWS.collections = () => {
    const cols = A.data.collections;
    return `
      <div class="card">
        <h2>Collections</h2>
        <p class="hint">Add, rename, reorder or remove collections. The customer sees them in this order on the home page and in the menu. Each collection box image is what the customer taps.</p>
        <button class="btn gold sm" id="addCol">+ Add collection</button>
        <div style="margin-top:12px">
          ${cols.length ? cols.map((c, i) => `
            <div class="listrow col">
              ${c.image ? `<img class="sm" src="${esc(c.image)}" alt="">` : '<div style="width:56px;height:68px;border:1px dashed var(--line);border-radius:8px"></div>'}
              <div>
                <h4>${esc(c.name)} ${c.enabled === false ? '<span class="pill off">Hidden</span>' : '<span class="pill on">Live</span>'}</h4>
                <p>${c.items.length} dress${c.items.length === 1 ? '' : 'es'} · order ${c.order}${c.description ? ' · ' + esc(c.description.slice(0, 60)) : ''}</p>
              </div>
              <div class="actions">
                <button class="btn sm" data-cup="${esc(c.id)}" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn sm" data-cdown="${esc(c.id)}" ${i === cols.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="btn sm" data-cedit="${esc(c.id)}">Edit</button>
                <button class="btn sm" data-citems="${esc(c.id)}">Dresses</button>
                <button class="btn sm danger" data-cdel="${esc(c.id)}">Delete</button>
              </div>
            </div>`).join('') : '<div class="empty">No collections yet — add your first one.</div>'}
        </div>
      </div>
      <div class="card">
        <h2>Collection page style</h2>
        <p class="hint">How dresses are shown when a customer opens a collection. The client can also switch between circular and grid herself, and choose any of the 13 effects.</p>
        <label class="fld"><span>Default layout</span>
          <select data-set="collectionPage.layout">
            <option value="wheel" ${A.data.settings.collectionPage.layout !== 'grid' ? 'selected' : ''}>Circular wheel</option>
            <option value="grid" ${A.data.settings.collectionPage.layout === 'grid' ? 'selected' : ''}>Grid</option>
          </select>
        </label>
        <label class="fld"><span>Effect when a view opens</span>
          <select data-set="animations.cardTransition">${transOptions((A.data.settings.animations || {}).cardTransition || 'zoom')}</select>
        </label>
        ${saveBtn()}
      </div>`;
  };
  BIND.collections = () => {
    $('#addCol').onclick = () => openColEditor(null);
    onTab(async (e) => {
      const edit = e.target.closest('[data-cedit]');
      if (edit) return openColEditor(edit.dataset.cedit);
      const items = e.target.closest('[data-citems]');
      if (items) { A.itemsCol = items.dataset.citems; A.tab = 'items'; return renderTab('items'); }

      const del = e.target.closest('[data-cdel]');
      if (del) {
        if (!confirm('Delete this collection and all of its dresses? This cannot be undone.')) return;
        await api('/api/admin/collections/' + encodeURIComponent(del.dataset.cdel), { method: 'DELETE' });
        await reload('collections'); toast('Collection deleted');
        return;
      }
      const up = e.target.closest('[data-cup]'), down = e.target.closest('[data-cdown]');
      if (up || down) {
        const id = (up || down).dataset[up ? 'cup' : 'cdown'];
        const ids = A.data.collections.map((c) => c.id);
        const i = ids.indexOf(id);
        const j = up ? i - 1 : i + 1;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api('/api/admin/collections', { method: 'PUT', body: { ids } });
        await reload('collections'); flash();
      }
    });
  };

  function openColEditor(id) {
    const c = id ? A.data.collections.find((x) => x.id === id) : null;
    const box = $('#pickModal');
    box.hidden = false;
    box.innerHTML = `<div class="box">
      <h2>${c ? 'Edit collection' : 'New collection'}</h2>
      <label class="fld"><span>Name (e.g. Barat Wear)</span><input id="cName" value="${esc(c ? c.name : '')}" maxlength="60"></label>
      <label class="fld"><span>Short description (optional)</span><textarea id="cDesc" maxlength="300">${esc(c ? c.description : '')}</textarea></label>
      <div class="row">
        <div>
          <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Box image (home page)</span>
          <div id="cImgWrap">${imgBox(c && c.image, 'collection', 'col.image')}</div>
        </div>
        <div>
          <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Page banner (top of collection)</span>
          <div id="cBanWrap">${imgBox(c && c.banner, 'collection', 'col.banner')}</div>
        </div>
      </div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:14px">Collection video (optional, MP4 / WebM)</span>
      <div id="colVideoWrap" class="actions" style="margin-top:6px"></div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:14px">Collection video (optional, MP4 / WebM)</span>
      <div id="colVideoWrap" class="actions" style="margin-top:6px"></div>
      <label class="switch" style="margin-top:12px"><input type="checkbox" id="cEnabled" ${!c || c.enabled !== false ? 'checked' : ''}><i></i><span>Visible to customers</span></label>
      <div class="actions" style="margin-top:18px">
        <button class="btn gold" id="cSave">Save</button>
        <button class="btn" id="cCancel">Cancel</button>
      </div>
    </div>`;
    let image = (c && c.image) || '';
    let banner = (c && c.banner) || '';

    let colVideo = (c && c.video) || '';
    const paintColVideo = () => {
      const w = $('colVideoWrap');
      if (!w) return;
      w.innerHTML = colVideo
        ? `<video src="${esc(colVideo)}" controls playsinline style="width:200px;border-radius:10px;border:1px solid var(--line)"></video><button class="btn sm danger" id="cvDel">Remove video</button>`
        : `<button class="btn sm" id="cvAdd">Upload video</button>`;
      const a = $('cvAdd');
      if (a) a.onclick = () => pickFile('video', async (f) => { const up = await uploadVideo(f); if (up.length) { colVideo = up[0].url; paintColVideo(); } });
      const d = $('cvDel');
      if (d) d.onclick = () => { colVideo = ''; paintColVideo(); };
    };
    paintColVideo();
    box.querySelector('#cImgWrap').addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-pick]')) pickFile('collection', async (files) => {
        const up = await uploadFiles(files, 'collection');
        if (up.length) { image = up[0].url; $('#cImgWrap').innerHTML = imgBox(image, 'collection', 'col.image'); }
      });
      if (e.target.closest('[data-clear]')) { image = ''; $('#cImgWrap').innerHTML = imgBox('', 'collection', 'col.image'); }
    });
    box.querySelector('#cBanWrap').addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-pick]')) pickFile('poster', async (files) => {
        const up = await uploadFiles(files, 'poster');
        if (up.length) { banner = up[0].url; $('#cBanWrap').innerHTML = imgBox(banner, 'poster', 'col.banner'); }
      });
      if (e.target.closest('[data-clear]')) { banner = ''; $('#cBanWrap').innerHTML = imgBox('', 'poster', 'col.banner'); }
    });

    const close = () => { box.hidden = true; box.innerHTML = ''; };
    box.querySelector('#cCancel').onclick = close;
    box.querySelector('#cSave').onclick = async () => {
      const name = $('#cName').value.trim();
      if (!name) return toast('Name is required');
      const payload = { name, description: $('#cDesc').value.trim(), image, banner, video: colVideo, enabled: $('#cEnabled').checked };
      let res;
      if (c) res = await api('/api/admin/collections/' + encodeURIComponent(c.id), { method: 'PUT', body: payload });
      else res = await api('/api/admin/collections', { method: 'POST', body: payload });
      if (res.ok) { close(); await reload('collections'); flash(); toast('Collection saved'); }
      else toast(res.error || 'Could not save');
    };
  }

  /* --------------------------------- items -------------------------------- */
  VIEWS.items = () => {
    const cols = A.data.collections;
    if (!cols.length) return `<div class="card"><div class="empty">Create a collection first.</div></div>`;
    if (!A.itemsCol || !cols.find((c) => c.id === A.itemsCol)) A.itemsCol = cols[0].id;
    const col = cols.find((c) => c.id === A.itemsCol);
    const items = (col.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    return `
      <div class="card">
        <h2>Dresses &amp; prices</h2>
        <p class="hint">Pick a collection, then add each dress with as many photos as you want, a name and a price. Leave the price empty to show “Contact for pricing”.</p>
        <div class="row">
          <label class="fld"><span>Collection</span>
            <select id="itemsColSel">${cols.map((c) => `<option value="${esc(c.id)}" ${c.id === A.itemsCol ? 'selected' : ''}>${esc(c.name)} (${c.items.length})</option>`).join('')}</select>
          </label>
          <div style="display:flex;align-items:flex-end"><button class="btn gold" id="addItem">+ Add dress to ${esc(col.name)}</button></div>
        </div>
        <div class="divider"></div>
        ${items.length ? items.map((it, i) => `
          <div class="listrow item">
            <img class="sm" src="${esc((it.thumbs && it.thumbs[0]) || it.images[0] || '')}" alt="">
            <div>
              <h4>${esc(it.name)}</h4>
              <p>${it.price ? 'Rs ' + Number(it.price).toLocaleString('en-US') : 'Contact for pricing'} · ${it.images.length} photo${it.images.length === 1 ? '' : 's'} · ${it.views || 0} views</p>
            </div>
            <div class="actions">
              <button class="btn sm" data-iup="${esc(it.id)}" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn sm" data-idown="${esc(it.id)}" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="btn sm" data-iedit="${esc(it.id)}">Edit</button>
              <button class="btn sm danger" data-idel="${esc(it.id)}">Delete</button>
            </div>
          </div>`).join('') : '<div class="empty">No dresses in this collection yet.</div>'}
      </div>`;
  };
  BIND.items = () => {
    $('#itemsColSel').onchange = (e) => { A.itemsCol = e.target.value; renderTab('items'); };
    $('#addItem').onclick = () => openItemEditor(null);
    onTab(async (e) => {
      const t = e.target.closest('[data-iedit],[data-idel],[data-iup],[data-idown]');
      if (!t) return;
      const col = A.data.collections.find((c) => c.id === A.itemsCol);
      const items = (col.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      if (t.dataset.iedit) return openItemEditor(t.dataset.iedit);
      if (t.dataset.idel) {
        if (!confirm('Delete this dress?')) return;
        await api(`/api/admin/collections/${encodeURIComponent(col.id)}/items/${encodeURIComponent(t.dataset.idel)}`, { method: 'DELETE' });
        return reload('items');
      }
      const id = t.dataset.iup || t.dataset.idown;
      const i = items.findIndex((x) => x.id === id);
      const j = t.dataset.iup ? i - 1 : i + 1;
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]];
      await api(`/api/admin/collections/${encodeURIComponent(col.id)}/items`, { method: 'PUT', body: { ids: items.map((x) => x.id) } });
      reload('items'); flash();
    });
  };

  let draftImages = [];
  function openItemEditor(itemId) {
    const col = A.data.collections.find((c) => c.id === A.itemsCol);
    const item = itemId ? (col.items || []).find((x) => x.id === itemId) : null;
    draftImages = item ? item.images.map((u, i) => ({ url: u, thumb: (item.thumbs || [])[i] || u })) : [];
    const box = $('#pickModal');
    box.hidden = false;
    box.innerHTML = `<div class="box">
      <h2>${item ? 'Edit dress' : 'Add dress'} · ${esc(col.name)}</h2>
      <label class="fld"><span>Dress name</span><input id="iName" maxlength="150" value="${esc(item ? item.name : '')}" placeholder="Zohra — Crimson Zardozi Lehenga"></label>
      <div class="row">
        <label class="fld"><span>Price in PKR (leave empty = Contact for pricing)</span><input id="iPrice" type="number" min="0" step="500" value="${item && item.price ? item.price : ''}" placeholder="285000"></label>
        <label class="fld"><span>Description (optional)</span><textarea id="iDesc" maxlength="1000" style="min-height:70px">${esc(item ? item.desc : '')}</textarea></label>
      </div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Photos (first photo is the cover)</span>
      <div class="drop" id="dropItem" style="margin-top:6px">Click or drop multiple photos here</div>
      <div class="thumbs" id="itemThumbs"></div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:14px">Video clip of this dress (optional, MP4 / WebM)</span>
      <div id="itemVideoWrap" class="actions" style="margin-top:6px"></div>
      <div class="actions" style="margin-top:18px">
        <button class="btn gold" id="iSave">Save dress</button>
        <button class="btn" id="iCancel">Cancel</button>
      </div>
    </div>`;

    let draftVideo = (item && item.video) || '';
    const paintVideo = () => {
      const w = box.querySelector('#itemVideoWrap');
      if (!w) return;
      w.innerHTML = draftVideo
        ? `<video src="${esc(draftVideo)}" controls playsinline style="width:180px;border-radius:10px;border:1px solid var(--line)"></video>
           <button class="btn sm danger" id="iVideoDel">Remove video</button>`
        : `<button class="btn sm" id="iVideoAdd">Upload video</button>`;
      const add = box.querySelector('#iVideoAdd');
      if (add) add.onclick = () => pickFile('video', async (files) => {
        const up = await uploadVideo(files);
        if (up.length) { draftVideo = up[0].url; paintVideo(); }
      });
      const del = box.querySelector('#iVideoDel');
      if (del) del.onclick = () => { draftVideo = ''; paintVideo(); };
    };
    const paint = () => {
      paintVideo();
      const t = box.querySelector('#itemThumbs');
      t.innerHTML = draftImages.length ? draftImages.map((f, i) => `
        <div class="thumb">
          <img src="${esc(f.thumb || f.url)}" alt="">
          ${i === 0 ? '<span class="tag">Cover</span>' : ''}
          <div class="bar">
            <button data-mv="up" data-i="${i}">↑</button>
            <button data-mv="down" data-i="${i}">↓</button>
            <button data-mv="del" data-i="${i}">✕</button>
          </div>
        </div>`).join('') : '<div class="empty" style="padding:10px">No photos yet.</div>';
    };
    paint();

    const drop = box.querySelector('#dropItem');
    const add = async (files) => {
      drop.textContent = 'Uploading…';
      const up = await uploadFiles(files, 'dress');
      drop.textContent = 'Click or drop multiple photos here';
      if (up.length) { draftImages = draftImages.concat(up); paint(); }
    };
    drop.onclick = () => pickFile('dress', add);
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) add(e.dataTransfer.files); });

    box.querySelector('#itemThumbs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mv]');
      if (!b) return;
      const i = Number(b.dataset.i);
      if (b.dataset.mv === 'del') draftImages.splice(i, 1);
      if (b.dataset.mv === 'up' && i > 0) draftImages.splice(i - 1, 0, draftImages.splice(i, 1)[0]);
      if (b.dataset.mv === 'down' && i < draftImages.length - 1) draftImages.splice(i + 1, 0, draftImages.splice(i, 1)[0]);
      paint();
    });

    const close = () => { box.hidden = true; box.innerHTML = ''; };
    box.querySelector('#iCancel').onclick = close;
    box.querySelector('#iSave').onclick = async () => {
      const name = box.querySelector('#iName').value.trim();
      if (!name) return toast('Dress name is required');
      if (!draftImages.length) return toast('Add at least one photo');
      const payload = {
        name, desc: box.querySelector('#iDesc').value.trim(),
        price: Number(box.querySelector('#iPrice').value) || 0,
        images: draftImages.map((f) => ({ url: f.url, thumb: f.thumb })),
        video: draftVideo
      };
      const url = item
        ? `/api/admin/collections/${encodeURIComponent(col.id)}/items/${encodeURIComponent(item.id)}`
        : `/api/admin/collections/${encodeURIComponent(col.id)}/items`;
      const res = await api(url, { method: item ? 'PUT' : 'POST', body: payload });
      if (res.ok) { close(); await reload('items'); flash(); toast('Dress saved'); }
      else toast(res.error || 'Could not save');
    };
  }

  /* ------------------------------ home sections ---------------------------- */
  VIEWS.home = () => {
    const st = A.data.settings;
    const hs = st.hotSelling || {};
    const v = st.valuable || {};
    return `
      <div class="card">
        <h2>Notice / offer bar</h2>
        <p class="hint">The gold bar under the logo on the entry page — use it for notices, deals or offers. Turn it off any time.</p>
        ${sw('Show notice bar', 'notice.enabled', st.notice.enabled)}
        ${fld('Notice text', 'notice.text', st.notice.text, { type: 'textarea', max: 300 })}
        ${fld('Optional link (opens when clicked)', 'notice.link', st.notice.link, { placeholder: 'https://…' })}
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>Most-loved section</h2>
        <p class="hint">The rotating wheel of dresses below the collection boxes. Choose what appears there.</p>
        ${sw('Show this section', 'hotSelling.enabled', hs.enabled !== false)}
        <div class="row">
          <label class="fld"><span>What to show</span>
            <select data-set="hotSelling.mode">
              <option value="best" ${hs.mode === 'best' ? 'selected' : ''}>Most viewed / hot selling (auto)</option>
              <option value="first" ${hs.mode === 'first' ? 'selected' : ''}>First dress of every collection</option>
              <option value="collection" ${hs.mode === 'collection' ? 'selected' : ''}>One collection — all its dresses</option>
              <option value="off" ${hs.mode === 'off' ? 'selected' : ''}>Hide the dresses here (section off)</option>
            </select>
          </label>
          <label class="fld"><span>Collection (for the option above)</span>
            <select data-set="hotSelling.collectionId">
              <option value="">—</option>
              ${A.data.collections.map((c) => `<option value="${esc(c.id)}" ${hs.collectionId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </label>
          <label class="fld"><span>Layout</span>
            <select data-set="hotSelling.layout">
              <option value="wheel" ${hs.layout !== 'grid' ? 'selected' : ''}>Circular wheel</option>
              <option value="grid" ${hs.layout === 'grid' ? 'selected' : ''}>Grid</option>
            </select>
          </label>
          <label class="fld"><span>Effect when a view opens</span>
            <select data-set="animations.cardTransition">${transOptions((A.data.settings.animations || {}).cardTransition || 'zoom')}</select>
          </label>
          ${fld('How many dresses', 'hotSelling.limit', hs.limit || 12, { type: 'number', num: true, min: 4 })}
        </div>
        ${fld('Section heading', 'hotSelling.title', hs.title || 'Most Loved This Season')}
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>“Become our valuable customer” popup</h2>
        <p class="hint">Small panel that appears at the top of the entry page. Customers can dismiss it by tapping anywhere; submitted emails/numbers land in your Inbox.</p>
        ${sw('Show the popup', 'valuable.enabled', v.enabled)}
        ${fld('Heading', 'valuable.title', v.title)}
        ${fld('Message (3 lines works best)', 'valuable.text', v.text, { type: 'textarea', max: 400 })}
        ${fld('Delay before it appears (ms)', 'valuable.delayMs', v.delayMs || 3500, { type: 'number', num: true, min: 500 })}
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>Order confirmation message</h2>
        <p class="hint">Shown after a customer places an order.</p>
        ${fld('Thank-you message', 'order.thankYou', st.order.thankYou, { type: 'textarea', max: 400 })}
        ${saveBtn()}
      </div>`;
  };

  /* --------------------------------- inbox -------------------------------- */
  VIEWS.inbox = () => {
    const d = A.data;
    const tabs = [
      ['orders', 'Orders', d.orders.length],
      ['leads', 'Valuable customers', d.leads.length],
      ['complaints', 'Complaints', d.complaints.length],
      ['ratings', 'Ratings', d.ratings.length]
    ];
    const t = A.inboxTab;
    let list = '';
    if (t === 'orders') {
      list = d.orders.length ? d.orders.map((o) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill on">${esc(o.id)}</span><span>${esc(o.name || '—')}</span><span>${esc(o.phone || '')}</span>${o.city ? `<span>${esc(o.city)}</span>` : ''}<span>${new Date(o.createdAt).toLocaleString()}</span></div>
          <div class="body">${o.items.map((i) => `${esc(i.name)} × ${i.qty} — ${i.price ? 'Rs ' + Number(i.price * i.qty).toLocaleString('en-US') : 'price on request'}`).join('<br>')}${o.note ? `<br><br><b>Note:</b> ${esc(o.note)}` : ''}</div>
          <div class="acts">
            <a class="btn sm" href="https://wa.me/${esc(String(o.phone || '').replace(/[^\d]/g, '').replace(/^0/, '92'))}" target="_blank" rel="noopener">WhatsApp customer</a>
            <button class="btn sm danger" data-del="orders" data-id="${esc(o.id)}">Delete</button>
          </div>
        </div>`).join('') : '<div class="empty">No orders yet.</div>';
    } else if (t === 'leads') {
      const nums = d.leads.map((l) => l.contact).filter(Boolean);
      list = (d.leads.length ? `
        <div class="actions" style="margin-bottom:12px">
          <button class="btn sm" id="copyNums">Copy all ${nums.length} contacts</button>
          <button class="btn sm danger" data-clear="leads">Clear list</button>
        </div>` + d.leads.map((l) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill on">${esc(l.type || 'lead')}</span><span>${esc(l.contact)}</span>${l.name ? `<span>${esc(l.name)}</span>` : ''}<span>${new Date(l.createdAt).toLocaleString()}</span></div>
          ${l.message ? `<div class="body">${esc(l.message)}</div>` : ''}
          <div class="acts">
            ${/^[\d+\s-]{6,}$/.test(l.contact || '') ? `<a class="btn sm" href="https://wa.me/${esc(String(l.contact).replace(/[^\d]/g, '').replace(/^0/, '92'))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            <button class="btn sm danger" data-del="leads" data-id="${esc(l.id)}">Delete</button>
          </div>
        </div>`).join('') : '<div class="empty">No valuable-customer signups yet.</div>');
    } else if (t === 'complaints') {
      list = d.complaints.length ? d.complaints.map((c) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill off">Complaint</span><span>${esc(c.name || 'Anonymous')}</span><span>${esc(c.contact || '')}</span><span>${new Date(c.createdAt).toLocaleString()}</span></div>
          <div class="body">${esc(c.message)}</div>
          <div class="acts"><button class="btn sm danger" data-del="complaints" data-id="${esc(c.id)}">Delete</button></div>
        </div>`).join('') : '<div class="empty">No complaints — good sign.</div>';
    } else {
      const avg = d.ratings.length ? (d.ratings.reduce((a, r) => a + (r.stars || 0), 0) / d.ratings.length).toFixed(1) : '—';
      list = d.ratings.length ? `
        <div class="inboxrow" style="margin-bottom:12px"><div class="meta"><span class="pill on">Average ${avg} / 5</span><span>${d.ratings.length} ratings</span></div></div>` +
        d.ratings.map((r) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill on">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span><span>${esc(r.name || 'Anonymous')}</span><span>${new Date(r.createdAt).toLocaleString()}</span></div>
          ${r.message ? `<div class="body">${esc(r.message)}</div>` : ''}
          <div class="acts"><button class="btn sm danger" data-del="ratings" data-id="${esc(r.id)}">Delete</button></div>
        </div>`).join('') : '<div class="empty">No ratings yet.</div>';
    }
    return `
      <div class="card">
        <h2>Inbox</h2>
        <p class="hint">Ratings are private — only you can see them, customers never see ratings on the site.</p>
        <div class="actions" style="margin-bottom:14px">
          ${tabs.map(([k, label, n]) => `<button class="btn sm ${t === k ? 'gold' : ''}" data-inbox="${k}">${label} (${n})</button>`).join('')}
        </div>
        ${list}
      </div>`;
  };
  BIND.inbox = () => {
    onTab(async (e) => {
      const tab = e.target.closest('[data-inbox]');
      if (tab) { A.inboxTab = tab.dataset.inbox; return renderTab('inbox'); }
      const del = e.target.closest('[data-del]');
      if (del) {
        await api(`/api/admin/inbox/${del.dataset.del}/${encodeURIComponent(del.dataset.id)}`, { method: 'DELETE' });
        return reload('inbox');
      }
      const clr = e.target.closest('[data-clear]');
      if (clr) {
        if (!confirm('Clear this whole list?')) return;
        await api('/api/admin/inbox/clear', { method: 'POST', body: { kind: clr.dataset.clear } });
        return reload('inbox');
      }
      const cp = e.target.closest('#copyNums');
      if (cp) {
        const txt = A.data.leads.map((l) => l.contact).filter(Boolean).join(', ');
        try { await navigator.clipboard.writeText(txt); toast('Contacts copied — paste into WhatsApp'); }
        catch (err) { openModalText(txt); }
      }
    });
  };
  function openModalText(txt) {
    const box = $('#pickModal');
    box.hidden = false;
    box.innerHTML = `<div class="box"><h2>Copy these contacts</h2><textarea class="inp" style="min-height:160px">${esc(txt)}</textarea><div class="actions" style="margin-top:12px"><button class="btn gold" id="cmClose">Done</button></div></div>`;
    $('#cmClose').onclick = () => { box.hidden = true; box.innerHTML = ''; };
  }

  /* -------------------------------- look ---------------------------------- */
  VIEWS.look = () => {
    const t = A.data.settings.theme || {};
    const presets = [
      ['#f7f2e8', 'Crystal cream'], ['#ffffff', 'Pure white'], ['#f4f1ec', 'Warm grey'],
      ['#fdf6ea', 'Ivory'], ['#eef3f2', 'Mist'], ['#f6eef4', 'Blush']
    ];
    const darks = [['#08080a', 'Ink black'], ['#121216', 'Soft black'], ['#1b1712', 'Espresso'], ['#0f1418', 'Midnight']];
    return `
      <div class="card">
        <h2>Background colour</h2>
        <p class="hint">The “crystal” light background customers see. The gold logo face stays gold in every theme.</p>
        <div class="swatches">${presets.map(([c, n]) => `<button title="${n}" style="background:${c}" data-bg="${c}"></button>`).join('')}</div>
        <div class="row">
          <div><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Light mode background</span>
            <div class="colorin" style="margin-top:6px"><input type="color" data-set="theme.bgLight" value="${esc(t.bgLight || '#f7f2e8')}"><input class="inp" data-set="theme.bgLight" value="${esc(t.bgLight || '#f7f2e8')}" style="max-width:130px"></div>
          </div>
          <div><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Night mode background</span>
            <div class="colorin" style="margin-top:6px"><input type="color" data-set="theme.bgDark" value="${esc(t.bgDark || '#08080a')}"><input class="inp" data-set="theme.bgDark" value="${esc(t.bgDark || '#08080a')}" style="max-width:130px"></div>
          </div>
        </div>
        <div class="row" style="margin-top:12px">
          <div><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Gold accent</span>
            <div class="colorin" style="margin-top:6px"><input type="color" data-set="theme.gold" value="${esc(t.gold || '#c9a54e')}"><input class="inp" data-set="theme.gold" value="${esc(t.gold || '#c9a54e')}" style="max-width:130px"></div>
          </div>
          <div><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Deep gold</span>
            <div class="colorin" style="margin-top:6px"><input type="color" data-set="theme.goldDeep" value="${esc(t.goldDeep || '#8a6a26')}"><input class="inp" data-set="theme.goldDeep" value="${esc(t.goldDeep || '#8a6a26')}" style="max-width:130px"></div>
          </div>
        </div>
        <div class="switches" style="margin-top:10px"></div>
        <p class="hint" style="margin-top:12px">Night-mode presets:</p>
        <div class="swatches">${darks.map(([c, n]) => `<button title="${n}" style="background:${c}" data-dark="${c}"></button>`).join('')}</div>
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>Brand text &amp; logo</h2>
        <p class="hint">The welcome screen shows these exactly as typed. Upload a new logo if your brand mark changes.</p>
        <div class="row">
          ${fld('Brand name (e.g. Z&Z)', 'brand.name', A.data.settings.brand.name)}
          ${fld('Full name under it', 'brand.fullName', A.data.settings.brand.fullName)}
        </div>
        ${fld('Welcome word', 'brand.welcomeWord', A.data.settings.brand.welcomeWord)}
        ${fld('Tagline (under the logo)', 'brand.tagline', A.data.settings.brand.tagline)}
        <div style="margin-top:10px"><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Logo (transparent PNG works best)</span>
          ${imgBox(A.data.settings.brand.logo, 'logo', 'brand.logo')}
        </div>
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>Currency converter</h2>
        <p class="hint">Prices are entered in PKR. Customers can switch currency from the header — set the conversion rate for each currency you want to offer.</p>
        ${sw('Show currency switcher', 'currency.enabled', A.data.settings.currency.enabled !== false)}
        ${fld('Base currency', 'currency.base', A.data.settings.currency.base || 'PKR')}
        <div class="divider"></div>
        <div id="curRows">
          ${(A.data.settings.currency.list || []).map((c, i) => `
            <div class="row tight cur-row" style="margin-bottom:8px">
              <input class="inp" data-cur="code" data-i="${i}" value="${esc(c.code)}" placeholder="USD">
              <input class="inp" data-cur="symbol" data-i="${i}" value="${esc(c.symbol)}" placeholder="$">
              <input class="inp" data-cur="rate" data-i="${i}" type="number" step="0.0001" value="${c.rate}" placeholder="0.0036">
              <button class="btn sm danger" data-curdel="${i}">✕</button>
            </div>`).join('')}
        </div>
        <div class="actions" style="margin-top:8px"><button class="btn sm" id="curAdd">+ Add currency</button><button class="btn gold" id="curSave">Save currencies</button></div>
      </div>`;
  };
  BIND.look = () => {
    let cur = JSON.parse(JSON.stringify(A.data.settings.currency.list || []));
    const paintCur = () => {
      $('#curRows').innerHTML = cur.map((c, i) => `
        <div class="row tight cur-row" style="margin-bottom:8px">
          <input class="inp" data-cur="code" data-i="${i}" value="${esc(c.code)}" placeholder="USD">
          <input class="inp" data-cur="symbol" data-i="${i}" value="${esc(c.symbol)}" placeholder="$">
          <input class="inp" data-cur="rate" data-i="${i}" type="number" step="0.0001" value="${c.rate}" placeholder="0.0036">
          <button class="btn sm danger" data-curdel="${i}">✕</button>
        </div>`).join('');
    };
    $('#curRows').addEventListener('input', (e) => {
      const el = e.target.closest('[data-cur]');
      if (!el) return;
      const i = Number(el.dataset.i);
      cur[i][el.dataset.cur] = el.dataset.cur === 'rate' ? Number(el.value) || 0 : el.value;
    });
    $('#curRows').addEventListener('click', (e) => {
      const d = e.target.closest('[data-curdel]');
      if (d) { cur.splice(Number(d.dataset.curdel), 1); paintCur(); }
    });
    $('#curAdd').onclick = () => { cur.push({ code: '', symbol: '', rate: 1 }); paintCur(); };
    $('#curSave').onclick = async () => {
      const clean = cur.filter((c) => c.code).map((c) => ({ code: String(c.code).toUpperCase().slice(0, 6), symbol: c.symbol || c.code, rate: Number(c.rate) || 1 }));
      const res = await api('/api/admin/settings', { method: 'PUT', body: { currency: { list: clean } } });
      if (res.ok) { A.data.settings = res.settings; flash(); toast('Currencies saved'); }
    };
    onTab(async (e) => {
      const b = e.target.closest('[data-bg],[data-dark]');
      if (!b) return;
      const isDark = b.hasAttribute('data-dark');
      const val = b.dataset.bg || b.dataset.dark;
      const patch = isDark ? { theme: { bgDark: val } } : { theme: { bgLight: val } };
      const res = await api('/api/admin/settings', { method: 'PUT', body: patch });
      if (res.ok) { A.data.settings = res.settings; renderTab('look'); flash(); toast('Background updated'); }
    });
  };

  /* ------------------------------- contact -------------------------------- */
  VIEWS.contact = () => {
    const c = A.data.settings.contact || {};
    const s = A.data.settings.social || {};
    const nets = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['pinterest', 'Pinterest']];
    return `
      <div class="card">
        <h2>Contact details</h2>
        <p class="hint">The WhatsApp number powers every WhatsApp button on the site (contact section, product page, cart). Use international format if possible, e.g. 923001234567.</p>
        ${fld('WhatsApp number', 'contact.whatsapp', c.whatsapp, { placeholder: '923001234567' })}
        ${fld('Phone (shown on site)', 'contact.phone', c.phone, { placeholder: '0300 1234567' })}
        ${fld('Email', 'contact.email', c.email, { type: 'email', placeholder: 'hello@yourbrand.com' })}
        ${fld('Default WhatsApp message', 'contact.whatsappMessage', c.whatsappMessage, { type: 'textarea', max: 200 })}
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Social media links</h2>
        <p class="hint">Paste only the links you use — the matching icon appears automatically on the site and opens the app directly.</p>
        ${nets.map(([k, label]) => fld(label + ' link', 'social.' + k, s[k], { placeholder: 'https://' + k + '.com/yourpage' })).join('')}
        ${saveBtn()}
      </div>`;
  };

  /* -------------------------------- pages --------------------------------- */
  VIEWS.pages = () => {
    const p = A.data.settings;
    const branches = p.branches || [];
    return `
      <div class="card">
        <h2>About us</h2>
        ${fld('Heading', 'about.heading', p.about.heading)}
        ${fld('Text', 'about.text', p.about.text, { type: 'textarea', max: 1500 })}
        <div style="margin-top:8px"><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">About image (optional)</span>${imgBox(p.about.image, 'about', 'about.image')}</div>
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>Terms &amp; conditions</h2>
        <p class="hint">Write text, upload an image, or both. If both are empty the whole box is hidden from customers — you never get an empty “no image uploaded” block.</p>
        ${fld('Terms text', 'terms.text', p.terms.text, { type: 'textarea', max: 2500 })}
        <div style="margin-top:8px"><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Terms image (optional)</span>${imgBox(p.terms.image, 'terms', 'terms.image')}</div>
        ${saveBtn()}
      </div>

      <div class="card">
        <h2>Branches / addresses</h2>
        <p class="hint">Add as many branches as you like — they appear in the About area.</p>
        <div id="brRows">
          ${branches.map((b, i) => `
            <div class="row tight" style="margin-bottom:8px" data-br="${i}">
              <input class="inp" data-bf="name" data-i="${i}" value="${esc(b.name || '')}" placeholder="Branch name">
              <input class="inp" data-bf="address" data-i="${i}" value="${esc(b.address || '')}" placeholder="Address">
              <input class="inp" data-bf="phone" data-i="${i}" value="${esc(b.phone || '')}" placeholder="Phone">
              <button class="btn sm danger" data-brdel="${i}">✕</button>
            </div>`).join('')}
        </div>
        <div class="actions"><button class="btn sm" id="brAdd">+ Add branch</button><button class="btn gold" id="brSave">Save branches</button></div>
      </div>

      <div class="card">
        <h2>Search engine (SEO)</h2>
        <p class="hint">These drive the Google title, description and keywords. Include what customers actually search: bridal dresses, barat lehenga, walima dress, mehndi wear, party wear.</p>
        ${fld('Page title', 'seo.title', p.seo.title, { max: 120 })}
        ${fld('Meta description', 'seo.description', p.seo.description, { type: 'textarea', max: 320 })}
        ${fld('Keywords', 'seo.keywords', p.seo.keywords, { type: 'textarea', max: 400 })}
        <p class="hint">The sitemap is generated automatically at <b>/sitemap.xml</b>. Submit it once in Google Search Console after you connect your domain.</p>
        ${saveBtn()}
      </div>`;
  };
  BIND.pages = () => {
    let br = JSON.parse(JSON.stringify(A.data.settings.branches || []));
    const paint = () => {
      $('#brRows').innerHTML = br.map((b, i) => `
        <div class="row tight" style="margin-bottom:8px" data-br="${i}">
          <input class="inp" data-bf="name" data-i="${i}" value="${esc(b.name || '')}" placeholder="Branch name">
          <input class="inp" data-bf="address" data-i="${i}" value="${esc(b.address || '')}" placeholder="Address">
          <input class="inp" data-bf="phone" data-i="${i}" value="${esc(b.phone || '')}" placeholder="Phone">
          <button class="btn sm danger" data-brdel="${i}">✕</button>
        </div>`).join('');
    };
    $('#brRows').addEventListener('input', (e) => {
      const el = e.target.closest('[data-bf]');
      if (!el) return;
      br[Number(el.dataset.i)][el.dataset.bf] = el.value;
    });
    $('#brRows').addEventListener('click', (e) => {
      const d = e.target.closest('[data-brdel]');
      if (d) { br.splice(Number(d.dataset.brdel), 1); paint(); }
    });
    $('#brAdd').onclick = () => { br.push({ name: '', address: '', phone: '' }); paint(); };
    $('#brSave').onclick = async () => {
      const clean = br.filter((b) => b.name || b.address).map((b) => ({ id: 'b' + Math.random().toString(36).slice(2, 7), name: b.name, address: b.address, phone: b.phone }));
      const res = await api('/api/admin/settings', { method: 'PUT', body: { branches: clean } });
      if (res.ok) { A.data.settings = res.settings; flash(); toast('Branches saved'); }
    };
  };

  /* ------------------------------- security -------------------------------- */
  VIEWS.security = () => `
    <div class="card">
      <h2>Change your login credentials</h2>
      <p class="hint">Aap apni details yahan badal sakte hain. Save ke baad dobara login karna hoga.</p>
      <label class="fld"><span>Current password *</span><input id="secCur" type="password" autocomplete="current-password"></label>
      <div class="row">
        <label class="fld"><span>New username</span><input id="secUser" value="${esc(A.data.username)}" maxlength="40" autocomplete="username"></label>
        <label class="fld"><span>New password (min 6 chars)</span><input id="secPass" type="password" autocomplete="new-password" placeholder="Leave empty to keep"></label>
        <label class="fld"><span>New 4-digit PIN</span><input id="secPin" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="Leave empty to keep"></label>
      </div>
      <div class="actions"><button class="btn gold" id="secSave">Update credentials</button></div>
      <div class="msg" id="secMsg"></div>
    </div>
    <div class="card">
      <h2>Safety notes</h2>
      <p class="hint">• The admin page is never linked from the customer menus — only you know the address <b>/admin</b>.<br>
      • Login attempts are throttled after 6 wrong tries.<br>
      • Sessions expire after 12 hours.<br>
      • Keep a copy of your username, password and PIN somewhere safe — we cannot recover them for you.</p>
    </div>`;
  BIND.security = () => {
    $('#secSave').onclick = async () => {
      const msg = $('#secMsg');
      const cur = $('#secCur').value;
      const pin = $('#secPin').value.trim();
      if (!cur) { msg.className = 'msg err'; msg.textContent = 'Enter your current password.'; return; }
      if (pin && !/^\d{4}$/.test(pin)) { msg.className = 'msg err'; msg.textContent = 'PIN must be exactly 4 digits.'; return; }
      const body = { currentPassword: cur, username: $('#secUser').value.trim() };
      if ($('#secPass').value) body.password = $('#secPass').value;
      if (pin) body.pin = pin;
      msg.className = 'msg'; msg.textContent = 'Saving…';
      const res = await api('/api/admin/credentials', { method: 'POST', body });
      if (res.ok) {
        msg.className = 'msg ok';
        msg.textContent = res.message;
        setTimeout(() => { showLogin(); $('#lgUser').value = body.username; }, 1400);
      } else { msg.className = 'msg err'; msg.textContent = res.error || 'Could not update.'; }
    };
  };

  /* -------------------------------- boot ---------------------------------- */
  (async function init() {
    const s = await api('/api/admin/session').catch(() => ({ ok: false }));
    if (s.ok) boot2(); else showLogin();
  })();
})();
