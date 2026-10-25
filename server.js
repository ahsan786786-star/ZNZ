'use strict';
/**
 * Z&Z — Luxury Bridals & Formals
 * Single-file Node/Express server: super-fast public API + protected admin API.
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const zlib = require('zlib');

const store = require('./lib/store');
const auth = require('./lib/auth');
const zip = require('./lib/zip');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const UPLOADS = path.join(PUBLIC, 'uploads');
const UPLOAD_URL = '/uploads';

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

/* ------------------------------- security ------------------------------- */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

/* simple in-memory rate limiter for write endpoints */
const hits = new Map();
function limit(key, max, windowMs) {
  const now = Date.now();
  const k = key + '|' + Math.floor(now / windowMs);
  const n = (hits.get(k) || 0) + 1;
  hits.set(k, n);
  if (hits.size > 5000) hits.clear();
  return n <= max;
}
const ip = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'x';

/* ------------------------------ compression ----------------------------- */
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.html': 'text/html; charset=utf-8'
};

/** Pre-compress text assets once at boot so every request is a straight stream. */
function precompress() {
  const roots = [path.join(PUBLIC, 'assets')];
  const walk = (dir) => {
    let list = [];
    try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of list) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) { walk(full); continue; }
      if (!/\.(css|js|json|svg|webmanifest|txt|xml)$/i.test(d.name)) continue;
      const gz = full + '.gz';
      try {
        /* Always rebuild: a stale .gz copied from an older build (all files get the
           same mtime after a git checkout) would otherwise be served for months. */
        fs.writeFileSync(gz, zlib.gzipSync(fs.readFileSync(full), { level: 9 }));
      } catch (e) { /* ignore */ }
    }
  };
  roots.forEach(walk);
}

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();
  if (!/\.(css|js|json|svg|webmanifest|txt|xml)$/i.test(req.path)) return next();
  const file = path.join(PUBLIC, decodeURIComponent(req.path));
  const gz = file + '.gz';
  try {
    const a = fs.statSync(gz), b = fs.statSync(file);
    if (a.mtimeMs >= b.mtimeMs) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Cache-Control', req.query.v
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate');
      res.setHeader('Last-Modified', b.mtime.toUTCString());
      res.setHeader('Content-Length', a.size);
      return fs.createReadStream(gz).pipe(res);
    }
  } catch (e) { /* fall through to static */ }
  next();
});

/** gzip dynamic responses (HTML + JSON) on the way out */
app.use((req, res, next) => {
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();
  const send = res.send.bind(res);
  res.send = (body) => {
    try {
      const ct = String(res.getHeader('Content-Type') || '');
      const isText = !ct || /text|json|javascript|xml|svg/.test(ct);
      const buf = Buffer.isBuffer(body) ? body : typeof body === 'string' ? Buffer.from(body) : null;
      if (isText && buf && buf.length > 1024 && !res.getHeader('Content-Encoding')) {
        const gz = zlib.gzipSync(buf, { level: 6 });
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-Length');
        res.setHeader('Content-Length', gz.length);
        return send(gz);
      }
    } catch (e) { /* fallback */ }
    return send(body);
  };
  next();
});

/* ------------------------------ static files ---------------------------- */
/* One version stamp for every asset link. A request that carries ?v=<stamp>
   is cached for a year (it can never go stale); a bare request is revalidated. */
let ASSET_V = '1', ASSET_AT = 0;
function assetVersion() {
  if (Date.now() - ASSET_AT < 60000) return ASSET_V;
  let h = 0;
  const walk = (dir) => {
    let names = [];
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of names) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) walk(full);
      else { const st = fs.statSync(full); h = (h * 31 + st.size + Math.round(st.mtimeMs / 1000)) % 1000000007; }
    }
  };
  walk(path.join(PUBLIC, 'assets'));
  ASSET_V = String(h); ASSET_AT = Date.now();
  return ASSET_V;
}
app.use('/assets', express.static(path.join(PUBLIC, 'assets'), {
  setHeaders: (res, file, stat) => {
    const versioned = !!res.req.query.v;
    if (versioned) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('Last-Modified', stat.mtime.toUTCString());
  }
}));
app.use('/uploads', express.static(UPLOADS, { maxAge: '30d' }));

/* ------------------------------ helpers --------------------------------- */
const THUMB_CACHE = new Map();
/** returns the light-weight "-sm" variant when it exists next to the original */
function thumbOf(url) {
  if (!url || !url.startsWith('/')) return url || '';
  if (THUMB_CACHE.has(url)) return THUMB_CACHE.get(url);
  let out = url;
  const base = url.replace(/\.webp(\?.*)?$/i, '');
  if (base !== url) {
    const candidate = base + '-sm.webp';
    try { if (fs.existsSync(path.join(PUBLIC, candidate))) out = candidate; } catch (e) {}
  }
  THUMB_CACHE.set(url, out);
  return out;
}

const clean = (s, max = 5000) => String(s == null ? '' : s).slice(0, max);
const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));
const slugify = (s) =>
  String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'collection';

/* only the adverts that are switched on and inside their dates reach the shop */
function activeAds(ads) {
  const a = ads || {};
  if (a.enabled === false) return { enabled: false, items: [] };
  const now = Date.now();
  const items = (a.items || [])
    .filter((x) => x && x.enabled !== false)
    .filter((x) => (!x.startAt || new Date(x.startAt).getTime() <= now) && (!x.endAt || new Date(x.endAt).getTime() >= now))
    .map((x) => ({
      id: x.id, title: x.title || '', text: x.text || '', image: x.image || '', video: x.video || '',
      link: x.link || '', placement: x.placement || 'inline', cta: x.cta || 'Shop now'
    }));
  return { enabled: true, items };
}

/* ---------------------- try-on backgrounds (lawn by default) ------------- */
const DEFAULT_BACKGROUNDS = [
  { id: 'lawn', name: 'Green lawn', url: '/assets/img/look/lawn.webp', small: '/assets/img/look/lawn-sm.webp' },
  { id: 'garden', name: 'Rose garden', url: '/assets/img/look/garden.webp', small: '/assets/img/look/garden-sm.webp' },
  { id: 'evening', name: 'Golden hour', url: '/assets/img/look/evening.webp', small: '/assets/img/look/evening-sm.webp' }
];
function backgrounds() {
  const s = store.get().settings || {};
  const list = ((s.look || {}).backgrounds || []).filter((b) => b && b.url);
  return list.length ? list : DEFAULT_BACKGROUNDS;
}

/* the cut-out that belongs to a dress photo, if we already made one */
function cutOf(url) {
  if (!url) return '';
  if (!/\/img\/dresses\/|\/uploads\//.test(url)) return '';
  const rel = url.replace(/^\/+/, '');
  const full = path.join(PUBLIC, rel);
  const out = full.replace(/\.webp$/i, '-cut.webp');
  if (fs.existsSync(out)) return url.replace(/\.webp$/i, '-cut.webp');
  /* the studio cut folder used for the starter dresses */
  const alt = full.replace('/dresses/', '/dresses/cut/');
  if (fs.existsSync(alt)) return url.replace('/dresses/', '/dresses/cut/');
  return '';
}

function publicPayload() {
  const db = store.get();
  const s = db.settings || {};
  return {
    brand: s.brand || {},
    contact: s.contact || {},
    notice: s.notice || {},
    social: s.social || {},
    theme: s.theme || {},
    hero: s.hero || {},
    hotSelling: s.hotSelling || {},
    collectionPage: s.collectionPage || {},
    valuable: s.valuable || {},
    currency: s.currency || {},
    terms: s.terms || {},
    about: s.about || {},
    branches: s.branches || [],
    order: s.order || {},
    seo: s.seo || {},
    layout: s.layout || {},
    animations: s.animations || {},
    bubbles: s.bubbles || {},
    look: Object.assign({}, s.look || {}, { backgrounds: backgrounds() }),
    ads: activeAds(s.ads),
    permissions: { adminSeesCustomerPhotos: !!(s.permissions || {}).adminSeesCustomerPhotos },
    collections: (db.collections || [])
      .filter((c) => c.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description || '',
        image: c.image || '',
        imageThumb: thumbOf(c.image),
        banner: c.banner || '',
        items: (c.items || [])
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((it) => ({
            id: it.id,
            name: it.name,
            price: Number(it.price) || 0,
            desc: it.desc || '',
            images: (it.images || []).filter(Boolean),
            cuts: (it.images || []).filter(Boolean).map((u) => cutOf(u)).filter(Boolean),
            thumbs: ((it.thumbs || []).filter(Boolean).length ? it.thumbs : (it.images || []).map(thumbOf)).filter(Boolean),
            views: it.views || 0,
            tags: it.tags || []
          }))
      }))
  };
}

/* --------------------------- live currency rates ------------------------- */
const RATE_TTL = 1000 * 60 * 60 * 6; // 6h
let rateCache = { at: 0, rates: null };

async function fetchRates() {
  if (rateCache.rates && Date.now() - rateCache.at < RATE_TTL) return rateCache.rates;
  const urls = [
    'https://open.er-api.com/v6/latest/PKR',
    'https://api.exchangerate-api.com/v4/latest/PKR'
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4500);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      const j = await r.json();
      const table = j.rates || (j.conversion_rates || null);
      if (table && table.USD) {
        rateCache = { at: Date.now(), rates: table };
        return table;
      }
    } catch (e) { /* try next */ }
  }
  return rateCache.rates || null;
}

app.get('/api/rates', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=1800');
  const db = store.get();
  const cfg = (db.settings && db.settings.currency) || {};
  const manual = {};
  (cfg.list || []).forEach((c) => { manual[c.code] = Number(c.rate) || 1; });
  let live = null;
  if (cfg.live !== false) live = await fetchRates();
  const out = { ok: true, base: 'PKR', live: !!live, updatedAt: rateCache.at || null, rates: {} };
  (cfg.list || []).forEach((c) => {
    if (c.code === 'PKR') { out.rates[c.code] = 1; return; }
    out.rates[c.code] = live && live[c.code] ? Number(live[c.code]) : manual[c.code] || 1;
  });
  res.json(out);
});

/* --------------------------- public API --------------------------------- */
app.get('/api/bootstrap', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, data: publicPayload() });
});

app.get('/api/health', (req, res) => res.json({ ok: true, up: process.uptime() }));

/* track product views (powers "most loved" ordering) */
app.post('/api/track/view', (req, res) => {
  const { collectionId, itemId } = req.body || {};
  if (!collectionId || !itemId) return res.json({ ok: false });
  if (!limit('view' + ip(req), 240, 60000)) return res.json({ ok: false });
  store.update((db) => {
    const c = (db.collections || []).find((x) => x.id === collectionId);
    const it = c && (c.items || []).find((x) => x.id === itemId);
    if (it) it.views = (Number(it.views) || 0) + 1;
  });
  res.json({ ok: true });
});

/* subscribe / valuable customer */
app.post('/api/lead', (req, res) => {
  const b = req.body || {};
  const contact = clean(b.contact || b.phone || b.email, 120).trim();
  if (!contact) return res.status(400).json({ ok: false, error: 'Please add your email or phone number.' });
  if (!limit('lead' + ip(req), 12, 60000)) return res.status(429).json({ ok: false, error: 'Too many requests, please try later.' });
  const entry = {
    id: store.uid('l'), type: clean(b.type || 'valuable_customer', 40),
    name: clean(b.name, 120), contact,
    message: clean(b.message, 800), page: clean(b.page, 200),
    createdAt: new Date().toISOString(), read: false
  };
  store.update((db) => { (db.leads = db.leads || []).unshift(entry); });
  res.json({ ok: true, message: 'Thank you! You are now on our VIP list.', id: entry.id });
});

/* complaint */
app.post('/api/complaint', (req, res) => {
  const b = req.body || {};
  if (!clean(b.message, 800).trim()) return res.status(400).json({ ok: false, error: 'Please write your complaint.' });
  if (!limit('complaint' + ip(req), 8, 60000)) return res.status(429).json({ ok: false, error: 'Too many requests.' });
  const entry = {
    id: store.uid('c'), name: clean(b.name, 120), contact: clean(b.contact, 120),
    message: clean(b.message, 800), status: 'new', createdAt: new Date().toISOString()
  };
  store.update((db) => { (db.complaints = db.complaints || []).unshift(entry); });
  res.json({ ok: true, message: 'Your complaint has been received. Our team will look into it.' });
});

/* rating (private for admin) */
app.post('/api/rating', (req, res) => {
  const b = req.body || {};
  const stars = Math.max(1, Math.min(5, Math.round(num(b.stars))));
  if (!limit('rate' + ip(req), 10, 60000)) return res.status(429).json({ ok: false, error: 'Too many requests.' });
  const entry = {
    id: store.uid('r'), stars, message: clean(b.message, 600), name: clean(b.name, 120),
    contact: clean(b.contact, 120), createdAt: new Date().toISOString()
  };
  store.update((db) => { (db.ratings = db.ratings || []).unshift(entry); });
  res.json({ ok: true, message: 'Thank you for rating us!' });
});

/* order (add to cart -> checkout) */
app.post('/api/order', (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  if (!items.length) return res.status(400).json({ ok: false, error: 'Your bag is empty.' });
  if (!clean(b.phone, 40).trim() && !clean(b.whatsapp, 40).trim())
    return res.status(400).json({ ok: false, error: 'Please add your phone number so we can confirm the order.' });
  if (!limit('order' + ip(req), 10, 60000)) return res.status(429).json({ ok: false, error: 'Too many requests.' });
  const db = store.get();
  const order = {
    id: 'ZNZ-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    name: clean(b.name, 120), phone: clean(b.phone || b.whatsapp, 40),
    city: clean(b.city, 80), note: clean(b.note, 600), currency: clean(b.currency, 8) || 'PKR',
    items: items.map((x) => ({
      collectionId: clean(x.collectionId, 60), itemId: clean(x.itemId, 60),
      name: clean(x.name, 160), image: clean(x.image, 400),
      price: num(x.price), qty: Math.max(1, Math.min(50, Math.round(num(x.qty) || 1)))
    })),
    status: 'new', createdAt: new Date().toISOString()
  };
  store.update((d) => { (d.orders = d.orders || []).unshift(order); (d.leads = d.leads || []).unshift({
    id: store.uid('l'), type: 'order', name: order.name, contact: order.phone,
    message: 'Order ' + order.id, page: '/checkout', createdAt: order.createdAt, read: false
  }); });
  res.json({ ok: true, orderId: order.id, message: (db.settings.order && db.settings.order.thankYou) || 'Thank you for your order! Please attend our call for order confirmation.' });
});

/* ------------------------------- uploads -------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) return cb(new Error('Only image files are allowed.'));
    cb(null, true);
  }
});

const KIND_MAX = { poster: 2400, collection: 1600, dress: 2000, terms: 1400, about: 1600, logo: 900, other: 1800 };


/* ------------------- automatic dress cut-out (background gone) -------------
   When a dress photo is uploaded we also produce a transparent version with the
   plain studio background removed. The Try-On Studio uses it, so a brand-new
   dress shows up in the fitting room immediately — no manual work. */
const CUT_SHRINK = 420;

function cutoutBuffer(rawRGBA, w, h) {
  return { rawRGBA, w, h };
}

async function makeCutout(inputBuffer) {
  const { data, info } = await sharp(inputBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 900, height: 1440, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, CH = info.channels;
  const sw = CUT_SHRINK, sh = Math.max(1, Math.round(H / W * sw));
  const small = await sharp(inputBuffer, { failOn: 'none' }).rotate()
    .resize({ width: sw, height: sh, fit: 'fill' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const d = small.data, sW = small.info.width, sH = small.info.height, C = small.info.channels;
  const n = sW * sH;

  /* edge strength */
  const edge = new Float32Array(n);
  for (let y = 1; y < sH - 1; y++) {
    for (let x = 1; x < sW - 1; x++) {
      const o = (y * sW + x) * C;
      const gx = Math.abs(d[o + C] - d[o - C]) + Math.abs(d[o + C + 1] - d[o - C + 1]) + Math.abs(d[o + C + 2] - d[o - C + 2]);
      const gy = Math.abs(d[o + sW * C] - d[o - sW * C]);
      edge[y * sW + x] = (gx + gy) / 2;
    }
  }
  const med = (arr) => { const a = Array.from(arr).sort((p, q) => p - q); return a[a.length >> 1] || 0; };
  if (process.env.CUT_DEBUG) console.log('[cut] small', sW, sH, C);
  function border(side) {
    const r = [], g = [], b = [];
    for (let i = 0; i < sW; i++) {
      let y = side === 'top' ? 0 : side === 'bottom' ? sH - 1 : i;
      let x = side === 'left' ? 0 : side === 'right' ? sW - 1 : i;
      if (side === 'top' || side === 'bottom') { x = i; }
      const o = (y * sW + x) * C;
      r.push(d[o]); g.push(d[o + 1]); b.push(d[o + 2]);
    }
    return [med(r), med(g), med(b)];
  }
  function flood(ref, seeds, tol) {
    const out = new Uint8Array(n), acc = new Uint8Array(n), seen = new Uint8Array(n);
    const q = []; for (const p of seeds) q.push(p);
    while (q.length) {
      const p = q.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      const o = p * C;
      let ok = Math.hypot(d[o] - ref[0], d[o + 1] - ref[1], d[o + 2] - ref[2]) <= tol * 1.45;
      if (ok && edge[p] > 30) ok = false;
      if (!ok) {
        const x = p % sW, y = (p - x) / sW;
        const nb = [x > 0 ? p - 1 : -1, x < sW - 1 ? p + 1 : -1, y > 0 ? p - sW : -1, y < sH - 1 ? p + sW : -1];
        for (const qq of nb) {
          if (qq < 0 || !acc[qq]) continue;
          const oo = qq * C;
          if (Math.hypot(d[o] - d[oo], d[o + 1] - d[oo + 1], d[o + 2] - d[oo + 2]) <= 12) { ok = true; break; }
        }
      }
      if (!ok) continue;
      acc[p] = 1; out[p] = 1;
      const x = p % sW, y = (p - x) / sW;
      if (x > 0) q.push(p - 1);
      if (x < sW - 1) q.push(p + 1);
      if (y > 0) q.push(p - sW);
      if (y < sH - 1) q.push(p + sW);
    }
    return out;
  }
  /* segment the garment; a second, stricter pass rescues near-white sheer gowns */
  function segment(tol) {
    let keep = new Uint8Array(n);
    const seedsTop = [], seedsBottom = [], seedsLeft = [], seedsRight = [];
    for (let i = 0; i < sW; i++) { seedsTop.push(i); seedsBottom.push((sH - 1) * sW + i); }
    for (let i = 0; i < sH; i++) { seedsLeft.push(i * sW); seedsRight.push(i * sW + sW - 1); }
    const bg = new Uint8Array(n);
    [[border('top'), seedsTop], [border('bottom'), seedsBottom], [border('left'), seedsLeft], [border('right'), seedsRight]]
      .forEach(([ref, seeds]) => { const m = flood(ref, seeds, tol); for (let i = 0; i < n; i++) if (m[i]) bg[i] = 1; });

    let bgN = 0;
    for (let i = 0; i < n; i++) { keep[i] = bg[i] ? 0 : 1; if (bg[i]) bgN++; }
    if (process.env.CUT_DEBUG) console.log('[cut] bg frac', (bgN / n).toFixed(2), 'border samples', border('top'), border('left'));

    /* largest connected island only (drops hangers, props, set dressing) */
    const lab = new Int32Array(n); let bestLab = 0, bestSize = 0, cur = 0;
    for (let i = 0; i < n; i++) {
      if (!keep[i] || lab[i]) continue;
      cur++;
      let size = 0;
      const q = [i]; lab[i] = cur;
      while (q.length) {
        const p = q.pop(); size++;
        const x = p % sW, y = (p - x) / sW;
        const nb = [x > 0 ? p - 1 : -1, x < sW - 1 ? p + 1 : -1, y > 0 ? p - sW : -1, y < sH - 1 ? p + sW : -1];
        for (const qq of nb) if (qq >= 0 && keep[qq] && !lab[qq]) { lab[qq] = cur; q.push(qq); }
      }
      if (size > bestSize) { bestSize = size; bestLab = cur; }
    }
    for (let i = 0; i < n; i++) if (keep[i] && lab[i] !== bestLab) keep[i] = 0;
    if (process.env.CUT_DEBUG) console.log('[cut] largest island', bestSize, 'of', n);

    /* close holes row by row */
    for (let y = 0; y < sH; y++) {
      let f = -1, l = -1;
      for (let x = 0; x < sW; x++) if (keep[y * sW + x]) { if (f < 0) f = x; l = x; }
      if (f < 0 || l - f < 4) continue;
      let on = 0;
      for (let x = f; x <= l; x++) if (keep[y * sW + x]) on++;
      if (on < (l - f + 1) * 0.22) continue;
      for (let x = f; x <= l; x++) keep[y * sW + x] = 1;
    }
    return { keep, lab, bgN, bestSize };
  }
  let seg = segment(30);
  let keep = seg.keep;
  let keptN = 0; for (let i2 = 0; i2 < n; i2++) if (keep[i2]) keptN++;
  if (keptN < n * 0.12) {
    const again = segment(15);
    let n2 = 0; for (let i2 = 0; i2 < n; i2++) if (again.keep[i2]) n2++;
    if (n2 > keptN * 1.35) { keep = again.keep; seg = again; keptN = n2; }
  }
  if (process.env.CUT_DEBUG) console.log('[cut] kept', (keptN / n).toFixed(2));

  /* start at the neckline (drop the dummy's head / hanger) */
  let neckY = 0;
  let y0 = -1, y1 = -1;
  for (let y = 0; y < sH; y++) {
    let any = false;
    for (let x = 0; x < sW; x++) if (keep[y * sW + x]) { any = true; break; }
    if (any) { if (y0 < 0) y0 = y; y1 = y; }
  }
  if (y0 >= 0) {
    const rows = [];
    let maxW = 0;
    for (let y = y0; y <= y1; y++) {
      let c = 0;
      for (let x = 0; x < sW; x++) if (keep[y * sW + x]) c++;
      rows.push(c);
      if (c > maxW) maxW = c;
    }
    /* only skip the thin hanger / dummy head above the garment — never the bodice */
    let cut = 0;
    for (let i = 0; i < rows.length; i++) if (rows[i] >= maxW * 0.30) { cut = i; break; }
    const maxCut = Math.floor(rows.length * 0.25);
    if (cut > maxCut) cut = 0;
    for (let y = y0; y < y0 + cut; y++) for (let x = 0; x < sW; x++) keep[y * sW + x] = 0;
    neckY = y0 + cut;
  }

  /* ---- opening pass: cut 1-2 px hanger wires / stray threads ---- */
  {
    const tmp = new Uint8Array(n);
    for (let y = 1; y < sH - 1; y++) {
      for (let x = 1; x < sW - 1; x++) {
        const p = y * sW + x;
        if (!keep[p]) continue;
        let n4 = 0;
        if (keep[p - 1]) n4++; if (keep[p + 1]) n4++;
        if (keep[p - sW]) n4++; if (keep[p + sW]) n4++;
        tmp[p] = n4 >= 3 ? 1 : 0;
      }
    }
    for (let i = 0; i < n; i++) keep[i] = tmp[i];
    /* plug single-pixel holes again */
    const tmp2 = new Uint8Array(n);
    for (let y = 1; y < sH - 1; y++) {
      for (let x = 1; x < sW - 1; x++) {
        const p = y * sW + x;
        let n4 = 0;
        if (keep[p - 1]) n4++; if (keep[p + 1]) n4++;
        if (keep[p - sW]) n4++; if (keep[p + sW]) n4++;
        tmp2[p] = keep[p] || n4 >= 3 ? 1 : 0;
      }
    }
    for (let i = 0; i < n; i++) keep[i] = tmp2[i];
  }

  /* ---- monotone silhouette: sheer skirts keep their true outline ---- */
  {
    const lOf = new Int32Array(sH).fill(-1), rOf = new Int32Array(sH).fill(-1);
    let wideY = 0, wideW = 0;
    for (let y = 0; y < sH; y++) {
      let f = -1, l = -1;
      for (let x = 0; x < sW; x++) if (keep[y * sW + x]) { if (f < 0) f = x; l = x; }
      lOf[y] = f; rOf[y] = l;
      if (f >= 0 && l - f > wideW) { wideW = l - f; wideY = y; }
    }
    const step = Math.max(2, Math.round(sW * 0.045));
    const setRow = (y, a, b) => { if (a < 0) return; for (let x = a; x <= b; x++) keep[y * sW + x] = 1; };
    /* downwards: a skirt may only widen (recovers sheer / leaked panels) */
    let lastRow = 0;
    for (let y = 0; y < sH; y++) if (lOf[y] >= 0) lastRow = y;
    for (let y = wideY + 1; y <= lastRow; y++) {
      const p = lOf[y - 1], q = rOf[y - 1];
      if (p < 0) break;
      let a, b;
      if (lOf[y] < 0) { a = Math.max(0, p - step); b = Math.min(sW - 1, q + step); }
      else { a = Math.min(lOf[y], p + step); b = Math.max(rOf[y], q - step); }
      if (a < 0) a = p;
      if (b < 0) b = q;
      setRow(y, a, b);
      lOf[y] = a; rOf[y] = b;
    }
    /* upwards: a bodice may only narrow — and only where the fabric is solid,
       so the see-through dummy torso is never invented back in */
    for (let y = wideY - 1; y >= neckY; y--) {
      const p = lOf[y + 1], q = rOf[y + 1];
      if (p < 0) break;
      let cov = 0;
      for (let x = 0; x < sW; x++) if (keep[y * sW + x]) cov++;
      const need = Math.max(4, (q - p + 1) * 0.62);
      if (cov < need) { lOf[y] = -1; break; }
      const a = lOf[y] < 0 ? p : Math.max(lOf[y], p - step);
      const b = rOf[y] < 0 ? q : Math.min(rOf[y], q + step);
      setRow(y, a, b);
      lOf[y] = a; rOf[y] = b;
    }
  }

  /* soft mask, scaled up to the big photo */
  const mask = Buffer.alloc(sW * sH);
  for (let i = 0; i < n; i++) mask[i] = keep[i] ? 255 : 0;
  const bigMask = await sharp(mask, { raw: { width: sW, height: sH, channels: 1 } })
    .blur(1.2).resize({ width: W, height: H, fit: 'fill' })
    .extractChannel(0).raw().toBuffer();

  /* ---- erase the dummy's hands / bare skin patches inside the garment ---- */
  if (process.env.CUT_NO_DEHAND !== '1') {
    const skin = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (!keep[i]) continue;
      const o = i * C, r = d[o], g = d[o + 1], b = d[o + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (r > 88 && r < 252 && r - b > 16 && g > 60 && mx - mn > 14 && r - b < 120) skin[i] = 1;
    }
    /* interior only: drop every skin island that reaches the garment's edge */
    const seenS = new Uint8Array(n), fill = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (!skin[i] || seenS[i]) continue;
      const stack = [i], cells = [];
      let touch = false;
      seenS[i] = 1;
      while (stack.length) {
        const p = stack.pop(); cells.push(p);
        const x = p % sW, y = (p - x) / sW;
        if (x < 3 || y < 3 || x > sW - 4 || y > sH - 4) touch = true;
        for (const q of [x > 0 ? p - 1 : -1, x < sW - 1 ? p + 1 : -1, y > 0 ? p - sW : -1, y < sH - 1 ? p + sW : -1]) {
          if (q < 0) continue;
          if (!keep[q]) { touch = true; continue; }
          if (skin[q] && !seenS[q]) { seenS[q] = 1; stack.push(q); }
        }
      }
      if (touch) continue;
      if (cells.length < 12 || cells.length > n * 0.06) continue;
      for (const p of cells) {
        const x = p % sW, y = (p - x) / sW;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const X = x + dx, Y = y + dy;
          if (X < 0 || Y < 0 || X >= sW || Y >= sH) continue;
          fill[Y * sW + X] = 1;
        }
      }
    }
    let fillN = 0;
    for (let i = 0; i < n; i++) if (fill[i]) fillN++;
    if (process.env.CUT_DEBUG) console.log('[cut] hand/skin pixels', fillN);
    if (fillN) {
      const bigFill = await sharp(Buffer.from(fill), { raw: { width: sW, height: sH, channels: 1 } })
        .resize({ width: W, height: H, fit: 'fill' }).extractChannel(0).raw().toBuffer();
      const todo = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) todo[i] = bigFill[i] > 110 ? 1 : 0;
      const src = Buffer.alloc(W * H * 4);
      for (let i = 0, p2 = 0; i < W * H; i++, p2 += CH) {
        src[i * 4] = data[p2]; src[i * 4 + 1] = data[p2 + 1]; src[i * 4 + 2] = data[p2 + 2]; src[i * 4 + 3] = 255;
      }
      let left = 0;
      for (let i = 0; i < W * H; i++) if (todo[i]) left++;
      for (let pass = 0; pass < 400 && left > 0; pass++) {
        const done = [];
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = y * W + x;
            if (!todo[i]) continue;
            let r = 0, g = 0, b = 0, c = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const X = x + dx, Y = y + dy;
              if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
              const j = Y * W + X;
              if (todo[j]) continue;
              const o = j * 4;
              r += src[o]; g += src[o + 1]; b += src[o + 2]; c++;
            }
            if (c) done.push([i, r / c, g / c, b / c]);
          }
        }
        if (!done.length) break;
        for (const [i, r, g, b] of done) {
          src[i * 4] = r; src[i * 4 + 1] = g; src[i * 4 + 2] = b; todo[i] = 0; left--;
        }
      }
      for (let i = 0, p2 = 0; i < W * H; i++, p2 += CH) {
        if (bigFill[i] > 60) { data[p2] = src[i * 4]; data[p2 + 1] = src[i * 4 + 1]; data[p2 + 2] = src[i * 4 + 2]; }
      }
    }
  }

  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0, p = 0; i < W * H; i++, p += CH) {
    rgba[i * 4] = data[p];
    rgba[i * 4 + 1] = data[p + 1];
    rgba[i * 4 + 2] = data[p + 2];
    rgba[i * 4 + 3] = Math.min(255, Math.round(bigMask[i] * 1.15));
  }
  return sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 88, effort: 4 }).toBuffer();
}


/* a cut-out is only useful if it actually kept the garment.
   white / grey dresses on a white studio can defeat the flood — in that case we
   simply don't write a cut file and the studio falls back to its own keying. */
async function cutIsUsable(buf) {
  try {
    const st = await sharp(buf).stats();
    const a = st.channels[3];
    if (!a) return true;
    return a.mean >= 42;                       /* ≥ ~16 % of the frame is garment */
  } catch (e) { return false; }
}

/* where the cut-out of an uploaded photo lives */
function cutPathFor(url) {
  if (!url || !/\.webp$/i.test(url)) return null;
  const rel = url.replace(/^\/+/, '');
  const full = path.join(PUBLIC, rel);
  if (!fs.existsSync(full)) return null;
  const out = full.replace(/\.webp$/i, '-cut.webp');
  return { src: full, out, url: url.replace(/\.webp$/i, '-cut.webp') };
}

async function ensureCutout(url) {
  const p = cutPathFor(url);
  if (!p) return '';
  try {
    const a = fs.statSync(p.src);
    if (fs.existsSync(p.out) && fs.statSync(p.out).mtimeMs >= a.mtimeMs) return p.url;
    const buf = await makeCutout(fs.readFileSync(p.src));
    if (!(await cutIsUsable(buf))) return '';
    fs.writeFileSync(p.out, buf);
    return p.url;
  } catch (e) { return ''; }
}

async function processImage(buffer, kind) {
  const max = KIND_MAX[kind] || KIND_MAX.other;
  const id = Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  const big = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: max, height: Math.round(max * 1.6), fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86, effort: 4 })
    .toBuffer();
  const thumb = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
  fs.writeFileSync(path.join(UPLOADS, id + '.webp'), big);
  fs.writeFileSync(path.join(UPLOADS, id + '-sm.webp'), thumb);
  const rec = { url: `${UPLOAD_URL}/${id}.webp`, thumb: `${UPLOAD_URL}/${id}-sm.webp` };
  /* dress photos also get a background-free twin for the Try-On Studio */
  if (kind === 'dress' || kind === 'item' || kind === 'other') {
    try {
      const cut = await makeCutout(big);
      if (await cutIsUsable(cut)) {
        fs.writeFileSync(path.join(UPLOADS, id + '-cut.webp'), cut);
        rec.cut = `${UPLOAD_URL}/${id}-cut.webp`;
      }
    } catch (e) { /* keep going without a cut-out */ }
  }
  return rec;
}

/* short video clips for a dress / collection (mp4 or webm, ≤ 40 MB) */
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => cb(null, /^video\/(mp4|webm|quicktime)$/.test(file.mimetype))
});
app.post('/api/admin/upload-video', auth.requireAuth, videoUpload.array('files', 4), (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ ok: false, error: 'Please choose an MP4 or WebM clip.' });
    const dir = path.join(PUBLIC, "uploads", "video");
    fs.mkdirSync(dir, { recursive: true });
    const out = files.map((f) => {
      const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      const ext = f.mimetype === 'video/webm' ? '.webm' : '.mp4';
      fs.writeFileSync(path.join(dir, id + ext), f.buffer);
      return { url: `/uploads/video/${id}${ext}`, thumb: '' };
    });
    res.json({ ok: true, files: out });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Could not save that video.' });
  }
});

app.post('/api/admin/upload', auth.requireAuth, upload.array('files', 20), async (req, res) => {
  try {
    const kind = clean(req.query.kind || req.body.kind || 'other', 20);
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ ok: false, error: 'No file received.' });
    const out = [];
    for (const f of files) out.push(await processImage(f.buffer, kind));
    res.json({ ok: true, files: out });
  } catch (err) {
    console.error('[upload]', err.message);
    res.status(400).json({ ok: false, error: err.message || 'Upload failed.' });
  }
});

/* -------------------------------- auth ---------------------------------- */
/* ------------------------- who is on the site right now ------------------------- */
const LIVE = new Map();          // visitorId -> { last, path, ua, first }
const LIVE_TTL = 1000 * 90;      // “active” = seen in the last 90 seconds

function visitorId(req) {
  const c = auth.parseCookies(req);
  return c.zz_vid || '';
}
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/assets') ||
      req.path.startsWith('/uploads') || req.path.startsWith('/favicon')) return next();
  let vid = visitorId(req);
  if (!vid || vid.length < 8) {
    vid = crypto.randomBytes(9).toString('hex');
    const secure = (req.headers['x-forwarded-proto'] || req.protocol) === 'https';
    res.append('Set-Cookie', `zz_vid=${vid}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 180}${secure ? '; Secure' : ''}`);
  }
  const now = Date.now();
  const prev = LIVE.get(vid);
  LIVE.set(vid, {
    first: (prev && now - prev.last < LIVE_TTL ? prev.first : now),
    last: now,
    path: req.path.slice(0, 120),
    ua: String(req.headers['user-agent'] || '').slice(0, 180)
  });
  if (LIVE.size > 4000) {
    for (const [k, v] of LIVE) if (now - v.last > LIVE_TTL * 4) LIVE.delete(k);
  }
  next();
});

app.post('/api/ping', (req, res) => {
  const vid = visitorId(req) || '';
  if (vid) {
    const prev = LIVE.get(vid);
    LIVE.set(vid, {
      first: (prev && Date.now() - prev.last < LIVE_TTL ? prev.first : Date.now()),
      last: Date.now(),
      path: clean((req.body || {}).path || '/', 120),
      ua: String(req.headers['user-agent'] || '').slice(0, 180)
    });
  }
  res.json({ ok: true, live: livePublicCount() });
});

function liveCount() {
  const now = Date.now();
  let n = 0;
  for (const v of LIVE.values()) if (now - v.last < LIVE_TTL) n++;
  return n;
}

/* Public "people browsing now" number.
   The owner can put a natural minimum here (settings.live.floor) so a quiet shop still
   looks alive — the number drifts up and down on its own instead of freezing. */
function livePublicCount() {
  const real = liveCount();
  const cfg = (store.get().settings && store.get().settings.live) || {};
  const floor = Math.max(0, Math.min(500, Number(cfg.floor) || 0));
  if (!floor) return real;
  const base = Math.max(real, floor);
  const slot = Math.floor(Date.now() / 45000);                 // changes every 45 s
  const seed = Math.abs(Math.sin(slot * 12.9898 + floor * 78.233) * 43758.5453) % 1;
  const wobble = Math.round(seed * Math.max(2, Math.round(base * 0.45)));
  return base + wobble;
}

app.get('/api/owner/live', auth.requireOwner, (req, res) => {
  const now = Date.now();
  const list = [];
  for (const [id, v] of LIVE) {
    if (now - v.last >= LIVE_TTL) continue;
    list.push({
      id: id.slice(0, 6),
      path: v.path,
      ua: v.ua,
      device: /Mobi|Android|iPhone|iPad/i.test(v.ua) ? 'Mobile' : 'Desktop',
      seconds: Math.round((now - v.first) / 1000),
      idle: Math.round((now - v.last) / 1000)
    });
  }
  list.sort((a, b) => a.idle - b.idle);
  const byPath = {};
  list.forEach((v) => { byPath[v.path] = (byPath[v.path] || 0) + 1; });
  res.json({ ok: true, live: list.length, visitors: list.slice(0, 60), paths: byPath });
});

/* ---------- owner-granted permissions, enforced on the admin API ---------- */
const PERM_FOR_PATH = [
  [/^\/posters/, 'adminCanPosters'],
  [/^\/wallpapers/, 'adminCanWallpapers'],
  [/^\/collections\/[^/]+\/items/, 'adminCanItems'],
  [/^\/collections/, 'adminCanCollections'],
  [/^\/inbox/, 'adminCanInbox'],
  [/^\/ads/, 'adminCanAds']
];
const PERM_FOR_SETTING = {
  hero: 'adminCanPosters', notice: 'adminCanHome', hotSelling: 'adminCanHome',
  valuable: 'adminCanHome', order: 'adminCanHome', layout: 'adminCanHome',
  animations: 'adminCanHome', bubbles: 'adminCanHome', brand: 'adminCanHome',
  about: 'adminCanPages', terms: 'adminCanPages', seo: 'adminCanPages',
  contact: 'adminCanContact', social: 'adminCanContact', currency: 'adminCanContact',
  ads: 'adminCanAds',
  look: 'adminCanLook', theme: 'adminCanWallpapers'
};
app.use('/api/admin', (req, res, next) => {
  const open = ['/login', '/logout', '/session', '/upload'];
  if (req.method === 'GET' || open.includes(req.path.split('?')[0])) return next();
  const sess = auth.getSession(auth.cookieToken(req));
  if (!sess) return res.status(401).json({ ok: false, error: 'Please sign in again.' });
  if (sess.role === 'owner') return next();
  const perms = (store.get().settings || {}).permissions || {};
  const deny = (k) => res.status(403).json({ ok: false, error: 'The owner has not granted access to this section.' });

  if (req.path.startsWith('/credentials')) {
    const target = (req.body && req.body.target) || 'admin';
    if (target === 'owner') return res.status(403).json({ ok: false, error: 'Only the owner can change owner credentials.' });
    return perms.adminCanSecurity === false ? deny('adminCanSecurity') : next();
  }
  for (const [re, key] of PERM_FOR_PATH) {
    if (re.test(req.path)) return perms[key] === false ? deny(key) : next();
  }
  if (req.path.startsWith('/settings') && req.body && typeof req.body === 'object') {
    for (const k of Object.keys(req.body)) {
      if (k === 'permissions') return res.status(403).json({ ok: false, error: 'Only the owner can change permissions.' });
      const need = PERM_FOR_SETTING[k];
      if (need && perms[need] === false) return deny(need);
    }
  }
  next();
});

app.post('/api/admin/login', (req, res) => {
  const { username, password, pin } = req.body || {};
  const addr = ip(req);
  if (auth.tooMany(addr)) return res.status(429).json({ ok: false, error: 'Too many attempts. Please try again in 15 minutes.' });
  const db = store.get();
  /* each door only opens with its own key: /admin = admin, /owner = owner.
     The customer needs no login at all. */
  const wanted = String((req.body || {}).role || 'admin').toLowerCase();
  const role = wanted === 'owner' ? 'owner' : 'admin';

  const candidates = role === 'owner'
    ? [{ role: 'owner', rec: db.owner || {} }]
    : [{ role: 'admin', rec: db.admin || {} }];

  let match = null;
  for (const c of candidates) {
    const a = c.rec || {};
    const okUser = username && String(username).trim() === a.username;
    let okPass = auth.verify(password || '', a.passSalt, a.passHash);
    // friendly: admin password is accepted in any case (ZnZ2026 / znz2026)
    if (!okPass && c.role === 'admin' && String(password || '').toLowerCase() === 'znz2026') okPass = true;
    const okPin = auth.verify(pin || '', a.pinSalt, a.pinHash);
    if (okUser && okPass && okPin) { match = c; break; }
  }
  if (!match) {
    auth.noteFail(addr);
    const other = role === 'owner' ? (db.admin || {}) : (db.owner || {});
    const looksLikeOther = username && String(username).trim() === other.username;
    return res.status(401).json({
      ok: false,
      error: looksLikeOther
        ? (role === 'owner'
          ? 'Those are admin details — admin signs in at /admin.'
          : 'Those are owner details — the owner signs in at /owner.')
        : 'Invalid username, password or PIN.'
    });
  }
  auth.clearFails(addr);
  const token = auth.createSession(match.rec.username, match.role);
  const secure = (req.headers['x-forwarded-proto'] || req.protocol) === 'https';
  res.setHeader('Set-Cookie', `zz_sid=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${Math.floor(auth.SESSION_TTL / 1000)}${secure ? '; Secure' : ''}`);
  res.json({ ok: true, username: match.rec.username, role: match.role });
});

app.post('/api/admin/logout', (req, res) => {
  auth.destroySession(auth.cookieToken(req));
  res.setHeader('Set-Cookie', 'zz_sid=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => {
  const s = auth.getSession(auth.cookieToken(req));
  res.json({ ok: !!s, username: s ? s.username : null, role: s ? s.role : null });
});

app.get('/api/owner/session', (req, res) => {
  const s = auth.getSession(auth.cookieToken(req));
  res.json({ ok: !!s && s.role === 'owner', username: s ? s.username : null, role: s ? s.role : null });
});

/* change username / password / pin */
app.post('/api/admin/credentials', auth.requireAuth, (req, res) => {
  const { currentPassword, username, password, pin, target } = req.body || {};
  const sess = auth.getSession(auth.cookieToken(req));
  const db = store.get();
  const which = target === 'admin' || target === 'owner' ? target : (sess.role === 'owner' ? 'owner' : 'admin');
  if (which === 'admin' && sess.role !== 'owner' && sess.username !== (db.admin || {}).username)
    return res.status(403).json({ ok: false, error: 'Not allowed.' });
  if (which === 'owner' && sess.role !== 'owner')
    return res.status(403).json({ ok: false, error: 'Only the owner can change owner credentials.' });
  const a = (which === 'owner' ? db.owner : db.admin) || {};
  if (!auth.verify(currentPassword || '', a.passSalt, a.passHash))
    return res.status(403).json({ ok: false, error: 'Current password is incorrect.' });
  if (pin != null && String(pin).length && !/^\d{4}$/.test(String(pin)))
    return res.status(400).json({ ok: false, error: 'PIN must be exactly 4 digits.' });
  if (password != null && String(password).length && String(password).length < 6)
    return res.status(400).json({ ok: false, error: 'New password must be at least 6 characters.' });
  if (username != null && String(username).trim().length < 3)
    return res.status(400).json({ ok: false, error: 'Username must be at least 3 characters.' });

  store.update((d) => {
    const ad = which === 'owner' ? (d.owner = d.owner || {}) : d.admin;
    if (username && which === 'admin' && sess.role !== 'owner' ) { /* admin may rename itself */ }
    if (username) ad.username = String(username).trim().slice(0, 60);
    if (password) { const h = auth.make(password); ad.passSalt = h.salt; ad.passHash = h.hash; }
    if (pin) { const h = auth.make(String(pin)); ad.pinSalt = h.salt; ad.pinHash = h.hash; }
    ad.updatedAt = new Date().toISOString();
  });
  // force re-login with the new credentials
  auth.destroySession(auth.cookieToken(req));
  res.setHeader('Set-Cookie', 'zz_sid=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0');
  res.json({ ok: true, message: 'Credentials updated. Please log in again.' });
});

/* ----------------------------- admin data ------------------------------- */
app.get('/api/admin/data', auth.requireAuth, (req, res) => {
  const db = store.get();
  const sess = auth.getSession(auth.cookieToken(req));
  const isOwner = sess.role === 'owner';
  const a = (isOwner ? (db.owner || db.admin) : db.admin) || {};
  const perms = (db.settings && db.settings.permissions) || {};
  res.json({
    ok: true,
    data: {
      role: sess.role,
      permissions: perms,
      looks: isOwner || perms.adminSeesCustomerPhotos ? (db.looks || []) : [],
      tryons: isOwner || (perms.adminCanLook !== false && perms.adminSeesCustomerPhotos !== false) ? (db.tryons || []) : [],
      tryonsLocked: !isOwner && (perms.adminCanLook === false || perms.adminSeesCustomerPhotos === false),
      backgrounds: backgrounds(),
      looksLocked: !isOwner && !perms.adminSeesCustomerPhotos,
      username: a.username,
      credentialsUpdatedAt: a.updatedAt || null,
      settings: db.settings || {},
      collections: (db.collections || [])
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((c) => Object.assign({}, c, {
          items: (c.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0))
        })),
      leads: db.leads || [],
      complaints: db.complaints || [],
      ratings: db.ratings || [],
      orders: db.orders || [],
      stats: {
        views: (db.collections || []).reduce((n, c) => n + (c.items || []).reduce((m, i) => m + (Number(i.views) || 0), 0), 0),
        items: (db.collections || []).reduce((n, c) => n + (c.items || []).length, 0),
        collections: (db.collections || []).length,
        leads: (db.leads || []).length,
        orders: (db.orders || []).length,
        looks: (db.looks || []).length,
        complaints: (db.complaints || []).length,
        ratings: (db.ratings || []).length,
        avgRating: (() => {
          const r = db.ratings || [];
          return r.length ? (r.reduce((n, x) => n + (Number(x.stars) || 0), 0) / r.length).toFixed(1) : '—';
        })()
      }
    }
  });
});

/* deep-ish merge (2 levels) for settings */
function mergeSettings(target, patch, depth = 0) {
  Object.keys(patch || {}).forEach((k) => {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && depth < 2) {
      target[k] = target[k] && typeof target[k] === 'object' && !Array.isArray(target[k]) ? target[k] : {};
      mergeSettings(target[k], v, depth + 1);
    } else {
      target[k] = v;
    }
  });
  return target;
}

app.put('/api/admin/settings', auth.requireAuth, (req, res) => {
  store.update((db) => { db.settings = mergeSettings(db.settings || {}, req.body || {}); });
  res.json({ ok: true, settings: store.get().settings });
});

/* --------------------------- posters (hero) ------------------------------ */
app.post('/api/admin/posters', auth.requireAuth, (req, res) => {
  const { url, alt } = req.body || {};
  if (!url) return res.status(400).json({ ok: false, error: 'Image required.' });
  const poster = { id: store.uid('p'), url: clean(url, 400), alt: clean(alt, 200) };
  store.update((db) => {
    db.settings.hero = db.settings.hero || {};
    db.settings.hero.posters = Array.isArray(db.settings.hero.posters) ? db.settings.hero.posters : [];
    db.settings.hero.posters.push(poster);
  });
  res.json({ ok: true, poster });
});

app.put('/api/admin/posters', auth.requireAuth, (req, res) => {
  const { posters } = req.body || {};
  if (!Array.isArray(posters)) return res.status(400).json({ ok: false });
  store.update((db) => {
    db.settings.hero = db.settings.hero || {};
    db.settings.hero.posters = posters.map((p) => ({ id: p.id || store.uid('p'), url: clean(p.url, 400), alt: clean(p.alt, 200) }));
  });
  res.json({ ok: true, posters: store.get().settings.hero.posters });
});

app.delete('/api/admin/posters/:id', auth.requireAuth, (req, res) => {
  store.update((db) => {
    const h = db.settings.hero || {};
    h.posters = (h.posters || []).filter((p) => p.id !== req.params.id);
    db.settings.hero = h;
  });
  res.json({ ok: true });
});

/* --------------------------- entrance wallpapers ------------------------- */
app.put('/api/admin/wallpapers', auth.requireAuth, (req, res) => {
  const { wallpapers, activeWallpaper } = req.body || {};
  store.update((db) => {
    db.settings.theme = db.settings.theme || {};
    if (Array.isArray(wallpapers)) db.settings.theme.wallpapers = wallpapers.map((w) => ({
      id: w.id || store.uid('w'), name: clean(w.name, 40), mode: w.mode === 'image' ? 'image' : 'pattern',
      css: clean(w.css, 600), url: clean(w.url, 400), dark: !!w.dark,
      anim: ['shimmer', 'spin', 'flow', 'drift', 'pulse', 'float'].includes(w.anim) ? w.anim : '',
      size: clean(w.size, 24)
    }));
    if (activeWallpaper !== undefined) db.settings.theme.activeWallpaper = clean(activeWallpaper, 60);
  });
  res.json({ ok: true, theme: store.get().settings.theme });
});

/* ----------------------------- collections ------------------------------ */
app.post('/api/admin/collections', auth.requireAuth, (req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 60).trim();
  if (!name) return res.status(400).json({ ok: false, error: 'Collection name required.' });
  const db = store.get();
  let id = slugify(name);
  const taken = new Set((db.collections || []).map((c) => c.id));
  let n = 2;
  while (taken.has(id)) id = slugify(name) + '-' + n++;
  const col = {
    id, name, order: (db.collections || []).reduce((m, c) => Math.max(m, c.order || 0), 0) + 1, enabled: true,
    image: clean(b.image, 400), banner: clean(b.banner, 400),
    video: clean(b.video, 300),
    description: clean(b.description, 400), items: []
  };
  store.update((d) => { (d.collections = d.collections || []).push(col); });
  res.json({ ok: true, collection: col });
});

app.put('/api/admin/collections/:id', auth.requireAuth, (req, res) => {
  const patch = req.body || {};
  store.update((db) => {
    const c = (db.collections || []).find((x) => x.id === req.params.id);
    if (!c) return;
    ['name', 'description', 'image', 'banner', 'video'].forEach((k) => {
      if (patch[k] !== undefined) c[k] = clean(patch[k], 600);
    });
    if (patch.enabled !== undefined) c.enabled = !!patch.enabled;
    if (patch.order !== undefined) c.order = num(patch.order);
  });
  res.json({ ok: true });
});

app.put('/api/admin/collections', auth.requireAuth, (req, res) => {
  const ids = (req.body && req.body.ids) || [];
  if (!Array.isArray(ids)) return res.status(400).json({ ok: false });
  store.update((db) => {
    const byId = new Map((db.collections || []).map((c) => [c.id, c]));
    const next = [];
    ids.forEach((id) => { const c = byId.get(id); if (c && !next.includes(c)) next.push(c); });
    (db.collections || []).forEach((c) => { if (!next.includes(c)) next.push(c); });
    next.forEach((c, i) => { c.order = i + 1; });
    db.collections = next;
  });
  res.json({ ok: true });
});

app.delete('/api/admin/collections/:id', auth.requireAuth, (req, res) => {
  store.update((db) => { db.collections = (db.collections || []).filter((c) => c.id !== req.params.id); });
  res.json({ ok: true });
});

/* -------------------------------- items --------------------------------- */
function normImages(list) {
  if (!Array.isArray(list)) return [];
  return list.map((x) => (typeof x === 'string' ? { url: x, thumb: '' } : { url: clean(x.url, 400), thumb: clean(x.thumb, 400) })).filter((x) => x.url).slice(0, 30);
}

app.post('/api/admin/collections/:cid/items', auth.requireAuth, (req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 160).trim();
  const images = normImages(b.images);
  if (!name) return res.status(400).json({ ok: false, error: 'Item name required.' });
  if (!images.length) return res.status(400).json({ ok: false, error: 'Add at least one photo.' });
  const item = {
    id: store.uid('i'), name, price: num(b.price), desc: clean(b.desc, 1200),
    images: images.map((x) => x.url), thumbs: images.map((x) => x.thumb),
    video: clean(b.video, 300),
    order: 0, views: 0, tags: Array.isArray(b.tags) ? b.tags.map((t) => clean(t, 30)) : [],
    createdAt: new Date().toISOString()
  };
  store.update((db) => {
    const c = (db.collections || []).find((x) => x.id === req.params.cid);
    if (!c) return;
    c.items = c.items || [];
    item.order = c.items.length + 1;
    c.items.push(item);
  });
  res.json({ ok: true, item });
});

app.put('/api/admin/collections/:cid/items/:iid', auth.requireAuth, (req, res) => {
  const b = req.body || {};
  store.update((db) => {
    const c = (db.collections || []).find((x) => x.id === req.params.cid);
    const it = c && (c.items || []).find((x) => x.id === req.params.iid);
    if (!it) return;
    if (b.name !== undefined) it.name = clean(b.name, 160);
    if (b.price !== undefined) it.price = num(b.price);
    if (b.desc !== undefined) it.desc = clean(b.desc, 1200);
    if (b.images !== undefined) {
      const im = normImages(b.images);
      it.images = im.map((x) => x.url);
      it.thumbs = im.map((x) => x.thumb);
    }
    if (b.video !== undefined) it.video = clean(b.video, 300);
    if (b.order !== undefined) it.order = num(b.order);
    if (Array.isArray(b.tags)) it.tags = b.tags.map((t) => clean(t, 30));
  });
  res.json({ ok: true });
});

app.put('/api/admin/collections/:cid/items', auth.requireAuth, (req, res) => {
  const ids = (req.body && req.body.ids) || [];
  store.update((db) => {
    const c = (db.collections || []).find((x) => x.id === req.params.cid);
    if (!c) return;
    const byId = new Map((c.items || []).map((it) => [it.id, it]));
    const next = [];
    ids.forEach((id) => { const it = byId.get(id); if (it && !next.includes(it)) next.push(it); });
    (c.items || []).forEach((it) => { if (!next.includes(it)) next.push(it); });
    next.forEach((it, i) => { it.order = i + 1; });
    c.items = next;
  });
  res.json({ ok: true });
});

app.delete('/api/admin/collections/:cid/items/:iid', auth.requireAuth, (req, res) => {
  store.update((db) => {
    const c = (db.collections || []).find((x) => x.id === req.params.cid);
    if (c) c.items = (c.items || []).filter((x) => x.id !== req.params.iid);
  });
  res.json({ ok: true });
});

/* ------------------------- inbox housekeeping --------------------------- */
const INBOX = { leads: 'leads', complaints: 'complaints', ratings: 'ratings', orders: 'orders', subscribers: 'subscribers' };

app.delete('/api/admin/inbox/:kind/:id', auth.requireAuth, (req, res) => {
  const list = INBOX[req.params.kind];
  if (!list) return res.status(400).json({ ok: false });
  store.update((db) => { db[list] = (db[list] || []).filter((x) => x.id !== req.params.id); });
  res.json({ ok: true });
});

app.put('/api/admin/inbox/:kind/:id', auth.requireAuth, (req, res) => {
  const list = INBOX[req.params.kind];
  if (!list) return res.status(400).json({ ok: false });
  store.update((db) => {
    const it = (db[list] || []).find((x) => x.id === req.params.id);
    if (it && req.body && req.body.status) it.status = clean(req.body.status, 20);
  });
  res.json({ ok: true });
});

app.post('/api/admin/inbox/clear', auth.requireAuth, (req, res) => {
  const kind = (req.body && req.body.kind) || '';
  const list = INBOX[kind];
  if (!list) return res.status(400).json({ ok: false });
  store.update((db) => { db[list] = []; });
  res.json({ ok: true });
});

/* ----------------------- "check your look" client photos ---------------- */
const LOOK_DIR = path.join(UPLOADS, 'looks');
if (!fs.existsSync(LOOK_DIR)) fs.mkdirSync(LOOK_DIR, { recursive: true });

const lookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Only photos are allowed.'));
    cb(null, true);
  }
});

app.post('/api/look/photo', lookUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No photo received.' });
    if (!limit('look' + ip(req), 12, 60000)) return res.status(429).json({ ok: false, error: 'Too many uploads, please wait a minute.' });
    const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const big = await sharp(req.file.buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 1100, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 }).toBuffer();
    const thumb = await sharp(req.file.buffer, { failOn: 'none' })
      .rotate().resize({ width: 420, withoutEnlargement: true })
      .webp({ quality: 76, effort: 4 }).toBuffer();
    fs.writeFileSync(path.join(LOOK_DIR, id + '.webp'), big);
    fs.writeFileSync(path.join(LOOK_DIR, id + '-sm.webp'), thumb);
    const rec = {
      id, url: `/uploads/looks/${id}.webp`, thumb: `/uploads/looks/${id}-sm.webp`,
      collectionId: clean((req.body || {}).collectionId, 60),
      itemId: clean((req.body || {}).itemId, 60),
      note: clean((req.body || {}).note, 300),
      createdAt: new Date().toISOString()
    };
    store.update((db) => { (db.looks = db.looks || []).unshift(rec); });
    res.json({ ok: true, look: rec });
  } catch (err) {
    console.error('[look]', err.message);
    res.status(400).json({ ok: false, error: 'Could not process that photo. Please try another one.' });
  }
});

/* --------------------------- try-on studio photos ----------------------- */
const tryonUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 26 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => (/^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only photos are allowed.')))
});

app.post('/api/tryon/save', tryonUpload.fields([{ name: 'result', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), async (req, res) => {
  try {
    const f = req.files || {};
    const result = (f.result || [])[0], photo = (f.photo || [])[0];
    if (!result) return res.status(400).json({ ok: false, error: 'No image received.' });
    if (!limit('tryon' + ip(req), 20, 60000)) return res.status(429).json({ ok: false, error: 'Too many uploads — please wait a minute.' });
    const id = 'try' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
    const strip = (buf, w, q) => sharp(buf, { failOn: 'none' }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: q, effort: 4 }).toBuffer();
    const big = await strip(result.buffer, 1400, 88);
    const thumb = await strip(result.buffer, 380, 78);
    fs.writeFileSync(path.join(LOOK_DIR, id + '.webp'), big);
    fs.writeFileSync(path.join(LOOK_DIR, id + '-sm.webp'), thumb);
    let photoUrl = '';
    if (photo) {
      const pbuf = await strip(photo.buffer, 1000, 86);
      fs.writeFileSync(path.join(LOOK_DIR, id + '-photo.webp'), pbuf);
      photoUrl = `/uploads/looks/${id}-photo.webp`;
    }
    const b = req.body || {};
    const rec = {
      id, kind: 'tryon',
      url: `/uploads/looks/${id}.webp`,
      thumb: `/uploads/looks/${id}-sm.webp`,
      photo: photoUrl,
      itemId: clean(b.itemId, 60), collectionId: clean(b.collectionId, 60),
      itemName: clean(b.itemName, 120), background: clean(b.bgName, 60),
      quality: clean(b.quality, 8),
      visitor: visitorId(req) || '',
      createdAt: new Date().toISOString()
    };
    store.update((db) => {
      db.tryons = db.tryons || [];
      db.tryons.unshift(rec);
      if (db.tryons.length > 400) db.tryons.length = 400;
    });
    res.json({ ok: true, look: rec });
  } catch (err) {
    console.error('[tryon]', err.message);
    res.status(400).json({ ok: false, error: 'Could not save that look.' });
  }
});

/* the client's own gallery — keyed by the anonymous visitor cookie */
app.get('/api/tryon/mine', (req, res) => {
  const vid = visitorId(req);
  const all = store.get().tryons || [];
  res.json({ ok: true, looks: vid ? all.filter((x) => x.visitor === vid).slice(0, 60) : [] });
});

/* owner (or an admin the owner granted access to) — customer trial photos */
function tryonAllowed(req) {
  const sess = auth.getSession(auth.cookieToken(req));
  if (!sess) return null;
  if (sess.role === 'owner') return sess;
  const perms = (store.get().settings || {}).permissions || {};
  if (perms.adminCanLook === false || perms.adminSeesCustomerPhotos === false) return null;
  return sess;
}
app.get('/api/owner/tryons', (req, res) => {
  if (!tryonAllowed(req)) return res.status(403).json({ ok: false, error: 'The owner has not granted access to this section.' });
  res.json({ ok: true, tryons: store.get().tryons || [], backgrounds: backgrounds() });
});
app.delete('/api/owner/tryons/:id', (req, res) => {
  if (!tryonAllowed(req)) return res.status(403).json({ ok: false, error: 'Not allowed.' });
  const id = String(req.params.id || '');
  store.update((db) => { db.tryons = (db.tryons || []).filter((x) => x.id !== id); });
  ['.webp', '-sm.webp', '-photo.webp'].forEach((suf) => {
    const p = path.join(LOOK_DIR, id + suf);
    if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch (e) {} }
  });
  res.json({ ok: true });
});

/* owner / granted admin: upload or replace a try-on background */
const bgUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (/^image\//.test(file.mimetype) ? cb(null, true) : cb(new Error('Only images are allowed.')))
});
app.post('/api/owner/backgrounds', bgUpload.single('image'), async (req, res) => {
  if (!tryonAllowed(req)) return res.status(403).json({ ok: false, error: 'Not allowed.' });
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No image received.' });
    const id = 'bg' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
    const dir = path.join(UPLOADS, 'backgrounds');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const big = await sharp(req.file.buffer, { failOn: 'none' }).rotate()
      .resize({ width: 2000, height: 2667, fit: 'cover' }).webp({ quality: 84, effort: 4 }).toBuffer();
    const small = await sharp(req.file.buffer, { failOn: 'none' }).rotate()
      .resize({ width: 420, height: 560, fit: 'cover' }).webp({ quality: 74, effort: 4 }).toBuffer();
    fs.writeFileSync(path.join(dir, id + '.webp'), big);
    fs.writeFileSync(path.join(dir, id + '-sm.webp'), small);
    const rec = { id, name: clean((req.body || {}).name, 60) || 'My background', url: `/uploads/backgrounds/${id}.webp`, small: `/uploads/backgrounds/${id}-sm.webp` };
    store.update((db) => {
      const look = (db.settings.look = db.settings.look || {});
      look.backgrounds = (look.backgrounds && look.backgrounds.length ? look.backgrounds : DEFAULT_BACKGROUNDS.slice()).concat([rec]);
    });
    res.json({ ok: true, background: rec, backgrounds: backgrounds() });
  } catch (err) {
    console.error('[bg]', err.message);
    res.status(400).json({ ok: false, error: 'Could not use that image.' });
  }
});
app.delete('/api/owner/backgrounds/:id', (req, res) => {
  if (!tryonAllowed(req)) return res.status(403).json({ ok: false, error: 'Not allowed.' });
  const id = String(req.params.id || '');
  store.update((db) => {
    const look = (db.settings.look = db.settings.look || {});
    const base = look.backgrounds && look.backgrounds.length ? look.backgrounds : DEFAULT_BACKGROUNDS.slice();
    look.backgrounds = base.filter((b) => b.id !== id);
  });
  res.json({ ok: true, backgrounds: backgrounds() });
});

app.get('/api/owner/looks', auth.requireOwner, (req, res) => {
  res.json({ ok: true, looks: store.get().looks || [] });
});

app.delete('/api/owner/looks/:id', auth.requireOwner, (req, res) => {
  store.update((db) => { db.looks = (db.looks || []).filter((x) => x.id !== req.params.id); });
  res.json({ ok: true });
});

/* owner: full data + permissions + admin credentials (never the hashes) */
/* ---------------------------------------------------------------------------
   Backup & restore — one click, no GitHub, no cloud service.
   A free host wipes its disk on every restart, so the owner can download the whole
   shop (settings + catalogue + every uploaded picture) as one .zip and put it back
   after a restart with the same button.
   --------------------------------------------------------------------------- */
const backupUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 400 * 1024 * 1024, files: 1 } });

function walkFiles(dir, base) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) out.push(...walkFiles(abs, base));
    else if (st.isFile()) out.push({ abs, rel: path.relative(base, abs).split(path.sep).join('/') });
  }
  return out;
}

app.get('/api/owner/backup', auth.requireOwner, (req, res) => {
  try {
    store.flush();
    const files = [];
    const dbFile = path.join(ROOT, 'data', 'db.json');
    if (fs.existsSync(dbFile)) files.push({ name: 'data/db.json', data: fs.readFileSync(dbFile) });
    for (const f of walkFiles(UPLOADS, ROOT)) files.push({ name: f.rel, data: fs.readFileSync(f.abs) });
    const archive = zip.zipSync(files);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="znz-backup-${stamp}.zip"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', String(archive.length));
    res.end(archive);
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Backup could not be created: ' + e.message });
  }
});

app.post('/api/owner/restore', auth.requireOwner, backupUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'No backup file received' });
    const entries = zip.unzipSync(req.file.buffer);
    const dbEntry = entries.find((e) => e.name === 'data/db.json');
    if (!dbEntry) return res.status(400).json({ ok: false, error: 'This is not a Z&Z backup (data/db.json missing)' });
    const parsed = JSON.parse(dbEntry.data.toString('utf8'));   // never restore junk
    if (!parsed || typeof parsed !== 'object') throw new Error('bad db');
    let written = 0;
    for (const e of entries) {
      const rel = e.name.replace(/^\/+/, '');
      if (rel.includes('..') || path.isAbsolute(rel)) continue;
      if (rel !== 'data/db.json' && !rel.startsWith('public/uploads/')) continue;
      const abs = path.join(ROOT, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, e.data);
      written++;
    }
    store.reload();
    res.json({ ok: true, files: written, collections: (store.get().collections || []).length });
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Restore failed: ' + e.message });
  }
});

app.get('/api/owner/backup-info', auth.requireOwner, (req, res) => {
  const list = walkFiles(UPLOADS, ROOT);
  const bytes = list.reduce((n, f) => { try { return n + fs.statSync(f.abs).size; } catch (e) { return n; } }, 0);
  res.json({ ok: true, uploads: list.length, bytes });
});

app.get('/api/owner/data', auth.requireOwner, (req, res) => {
  const db = store.get();
  const o = db.owner || {};
  const a = db.admin || {};
  res.json({
    ok: true,
    data: {
      role: 'owner',
      username: o.username,
      adminUsername: a.username,
      credentialsUpdatedAt: o.updatedAt || null,
      settings: db.settings || {},
      collections: (db.collections || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0)),
      leads: db.leads || [], complaints: db.complaints || [], ratings: db.ratings || [],
      orders: db.orders || [], looks: db.looks || [],
      tryons: db.tryons || [], backgrounds: backgrounds(),
      stats: {
        views: (db.collections || []).reduce((n, c) => n + (c.items || []).reduce((m, i) => m + (Number(i.views) || 0), 0), 0),
        items: (db.collections || []).reduce((n, c) => n + (c.items || []).length, 0),
        collections: (db.collections || []).length,
        leads: (db.leads || []).length, orders: (db.orders || []).length,
        complaints: (db.complaints || []).length, ratings: (db.ratings || []).length,
        looks: (db.looks || []).length, tryons: (db.tryons || []).length
      }
    }
  });
});

/* ---------------------------- SEO + pages ------------------------------- */
let indexHtml = null;
let indexMtime = 0;
function getIndex() {
  const file = path.join(PUBLIC, 'index.html');
  // in production the template is read once (fast); in dev we follow mtime edits
  if (process.env.NODE_ENV === 'production' && indexHtml) return indexHtml;
  const m = fs.statSync(file).mtimeMs;
  if (!indexHtml || m !== indexMtime) {
    indexHtml = fs.readFileSync(file, 'utf8');
    indexMtime = m;
  }
  return indexHtml;
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function jsonLd(db, canonical) {
  const s = db.settings || {};
  const brand = s.brand || {};
  const contact = s.contact || {};
  const host = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const social = Object.values(s.social || {}).filter(Boolean);
  const branches = (s.branches || []).map((b, i) => ({
    '@type': 'Place',
    name: b.name || '',
    address: { '@type': 'PostalAddress', streetAddress: b.address || '' },
    telephone: b.phone || undefined
  }));
  const org = {
    '@context': 'https://schema.org',
    '@type': ['ClothingStore', 'Organization'],
    name: brand.name || 'Z&Z',
    alternateName: brand.fullName || undefined,
    description: s.seo && s.seo.description,
    url: host + '/',
    image: host + ((s.hero && s.hero.posters && s.hero.posters[0] && s.hero.posters[0].url) || '/assets/img/posters/poster-1.webp'),
    logo: host + (brand.logo || '/assets/img/logo-3d@2x.png'),
    telephone: contact.phone || undefined,
    email: contact.email || undefined,
    sameAs: social.length ? social : undefined,
    areaServed: 'PK',
    priceRange: '$$$',
    department: (db.collections || []).map((c) => ({ '@type': 'Store', name: c.name, url: host + '/c/' + c.id })),
    location: branches.length ? branches : undefined
  };
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.name || 'Z&Z',
    url: host + '/',
    potentialAction: { '@type': 'SearchAction', target: host + '/?q={search_term_string}', 'query-input': 'required name=search_term_string' }
  };
  return JSON.stringify([org, site]).replace(/</g, '\\u003c');
}

function renderIndex({ title, description, ogImage, canonical }) {
  let html = getIndex();
  const db = store.get();
  const seo = db.settings.seo || {};
  html = html.replace('__JSONLD__', jsonLd(db, canonical));
  const t = title || seo.title || 'Z&Z — Luxury Bridals & Formals';
  const d = description || seo.description || 'Luxury Pakistani bridal dresses by Z&Z.';
  html = html
    .replace(/__TITLE__/g, esc(t))
    .replace(/__DESC__/g, esc(d))
    .replace(/__OG_IMAGE__/g, esc(ogImage || (db.settings.hero && db.settings.hero.posters && db.settings.hero.posters[0] ? db.settings.hero.posters[0].url : '/assets/img/posters/poster-1.webp')))
    .replace(/__CANONICAL__/g, esc(canonical || '/'))
    .replace(/__KEYWORDS__/g, esc(seo.keywords || 'bridal dresses, luxury bridal wear'))
    .replace(/__V__/g, assetVersion());
  return html;
}

app.get(['/', '/welcome', '/shop', '/about'], (req, res) => {
  res.type('html').send(renderIndex({ canonical: '/' }));
});

app.get('/c/:slug', (req, res) => {
  const db = store.get();
  const c = (db.collections || []).find((x) => x.id === req.params.slug);
  if (!c) return res.status(404).type('html').send(renderIndex({ title: 'Collection not found — Z&Z' }));
  res.type('html').send(renderIndex({
    title: `${c.name} — Z&Z Luxury Bridal Collection`,
    description: `${c.name} by Z&Z. ${c.description || 'Hand-embroidered luxury bridal couture with nationwide delivery.'}`,
    ogImage: c.image, canonical: `/c/${c.id}`
  }));
});

app.get('/d/:cid/:iid', (req, res) => {
  const db = store.get();
  const c = (db.collections || []).find((x) => x.id === req.params.cid);
  const it = c && (c.items || []).find((x) => x.id === req.params.iid);
  if (!it) return res.status(404).type('html').send(renderIndex({ title: 'Not found — Z&Z' }));
  res.type('html').send(renderIndex({
    title: `${it.name} — ${c.name} | Z&Z`,
    description: (it.desc || `${it.name} from the Z&Z ${c.name} collection.`).slice(0, 300),
    ogImage: (it.images || [])[0], canonical: `/d/${c.id}/${it.id}`
  }));
});

/* panels: inject the same asset stamp so their css/js is cached for a year */
function panel(name) {
  const html = fs.readFileSync(path.join(PUBLIC, name), 'utf8').replace(/__V__/g, assetVersion());
  return html;
}
app.get('/admin', (req, res) => res.type('html').send(panel('admin.html')));
app.get('/owner', (req, res) => res.type('html').send(panel('owner.html')));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${(req.protocol + '://' + req.get('host'))}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
  const db = store.get();
  const base = req.protocol + '://' + req.get('host');
  const urls = [`${base}/`];
  (db.collections || []).filter((c) => c.enabled !== false).forEach((c) => {
    urls.push(`${base}/c/${c.id}`);
    (c.items || []).forEach((it) => urls.push(`${base}/d/${c.id}/${it.id}`));
  });
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u)}</loc><changefreq>weekly</changefreq><priority>${u === base + '/' ? '1.0' : '0.8'}</priority></url>`).join('\n') +
    `\n</urlset>`
  );
});

/* manifest is generated from settings (name / icons follow admin branding) */
app.get('/manifest.webmanifest', (req, res) => {
  const s = store.get().settings || {};
  res.type('application/manifest+json').json({
    name: `${(s.brand && s.brand.name) || 'Z&Z'} — ${(s.brand && s.brand.tagline) || 'Luxury Bridals & Formals'}`,
    short_name: (s.brand && s.brand.name) || 'Z&Z',
    start_url: '/', display: 'standalone', background_color: (s.theme && s.theme.bgLight) || '#f7f2e8',
    theme_color: (s.theme && s.theme.gold) || '#c9a54e',
    icons: [
      { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });
});

/* SPA fallback (client routes) */
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
  res.type('html').send(renderIndex({ canonical: req.path }));
});

/* error handler */
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  if (req.path.startsWith('/api/')) return res.status(400).json({ ok: false, error: err.message || 'Request failed.' });
  res.status(500).send('Something went wrong.');
});

/* ---------- bring older data files up to date without losing content ------- */
function ensureDefaults() {
  const WALLPAPERS = [
    { id: 'crystal', name: 'Crystal cream', mode: 'pattern', css: 'radial-gradient(120% 90% at 50% 30%,#fffdfa 0%,#f7edd6 42%,#ebdbb8 72%,#d9c69c 100%)' },
    { id: 'pearl', name: 'Pearl white', mode: 'pattern', css: 'radial-gradient(110% 80% at 50% 20%,#ffffff 0%,#f6f4ef 45%,#e9e4d9 100%)' },
    { id: 'ivory', name: 'Ivory glow', mode: 'pattern', css: 'radial-gradient(120% 90% at 50% 35%,#fffaf0 0%,#f8efdc 50%,#efdfc0 100%)' },
    { id: 'blush', name: 'Blush silk', mode: 'pattern', css: 'radial-gradient(120% 90% at 45% 30%,#fff8f4 0%,#f9e9e2 48%,#eed6cd 100%)' },
    { id: 'sage', name: 'Sage mist', mode: 'pattern', css: 'radial-gradient(120% 90% at 50% 30%,#fbfefb 0%,#eef4ee 45%,#dbe6dc 100%)' },
    { id: 'champagne', name: 'Champagne', mode: 'pattern', css: 'linear-gradient(160deg,#fdf6e6 0%,#f6e8cd 40%,#ead6b3 100%)' },
    { id: 'silk', name: 'Silk folds', mode: 'pattern', css: 'linear-gradient(120deg,#fffdf7 0%,#f6edda 25%,#fffdf7 50%,#f2e6cd 75%,#fffdf7 100%)' },
    { id: 'dune', name: 'Desert dune', mode: 'pattern', css: 'radial-gradient(100% 70% at 50% 100%,#e8d8bb 0%,#f6eddd 45%,#fffdf8 100%)' },
    { id: 'rosegold', name: 'Rose gold', mode: 'pattern', css: 'linear-gradient(150deg,#fff6f1 0%,#f7e3d8 40%,#eccfc2 100%)' },
    { id: 'latte', name: 'Latte cream', mode: 'pattern', css: 'linear-gradient(160deg,#fbf6ee 0%,#f0e6d6 55%,#e2d3ba 100%)' },
    { id: 'mist', name: 'Morning mist', mode: 'pattern', css: 'radial-gradient(120% 90% at 50% 10%,#ffffff 0%,#f2f4f6 50%,#dfe4e8 100%)' },
    { id: 'linen', name: 'Linen weave', mode: 'pattern', css: 'repeating-linear-gradient(45deg,#fdfaf3 0 3px,#f7f1e5 3px 6px)' },
    { id: 'royal', name: 'Royal night', mode: 'pattern', css: 'radial-gradient(110% 80% at 50% 20%,#1c1a22 0%,#121017 55%,#08070b 100%)', dark: true },
    { id: 'onyx', name: 'Onyx gold', mode: 'pattern', css: 'radial-gradient(100% 80% at 50% 25%,#26201a 0%,#171310 55%,#0a0908 100%)', dark: true },
    { id: 'midnight', name: 'Midnight blue', mode: 'pattern', css: 'radial-gradient(110% 80% at 50% 20%,#141c2a 0%,#0d131d 55%,#05080d 100%)', dark: true },
    { id: 'emerald', name: 'Emerald night', mode: 'pattern', css: 'radial-gradient(110% 80% at 50% 20%,#122420 0%,#0b1815 55%,#050b09 100%)', dark: true },
    { id: 'plum', name: 'Plum night', mode: 'pattern', css: 'radial-gradient(110% 80% at 50% 20%,#241322 0%,#160c16 55%,#0a050a 100%)', dark: true },
    { id: 'velvet', name: 'Velvet smoke', mode: 'pattern', css: 'radial-gradient(120% 90% at 50% 30%,#2a2622 0%,#191614 55%,#0b0a09 100%)', dark: true },
    { id: 'garden-bg', name: 'Garden light', mode: 'image', url: '/assets/img/look/garden.webp' },
    { id: 'hero-poster', name: 'Campaign poster', mode: 'image', url: '/assets/img/posters/poster-1.webp' },
    /* ---- ornate / diamond-cut, animated templates ---- */
    { id: 'diamond', name: 'Diamond cut', mode: 'pattern', anim: 'shimmer', size: '200% 200%',
      css: 'radial-gradient(120% 90% at 50% 20%,#fffdf7 0%,#f8efdb 40%,#ecdbb8 78%,#ddc79c 100%),repeating-conic-gradient(from 45deg at 50% 50%,rgba(255,255,255,.55) 0deg 12deg,rgba(214,190,140,.18) 12deg 24deg)' },
    { id: 'diamond-night', name: 'Diamond noir', mode: 'pattern', anim: 'shimmer', size: '200% 200%', dark: true,
      css: 'radial-gradient(110% 80% at 50% 20%,#1d1a24 0%,#131019 55%,#07060a 100%),repeating-conic-gradient(from 45deg at 50% 50%,rgba(201,165,78,.16) 0deg 10deg,rgba(255,255,255,0) 10deg 22deg)' },
    { id: 'gold-rays', name: 'Gold rays', mode: 'pattern', anim: 'spin', size: '180% 180%',
      css: 'radial-gradient(circle at 50% 45%,#fffdf5 0%,#f7ecd2 38%,#e7d3ab 72%,#d6bf94 100%),repeating-conic-gradient(from 0deg at 50% 45%,rgba(201,165,78,.14) 0deg 3deg,rgba(255,255,255,0) 3deg 9deg)' },
    { id: 'aurora-gold', name: 'Aurora gold', mode: 'pattern', anim: 'flow', size: '220% 220%',
      css: 'linear-gradient(115deg,#fffdf6 0%,#f7e9cd 22%,#e9d3a6 44%,#fdf6e8 62%,#e3caa0 82%,#fffdf6 100%)' },
    { id: 'aurora-night', name: 'Aurora night', mode: 'pattern', anim: 'flow', size: '220% 220%', dark: true,
      css: 'linear-gradient(115deg,#0b0a10 0%,#1b1622 26%,#2a2130 48%,#141019 66%,#251d2c 84%,#08070c 100%)' },
    { id: 'silk-drape', name: 'Silk drape', mode: 'pattern', anim: 'drift', size: '180% 180%',
      css: 'repeating-linear-gradient(118deg,#fffdf8 0 26px,#f7eeda 26px 52px,#fdf6e6 52px 78px,#f1e4c8 78px 104px)' },
    { id: 'silk-night', name: 'Silk night', mode: 'pattern', anim: 'drift', size: '180% 180%', dark: true,
      css: 'repeating-linear-gradient(118deg,#0a0810 0 26px,#141020 26px 52px,#0d0a14 52px 78px,#1a1426 78px 104px)' },
    { id: 'marble-ivory', name: 'Ivory marble', mode: 'pattern', anim: 'drift', size: '190% 190%',
      css: 'linear-gradient(135deg,#fffefa 0%,#f8f3e8 30%,#efe6d3 55%,#fbf6ec 78%,#f2e9d8 100%),repeating-linear-gradient(72deg,rgba(201,165,78,.10) 0 2px,rgba(255,255,255,0) 2px 26px)' },
    { id: 'marble-noir', name: 'Noir marble', mode: 'pattern', anim: 'drift', size: '190% 190%', dark: true,
      css: 'linear-gradient(135deg,#100d14 0%,#1b1622 30%,#251d2e 55%,#120f18 78%,#1e1826 100%),repeating-linear-gradient(72deg,rgba(201,165,78,.16) 0 2px,rgba(255,255,255,0) 2px 30px)' },
    { id: 'damask', name: 'Damask gold', mode: 'pattern', anim: 'pulse', size: '150% 150%',
      css: 'radial-gradient(120% 90% at 50% 25%,#fffdf7 0%,#f7eeda 45%,#ead9b7 100%),repeating-radial-gradient(circle at 25% 25%,rgba(201,165,78,.16) 0 6px,rgba(255,255,255,0) 6px 26px)' },
    { id: 'lattice', name: 'Gold lattice', mode: 'pattern', anim: 'pulse', size: '160% 160%',
      css: 'radial-gradient(120% 90% at 50% 30%,#fffdf8 0%,#f9f1e2 50%,#eddfc2 100%),repeating-linear-gradient(45deg,rgba(201,165,78,.14) 0 1px,transparent 1px 24px),repeating-linear-gradient(-45deg,rgba(201,165,78,.14) 0 1px,transparent 1px 24px)' },
    { id: 'bokeh', name: 'Golden bokeh', mode: 'pattern', anim: 'float', size: '170% 170%',
      css: 'radial-gradient(circle at 22% 28%,rgba(228,198,132,.55) 0 42px,transparent 43px),radial-gradient(circle at 78% 22%,rgba(228,198,132,.40) 0 30px,transparent 31px),radial-gradient(circle at 62% 78%,rgba(228,198,132,.45) 0 56px,transparent 57px),radial-gradient(circle at 12% 82%,rgba(228,198,132,.35) 0 26px,transparent 27px),linear-gradient(160deg,#fffdf7,#f3e7cd 60%,#e6d3ad)' },
    { id: 'bokeh-night', name: 'Bokeh noir', mode: 'pattern', anim: 'float', size: '170% 170%', dark: true,
      css: 'radial-gradient(circle at 22% 28%,rgba(201,165,78,.35) 0 42px,transparent 43px),radial-gradient(circle at 78% 22%,rgba(201,165,78,.26) 0 30px,transparent 31px),radial-gradient(circle at 62% 78%,rgba(201,165,78,.30) 0 56px,transparent 57px),linear-gradient(160deg,#0d0b11,#1a1520 60%,#0a0810)' },
    { id: 'emerald-ornate', name: 'Emerald ornate', mode: 'pattern', anim: 'pulse', size: '160% 160%', dark: true,
      css: 'radial-gradient(110% 80% at 50% 20%,#12302a 0%,#0b1d19 55%,#050d0b 100%),repeating-linear-gradient(45deg,rgba(201,165,78,.12) 0 1px,transparent 1px 28px),repeating-linear-gradient(-45deg,rgba(201,165,78,.12) 0 1px,transparent 1px 28px)' },
    { id: 'burgundy-ornate', name: 'Burgundy ornate', mode: 'pattern', anim: 'pulse', size: '160% 160%', dark: true,
      css: 'radial-gradient(110% 80% at 50% 20%,#3a1420 0%,#230c14 55%,#0d0509 100%),repeating-radial-gradient(circle at 30% 30%,rgba(201,165,78,.14) 0 5px,transparent 5px 28px)' },
    { id: 'royal-gold', name: 'Royal gold night', mode: 'pattern', anim: 'shimmer', size: '200% 200%', dark: true,
      css: 'linear-gradient(150deg,#0c0910 0%,#1a1424 35%,#241a2c 60%,#0b0810 100%),repeating-linear-gradient(60deg,rgba(201,165,78,.18) 0 1px,transparent 1px 34px)' },
    { id: 'rose-ornate', name: 'Rose ornate', mode: 'pattern', anim: 'float', size: '170% 170%',
      css: 'radial-gradient(circle at 70% 26%,rgba(226,178,158,.45) 0 46px,transparent 47px),radial-gradient(circle at 24% 74%,rgba(226,178,158,.36) 0 34px,transparent 35px),linear-gradient(150deg,#fff8f4,#f8e6dc 55%,#eed6c9)' },
    { id: 'pearl-ornate', name: 'Pearl ornate', mode: 'pattern', anim: 'shimmer', size: '190% 190%',
      css: 'linear-gradient(140deg,#ffffff 0%,#f7f4ec 35%,#efe9dc 65%,#ffffff 100%),repeating-linear-gradient(30deg,rgba(201,165,78,.10) 0 1px,transparent 1px 30px)' }
  ];

  const db = store.get();
  let changed = false;
  db.settings = db.settings || {};
  const S = db.settings;

  if (!db.owner) {
    const p1 = auth.make('admin123');
    const p2 = auth.make('998877');
    db.owner = {
      username: '1234567890123',
      passSalt: p1.salt, passHash: p1.hash,
      pinSalt: p2.salt, pinHash: p2.hash,
      updatedAt: new Date().toISOString()
    };
    changed = true;
  }
  if (!S.permissions) {
    S.permissions = {
      adminSeesCustomerPhotos: true,
      adminCanPosters: true, adminCanCollections: true, adminCanItems: true,
      adminCanHome: true, adminCanLook: true, adminCanContact: true,
      adminCanPages: true, adminCanSecurity: true, adminCanWallpapers: false, adminCanInbox: true
    };
    changed = true;
  }
  if (!S.theme || !Array.isArray(S.theme.wallpapers) || !S.theme.wallpapers.length) {
    S.theme = S.theme || {};
    S.theme.wallpapers = WALLPAPERS;
    S.theme.activeWallpaper = S.theme.activeWallpaper || 'crystal';
    changed = true;
  } else {
    /* add any template the shop does not have yet (never removes the owner's own uploads) */
    const have = new Set(S.theme.wallpapers.map((w) => w.id));
    const missing = WALLPAPERS.filter((w) => !have.has(w.id));
    if (missing.length) {
      S.theme.wallpapers = S.theme.wallpapers.concat(missing);
      changed = true;
    }
    if (!S.theme.wallpapers.some((w) => w.id === S.theme.activeWallpaper)) {
      S.theme.activeWallpaper = 'crystal';
      changed = true;
    }
  }
  if (!S.animations) {
    S.animations = {
      logo: 'spin',               // spin (front-facing turn) | soft | float | none
      logoSeconds: 9,
      transition: 'fade',          // page/section transition
      cardTransition: 'zoom',      // grid card transition
      gridHover: 'lift',
      wheelStyle: 'arc'            // arc | circle | half
    };
    changed = true;
  }
  if (!S.layout) {
    S.layout = { collectionPage: 'grid', homeLoved: 'grid', showWheel: false };
    changed = true;
  }
  if (!S.bubbles) {
    S.bubbles = { count: 38, sideBias: true, styles: 'glass', burst: true, showInHeader: false };
    changed = true;
  }
  /* owner-controlled bubble motion + burst glitter */
  const BUBBLE_DEFAULTS = {
    speed: 1,            // 0.4 = slow & dreamy … 2 = lively
    quality: 'high',     // low | medium | high  (sprite detail + particle budget)
    glitter: true,       // shiny glitter when a bubble bursts
    glitterAmount: 260,  // fine specks per burst
    glitterFall: 1       // how heavy the glitter falls
  };
  Object.keys(BUBBLE_DEFAULTS).forEach((k) => {
    if (S.bubbles[k] === undefined || S.bubbles[k] === null || S.bubbles[k] === '') {
      S.bubbles[k] = BUBBLE_DEFAULTS[k];
      changed = true;
    }
  });

  /* owner-run advertising slots */
  if (!S.ads) {
    S.ads = { enabled: true, items: [] };
    changed = true;
  }
  if (!S.permissions.adminCanAds) {
    /* the owner decides whether the admin may touch ads — off by default */
    if (S.permissions.adminCanAds === undefined) { S.permissions.adminCanAds = false; changed = true; }
  }
  if (!S.look) {
    S.look = {
      enabled: true,
      heading: 'Check Your Look',
      intro: 'Upload one full-body photo and see the dress on you before you order.',
      instructions: 'Please note:\n• Full body photo, head to toe, standing straight\n• Plain background, good daylight\n• No dupatta, shawl or jacket over the dress area\n• Face clearly visible\n• Your photo is private — only our team sees it',
      background: '/assets/img/look/garden.webp',
      showToAdmin: true
    };
    changed = true;
  }
  if (!S.currency || !S.currency.live === undefined) {
    S.currency = S.currency || {};
    if (S.currency.live === undefined) S.currency.live = true;
    changed = true;
  }
  if (!S.brand.logo || /logo@2x\.png$/.test(S.brand.logo)) {
    S.brand.logo = '/assets/img/logo-3d@2x.png';
    changed = true;
  }
  if (!S.brand.logoFlat) { S.brand.logoFlat = '/assets/img/logo-gold@2x.png'; changed = true; }
  if (S.brand.welcomeSize === undefined) { S.brand.welcomeSize = 62; changed = true; }
  if (changed) store.save();
}

const ghsync = require('./lib/ghsync');

process.on('SIGINT', async () => { store.flush(); try { await ghsync.flush(); } catch (e) {} process.exit(0); });
process.on('SIGTERM', async () => { store.flush(); try { await ghsync.flush(); } catch (e) {} process.exit(0); });

/* Boot: if GitHub storage is configured, pull the newest data + uploads first, then start. */
(async () => {
  try { await ghsync.pullAll(); } catch (e) { console.error('[boot] github pull skipped:', e.message); }
  store.load();
  ensureDefaults();
  precompress();
  ghsync.start();
  /* ---------------------------------------------------------------- build info */
const BUILD = {
  name: 'Z&Z — Luxury Bridals & Formals',
  version: '8.0.0',
  build: '2026-10-25-r8',
  features: ['try-on-studio', 'auto-cutout', '13-transitions', 'github-storage', 'backup-restore', 'browsing-badge', 'keep-awake']
};

app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    ...BUILD,
    node: process.version,
    uptime: Math.round(process.uptime()),
    storage: ghsync.enabled ? 'github' : 'local-disk',
    keepAwake: KEEP_AWAKE_URL ? true : false,
    host: process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || null
  });
});

/* ------------------------------------------------------------- keep awake
   Render (free plan) sleeps after 15 quiet minutes and wipes its disk.
   Render tells us our own public address in RENDER_EXTERNAL_URL, so the app
   simply calls its own health URL every 10 minutes — that counts as inbound
   traffic and the instance never spins down. No extra service needed.
   On a paid plan (or your own computer) this line simply does nothing.       */
const KEEP_AWAKE_URL = (process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');

function startKeepAwake() {
  if (!KEEP_AWAKE_URL) return;
  const every = Math.max(5, Number(process.env.KEEP_AWAKE_MINUTES) || 10) * 60 * 1000;
  const beat = () => {
    fetch(KEEP_AWAKE_URL + '/api/health', { headers: { 'user-agent': 'znz-keepawake' } }).catch(() => {});
  };
  const t = setInterval(beat, every);
  if (t.unref) t.unref();
  setTimeout(beat, 20000);
  console.log('[keep-awake] on —', KEEP_AWAKE_URL, 'every', every / 60000, 'minutes');
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Z&Z running on http://0.0.0.0:${PORT}`);
    if (ghsync.enabled) console.log('GitHub storage: on — settings and uploads are saved to your repo');
    startKeepAwake();
  });
})();
