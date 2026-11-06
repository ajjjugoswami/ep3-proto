'use strict';

const blankInstrumentFilters = () => Object.fromEntries(INSTRUMENT_FILTERS.map(f => [f.k, '']));
const instList = { page: 0, size: 10, ...blankInstrumentFilters(), ...readSaved('instList') };
const instSelected = new Set();

const instrumentFilterActive = () => INSTRUMENT_FILTERS.some(f => instList[f.k]);

function matchesInstrumentFilters(i) {
  const f = instList;
  const contains = (value, needle) => String(value || '').toLowerCase().includes(String(needle).trim().toLowerCase());
  if (f.state ? i.state !== f.state : i.state === 'Terminated') return false;
  if (f.productName && !contains(i.productId, f.productName)) return false;
  if (f.id && !contains(i.id, f.id)) return false;
  if (f.type && i.type !== f.type) return false;
  if (f.isScheduled && (f.isScheduled === 'Scheduled') !== !!i.isScheduled) return false;
  if (f.isTradable && (f.isTradable === 'Tradable') !== !i.nonTradable) return false;
  if (f.hasLegs && (f.hasLegs === 'Has Legs') !== ((i.legs || []).length > 0)) return false;
  if (f.type === IT.IRS) {
    if (f.tradeDate && i.startDate !== f.tradeDate) return false;
    if (f.clearingHouse && i.clearingHouse !== f.clearingHouse) return false;
    if (f.basecurrency && i.basecurrency !== f.basecurrency) return false;
    if (f.tenor && !contains(i.tenor, f.tenor)) return false;
    if (f.floatingRateIndex && i.floatingRateIndex !== f.floatingRateIndex) return false;
    if (f.floatingRateIndexTenor && !contains(i.floatingRateIndexTenor, f.floatingRateIndexTenor)) return false;
  }
  return true;
}

const filteredInstruments = () => market.instruments.filter(matchesInstrumentFilters);

function filterFieldHTML(f) {
  const value = instList[f.k];
  if (f.options) {
    const options = typeof f.options === 'function' ? f.options() : f.options;
    return `<label class="filter-field"><span>${esc(f.label)}</span>
      <select class="field" data-filter="${f.k}"><option value="">All</option>${options.map(o => `<option value="${esc(o)}" ${value === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
    </label>`;
  }
  return `<label class="filter-field"><span>${esc(f.label)}</span>
    <input class="field filter-input" data-filter="${f.k}" type="${f.date ? 'date' : 'search'}" value="${esc(value)}" autocomplete="off" spellcheck="false">
  </label>`;
}

function instrumentFiltersHTML() {
  const shown = INSTRUMENT_FILTERS.filter(f => !f.irs || instList.type === IT.IRS);
  return `${shown.map(filterFieldHTML).join('')}
    <button class="btn btn-gray filter-reset" type="button" data-act="inst-clear-filters" ${instrumentFilterActive() ? '' : 'disabled'}>Reset</button>`;
}

function renderInstruments() {
  document.title = 'Instruments · EP3 Admin';
  listCtl = { state: instList, refresh: refreshInstruments };
  $('#view').innerHTML = `<div class="detail-page">
    ${moduleHeadHTML('instruments', `
      <button class="btn btn-gray" type="button" data-act="inst-refresh">${icon('refresh')}Refresh Market Data</button>
      <a class="btn btn-primary" href="instrument.html?mode=new">${icon('plus')}Add Instrument</a>`)}
    <div class="detail-scroll">
      <div class="filter-grid" id="instFilters">${instrumentFiltersHTML()}</div>
      <div class="op-bar">
        <p class="sr" id="instCount" aria-live="polite"></p>
        <div class="head-acts">
          <button class="btn btn-danger-soft" type="button" data-act="inst-halt-all">${icon('pause')}Halt All</button>
          <button class="btn btn-gray" type="button" data-act="inst-resume">${icon('play')}Resume Halted to Schedule</button>
          <button class="btn btn-gray" type="button" data-act="inst-export">${icon('download')}Export Data</button>
          <button class="btn btn-gray" type="button" data-act="inst-import">${icon('upload')}Import Settlement Prices</button>
          <button class="btn btn-gray" type="button" data-act="inst-approve">${icon('check')}Approve Settlement Prices</button>
          <input type="file" id="csvFile" accept=".csv" hidden>
        </div>
      </div>
      <div class="sel-bar" id="instSelection" hidden></div>
      <section class="card" id="instResults" aria-label="Instruments"></section>
    </div>
  </div>`;
  refreshInstruments();
}

function refreshInstrumentFilters() {
  $('#instFilters').innerHTML = instrumentFiltersHTML();
}

function selectionBarHTML(rows) {
  const chosen = rows.filter(r => instSelected.has(r.id));
  if (!chosen.length) return '';
  const canDelete = chosen.every(instDeletable);
  return `<span>${chosen.length} selected</span>
    <button class="btn btn-gray btn-small" type="button" data-act="inst-sel-state">${icon('warn')}Change State</button>
    <button class="btn btn-gray btn-small" type="button" data-act="inst-sel-delete" ${canDelete ? '' : `disabled title="${esc(DELETE_BLOCKED)}"`}>${icon('trash')}Delete Selected</button>
    <button class="btn btn-plain btn-small" type="button" data-act="inst-sel-clear">Clear</button>`;
}

function refreshSelection() {
  const rows = filteredInstruments();
  const bar = $('#instSelection');
  if (!bar) return;
  const html = selectionBarHTML(rows);
  bar.hidden = !html;
  bar.innerHTML = html;
  const all = $('#instCheckAll');
  if (all) {
    const onPage = $$('.inst-check').map(c => c.value);
    all.checked = onPage.length > 0 && onPage.every(id => instSelected.has(id));
    all.indeterminate = !all.checked && onPage.some(id => instSelected.has(id));
  }
}

function instrumentRowHTML(i) {
  const s = i.stats || {};
  const stat = (value, setTime) => (s[setTime] ? px(i, value) : '');
  return `<tr data-href="${esc(instHref(i.id))}" data-inst="${esc(i.id)}">
    <td class="check-cell"><input class="inst-check" type="checkbox" value="${esc(i.id)}" ${instSelected.has(i.id) ? 'checked' : ''} aria-label="Select ${esc(i.id)}"></td>
    <td>${esc(i.productId)}</td>
    <td><a class="firm-name mono" href="${esc(instHref(i.id))}">${esc(i.id)}</a></td>
    <td class="desc-cell" title="${esc(i.description)}">${esc(i.description)}</td>
    <td>${i.nonTradable ? 'N' : 'Y'}</td>
    <td class="house-cell" title="${esc(i.clearingHouse)}">${esc(i.clearingHouse)}</td>
    <td>${i.isScheduled ? 'Scheduled' : '<span class="text-bad">Manual</span>'}</td>
    <td>${statusPill(i.state)}</td>
    <td class="num">${stat(s.open, 'openSetTime')}</td>
    <td class="num">${stat(s.high, 'highSetTime')}</td>
    <td class="num">${stat(s.low, 'lowSetTime')}</td>
    <td class="num">${stat(s.close, 'closeSetTime')}</td>
    <td class="num">${stat(s.lastPrice, 'lastTradeSetTime')}</td>
    <td class="num">${stat(s.settlementPrice, 'settlementSetTime')}</td>
    <td class="acts">
      ${instEditable(i) ? `<a class="icon-btn" href="${esc(instHref(i.id, 'edit'))}" aria-label="Edit ${esc(i.id)}" title="Edit">${icon('edit')}</a>` : ''}
      <button class="icon-btn" type="button" data-act="inst-row-menu" data-id="${esc(i.id)}" aria-haspopup="menu" aria-label="More actions for ${esc(i.id)}" title="More">${icon('more')}</button>
    </td>
  </tr>`;
}

function refreshInstruments() {
  session.set('instList', JSON.stringify(instList));
  const rows = filteredInstruments();
  const pages = Math.max(1, Math.ceil(rows.length / instList.size));
  instList.page = Math.min(instList.page, pages - 1);
  const start = instList.page * instList.size;
  const pageRows = rows.slice(start, start + instList.size);
  $('#instCount').textContent = `${rows.length} instrument${rows.length === 1 ? '' : 's'}`;
  const reset = $('[data-act="inst-clear-filters"]');
  if (reset) reset.disabled = !instrumentFilterActive();
  if (!rows.length) {
    $('#instResults').innerHTML = instrumentFilterActive()
      ? `<div class="empty"><h3>No matching instruments</h3><p>Try different filters, or clear them.</p><button class="btn btn-tint" type="button" data-act="inst-clear-filters">Clear Filters</button></div>`
      : `<div class="empty"><h3>No instruments yet</h3><p>Add an instrument from one of your products.</p><a class="btn btn-primary" href="instrument.html?mode=new">${icon('plus')}Add Instrument</a></div>`;
    refreshSelection();
    return;
  }
  $('#instResults').innerHTML = `<div class="table-scroll"><table class="tbl tbl-wide">
      <thead><tr>
        <th class="check-cell"><input type="checkbox" id="instCheckAll" aria-label="Select all on this page"></th>
        <th>Product Name</th><th>ID (Symbol)</th><th>Description</th><th>Tradable</th><th>Clearing House</th><th>Scheduled</th><th>State</th>
        <th class="num">Open</th><th class="num">High</th><th class="num">Low</th><th class="num">Close</th><th class="num">Last-Px</th><th class="num">Settl-Px</th>
        <th class="acts"><span class="sr">Actions</span></th>
      </tr></thead>
      <tbody>${pageRows.map(instrumentRowHTML).join('')}</tbody>
    </table></div>
    ${pagerHTML(rows.length)}`;
  refreshSelection();
}

function instrumentMenuItems(i, onDetail) {
  const editable = instEditable(i);
  return [
    ...(onDetail ? [] : [
      { label: 'View', icon: 'eye', run: () => go(instHref(i.id)) },
      { label: 'Change State', icon: 'warn', disabled: !editable, reason: EDIT_BLOCKED, run: () => go(instStateHref(i.id)) },
      { label: 'Edit', icon: 'edit', disabled: !editable, reason: EDIT_BLOCKED, run: () => go(instHref(i.id, 'edit')) },
      { label: 'Copy', icon: 'copy', run: () => go(instHref(i.id, 'copy')) },
      '-',
    ]),
    { label: 'Book', icon: 'book', run: () => go(bookHref(i.id)) },
    { label: 'Review Market Stats', icon: 'chart', disabled: !instStatsEnabled(i), reason: STATS_BLOCKED, run: () => go(instStatsHref(i.id)) },
    ...(onDetail ? [] : [{ label: 'Open in New Tab', icon: 'new-tab', run: () => window.open(instHref(i.id), '_blank') }]),
    '-',
    { label: 'Delete', icon: 'trash', danger: true, disabled: !instDeletable(i), reason: DELETE_BLOCKED, run: () => deleteInstruments([i.id]) },
  ];
}

async function deleteInstruments(ids, fromSelection) {
  const many = ids.length > 1;
  const ok = await ask({
    title: `Delete ${many ? `${ids.length} instruments` : ids[0]}?`,
    text: fromSelection ? `This permanently deletes the selected instrument${many ? 's' : ''}.` : 'This permanently deletes the instrument.',
    confirm: many ? 'Delete Instruments' : 'Delete Instrument', danger: true, glyph: 'trash',
  });
  if (!ok) return;
  market.instruments = market.instruments.filter(i => !ids.includes(i.id));
  ids.forEach(id => instSelected.delete(id));
  saveMarket();
  if (PAGE === 'instruments') refreshInstruments();
  else go('instruments.html');
  toast(`${many ? 'Instruments' : 'Instrument'} deleted.`);
}

async function haltAllInstruments() {
  const ok = await ask({ title: 'Halt all instruments?', text: 'This halts all active tradable instruments.', confirm: 'Halt All', danger: true, glyph: 'pause' });
  if (!ok) return;
  const targets = market.instruments.filter(i => !i.nonTradable && !HALTABLE_EXCLUDED.includes(i.state));
  targets.forEach(i => { i.state = 'Halted'; i.isScheduled = false; });
  saveMarket();
  refreshInstruments();
  toast(`Halted ${targets.length} instrument${targets.length === 1 ? '' : 's'}.`);
}

async function resumeHaltedInstruments() {
  const ok = await ask({ title: 'Resume halted instruments?', text: 'This resumes all halted tradable instruments to their original schedule.', confirm: 'Resume to Schedule', glyph: 'play' });
  if (!ok) return;
  const targets = market.instruments.filter(i => !i.nonTradable && i.state === 'Halted');
  targets.forEach(i => { i.isScheduled = true; i.state = stateFromSchedule(i); });
  saveMarket();
  refreshInstruments();
  toast(`Resumed ${targets.length} instrument${targets.length === 1 ? '' : 's'}.`);
}

function refreshMarketData() {
  market.instruments.forEach(i => {
    const s = i.stats || {};
    if (!s.lastTradeSetTime || !s.lastPrice || i.state !== 'Open') return;
    const move = 1 + (Math.random() - 0.5) * 0.004;
    s.lastPrice = (Number(s.lastPrice) * move).toFixed(Math.max(decimalsOf(i.minimumPriceIncrement), decimalsOf(s.lastPrice)));
    s.high = String(Math.max(Number(s.high), Number(s.lastPrice)));
    s.low = String(Math.min(Number(s.low), Number(s.lastPrice)));
    s.lastTradeSetTime = isoDateTime(new Date());
  });
  saveMarket();
  refreshInstruments();
  toast('Market data refreshed.');
}
