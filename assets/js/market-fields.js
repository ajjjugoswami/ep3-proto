'use strict';

const LIMIT_TOGGLES = new Set(LIMIT_GROUPS.flatMap(g => [g.low[0], g.high[0]]));
const BLOCK_ERROR_PREFIX = { metadata: 'metadata.', subTypes: 'subTypes.', legs: 'legs.', calc: 'dateCalculator' };

const specialItem = raw => raw[0] === '#' || raw[0] === '@';

function multiRowHTML(x, v, ctx = 'firm') {
  const selected = getPath(v, x.k) || [];
  const err = form && form.errors[x.k];
  return `<div class="row row-wide" id="row-${ctx}-${x.k}">
    <span class="row-label">${esc(x.label)}${x.req ? '<span class="req">Required</span>' : ''}</span>
    <div class="chip-list" role="group" aria-label="${esc(x.label)}">
      ${x.options.map(o => `<label class="day-chip"><input type="checkbox" data-multi="${x.k}" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''} ${x.disabled ? 'disabled' : ''}><span>${esc(o)}</span></label>`).join('')}
    </div>
    ${err ? `<div class="row-err">${icon('warn')}<span>${esc(err)}</span></div>` : ''}
  </div>`;
}

function formItemHTML(raw, section, v, seen) {
  if (raw[0] === '#') return `<div class="form-subhead"><h3 class="section-title">${esc(raw.slice(1))}</h3></div>`;
  if (raw[0] === '@') return MARKET_BLOCKS[raw.slice(1)].form(v);
  const x = resolveField(parseItem(raw, section.lock), v);
  if (!visible(x, v)) return '';
  if (x.ro || seen.has(x.k) || (form.mode === 'edit' && x.createOnly)) return readRow(x, v);
  seen.add(x.k);
  if (x.kind === 'multi') return multiRowHTML(x, v);
  return fieldRow(x, v, form.errors, 'firm');
}

function sectionErrorKeys(section, v) {
  return section.items.flatMap(raw => {
    if (raw[0] === '#') return [];
    if (raw[0] === '@') {
      if (raw === '@limits') return LIMIT_GROUPS.flatMap(g => [g.low[1], g.high[1]]);
      const prefix = BLOCK_ERROR_PREFIX[raw.slice(1)];
      return prefix ? Object.keys(form.errors).filter(k => k.startsWith(prefix)) : [];
    }
    return [parseItem(raw, section.lock).k];
  }).filter(k => form.errors[k]);
}

function sectionFormHTML(section, v, seen) {
  const body = `<div class="form-grid form-list">${section.items.map(raw => formItemHTML(raw, section, v, seen)).join('')}</div>`;
  if (section.always) return `<div class="card form-card">${body}</div>`;
  const missing = sectionErrorKeys(section, v).length > 0;
  return `<details class="card form-collapse" data-sec="${section.id}" ${form.open.has(section.id) ? 'open' : ''}>
    <summary>
      <span class="section-title">${esc(section.title)}</span>
      <span class="form-collapse-meta">${missing ? '<span class="sec-err">Required field(s) missing</span>' : ''}${icon('up')}</span>
    </summary>
    <div class="form-collapse-body">${body}</div>
  </details>`;
}

function sectionsFormHTML(sections, v) {
  const seen = new Set();
  return sections.map(s => sectionFormHTML(s, v, seen)).join('');
}

function readItemHTML(raw, section, v, seen) {
  if (raw[0] === '#') return `<div class="read-subhead">${esc(raw.slice(1))}</div>`;
  if (raw[0] === '@') return MARKET_BLOCKS[raw.slice(1)].read(v);
  const x = parseItem(raw, section.lock);
  if (seen.has(x.k) || !visible(x, v)) return '';
  seen.add(x.k);
  return readRow(x, v);
}

function sectionsReadHTML(sections, v) {
  const seen = new Set();
  return sections.map(s => `<section class="section" id="sec-${s.id}">
    <div class="section-head"><h2 class="section-title">${esc(s.title)}</h2></div>
    <div class="card">${s.items.map(raw => readItemHTML(raw, s, v, seen)).join('')}</div>
  </section>`).join('');
}

function validateSections(sections, v) {
  const errors = {};
  const seen = new Set();
  sections.forEach(s => s.items.forEach(raw => {
    if (specialItem(raw)) return;
    const x = resolveField(parseItem(raw, s.lock), v);
    if (x.ro || x.disabled || x.kind === 'parts' || seen.has(x.k) || !visible(x, v) || (form.mode === 'edit' && x.createOnly)) return;
    seen.add(x.k);
    const value = getPath(v, x.k);
    const empty = value === undefined || value === null || String(value).trim() === '' || (Array.isArray(value) && !value.length);
    if (empty) {
      if (x.req) errors[x.k] = requiredMessage(x);
      return;
    }
    const n = Number(value);
    if (x.num && !Number.isFinite(n)) errors[x.k] = `${x.label} must be a number.`;
    else if (x.gt !== undefined && !(n > x.gt)) errors[x.k] = `${x.label} must be greater than ${x.gt}.`;
    else if (x.gte !== undefined && !(n >= x.gte)) errors[x.k] = `${x.label} must be ${x.gte} or more.`;
    else if (x.max !== undefined && n > x.max) errors[x.k] = `${x.label} can’t exceed ${x.max}.`;
  }));
  return errors;
}

function revealFormErrors(sections) {
  sections.forEach(s => { if (sectionErrorKeys(s, form.draft).length) form.open.add(s.id); });
  refreshFormBody();
  const first = document.getElementById(`firm-${Object.keys(form.errors)[0]}`);
  if (first) {
    first.focus({ preventScroll: true });
    first.scrollIntoView({ block: 'center' });
  }
}

function startMarketForm({ mode, draft, sections, validate, submit, onChange, crumb, title, backHref, saveLabel, extra, instIdList }) {
  form = {
    mode, draft, original: clone(draft), errors: {}, idTouched: true, saving: false,
    open: new Set(sections ? sections(draft).filter(s => s.open).map(s => s.id) : []),
    module: {
      sections,
      body: () => (sections ? sectionsFormHTML(sections(form.draft), form.draft) : ''),
      validate,
      submit,
      onChange,
    },
  };
  $('#view').innerHTML = `<div class="page form-page">
    <a class="crumb" href="${esc(crumb.href)}">${icon('back')}${esc(crumb.label)}</a>
    <header class="page-head"><h1 class="large-title" tabindex="-1">${esc(title)}</h1></header>
    <form id="firmForm" novalidate>
      <div class="form-stack" id="formBody">${formBodyHTML()}</div>
      ${dockHTML(backHref, saveLabel, extra)}
    </form>
    ${instIdList ? `<datalist id="instIds">${market.instruments.map(i => `<option value="${esc(i.id)}"></option>`).join('')}</datalist>` : ''}
  </div>`;
  updateDock();
}

const refreshOnChange = k => (FIELD_DEFS[k] || {}).refresh || LIMIT_TOGGLES.has(k);

function syncMirrors(k) {
  if (!form) return;
  const value = getPath(form.draft, k);
  const text = Array.isArray(value) ? value.join(', ') : value;
  $$(`[data-mirror="${k}"]`).forEach(el => {
    el.textContent = isEmpty(text) ? 'Not set' : text;
    el.classList.toggle('unset', isEmpty(text));
  });
}

function listRowFields(listKey, index, defs) {
  return defs.map(d => ({ ...d, k: `${listKey}.${index}.${d.key}` }));
}

const SUB_TYPE_FIELDS = [
  { key: 'symbol', label: 'Sub Type Name', req: true },
  { key: 'buyPriceIncrement', label: 'Buy Price Increment' },
  { key: 'sellPriceIncrement', label: 'Sell Price Increment' },
  { key: 'buyScale', label: 'Buy Scale' },
  { key: 'sellScale', label: 'Sell Scale' },
  { key: 'opposingSide', label: 'Opposing Side', kind: 'select', options: OPPOSING, blank: 'Choose a side', req: true },
  { key: 'buyQuantityRatio', label: 'Buy Quantity Ratio' },
  { key: 'sellQuantityRatio', label: 'Sell Quantity Ratio' },
  { key: 'strictLimit', label: 'Strict Limit', kind: 'toggle', always: true },
];
const LEG_FIELDS = [
  { key: 'symbol', label: 'Leg', list: 'instIds', ph: 'Instrument ID', mono: true },
  { key: 'ratio', label: 'Ratio', inputType: 'number', min: 1 },
  { key: 'opposingSide', label: 'Side', kind: 'select', options: OPPOSING },
];
const LIST_BLANKS = {
  subTypes: () => ({ symbol: '', buyPriceIncrement: '', sellPriceIncrement: '', buyScale: '', sellScale: '', opposingSide: '', buyQuantityRatio: '', sellQuantityRatio: '', strictLimit: false }),
  metadata: () => ({ key: '', value: '' }),
};

const readTableHTML = (columns, rows, empty) => (rows.length
  ? `<div class="table-scroll"><table class="tbl"><thead><tr>${columns.map(([label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(([, get]) => `<td>${cellHTML(get(r), '', false)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  : `<div class="empty small"><p>${esc(empty)}</p></div>`);

const holidayTitle = name => {
  const c = market.calendars[name];
  if (!c) return name;
  return `${name}${c.global ? ' (Global)' : ''} - ${c.description}`;
};

function limitInputHTML(setKey, valueKey, label, v) {
  const on = !!v[setKey];
  const err = form.errors[valueKey];
  return `<div class="limit-row">
    <label class="check"><span class="switch"><input type="checkbox" role="switch" data-field="${setKey}" id="firm-${setKey}" ${on ? 'checked' : ''}><span></span></span>Set</label>
    <span class="part"><span class="part-label">${esc(label)}</span>
      <input class="field" id="firm-${valueKey}" data-field="${valueKey}" value="${esc(v[valueKey] ?? '')}" autocomplete="off" ${on ? '' : 'disabled'} ${err ? 'aria-invalid="true"' : ''} aria-label="${esc(label)}"></span>
    ${err ? `<div class="row-err limit-err">${icon('warn')}<span>${esc(err)}</span></div>` : ''}
  </div>`;
}

const MARKET_BLOCKS = {
  calc: {
    form: v => `<div class="form-subhead calc-row">
        ${isLocked(v) ? '' : `<button class="btn btn-tint" type="button" data-act="calc-dates">${icon('calendar')}Calculate Dates</button>`}
        <p>Fills in the effective, maturity, fixing and payment dates from the inputs above.</p>
        ${form.errors.dateCalculator ? `<div class="row-err">${icon('warn')}<span>${esc(form.errors.dateCalculator)}</span></div>` : ''}
      </div>`,
    read: () => '',
  },
  tradingHours: {
    form: v => `<div class="list-block">
        <div class="list-head"><h3 class="section-title">Trading Hours (${esc(MARKET_TZ)})</h3><button class="btn btn-tint btn-small" type="button" data-act="schedule-add">${icon('plus')}Add</button></div>
        ${(v.tradingSchedule || []).length ? `<div class="hours-list">${v.tradingSchedule.map((s, i) => `<div class="hours-row">
          <span class="hours-text">${esc(hoursLabel(s))}</span>
          <em>${esc(s.state)}</em>
          <span class="hours-acts">
            <button class="icon-btn" type="button" data-act="schedule-edit" data-i="${i}" aria-label="Edit hours" title="Edit">${icon('edit')}</button>
            <button class="icon-btn danger" type="button" data-act="schedule-del" data-i="${i}" aria-label="Remove hours" title="Remove">${icon('trash')}</button>
          </span>
        </div>`).join('')}</div>` : '<p class="list-empty">No trading hours yet.</p>'}
        <h3 class="section-title list-subtitle">Holiday Calendars</h3>
        <div class="holiday-list">${Object.keys(market.calendars).map(name => {
          const c = market.calendars[name];
          const checked = c.global || (v.holidayCalendars || []).includes(name);
          return `<label class="check"><span class="switch"><input type="checkbox" role="switch" data-holiday="${esc(name)}" ${checked ? 'checked' : ''} ${c.global ? 'disabled' : ''}><span></span></span>${esc(holidayTitle(name))}</label>`;
        }).join('')}</div>
      </div>`,
    read: v => {
      const names = Object.keys(market.calendars).filter(n => market.calendars[n].global || (v.holidayCalendars || []).includes(n));
      return `${readRow({ k: '_hours', label: `Trading Hours (${MARKET_TZ})`, display: () => (v.tradingSchedule || []).map(s => `${hoursLabel(s)} (${s.state})`).join('; ') }, v)}
        ${readRow({ k: '_holidays', label: 'Holiday Calendars', display: () => names.map(holidayTitle).join('; ') }, v)}`;
    },
  },
  limits: {
    form: v => (v.nonTradable ? '' : `<div class="limit-grid">${LIMIT_GROUPS.map(g => `<div class="limit-card">
        <h3 class="section-title">${esc(g.title)}${tipHTML(g.tip)}</h3>
        ${limitInputHTML(g.low[0], g.low[1], `Low Limit${g.unit}`, v)}
        ${limitInputHTML(g.high[0], g.high[1], `High Limit${g.unit}`, v)}
      </div>`).join('')}</div>`),
    read: v => LIMIT_GROUPS.map(g => readRow({ k: g.low[1], label: g.title, display: () => {
      const low = v[g.low[0]] ? `Low ${v[g.low[1]]}${g.unit}` : '';
      const high = v[g.high[0]] ? `High ${v[g.high[1]]}${g.unit}` : '';
      return [low, high].filter(Boolean).join(' · ');
    } }, v)).join(''),
  },
  metadata: {
    form: v => `<div class="list-block">
        ${(v.metadata || []).map((m, i) => `<div class="meta-row">
          ${fieldRow({ k: `metadata.${i}.key`, label: 'Key' }, v, form.errors, 'firm')}
          ${fieldRow({ k: `metadata.${i}.value`, label: 'Value' }, v, form.errors, 'firm')}
          <button class="icon-btn danger" type="button" data-act="list-del" data-list="metadata" data-i="${i}" aria-label="Delete metadata" title="Delete">${icon('trash')}</button>
        </div>`).join('')}
        <button class="btn btn-tint btn-small" type="button" data-act="list-add" data-list="metadata">${icon('plus')}Add</button>
      </div>`,
    read: v => readTableHTML([['Key', r => r.key], ['Value', r => r.value]], v.metadata || [], 'No metadata.'),
  },
  subTypes: {
    form: v => {
      const creating = form.mode === 'create';
      return `<div class="list-block">
        <div class="list-head"><h3 class="section-title">Sub Types</h3>${creating ? `<button class="btn btn-tint btn-small" type="button" data-act="list-add" data-list="subTypes">${icon('plus')}Add Sub Type</button>` : ''}</div>
        ${(v.subTypes || []).map((row, i) => `<div class="list-row">
          <div class="form-grid">${listRowFields('subTypes', i, SUB_TYPE_FIELDS).map(d => fieldRow({ ...d, disabled: !creating && !d.always }, v, form.errors, 'firm')).join('')}</div>
          ${creating ? `<button class="btn btn-plain btn-small" type="button" data-act="list-del" data-list="subTypes" data-i="${i}">${icon('trash')}Remove Sub Type</button>` : ''}
        </div>`).join('') || '<p class="list-empty">No sub types.</p>'}
      </div>`;
    },
    read: v => `<div class="read-subhead">Sub Types</div>${readTableHTML(SUB_TYPE_FIELDS.map(d => [d.label, r => (d.kind === 'toggle' ? (r[d.key] ? 'Yes' : 'No') : r[d.key])]), v.subTypes || [], 'No sub types.')}`,
  },
  components: {
    form: v => MARKET_BLOCKS.components.read(v),
    read: v => ((v.componentInstruments || []).length ? `<div class="read-subhead">Component Instruments</div>${readTableHTML([['Symbol', r => r.symbol], ['Opposing Side', r => r.opposingSide]], v.componentInstruments, '')}` : ''),
  },
  legs: {
    form: v => `<div class="list-block">${(v.legs || []).map((leg, i) => `<div class="form-grid leg-row">
        ${listRowFields('legs', i, LEG_FIELDS).map(d => fieldRow({ ...d, label: d.key === 'symbol' ? `Leg ${i}` : d.label, disabled: isLocked(v) }, v, form.errors, 'firm')).join('')}
      </div>`).join('')}</div>`,
    read: v => readTableHTML([['Leg', r => r.symbol], ['Ratio', r => r.ratio], ['Side', r => r.opposingSide]], v.legs || [], 'No legs.'),
  },
  categories: {
    form: v => `<div class="row row-wide">
        <span class="row-label">Category Levels${tipHTML(TIPS.categoryLevels)}</span>
        <div class="chip-list">
          ${(v.categoryLevels || []).map((c, i) => `<span class="tag">${esc(c)}<button type="button" data-act="category-del" data-i="${i}" aria-label="Remove ${esc(c)}">${icon('x')}</button></span>`).join('')}
          <button class="btn btn-tint btn-small" type="button" data-act="category-add">${icon('plus')}Add</button>
        </div>
      </div>`,
    read: v => readRow({ k: '_categories', label: 'Category Levels', display: () => (v.categoryLevels || []).join(' > ') }, v),
  },
};

const TIME_OPTIONS = Array.from({ length: 97 }, (_, i) => ({ value: String(i * 900), label: i === 96 ? '12:00 am (next day)' : timeLabel(i * 900) }));
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function openScheduleSheet(index) {
  const rows = form.draft.tradingSchedule || (form.draft.tradingSchedule = []);
  const current = index === null ? { days: [], from: 28800, to: 61200, state: 'Open', periodicity: PERIODICITY.everyday } : rows[index];
  const values = {
    state: current.state, from: String(current.from), to: String(current.to), periodicity: current.periodicity, repeatNum: '1', repeatUnit: 'Weeks',
    ...Object.fromEntries(DAY_LETTERS.map((_, i) => [`day${i}`, current.days.includes(i)])),
  };
  openFormSheet({
    title: 'Instrument Trading Hours',
    submit: 'Done',
    values,
    repaintOn: ['periodicity'],
    fields: [
      { k: 'state', label: 'State', kind: 'select', options: SCHEDULE_STATES },
      { k: 'from', label: 'From', kind: 'select', options: TIME_OPTIONS },
      { k: 'to', label: 'To', kind: 'select', options: TIME_OPTIONS },
      { k: 'periodicity', label: 'Repeat', kind: 'select', options: Object.values(PERIODICITY) },
      { k: '_repeat', label: 'Repeat Every', kind: 'parts', when: v => v.periodicity === PERIODICITY.custom, parts: [{ k: 'repeatNum', label: 'Count' }, { k: 'repeatUnit', label: 'Unit', options: ['Weeks', 'Months'] }] },
      { k: '_days', label: 'Repeat On', kind: 'parts', when: v => v.periodicity === PERIODICITY.custom, parts: DAY_LETTERS.map((label, i) => ({ k: `day${i}`, label, type: 'check' })) },
    ],
    validate: v => {
      if (v.periodicity === PERIODICITY.custom && !DAY_LETTERS.some((_, i) => v[`day${i}`])) return { _days: 'Choose at least one day.' };
      return {};
    },
    onSubmit: v => {
      const days = v.periodicity === PERIODICITY.everyday ? [0, 1, 2, 3, 4, 5, 6]
        : v.periodicity === PERIODICITY.weekdays ? [1, 2, 3, 4, 5]
          : DAY_LETTERS.map((_, i) => i).filter(i => v[`day${i}`]);
      const saved = { days, from: Number(v.from), to: Number(v.to), state: v.state, periodicity: v.periodicity };
      if (index === null) rows.push(saved); else rows[index] = saved;
      refreshFormBody('[data-act="schedule-add"]');
      updateDock();
    },
  });
}

function addBusinessDays(date, count) {
  const d = new Date(date);
  const step = count < 0 ? -1 : 1;
  let left = Math.abs(count);
  while (left > 0) {
    d.setDate(d.getDate() + step);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return d;
}

function addTenor(date, tenor, period) {
  const d = new Date(date);
  const text = String(tenor || '').trim().toUpperCase();
  const match = text.match(/^(\d+)\s*([YMD])?$/);
  if (!match) return null;
  const unit = match[2] || (period || 'Years')[0].toUpperCase();
  const n = Number(match[1]);
  if (unit === 'Y') d.setFullYear(d.getFullYear() + n);
  else if (unit === 'M') d.setMonth(d.getMonth() + n);
  else d.setDate(d.getDate() + n);
  return d;
}

const FREQUENCY_MONTHS = { Monthly: 1, Quarterly: 3, Semiannually: 6, Annually: 12 };

function calculateSwapDates() {
  const v = form.draft;
  delete form.errors.dateCalculator;
  const start = v.startDate || v.swapEffectiveDate;
  if (!start) {
    form.errors.dateCalculator = 'Trade Date missing.';
    refreshFormBody();
    return;
  }
  const trade = new Date(`${start}T12:00`);
  const effective = addBusinessDays(trade, Number(v.effectiveDateOffset) || 0);
  const maturity = addTenor(effective, v.tenor, v.tenorTimePeriod);
  if (!maturity) {
    form.errors.dateCalculator = 'Enter a tenor like 5Y, 6M or 90D.';
    refreshFormBody();
    return;
  }
  const after = (months) => { const d = new Date(effective); d.setMonth(d.getMonth() + (months || 3)); return isoDate(d); };
  const fixing = isoDate(addBusinessDays(effective, Number(v.floatFixingDatesOffset) || -2));
  const dates = {
    swapEffectiveDate: isoDate(effective), unadjustedEffectiveDate: isoDate(effective), maturityDate: isoDate(maturity), unadjustedMaturityDate: isoDate(maturity),
    fixedFirstUnadjustedPaymentDate: after(FREQUENCY_MONTHS[v.fixedPaymentFrequency]), floatFirstUnadjustedPaymentDate: after(FREQUENCY_MONTHS[v.floatPaymentFrequency]),
    firstFloatResetDate: isoDate(effective), firstFloatFixingDate: fixing, floatFixingDate: fixing,
    leg1FirstFloatResetDate: isoDate(effective), leg2FirstFloatResetDate: isoDate(effective), leg1FirstFloatFixingDate: fixing, leg2FirstFloatFixingDate: fixing,
    leg1FloatFirstUnadjustedPaymentDate: after(FREQUENCY_MONTHS[v.leg1FloatPaymentFrequency]), leg2FloatFirstUnadjustedPaymentDate: after(FREQUENCY_MONTHS[v.leg2FloatPaymentFrequency]),
    floatFirstUnadjustedEffectiveDate: isoDate(effective),
  };
  Object.assign(v, dates);
  Object.keys(dates).forEach(k => delete form.errors[k]);
  refreshFormBody('[data-act="calc-dates"]');
  toast('Dates calculated.');
}
