'use strict';

function firmMenuItems(f, onDetail) {
  if (f.deleted) {
    return [
      ...(onDetail ? [] : [{ label: 'Open in New Tab', icon: 'new-tab', run: () => window.open(hrefFor(f.id), '_blank') }, '-']),
      { label: 'Restore Firm', icon: 'restore', run: () => restoreFirm(f.id) },
    ];
  }
  const suspended = f.state === 'suspended';
  return [
    ...(onDetail ? [] : [
      { label: 'Edit Firm', icon: 'edit', run: () => go(hrefFor(f.id, 'edit')) },
      { label: 'Open in New Tab', icon: 'new-tab', run: () => window.open(hrefFor(f.id), '_blank') },
      '-',
    ]),
    { label: suspended ? 'Activate Firm' : 'Suspend Firm', icon: suspended ? 'play' : 'pause', run: () => toggleSuspend(f.id) },
    ...(onDetail ? [] : [{ label: 'Cancel All Orders', icon: 'stop', danger: true, run: () => cancelOrders(f.id) }]),
    '-',
    { label: 'Delete Firm', icon: 'trash', danger: true, run: () => deleteFirm(f.id) },
  ];
}

async function deleteFirm(id) {
  const f = firmById(id);
  const ok = await ask({ title: `Delete ${f.name}?`, text: 'The firm leaves the directory. You can restore it later from Show Deleted.', confirm: 'Delete Firm', danger: true, glyph: 'trash' });
  if (!ok) return;
  f.deleted = true;
  persist();
  toast(`Deleted ${f.name}.`);
  if (PAGE === 'firms') route(); else go('firms.html');
}

async function restoreFirm(id) {
  const f = firmById(id);
  const ok = await ask({ title: `Restore ${f.name}?`, text: 'The firm returns to the directory in the state it had before it was deleted.', confirm: 'Restore Firm', glyph: 'restore' });
  if (!ok) return;
  f.deleted = false;
  persist();
  route();
  toast(`Restored ${f.name}.`);
}

async function toggleSuspend(id) {
  const f = firmById(id);
  const suspending = f.state !== 'suspended';
  const ok = await ask(suspending
    ? { title: `Suspend ${f.name}?`, text: 'The firm stays in the directory with its state set to Suspended. You can activate it again at any time.', confirm: 'Suspend Firm', danger: true, glyph: 'pause' }
    : { title: `Activate ${f.name}?`, text: 'The firm’s state changes back to Active.', confirm: 'Activate Firm', glyph: 'play' });
  if (!ok) return;
  f.state = suspending ? 'suspended' : 'active';
  persist();
  route();
  toast(`${suspending ? 'Suspended' : 'Activated'} ${f.name}.`);
}

async function cancelOrders(id) {
  const f = firmById(id);
  const ok = await ask({ title: `Cancel all orders for ${f.name}?`, text: 'This submits a mass cancel for the firm’s open orders and can’t be undone.', confirm: 'Cancel All Orders', danger: true, glyph: 'stop' });
  if (ok) toast(`Submitted mass cancel for ${f.name}.`);
}

function filteredFirms() {
  const q = list.q.trim().toLowerCase();
  return firms.filter(f => {
    if (!list.deleted && f.deleted) return false;
    if (list.type && f.type !== list.type) return false;
    if (list.state && (f.deleted || f.state !== list.state)) return false;
    if (q && !f.name.toLowerCase().includes(q) && !f.id.toLowerCase().includes(q)) return false;
    return true;
  });
}

const FIRM_SORTS = { name: f => f.name, id: f => f.id };

function sortedFirms(rows) {
  const value = FIRM_SORTS[list.sort];
  return value ? sortRows(rows, value, list.dir) : rows;
}

const FIRM_FILTERS = [
  { k: 'type', label: 'Firm Type', short: 'Type', options: () => Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label })) },
  { k: 'state', label: 'Firm State', short: 'State', options: () => Object.entries(STATES).map(([value, label]) => ({ value, label })) },
];

const showDeletedHTML = (id, on) => `<label class="check"><span class="switch"><input type="checkbox" role="switch" id="${id}" ${on ? 'checked' : ''}><span></span></span>Show Deleted</label>`;

function renderList() {
  document.title = 'Firms · EP3 Admin';
  listCtl = firmListCtl();
  $('#view').innerHTML = `
    <div class="page list-view">
      <header class="page-head">
        <div><h1 class="large-title" tabindex="-1">Firms</h1><p class="page-sub">Manage firms, their users, accounts and associations.</p><p class="sr" id="listCount" aria-live="polite"></p></div>
        <a class="btn btn-primary" href="firm-new.html">${icon('plus')}New Firm</a>
      </header>
      ${filterBarHTML(showDeletedHTML('showDeleted', list.deleted))}
      <section class="card card-clip list-card" id="results" aria-label="Firms"></section>
    </div>`;
  if (firstList) {
    firstList = false;
    session.set('listShown', '1');
    $('#results').innerHTML = skeleton();
    setTimeout(() => { if ($('#results') && PAGE === 'firms') refreshList(); }, 420);
    refreshChrome();
  } else {
    refreshList();
  }
}

function skeleton() {
  const rows = Array.from({ length: list.size }, (_, i) => `<tr>
    <td><span class="skel skel-name skel-w${i % 3}"></span></td>
    <td class="hide-compact"><span class="skel skel-id skel-w${(i + 1) % 3}"></span></td>
    <td class="hide-compact"><span class="skel skel-text"></span></td>
    <td><span class="skel skel-pill"></span></td>
    <td class="acts"><span class="skel-acts"><span class="skel skel-icon hide-compact"></span><span class="skel skel-icon hide-compact"></span><span class="skel skel-icon"></span></span></td>
  </tr>`).join('');
  return `<div aria-hidden="true">
    <table class="tbl skel-table">
      <colgroup><col class="skel-col-name"><col class="skel-col-id hide-compact"><col class="skel-col-type hide-compact"><col class="skel-col-state"><col></colgroup>
      <thead><tr><th>Name</th><th class="hide-compact">Firm ID</th><th class="hide-compact">Type</th><th>State</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="pager"><span class="skel skel-text"></span><span class="skel skel-pager"></span></div>
  </div>`;
}

function refreshChrome() {
  const rows = filteredFirms();
  const total = firms.filter(f => !f.deleted).length;
  const filtered = list.q || list.type || list.state;
  $('#listCount').textContent = filtered ? `${rows.length} of ${list.deleted ? firms.length : total} firms` : `${rows.length} firm${rows.length === 1 ? '' : 's'}`;
}

function controlBarHTML(ic, title, sub, actions) {
  return `<section class="control-bar" aria-label="${esc(title)}">
    <div class="control-info"><span class="control-icon">${icon(ic)}</span><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div></div>
    <div class="head-acts">${actions}</div>
  </section>`;
}

function sortHeader(key, label, cls = '') {
  const { sort, dir } = listCtl.state;
  const on = sort === key;
  return `<th class="${cls}" ${on ? `aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-act="sort" data-key="${key}">${label}${icon(on ? 'up' : 'chevrons')}</button></th>`;
}

function sortRows(rows, value, dir) {
  const blank = v => v === null || v === undefined || v === '';
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (blank(x) || blank(y)) return blank(x) - blank(y);
    const order = typeof x === 'number' && typeof y === 'number'
      ? x - y
      : String(x).localeCompare(String(y), undefined, { sensitivity: 'base', numeric: true });
    return order * dir;
  });
}

function scrollListToTop() {
  $$('#view, .detail-scroll, .list-card > .table-scroll').forEach(el => { el.scrollTop = 0; });
}

function patchListTable(box, html) {
  const next = document.createElement('template');
  next.innerHTML = html;
  const table = $('table', box);
  const nextTable = $('table', next.content);
  const nextPager = $('.pager', next.content);
  const pagerKey = nextPager ? nextPager.outerHTML : '';
  if (!table || !nextTable || table.className !== nextTable.className) {
    box.innerHTML = html;
    box.pagerKey = pagerKey;
    return;
  }
  const scrolls = table.offsetWidth > table.parentElement.clientWidth;
  const widths = scrolls ? $$('thead th', table).map(th => th.offsetWidth) : [];
  $('thead', table).replaceWith($('thead', nextTable));
  $('tbody', table).replaceWith($('tbody', nextTable));
  if (scrolls) $$('thead th', table).forEach((th, i) => { th.style.minWidth = `${widths[i]}px`; });
  if (box.pagerKey !== pagerKey) {
    $('.pager', box).replaceWith(nextPager);
    box.pagerKey = pagerKey;
  }
}

function pageNumbers(page, pages) {
  const wanted = [...new Set([0, page - 1, page, page + 1, pages - 1])].filter(p => p >= 0 && p < pages).sort((a, b) => a - b);
  return wanted.flatMap((p, i) => (i && p - wanted[i - 1] > 1 ? [null, p] : [p]));
}

const pageSizeHTML = size => `<label class="pager-size"><span>Rows per page:</span>
  <select class="field" id="pageSize">${[10, 25, 50, 100].map(n => `<option value="${n}" ${size === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
</label>`;

function cursorPage(all, state) {
  state.page = Math.min(state.page, Math.max(0, Math.ceil(all.length / state.size) - 1));
  const start = state.page * state.size;
  return { rows: all.slice(start, start + state.size), hasMore: start + state.size < all.length };
}

function cursorPagerHTML(shown, hasMore) {
  const { page, size } = listCtl.state;
  const start = page * size;
  return `<div class="pager pager-cursor">
    <span>${shown ? `Rows ${(start + 1).toLocaleString('en-US')}–${(start + shown).toLocaleString('en-US')}` : 'No rows'}</span>
    <div class="pager-actions">
      ${pageSizeHTML(size)}
      <div class="pager-pages">
        <button class="btn btn-line btn-small" type="button" data-act="page" data-d="-1" ${page === 0 ? 'disabled' : ''}>${icon('back')}Previous</button>
        <button class="btn btn-line btn-small" type="button" data-act="page" data-d="1" ${hasMore ? '' : 'disabled'}>Next${icon('forward')}</button>
      </div>
    </div>
  </div>`;
}

function pagerHTML(total) {
  const { page, size } = listCtl.state;
  const pages = Math.max(1, Math.ceil(total / size));
  const start = page * size;
  const noun = listCtl.noun ? ` ${listCtl.noun}` : '';
  return `<div class="pager">
    <span>Showing ${start + 1}–${Math.min(start + size, total)} of ${total}${noun}</span>
    <div class="pager-actions">
      ${pageSizeHTML(size)}
      <div class="pager-pages">
      <button class="icon-btn pager-nav" type="button" data-act="page" data-d="-1" aria-label="Previous Page" ${page === 0 ? 'disabled' : ''}>${icon('back')}</button>
      ${pageNumbers(page, pages).map(p => (p === null
        ? '<span class="page-gap">…</span>'
        : `<button class="page-num" type="button" data-act="page-to" data-p="${p}" ${p === page ? 'aria-current="page"' : ''} aria-label="Page ${p + 1}">${p + 1}</button>`)).join('')}
      <button class="icon-btn pager-nav" type="button" data-act="page" data-d="1" aria-label="Next Page" ${page >= pages - 1 ? 'disabled' : ''}>${icon('forward')}</button>
      </div>
    </div>
  </div>`;
}

function refreshList() {
  saveListState('firmsList', list);
  refreshChrome();
  const rows = sortedFirms(filteredFirms());
  const pages = Math.max(1, Math.ceil(rows.length / list.size));
  list.page = Math.min(list.page, pages - 1);
  const start = list.page * list.size;
  const pageRows = rows.slice(start, start + list.size);
  if (!rows.length) {
    const filtered = list.q || list.type || list.state;
    $('#results').innerHTML = filtered
      ? `<div class="empty"><h3>No matching firms</h3><p>Try a different name, or clear the filters.</p><button class="btn btn-tint" type="button" data-act="fb-clear">Clear Filters</button></div>`
      : `<div class="empty"><h3>No firms yet</h3><p>Create a firm to start onboarding it to the exchange.</p><a class="btn btn-primary" href="firm-new.html">${icon('plus')}New Firm</a></div>`;
    return;
  }
  patchListTable($('#results'), `
    <div class="table-scroll"><table class="tbl tbl-firms">
      <colgroup><col><col class="firm-col-id hide-compact"><col class="firm-col-type hide-compact"><col class="firm-col-state"><col class="firm-col-acts"></colgroup>
      <thead><tr>${sortHeader('name', 'Name')}${sortHeader('id', 'Firm ID', 'hide-compact')}<th class="hide-compact">Type</th><th>State</th><th class="acts">Actions</th></tr></thead>
      <tbody>${pageRows.map(rowHTML).join('')}</tbody>
    </table></div>
    ${pagerHTML(rows.length)}`);
}

function rowHTML(f) {
  const t = TYPES[f.type];
  return `<tr data-href="${esc(hrefFor(f.id))}" data-id="${esc(f.id)}" class="${f.deleted ? 'is-deleted' : ''}">
    <td>
      <a class="firm-name" href="${esc(hrefFor(f.id))}">${esc(f.name)}</a>
      <span class="firm-id show-compact">${esc(t.label)}</span>
    </td>
    <td class="hide-compact firm-id mono">${esc(f.id)}</td>
    <td class="hide-compact">${esc(t.label)}</td>
    <td>${statePill(f)}</td>
    <td class="acts">
      <a class="icon-btn hide-compact" href="${esc(hrefFor(f.id))}" aria-label="View ${esc(f.name)}" title="View">${icon('eye')}</a>
      ${f.deleted
        ? `<button class="btn btn-tint" type="button" data-act="restore" data-id="${esc(f.id)}">Restore</button>`
        : `<a class="icon-btn hide-compact" href="${esc(hrefFor(f.id, 'edit'))}" aria-label="Edit ${esc(f.name)}" title="Edit">${icon('edit')}</a>
           <button class="icon-btn" type="button" data-act="row-menu" data-id="${esc(f.id)}" aria-haspopup="menu" aria-label="More actions for ${esc(f.name)}" title="More">${icon('more')}</button>`}
    </td>
  </tr>`;
}
