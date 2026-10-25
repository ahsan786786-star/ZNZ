'use strict';
/**
 * Tiny JSON data store with atomic writes.
 * No external database needed -> deploys anywhere, boots in milliseconds.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let db = null;
let saveTimer = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function defaults() {
  return {
    settings: {},
    collections: [],
    leads: [],
    complaints: [],
    ratings: [],
    orders: [],
    subscribers: []
  };
}

function load() {
  if (db) return db;
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    db = defaults();
    persistNow();
    return db;
  }
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('[store] db.json unreadable, starting fresh:', e.message);
    db = defaults();
  }
  for (const k of Object.keys(defaults())) if (db[k] === undefined) db[k] = defaults()[k];
  return db;
}

function persistNow() {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/** Debounced save (max ~1 write / 250ms) */
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { persistNow(); } catch (e) { console.error('[store] save failed', e); }
  }, 200);
}

function flush() {
  clearTimeout(saveTimer);
  try { persistNow(); } catch (e) { console.error('[store] flush failed', e); }
}

function get() {
  return load();
}

/** drop the in-memory copy and read data/db.json again (used after a restore) */
function reload() {
  clearTimeout(saveTimer);
  db = null;
  return load();
}

/** Mutate + save */
function update(fn) {
  const d = load();
  const out = fn(d);
  save();
  return out;
}

const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

module.exports = { load, get, reload, update, save, flush, uid, DB_FILE, DATA_DIR };
