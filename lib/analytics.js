'use strict';
/**
 * Z&Z — visit + app-install analytics (owner panel).
 *
 * What it keeps (all anonymous, no personal data):
 *   • per day: page views, unique visitors, device split, top pages, busiest hours
 *   • app events: install, open, install-button taps, iPhone step views
 *   • a small "recent visitors" list (device + last page + time)
 *
 * Where it lives: `data/analytics.json` — kept OUT of db.json on purpose so the
 * live number never slows the shop down, and pushed to GitHub at most once every
 * few minutes (see lib/ghsync.js) so a free Render restart never loses it.
 *
 * Retention: 365 days (owner's choice), with tight per-day caps so the file
 * always stays well under the 1 MB GitHub write limit.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'analytics.json');

const KEEP_DAYS = 400;          // a little more than a year of history
const MAX_TRACKED_PAGES = 15;   // per day
const MAX_DAY_IDS = 160;        // visitor ids kept per day (for cross-day unique counts)
const MAX_EVENTS = 6000;        // app install / open events
const MAX_VISITORS = 1200;      // recent-visitor list
const SAVE_DEBOUNCE = 4000;     // ms
const PUSH_EVERY = 180000;      // ms — how often it goes to GitHub

let A = null;
let saveTimer = null;
let dirty = false;
let lastPush = 0;
let ghsync = null;
try { ghsync = require('./ghsync'); } catch (e) { ghsync = null; }

/* ------------------------------- helpers -------------------------------- */
const pad = (n) => (n < 10 ? '0' + n : '' + n);
const dayKey = (d) => {
  const x = d || new Date();
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
};
const iso = () => new Date().toISOString();

function deviceOf(ua) {
  const s = String(ua || '');
  if (/iPad|Tablet/i.test(s)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(s)) return 'mobile';
  return 'desktop';
}

function blank() {
  return { v: 1, createdAt: iso(), days: {}, events: [], visitors: {}, installs: 0, opens: 0 };
}

function ensureDay(day) {
  if (!A.days[day]) {
    A.days[day] = {
      pv: 0,                    // page views
      uv: 0,                    // unique visitors (per day)
      d: { mobile: 0, desktop: 0, tablet: 0 }, // page views per device
      p: {},                    // page -> views
      h: new Array(24).fill(0), // hour -> views
      u: []                     // visitor ids (capped)
    };
  }
  return A.days[day];
}

/* ------------------------------- storage -------------------------------- */
function load() {
  if (A) return A;
  try {
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      A = Object.assign(blank(), raw);
      A.days = A.days || {};
      A.events = Array.isArray(A.events) ? A.events : [];
      A.visitors = A.visitors || {};
    } else {
      A = blank();
    }
  } catch (e) {
    console.error('[analytics] file unreadable, starting fresh:', e.message);
    A = blank();
  }
  return A;
}

/** called at boot, after ghsync pulled the newest copy from GitHub */
function pull() {
  try {
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      A = Object.assign(blank(), raw);
      A.days = A.days || {};
      A.events = Array.isArray(A.events) ? A.events : [];
      A.visitors = A.visitors || {};
      console.log('[analytics] loaded', Object.keys(A.days).length, 'day(s) of history');
    }
  } catch (e) { A = null; }
}

function writeNow() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(A));
    fs.renameSync(tmp, FILE);
    dirty = false;
  } catch (e) { console.error('[analytics] write failed', e.message); }
}

function save() {
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    prune();
    writeNow();
    /* GitHub: at most every 3 minutes, and never while the last push is running */
    if (ghsync && ghsync.pushExtra && Date.now() - lastPush > PUSH_EVERY) {
      lastPush = Date.now();
      ghsync.pushExtra(FILE, 'analytics update').catch(() => {});
    }
  }, SAVE_DEBOUNCE);
  if (saveTimer.unref) saveTimer.unref();
}

function flush() {
  clearTimeout(saveTimer);
  if (!A) return Promise.resolve();
  prune();
  writeNow();
  if (ghsync && ghsync.pushExtra) return ghsync.pushExtra(FILE, 'analytics update').catch(() => {});
  return Promise.resolve();
}

/** keep the file small forever: drop old days, trim caps */
function prune() {
  const keys = Object.keys(A.days).sort();
  if (keys.length > KEEP_DAYS) keys.slice(0, keys.length - KEEP_DAYS).forEach((k) => delete A.days[k]);
  Object.keys(A.days).forEach((k) => {
    const d = A.days[k];
    if (!d || typeof d !== 'object') { delete A.days[k]; return; }
    if (Array.isArray(d.u) && d.u.length > MAX_DAY_IDS) d.u = d.u.slice(-MAX_DAY_IDS);
    const pages = Object.entries(d.p || {});
    if (pages.length > MAX_TRACKED_PAGES) {
      const top = pages.sort((a, b) => b[1] - a[1]).slice(0, MAX_TRACKED_PAGES);
      d.p = Object.fromEntries(top);
    }
    if (!Array.isArray(d.h) || d.h.length !== 24) {
      const h = new Array(24).fill(0);
      if (Array.isArray(d.h)) for (let i = 0; i < 24; i++) h[i] = Number(d.h[i]) || 0;
      d.h = h;
    }
  });
  if (A.events.length > MAX_EVENTS) A.events = A.events.slice(-MAX_EVENTS);
  const vs = Object.entries(A.visitors || {});
  if (vs.length > MAX_VISITORS) {
    const keep = vs.sort((a, b) => new Date(b[1].last) - new Date(a[1].last)).slice(0, MAX_VISITORS);
    A.visitors = Object.fromEntries(keep);
  }
}

/* ------------------------------ recording ------------------------------- */

/** one storefront page view */
function pageView({ vid, path: p, ua }) {
  load();
  try {
    const now = new Date();
    const day = ensureDay(dayKey(now));
    const page = String(p || '/').split('?')[0].slice(0, 120) || '/';
    const dev = deviceOf(ua);

    day.pv += 1;
    day.d[dev] = (day.d[dev] || 0) + 1;
    day.p[page] = (day.p[page] || 0) + 1;
    day.h[now.getHours()] = (day.h[now.getHours()] || 0) + 1;

    if (vid) {
      if (!day.u.includes(vid)) {
        day.u.push(vid);
        day.uv += 1;
      }
      const v = A.visitors[vid] || { first: iso(), n: 0 };
      v.last = iso();
      v.n = (Number(v.n) || 0) + 1;
      v.dev = dev;
      v.ua = String(ua || '').slice(0, 120);
      v.page = page;
      v.day = dayKey(now);
      A.visitors[vid] = v;
    }
    save();
  } catch (e) { /* never break the shop because of a counter */ }
}

const EVENT_KINDS = ['install', 'open', 'prompt', 'steps'];

/** app related actions: install / open as app / install-button tap / iPhone steps */
function event({ vid, kind, ua }) {
  load();
  if (!EVENT_KINDS.includes(kind)) return;
  try {
    const now = new Date();
    A.events.push({ t: now.toISOString(), k: kind, vid: String(vid || '').slice(0, 24), dev: deviceOf(ua) });
    if (kind === 'install') A.installs = (Number(A.installs) || 0) + 1;
    if (kind === 'open') A.opens = (Number(A.opens) || 0) + 1;
    const day = ensureDay(dayKey(now));
    day[kind] = (Number(day[kind]) || 0) + 1;
    save();
  } catch (e) {}
}

/* ------------------------------ reporting ------------------------------- */
function inRange(dayStr, from, to) { return dayStr >= from && dayStr <= to; }

function dayRange(days, fromStr, toStr) {
  const out = [];
  if (fromStr && toStr) {
    let cur = new Date(fromStr + 'T00:00:00');
    const end = new Date(toStr + 'T00:00:00');
    let guard = 0;
    while (cur <= end && guard++ < 1000) { out.push(dayKey(cur)); cur.setDate(cur.getDate() + 1); }
    return out;
  }
  const n = Math.max(1, Math.min(400, Number(days) || 30));
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); out.push(dayKey(d));
  }
  return out;
}

/** full report for the owner panel */
function summary(opts) {
  load();
  const o = opts || {};
  const keys = dayRange(o.days, o.from, o.to);
  const first = keys[0], last = keys[keys.length - 1];

  const rows = keys.map((k) => {
    const d = A.days[k] || {};
    return {
      day: k,
      visitors: Number(d.uv) || 0,
      views: Number(d.pv) || 0,
      installs: Number(d.install) || 0,
      opens: Number(d.open) || 0,
      prompt: Number(d.prompt) || 0,
      steps: Number(d.steps) || 0,
      mobile: Number((d.d || {}).mobile) || 0,
      desktop: Number((d.d || {}).desktop) || 0,
      tablet: Number((d.d || {}).tablet) || 0
    };
  });

  const tot = rows.reduce((a, r) => {
    a.visitors += r.visitors; a.views += r.views; a.installs += r.installs;
    a.opens += r.opens; a.prompt += r.prompt; a.steps += r.steps;
    a.mobile += r.mobile; a.desktop += r.desktop; a.tablet += r.tablet;
    return a;
  }, { visitors: 0, views: 0, installs: 0, opens: 0, prompt: 0, steps: 0, mobile: 0, desktop: 0, tablet: 0 });

  /* unique across the whole range (union of the per-day id lists) */
  const ids = new Set();
  keys.forEach((k) => { const d = A.days[k]; if (d && Array.isArray(d.u)) d.u.forEach((x) => ids.add(x)); });
  const uniqueInRange = ids.size || tot.visitors;

  /* pages */
  const pages = {};
  keys.forEach((k) => {
    const d = A.days[k]; if (!d || !d.p) return;
    Object.entries(d.p).forEach(([p, n]) => { pages[p] = (pages[p] || 0) + Number(n || 0); });
  });
  const topPages = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([p, n]) => ({ path: p, views: n }));

  /* hours */
  const hours = new Array(24).fill(0);
  keys.forEach((k) => {
    const d = A.days[k]; if (!d || !Array.isArray(d.h)) return;
    for (let i = 0; i < 24; i++) hours[i] += Number(d.h[i]) || 0;
  });

  /* events in range + recent installs */
  const evts = A.events.filter((e) => inRange(dayKey(new Date(e.t)), first, last));
  const installsRecent = evts.filter((e) => e.k === 'install').slice(-25).reverse();

  return {
    ok: true,
    range: { days: keys.length, from: first, to: last },
    totals: {
      visitors: tot.visitors, uniqueVisitors: uniqueInRange, views: tot.views,
      installs: tot.installs, opens: tot.opens, prompt: tot.prompt, steps: tot.steps,
      mobile: tot.mobile, desktop: tot.desktop, tablet: tot.tablet,
      avgPerDay: Math.round((tot.views / Math.max(1, keys.length)) * 10) / 10,
      busiest: rows.slice().sort((a, b) => b.views - a.views)[0] || null
    },
    lifetime: { installs: Number(A.installs) || 0, opens: Number(A.opens) || 0, daysTracked: Object.keys(A.days).length },
    rows, topPages, hours, installsRecent,
    visitorsOnlineHint: Object.keys(A.visitors || {}).length
  };
}

/** most recent visitors (device + last page + when) — no IP, no personal data */
function recentVisitors(limit) {
  load();
  const n = Math.max(1, Math.min(200, Number(limit) || 40));
  return Object.entries(A.visitors || {})
    .map(([id, v]) => ({
      id: 'v' + id.slice(-4),
      when: v.last,
      seen: Number(v.n) || 0,
      device: v.dev || 'desktop',
      page: v.page || '/',
      browser: /iPhone|iPad/i.test(v.ua || '') ? 'Safari (iOS)'
        : /Android/i.test(v.ua || '') ? 'Chrome (Android)'
        : /Edg\//.test(v.ua || '') ? 'Edge' : /Firefox\//.test(v.ua || '') ? 'Firefox' : 'Chrome'
    }))
    .sort((a, b) => new Date(b.when) - new Date(a.when))
    .slice(0, n);
}

/** day-by-day CSV the owner can download / print */
function csv(opts) {
  const s = summary(opts);
  const head = 'date,visitors,page_views,app_installs,app_opens,install_button,custom,iphone_steps,mobile_views,desktop_views,tablet_views\n';
  const body = s.rows.map((r) => [r.day, r.visitors, r.views, r.installs, r.opens, r.prompt, r.steps, r.mobile, r.desktop, r.tablet].join(',')).join('\n');
  return head + body + '\n';
}

module.exports = {
  pull, pageView, event, summary, recentVisitors, csv, flush, load,
  todayKey: dayKey, FILE
};
