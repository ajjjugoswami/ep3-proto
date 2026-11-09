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

const countText = n => n.toLocaleString('en-US');
const compactNumber = n => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const metricText = n => (n >= 10000 ? n.toLocaleString('en-US', { notation: 'compact', maximumSignificantDigits: 3 }) : countText(n));
const metricHTML = (n, tag = 'span', cls = '') => `<${tag}${cls ? ` class="${cls}"` : ''} title="${esc(countText(n))}">${esc(metricText(n))}</${tag}>`;
const filterLinkAttrs = (name, key, value) => `href="${DASH_LISTS[name].file}" data-act="dash-filter" data-list="${name}" data-k="${esc(key)}" data-v="${esc(value)}"`;
const stateParts = (byState, states) => states.map(([state, tone]) => ({ value: byState[state] || 0, tone }));

function dashTiles(s) {
  const { firms: f, users: u, accounts: a, instruments: i } = s;
  return [
    { key: 'firms', ic: 'building', label: 'Firms', value: f.total, href: 'firms.html',
      sub: `${metricText(f.byState.active)} active · ${metricText(f.byState.suspended)} suspended`,
      parts: stateParts(f.byState, [['active', 'seg-ok'], ['suspended', 'seg-warn']]) },
    { key: 'users', ic: 'user', label: 'Users', value: u.total, href: 'users.html',
      sub: `${metricText(u.byState.Active)} active · ${metricText(u.byState.Suspended)} suspended`,
      parts: stateParts(u.byState, [['Active', 'seg-ok'], ['Suspended', 'seg-warn']]) },
    { key: 'accounts', ic: 'accounts', label: 'Accounts', value: a.total, href: 'accounts.html',
      sub: `${metricText(a.byState.Active)} active · ${metricText(a.total - a.byState.Active)} restricted`,
      parts: stateParts(a.byState, [['Active', 'seg-ok'], ['Suspended', 'seg-warn'], ['Liquidate Only', 'seg-bad']]) },
    { key: 'instruments', ic: 'list', label: 'Instruments', value: i.listed, href: 'instruments.html',
      sub: `${metricText(i.byState.Open)} open · ${metricText(s.products)} products`,
      parts: [{ value: i.byState.Open, tone: 'seg-ok' }, { value: i.listed - i.byState.Open, tone: 'seg-neutral' }] },
  ];
}

function statTileHTML({ key, ic, label, value, sub, href, parts }) {
  return `<a class="card dash-stat" href="${href}">
    <span class="control-icon">${icon(ic)}</span>
    <span class="dash-stat-text">
      <span class="dash-stat-label">${esc(label)}</span>
      ${metricHTML(value, 'strong', 'dash-stat-value')}
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

function notionalCardHTML() {
  const hours = getHourlyNotional();
  if (!hours.length) return dashCardHTML({ title: 'Notional Traded', body: dashEmptyHTML('No trading activity yet.'), cls: 'dash-span-2' });
  const total = sumOf(hours.map(h => h.value));
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

function changeHTML(values) {
  if (values.length < 2 || !values[0]) return '<span class="row-value unset">—</span>';
  const pct = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  const sign = pct > 0 ? '+' : '';
  return `<span class="dash-change ${pct >= 0 ? 'is-up' : 'is-down'}">${icon(pct >= 0 ? 'up' : 'down')}${sign}${pct.toFixed(2)}%</span>`;
}

function activeInstrumentsHTML() {
  const rows = listTopInstruments();
  if (!rows.length) return dashEmptyHTML('No trading activity yet.');
  return `<div class="table-scroll"><table class="tbl">
    <thead><tr><th>Instrument</th><th>State</th><th class="num">Last PX · 24h</th><th class="hide-compact">Trend</th><th class="num">Volume</th><th class="num">Notional</th></tr></thead>
    <tbody>${rows.map(({ inst: i, notional, volume, trend }) => `<tr data-href="${esc(instHref(i.id))}">
        <td><a class="firm-name" href="${esc(instHref(i.id))}">${esc(i.id)}</a><span class="firm-id">${esc(i.productId)}</span></td>
        <td>${statusPill(i.state)}</td>
        <td class="num dash-px">${esc(px(i, i.stats.lastPrice))}${changeHTML(trend)}</td>
        <td class="hide-compact">${sparklineSVG(trend)}</td>
        <td class="num">${metricHTML(volume)}</td>
        <td class="num">${esc(compactNumber(notional))}</td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function attentionItems(s) {
  const inst = s.instruments.byState;
  return [
    { ic: 'pause', label: 'Halted instruments', count: inst.Halted, tone: 'Halted', link: filterLinkAttrs('instruments', 'state', 'Halted') },
    { ic: 'warn', label: 'Suspended instruments', count: inst.Suspended, tone: 'Suspended', link: filterLinkAttrs('instruments', 'state', 'Suspended') },
    { ic: 'check', label: 'Settlement prices to approve', count: s.instruments.settlementToApprove, tone: 'Preopen', link: 'href="instruments.html" data-act="dash-approve"' },
    { ic: 'clock', label: 'Pending instruments', count: inst.Pending, tone: 'Pending', link: filterLinkAttrs('instruments', 'state', 'Pending') },
    { ic: 'building', label: 'Suspended firms', count: s.firms.byState.suspended, tone: 'Suspended', link: filterLinkAttrs('firms', 'state', 'suspended') },
    { ic: 'user', label: 'Suspended users', count: s.users.byState.Suspended, tone: 'Suspended', link: filterLinkAttrs('users', 'state', 'Suspended') },
    { ic: 'accounts', label: 'Liquidate only accounts', count: s.accounts.byState['Liquidate Only'], tone: 'Suspended', link: filterLinkAttrs('accounts', 'state', 'Liquidate Only') },
  ].filter(item => item.count);
}

function attentionHTML(s) {
  const items = attentionItems(s);
  if (!items.length) return dashEmptyHTML('Nothing needs attention right now.');
  return `<div class="dash-rows">${items.map(item => `<a class="dash-row" ${item.link}>
    ${icon(item.ic)}
    <span class="dash-row-label">${esc(item.label)}</span>
    ${metricHTML(item.count, 'span', `pill ${pillClass(item.tone)}`)}
    ${icon('forward')}
  </a>`).join('')}</div>`;
}

function barListHTML(rows, name, key) {
  const shown = rows.filter(r => r.count);
  if (!shown.length) return dashEmptyHTML('Nothing to show.');
  const max = Math.max(...shown.map(r => r.count));
  return `<div class="dash-bars">${shown.map(r => `<a class="dash-bar-row" ${filterLinkAttrs(name, key, r.value)}>
    <span class="dash-bar-label">${esc(r.label)}</span>
    ${metricHTML(r.count, 'span', 'dash-bar-count')}
    <progress class="dash-bar ${esc(r.tone)}" max="${max}" value="${r.count}" aria-hidden="true"></progress>
  </a>`).join('')}</div>`;
}

const instrumentStateRows = s => INST_STATES.map(state => ({ label: state, value: state, tone: pillClass(state), count: s.instruments.byState[state] || 0 }));

const firmTypeRows = s => Object.entries(TYPES).map(([value, t]) => ({ label: t.label, value, tone: 'dash-bar-accent', count: s.firms.byType[value] }));

const userRoleRows = s => sortRows(Object.entries(s.users.byRole).map(([role, count]) => ({ label: role, value: role, tone: 'dash-bar-accent', count })), r => r.count, -1).slice(0, DASH_TOP_LIMIT);

function holidaysHTML() {
  const rows = listUpcomingHolidays();
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
  const stats = getDashboardStats();
  $('#view').innerHTML = `<div class="page dash">
    <header class="page-head">
      <div><h1 class="large-title" tabindex="-1">Dashboard</h1><p class="page-sub">Overview of firms, instruments and market activity · Updated ${esc(formatWhen(stats.asOf))}</p></div>
      <div class="head-acts">
        <a class="btn btn-line" href="firm-new.html">${icon('plus')}New Firm</a>
        <a class="btn btn-primary" href="instrument.html?mode=new">${icon('plus')}Add Instrument</a>
      </div>
    </header>
    <div class="dash-stats">${dashTiles(stats).map(statTileHTML).join('')}</div>
    <div class="dash-grid">
      ${notionalCardHTML()}
      ${dashCardHTML({ title: 'Needs Attention', body: attentionHTML(stats) })}
      ${dashCardHTML({ title: 'Most Active Instruments', sub: 'Top 6 by notional traded, last 24 hours', side: viewAllHTML('instruments.html'), body: activeInstrumentsHTML(), cls: 'dash-span-2 dash-card-table' })}
      ${dashCardHTML({ title: 'Upcoming Holidays', side: viewAllHTML('calendars.html'), body: holidaysHTML() })}
      ${dashCardHTML({ title: 'Instruments by State', side: viewAllHTML('instruments.html'), body: barListHTML(instrumentStateRows(stats), 'instruments', 'state') })}
      ${dashCardHTML({ title: 'Firms by Type', side: viewAllHTML('firms.html'), body: barListHTML(firmTypeRows(stats), 'firms', 'type') })}
      ${dashCardHTML({ title: 'Users by Role', sub: `Top ${DASH_TOP_LIMIT} roles`, side: viewAllHTML('users.html'), body: barListHTML(userRoleRows(stats), 'users', 'role') })}
    </div>
  </div>`;
  paintCharts();
}
