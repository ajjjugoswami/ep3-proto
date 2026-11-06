'use strict';

function firmMenuItems(f, onDetail) {
  if (f.deleted) {
    return [
      ...(onDetail ? [] : [{ label: 'View Firm', icon: 'eye', run: () => go(hrefFor(f.id)) }, { label: 'Open in New Tab', icon: 'new-tab', run: () => window.open(hrefFor(f.id), '_blank') }, '-']),
      { label: 'Restore Firm', icon: 'restore', run: () => restoreFirm(f.id) },
    ];
  }
  const suspended = f.state === 'suspended';
  return [
    ...(onDetail ? [] : [
      { label: 'View Firm', icon: 'eye', run: () => go(hrefFor(f.id)) },
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

function sortedFirms(rows) {
  if (list.sort === 'seed') return rows;
  const val = f => list.sort === 'type' ? TYPES[f.type].label : list.sort === 'state' ? (f.deleted ? 'Deleted' : STATES[f.state]) : list.sort === 'id' ? f.id : f.name;
  return [...rows].sort((a, b) => val(a).localeCompare(val(b), undefined, { sensitivity: 'base' }) * list.dir);
}

function renderList() {
  document.title = 'Firms · EP3 Admin';
  $('#view').innerHTML = `
    <div class="page">
      <header class="page-head">
        <div><h1 class="large-title" tabindex="-1">Firms</h1><p class="sr" id="listCount" aria-live="polite"></p></div>
        <a class="btn btn-primary" href="firm-new.html">${icon('plus')}New Firm</a>
      </header>
      <div class="filters">
        <label class="filter-field filter-search">
          <span>Firm Name</span>
          <div class="search">
            ${icon('search')}
            <input class="field" id="q" type="search" placeholder="Partial or complete name or ID" value="${esc(list.q)}" autocomplete="off">
            <kbd aria-hidden="true">/</kbd>
          </div>
        </label>
        <label class="filter-field"><span>Firm Type</span>
          <select class="field" id="typeFilter">
            <option value="">All Types</option>
            ${Object.entries(TYPES).map(([v, t]) => `<option value="${v}" ${list.type === v ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
          </select>
        </label>
        <label class="filter-field"><span>Firm State</span>
          <select class="field" id="stateFilter">
            <option value="">All States</option>
            ${Object.entries(STATES).map(([v, l]) => `<option value="${v}" ${list.state === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-gray" type="button" id="clearFilters" data-act="clear-filters">Reset</button>
        <label class="check push"><span class="switch"><input type="checkbox" role="switch" id="showDeleted" ${list.deleted ? 'checked' : ''}><span></span></span>Show Deleted</label>
      </div>
      <section class="card" id="results" aria-label="Firms"></section>
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
    <td class="acts"><span class="skel-acts"><span class="skel skel-icon hide-compact"></span><span class="skel skel-icon"></span></span></td>
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
  $('#clearFilters').disabled = !filtered;
}

function sortHeader(key, label, cls = '') {
  const { sort, dir } = listCtl.state;
  const on = sort === key;
  return `<th class="${cls}" ${on ? `aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-act="sort" data-key="${key}">${label}${icon('up')}</button></th>`;
}

function pagerHTML(total) {
  const { page, size } = listCtl.state;
  const pages = Math.max(1, Math.ceil(total / size));
  const start = page * size;
  return `<div class="pager">
    <span>${start + 1}–${Math.min(start + size, total)} of ${total}</span>
    <div class="pager-actions">
      <label><span class="sr">Rows per page</span>
        <select class="field" id="pageSize">${[10, 25, 50].map(n => `<option value="${n}" ${size === n ? 'selected' : ''}>${n} rows</option>`).join('')}</select>
      </label>
      <button class="icon-btn" type="button" data-act="page" data-d="-1" aria-label="Previous Page" ${page === 0 ? 'disabled' : ''}>${icon('back')}</button>
      <span>${page + 1} of ${pages}</span>
      <button class="icon-btn flip" type="button" data-act="page" data-d="1" aria-label="Next Page" ${page >= pages - 1 ? 'disabled' : ''}><svg class="i" aria-hidden="true" transform="rotate(180)"><use href="#i-back"/></svg></button>
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
      ? `<div class="empty"><h3>No matching firms</h3><p>Try a different name, or clear the filters.</p><button class="btn btn-tint" type="button" data-act="clear-filters">Clear Filters</button></div>`
      : `<div class="empty"><h3>No firms yet</h3><p>Create a firm to start onboarding it to the exchange.</p><a class="btn btn-primary" href="firm-new.html">${icon('plus')}New Firm</a></div>`;
    return;
  }
  $('#results').innerHTML = `
    <table class="tbl">
      <thead><tr>${sortHeader('name', 'Name')}${sortHeader('id', 'Firm ID', 'hide-compact')}${sortHeader('type', 'Type', 'hide-compact')}${sortHeader('state', 'State')}<th class="acts"><span class="sr">Actions</span></th></tr></thead>
      <tbody>${pageRows.map(rowHTML).join('')}</tbody>
    </table>
    ${pagerHTML(rows.length)}`;
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
      ${f.deleted
        ? `<button class="btn btn-tint" type="button" data-act="restore" data-id="${esc(f.id)}">Restore</button>`
        : `<a class="icon-btn hide-compact" href="${esc(hrefFor(f.id, 'edit'))}" aria-label="Edit ${esc(f.name)}" title="Edit">${icon('edit')}</a>
           <button class="icon-btn" type="button" data-act="row-menu" data-id="${esc(f.id)}" aria-haspopup="menu" aria-label="More actions for ${esc(f.name)}" title="More">${icon('more')}</button>`}
    </td>
  </tr>`;
}
