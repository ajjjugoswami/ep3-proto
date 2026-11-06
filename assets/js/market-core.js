'use strict';

const PRODUCT_ONLY_KEYS = ['id', 'description', 'categoryLevels', ...Object.keys(SYNC_GROUPS)];

function instrumentFromProduct(product) {
  const base = clone(product);
  PRODUCT_ONLY_KEYS.forEach(k => { delete base[k]; });
  return { ...base, id: '', description: '', productId: product.id, routingkey: product.id, state: 'Pending', isScheduled: false, nonTradable: false, hideMarketData: false, securityId: '', securityIdSource: '', metadata: [], legs: [], noLegs: '0', stats: {} };
}

function loadMarket() {
  let data = null;
  try {
    const raw = storage.get(MARKET_KEY);
    data = raw && JSON.parse(raw);
  } catch { }
  const loaded = data && Array.isArray(data.instruments) ? data : seedMarket();
  const now = new Date();
  loaded.instruments.forEach(i => {
    if (i.scheduledChange && new Date(i.scheduledChange.at) <= now) {
      i.state = i.scheduledChange.state;
      delete i.scheduledChange;
    }
  });
  return loaded;
}

const market = loadMarket();
const saveMarket = () => storage.set(MARKET_KEY, JSON.stringify(market));
const instrumentById = id => market.instruments.find(i => i.id === id);
const productById = id => market.products.find(p => p.id === id);

const withQuery = (page, params) => `${page}?${new URLSearchParams(params)}`;
const instHref = (id, mode) => withQuery('instrument.html', { id, ...(mode ? { mode } : {}) });
const instStatsHref = id => withQuery('instrument-stats.html', { id });
const instHistoryHref = id => withQuery('instrument-history.html', { id });
const bookHref = id => withQuery('books.html', { instrumentId: id });
const productHref = (id, mode) => withQuery('product.html', { id, ...(mode ? { mode } : {}) });

const instDeletable = i => ['Pending', 'Terminated'].includes(i.state);
const instStatsEnabled = i => !['Pending', 'Terminated'].includes(i.state);
const instEditable = i => i.state !== 'Terminated';

const decimalsOf = v => {
  const text = String(v ?? '');
  return text.includes('.') ? text.split('.')[1].length : 0;
};
const validScale = (value, increment) => decimalsOf(value) <= decimalsOf(increment);
const showDateTime = v => formatWhen(v || '');

function hoursLabel(s) {
  const days = s.days || [];
  const sequential = days.every((d, i) => i === 0 || days[i - 1] === d - 1);
  let dayText = days.map(d => WEEK_DAYS[d]).join(', ');
  if (days.length > 1 && sequential) dayText = `${WEEK_DAYS[days[0]]} - ${WEEK_DAYS[days[days.length - 1]]}`;
  return `${dayText}  ${timeLabel(s.from)} - ${timeLabel(s.to)}`;
}

function stateFromSchedule(inst) {
  const now = new Date();
  const seconds = now.getHours() * 3600 + now.getMinutes() * 60;
  const match = (inst.tradingSchedule || []).find(s => s.days.includes(now.getDay()) && (s.from <= s.to ? seconds >= s.from && seconds < s.to : seconds >= s.from || seconds < s.to));
  return match ? match.state : 'Closed';
}

function px(inst, value) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: decimalsOf(inst.minimumPriceIncrement), maximumFractionDigits: 8 }) : String(value);
}

function hashText(text) {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 2147483647;
  return h;
}

const MODULE_TABS = [['products', 'Products', 'products.html'], ['instruments', 'Instruments', 'instruments.html'], ['calendars', 'Calendars', 'calendars.html']];

const MODULE_SUBS = {
  instruments: 'Manage financial instruments, trading status and settlement prices.',
  products: 'Manage the products that instruments are created from.',
  calendars: 'Manage holiday calendars and events.',
};

function moduleHeadHTML(active, actions = '', title = 'Instruments') {
  return `<div class="detail-head">
    <header class="firm-head">
      <div><h1 class="large-title" tabindex="-1">${esc(title)}</h1><p class="page-sub">${esc(MODULE_SUBS[active] || '')}</p></div>
      <div class="head-acts">${actions}</div>
    </header>
    <nav class="tabs" aria-label="Instrument sections">${MODULE_TABS.map(([key, label, href]) => `<a href="${href}" ${key === active ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
  </div>`;
}

function marketNotFound(title, id, href, label) {
  document.title = `${title} · EP3 Admin`;
  $('#view').innerHTML = `<div class="page"><a class="crumb" href="${href}">${icon('back')}${esc(label)}</a><div class="card empty"><h1 class="large-title" tabindex="-1">${esc(title)}</h1><p>Nothing has the ID “${esc(id)}”.</p><a class="btn btn-tint" href="${href}">Show All ${esc(label)}</a></div></div>`;
}

function downloadText(fileName, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openWideSheet({ title, body, primary, onPrimary, onClose, onPaint, closeLabel = 'Close' }) {
  const d = $('#sheet');
  const opener = document.activeElement;
  const paint = () => {
    const primaryLabel = typeof primary === 'function' ? primary() : primary;
    d.classList.add('sheet-wide');
    d.innerHTML = `<div class="sheet-form">
      <div class="sheet-head">
        <h2 id="sheetTitle">${esc(title)}</h2>
        <div class="dock-acts">
          <button class="btn btn-plain" type="button" data-sheet-cancel>${esc(closeLabel)}</button>
          ${primaryLabel ? `<button class="btn btn-primary" type="button" data-sheet-primary>${esc(primaryLabel)}</button>` : ''}
        </div>
      </div>
      <div class="sheet-body">${body()}</div>
    </div>`;
    $('[data-sheet-cancel]', d).addEventListener('click', () => d.close());
    const main = $('[data-sheet-primary]', d);
    if (main) main.addEventListener('click', () => onPrimary(paint));
    if (onPaint) onPaint(d, paint);
  };
  paint();
  d.showModal();
  d.addEventListener('close', () => {
    if (onClose) onClose();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }, { once: true });
}

const infoListHTML = rows => `<dl class="license-list">${rows.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${isEmpty(value) ? '<span class="row-value unset">—</span>' : esc(value)}</dd></div>`).join('')}</dl>`;

function renderMarketPage() {
  ({
    instruments: renderInstruments,
    instrument: renderInstrumentPage,
    'instrument-stats': renderStatsPage,
    'instrument-history': renderHistoryPage,
    books: renderBooksPage,
    products: renderProducts,
    product: renderProductPage,
    calendars: renderCalendars,
  })[PAGE]();
}
