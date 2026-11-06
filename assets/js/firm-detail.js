'use strict';

function sectionsFor(f) {
  return SECTIONS.filter(s => s.collection || s.fields.some(x => visible(x, f)));
}

function railHTML(sections) {
  return `<aside class="rail">
    <nav class="rail-nav" aria-label="Sections">
      ${sections.map(s => `<button type="button" data-act="jump" data-target="sec-${s.id}">${esc(s.title)}</button>`).join('')}
    </nav>
  </aside>`;
}

function markSection(id) {
  $$('.rail-nav button').forEach(b => b.classList.toggle('on', b.dataset.target === id));
}

function startSpy() {
  if (spy) spy.disconnect();
  spy = null;
  const scroller = $('.detail-scroll');
  const sections = $$('.detail-scroll .section');
  if (!scroller || !$('.rail-nav') || !sections.length) return;
  const update = () => {
    if (Date.now() < spyLock) return;
    const line = scroller.getBoundingClientRect().top + 60;
    let current = sections[0];
    sections.forEach(s => { if (s.getBoundingClientRect().top <= line) current = s; });
    if (scroller.scrollTop > 0 && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) current = sections[sections.length - 1];
    markSection(current.id);
  };
  scroller.addEventListener('scroll', update, { passive: true });
  update();
  spy = { disconnect: () => scroller.removeEventListener('scroll', update) };
}

function readValue(x, f) {
  if (x.display) return x.display(f);
  if (x.kind === 'static') return x.value;
  if (x.kind === 'type') return TYPES[f.type].label;
  if (x.kind === 'select' && x.k === 'state') return STATES[f.state] || f.state;
  return getPath(f, x.k);
}

function readRow(x, f) {
  if (x.kind === 'toggle') {
    return `<div class="row row-toggle">
      <span class="row-label">${esc(x.label)}${tipHTML(x.tip, f)}</span>
      ${x.help ? `<span class="row-help">${esc(x.help)}</span>` : ''}
      <span class="switch"><input type="checkbox" role="switch" disabled ${f[x.k] ? 'checked' : ''} aria-label="${esc(x.label)}"><span></span></span>
    </div>`;
  }
  const v = readValue(x, f);
  return `<div class="row">
    <span class="row-label">${esc(x.label)}${tipHTML(x.tip, f)}</span>
    ${isEmpty(v) ? `<span class="row-value unset" data-mirror="${esc(x.k)}">Not set</span>` : `<span class="row-value ${x.mono ? 'mono' : ''}" data-mirror="${esc(x.k)}">${esc(v)}</span>`}
  </div>`;
}

function collectionHTML(key, rows, { editable, heading }) {
  const c = COLLECTIONS[key];
  const columns = c.columns || [[c.primary, c.one]];
  const addBtn = editable ? `<button class="btn btn-tint" type="button" data-act="rec-add" data-col="${key}">${icon('plus')}Add ${esc(c.one)}</button>` : '';
  const head = heading ? `<div class="section-head"><h2 class="section-title">${esc(c.title)}${tipHTML(c.tip)}</h2>${addBtn}</div>` : `<div class="section-head"><span class="page-sub">${rows.length} ${rows.length === 1 ? esc(c.one.toLowerCase()) : esc(c.title.toLowerCase())}</span>${addBtn}</div>`;
  const body = !rows.length
    ? `<div class="empty small"><p>${esc(c.empty)}</p></div>`
    : `<table class="tbl">
        <thead><tr>${columns.map(([, label, sec, kind]) => `<th class="${sec ? 'hide-compact' : ''} ${kind === 'num' ? 'num' : ''}">${esc(label)}</th>`).join('')}${editable ? '<th class="acts"><span class="sr">Actions</span></th>' : ''}</tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          ${columns.map(([k, , sec, kind], ci) => `<td class="${sec ? 'hide-compact' : ''} ${kind === 'num' ? 'num' : ''}">${cellHTML(r[k], kind, ci === 0)}</td>`).join('')}
          ${editable ? `<td class="acts">
            <button class="icon-btn" type="button" data-act="rec-edit" data-col="${key}" data-i="${i}" aria-label="Edit ${esc(recordLabel(c, r))}" title="Edit">${icon('edit')}</button>
            <button class="icon-btn danger" type="button" data-act="rec-del" data-col="${key}" data-i="${i}" aria-label="Remove ${esc(recordLabel(c, r))}" title="Remove">${icon('trash')}</button>
          </td>` : ''}
        </tr>`).join('')}</tbody>
      </table>`;
  return `${head}<div class="card">${body}</div>`;
}

const recordLabel = (c, r) => (c.labelOf ? c.labelOf(r) : r[c.primary]) || c.one;

function cellHTML(v, kind, strong) {
  if (kind === 'bool') return v ? 'Yes' : 'No';
  if (kind === 'num') return isEmpty(v) ? '—' : esc(Number(v).toLocaleString());
  if (isEmpty(v)) return `<span class="row-value unset">—</span>`;
  return strong ? `<strong class="firm-name">${esc(v)}</strong>` : esc(v);
}

function detailHeadHTML(f, tabPath, editing) {
  const tabs = TABS.filter(t => t.when(f));
  const t = TYPES[f.type];
  return `<div class="detail-head">
    <a class="crumb" href="firms.html">${icon('back')}Firms</a>
    <header class="firm-head">
      <div>
        <div class="firm-title">
          <h1 class="large-title" tabindex="-1">${esc(f.name)}</h1>
          ${statePill(f)}
        </div>
        <div class="firm-meta">
          <span>${esc(t.label)}</span>
          <button class="copy mono" type="button" data-act="copy-id" data-id="${esc(f.id)}" aria-label="Copy Firm ID ${esc(f.id)}" title="Copy Firm ID">${esc(f.id)}${icon('copy')}</button>
        </div>
      </div>
      <div class="head-acts">
        ${f.deleted
          ? `<button class="btn btn-primary" type="button" data-act="restore" data-id="${esc(f.id)}">${icon('restore')}Restore Firm</button>`
          : `<button class="btn btn-gray" type="button" data-act="cancel-orders" data-id="${esc(f.id)}">Cancel All Orders</button>
             ${editing ? '' : `<a class="btn btn-primary" href="${esc(hrefFor(f.id, 'edit'))}">${icon('edit')}Edit Firm</a>
             <button class="icon-btn btn-gray" type="button" data-act="detail-menu" data-id="${esc(f.id)}" aria-haspopup="menu" aria-label="More actions" title="More">${icon('more')}</button>`}`}
      </div>
    </header>
    ${tabs.length > 1 ? `<nav class="tabs" aria-label="Firm sections">${tabs.map(x => `<a href="${esc(hrefFor(f.id, x.path))}" ${x.path === tabPath ? 'aria-current="page"' : ''}>${esc(x.label)}</a>`).join('')}</nav>` : ''}
  </div>`;
}

function renderDetail(f, tabPath) {
  document.title = `${f.name} · EP3 Admin`;
  assocState = null;
  const tabs = TABS.filter(t => t.when(f));
  const tab = tabs.find(t => t.path === tabPath) || tabs[0];
  const sections = sectionsFor(f);
  const body = tab.render
    ? tab.render(f)
    : `<div class="split">${railHTML(sections)}<div class="sections">${sections.map(s => `
        <section class="section" id="sec-${s.id}">
          ${s.collection ? collectionHTML(s.collection, f[s.collection] || [], { editable: false, heading: true }) : `
            <div class="section-head"><h2 class="section-title">${esc(s.title)}${tipHTML(s.tip)}</h2></div>
            <div class="card">${s.fields.filter(x => visible(x, f)).map(x => readRow(x, f)).join('')}</div>`}
        </section>`).join('')}</div></div>`;
  $('#view').innerHTML = `
    <div class="detail-page">
      ${detailHeadHTML(f, tab.path, false)}
      <div class="detail-scroll">
        ${f.deleted ? `<div class="banner bad">${icon('trash')}<span>This firm is deleted, so its details are read-only.</span></div>` : ''}
        ${f.state === 'suspended' && !f.deleted ? `<div class="banner warn">${icon('pause')}<span>This firm is suspended.</span><button class="btn btn-tint" type="button" data-act="toggle-suspend" data-id="${esc(f.id)}">Activate Firm</button></div>` : ''}
        ${body}
      </div>
    </div>`;
  startSpy();
}
