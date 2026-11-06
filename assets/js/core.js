'use strict';

const PAGE = document.body.dataset.page;
const param = key => new URLSearchParams(location.search).get(key);
const session = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { } },
  clear() { try { sessionStorage.clear(); } catch { } },
};
function trackPage() {
  const now = session.get('pageNow');
  if (now === location.href) return;
  session.set('pagePrev', now || '');
  session.set('pageNow', location.href);
}
trackPage();
window.addEventListener('pageshow', trackPage);

const pageFile = url => new URL(url, location.href).pathname.split('/').pop().replace(/\.html$/, '');

function editBack(viewHref, viewLabel, listHref, listLabel) {
  const prev = session.get('pagePrev');
  return prev && pageFile(prev) === pageFile(listHref)
    ? { href: prev, label: listLabel }
    : { href: viewHref, label: viewLabel };
}

const readSaved = key => {
  try { return JSON.parse(session.get(key)) || {}; } catch { return {}; }
};

const storage = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { } },
  del(k) { try { localStorage.removeItem(k); } catch { } },
};
const LIST_STATE_PREFIX = 'ep3.list.';
const readListState = key => {
  try { return JSON.parse(storage.get(LIST_STATE_PREFIX + key)) || {}; } catch { return {}; }
};
const saveListState = (key, state) => storage.set(LIST_STATE_PREFIX + key, JSON.stringify(state));
const clearListStates = () => {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(LIST_STATE_PREFIX)).forEach(k => localStorage.removeItem(k));
  } catch { }
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
function isPhoneWidth() {
  return matchMedia('(max-width: 680px)').matches;
}
const list = { q: '', type: '', state: '', deleted: false, showFilters: !isPhoneWidth(), sort: 'seed', dir: 1, page: 0, size: 10, ...readListState('firmsList') };
let listCtl = { state: list, refresh: () => refreshList(), removeFilter: key => removeFirmFilter(key), noun: 'firms' };

const persist = () => storage.set(STORE_KEY, JSON.stringify(firms));
const clone = o => JSON.parse(JSON.stringify(o));
const pad2 = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const isoDateTime = d => `${isoDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
function timeLabel(seconds) {
  const total = Number(seconds) % 86400;
  const hour = Math.floor(total / 3600);
  const minute = Math.floor((total % 3600) / 60);
  const suffix = hour < 12 ? 'am' : 'pm';
  return `${hour % 12 || 12}:${pad2(minute)} ${suffix}`;
}
const getPath = (o, path) => String(path).split('.').reduce((v, key) => (v === undefined || v === null ? undefined : v[key]), o);
const setPath = (o, path, value) => {
  const keys = String(path).split('.');
  const last = keys.pop();
  keys.reduce((v, key) => v[key], o)[last] = value;
};
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
