'use strict';
/**
 * Optional GitHub persistence — so the site can live for FREE on a host with an
 * empty disk (Render, Koyeb, Fly, Hugging Face…) and still remember everything.
 *
 * Enable it with three environment variables on the host:
 *   GH_TOKEN  = a fine-grained personal access token (Contents: read & write)
 *   GH_REPO   = "your-username/your-repo"
 *   GH_BRANCH = main            (optional, defaults to main)
 *
 * What happens then:
 *   • boot      → the newest data/db.json and every uploaded picture are pulled from the repo
 *   • any save  → data/db.json is committed back to the repo (debounced)
 *   • any upload→ the new file is committed back to the repo
 * So a restart, a redeploy or a free-tier sleep never loses a dress, a price or a photo.
 * Without the variables the app behaves exactly as before (plain local files).
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GH_TOKEN || '';
const REPO = process.env.GH_REPO || '';
const BRANCH = process.env.GH_BRANCH || 'main';
const ROOT = path.join(__dirname, '..');
const DB_REL = 'data/db.json';
const UPLOAD_REL = 'public/uploads';
const MAX_PUSH_BYTES = 950 * 1024;          // the contents API caps a single file at 1 MB
const PULL_FILE_LIMIT = 500;
const PULL_BYTE_LIMIT = 80 * 1024 * 1024;

const enabled = !!(TOKEN && REPO && /^[^/]+\/[^/]+$/.test(REPO) && typeof fetch === 'function');

let timer = null;
let lastDbHash = '';               // sha1 of the db.json we know is on GitHub
let bootAt = 0;
let busy = false;
const knownUploads = new Set();    // uploaded files already safe in the repo
const log = (...a) => console.log('[ghsync]', ...a);

function hashOf(buf) {
  return require('crypto').createHash('sha1').update(buf).digest('hex');
}

function rel(abs) { return path.relative(ROOT, abs).split(path.sep).join('/'); }

async function api(pathname, init) {
  const res = await fetch('https://api.github.com' + pathname, {
    ...(init || {}),
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'znz-site',
      ...((init && init.headers) || {})
    }
  });
  if (res.status === 404) return { status: 404, json: null };
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(json && json.message) || res.statusText}`);
  return { status: res.status, json };
}

async function remoteSha(relPath) {
  try {
    const r = await api(`/repos/${REPO}/contents/${encodeURI(relPath)}?ref=${BRANCH}`);
    return r.json && r.json.sha ? r.json.sha : null;
  } catch (e) { return null; }
}

/** create or update one file in the repo */
async function pushFile(absPath, message) {
  const relPath = rel(absPath);
  const buf = fs.readFileSync(absPath);
  if (buf.length > MAX_PUSH_BYTES) { log('skip (too big for the API):', relPath, (buf.length / 1024) | 0 + 'KB'); return false; }
  const sha = await remoteSha(relPath);
  const body = { message: message || `site update: ${relPath}`, content: buf.toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;
  await api(`/repos/${REPO}/contents/${encodeURI(relPath)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return true;
}

async function pullDb() {
  try {
    const r = await api(`/repos/${REPO}/contents/${DB_REL}?ref=${BRANCH}`);
    if (!r.json || !r.json.content) return;
    const remote = Buffer.from(r.json.content, r.json.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
    JSON.parse(remote);                                  // never overwrite with junk
    const abs = path.join(ROOT, DB_REL);
    const local = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    if (local !== remote) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, remote);
      log('restored data/db.json from GitHub');
    }
    lastDbHash = hashOf(fs.readFileSync(abs));
  } catch (e) { log('db pull failed:', e.message); }
}

async function pullUploads() {
  try {
    const r = await api(`/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
    const tree = (r.json && r.json.tree) || [];
    const wanted = tree.filter((n) => n.type === 'blob' && n.path.startsWith(UPLOAD_REL + '/'));
    let files = 0, bytes = 0;
    for (const node of wanted) {
      if (files >= PULL_FILE_LIMIT || bytes >= PULL_BYTE_LIMIT) break;
      const abs = path.join(ROOT, node.path);
      knownUploads.add(node.path);
      if (fs.existsSync(abs) && fs.statSync(abs).size === node.size) continue;
      const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${node.path.split('/').map(encodeURIComponent).join('/')}`;
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN, 'User-Agent': 'znz-site' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
      files++; bytes += buf.length;
    }
    if (files) log(`restored ${files} uploaded file(s)`);
  } catch (e) { log('uploads pull failed:', e.message); }
}

/** called once at boot, before the store is loaded */
async function pullAll() {
  if (!enabled) return false;
  await pullDb();
  await pullUploads();
  return true;
}

/** push everything that changed since the last look */
async function syncNow() {
  if (!enabled || busy) return;
  busy = true;
  try {
    const dbAbs = path.join(ROOT, DB_REL);
    if (fs.existsSync(dbAbs)) {
      const hash = hashOf(fs.readFileSync(dbAbs));
      if (hash !== lastDbHash) {
        await pushFile(dbAbs, 'site data update');
        lastDbHash = hash;
      }
    }
    /* walk public/uploads recursively — client try-on photos live in uploads/looks/ */
    const dir = path.join(ROOT, UPLOAD_REL);
    const walk = (d) => {
      const out = [];
      for (const name of fs.readdirSync(d)) {
        const abs = path.join(d, name);
        let st;
        try { st = fs.statSync(abs); } catch (e) { continue; }
        if (st.isDirectory()) out.push(...walk(abs));
        else if (st.isFile()) out.push(abs);
      }
      return out;
    };
    if (fs.existsSync(dir)) {
      let pushed = 0;
      for (const abs of walk(dir)) {
        if (pushed >= 12) break;
        const key = rel(abs);
        if (knownUploads.has(key)) continue;
        try {
          await pushFile(abs, 'upload: ' + path.basename(abs));
          knownUploads.add(key);
          pushed++;
        } catch (e) { log('upload push failed:', key, e.message); }
      }
    }
  } catch (e) {
    log('sync failed:', e.message);
  } finally {
    busy = false;
  }
}

function start() {
  if (!enabled) {
    if (TOKEN || REPO) log('disabled — need both GH_TOKEN and GH_REPO (owner/repo)');
    return;
  }
  bootAt = Date.now();
  log('enabled for', REPO, 'on branch', BRANCH);
  clearInterval(timer);
  timer = setInterval(syncNow, 15000);
  if (timer.unref) timer.unref();
}

function flush() {
  if (!enabled) return Promise.resolve();
  clearInterval(timer);
  return syncNow();
}

module.exports = { enabled, pullAll, start, syncNow, flush };
