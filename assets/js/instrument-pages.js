'use strict';

function renderInstrumentPage() {
  const mode = param('mode');
  if (mode === 'new') {
    startInstrumentForm('new', blankInstrument(param('productId')));
    return;
  }
  const inst = instrumentById(param('id'));
  if (!inst) {
    marketNotFound('Instrument not found', param('id'), 'instruments.html', 'Instruments');
    return;
  }
  if (mode === 'edit') {
    if (!instEditable(inst)) location.replace(instHref(inst.id));
    else startInstrumentForm('edit', clone(inst));
    return;
  }
  if (mode === 'copy') {
    startInstrumentForm('copy', { ...clone(inst), id: '', description: '', state: 'Pending', stats: {}, isScheduled: false });
    return;
  }
  renderInstrumentView(inst);
}

function blankInstrument(productId) {
  const product = productId && productById(productId);
  if (product) return instrumentFromProduct(product);
  return { ...blankMarketValues(), id: '', productId: '', description: '', type: '', routingkey: '', state: 'Pending', isScheduled: false, nonTradable: false, hideMarketData: false, securityId: '', securityIdSource: '', metadata: [], legs: [], noLegs: '0', stats: {} };
}

function renderInstrumentView(i) {
  document.title = `${i.id} · EP3 Admin`;
  const editable = instEditable(i);
  const sections = instrumentSections(i);
  $('#view').innerHTML = `<div class="detail-page">
    <div class="detail-head detail-head-plain">
      <a class="crumb" href="instruments.html">${icon('back')}Instruments</a>
      <header class="firm-head">
        <div>
          <div class="firm-title"><h1 class="large-title" tabindex="-1">${esc(i.id)}</h1>${statusPill(i.state)}</div>
          <div class="firm-meta"><span>${esc(i.type || 'Default')}</span><span>·</span><a href="${esc(productHref(i.productId))}">${esc(i.productId)}</a>${i.description ? `<span>·</span><span>${esc(i.description)}</span>` : ''}</div>
        </div>
        <div class="head-acts">
          ${editable ? `<button class="btn btn-gray" type="button" data-act="inst-state" data-id="${esc(i.id)}">${icon('warn')}Change State</button>` : ''}
          <a class="btn btn-gray" href="${esc(instHref(i.id, 'copy'))}">${icon('copy')}Copy</a>
          ${editable ? `<a class="btn btn-primary" href="${esc(instHref(i.id, 'edit'))}">${icon('edit')}Edit Instrument</a>` : ''}
          <button class="icon-btn btn-gray" type="button" data-act="inst-detail-menu" data-id="${esc(i.id)}" aria-haspopup="menu" aria-label="More actions" title="More">${icon('more')}</button>
        </div>
      </header>
    </div>
    <div class="detail-scroll">
      ${editable ? '' : `<div class="banner bad">${icon('warn')}<span>This instrument is terminated, so its details are read-only.</span></div>`}
      ${i.scheduledChange ? `<div class="banner warn">${icon('calendar')}<span>State change to ${esc(i.scheduledChange.state)} is scheduled for ${esc(showDateTime(i.scheduledChange.at))}.</span></div>` : ''}
      <div class="split">${railHTML(sections)}<div class="sections">${sectionsReadHTML(sections, i)}</div></div>
    </div>
  </div>`;
  startSpy();
}

function validateInstrument() {
  const v = form.draft;
  const sections = instrumentSections(v);
  const e = validateSections(sections, v);
  if (form.mode === 'create') {
    const id = String(v.id || '').trim();
    if (id && instrumentById(id)) e.id = 'Another instrument already uses this symbol. Enter a different one.';
  }
  Object.assign(e, validateLimits(v));
  Object.assign(e, validateMetadata(v));
  Object.assign(e, validateSubTypes(v));
  if (v.type === IT.FUTURE || v.type === IT.OPTION) {
    if (!isLocked(v) && !v.maturityDateMonth) e.maturityDateParts = 'Month must be selected.';
    if (!isLocked(v) && !v.maturityDateYear) e.maturityDateParts = 'Year must be selected.';
    if (v.type === IT.OPTION && !e.strikePrice && v.strikePrice && !validScale(v.strikePrice, v.minimumPriceIncrement)) e.strikePrice = 'Strike Price scale is not valid.';
  }
  if (v.type === IT.MULTILEG) {
    (v.legs || []).forEach((leg, i) => {
      if (!String(leg.symbol || '').trim()) e[`legs.${i}.symbol`] = 'Enter a symbol.';
      if (leg.ratio === '' || !Number.isFinite(Number(leg.ratio))) e[`legs.${i}.ratio`] = 'Ratio must be a number.';
    });
  }
  if (v.type === IT.EVENT) Object.assign(e, validateEventTime(v));
  Object.assign(e, validateScheduleDates(v));
  return e;
}

function validateLimits(v) {
  const e = {};
  if (v.nonTradable) return e;
  LIMIT_GROUPS.forEach(g => {
    const [lowSet, low] = g.low;
    const [highSet, high] = g.high;
    const finite = k => v[k] !== '' && v[k] !== undefined && Number.isFinite(Number(v[k]));
    if (v[lowSet] && !finite(low)) e[low] = 'Low limit is required.';
    if (v[highSet] && !finite(high)) e[high] = 'High limit is required.';
    if (v[lowSet] && v[highSet] && finite(low) && finite(high) && Number(v[low]) >= Number(v[high])) e[low] = 'Low limit must be less than High Limit.';
    if (g.low[1] === 'lowPriceLimit' && v[highSet] && finite(high) && Number(v[high]) <= 0) e[high] = 'High limit must be greater than 0.';
  });
  return e;
}

function validateMetadata(v) {
  const e = {};
  const rows = v.metadata || [];
  rows.forEach((row, i) => {
    if (!String(row.key || '').trim()) e[`metadata.${i}.key`] = 'Key can’t be left empty.';
    if (!String(row.value || '').trim()) e[`metadata.${i}.value`] = 'Value can’t be left empty.';
    if (rows.findIndex(other => other.key === row.key) !== i) e[`metadata.${i}.key`] = `Duplicate key ${row.key}.`;
  });
  return e;
}

function validateSubTypes(v) {
  const e = {};
  if (form.mode !== 'create') return e;
  (v.subTypes || []).forEach((row, i) => {
    if (!String(row.symbol || '').trim()) e[`subTypes.${i}.symbol`] = 'Sub Type Name is required.';
    if (!row.opposingSide) e[`subTypes.${i}.opposingSide`] = 'Opposing Side is required.';
    ['buyPriceIncrement', 'sellPriceIncrement', 'buyScale', 'sellScale', 'buyQuantityRatio', 'sellQuantityRatio'].forEach(key => {
      if (row[key] !== '' && row[key] !== undefined && row[key] !== null && !Number.isFinite(Number(row[key]))) e[`subTypes.${i}.${key}`] = 'Must be a number.';
    });
  });
  return e;
}

function validateEventTime(v) {
  const e = {};
  if (v.evtAttTimeSpecifierDay && !v.evtAttTimeSpecifierMonth) e.evtAttTimeSpecifier = 'Month value must be set when Day is set.';
  else if (v.evtAttTimeSpecifierMonth && !v.evtAttTimeSpecifierYear) e.evtAttTimeSpecifier = 'Year value must be set when Month is set.';
  const hasTime = ['Hour', 'Minute', 'Second'].some(p => v[`evtAttTimeOfDay${p}`] !== undefined && v[`evtAttTimeOfDay${p}`] !== '');
  if (hasTime && !v.evtAttTimeSpecifierDay) e.evtAttTimeOfDay = 'Provide a Time Specifier day when providing a Time of Day.';
  if (isContinuous(v) && !e.evtAttPayoutLowerBound && Number(v.evtAttPayoutLowerBound) > Number(v.evtAttPayoutUpperBound)) {
    e.evtAttPayoutLowerBound = 'Payout Lower Bound must be less than or equal to Payout Upper Bound.';
  }
  return e;
}

function validateScheduleDates(v) {
  const e = {};
  if (!v.startDate) e.startDate = 'Enter a start date.';
  const order = (a, b) => new Date(a) < new Date(b);
  if (v.lastTradeDate && v.startDate && order(v.lastTradeDate, v.startDate)) e.lastTradeDate = 'Last Trade Date must be after Start Date.';
  if (v.expirationDate) {
    if (v.startDate && order(v.expirationDate, v.startDate)) e.expirationDate = 'Expiration Date must be after Start Date.';
    if (v.lastTradeDate && order(v.expirationDate, v.lastTradeDate)) e.expirationDate = 'Expiration Date must be after Last Trade Date.';
  }
  if (v.terminationDate) {
    if (v.startDate && order(v.terminationDate, v.startDate)) e.terminationDate = 'Termination Date must be after Start Date.';
    if (v.lastTradeDate && order(v.terminationDate, String(v.lastTradeDate).slice(0, 10))) e.terminationDate = 'Termination Date must be after Last Trade Date.';
    if (v.expirationDate && order(v.terminationDate, String(v.expirationDate).slice(0, 10))) e.terminationDate = 'Termination Date must be after Expiration Date.';
  }
  return e;
}

function onInstrumentChange(k) {
  const v = form.draft;
  if (k === 'productId') {
    const typed = { id: v.id, description: v.description };
    const product = productById(v.productId);
    form.draft = product ? { ...instrumentFromProduct(product), ...typed } : { ...blankInstrument(), ...typed };
    form.errors = {};
    form.open = new Set(instrumentSections(form.draft).filter(s => s.open).map(s => s.id));
    refreshFormBody('#firm-productId');
    refreshEventIds();
    return;
  }
  if (k === 'noLegs') {
    const wanted = Number(v.noLegs) || 0;
    const legs = v.legs || [];
    v.legs = Array.from({ length: wanted }, (_, i) => legs[i] || { symbol: '', ratio: '1', opposingSide: OPPOSING[i % 2] });
  }
  if (k === 'nonTradable' && !v.nonTradable) v.hideMarketData = false;
  if (k === 'nonTradable' && v.nonTradable) v.clearingHouse = '';
  if (k === 'securityIdSource' && (!v.securityIdSource || v.securityIdSource === 'Exchange Symbol')) v.securityId = '';
  if (k === 'evtAttEventId') {
    const sibling = market.instruments.find(i => i.type === IT.EVENT && i.evtAttEventId === v.evtAttEventId);
    if (sibling) ['evtAttEventDisplayName', 'evtAttTimeSpecifierYear', 'evtAttTimeSpecifierMonth', 'evtAttTimeSpecifierDay', 'lastTradeDate', 'expirationDate'].forEach(key => { v[key] = sibling[key]; });
  }
  if (refreshOnChange(k)) refreshFormBody(document.getElementById(`firm-${k}`) ? `#firm-${k}` : undefined);
}

function refreshEventIds() {
  const list = $('#eventIds');
  if (!list) return;
  const ids = [...new Set(market.instruments.filter(i => i.type === IT.EVENT && i.productId === form.draft.productId).map(i => i.evtAttEventId).filter(Boolean))];
  list.innerHTML = ids.map(id => `<option value="${esc(id)}"></option>`).join('');
}

async function submitInstrument() {
  const v = form.draft;
  const creating = form.mode === 'create';
  if (!creating && !isDirty()) return;
  v.id = String(v.id || '').trim();
  form.errors = validateInstrument();
  if (Object.keys(form.errors).length) {
    revealFormErrors(instrumentSections(v));
    updateDock();
    return;
  }
  updateDock();
  const ok = await ask({ title: creating ? 'Add this instrument?' : 'Save this instrument?', text: creating ? `This creates ${v.id} in the Pending state.` : `This updates ${v.id}.`, confirm: creating ? 'Add Instrument' : 'Save Instrument', glyph: 'check' });
  if (!ok) return;
  if (creating && !v.isScheduled && (v.startDate || v.startTime || v.lastTradeDate || v.expirationDate || v.terminationDate)) {
    v.isScheduled = await ask({ title: 'Follow the trading schedule?', text: 'This instrument has a Trading Schedule but is not currently following it. Set it to follow?', confirm: 'Set to Follow', glyph: 'calendar' });
  }
  form.saving = true;
  updateDock();
  await wait(350);
  const saved = clone(v);
  if (creating) {
    saved.state = saved.isScheduled ? stateFromSchedule(saved) : 'Pending';
    market.instruments.unshift(saved);
  } else {
    market.instruments[market.instruments.findIndex(i => i.id === form.original.id)] = saved;
  }
  saveMarket();
  form = null;
  go('instruments.html');
  toast('Instrument saved.');
}

function startInstrumentForm(mode, draft) {
  const editing = mode === 'edit';
  const title = editing ? 'Edit Instrument' : 'Create Instrument';
  document.title = `${title} · EP3 Admin`;
  startMarketForm({
    mode: editing ? 'edit' : 'create',
    draft,
    sections: instrumentSections,
    validate: validateInstrument,
    submit: submitInstrument,
    onChange: onInstrumentChange,
    crumb: editing ? { href: instHref(draft.id), label: draft.id } : { href: 'instruments.html', label: 'Instruments' },
    title,
    backHref: editing ? instHref(draft.id) : 'instruments.html',
    saveLabel: editing ? 'Save' : 'Create Instrument',
    instIdList: true,
  });
  $('#firmForm').insertAdjacentHTML('afterend', '<datalist id="eventIds"></datalist>');
  refreshEventIds();
}
