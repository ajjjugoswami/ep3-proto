'use strict';

const ACT = {
  'side-toggle'() {
    if (matchMedia('(max-width: 860px)').matches) { document.body.classList.toggle('side-open'); return; }
    document.body.classList.add('side-anim');
    setTimeout(() => document.body.classList.remove('side-anim'), 400);
    const min = document.body.classList.toggle('side-min');
    storage.set(SIDE_KEY, min ? '1' : '0');
    renderSidebar();
    const btn = $('#sidebar [data-act="side-toggle"]');
    if (btn) btn.focus();
  },
  'side-close'() { document.body.classList.remove('side-open'); },
  'nav-soon'(el) { toast(`${el.dataset.label} isn’t part of this prototype.`, { info: true }); },
  license() { showLicense(); },
  tip(el) { showTip(el); },
  'fb-open'(el) { openFilterPop(el); },
  'fb-clear'() { clearListFilters(); },
  'fb-more'() { toggleMoreFilters(); },  'page-to'(el) {
    listCtl.state.page = Number(el.dataset.p);
    listCtl.refresh();
    scrollListToTop();
  },
  'password-show'(el) { togglePassword(el); },
  'register-sample'() { useSampleToken(); },
  'theme-set'(el) {
    storage.set(THEME_KEY, el.dataset.pref);
    applyTheme();
    $$('[data-act="theme-set"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
  },
  logout() {
    storage.del(SESSION_KEY);
    form = null;
    session.clear();
    clearListStates();
    go('index.html');
  },
  sort(el) {
    const key = el.dataset.key;
    const state = listCtl.state;
    if (state.sort === key) state.dir *= -1; else { state.sort = key; state.dir = 1; }
    state.page = 0;
    listCtl.refresh();
    scrollListToTop();
    $(`[data-act="sort"][data-key="${key}"]`).focus({ preventScroll: true });
  },
  page(el) {
    listCtl.state.page += Number(el.dataset.d);
    listCtl.refresh();
    scrollListToTop();
  },
  'row-menu'(el) { openMenu(el, firmMenuItems(firmById(el.dataset.id), false)); },
  'detail-menu'(el) { openMenu(el, firmMenuItems(firmById(el.dataset.id), true)); },
  restore(el) { restoreFirm(el.dataset.id); },
  'cancel-orders'(el) { cancelOrders(el.dataset.id); },
  'toggle-suspend'(el) { toggleSuspend(el.dataset.id); },
  async 'copy-id'(el) {
    try { await navigator.clipboard.writeText(el.dataset.id); toast('Copied Firm ID.'); }
    catch { toast('Couldn’t copy. Select the ID and copy it manually.', { info: true }); }
  },
  jump(el) {
    spyLock = Date.now() + 800;
    markSection(el.dataset.target);
    const t = document.getElementById(el.dataset.target);
    if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  },
  'ent-del'(el) {
    const { kind, id } = el.dataset;
    deleteRecord(kind, firmById(el.dataset.firm || currentDetailId()), el.dataset.sid || null, id);
  },
  'ent-restore'(el) { restoreRecord(el.dataset.kind, firmById(el.dataset.firm), el.dataset.id); },
  'dir-new'(el) { openFirmPicker(el.dataset.kind); },
  'user-reg-token'() { const { f, u } = currentUserRecord(); showUserToken(f, u, true); },
  'user-menu'(el) { const { f, u } = currentUserRecord(); openMenu(el, userMenuItems(f, u, !param('tab'))); },
  'user-acct-add'() { const { f, u } = currentUserRecord(); openLinkAccounts(f, u); },
  'user-acct-remove'(el) { const { f, u } = currentUserRecord(); removeUserAccount(f, u, el.dataset.id); },
  'dir-row-menu'(el) { openMenu(el, directoryMenuItems(el.dataset.kind, el.dataset.firm, el.dataset.id)); },
  async 'ent-bulk'(el) {
    const { kind, state } = el.dataset;
    const f = firmById(currentDetailId());
    const e = ENTITIES[kind];
    const suspending = state === 'Suspended';
    const ok = await ask({ title: `${suspending ? 'Suspend' : 'Activate'} all ${e.plural.toLowerCase()}?`, text: `This changes every ${e.one.toLowerCase()} in ${f.name} to ${state}.`, confirm: `${suspending ? 'Suspend' : 'Activate'} All`, danger: suspending, glyph: suspending ? 'pause' : 'play' });
    if (!ok) return;
    liveRows(kind, f).forEach(r => { r.state = state; });
    persist();
    route();
    toast(`${suspending ? 'Suspended' : 'Activated'} all ${e.plural.toLowerCase()}.`);
  },
  'assoc-pick'(el) {
    const f = firmById(currentDetailId());
    const box = assocBox(f, el.dataset.key);
    if (box.picked.has(el.dataset.id)) box.picked.delete(el.dataset.id);
    else box.picked.add(el.dataset.id);
    el.setAttribute('aria-pressed', String(box.picked.has(el.dataset.id)));
  },
  'assoc-add'(el) {
    const f = firmById(currentDetailId());
    const { key } = el.dataset;
    const box = assocBox(f, key);
    box.picked.forEach(id => { if (!box.list.includes(id)) box.list.push(id); });
    box.picked.clear();
    refreshAssocBox(f, key, `[data-act="assoc-add"][data-key="${key}"]`);
  },
  'assoc-remove'(el) {
    const f = firmById(currentDetailId());
    const { key } = el.dataset;
    const box = assocBox(f, key);
    box.list = box.list.filter(id => !box.picked.has(id));
    box.picked.clear();
    refreshAssocBox(f, key, `[data-act="assoc-remove"][data-key="${key}"]`);
  },
  'assoc-cancel'(el) {
    const f = firmById(currentDetailId());
    const { key } = el.dataset;
    delete assocState.boxes[key];
    refreshAssocBox(f, key);
  },
  'assoc-update'(el) {
    const f = firmById(currentDetailId());
    const { key } = el.dataset;
    f.assoc = f.assoc || {};
    f.assoc[key] = [...assocBox(f, key).list];
    persist();
    refreshAssocBox(f, key);
    toast('Firm associations updated.');
  },
  'rec-add'(el) { openRecordSheet(el.dataset.col, null); },
  'rec-edit'(el) { openRecordSheet(el.dataset.col, Number(el.dataset.i)); },
  'rec-del'(el) { removeRecord(el.dataset.col, Number(el.dataset.i)); },
  'dash-filter'(el) { openFilteredList(el.dataset.list, el.dataset.k, el.dataset.v); },
  'dash-approve'() { openApproveSheet(); },
};

document.addEventListener('click', e => {
  if (!e.target.closest('.menu')) closeMenu(false);
  const actEl = e.target.closest('[data-act]');
  if (actEl) {
    const fn = ACT[actEl.dataset.act];
    if (fn) { e.preventDefault(); fn(actEl, e); }
    return;
  }
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button, input, select')) go(row.dataset.href);
  if (e.target.closest('.sidebar a')) document.body.classList.remove('side-open');
});

document.addEventListener('contextmenu', e => {
  const row = e.target.closest('tr[data-id], tr[data-inst], tr[data-rec]');
  if (!row) return;
  e.preventDefault();
  const { inst, rec, kind, firm, id } = row.dataset;
  const items = inst ? instrumentMenuItems(instrumentById(inst), false)
    : rec ? directoryMenuItems(kind, firm, rec)
      : firmMenuItems(firmById(id), false);
  openMenu(row, items, { left: e.clientX, top: e.clientY });
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.fbSearch) { onSearchInput(t); return; }
  if (t.id === 'limitFilter') {
    const needle = t.value.trim().toLowerCase();
    $$('#limitsTab tbody tr').forEach(row => { row.hidden = !!needle && !row.textContent.toLowerCase().includes(needle); });
    return;
  }
  if (!form || t.closest('#sheet') || !t.dataset.field) return;
  const k = t.dataset.field;
  if (t.type === 'checkbox') return;
  setPath(form.draft, k, t.value);
  if (k === 'id') form.idTouched = true;
  if (k === 'name' && form.mode === 'create' && !form.idTouched) {
    form.draft.id = slug(t.value);
    const idInput = $('#firm-id');
    if (idInput) idInput.value = form.draft.id;
    if (form.errors.id) { delete form.errors.id; showFieldError('id'); }
  }
  if (k === 'legalEntityIdentifier') {
    const m = $('#leiMeter');
    m.textContent = leiText(t.value);
    m.classList.toggle('warn', leiWarn(t.value));
  }
  if (form.errors[k]) {
    const next = validateForm();
    if (next[k]) form.errors[k] = next[k]; else delete form.errors[k];
    showFieldError(k);
  }
  updateDock();
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'autoReload') { storage.set('ep3.firms.prototype.autoReload', t.checked ? '1' : '0'); return; }
  if (t.id === 'showDeleted' || t.id === 'dirDeleted') { listCtl.state.deleted = t.checked; listCtl.state.page = 0; listCtl.refresh(); return; }
  if (t.id === 'pageSize') {
    listCtl.state.size = Number(t.value);
    listCtl.state.page = 0;
    listCtl.refresh();
    $('#pageSize').focus();
    return;
  }
  if (!form || t.closest('#sheet')) return;
  if (t.dataset.multi && form.entity) {
    const current = getPath(form.draft, t.dataset.multi) || [];
    setPath(form.draft, t.dataset.multi, t.checked ? [...current, t.value] : current.filter(v => v !== t.value));
    updateDock();
    return;
  }
  if (!t.dataset.field) return;
  const k = t.dataset.field;
  if (t.type === 'checkbox') setPath(form.draft, k, t.checked);
  else if (t.tagName === 'SELECT') setPath(form.draft, k, t.value);
  if (form.module) {
    if (form.module.onChange) form.module.onChange(k);
    updateDock();
    return;
  }
  if (t.type === 'checkbox' && k === 'skipRiskAndCurrencyChecks') { refreshFormBody(`#firm-${k}`); return; }
  if (t.tagName === 'SELECT' && k === 'type') {
    delete form.errors.type;
    refreshFormBody('#firm-type');
    return;
  }
  updateDock();
});

document.addEventListener('toggle', e => {
  if (!form || !form.open || !e.target.matches || !e.target.matches('details[data-sec]')) return;
  if (e.target.open) form.open.add(e.target.dataset.sec);
  else form.open.delete(e.target.dataset.sec);
}, true);

document.addEventListener('focusout', e => {
  const t = e.target;
  if (!form || !t.dataset || !t.dataset.field || t.closest('#sheet')) return;
  const k = t.dataset.field;
  if (k !== 'email' && k !== 'id') return;
  const next = validateForm();
  if (next[k] && form.draft[k]) form.errors[k] = next[k]; else delete form.errors[k];
  showFieldError(k);
  updateDock();
});

document.addEventListener('submit', async e => {
  if (e.target.id === 'firmForm') { e.preventDefault(); submitFirm(); return; }
  if (e.target.id === 'registerForm') { e.preventDefault(); submitRegister(e.target); return; }
  if (e.target.id === 'loginForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!String(fd.get('username')).trim() || !fd.get('password')) {
      showRowErr($('#loginErr'), 'Enter your username and password.');
      $(`[name=${String(fd.get('username')).trim() ? 'password' : 'username'}]`, e.target).focus();
      return;
    }
    setLoginBusy(e.target, 'Signing In…');
    await wait(500);
    storage.set(SESSION_KEY, '1');
    go('dashboard.html');
  }
});

document.addEventListener('keydown', e => {
  const typing = e.target.closest && e.target.closest('input, select, textarea, dialog, [contenteditable]');
  if (e.key === 'Escape') {
    if ($('.menu')) { closeMenu(); return; }
    if (document.body.classList.contains('side-open')) { document.body.classList.remove('side-open'); return; }
    const searchKey = e.target.dataset && e.target.dataset.fbSearch;
    if (searchKey && e.target.value) { e.target.value = ''; e.target.classList.remove('is-pending'); setListFilter(searchKey, ''); }
  }
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.fbExact !== undefined) { e.preventDefault(); commitSearch(e.target); return; }
  if (e.key === '/' && !typing && $('[data-fb-search]')) { e.preventDefault(); $('[data-fb-search]').focus(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && form && !$('#sheet').open) { e.preventDefault(); submitFirm(); }
  if (e.key === 'Enter' && !typing && e.target.matches && e.target.matches('tr[data-href]')) go(e.target.dataset.href);
});

window.addEventListener('beforeunload', e => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

window.addEventListener('resize', () => {
  $$('.tbl th').forEach(th => { th.style.minWidth = ''; });
});

window.addEventListener('scroll', e => {
  hideTip();
  if (e.target.closest && e.target.closest('.select-pop')) return;
  closeMenu(false);
  closeSelect(false);
}, { passive: true, capture: true });

document.addEventListener('click', async e => {
  const link = e.target.closest('a[href]');
  if (!link || !isDirty() || form.saving || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  e.stopPropagation();
  const ok = await ask({ title: 'Discard your changes?', text: 'The changes you made haven’t been saved.', confirm: 'Discard Changes', danger: true, glyph: 'warn' });
  if (ok) {
    form = null;
    location.href = link.href;
  }
}, true);
