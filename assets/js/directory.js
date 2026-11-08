'use strict';

const exactMatch = (value, needle) => String(value || '') === String(needle).trim();
const firmsWithTab = path => firms.filter(f => !f.deleted && TABS.some(t => t.path === path && t.when(f)));
const firmOptions = path => () => firmsWithTab(path).map(f => ({ value: f.id, label: f.name }));
const uniqueSorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const DIRECTORY = {
  users: {
    title: 'Users',
    sub: 'Manage users across every firm.',
    stateKey: 'usersList',
    search: { k: 'id', label: 'User ID', ph: 'Find by exact user ID', exact: true, test: (r, v) => exactMatch(r.id, v) },
    filters: [
      { k: 'state', label: 'User State', short: 'State', options: () => ['Active', 'Suspended'], test: (r, v) => (r.state || 'Active') === v },
      { k: 'role', label: 'User Role', short: 'Role', options: () => uniqueSorted(Object.values(ROLES_BY_TYPE).flat()), test: (r, v) => r.role === v },
      { k: 'firm', label: 'Firm', options: firmOptions('users'), test: (r, v, f) => f.id === v },
    ],
  },
  accounts: {
    title: 'Accounts',
    sub: 'Manage trading and clearing accounts across every firm.',
    stateKey: 'accountsList',
    search: { k: 'id', label: 'Account ID', ph: 'Find by exact account ID', exact: true, test: (r, v) => exactMatch(r.id, v) },
    filters: [
      { k: 'state', label: 'Account State', short: 'State', options: () => ACCOUNT_STATES, test: (r, v) => (r.state || 'Active') === v },
      { k: 'firm', label: 'Firm', options: firmOptions('accounts'), test: (r, v, f) => f.id === v },
      { k: 'collateral', label: 'Collateral Account', short: 'Collateral', exact: true, ph: 'Exact account ID', test: (r, v) => exactMatch(r.collateralAccount, v) },
    ],
  },
};

const directoryFields = kind => [DIRECTORY[kind].search, ...DIRECTORY[kind].filters];
const blankDirectoryFilters = kind => Object.fromEntries(directoryFields(kind).map(f => [f.k, '']));
const dirStates = {};

function dirState(kind) {
  if (!dirStates[kind]) {
    dirStates[kind] = { deleted: false, page: 0, size: 25, ...blankDirectoryFilters(kind), ...readListState(DIRECTORY[kind].stateKey) };
  }
  return dirStates[kind];
}

const directoryRows = kind => firms.filter(f => !f.deleted).flatMap(f => (f[ENTITIES[kind].key] || []).map(r => ({ r, f })));

function filteredDirectory(kind) {
  const state = dirState(kind);
  const active = directoryFields(kind).filter(x => String(state[x.k] || '').trim());
  return directoryRows(kind).filter(({ r, f }) => (state.deleted || !r.deleted) && active.every(x => x.test(r, state[x.k], f)));
}

function renderDirectory(kind) {
  const cfg = DIRECTORY[kind];
  const e = ENTITIES[kind];
  const state = dirState(kind);
  document.title = `${cfg.title} · EP3 Admin`;
  listCtl = { state, refresh: () => refreshDirectory(kind), noun: e.plural.toLowerCase(), search: cfg.search, filters: () => cfg.filters };
  $('#view').innerHTML = `<div class="page list-view">
    <header class="page-head">
      <div><h1 class="large-title" tabindex="-1">${esc(cfg.title)}</h1><p class="page-sub">${esc(cfg.sub)}</p><p class="sr" id="listCount" aria-live="polite"></p></div>
      <button class="btn btn-primary" type="button" data-act="dir-new" data-kind="${kind}">${icon('plus')}Add New ${esc(e.one)}</button>
    </header>
    ${filterBarHTML(showDeletedHTML('dirDeleted', state.deleted))}
    <section class="card card-clip list-card" id="dirResults" aria-label="${esc(cfg.title)}"></section>
  </div>`;
  refreshDirectory(kind);
}

function directoryCellHTML(kind, r, f, [label, get, o = {}], index) {
  if (index === 0) return `<td class="dir-name"><a class="firm-name" href="${esc(entityHref(kind, f, null, r.id))}">${esc(get(r, f))}</a></td>`;
  if (o.pill) return `<td class="inst-state">${r.deleted ? '<span class="pill pill-deleted">Deleted</span>' : statusPill(get(r, f))}</td>`;
  return `<td class="${o.num ? 'num' : ''}" data-label="${esc(label)}">${entityCell(get(r, f), o)}</td>`;
}

function directoryRowHTML(kind, { r, f }) {
  const e = ENTITIES[kind];
  const name = e.title(r);
  const href = entityHref(kind, f, null, r.id);
  return `<tr data-href="${esc(href)}" data-kind="${kind}" data-firm="${esc(f.id)}" data-rec="${esc(r.id)}" class="${r.deleted ? 'is-deleted' : ''}">
    ${e.columns.map((column, i) => directoryCellHTML(kind, r, f, column, i)).join('')}
    <td class="acts">
      <a class="icon-btn" href="${esc(href)}" aria-label="View ${esc(name)}" title="View">${icon('eye')}</a>
      ${r.deleted
        ? `<button class="btn btn-tint btn-small" type="button" data-act="ent-restore" data-kind="${kind}" data-firm="${esc(f.id)}" data-id="${esc(r.id)}">Restore</button>`
        : `<a class="icon-btn" href="${esc(entityHref(kind, f, null, r.id, 'edit'))}" aria-label="Edit ${esc(name)}" title="Edit">${icon('edit')}</a>
           <button class="icon-btn" type="button" data-act="dir-row-menu" data-kind="${kind}" data-firm="${esc(f.id)}" data-id="${esc(r.id)}" aria-haspopup="menu" aria-label="More actions for ${esc(name)}" title="More">${icon('more')}</button>`}
    </td>
  </tr>`;
}

const directoryHeadHTML = kind => ENTITIES[kind].columns.map(([label, , o = {}]) => `<th class="${o.num ? 'num' : ''}">${esc(label)}</th>`).join('');

function refreshDirectory(kind) {
  const cfg = DIRECTORY[kind];
  const e = ENTITIES[kind];
  const state = dirState(kind);
  saveListState(cfg.stateKey, state);
  const { rows, hasMore } = cursorPage(filteredDirectory(kind), state);
  $('#listCount').textContent = `${rows.length} ${e.plural.toLowerCase()} on this page`;
  if (!rows.length) {
    $('#dirResults').innerHTML = anyListFilter()
      ? `<div class="empty"><h3>No matching ${esc(e.plural.toLowerCase())}</h3><p>Try a different search, or clear the filters.</p><button class="btn btn-tint" type="button" data-act="fb-clear">Clear Filters</button></div>`
      : `<div class="empty"><h3>No ${esc(e.plural.toLowerCase())} yet</h3><p>Add a ${esc(e.one.toLowerCase())} to a firm to see it here.</p><button class="btn btn-primary" type="button" data-act="dir-new" data-kind="${kind}">${icon('plus')}Add New ${esc(e.one)}</button></div>`;
    return;
  }
  patchListTable($('#dirResults'), `
    <div class="table-scroll"><table class="tbl tbl-wide tbl-dir tbl-nosort">
      <thead><tr>${directoryHeadHTML(kind)}<th class="acts">Actions</th></tr></thead>
      <tbody>${rows.map(row => directoryRowHTML(kind, row)).join('')}</tbody>
    </table></div>
    ${cursorPagerHTML(rows.length, hasMore)}`);
}

function directoryMenuItems(kind, firmId, id) {
  const e = ENTITIES[kind];
  const f = firmById(firmId);
  const rec = entityRows(kind, f).find(r => r.id === id);
  const href = entityHref(kind, f, null, id);
  if (rec.deleted) return [{ label: `Restore ${e.one}`, icon: 'restore', run: () => restoreRecord(kind, f, id) }];
  return [
    { label: `Edit ${e.one}`, icon: 'edit', run: () => go(entityHref(kind, f, null, id, 'edit')) },
    { label: 'Open in New Tab', icon: 'new-tab', run: () => window.open(href, '_blank') },
    { label: 'View Firm', icon: 'building', run: () => go(hrefFor(f.id, kind)) },
    '-',
    { label: `Delete ${e.one}`, icon: 'trash', danger: true, run: () => deleteRecord(kind, f, null, id) },
  ];
}

function openFirmPicker(kind) {
  const e = ENTITIES[kind];
  const preset = dirState(kind).firm;
  openFormSheet({
    title: `Add New ${e.one}`,
    submit: 'Continue',
    note: `Choose the firm this ${e.one.toLowerCase()} belongs to. The form then shows the options for that firm.`,
    fields: [{ k: 'firm', label: 'Firm', kind: 'select', options: firmOptions(kind)(), blank: 'Choose a firm', req: true }],
    values: { firm: firmsWithTab(kind).some(f => f.id === preset) ? preset : '' },
    onSubmit: values => go(entityNewHref(kind, firmById(values.firm))),
  });
}
