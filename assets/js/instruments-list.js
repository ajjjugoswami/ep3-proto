'use strict';

const blankInstrumentFilters = () => Object.fromEntries(INSTRUMENT_FILTERS.map(f => [f.k, '']));
const instList = { page: 0, size: 10, showFilters: !isPhoneWidth(), sort: '', dir: 1, ...blankInstrumentFilters(), ...readListState('instList') };
const instSelected = new Set();

const instStat = (valueKey, setTime) => i => {
  const s = i.stats || {};
  return s[setTime] && s[valueKey] !== '' && s[valueKey] !== undefined ? Number(s[valueKey]) : null;
};
const INSTRUMENT_SORTS = {
  productId: i => i.productId,
  id: i => i.id,
  description: i => i.description,
  tradable: i => (i.nonTradable ? 'N' : 'Y'),
  clearingHouse: i => i.clearingHouse,
  scheduled: i => (i.isScheduled ? 'Scheduled' : 'Manual'),
  open:instStat('open', 'openSetTime'),
  high: instStat('high', 'highSetTime'),
  low: instStat('low', 'lowSetTime'),
  close: instStat('close', 'closeSetTime'),
  lastPrice: instStat('lastPrice', 'lastTradeSetTime'),
  settlementPrice: instStat('settlementPrice', 'settlementSetTime'),
};
const sortedInstruments = rows => (INSTRUMENT_SORTS[instList.sort] ? sortRows(rows, INSTRUMENT_SORTS[instList.sort], instList.dir) : rows);

const instrumentFilterActive = () => INSTRUMENT_FILTERS.some(f => instList[f.k]);
const shownFilters = () => INSTRUMENT_FILTERS.filter(f => !f.irs || instList.type === IT.IRS);

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
  return `<div class="filters filters-grid" id="listFilters" ${instList.showFilters === false ? 'hidden' : ''}>${shownFilters().map(filterFieldHTML).join('')}</div>`;
}

function instrumentFilterChips() {
  return INSTRUMENT_FILTERS.filter(f => String(instList[f.k] || '').trim()).map(f => ({
    key: f.k,
    label: f.label,
    value: f.date ? formatWhen(instList[f.k]) : String(instList[f.k]).trim(),
  }));
}

function removeInstrumentFilter(key) {
  instList[key] = '';
  instList.page = 0;
  if (key === 'type') INSTRUMENT_FILTERS.filter(f => f.irs).forEach(f => { instList[f.k] = ''; });
  refreshInstrumentFilters();
  refreshInstruments();
}

function instrumentOpsMenuItems() {
  return [
    { label: 'Export Data', icon: 'download', run: exportInstruments },
    { label: 'Import Settlement Prices', icon: 'upload', run: () => $('#csvFile').click() },
    { label: 'Approve Settlement Prices', icon: 'check', run: openApproveSheet },
    '-',
    { label: 'Resume Halted to Schedule', icon: 'play', run: resumeHaltedInstruments },
  ];
}

function renderInstruments() {
  document.title = 'Instruments · EP3 Admin';
  listCtl = { state: instList, refresh: refreshInstruments, removeFilter: removeInstrumentFilter, noun: 'instruments' };
  $('#view').innerHTML = `<div class="detail-page">
    ${moduleHeadHTML('instruments', `
      <button class="btn btn-outline" type="button" data-act="inst-refresh">${icon('refresh')}Refresh MKT Data</button>
      <a class="btn btn-primary" href="instrument.html?mode=new">${icon('plus')}Add Instrument</a>`)}
    <div class="detail-scroll list-view">
      ${controlBarHTML('chart', 'Trading Controls', 'Manage trading availability for instruments', `
        <button class="btn btn-outline-bad" type="button" data-act="inst-halt-all">${icon('stop')}Halt All</button>
        ${filtersButtonHTML()}
        <button class="btn btn-line" type="button" data-act="inst-ops-menu" aria-haspopup="menu">${icon('more')}More</button>`)}
      <div id="instFilters">${instrumentFiltersHTML()}</div>
      <div class="filter-chips" id="instChips" role="group" aria-label="Active filters" hidden></div>
      <input type="file" id="csvFile" accept=".csv" hidden>
      <p class="sr" id="instCount" aria-live="polite"></p>
      <div class="sel-bar" id="instSelection" hidden></div>
      <section class="card card-clip list-card" id="instResults" aria-label="Instruments"></section>
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
    <td data-label="Product Name">${esc(i.productId)}</td>
    <td class="inst-id"><a class="firm-name" href="${esc(instHref(i.id))}">${esc(i.id)}</a></td>
    <td class="desc-cell" title="${esc(i.description)}">${esc(i.description)}</td>
    <td data-label="Tradable"><span class="pill ${i.nonTradable ? 'pill-closed' : 'pill-active'}">${i.nonTradable ? 'No' : 'Yes'}</span></td>
    <td class="house-cell" data-label="Clearing House" title="${esc(i.clearingHouse)}">${esc(i.clearingHouse)}</td>
    <td data-label="Schedule"><span class="pill ${i.isScheduled ? 'pill-preopen' : 'pill-halted'}">${i.isScheduled ? 'Scheduled' : 'Manual'}</span></td>
    <td class="inst-state">${statusPill(i.state)}</td>
    <td class="num" data-label="Open">${stat(s.open, 'openSetTime')}</td>
    <td class="num" data-label="High">${stat(s.high, 'highSetTime')}</td>
    <td class="num" data-label="Low">${stat(s.low, 'lowSetTime')}</td>
    <td class="num" data-label="Close">${stat(s.close, 'closeSetTime')}</td>
    <td class="num" data-label="Last PX">${stat(s.lastPrice, 'lastTradeSetTime')}</td>
    <td class="num" data-label="Settl-PX">${stat(s.settlementPrice, 'settlementSetTime')}</td>
    <td class="acts">
      <a class="icon-btn" href="${esc(instHref(i.id))}" aria-label="View ${esc(i.id)}" title="View">${icon('eye')}</a>
      ${instEditable(i) ? `<a class="icon-btn" href="${esc(instHref(i.id, 'edit'))}" aria-label="Edit ${esc(i.id)}" title="Edit">${icon('edit')}</a>` : ''}
      <button class="icon-btn" type="button" data-act="inst-row-menu" data-id="${esc(i.id)}" aria-haspopup="menu" aria-label="More actions for ${esc(i.id)}" title="More">${icon('more')}</button>
    </td>
  </tr>`;
}

function refreshInstruments() {
  saveListState('instList', instList);
  const rows = sortedInstruments(filteredInstruments());
  const pages =Math.max(1, Math.ceil(rows.length / instList.size));
  instList.page = Math.min(instList.page, pages - 1);
  const start = instList.page * instList.size;
  const pageRows = rows.slice(start, start + instList.size);
  $('#instCount').textContent = `${rows.length} instrument${rows.length === 1 ? '' : 's'}`;
  showFilterChips($('#instChips'), instrumentFilterChips(), 'inst-clear-filters');
  if (!rows.length) {
    $('#instResults').innerHTML = instrumentFilterActive()
      ? `<div class="empty"><h3>No matching instruments</h3><p>Try different filters, or clear them.</p><button class="btn btn-tint" type="button" data-act="inst-clear-filters">Clear Filters</button></div>`
      : `<div class="empty"><h3>No instruments yet</h3><p>Add an instrument from one of your products.</p><a class="btn btn-primary" href="instrument.html?mode=new">${icon('plus')}Add Instrument</a></div>`;
    refreshSelection();
    return;
  }
  patchListTable($('#instResults'), `<div class="table-scroll"><table class="tbl tbl-wide">
      <thead><tr>
        <th class="check-cell"><input type="checkbox" id="instCheckAll" aria-label="Select all on this page"></th>
        ${sortHeader('productId', 'Product Name')}${sortHeader('id', 'ID (Symbol)')}${sortHeader('description', 'Description')}${sortHeader('tradable', 'Tradable')}${sortHeader('clearingHouse', 'Clearing House')}${sortHeader('scheduled', 'Schedule')}<th>State</th>
        ${sortHeader('open', 'Open', 'num')}${sortHeader('high', 'High', 'num')}${sortHeader('low', 'Low', 'num')}${sortHeader('close', 'Close', 'num')}${sortHeader('lastPrice', 'Last PX', 'num')}${sortHeader('settlementPrice', 'Settl-PX', 'num')}
        <th class="acts">Actions</th>
      </tr></thead>
      <tbody>${pageRows.map(instrumentRowHTML).join('')}</tbody>
    </table></div>
    ${pagerHTML(rows.length)}`);
  refreshSelection();
}

function instrumentMenuItems(i, onDetail) {
  const editable = instEditable(i);
  return [
    ...(onDetail ? [] : [
      { label: 'Duplicate', icon: 'copy', run: () => go(instHref(i.id, 'copy')) },
      { label: 'Halt / Resume', icon: i.state === 'Halted' ? 'play' : 'pause', disabled: !canToggleHalt(i), reason: 'This instrument can’t be halted or resumed.', run: () => toggleInstrumentHalt(i) },
      { label: 'View Records', icon: 'list', run: () => go(instHistoryHref(i.id)) },
      { label: 'State', icon: 'edit', disabled: !editable, reason: EDIT_BLOCKED, run: () => openStateSheet([i.id]) },
    ]),
    { label: 'Book', icon: 'book', run: () => go(bookHref(i.id)) },
    { label: 'Review Market Stats', icon: 'chart', disabled: !instStatsEnabled(i), reason: STATS_BLOCKED, run: () => go(instStatsHref(i.id)) },
    '-',
    { label: 'Delete', icon: 'trash', danger: true, disabled: !instDeletable(i), reason: DELETE_BLOCKED, run: () => deleteInstruments([i.id]) },
  ];
}

const canToggleHalt = i => !i.nonTradable && (i.state === 'Halted' || !HALTABLE_EXCLUDED.includes(i.state));

async function toggleInstrumentHalt(i) {
  const halted = i.state === 'Halted';
  const ok = await ask({ title: `${halted ? 'Resume' : 'Halt'} ${i.id}?`, text: halted ? 'This resumes the instrument to its original schedule.' : 'This halts trading for this instrument.', confirm: 'Confirm', danger: !halted, glyph: halted ? 'play' : 'pause' });
  if (!ok) return;
  if (halted) { i.isScheduled = true; i.state = stateFromSchedule(i); } else { i.state = 'Halted'; i.isScheduled = false; }
  saveMarket();
  refreshInstruments();
  toast(`${halted ? 'Resumed' : 'Halted'} ${i.id}.`);
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
