'use strict';

const RECORD_PAGES = { user: 'users', account: 'accounts', service: 'services' };

function decodeTypeParam(value) {
  const clean = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  return Object.keys(TYPES).find(k => k.toLowerCase() === clean) || null;
}

function renderRecordPage(kind, f, sid) {
  const mode = param('mode');
  if (f.deleted && (mode === 'new' || mode === 'edit')) {
    location.replace(entityBase(kind, f, sid));
    return;
  }
  if (mode === 'new') {
    startEntityForm(kind, f, sid, null);
    return;
  }
  const id = param('id');
  const rec = entityRows(kind, f, sid).find(r => r.id === id);
  if (!rec) {
    renderNotFound(id);
    return;
  }
  if (mode === 'edit' && rec.deleted) location.replace(entityHref(kind, f, sid, rec.id));
  else if (mode === 'edit') startEntityForm(kind, f, sid, rec);
  else if (kind === 'users') renderUserPage(f, rec, param('tab'));
  else if (kind === 'accounts') renderAccountPage(f, rec, param('tab'));
  else renderEntityView(kind, f, sid, rec);
}

function renderPage() {
  if (MARKET_PAGES.includes(PAGE)) {
    renderMarketPage();
    return;
  }
  if (PAGE === 'dashboard') {
    renderDashboard();
    return;
  }
  if (DIRECTORY[PAGE]) {
    renderDirectory(PAGE);
    return;
  }
  if (PAGE === 'firms') {
    renderList();
    return;
  }
  if (PAGE === 'firm-new') {
    startForm('create', null, decodeTypeParam(param('type')));
    return;
  }
  const f = firmById(currentDetailId());
  if (!f) {
    renderNotFound(currentDetailId());
    return;
  }
  if (PAGE === 'firm') {
    renderDetail(f, param('tab') || '');
  } else if (PAGE === 'firm-edit') {
    if (f.deleted) location.replace(hrefFor(f.id));
    else startForm('edit', f);
  } else if (RECORD_PAGES[PAGE]) {
    renderRecordPage(RECORD_PAGES[PAGE], f, null);
  } else if (PAGE === 'api-keys' || PAGE === 'api-key') {
    const sid = param('service');
    if (!serviceOf(f, sid)) renderNotFound(sid);
    else if (PAGE === 'api-keys') renderEntityList('keys', f, sid);
    else renderRecordPage('keys', f, sid);
  }
}

function route() {
  const signedIn = storage.get(SESSION_KEY) === '1';
  if (spy) { spy.disconnect(); spy = null; }
  hideTip();
  closeMenu(false);
  closeSelect(false);
  closeDatePicker(false);
  closeFilterPop(false);
  document.body.classList.remove('side-open');

  if (PAGE === 'login') {
    if (signedIn) location.replace('dashboard.html');
    else if (String(param('register')).toLowerCase() === 'true') renderRegister();
    else renderLogin();
    return;
  }
  if (!signedIn) {
    location.replace('index.html');
    return;
  }
  document.body.classList.remove('auth');
  form = null;
  renderPage();
  $('#view').scrollTop = 0;
  const title = $('.large-title');
  if (title) title.focus({ preventScroll: true });
}

new MutationObserver(enhanceSelects).observe(document.body, { childList: true, subtree: true });

if (storage.get(SIDE_KEY) === '1') document.body.classList.add('side-min');
renderSidebar();
route();
enhanceSelects();
showFlash();
