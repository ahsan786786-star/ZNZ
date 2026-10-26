/* ==========================================================================
   Z&Z — OWNER panel
   Full control: everything the admin can do, PLUS admin credentials, access
   permissions, entrance wallpapers, layout/motion, client try-on photos.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = { data: null, tab: 'dashboard', inboxTab: 'orders', itemsCol: null };

  const TITLES = {
    dashboard: 'Owner dashboard', admin: 'Admin control', access: 'Access & privacy',
    wallpapers: 'Entrance wallpapers', ads: 'Advertisements', live: 'Live visitors',
    motion: 'Layout & motion', posters: 'Posters & hero',
    collections: 'Collections', items: 'Dresses & prices', home: 'Home sections',
    looks: 'Try-on photos & backgrounds', inbox: 'All customer data', look: 'Try-on page setup',
    contact: 'Contact & social', pages: 'About / Terms / SEO', security: 'Owner security',
    backup: 'Backup & restore'
  };

  async function api(url, opts) {
    const o = Object.assign({ headers: {} }, opts || {});
    if (o.body && !(o.body instanceof FormData)) {
      o.headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(o.body);
    }
    const r = await fetch(url, o);
    let j = {};
    try { j = await r.json(); } catch (e) {}
    if (r.status === 401 || r.status === 403) { if (r.status === 401) showLogin(); }
    return j;
  }
  function toast(m) {
    const t = $('#toast'); t.textContent = m; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function flash() {
    const s = $('#savedFlag'); s.textContent = 'Saved ✓'; s.classList.add('on');
    clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('on'), 1800);
  }
  function setPath(obj, path, val) {
    const parts = path.split('.'); let cur = obj;
    parts.forEach((p, i) => { if (i === parts.length - 1) cur[p] = val; else { if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {}; cur = cur[p]; } });
    return obj;
  }

  /* -------------------------------- login --------------------------------- */
  function showLogin() { $('#panel').hidden = true; $('#loginScreen').hidden = false; }
  function showPanel() { $('#loginScreen').hidden = true; $('#panel').hidden = false; }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#lgMsg'), btn = $('#lgBtn');
    btn.disabled = true; msg.className = 'msg'; msg.textContent = 'Checking…';
    const res = await api('/api/admin/login', {
      method: 'POST',
      body: { username: $('#lgUser').value.trim(), password: $('#lgPass').value, pin: $('#lgPin').value.trim(), role: 'owner' }
    }).catch(() => ({ ok: false, error: 'Network error' }));
    btn.disabled = false;
    if (res.ok && res.role === 'owner') { msg.textContent = ''; boot(); }
    else { msg.className = 'msg err'; msg.textContent = res.error || 'Owner login failed.'; }
  });

  $('#logoutBtn').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); showLogin(); });

  /* ------------------------------ bootstrap -------------------------------- */
  async function boot() {
    const res = await api('/api/owner/data');
    if (!res.ok) return showLogin();
    A.data = res.data;
    showPanel();
    $('#who').textContent = 'Owner · ' + A.data.username;
    startLivePolling();
    if (!A.itemsCol && A.data.collections.length) A.itemsCol = A.data.collections[0].id;
    renderTab(A.tab);
  }
  async function reload(tab) {
    const res = await api('/api/owner/data');
    if (res.ok) { A.data = res.data; renderTab(tab || A.tab); }
  }

  /* ------------------------------ tab routing ------------------------------ */
  $('#sideNav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    A.tab = b.dataset.tab;
    $('.side').classList.remove('open');
    renderTab(A.tab);
  });
  $('#sideToggle').addEventListener('click', () => $('.side').classList.toggle('open'));

  function renderTab(tab) {
    A.tab = tab;
    $('#tabTitle').textContent = TITLES[tab] || tab;
    $$('#sideNav button').forEach((x) => x.classList.toggle('on', x.dataset.tab === tab));
    $('#tabBody').innerHTML = (VIEWS[tab] || VIEWS.dashboard)();
    if (BIND[tab]) BIND[tab]();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------ ui helpers ------------------------------- */
  function fld(label, path, value, opts) {
    const o = opts || {};
    if (o.type === 'textarea') return `<label class="fld"><span>${esc(label)}</span><textarea data-set="${path}" ${o.max ? `maxlength="${o.max}"` : ''} ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''}>${esc(value || '')}</textarea></label>`;
    return `<label class="fld"><span>${esc(label)}</span><input data-set="${path}" ${o.num ? 'data-type="num"' : ''} type="${o.type || 'text'}" value="${esc(value == null ? '' : value)}" ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''}></label>`;
  }
  function sel(label, path, value, options) {
    return `<label class="fld"><span>${esc(label)}</span><select data-set="${path}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(value) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  }
  function sw(label, path, checked) {
    return `<label class="switch"><input type="checkbox" data-set="${path}" data-type="bool" ${checked ? 'checked' : ''}><i></i><span>${esc(label)}</span></label>`;
  }
  const saveBtn = (l) => `<div class="actions" style="margin-top:14px"><button class="btn gold" data-save>${esc(l || 'Save changes')}</button></div>`;
  function imgBox(url, kind, path) {
    return `<div class="actions" style="margin-top:6px;align-items:flex-start;gap:12px">
      ${url ? `<img src="${esc(url)}" alt="" style="width:104px;height:126px;object-fit:cover;border-radius:10px;border:1px solid var(--line)">` : `<div style="width:104px;height:126px;border-radius:10px;border:1px dashed var(--line);display:grid;place-items:center;font-size:10px;color:var(--ink-3);text-align:center">No image</div>`}
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn sm" data-pick="${kind}" data-target="${path}">${url ? 'Change image' : 'Upload image'}</button>
        ${url ? `<button class="btn sm danger" data-clear="${path}">Remove</button>` : ''}
      </div></div>`;
  }

  /* generic save / clear / pick */
  document.addEventListener('click', async (e) => {
    const save = e.target.closest('[data-save]');
    if (save) {
      const card = save.closest('.card') || document;
      const patch = {};
      card.querySelectorAll('[data-set]').forEach((el) => {
        let v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.dataset.type === 'num') v = Number(String(v).replace(/[^\d.\-]/g, '')) || 0;
        if (el.dataset.type === 'bool') v = !!v;
        setPath(patch, el.dataset.set, v);
      });
      save.disabled = true;
      const res = await api('/api/admin/settings', { method: 'PUT', body: patch });
      save.disabled = false;
      if (res.ok) { A.data.settings = res.settings; flash(); toast('Saved'); }
      else toast(res.error || 'Could not save');
      return;
    }
    const clear = e.target.closest('[data-clear]');
    if (clear) {
      await api('/api/admin/settings', { method: 'PUT', body: setPath({}, clear.dataset.clear, '') });
      await reload(); flash(); return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      pickFile(pick.dataset.pick, async (files) => {
        const up = await uploadFiles(files, pick.dataset.pick);
        if (!up.length) return toast('Upload failed');
        const res = await api('/api/admin/settings', { method: 'PUT', body: setPath({}, pick.dataset.target, up[0].url) });
        if (res.ok) { A.data.settings = res.settings; await reload(); flash(); }
      });
    }
  });

  /* ------------------------------- uploads --------------------------------- */
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
  function pickFile(kind, cb) { fileCb = cb; $('#hiddenFile').click(); }
  $('#hiddenFile').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files && files.length && fileCb) await fileCb(files);
    e.target.value = ''; fileCb = null;
  });

  let tabHandler = null;
  function onTab(fn) {
    const body = $('#tabBody');
    if (tabHandler) body.removeEventListener('click', tabHandler);
    tabHandler = async (e) => { try { await fn(e); } catch (err) { console.error(err); toast('Something went wrong'); } };
    body.addEventListener('click', tabHandler);
  }

  const VIEWS = {};
  const BIND = {};

  /* ------------------------------- dashboard ------------------------------- */
  VIEWS.dashboard = () => {
    const s = A.data.stats;
    return `
      <div class="stats">
        <div class="stat"><span>Dresses</span><b>${s.items}</b></div>
        <div class="stat"><span>Collections</span><b>${s.collections}</b></div>
        <div class="stat"><span>Views</span><b>${s.views}</b></div>
        <div class="stat"><span>Orders</span><b>${s.orders}</b></div>
        <div class="stat"><span>VIP leads</span><b>${s.leads}</b></div>
        <div class="stat"><span>Live now</span><b id="liveBadge">—</b></div>
        <div class="stat"><span>Client photos</span><b>${s.looks}</b></div>
        <div class="stat"><span>Complaints</span><b>${s.complaints}</b></div>
      </div>
      <div class="card owner-card">
        <h2>Owner privileges</h2>
        <p class="hint">Aap ke paas admin se ziada rights hain:</p>
        <ul style="font-size:13px;color:var(--ink-2);line-height:1.8;margin:8px 0 0 18px;padding:0">
          <li>Admin ka username / password / PIN set ya reset karna</li>
          <li>Admin ko kisi bhi section ka access dena ya band karna</li>
          <li>Client photos admin ko dikhein ya na dikhein — faisla aap ka</li>
          <li>Entrance wallpapers (${A.data.settings.theme.wallpapers.length} templates) aur logo/bubble motion</li>
          <li>Apne adverts (poster / video) seedha website par lagana</li>
          <li>Real-time: kitne log abhi site par hain, kaunsa page khol rahe hain</li>
          <li>Customer ka poora data: orders, leads, complaints, ratings, photos</li>
        </ul>
        <div class="actions" style="margin-top:14px">
          <button class="btn gold sm" data-goto="admin">Admin control</button>
          <button class="btn sm" data-goto="wallpapers">Wallpapers</button>
          <button class="btn sm" data-goto="looks">Client photos</button>
        </div>
      </div>
      <div class="card">
        <h2>Latest orders</h2>
        ${A.data.orders.length ? A.data.orders.slice(0, 5).map((o) => `
          <div class="inboxrow" style="margin-bottom:8px">
            <div class="meta"><span class="pill on">${esc(o.id)}</span><span>${esc(o.name || '—')}</span><span>${esc(o.phone || '')}</span><span>${new Date(o.createdAt).toLocaleString()}</span></div>
            <div class="body">${o.items.map((i) => esc(i.name) + ' ×' + i.qty).join('<br>')}</div>
          </div>`).join('') : '<div class="empty">No orders yet.</div>'}
      </div>`;
  };
  BIND.dashboard = () => { $$('[data-goto]').forEach((b) => (b.onclick = () => renderTab(b.dataset.goto))); };

  /* ------------------------------ admin control ---------------------------- */
  VIEWS.admin = () => `
    <div class="card owner-card">
      <h2>Admin login</h2>
      <p class="hint">Ye woh details hain jo admin panel (/admin) par chalti hain. Sirf aap inhein badal sakte hain — admin khud nahi badal sakta.</p>
      <div class="row">
        <label class="fld"><span>Admin username</span><input id="adUser" value="${esc(A.data.adminUsername)}" maxlength="60"></label>
        <label class="fld"><span>New password (khaali chhorein to same rahega)</span><input id="adPass" type="password" placeholder="min 6 characters" autocomplete="new-password"></label>
        <label class="fld"><span>New 4-digit PIN</span><input id="adPin" maxlength="4" placeholder="2026"></label>
      </div>
      <label class="fld"><span>Your owner password (confirm karne ke liye)</span><input id="adOwnerPass" type="password" autocomplete="current-password"></label>
      <div class="actions"><button class="btn gold" id="adSave">Update admin login</button></div>
      <div class="msg" id="adMsg"></div>
      <p class="hint" style="margin-top:14px">Default admin login: <b>admin</b> / <b>ZnZ2026</b> (ya <b>znz2026</b>) / PIN <b>2026</b></p>
    </div>
    <div class="card">
      <h2>What the admin may touch</h2>
      <p class="hint">Tick only what you want the admin to control. Unticked sections disappear from the admin panel (aap ke paas sab kuch rahega).</p>
      ${[
        ['adminCanPosters', 'Posters & hero images'],
        ['adminCanCollections', 'Collections (add / rename / delete)'],
        ['adminCanItems', 'Dresses, photos & prices'],
        ['adminCanHome', 'Home sections (notice, wheel, popup)'],
        ['adminCanLook', 'Check-your-look settings'],
        ['adminCanContact', 'Contact & social links'],
        ['adminCanPages', 'About / Terms / SEO'],
        ['adminCanInbox', 'Customer inbox (orders, leads, complaints)'],
        ['adminCanSecurity', 'Own username / password / PIN change'],
        ['adminCanWallpapers', 'Entrance wallpapers'],
        ['adminCanAds', 'Advertisements']
      ].map(([k, l]) => `<div class="perm">${sw(l, 'permissions.' + k, A.data.settings.permissions[k])}</div>`).join('')}
      ${saveBtn('Save permissions')}
      <p class="hint" style="margin-top:10px">Note: permissions are enforced in the admin panel UI. The owner panel is never restricted.</p>
    </div>`;

  BIND.admin = () => {
    $('#adSave').onclick = async () => {
      const msg = $('#adMsg');
      const body = {
        target: 'admin',
        currentPassword: $('#adOwnerPass').value,
        username: $('#adUser').value.trim()
      };
      const pass = $('#adPass').value, pin = $('#adPin').value.trim();
      if (pass) body.password = pass;
      if (pin) {
        if (!/^\d{4}$/.test(pin)) { msg.className = 'msg err'; msg.textContent = 'PIN must be 4 digits.'; return; }
        body.pin = pin;
      }
      if (!body.currentPassword) { msg.className = 'msg err'; msg.textContent = 'Enter your owner password.'; return; }
      const res = await api('/api/admin/credentials', { method: 'POST', body });
      if (res.ok) { msg.className = 'msg ok'; msg.textContent = 'Admin login updated.'; await reload('admin'); }
      else { msg.className = 'msg err'; msg.textContent = res.error || 'Could not update.'; }
    };
  };

  /* ------------------------------- access --------------------------------- */
  VIEWS.access = () => `
    <div class="card owner-card">
      <h2>Customer privacy</h2>
      <p class="hint">Jab customer “Check Your Look” mein apni photo upload karta hai, woh owner (aap) ko hamesha dikhti hai. Aap decide karein ke admin ko bhi dikhe ya nahi.</p>
      ${sw('Admin can see client try-on photos', 'permissions.adminSeesCustomerPhotos', A.data.settings.permissions.adminSeesCustomerPhotos)}
      ${saveBtn('Save')}
    </div>
    <div class="card">
      <h2>Entrance visibility</h2>
      <p class="hint">Customer ki entry screen par kya kya nazar aaye.</p>
      <div class="row">
        ${sw('Welcome word (Welcome)', 'welcome.showWord', (A.data.settings.welcome || {}).showWord !== false)}
        ${sw('Bubbles animation', 'bubbles.enabled', (A.data.settings.bubbles || {}).enabled !== false)}
        ${sw('Currency switcher', 'currency.enabled', A.data.settings.currency.enabled !== false)}
        ${sw('Notice / offers bar', 'notice.enabled', A.data.settings.notice.enabled)}
        ${sw('Most-loved section', 'hotSelling.enabled', A.data.settings.hotSelling.enabled !== false)}
        ${sw('Valuable-customer popup', 'valuable.enabled', A.data.settings.valuable.enabled)}
        ${sw('Check Your Look page', 'look.enabled', (A.data.settings.look || {}).enabled !== false)}
        ${sw('Adverts on the website', 'ads.enabled', (A.data.settings.ads || {}).enabled !== false)}
        ${sw('Live currency rates', 'currency.live', A.data.settings.currency.live !== false)}
      </div>
      ${saveBtn('Save visibility')}
    </div>`;

  /* ------------------------------ wallpapers ------------------------------- */
  VIEWS.wallpapers = () => {
    const t = A.data.settings.theme || {};
    const wps = t.wallpapers || [];
    return `
      <div class="card owner-card">
        <h2>Entrance wallpapers</h2>
        <p class="hint">Welcome / entrance screen ka background. Bubbles har wallpaper ke saath chalte rahenge. Poora template aap chun sakte hain — admin sirf tab badal sakta hai jab aap ijazat dein.</p>
        <div class="wp-grid" id="wpGrid">
          ${wps.map((w) => `
            <div class="wp ${t.activeWallpaper === w.id ? 'on' : ''}" data-wp="${esc(w.id)}">
              <i style="${w.mode === 'image' ? `background:url('${esc(w.url)}') center/cover` : `background:${esc(w.css)}`}"></i>
              <span>${esc(w.name)}</span>
            </div>`).join('')}
        </div>
        <div class="actions" style="margin-top:14px">
          <button class="btn sm" data-addwp>+ Upload custom wallpaper</button>
          <button class="btn sm danger" data-delwp>Delete selected</button>
        </div>
      </div>`;
  };
  BIND.wallpapers = () => {
    onTab(async (e) => {
      const wp = e.target.closest('[data-wp]');
      if (wp) {
        await api('/api/admin/wallpapers', { method: 'PUT', body: { activeWallpaper: wp.dataset.wp } });
        await reload('wallpapers'); toast('Wallpaper applied');
      }
      const add = e.target.closest('[data-addwp]');
      if (add) {
        pickFile('poster', async (files) => {
          const up = await uploadFiles(files, 'poster');
          if (!up.length) return;
          const wps = (A.data.settings.theme.wallpapers || []).concat([{
            id: 'w' + Date.now().toString(36), name: 'Custom ' + (A.data.settings.theme.wallpapers.length + 1),
            mode: 'image', url: up[0].url
          }]);
          await api('/api/admin/wallpapers', { method: 'PUT', body: { wallpapers: wps } });
          await reload('wallpapers'); flash(); toast('Wallpaper added');
        });
      }
      const del = e.target.closest('[data-delwp]');
      if (del) {
        const cur = A.data.settings.theme.activeWallpaper;
        if (!confirm('Delete the selected wallpaper?')) return;
        const wps = (A.data.settings.theme.wallpapers || []).filter((w) => w.id !== cur);
        await api('/api/admin/wallpapers', { method: 'PUT', body: { wallpapers: wps, activeWallpaper: (wps[0] || {}).id || '' } });
        await reload('wallpapers'); flash();
      }
    });
  };

  /* ------------------------------- motion ---------------------------------- */
  VIEWS.motion = () => {
    const a = A.data.settings.animations || {};
    const L = A.data.settings.layout || {};
    const B = A.data.settings.bubbles || {};
    const G = A.data.settings.bgfx || {};
    const trans = [
      ['fade', 'Fade'], ['slide', 'Slide (left / right)'], ['zoom', 'Zoom / scale'],
      ['cube', 'Cube rotation'], ['flip', 'Card flip'], ['coverflow', 'Cover flow / stack'],
      ['curl', 'Page curl / flip'], ['bounce', 'Bounce / elastic'], ['accordion', 'Accordion'],
      ['parallax', 'Parallax'], ['morph', 'Morphing'], ['stack', 'Stacked cards'],
      ['rotate', 'Slow spin']
    ];
    return `
      <div class="card owner-card">
        <h2>Layout</h2>
        <p class="hint">Aap tay karein — collection page aur home ke “most loved” par <b>circular wheel</b> ya <b>grid</b>,
        aur neeche se <b>13 transitions</b> mein se koi bhi effect. <b>Customer ko koi option nahi dikhta</b> —
        site hamesha aap ki chuni hui layout par chalti hai (jo cheez badalni ho, yahin se badal dein).</p>
        <div class="row">
          ${sel('Home “most loved” layout', 'layout.homeLoved', L.homeLoved || 'grid', [['grid', 'Grid'], ['wheel', 'Circular wheel']])}
          ${sel('Collection page layout', 'layout.collectionPage', L.collectionPage || 'grid', [['grid', 'Grid'], ['wheel', 'Circular wheel']])}
          ${sel('Wheel style', 'animations.wheelStyle', a.wheelStyle || 'arc', [['arc', 'Arc (curved row)'], ['circle', 'Full circle loop'], ['half', 'Half circle (left / right)']])}
        </div>
        ${saveBtn('Save layout')}
      </div>
      <div class="card">
        <h2>Motion / transitions</h2>
        <p class="hint">Cards aur page change hone ka effect. Sab effects CSS-based hain — website tez rehti hai.</p>
        <div class="row">
          ${sel('Logo motion', 'animations.logo', a.logo || 'spin', [['spin', 'Continuous turn — always front-facing (like the clip)'], ['soft', 'Gentle left-right swing'], ['float', 'Float + slight turn'], ['none', 'No motion']])}
          ${sel('Card / grid transition', 'animations.cardTransition', a.cardTransition || 'zoom', trans)}
          ${sel('Entrance button transition', 'animations.transition', a.transition || 'fade', trans)}
          ${fld('One full logo turn (seconds) — 9 matches the reference clip', 'animations.logoSeconds', a.logoSeconds || 9, { type: 'number', num: true })}
        </div>
        ${saveBtn('Save motion')}
      </div>
      <div class="card owner-card">
        <h2>Storefront background — bubbles / stars</h2>
        <p class="hint">Welcome ke baad jo asli website hai (posters, collections, dresses) — us ke <b>peechay</b> halki si
        chamak chalti rahegi. Ye cheezein <b>kisi box, poster ya dress ke ooper nahi aatin</b>: canvas content ke neeche hai,
        is liye tasveer unhe dhak leti hai. Sirf khali background mein nazar aati hain.</p>
        <div class="row">
          ${sel('Kya chalein', 'bgfx.mode', G.mode || 'bubbles', [['off', 'Kuch nahi — saaf background'], ['bubbles', 'Bubbles (soft gold)'], ['stars', 'Stars (chhoti chamak)'], ['both', 'Dono — bubbles + stars']])}
          ${fld('Kitne (kam rakhein: 6–20)', 'bgfx.count', G.count == null ? 16 : G.count, { type: 'number', num: true })}
          ${sel('Raftaar', 'bgfx.speed', String(G.speed || 1), [['0.5', 'Bohat dheemi'], ['0.8', 'Dheemi'], ['1', 'Normal'], ['1.5', 'Tez'], ['2', 'Bohat tez']])}
          ${sel('Chamak (opacity)', 'bgfx.opacity', String(G.opacity == null ? 0.55 : G.opacity), [['0.3', 'Halki'], ['0.55', 'Normal'], ['0.8', 'Wazeh'], ['1', 'Poori']])}
        </div>
        <p class="hint" style="margin-top:8px">Tip: default <b>16 bubbles / halki chamak</b> sab se khoobsurat lagta hai aur slow phone par bhi asar nahi daalta.
        Jo log “reduced motion” on rakhte hain, unke liye ye khud band rehta hai.</p>
        ${saveBtn('Save background')}
      </div>
      <div class="card owner-card">
        <h2>Welcome bubbles &amp; glitter</h2>
        <p class="hint">Welcome screen ke background bubbles — raftaar, quality aur burst hone par nikalne wala glitter sab aap ke haath me hai. Ye sirf welcome page par chalta hai.</p>
        <div class="row">
          ${fld('How many bubbles', 'bubbles.count', B.count || 38, { type: 'number', num: true })}
          ${sel('Bubble speed', 'bubbles.speed', B.speed || 1, [['0.5', 'Slow — dreamy'], ['0.8', 'Gentle'], ['1', 'Normal'], ['1.5', 'Lively'], ['2', 'Fast']])}
          ${sel('Quality', 'bubbles.quality', B.quality || 'high', [['low', 'Low — lightest, best for slow phones'], ['medium', 'Medium — balanced'], ['high', 'High — sharpest sparkle']])}
        </div>
        <div class="divider"></div>
        <h3 style="font-size:16px;margin:0 0 6px">Glitter on burst</h3>
        <p class="hint">Bubble phatne par us ke andar se <b>bareek sunehri glitter ka blast</b> nikalta hai — hazaaron chhoti chamak rays ki tarah phailti hain, phir neeche baarish ki tarah girti hain, screen ke lower hisse par baith kar kuch second chamakti hain aur ghul jati hain. Logo / text ke ooper aane par woh halki ho jati hain takay likhai clear rahe.</p>
        <div class="row">
          ${sw('Glitter particles', 'bubbles.glitter', B.glitter !== false)}
          ${fld('Fine specks per burst (100–600)', 'bubbles.glitterAmount', B.glitterAmount == null ? 260 : B.glitterAmount, { type: 'number', num: true })}
          ${sel('Glitter fall', 'bubbles.glitterFall', B.glitterFall || 1, [['0.6', 'Float gently'], ['1', 'Natural'], ['1.6', 'Heavier']])}
        </div>
        <div class="row">
          ${sw('Denser on the sides', 'bubbles.sideBias', B.sideBias !== false)}
          ${sw('Burst on screen change', 'bubbles.burst', B.burst !== false)}
        </div>
        ${saveBtn('Save bubbles')}
      </div>
      <div class="card">
        <h2>Welcome screen text</h2>
        <div class="row">
          ${fld('Welcome word', 'brand.welcomeWord', A.data.settings.brand.welcomeWord)}
          ${fld('Brand name (gold)', 'brand.name', A.data.settings.brand.name)}
          ${fld('Tagline', 'brand.tagline', A.data.settings.brand.tagline)}
          ${fld('Full name under logo', 'brand.fullName', A.data.settings.brand.fullName)}
          ${fld('Logo size on entrance (%)', 'brand.welcomeSize', A.data.settings.brand.welcomeSize || 62, { type: 'number', num: true })}
        </div>
        ${saveBtn()}
      </div>`;
  };

  /* ------------------------------- posters --------------------------------- */
  VIEWS.posters = () => {
    const h = A.data.settings.hero || {};
    const posters = h.posters || [];
    return `
      <div class="card owner-card">
        <h2>Hero posters</h2>
        <p class="hint">Home page ka bara poster. Jitne chahein add karein — 3 second par auto-rotate.</p>
        <div class="drop" id="dropPoster">Click or drop images here</div>
        <div class="thumbs" id="posterThumbs">
          ${posters.map((p, i) => `<div class="thumb"><img src="${esc(p.url)}" alt=""><span class="tag">${i + 1}</span>
            <div class="bar"><button data-po="up" data-id="${esc(p.id)}">↑</button><button data-po="down" data-id="${esc(p.id)}">↓</button><button data-po="del" data-id="${esc(p.id)}">✕</button></div></div>`).join('') || '<div class="empty">No posters yet.</div>'}
        </div>
      </div>
      <div class="card">
        <h2>Rotation</h2>
        <div class="row">
          ${sw('Auto rotate', 'hero.autoplay', h.autoplay !== false)}
          ${fld('Seconds per poster', 'hero.intervalSec', h.intervalSec || 3, { type: 'number', num: true })}
        </div>
        ${saveBtn()}
      </div>`;
  };
  BIND.posters = () => {
    const drop = $('#dropPoster');
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
    onTab(async (e) => {
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
  VIEWS.collections = () => `
    <div class="card owner-card">
      <h2>Collections</h2>
      <p class="hint">Album ka cover image aap khud lagate hain — koi bhi dress apne aap cover nahi banti.</p>
      <button class="btn gold sm" id="addCol">+ Add collection</button>
      <div style="margin-top:12px">
        ${A.data.collections.map((c, i) => `
          <div class="listrow col">
            ${c.image ? `<img class="sm" src="${esc(c.image)}" alt="">` : '<div style="width:56px;height:68px;border:1px dashed var(--line);border-radius:8px"></div>'}
            <div><h4>${esc(c.name)} ${c.enabled === false ? '<span class="pill off">Hidden</span>' : '<span class="pill on">Live</span>'}</h4>
              <p>${c.items.length} dresses · order ${c.order}</p></div>
            <div class="actions">
              <button class="btn sm" data-cup="${esc(c.id)}" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn sm" data-cdown="${esc(c.id)}" ${i === A.data.collections.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="btn sm" data-cedit="${esc(c.id)}">Edit</button>
              <button class="btn sm" data-citems="${esc(c.id)}">Dresses</button>
              <button class="btn sm danger" data-cdel="${esc(c.id)}">Delete</button>
            </div>
          </div>`).join('') || '<div class="empty">No collections yet.</div>'}
      </div>
    </div>`;
  BIND.collections = () => {
    $('#addCol').onclick = () => colEditor(null);
    onTab(async (e) => {
      const edit = e.target.closest('[data-cedit]'); if (edit) return colEditor(edit.dataset.cedit);
      const items = e.target.closest('[data-citems]'); if (items) { A.itemsCol = items.dataset.citems; return renderTab('items'); }
      const del = e.target.closest('[data-cdel]');
      if (del) {
        if (!confirm('Delete this collection and all of its dresses?')) return;
        await api('/api/admin/collections/' + encodeURIComponent(del.dataset.cdel), { method: 'DELETE' });
        return reload('collections');
      }
      const up = e.target.closest('[data-cup]'), down = e.target.closest('[data-cdown]');
      if (up || down) {
        const id = (up || down).dataset[up ? 'cup' : 'cdown'];
        const ids = A.data.collections.map((c) => c.id);
        const i = ids.indexOf(id), j = up ? i - 1 : i + 1;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api('/api/admin/collections', { method: 'PUT', body: { ids } });
        reload('collections'); flash();
      }
    });
  };

  function colEditor(id) {
    const c = id ? A.data.collections.find((x) => x.id === id) : null;
    const box = $('#pickModal');
    box.hidden = false;
    box.innerHTML = `<div class="box">
      <h2>${c ? 'Edit collection' : 'New collection'}</h2>
      <label class="fld"><span>Name</span><input id="cName" value="${esc(c ? c.name : '')}" maxlength="60"></label>
      <label class="fld"><span>Short description</span><textarea id="cDesc" maxlength="300">${esc(c ? c.description : '')}</textarea></label>
      <div class="row">
        <div><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Album cover (home box)</span><div id="cImgWrap">${imgBox(c && c.image, 'collection', 'col.image')}</div></div>
        <div><span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Page banner</span><div id="cBanWrap">${imgBox(c && c.banner, 'collection', 'col.banner')}</div></div>
      </div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:14px">Collection video (optional, MP4 / WebM)</span>
      <div id="colVideoWrap" class="actions" style="margin-top:6px"></div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:14px">Collection video (optional, MP4 / WebM)</span>
      <div id="colVideoWrap" class="actions" style="margin-top:6px"></div>
      <label class="switch" style="margin-top:12px"><input type="checkbox" id="cEnabled" ${!c || c.enabled !== false ? 'checked' : ''}><i></i><span>Visible to customers</span></label>
      <div class="actions" style="margin-top:18px"><button class="btn gold" id="cSave">Save</button><button class="btn" id="cCancel">Cancel</button></div>
    </div>`;
    let image = (c && c.image) || '', banner = (c && c.banner) || '', colVideo = (c && c.video) || '';
    const paintColVideo = () => {
      const w = box.querySelector('#colVideoWrap');
      if (!w) return;
      w.innerHTML = colVideo
        ? `<video src="${esc(colVideo)}" controls playsinline style="width:200px;border-radius:10px;border:1px solid var(--line)"></video><button class="btn sm danger" id="cvDel">Remove video</button>`
        : `<button class="btn sm" id="cvAdd">Upload video</button>`;
      const a = box.querySelector('#cvAdd');
      if (a) a.onclick = () => pickFile('video', async (f) => { const up = await uploadVideo(f); if (up.length) { colVideo = up[0].url; paintColVideo(); } });
      const d = box.querySelector('#cvDel');
      if (d) d.onclick = () => { colVideo = ''; paintColVideo(); };
    };
    paintColVideo();
    box.querySelector('#cImgWrap').addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-pick]')) pickFile('collection', async (f) => {
        const up = await uploadFiles(f, 'collection');
        if (up.length) { image = up[0].url; box.querySelector('#cImgWrap').innerHTML = imgBox(image, 'collection', 'col.image'); }
      });
      if (e.target.closest('[data-clear]')) { image = ''; box.querySelector('#cImgWrap').innerHTML = imgBox('', 'collection', 'col.image'); }
    });
    box.querySelector('#cBanWrap').addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('[data-pick]')) pickFile('poster', async (f) => {
        const up = await uploadFiles(f, 'poster');
        if (up.length) { banner = up[0].url; box.querySelector('#cBanWrap').innerHTML = imgBox(banner, 'poster', 'col.banner'); }
      });
      if (e.target.closest('[data-clear]')) { banner = ''; box.querySelector('#cBanWrap').innerHTML = imgBox('', 'poster', 'col.banner'); }
    });
    const close = () => { box.hidden = true; box.innerHTML = ''; };
    box.querySelector('#cCancel').onclick = close;
    box.querySelector('#cSave').onclick = async () => {
      const name = box.querySelector('#cName').value.trim();
      if (!name) return toast('Name is required');
      const payload = { name, description: box.querySelector('#cDesc').value.trim(), image, banner, video: colVideo, enabled: box.querySelector('#cEnabled').checked };
      const res = c
        ? await api('/api/admin/collections/' + encodeURIComponent(c.id), { method: 'PUT', body: payload })
        : await api('/api/admin/collections', { method: 'POST', body: payload });
      if (res.ok) { close(); await reload('collections'); flash(); toast('Saved'); } else toast(res.error || 'Could not save');
    };
  }

  /* -------------------------------- items ---------------------------------- */
  VIEWS.items = () => {
    const cols = A.data.collections;
    if (!cols.length) return '<div class="card"><div class="empty">Create a collection first.</div></div>';
    if (!A.itemsCol || !cols.find((c) => c.id === A.itemsCol)) A.itemsCol = cols[0].id;
    const col = cols.find((c) => c.id === A.itemsCol);
    const items = (col.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    return `
      <div class="card owner-card">
        <h2>Dresses &amp; prices</h2>
        <div class="row">
          <label class="fld"><span>Collection</span><select id="itemsColSel">${cols.map((c) => `<option value="${esc(c.id)}" ${c.id === A.itemsCol ? 'selected' : ''}>${esc(c.name)} (${c.items.length})</option>`).join('')}</select></label>
          <div style="display:flex;align-items:flex-end"><button class="btn gold" id="addItem">+ Add dress</button></div>
        </div>
        <div class="divider"></div>
        ${items.length ? items.map((it, i) => `
          <div class="listrow item">
            <img class="sm" src="${esc((it.thumbs && it.thumbs[0]) || it.images[0] || '')}" alt="">
            <div><h4>${esc(it.name)}</h4><p>${it.price ? 'Rs ' + Number(it.price).toLocaleString('en-US') : 'Contact for pricing'} · ${it.images.length} photos · ${it.views || 0} views</p></div>
            <div class="actions">
              <button class="btn sm" data-iup="${esc(it.id)}" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button class="btn sm" data-idown="${esc(it.id)}" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
              <button class="btn sm" data-iedit="${esc(it.id)}">Edit</button>
              <button class="btn sm danger" data-idel="${esc(it.id)}">Delete</button>
            </div>
          </div>`).join('') : '<div class="empty">No dresses yet.</div>'}
      </div>`;
  };
  BIND.items = () => {
    $('#itemsColSel').onchange = (e) => { A.itemsCol = e.target.value; renderTab('items'); };
    $('#addItem').onclick = () => itemEditor(null);
    onTab(async (e) => {
      const t = e.target.closest('[data-iedit],[data-idel],[data-iup],[data-idown]');
      if (!t) return;
      const col = A.data.collections.find((c) => c.id === A.itemsCol);
      const items = (col.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      if (t.dataset.iedit) return itemEditor(t.dataset.iedit);
      if (t.dataset.idel) {
        if (!confirm('Delete this dress?')) return;
        await api(`/api/admin/collections/${encodeURIComponent(col.id)}/items/${encodeURIComponent(t.dataset.idel)}`, { method: 'DELETE' });
        return reload('items');
      }
      const id = t.dataset.iup || t.dataset.idown;
      const i = items.findIndex((x) => x.id === id), j = t.dataset.iup ? i - 1 : i + 1;
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]];
      await api(`/api/admin/collections/${encodeURIComponent(col.id)}/items`, { method: 'PUT', body: { ids: items.map((x) => x.id) } });
      reload('items'); flash();
    });
  };

  let draft = [];
  function itemEditor(itemId) {
    const col = A.data.collections.find((c) => c.id === A.itemsCol);
    const item = itemId ? (col.items || []).find((x) => x.id === itemId) : null;
    draft = item ? item.images.map((u, i) => ({ url: u, thumb: (item.thumbs || [])[i] || u })) : [];
    const box = $('#pickModal');
    box.hidden = false;
    box.innerHTML = `<div class="box">
      <h2>${item ? 'Edit dress' : 'Add dress'} · ${esc(col.name)}</h2>
      <label class="fld"><span>Dress name</span><input id="iName" maxlength="150" value="${esc(item ? item.name : '')}"></label>
      <div class="row">
        <label class="fld"><span>Price PKR (khaali = Contact for pricing)</span><input id="iPrice" type="number" min="0" step="500" value="${item && item.price ? item.price : ''}"></label>
        <label class="fld"><span>Description</span><textarea id="iDesc" maxlength="1000" style="min-height:70px">${esc(item ? item.desc : '')}</textarea></label>
      </div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Photos (first = cover)</span>
      <div class="drop" id="dropItem" style="margin-top:6px">Click or drop multiple photos</div>
      <div class="thumbs" id="itemThumbs"></div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:14px">Video clip of this dress (optional, MP4 / WebM)</span>
      <div id="itemVideoWrap" class="actions" style="margin-top:6px"></div>
      <div class="actions" style="margin-top:18px"><button class="btn gold" id="iSave">Save dress</button><button class="btn" id="iCancel">Cancel</button></div>
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
      box.querySelector('#itemThumbs').innerHTML = draft.length ? draft.map((f, i) => `
        <div class="thumb"><img src="${esc(f.thumb || f.url)}" alt="">${i === 0 ? '<span class="tag">Cover</span>' : ''}
        <div class="bar"><button data-mv="up" data-i="${i}">↑</button><button data-mv="down" data-i="${i}">↓</button><button data-mv="del" data-i="${i}">✕</button></div></div>`).join('')
        : '<div class="empty" style="padding:10px">No photos yet.</div>';
    };
    paint();
    const drop = box.querySelector('#dropItem');
    const add = async (files) => {
      drop.textContent = 'Uploading…';
      const up = await uploadFiles(files, 'dress');
      drop.textContent = 'Click or drop multiple photos';
      if (up.length) { draft = draft.concat(up); paint(); }
    };
    drop.onclick = () => pickFile('dress', add);
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files.length) add(e.dataTransfer.files); });
    box.querySelector('#itemThumbs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mv]');
      if (!b) return;
      const i = Number(b.dataset.i);
      if (b.dataset.mv === 'del') draft.splice(i, 1);
      if (b.dataset.mv === 'up' && i > 0) draft.splice(i - 1, 0, draft.splice(i, 1)[0]);
      if (b.dataset.mv === 'down' && i < draft.length - 1) draft.splice(i + 1, 0, draft.splice(i, 1)[0]);
      paint();
    });
    const close = () => { box.hidden = true; box.innerHTML = ''; };
    box.querySelector('#iCancel').onclick = close;
    box.querySelector('#iSave').onclick = async () => {
      const name = box.querySelector('#iName').value.trim();
      if (!name) return toast('Name required');
      if (!draft.length) return toast('Add at least one photo');
      const payload = {
        name, desc: box.querySelector('#iDesc').value.trim(),
        price: Number(box.querySelector('#iPrice').value) || 0,
        images: draft.map((f) => ({ url: f.url, thumb: f.thumb })),
        video: draftVideo
      };
      const url = item
        ? `/api/admin/collections/${encodeURIComponent(col.id)}/items/${encodeURIComponent(item.id)}`
        : `/api/admin/collections/${encodeURIComponent(col.id)}/items`;
      const res = await api(url, { method: item ? 'PUT' : 'POST', body: payload });
      if (res.ok) { close(); await reload('items'); flash(); toast('Saved'); } else toast(res.error || 'Could not save');
    };
  }

  /* ------------------------------ home sections ---------------------------- */
  VIEWS.home = () => {
    const st = A.data.settings;
    return `
      <div class="card owner-card">
        <h2>Notice / offer bar</h2>
        ${sw('Show it', 'notice.enabled', st.notice.enabled)}
        ${fld('Text', 'notice.text', st.notice.text, { type: 'textarea', max: 300 })}
        ${fld('Link (optional)', 'notice.link', st.notice.link, { placeholder: 'https://…' })}
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Most-loved section</h2>
        ${sw('Show it', 'hotSelling.enabled', st.hotSelling.enabled !== false)}
        ${fld('Heading', 'hotSelling.title', st.hotSelling.title)}
        <div class="row">
          ${sel('What to show', 'hotSelling.mode', st.hotSelling.mode, [['best', 'Most viewed (auto)'], ['first', 'First dress of each collection'], ['collection', 'One collection'], ['off', 'Hide dresses']])}
          <label class="fld"><span>Collection</span><select data-set="hotSelling.collectionId"><option value="">—</option>${A.data.collections.map((c) => `<option value="${esc(c.id)}" ${st.hotSelling.collectionId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          ${fld('How many', 'hotSelling.limit', st.hotSelling.limit || 12, { type: 'number', num: true })}
        </div>
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Valuable-customer popup</h2>
        ${sw('Show it', 'valuable.enabled', st.valuable.enabled)}
        ${fld('Heading', 'valuable.title', st.valuable.title)}
        ${fld('Message', 'valuable.text', st.valuable.text, { type: 'textarea', max: 400 })}
        ${fld('Delay (ms)', 'valuable.delayMs', st.valuable.delayMs || 3500, { type: 'number', num: true })}
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Order message</h2>
        ${fld('Thank-you text', 'order.thankYou', st.order.thankYou, { type: 'textarea', max: 400 })}
        ${saveBtn()}
      </div>`;
  };

  /* -------------------------------- looks ---------------------------------- */
  VIEWS.looks = () => {
    const looks = A.data.looks || [];
    const tryons = A.data.tryons || [];
    const bgs = A.data.backgrounds || [];
    return `
      <div class="card owner-card">
        <h2>Try-On Studio — client looks</h2>
        <p class="hint">Har client apni photo upload karta hai, dress pehnta hai aur jo tasveer banti hai wo yahan aa jati hai (or uske apne gallery mein bhi). Files private hain — website par kabhi publish nahi hotin. Aap ya jis admin ko aap ijazat dein, wo background badal sakta hai.</p>
        <div class="actions" style="margin:0 0 12px">
          <label class="btn sm">Upload a background<input type="file" id="bgFile" accept="image/*" hidden></label>
          <input id="bgName" placeholder="Background name (e.g. Lawn – evening)" style="max-width:240px">
        </div>
        <div class="look-grid" id="bgList" style="margin-bottom:16px">
          ${bgs.map((b) => `<div class="look-card">
            <a href="${esc(b.url)}" target="_blank" rel="noopener"><img src="${esc(b.small || b.url)}" alt=""></a>
            <div class="m">${esc(b.name)}</div>
            <div class="actions" style="padding:0 10px 10px"><button class="btn sm danger" data-bgdel="${esc(b.id)}">Remove</button></div>
          </div>`).join('')}
        </div>
        ${tryons.length ? `<div class="look-grid">${tryons.map((l) => `
          <div class="look-card">
            <a href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(l.thumb || l.url)}" alt=""></a>
            <div class="m">${new Date(l.createdAt).toLocaleString()}<br>${esc(l.itemName || l.itemId || '')}${l.background ? ' · ' + esc(l.background) : ''}${l.quality ? ' · ' + esc(l.quality.toUpperCase()) : ''}</div>
            <div class="actions" style="padding:0 10px 10px">
              ${l.photo ? `<a class="btn sm" href="${esc(l.photo)}" target="_blank" rel="noopener">Original</a>` : ''}
              <button class="btn sm danger" data-tryondel="${esc(l.id)}">Delete</button>
            </div>
          </div>`).join('')}</div>` : '<div class="empty">No try-on photos yet.</div>'}
      </div>
      <div class="card owner-card">
        <h2>Older client photos</h2>
        <p class="hint">Purane “Check Your Look” uploads. Ye files private hain (website par kabhi publish nahi hotin).</p>
        ${looks.length ? `<div class="look-grid">${looks.map((l) => `
          <div class="look-card">
            <a href="${esc(l.url)}" target="_blank" rel="noopener"><img src="${esc(l.thumb || l.url)}" alt=""></a>
            <div class="m">${new Date(l.createdAt).toLocaleString()}<br>${esc(l.collectionId || '')} ${esc(l.itemId || '')}</div>
            <div class="actions" style="padding:0 10px 10px"><button class="btn sm danger" data-lookdel="${esc(l.id)}">Delete</button></div>
          </div>`).join('')}</div>` : '<div class="empty">No client photos yet.</div>'}
      </div>`;
  };
  BIND.looks = () => {
    onTab(async (e) => {
      const d = e.target.closest('[data-lookdel]');
      const t = e.target.closest('[data-tryondel]');
      const b = e.target.closest('[data-bgdel]');
      if (b) {
        if (!confirm('Remove this background?')) return;
        await api('/api/owner/backgrounds/' + encodeURIComponent(b.dataset.bgdel), { method: 'DELETE' });
        return reload('looks');
      }
      if (t) {
        if (!confirm('Delete this try-on photo?')) return;
        await api('/api/owner/tryons/' + encodeURIComponent(t.dataset.tryondel), { method: 'DELETE' });
        return reload('looks');
      }
      if (!d) return;
      if (!confirm('Delete this photo?')) return;
      await api('/api/owner/looks/' + encodeURIComponent(d.dataset.lookdel), { method: 'DELETE' });
      reload('looks');
    });
    const f = $('#bgFile');
    if (f) f.onchange = async () => {
      const file = f.files && f.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      fd.append('name', ($('#bgName') || {}).value || 'My background');
      const j = await api('/api/owner/backgrounds', { method: 'POST', body: fd });
      toast(j.ok ? 'Background added — it now shows as a choice for clients.' : (j.error || 'Upload failed'));
      reload('looks');
    };
  };

  /* --------------------------------- inbox --------------------------------- */
  VIEWS.inbox = () => {
    const d = A.data, t = A.inboxTab;
    const tabs = [['orders', 'Orders', d.orders.length], ['leads', 'Valuable customers', d.leads.length],
      ['complaints', 'Complaints', d.complaints.length], ['ratings', 'Ratings', d.ratings.length], ['looks', 'Client photos', d.looks.length]];
    let list = '';
    if (t === 'orders') {
      list = d.orders.length ? d.orders.map((o) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill on">${esc(o.id)}</span><span>${esc(o.name || '—')}</span><span>${esc(o.phone || '')}</span>${o.city ? `<span>${esc(o.city)}</span>` : ''}<span>${new Date(o.createdAt).toLocaleString()}</span></div>
          <div class="body">${o.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>')}${o.note ? `<br><br><b>Note:</b> ${esc(o.note)}` : ''}</div>
          <div class="acts"><button class="btn sm danger" data-del="orders" data-id="${esc(o.id)}">Delete</button></div>
        </div>`).join('') : '<div class="empty">No orders.</div>';
    } else if (t === 'leads') {
      list = d.leads.length ? `
        <div class="actions" style="margin-bottom:12px"><button class="btn sm" id="copyNums">Copy all ${d.leads.length} contacts</button></div>` +
        d.leads.map((l) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill on">${esc(l.type || 'lead')}</span><span>${esc(l.contact)}</span><span>${new Date(l.createdAt).toLocaleString()}</span></div>
          <div class="acts"><button class="btn sm danger" data-del="leads" data-id="${esc(l.id)}">Delete</button></div>
        </div>`).join('') : '<div class="empty">No signups.</div>';
    } else if (t === 'complaints') {
      list = d.complaints.length ? d.complaints.map((c) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill off">Complaint</span><span>${esc(c.name || 'Anonymous')}</span><span>${esc(c.contact || '')}</span><span>${new Date(c.createdAt).toLocaleString()}</span></div>
          <div class="body">${esc(c.message)}</div>
          <div class="acts"><button class="btn sm danger" data-del="complaints" data-id="${esc(c.id)}">Delete</button></div>
        </div>`).join('') : '<div class="empty">No complaints.</div>';
    } else if (t === 'ratings') {
      list = d.ratings.length ? d.ratings.map((r) => `
        <div class="inboxrow" style="margin-bottom:10px">
          <div class="meta"><span class="pill on">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span><span>${esc(r.name || 'Anonymous')}</span><span>${new Date(r.createdAt).toLocaleString()}</span></div>
          ${r.message ? `<div class="body">${esc(r.message)}</div>` : ''}
          <div class="acts"><button class="btn sm danger" data-del="ratings" data-id="${esc(r.id)}">Delete</button></div>
        </div>`).join('') : '<div class="empty">No ratings.</div>';
    } else {
      list = VIEWS.looks().replace(/<div class="card owner-card">|<\/div>\s*$/, '');
    }
    return `<div class="card owner-card">
      <h2>All customer data</h2>
      <p class="hint">Aap ko har cheez nazar aati hai — chahein to admin ko bhi dikhayein (Access &amp; privacy tab).</p>
      <div class="actions" style="margin-bottom:14px">${tabs.map(([k, l, n]) => `<button class="btn sm ${t === k ? 'gold' : ''}" data-inbox="${k}">${l} (${n})</button>`).join('')}</div>
      ${list}
    </div>`;
  };
  BIND.inbox = () => {
    onTab(async (e) => {
      const tab = e.target.closest('[data-inbox]');
      if (tab) { A.inboxTab = tab.dataset.inbox; return renderTab('inbox'); }
      const del = e.target.closest('[data-del]');
      if (del) { await api(`/api/admin/inbox/${del.dataset.del}/${encodeURIComponent(del.dataset.id)}`, { method: 'DELETE' }); return reload('inbox'); }
      const cp = e.target.closest('#copyNums');
      if (cp) {
        const txt = A.data.leads.map((l) => l.contact).filter(Boolean).join(', ');
        try { await navigator.clipboard.writeText(txt); toast('Copied'); } catch (err) { toast('Copy failed'); }
      }
    });
  };

  /* ----------------------------- look setup -------------------------------- */
  VIEWS.look = () => {
    const l = A.data.settings.look || {};
    return `
      <div class="card owner-card">
        <h2>Try-On Studio page</h2>
        ${sw('Enable the page', 'look.enabled', l.enabled)}
        ${fld('Heading', 'look.heading', l.heading)}
        ${fld('Intro', 'look.intro', l.intro, { type: 'textarea', max: 400 })}
        ${fld('Instructions shown to the customer', 'look.instructions', l.instructions, { type: 'textarea', max: 900 })}
        <p class="hint" style="margin-top:10px">Backgrounds (green lawn default + jitni chahein) “Try-on photos” tab se upload karein. Client ko teen boxes mein se chunne ka option milta hai.</p>
        ${saveBtn()}
      </div>`;
  };

  /* ---------------------------------- ads ---------------------------------- */
  VIEWS.ads = () => {
    const ads = A.data.settings.ads || { enabled: true, items: [] };
    const list = ads.items || [];
    const placeName = { top: 'Top strip', inline: 'Middle of home page', float: 'Floating corner card', bottom: 'Sticky bottom bar' };
    return `
      <div class="card owner-card">
        <h2>Advertisements</h2>
        <p class="hint">Apni website par apna ad lagayein — poster ya chhoti video, link ke sath. Aap decide karein ke admin bhi ads chhoo sake ya nahi (Admin control tab → “Advertisements”).</p>
        ${sw('Show adverts on the website', 'ads.enabled', ads.enabled !== false)}
        ${saveBtn('Save switch')}
      </div>
      <div class="card">
        <div class="actions" style="justify-content:space-between">
          <h2 style="margin:0">Your adverts (${list.length})</h2>
          <button class="btn gold sm" id="adAdd">+ New advert</button>
        </div>
        <div class="divider"></div>
        ${list.length ? list.map((a) => `
          <div class="ad-row">
            <div class="ad-head">
              <div style="display:flex;gap:12px;align-items:center;min-width:0">
                ${a.video ? `<video class="ad-thumb" src="${esc(a.video)}" muted playsinline></video>`
                  : a.image ? `<img class="ad-thumb" src="${esc(a.image)}" alt="">`
                  : `<div class="ad-thumb" style="display:grid;place-items:center;font-size:10px;color:var(--ink-3)">No media</div>`}
                <div style="min-width:0">
                  <h4 style="margin:0">${esc(a.title || 'Untitled advert')} ${a.enabled === false ? '<span class="pill off">Paused</span>' : '<span class="pill on">Live</span>'}</h4>
                  <p style="margin:4px 0 0;font-size:11px;color:var(--ink-3)">${esc(placeName[a.placement] || a.placement || 'Middle of home page')}${a.link ? ' · ' + esc(a.link) : ''}</p>
                </div>
              </div>
              <div class="actions">
                <button class="btn sm" data-ad-toggle="${esc(a.id)}">${a.enabled === false ? 'Resume' : 'Pause'}</button>
                <button class="btn sm" data-ad-edit="${esc(a.id)}">Edit</button>
                <button class="btn sm danger" data-ad-del="${esc(a.id)}">Delete</button>
              </div>
            </div>
            ${a.text ? `<p style="font-size:12.5px;color:var(--ink-2);margin:10px 0 0">${esc(a.text)}</p>` : ''}
          </div>`).join('') : '<div class="empty">No adverts yet — add your first one.</div>'}
      </div>`;
  };
  BIND.ads = () => {
    $('#adAdd').onclick = () => adEditor(null);
    onTab(async (e) => {
      const edit = e.target.closest('[data-ad-edit]');
      if (edit) return adEditor(edit.dataset.adEdit);
      const del = e.target.closest('[data-ad-del]');
      if (del) {
        if (!confirm('Delete this advert?')) return;
        const items = (A.data.settings.ads.items || []).filter((x) => x.id !== del.dataset.adDel);
        const res = await api('/api/admin/settings', { method: 'PUT', body: { ads: { enabled: (A.data.settings.ads || {}).enabled !== false, items } } });
        if (res.ok) { A.data.settings.ads = res.settings.ads; renderTab('ads'); flash(); }
        return;
      }
      const tog = e.target.closest('[data-ad-toggle]');
      if (tog) {
        const items = (A.data.settings.ads.items || []).map((x) => (x.id === tog.dataset.adToggle ? { ...x, enabled: x.enabled === false } : x));
        const res = await api('/api/admin/settings', { method: 'PUT', body: { ads: { enabled: (A.data.settings.ads || {}).enabled !== false, items } } });
        if (res.ok) { A.data.settings.ads = res.settings.ads; renderTab('ads'); flash(); }
      }
    });
  };

  function adEditor(id) {
    const ads = A.data.settings.ads || { items: [] };
    const a = id ? (ads.items || []).find((x) => x.id === id) : null;
    const box = $('#pickModal');
    box.hidden = false;
    box.innerHTML = `<div class="box">
      <h2>${a ? 'Edit advert' : 'New advert'}</h2>
      <label class="fld"><span>Headline</span><input id="adTitle" maxlength="80" value="${esc(a ? a.title : '')}" placeholder="Eid Edit — 20% off"></label>
      <label class="fld"><span>Small line (optional)</span><textarea id="adText" maxlength="200" style="min-height:60px">${esc(a ? a.text : '')}</textarea></label>
      <div class="row">
        <label class="fld"><span>Where it appears</span>
          <select id="adPlace">
            ${[['inline', 'Middle of the home page'], ['top', 'Top strip (under the notice bar)'], ['float', 'Floating corner card'], ['bottom', 'Sticky bottom bar']]
              .map(([v, l]) => `<option value="${v}" ${(a ? a.placement : 'inline') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
        <label class="fld"><span>Button text</span><input id="adCta" maxlength="24" value="${esc(a ? a.cta : 'Shop now')}"></label>
      </div>
      <label class="fld"><span>Link (WhatsApp, collection, any URL)</span><input id="adLink" maxlength="300" value="${esc(a ? a.link : '')}" placeholder="/c/barat  or  https://wa.me/92…"></label>
      <div class="row">
        <label class="fld"><span>Starts (optional)</span><input id="adStart" type="date" value="${a && a.startAt ? String(a.startAt).slice(0, 10) : ''}"></label>
        <label class="fld"><span>Ends (optional)</span><input id="adEnd" type="date" value="${a && a.endAt ? String(a.endAt).slice(0, 10) : ''}"></label>
      </div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)">Poster image</span>
      <div id="adImg" class="actions" style="margin-top:6px"></div>
      <span style="font-size:9.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:block;margin-top:12px">…or a short video (MP4 / WebM)</span>
      <div id="adVid" class="actions" style="margin-top:6px"></div>
      <label class="switch" style="margin-top:14px"><input type="checkbox" id="adOn" ${!a || a.enabled !== false ? 'checked' : ''}><i></i><span>Live on the website</span></label>
      <div class="actions" style="margin-top:18px"><button class="btn gold" id="adSave">Save advert</button><button class="btn" id="adCancel">Cancel</button></div>
      <div class="msg" id="adMsg"></div>
    </div>`;
    let image = (a && a.image) || '', video = (a && a.video) || '';
    const paint = () => {
      box.querySelector('#adImg').innerHTML = image
        ? `<img src="${esc(image)}" style="width:180px;height:90px;object-fit:cover;border-radius:10px;border:1px solid var(--line)"><button class="btn sm danger" id="adImgDel">Remove</button>`
        : `<button class="btn sm" id="adImgAdd">Upload poster</button>`;
      box.querySelector('#adVid').innerHTML = video
        ? `<video src="${esc(video)}" controls playsinline style="width:180px;border-radius:10px;border:1px solid var(--line)"></video><button class="btn sm danger" id="adVidDel">Remove video</button>`
        : `<button class="btn sm" id="adVidAdd">Upload video</button>`;
      const ia = box.querySelector('#adImgAdd');
      if (ia) ia.onclick = () => pickFile('poster', async (f) => { const up = await uploadFiles(f, 'poster'); if (up.length) { image = up[0].url; paint(); } });
      const id = box.querySelector('#adImgDel');
      if (id) id.onclick = () => { image = ''; paint(); };
      const va = box.querySelector('#adVidAdd');
      if (va) va.onclick = () => pickFile('video', async (f) => { const up = await uploadVideo(f); if (up.length) { video = up[0].url; paint(); } });
      const vd = box.querySelector('#adVidDel');
      if (vd) vd.onclick = () => { video = ''; paint(); };
    };
    paint();
    const close = () => { box.hidden = true; box.innerHTML = ''; };
    box.querySelector('#adCancel').onclick = close;
    box.querySelector('#adSave').onclick = async () => {
      const item = {
        id: a ? a.id : 'ad' + Date.now().toString(36),
        title: box.querySelector('#adTitle').value.trim(),
        text: box.querySelector('#adText').value.trim(),
        placement: box.querySelector('#adPlace').value,
        cta: box.querySelector('#adCta').value.trim() || 'Shop now',
        link: box.querySelector('#adLink').value.trim(),
        startAt: box.querySelector('#adStart').value || '',
        endAt: box.querySelector('#adEnd').value || '',
        image, video,
        enabled: box.querySelector('#adOn').checked
      };
      if (!item.title && !item.image && !item.video) {
        const m = box.querySelector('#adMsg'); m.className = 'msg err'; m.textContent = 'Add a headline or a poster.'; return;
      }
      const items = (ads.items || []).filter((x) => x.id !== item.id).concat([item]);
      const res = await api('/api/admin/settings', { method: 'PUT', body: { ads: { enabled: (ads.enabled !== false), items } } });
      if (res.ok) { A.data.settings.ads = res.settings.ads; close(); await reload('ads'); flash(); toast('Advert saved'); }
      else { const m = box.querySelector('#adMsg'); m.className = 'msg err'; m.textContent = res.error || 'Could not save'; }
    };
  }

  /* ------------------------------ live visitors ---------------------------- */
  let liveTimer = null;
  async function refreshLive() {
    const res = await api('/api/owner/live').catch(() => null);
    if (!res || !res.ok) return;
    const n = res.live;
    const badge = $('#liveBadge');
    if (badge) badge.textContent = n;
    const dot = $('#liveDot');
    if (dot) dot.hidden = n === 0;
    const nav = $('#navLiveCount');
    if (nav) nav.textContent = n > 0 ? n : '';
    const list = $('#liveList');
    if (list) {
      list.innerHTML = res.visitors.length ? res.visitors.map((v) => `
        <div class="live-row">
          <div style="min-width:0">
            <h4>${esc(v.path)}</h4>
            <p>${esc(v.device)} · ${v.seconds}s on site · seen ${v.idle}s ago</p>
          </div>
          <span class="pill on">#${esc(v.id)}</span>
        </div>`).join('') : '<div class="empty">Nobody on the site right now.</div>';
      const paths = Object.entries(res.paths || {}).sort((a, b) => b[1] - a[1]);
      const pEl = $('#livePaths');
      if (pEl) pEl.innerHTML = paths.length
        ? paths.map(([p, c]) => `<div class="live-row"><div><h4>${esc(p)}</h4></div><span class="pill on">${c}</span></div>`).join('')
        : '<div class="empty">—</div>';
    }
  }
  function startLivePolling() {
    if (liveTimer) clearInterval(liveTimer);
    refreshLive();
    liveTimer = setInterval(() => { if (A.tab === 'live' || A.tab === 'dashboard') refreshLive(); }, 6000);
  }

  VIEWS.live = () => {
    const L = (A.data.settings && A.data.settings.live) || {};
    return `
    <div class="card owner-card">
      <h2>Who is on the site right now</h2>
      <p class="hint">Har 6 second par khud update hota hai. “Active” ka matlab: pichle 90 second me site par mojood.</p>
      <div class="actions" style="align-items:baseline;gap:16px">
        <span class="live-num" id="liveBadge">—</span>
        <span style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)">people online</span>
        <button class="btn sm" id="liveRefresh">Refresh</button>
      </div>
    </div>
    <div class="card">
      <h2>Visitors</h2>
      <div id="liveList"><div class="empty">Loading…</div></div>
    </div>
    <div class="card">
      <h2>Most visited pages right now</h2>
      <div id="livePaths"><div class="empty">—</div></div>
    </div>
    <div class="card owner-card">
      <h2>Clients ko dikhne wala "browsing now" badge</h2>
      <p class="hint">Website ke neeche left corner mein chhota sa pill aata hai:
      <b>“● 9 browsing now”</b>. Yahan se aap batayein ke jab asli visitors kam hon to kam se kam
      kitne dikhein — number khud bhi halka halka upar neeche hota rehta hai, is liye jama hua nahi lagta.
      <b>0</b> likhein to sirf asli visitors dikhenge. Aap ke is panel mein hamesha **asli** number.</p>
      <div class="row">
        ${sw('Clients ko badge dikhayein', 'live.show', L.show !== false)}
        ${fld('Kam se kam kitne dikhein', 'live.floor', L.floor || 0, { type: 'number', num: true })}
        ${fld('Badge ka text', 'live.label', L.label || 'browsing now')}
      </div>
      ${saveBtn('Save')}
    </div>`;
  };
  BIND.live = () => {
    refreshLive();
    const b = $('#liveRefresh');
    if (b) b.onclick = () => refreshLive();
  };

  /* ------------------------------- contact --------------------------------- */
  VIEWS.contact = () => {
    const c = A.data.settings.contact || {}, s = A.data.settings.social || {};
    const nets = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['pinterest', 'Pinterest']];
    const cur = A.data.settings.currency || {};
    return `
      <div class="card owner-card">
        <h2>Contact</h2>
        ${fld('WhatsApp number', 'contact.whatsapp', c.whatsapp, { placeholder: '923001234567' })}
        ${fld('Phone', 'contact.phone', c.phone)}
        ${fld('Email', 'contact.email', c.email)}
        ${fld('Default WhatsApp message', 'contact.whatsappMessage', c.whatsappMessage, { type: 'textarea', max: 200 })}
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Social links</h2>
        ${nets.map(([k, l]) => fld(l, 'social.' + k, s[k], { placeholder: 'https://' + k + '.com/yourpage' })).join('')}
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Currency</h2>
        <p class="hint">Live rates auto-update hote hain (open.er-api.com). Manual rate sirf backup ke liye hai.</p>
        ${sw('Use live exchange rates', 'currency.live', cur.live !== false)}
        <div class="row">
          ${(cur.list || []).map((x, i) => fld(x.code + ' manual rate', `currency.list.${i}.rate`, x.rate, { type: 'number', num: true })).join('')}
        </div>
        ${saveBtn()}
      </div>`;
  };

  /* --------------------------------- pages --------------------------------- */
  VIEWS.pages = () => {
    const p = A.data.settings;
    return `
      <div class="card owner-card">
        <h2>About us</h2>
        ${fld('Heading', 'about.heading', p.about.heading)}
        ${fld('Text', 'about.text', p.about.text, { type: 'textarea', max: 1500 })}
        <div style="margin-top:8px">${imgBox(p.about.image, 'about', 'about.image')}</div>
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>Terms &amp; conditions</h2>
        ${fld('Text', 'terms.text', p.terms.text, { type: 'textarea', max: 2500 })}
        <div style="margin-top:8px">${imgBox(p.terms.image, 'terms', 'terms.image')}</div>
        ${saveBtn()}
      </div>
      <div class="card">
        <h2>SEO</h2>
        ${fld('Title', 'seo.title', p.seo.title, { max: 120 })}
        ${fld('Description', 'seo.description', p.seo.description, { type: 'textarea', max: 320 })}
        ${fld('Keywords', 'seo.keywords', p.seo.keywords, { type: 'textarea', max: 400 })}
        ${saveBtn()}
      </div>`;
  };


  /* ---------------------------- backup & restore ---------------------------- */
  VIEWS.backup = () => `
    <div class="card owner-card">
      <h2>Backup &amp; restore</h2>
      <p class="hint">Free hosting par disk har restart me khali ho jati hai. Is button se poori dukaan
      (settings, collections, dresses, prices aur upload ki hui tamam tasveerein) <b>ek .zip</b> me
      download kar lein — restart ke baad wapas restore kar dein. Ye GitHub ke baghair bhi chalta hai.</p>
      <div class="actions" style="gap:10px;flex-wrap:wrap">
        <a class="btn gold" id="bkDl" href="/api/owner/backup">Download backup (.zip)</a>
        <label class="btn" style="cursor:pointer">Restore from backup<input type="file" id="bkFile" accept=".zip,application/zip" hidden></label>
      </div>
      <p class="hint" id="bkInfo" style="margin-top:10px"></p>
      <div class="msg" id="bkMsg"></div>
    </div>`;

  BIND.backup = () => {
    const info = $('#bkInfo');
    api('/api/owner/backup-info').then((r) => {
      if (r.ok) info.textContent = `${r.uploads} uploaded file(s) · ${(r.bytes / 1048576).toFixed(1)} MB`;
    }).catch(() => {});
    $('#bkFile').onchange = async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      if (!confirm('Restore this backup? Abhi ka data is backup se replace ho jayega.')) return;
      const msg = $('#bkMsg');
      msg.className = 'msg';
      msg.textContent = 'Restoring…';
      const fd = new FormData();
      fd.append('file', f);
      const res = await api('/api/owner/restore', { method: 'POST', body: fd });
      if (res.ok) {
        msg.className = 'msg ok';
        msg.textContent = `Restored ${res.files} file(s) · ${res.collections} collection(s). Page reload ho raha hai…`;
        setTimeout(() => location.reload(), 1500);
      } else {
        msg.className = 'msg err';
        msg.textContent = res.error || 'Restore failed';
      }
    };
  };

  /* ------------------------------- security -------------------------------- */
  VIEWS.security = () => `
    <div class="card owner-card">
      <h2>Owner credentials</h2>
      <p class="hint">Ye sirf aap ke liye hain. Default: ID <b>1234567890123</b> · Password <b>admin123</b> · PIN <b>998877</b> — foran badal lein.</p>
      <label class="fld"><span>Current owner password *</span><input id="oCur" type="password"></label>
      <div class="row">
        <label class="fld"><span>New owner ID</span><input id="oUser" value="${esc(A.data.username)}" maxlength="60"></label>
        <label class="fld"><span>New password</span><input id="oPass" type="password" placeholder="min 6 characters"></label>
        <label class="fld"><span>New PIN (6 digits)</span><input id="oPin" maxlength="6" placeholder="998877"></label>
      </div>
      <div class="actions"><button class="btn gold" id="oSave">Update owner credentials</button></div>
      <div class="msg" id="oMsg"></div>
    </div>`;
  BIND.security = () => {
    $('#oSave').onclick = async () => {
      const msg = $('#oMsg');
      const body = { target: 'owner', currentPassword: $('#oCur').value, username: $('#oUser').value.trim() };
      if ($('#oPass').value) body.password = $('#oPass').value;
      const pin = $('#oPin').value.trim();
      if (pin) { if (!/^\d{4,6}$/.test(pin)) { msg.className = 'msg err'; msg.textContent = 'PIN 4–6 digits.'; return; } body.pin = pin; }
      if (!body.currentPassword) { msg.className = 'msg err'; msg.textContent = 'Enter current password.'; return; }
      const res = await api('/api/admin/credentials', { method: 'POST', body });
      if (res.ok) { msg.className = 'msg ok'; msg.textContent = res.message || 'Updated.'; setTimeout(showLogin, 1500); }
      else { msg.className = 'msg err'; msg.textContent = res.error || 'Could not update.'; }
    };
  };

  /* -------------------------------- boot ----------------------------------- */
  (async function init() {
    const s = await api('/api/owner/session').catch(() => ({ ok: false }));
    if (s.ok) boot(); else showLogin();
  })();
})();
