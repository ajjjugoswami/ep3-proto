'use strict';

const DASH_LISTS = {
  firms: { file: 'firms.html', key: 'firmsList', blank: () => ({ q: '', type: '', state: '', deleted: false }) },
  instruments: { file: 'instruments.html', key: 'instList', blank: blankInstrumentFilters },
  users: { file: 'users.html', key: 'usersList', blank: () => ({ ...blankDirectoryFilters('users'), deleted: false }) },
  accounts: { file: 'accounts.html', key: 'accountsList', blank: () => ({ ...blankDirectoryFilters('accounts'), deleted: false }) },
};

function openFilteredList(name, key, value) {
  const target = DASH_LISTS[name];
  saveListState(target.key, { ...readListState(target.key), ...target.blank(), [key]: value, page: 0 });
  go(target.file);
}

const liveFirms = () => firms.filter(f => !f.deleted);
const liveRecords = kind => liveFirms().flatMap(f => liveRows(kind, f));
const countWhere = (rows, test) => rows.filter(test).length;
const countText = n => n.toLocaleString('en-US');
const compactNumber = n => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const notionalOf = i => Number((i.stats || {}).notionalTraded) || 0;
const listedInstruments = () => market.instruments.filter(i => i.state !== 'Terminated');
const filterLinkAttrs = (name, key, value) => `href="${DASH_LISTS[name].file}" data-act="dash-filter" data-list="${name}" data-k="${esc(key)}" data-v="${esc(value)}"`;
const stateParts = (rows, states, read) => states.map(([state, tone]) => ({ value: countWhere(rows, r => read(r) === state), tone }));

function dashStats() {
  const live = liveFirms();
  const users = liveRecords('users');
  const accounts = liveRecords('accounts');
  const listed = listedInstruments();
  const userState = u => u.state || 'Active';
  return [
    { key: 'firms', ic: 'building', label: 'Firms', value: live.length, href: 'firms.html',
      sub: `${countText(countWhere(live, f => f.state === 'active'))} active · ${countText(countWhere(live, f => f.state === 'suspended'))} suspended`,
      parts: stateParts(live, [['active', 'seg-ok'], ['suspended', 'seg-warn']], f => f.state) },
    { key: 'users', ic: 'user', label: 'Users', value: users.length, href: 'users.html',
      sub: `${countText(countWhere(users, u => userState(u) === 'Active'))} active · ${countText(countWhere(users, u => userState(u) === 'Suspended'))} suspended`,
      parts: stateParts(users, [['Active', 'seg-ok'], ['Suspended', 'seg-warn']], userState) },
    { key: 'accounts', ic: 'accounts', label: 'Accounts', value: accounts.length, href: 'accounts.html',
      sub: `${countText(countWhere(accounts, a => a.state === 'Active'))} active · ${countText(countWhere(accounts, a => a.state !== 'Active'))} restricted`,
      parts: stateParts(accounts, [['Active', 'seg-ok'], ['Suspended', 'seg-warn'], ['Liquidate Only', 'seg-bad']], a => a.state || 'Active') },
    { key: 'instruments', ic: 'list', label: 'Instruments', value: listed.length, href: 'instruments.html',
      sub: `${countText(countWhere(listed, i => i.state === 'Open'))} open · ${countText(market.products.length)} products`,
      parts: [{ value: countWhere(listed, i => i.state === 'Open'), tone: 'seg-ok' }, { value: countWhere(listed, i => i.state !== 'Open'), tone: 'seg-neutral' }] },
  ];
}

function statTileHTML({ key, ic, label, value, sub, href, parts }) {
  return `<a class="card dash-stat" href="${href}">
    <span class="control-icon">${icon(ic)}</span>
    <span class="dash-stat-text">
      <span class="dash-stat-label">${esc(label)}</span>
      <strong class="dash-stat-value">${esc(countText(value))}</strong>
      ${chartSlotHTML(`tile-${key}`, width => segmentedBarSVG(parts, width), 'dash-stat-bar')}
      <span class="dash-stat-sub">${esc(sub)}</span>
    </span>
  </a>`;
}

const viewAllHTML = href => `<a class="link-btn" href="${href}">View All</a>`;

const dashCardHTML = ({ title, sub = '', side = '', body, cls = '' }) => `<section class="card dash-card ${cls}" aria-label="${esc(title)}">
  <div class="list-head"><div><h2 class="section-title">${esc(title)}</h2>${sub ? `<p class="dash-card-sub">${esc(sub)}</p>` : ''}</div>${side}</div>
  ${body}
</section>`;

const dashEmptyHTML = text => `<div class="empty small"><p>${esc(text)}</p></div>`;

const hourLabel = stamp => formatWhen(stamp.slice(11, 16)).replace(':00', '');

function hourlyNotional() {
  const histories = listedInstruments().map(historyRows).filter(rows => rows.length >= 24);
  if (!histories.length) return [];
  return Array.from({ length: 24 }, (_, k) => {
    const n = 23 - k;
    const at = histories[0][n].transactionTime;
    return { at, value: histories.reduce((sum, rows) => sum + Number(rows[n].notionalTraded), 0) };
  });
}

function notionalCardHTML() {
  const hours = hourlyNotional();
  if (!hours.length) return dashCardHTML({ title: 'Notional Traded', body: dashEmptyHTML('No trading activity yet.'), cls: 'dash-span-2' });
  const total = hours.reduce((sum, h) => sum + h.value, 0);
  const peak = hours.reduce((best, h) => (h.value > best.value ? h : best), hours[0]);
  const points = hours.map(h => ({ value: h.value, short: hourLabel(h.at), tip: `${compactNumber(h.value)} notional\n${formatWhen(h.at)}` }));
  const side = `<div class="dash-figures">
    <div class="dash-figure"><strong>${esc(compactNumber(total))}</strong><span>24h total</span></div>
    <div class="dash-figure"><strong>${esc(hourLabel(peak.at))}</strong><span>Busiest hour</span></div>
  </div>`;
  const body = `${chartSlotHTML('notional', (width, height) => columnChartSVG(points, { width, height, format: compactNumber, label: 'Notional traded per hour, last 24 hours' }), 'dash-chart')}
    ${chartTableHTML('Notional traded per hour', ['Hour', 'Notional'], hours.map(h => [formatWhen(h.at), compactNumber(h.value)]))}`;
  return dashCardHTML({ title: 'Notional Traded', sub: 'Per hour over the last 24 hours, all instruments', side, body, cls: 'dash-span-2' });
}

function priceTrend(inst) {
  return historyRows(inst).slice(0, 24).reverse().map(row => Number(row.lastTradePx));
}

function changeHTML(values) {
  if (values.length < 2 || !values[0]) return '<span class="row-value unset">—</span>';
  const pct = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  const sign = pct > 0 ? '+' : '';
  return `<span class="dash-change">${icon(pct >= 0 ? 'up' : 'down')}${sign}${pct.toFixed(2)}%</span>`;
}

function activeInstrumentsHTML() {
  const rows = sortRows(listedInstruments().filter(i => notionalOf(i) > 0), notionalOf, -1).slice(0, 6);
  if (!rows.length) return dashEmptyHTML('No trading activity yet.');
  return `<div class="table-scroll"><table class="tbl">
    <thead><tr><th>Instrument</th><th>State</th><th class="num">Last PX</th><th class="num">24h</th><th class="hide-compact">Trend</th><th class="num">Volume</th><th class="num">Notional</th></tr></thead>
    <tbody>${rows.map(i => {
      const trend = priceTrend(i);
      return `<tr data-href="${esc(instHref(i.id))}">
        <td><a class="firm-name" href="${esc(instHref(i.id))}">${esc(i.id)}</a><span class="firm-id">${esc(i.productId)}</span></td>
        <td>${statusPill(i.state)}</td>
        <td class="num">${esc(px(i, i.stats.lastPrice))}</td>
        <td class="num">${changeHTML(trend)}</td>
        <td class="hide-compact">${sparklineSVG(trend)}</td>
        <td class="num">${esc(countText(Number(i.stats.sharesTraded) || 0))}</td>
        <td class="num">${esc(compactNumber(notionalOf(i)))}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function attentionItems() {
  const insts = market.instruments;
  const inState = state => countWhere(insts, i => i.state === state);
  return [
    { ic: 'pause', label: 'Halted instruments', count: inState('Halted'), tone: 'Halted', link: filterLinkAttrs('instruments', 'state', 'Halted') },
    { ic: 'warn', label: 'Suspended instruments', count: inState('Suspended'), tone: 'Suspended', link: filterLinkAttrs('instruments', 'state', 'Suspended') },
    { ic: 'check', label: 'Settlement prices to approve', count: countWhere(insts, i => (i.stats || {}).settlementPreliminary), tone: 'Preopen', link: 'href="instruments.html" data-act="dash-approve"' },
    { ic: 'clock', label: 'Pending instruments', count: inState('Pending'), tone: 'Pending', link: filterLinkAttrs('instruments', 'state', 'Pending') },
    { ic: 'building', label: 'Suspended firms', count: countWhere(liveFirms(), f => f.state === 'suspended'), tone: 'Suspended', link: filterLinkAttrs('firms', 'state', 'suspended') },
    { ic: 'user', label: 'Suspended users', count: countWhere(liveRecords('users'), u => u.state === 'Suspended'), tone: 'Suspended', link: filterLinkAttrs('users', 'state', 'Suspended') },
    { ic: 'accounts', label: 'Liquidate only accounts', count: countWhere(liveRecords('accounts'), a => a.state === 'Liquidate Only'), tone: 'Suspended', link: filterLinkAttrs('accounts', 'state', 'Liquidate Only') },
  ].filter(item => item.count);
}

function attentionHTML() {
  const items = attentionItems();
  if (!items.length) return dashEmptyHTML('Nothing needs attention right now.');
  return `<div class="dash-rows">${items.map(item => `<a class="dash-row" ${item.link}>
    ${icon(item.ic)}
    <span class="dash-row-label">${esc(item.label)}</span>
    <span class="pill ${esc(pillClass(item.tone))}">${esc(countText(item.count))}</span>
    ${icon('forward')}
  </a>`).join('')}</div>`;
}

function barListHTML(rows, name, key) {
  const shown = rows.filter(r => r.count);
  if (!shown.length) return dashEmptyHTML('Nothing to show.');
  const max = Math.max(...shown.map(r => r.count));
  return `<div class="dash-bars">${shown.map(r => `<a class="dash-bar-row" ${filterLinkAttrs(name, key, r.value)}>
    <span class="dash-bar-label">${esc(r.label)}</span>
    <span class="dash-bar-count">${esc(countText(r.count))}</span>
    <progress class="dash-bar ${esc(r.tone)}" max="${max}" value="${r.count}" aria-hidden="true"></progress>
  </a>`).join('')}</div>`;
}

const instrumentStateRows = () => INST_STATES.map(state => ({ label: state, value: state, tone: pillClass(state), count: countWhere(market.instruments, i => i.state === state) }));

const firmTypeRows = () => Object.entries(TYPES).map(([value, t]) => ({ label: t.label, value, tone: 'dash-bar-accent', count: countWhere(liveFirms(), f => f.type === value) }));

function userRoleRows() {
  const users = liveRecords('users');
  const roles = uniqueSorted(users.map(u => u.role));
  return sortRows(roles.map(role => ({ label: role, value: role, tone: 'dash-bar-accent', count: countWhere(users, u => u.role === role) })), r => r.count, -1).slice(0, 6);
}

function holidaysHTML() {
  const today = isoDate(new Date());
  const rows = market.holidays.filter(h => h.start.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
  if (!rows.length) return dashEmptyHTML('No upcoming holidays.');
  return `<ul class="dash-rows">${rows.map(h => {
    const time = h.start.slice(11, 16);
    const when = time && time !== '00:00' ? ` · from ${formatWhen(time)}` : '';
    return `<li class="dash-row">
      <span class="dash-date"><strong>${Number(h.start.slice(8, 10))}</strong><span>${esc(MONTH_NAMES[Number(h.start.slice(5, 7)) - 1].slice(0, 3))}</span></span>
      <span class="dash-row-label">${esc(h.title)}<span class="firm-id">${esc(h.calendar + when)}</span></span>
    </li>`;
  }).join('')}</ul>`;
}

function renderDashboard() {
  document.title = 'Dashboard · EP3 Admin';
  $('#view').innerHTML = `<div class="page dash">
    <header class="page-head">
      <div><h1 class="large-title" tabindex="-1">Dashboard</h1><p class="page-sub">Overview of firms, instruments and market activity.</p></div>
      <div class="head-acts">
        <a class="btn btn-line" href="firm-new.html">${icon('plus')}New Firm</a>
        <a class="btn btn-primary" href="instrument.html?mode=new">${icon('plus')}Add Instrument</a>
      </div>
    </header>
    <div class="dash-stats">${dashStats().map(statTileHTML).join('')}</div>
    <div class="dash-grid">
      ${notionalCardHTML()}
      ${dashCardHTML({ title: 'Needs Attention', body: attentionHTML() })}
      ${dashCardHTML({ title: 'Most Active Instruments', sub: 'Ranked by notional traded', side: viewAllHTML('instruments.html'), body: activeInstrumentsHTML(), cls: 'dash-span-2 dash-card-table' })}
      ${dashCardHTML({ title: 'Upcoming Holidays', side: viewAllHTML('calendars.html'), body: holidaysHTML() })}
      ${dashCardHTML({ title: 'Instruments by State', side: viewAllHTML('instruments.html'), body: barListHTML(instrumentStateRows(), 'instruments', 'state') })}
      ${dashCardHTML({ title: 'Firms by Type', side: viewAllHTML('firms.html'), body: barListHTML(firmTypeRows(), 'firms', 'type') })}
      ${dashCardHTML({ title: 'Users by Role', side: viewAllHTML('users.html'), body: barListHTML(userRoleRows(), 'users', 'role') })}
    </div>
  </div>`;
  paintCharts();
}
