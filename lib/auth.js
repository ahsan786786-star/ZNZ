'use strict';
/**
 * Admin authentication: username + password + 4-digit PIN, scrypt hashed.
 * Sessions live in memory (restart = re-login), cookie is httpOnly + SameSite=Strict.
 */
const crypto = require('crypto');

const SESSION_TTL = 1000 * 60 * 60 * 12; // 12h
const sessions = new Map(); // token -> { username, exp }

function hash(secret, salt) {
  return crypto.scryptSync(String(secret), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
}

function make(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hash(secret, salt) };
}

function verify(secret, salt, expected) {
  if (!salt || !expected) return false;
  const h = Buffer.from(hash(secret, salt), 'hex');
  const e = Buffer.from(expected, 'hex');
  if (h.length !== e.length) return false;
  return crypto.timingSafeEqual(h, e);
}

function createSession(username, role) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { username, role: role || 'admin', exp: Date.now() + SESSION_TTL });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(token); return null; }
  return s;
}

function destroySession(token) {
  if (token) sessions.delete(token);
}

/* ---------- brute-force throttle ---------- */
const attempts = new Map(); // ip -> { count, first }
const MAX_ATTEMPTS = 6;
const WINDOW = 1000 * 60 * 15;

function tooMany(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.first > WINDOW) { attempts.delete(ip); return false; }
  return a.count >= MAX_ATTEMPTS;
}

function noteFail(ip) {
  const a = attempts.get(ip) || { count: 0, first: Date.now() };
  a.count++;
  attempts.set(ip, a);
}

function clearFails(ip) { attempts.delete(ip); }

/* ---------- cookie helpers ---------- */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieToken(req) {
  return parseCookies(req)['zz_sid'] || '';
}

function requireAuth(req, res, next) {
  if (!getSession(cookieToken(req))) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}

function requireOwner(req, res, next) {
  const s = getSession(cookieToken(req));
  if (!s) return res.status(401).json({ ok: false, error: 'unauthorized' });
  if (s.role !== 'owner') return res.status(403).json({ ok: false, error: 'Owner access only.' });
  next();
}

module.exports = {
  requireOwner,
  hash, make, verify, createSession, getSession, destroySession,
  tooMany, noteFail, clearFails, parseCookies, cookieToken, requireAuth, SESSION_TTL
};
