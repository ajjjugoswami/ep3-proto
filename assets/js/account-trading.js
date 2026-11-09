'use strict';

const WL_PAGE_SIZE = 10;
let wl = null;

const whitelistOf = a => a.whitelist || { enabled: false, products: [], symbols: [] };
const wlDirty = () => !!wl && JSON.stringify(wl.draft) !== JSON.stringify(whitelistOf(wl.a));
const wlSymbol = symbol => wl.draft.symbols.find(s => s.symbol === symbol);

function whitelistTabHTML(f, a) {
  wl = { f, a, draft: clone(whitelistOf(a)), productQuery: '', productPage: 0, instQuery: '', instPage: 0 };
  const locked = accountLocked(f, a);
  return `<div class="control-bar">
      <div class="control-info">
        <span class="control-icon">${icon('shield')}</span>
        <div><h2>Whitelisting</h2><p>When it’s on, ${esc(a.displayName)} can only trade the products and instruments selected below.</p></div>
      </div>
      <label class="check"><span class="switch"><input type="checkbox" role="switch" id="wlEnabled" ${wl.draft.enabled ? 'checked' : ''} ${locked ? 'disabled' : ''}><span></span></span>Enable Whitelisting</label>
    </div>
    <section class="section">
      <div class="section-head"><h2 class="section-title">Products <span class="section-count" id="wlProductCount"></span></h2></div>
      <div class="filters"><label class="filter-field filter-search"><span>Filter</span><div class="search">${icon('search')}<input class="field" id="wlProductFilter" type="search" placeholder="Product ID or description" autocomplete="off"></div></label></div>
      <div id="wlProducts"></div>
    </section>
    <section class="section tab-block">
      <div class="section-head"><h2 class="section-title">Instruments <span class="section-count" id="wlInstCount"></span></h2></div>
      <div class="filters"><label class="filter-field filter-search"><span>Symbol</span><div class="search">${icon('search')}<input class="field" id="wlInstFilter" type="search" placeholder="Find by exact symbol" autocomplete="off" spellcheck="false"></div></label></div>
      <div id="wlInstruments"></div>
    </section>
    ${locked ? '' : `<div class="dock">
      <div class="dock-acts">
        <button class="btn btn-primary" type="button" data-act="wl-save" id="wlSave">Whitelist Selected</button>
        <button class="btn btn-plain" type="button" data-act="wl-reset" id="wlReset">Cancel</button>
      </div>
      <span class="dock-status" id="wlStatus"></span>
    </div>`}`;
}

function wlPagerHTML(key, page, shown, hasMore) {
  return `<div class="pager pager-cursor">
    <span>${shown ? `Rows ${page * WL_PAGE_SIZE + 1}–${page * WL_PAGE_SIZE + shown}` : 'No rows'}</span>
    <div class="pager-pages">
      <button class="btn btn-line btn-small" type="button" data-act="wl-page" data-list="${key}" data-d="-1" ${page ? '' : 'disabled'}>${icon('back')}Previous</button>
      <button class="btn btn-line btn-small" type="button" data-act="wl-page" data-list="${key}" data-d="1" ${hasMore ? '' : 'disabled'}>Next${icon('forward')}</button>
    </div>
  </div>`;
}

function paintWhitelistProducts() {
  const locked = accountLocked(wl.f, wl.a);
  const needle = wl.productQuery.toLowerCase();
  const all = market.products.filter(p => !needle || `${p.id} ${p.description}`.toLowerCase().includes(needle));
  const rows = all.slice(wl.productPage * WL_PAGE_SIZE, (wl.productPage + 1) * WL_PAGE_SIZE);
  $('#wlProductCount').textContent = `${wl.draft.products.length} selected`;
  $('#wlProducts').innerHTML = rows.length ? `<div class="card table-scroll"><table class="tbl">
      <thead><tr><th class="check-cell"><span class="sr">Whitelist</span></th><th>Product</th><th>Description</th><th>Type</th><th class="hide-compact">Clearing House</th></tr></thead>
      <tbody>${rows.map(p => `<tr>
        <td class="check-cell"><input type="checkbox" data-wl-product="${esc(p.id)}" ${wl.draft.products.includes(p.id) ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="Whitelist ${esc(p.id)}"></td>
        <td class="mono">${esc(p.id)}</td><td>${entityCell(p.description, {})}</td><td>${entityCell(p.type, {})}</td><td class="hide-compact">${entityCell(p.clearingHouse, {})}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${wlPagerHTML('product', wl.productPage, rows.length, (wl.productPage + 1) * WL_PAGE_SIZE < all.length)}` : '<div class="card empty small"><p>No products match.</p></div>';
}

function paintWhitelistInstruments() {
  const locked = accountLocked(wl.f, wl.a);
  const all = market.instruments.filter(i => i.state !== 'Terminated' && (!wl.instQuery || i.id === wl.instQuery));
  const rows = all.slice(wl.instPage * WL_PAGE_SIZE, (wl.instPage + 1) * WL_PAGE_SIZE);
  $('#wlInstCount').textContent = `${wl.draft.symbols.length} selected`;
  $('#wlInstruments').innerHTML = rows.length ? `<div class="card table-scroll"><table class="tbl tbl-wide">
      <thead><tr><th class="check-cell"><span class="sr">Whitelist</span></th><th>Product</th><th>Symbol</th><th>Description</th><th>Restrict to Side</th><th>Clearing House</th><th>State</th></tr></thead>
      <tbody>${rows.map(i => {
        const pick = wlSymbol(i.id);
        return `<tr>
          <td class="check-cell"><input type="checkbox" data-wl-symbol="${esc(i.id)}" ${pick ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="Whitelist ${esc(i.id)}"></td>
          <td class="mono">${esc(i.productId)}</td><td class="mono"><strong>${esc(i.id)}</strong></td><td class="desc-cell" title="${esc(i.description)}">${entityCell(i.description, {})}</td>
          <td><select class="field" data-wl-side="${esc(i.id)}" aria-label="Restrict ${esc(i.id)} to side" ${pick && !locked ? '' : 'disabled'}><option value="">Both sides</option>${ORDER_SIDES.map(s => `<option ${pick && pick.side === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
          <td class="house-cell">${entityCell(i.clearingHouse, {})}</td><td>${statusPill(i.state)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    ${wlPagerHTML('inst', wl.instPage, rows.length, (wl.instPage + 1) * WL_PAGE_SIZE < all.length)}` : `<div class="card empty small"><p>${wl.instQuery ? `No instrument has the symbol “${esc(wl.instQuery)}”.` : 'No instruments.'}</p></div>`;
}

function syncWhitelistDock() {
  const save = $('#wlSave');
  if (!save) return;
  const dirty = wlDirty();
  save.disabled = !dirty;
  $('#wlReset').disabled = !dirty;
  $('#wlStatus').textContent = dirty ? 'Unsaved changes' : '';
}

function mountWhitelist() {
  paintWhitelistProducts();
  paintWhitelistInstruments();
  syncWhitelistDock();
}

function saveWhitelist() {
  wl.a.whitelist = clone(wl.draft);
  persist();
  syncWhitelistDock();
  toast(wl.draft.enabled ? 'Whitelist updated.' : 'Whitelist saved. Whitelisting is off for this account.');
}

function resetWhitelist() {
  wl.draft = clone(whitelistOf(wl.a));
  $('#wlEnabled').checked = wl.draft.enabled;
  mountWhitelist();
}

function onWhitelistChange(t) {
  if (t.id === 'wlEnabled') wl.draft.enabled = t.checked;
  else if (t.dataset.wlProduct) {
    const id = t.dataset.wlProduct;
    wl.draft.products = t.checked ? [...wl.draft.products, id] : wl.draft.products.filter(x => x !== id);
    $('#wlProductCount').textContent = `${wl.draft.products.length} selected`;
  } else if (t.dataset.wlSymbol) {
    const symbol = t.dataset.wlSymbol;
    wl.draft.symbols = t.checked ? [...wl.draft.symbols, { symbol, side: '' }] : wl.draft.symbols.filter(s => s.symbol !== symbol);
    paintWhitelistInstruments();
  } else if (t.dataset.wlSide) {
    const pick = wlSymbol(t.dataset.wlSide);
    if (pick) pick.side = t.value;
  } else return false;
  syncWhitelistDock();
  return true;
}

const commissionsOf = a => a.commissions || (a.commissions = []);

function commissionsTabHTML(f, a) {
  const locked = accountLocked(f, a);
  const rows = commissionsOf(a);
  const add = locked ? '' : `<button class="btn btn-primary" type="button" data-act="comm-new">${icon('plus')}New Commission</button>`;
  return `${tabToolbarHTML('Commissions', TIPS.commissionAccount, add)}
    ${rows.length ? `<div class="card table-scroll"><table class="tbl tbl-wide">
      <thead><tr>${COMMISSION_COLUMNS.map(([label, , num]) => `<th class="${num ? 'num' : ''}">${esc(label)}</th>`).join('')}<th class="acts">Actions</th></tr></thead>
      <tbody>${rows.map((c, i) => `<tr>
        ${COMMISSION_COLUMNS.map(([, get, num], ci) => `<td class="${num ? 'num' : ''} ${ci === COMMISSION_COLUMNS.length - 2 ? 'desc-cell' : ''}">${entityCell(get(c), ci === 0 ? { strong: true } : {})}</td>`).join('')}
        <td class="acts">
          <button class="icon-btn" type="button" data-act="comm-view" data-i="${i}" aria-label="View commission" title="View">${icon('eye')}</button>
          ${locked ? '' : `<button class="icon-btn" type="button" data-act="comm-edit" data-i="${i}" aria-label="Edit commission" title="Edit">${icon('edit')}</button>
          <button class="icon-btn danger" type="button" data-act="comm-del" data-i="${i}" aria-label="Delete commission" title="Delete">${icon('trash')}</button>`}
        </td>
      </tr>`).join('')}</tbody>
    </table></div>` : `<div class="card empty"><h3>No commissions</h3><p>Commissions collected into ${esc(a.displayName)} show here.</p>${add}</div>`}`;
}

function validateCommission(v) {
  const errors = {};
  COMMISSION_NUMBERS.forEach(([k, label]) => {
    const expression = v.evaluateAsExpression && !['minimumNotional', 'maximumNotional', 'maximumRateBasisPoints'].includes(k);
    if (!expression && String(v[k] ?? '').trim() && !isNumber(v[k])) errors[k] = `${label} must be a number.`;
  });
  if (v.expirationTime && !COMMISSION_OVERRIDES.some(k => !isEmpty(v[k]))) errors.expirationTime = 'An expiration only applies to an override. Add an override, or clear the expiration.';
  return errors;
}

function cleanCommission(v) {
  const c = { ...v };
  if (isBasisPoints(c)) { c.flatFee = ''; c.makerFlatFee = ''; } else { c.basisPoints = ''; c.makerBasisPoints = ''; c.applyAsSpread = false; }
  if (c.applyAsSpread) c.makerBasisPoints = '';
  if (c.minimumNotional || c.maximumNotional) c.applyAsSpread = false;
  return c;
}

function openCommissionForm(a, index) {
  const rows = commissionsOf(a);
  const editing = index !== null;
  openFormSheet({
    title: editing ? 'Edit Commission' : 'New Commission',
    submit: editing ? 'Save' : 'Create Commission',
    note: `Commissions are collected into ${a.displayName}.${editing ? ' The filters and overrides can’t be changed after the commission is created.' : ''}`,
    fields: commissionFields(editing),
    values: editing ? clone(rows[index]) : { type: COMMISSION_TYPES[0], roundingMethod: ROUNDING_METHODS[0], includeProperties: [], excludeProperties: [] },
    repaintOn: ['type', 'applyAsSpread', 'minimumNotional', 'maximumNotional'],
    validate: validateCommission,
    onSubmit: v => {
      const saved = cleanCommission(v);
      if (editing) rows[index] = saved; else rows.push(saved);
      persist();
      route();
      toast(editing ? 'Commission updated.' : 'Commission created.');
    },
  });
}

function openCommissionView(f, a, index) {
  const c = commissionsOf(a)[index];
  const locked = accountLocked(f, a);
  openWideSheet({
    title: 'Commission',
    primary: locked ? '' : 'Edit Commission',
    body: () => `<div class="card">${commissionFields(false)(c).filter(x => visible(x, c)).map(x => readRow(x, c)).join('')}</div>`,
    onPrimary: () => {
      $('#sheet').close();
      openCommissionForm(a, index);
    },
  });
}

async function deleteCommission(a, index) {
  const ok = await ask({ title: 'Delete this commission?', text: `It’s no longer collected into ${a.displayName}.`, confirm: 'Delete Commission', danger: true, glyph: 'trash' });
  if (!ok) return;
  commissionsOf(a).splice(index, 1);
  persist();
  route();
  toast('Commission deleted.');
}
