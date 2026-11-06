'use strict';

const PAGE = document.body.dataset.page;
const param = key => new URLSearchParams(location.search).get(key);
const session = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { } },
  clear() { try { sessionStorage.clear(); } catch { } },
};
const readSaved = key => {
  try { return JSON.parse(session.get(key)) || {}; } catch { return {}; }
};

const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};
const load = () => {
  try {
    const raw = storage.get(STORE_KEY);
    const parsed = raw && JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { }
  return seed();
};

let firms = load();
let form = null;
let spy = null;
let spyLock = 0;
let assocState = null;
let firstList = session.get('listShown') !== '1';
const list = { q: '', type: '', state: '', deleted: false, sort: 'seed', dir: 1, page: 0, size: 10, ...readSaved('firmsList') };

const persist = () => storage.set(STORE_KEY, JSON.stringify(firms));
const clone = o => JSON.parse(JSON.stringify(o));
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const logo = cls => `<svg class="${cls}" role="img" aria-label="EP3"><use href="#ep3-logo"/></svg>`;
const firmById = id => firms.find(f => f.id === id);
const hrefFor = (id, tail) => {
  const firmId = encodeURIComponent(id);
  if (!tail) return `firm.html?id=${firmId}`;
  if (tail === 'edit') return `firm-edit.html?id=${firmId}`;
  return `firm.html?id=${firmId}&tab=${encodeURIComponent(tail)}`;
};
const statePill = f => f.deleted
  ? `<span class="pill pill-deleted">Deleted</span>`
  : `<span class="pill pill-${esc(f.state)}">${esc(STATES[f.state])}</span>`;
const isEmpty = v => v === undefined || v === null || v === '' || v === false;
const visible = (field, f) => !field.when || field.when(f);

const currentDetailId = () => param('firm') || param('id');

let leaving = false;
let lastToast = null;

function saveFlash() {
  if (lastToast && Date.now() - lastToast.at < 400) session.set('flash', JSON.stringify(lastToast));
}

function showFlash() {
  const saved = readSaved('flash');
  session.set('flash', '{}');
  if (saved.message) toast(saved.message, saved.opts);
}

function go(url) {
  if (new URL(url, location.href).href === location.href) {
    route();
    return;
  }
  leaving = true;
  saveFlash();
  location.href = url;
}
