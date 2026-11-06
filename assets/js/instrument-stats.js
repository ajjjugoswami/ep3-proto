'use strict';

const canEditStat = (x, inst) => x.tradable || !!inst.nonTradable;

function statFieldHTML(x, inst) {
  const v = form.draft;
  return canEditStat(x, inst) ? fieldRow(x, v, form.errors, 'firm') : readRow(x, v);
}

function statsBody(inst) {
  const v = form.draft;
  const price = key => STAT_PRICE_FIELDS.find(x => x.k === key);
  const before = ['open', 'indicativeOpen', 'high', 'low', 'close', 'lastPrice', 'lastQuantity', 'notionalTraded', 'sharesTraded', 'settlementPrice'];
  const after = ['openInterest', 'tradingReferencePrice', 'markPrice'];
  return `<div class="card form-card"><div class="form-grid form-list">
      ${readRow({ k: 'id', label: 'Instrument ID (Symbol)', mono: true, display: () => inst.id }, v)}
      ${readRow({ k: 'description', label: 'Description', display: () => inst.description }, v)}
      ${before.map(k => statFieldHTML(price(k), inst)).join('')}
      ${readRow({ k: 'settlementPriceCalculationMethod', label: 'Settlement Calculation Method' }, v)}
      ${fieldRow({ k: 'settlementPriceCalculationText', label: 'Settlement Price Calculation Text' }, v, form.errors, 'firm')}
      ${fieldRow({ k: 'settlementPreliminary', label: 'Settlement Preliminary', kind: 'toggle' }, v, form.errors, 'firm')}
      ${after.map(k => statFieldHTML(price(k), inst)).join('')}
      ${inst.nonTradable ? fieldRow({ k: 'transactTime', label: 'Transact Time', inputType: 'datetime-local' }, v, form.errors, 'firm') : readRow({ k: 'transactTime', label: 'Transact Time', display: d => showDateTime(d.transactTime) }, v)}
      <div class="form-subhead"><h3 class="section-title">Update Times</h3></div>
      ${STAT_TIME_FIELDS.map(x => (canEditStat(x, inst) ? fieldRow({ ...x, inputType: 'datetime-local' }, v, form.errors, 'firm') : readRow({ k: x.k, label: x.label, display: d => showDateTime(d[x.k]) }, v))).join('')}
    </div></div>`;
}

function validateStats(inst) {
  const v = form.draft;
  const e = {};
  const qtyInc = inst.minimumTradeQuantity || '1';
  STAT_PRICE_FIELDS.forEach(x => {
    const value = v[x.k];
    if (value === undefined || value === null || String(value).trim() === '') return;
    if (!Number.isFinite(Number(value))) { e[x.k] = `${x.label} must be a number.`; return; }
    if (!canEditStat(x, inst) || x.notional) return;
    if (!validScale(value, x.qty ? qtyInc : inst.minimumPriceIncrement)) e[x.k] = `${x.label} scale is not valid.`;
  });
  return e;
}

function renderStatsPage() {
  const inst = instrumentById(param('id'));
  if (!inst) {
    marketNotFound('Instrument not found', param('id'), 'instruments.html', 'Instruments');
    return;
  }
  document.title = `${inst.id} Market Stats · EP3 Admin`;
  startMarketForm({
    mode: 'edit',
    draft: { ...clone(inst.stats || {}) },
    validate: () => validateStats(inst),
    submit: () => submitStats(inst),
    crumb: { href: instHref(inst.id), label: inst.id },
    title: 'Instrument Market Stats',
    backHref: 'instruments.html',
    saveLabel: 'Save',
  });
  form.module.body = () => statsBody(inst);
  refreshFormBody();
  $('.page-head').insertAdjacentHTML('beforeend', `<a class="btn btn-gray" href="${esc(instHistoryHref(inst.id))}">${icon('chart')}Historical Market Stats</a>`);
}

const STAT_TIME_OF = { open: 'openSetTime', indicativeOpen: 'indicativeOpenSetTime', high: 'highSetTime', low: 'lowSetTime', close: 'closeSetTime', lastPrice: 'lastTradeSetTime', notionalTraded: 'notionalSetTime', settlementPrice: 'settlementSetTime', openInterest: 'openInterestSetTime', tradingReferencePrice: 'tradingReferencePriceSetTime', markPrice: 'markPriceSetTime' };

async function submitStats(inst) {
  form.errors = validateStats(inst);
  if (Object.keys(form.errors).length) {
    refreshFormBody();
    updateDock();
    return;
  }
  updateDock();
  if (!isDirty()) return;
  const ok = await ask({ title: 'Save market stats?', text: `This saves the market stats for ${inst.id}.`, confirm: 'Save Stats', glyph: 'check' });
  if (!ok) return;
  const saved = clone(form.draft);
  const before = form.original;
  Object.entries(STAT_TIME_OF).forEach(([key, timeKey]) => {
    if (String(saved[key] ?? '') !== String(before[key] ?? '') && saved[timeKey] === before[timeKey]) saved[timeKey] = saved[key] === '' ? '' : isoDateTime(new Date());
  });
  inst.stats = saved;
  saveMarket();
  form = null;
  go('instruments.html');
  toast('Instrument stats were saved.');
}

const historyList = { page: 0, size: 10, from: '', to: '' };
const todayRange = () => {
  const now = new Date();
  return { from: `${isoDate(now)}T00:00`, to: `${isoDate(now)}T23:59` };
};

function historyRows(inst) {
  const base = Number((inst.stats || {}).lastPrice);
  if (!Number.isFinite(base) || !base) return [];
  const decimals = decimalsOf(inst.minimumPriceIncrement);
  const seed = hashText(inst.id);
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return Array.from({ length: 60 }, (_, n) => {
    const at = new Date(now.getTime() - n * 3600000);
    const swing = n === 0 ? 1 : 1 + (((seed + n * 37) % 41) - 20) / 2000;
    const value = factor => (base * swing * factor).toFixed(decimals);
    const stamp = isoDateTime(at);
    return {
      transactionTime: stamp, openPx: value(0.996), openSetTime: stamp, indicativeOpenPx: value(0.995), indicativeOpenSetTime: stamp, highPx: value(1.012), highSetTime: stamp, lowPx: value(0.988), lowSetTime: stamp,
      closePx: value(1.001), closeSetTime: stamp, lastTradePx: value(1), lastTradeSetTime: stamp, lastTradeQty: String(1 + ((seed + n) % 25)), notionalTraded: (base * swing * (40 + n)).toFixed(2), notionalSetTime: stamp, sharesTraded: String(40 + n),
      settlementPx: value(1.002), settlementSetTime: stamp, settlementPreliminaryFlag: false, settlementPriceCalculationMethod: 'VWAP TIER 1', settlementPriceCalculationText: '', openInterest: String(3000 + ((seed + n * 11) % 500)), openInterestSetTime: stamp,
      tradingReferencePrice: value(1.002), tradingReferencePriceSetTime: stamp, markPrice: value(1.0005), markPriceSetTime: stamp,
    };
  });
}

function renderHistoryPage() {
  const inst = instrumentById(param('id'));
  if (!inst) {
    marketNotFound('Instrument not found', param('id'), 'instruments.html', 'Instruments');
    return;
  }
  document.title = `${inst.id} Historical Market Stats · EP3 Admin`;
  if (!historyList.from) Object.assign(historyList, todayRange());
  listCtl = { state: historyList, refresh: () => refreshHistory(inst) };
  $('#view').innerHTML = `<div class="detail-page">
    <div class="detail-head detail-head-plain">
      <a class="crumb" href="${esc(instStatsHref(inst.id))}">${icon('back')}${esc(inst.id)} Market Stats</a>
      <header class="firm-head"><h1 class="large-title" tabindex="-1">Historical Market Stats</h1></header>
    </div>
    <div class="detail-scroll">
      <div class="filters">
        <label class="filter-field"><span>Transaction Time From</span><input class="field filter-input" id="historyFrom" type="datetime-local" value="${esc(historyList.from)}"></label>
        <label class="filter-field"><span>Transaction Time To</span><input class="field filter-input" id="historyTo" type="datetime-local" value="${esc(historyList.to)}"></label>
        <button class="btn btn-primary" type="button" data-act="history-filter">Filter</button>
        <button class="btn btn-gray" type="button" data-act="history-reset">Reset</button>
      </div>
      <section class="card" id="historyResults" aria-label="Historical market stats"></section>
    </div>
  </div>`;
  refreshHistory(inst);
}

function refreshHistory(inst) {
  const from = new Date(historyList.from);
  const to = new Date(historyList.to);
  const rows = historyRows(inst).filter(r => new Date(r.transactionTime) >= from && new Date(r.transactionTime) <= to);
  if (!rows.length) {
    $('#historyResults').innerHTML = '<div class="empty"><h3>No market stats</h3><p>Nothing was recorded in this time range.</p></div>';
    return;
  }
  const pages = Math.max(1, Math.ceil(rows.length / historyList.size));
  historyList.page = Math.min(historyList.page, pages - 1);
  const start = historyList.page * historyList.size;
  $('#historyResults').innerHTML = `<div class="table-scroll"><table class="tbl tbl-wide">
      <thead><tr>${HISTORY_COLUMNS.map(([label], i) => `<th class="${i ? 'num' : ''}">${esc(label)}</th>`).join('')}<th class="acts"><span class="sr">Actions</span></th></tr></thead>
      <tbody>${rows.slice(start, start + historyList.size).map(r => `<tr>
        ${HISTORY_COLUMNS.map(([, key], i) => `<td class="${i ? 'num' : ''}">${esc(i ? r[key] : showDateTime(r[key]))}</td>`).join('')}
        <td class="acts"><button class="icon-btn" type="button" data-act="history-view" data-time="${esc(r.transactionTime)}" aria-label="View details" title="View">${icon('eye')}</button></td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${pagerHTML(rows.length)}`;
}

function openHistoryDetail(inst, time) {
  const r = historyRows(inst).find(row => row.transactionTime === time);
  if (!r) return;
  openWideSheet({
    title: 'Market Stats Details',
    closeLabel: 'OK',
    body: () => infoListHTML([
      ['Transaction Time', showDateTime(r.transactionTime)], ['Open Price', r.openPx], ['Open Set Time', showDateTime(r.openSetTime)], ['Indicative Open Price', r.indicativeOpenPx], ['Indicative Open Set Time', showDateTime(r.indicativeOpenSetTime)],
      ['High Price', r.highPx], ['High Set Time', showDateTime(r.highSetTime)], ['Low Price', r.lowPx], ['Low Set Time', showDateTime(r.lowSetTime)], ['Close Price', r.closePx], ['Close Set Time', showDateTime(r.closeSetTime)],
      ['Last Trade Price', r.lastTradePx], ['Last Trade Set Time', showDateTime(r.lastTradeSetTime)], ['Last Trade Quantity', r.lastTradeQty], ['Notional Volume', r.notionalTraded], ['Notional Volume Set Time', showDateTime(r.notionalSetTime)], ['Shares Traded', r.sharesTraded],
      ['Settlement Price', r.settlementPx], ['Settlement Set Time', showDateTime(r.settlementSetTime)], ['Settlement Preliminary Flag', String(r.settlementPreliminaryFlag)], ['Settlement Price Calculation Method', r.settlementPriceCalculationMethod], ['Settlement Price Calculation Text', r.settlementPriceCalculationText],
      ['Open Interest', r.openInterest], ['Open Interest Set Time', showDateTime(r.openInterestSetTime)], ['Trading Reference Price', r.tradingReferencePrice], ['Trading Reference Price Set Time', showDateTime(r.tradingReferencePriceSetTime)], ['Mark Price', r.markPrice], ['Mark Price Set Time', showDateTime(r.markPriceSetTime)],
    ]),
  });
}
