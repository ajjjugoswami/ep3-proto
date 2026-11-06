'use strict';

const serviceOf = (f, sid) => (f.services || []).find(s => s.id === sid);
const entityRows = (kind, f, sid) => {
  if (kind !== 'keys') return f[ENTITIES[kind].key] || (f[ENTITIES[kind].key] = []);
  const svc = serviceOf(f, sid);
  return svc ? (svc.keys || (svc.keys = [])) : [];
};
const entityBase = (kind, f, sid) => (kind === 'keys'
  ? `api-keys.html?firm=${encodeURIComponent(f.id)}&service=${encodeURIComponent(sid)}`
  : hrefFor(f.id, kind));
const RECORD_FILES = { users: 'user.html', accounts: 'account.html', services: 'service.html', keys: 'api-key.html' };
const recordUrl = (kind, f, sid, extra) => {
  const query = new URLSearchParams({ firm: f.id, ...(sid ? { service: sid } : {}), ...extra });
  return `${RECORD_FILES[kind]}?${query}`;
};
const entityNewHref = (kind, f, sid) => recordUrl(kind, f, sid, { mode: 'new' });
const entityHref = (kind, f, sid, id, tail) => {
  if (tail === 'keys') return entityBase('keys', f, id);
  return recordUrl(kind, f, sid, { id, ...(tail === 'edit' ? { mode: 'edit' } : {}) });
};

function entityCell(value, opts) {
  if (opts.pill) return statusPill(value);
  if (isEmpty(value) && value !== 0) return '<span class="row-value unset">—</span>';
  if (opts.strong) return `<strong class="firm-name">${esc(value)}</strong>`;
  return opts.mono ? `<span class="mono firm-id">${esc(value)}</span>` : esc(value);
}

const statusPill = value => {
  const label = value || 'Active';
  return `<span class="pill pill-${esc(String(label).toLowerCase().replace(/\s+/g, '-'))}">${esc(label)}</span>`;
};

function entityTableHTML(kind, f, sid, editable) {
  const e = ENTITIES[kind];
  const rows = entityRows(kind, f, sid);
  if (!rows.length) return `<div class="card empty small"><p>This ${kind === 'keys' ? 'service' : 'firm'} has no ${esc(e.plural.toLowerCase())} yet.</p></div>`;
  const table = `<table class="tbl ${e.wide ? 'tbl-wide' : ''}">
    <thead><tr>
      ${e.columns.map(([label, , o = {}]) => `<th class="${o.sec ? 'hide-compact' : ''} ${o.num ? 'num' : ''}">${esc(label)}</th>`).join('')}
      ${kind === 'services' ? '<th>Keys</th>' : ''}
      <th class="acts"><span class="sr">Actions</span></th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr data-href="${esc(entityHref(kind, f, sid, r.id))}">
      ${e.columns.map(([, get, o = {}]) => `<td class="${o.sec ? 'hide-compact' : ''} ${o.num ? 'num' : ''}">${entityCell(get(r, f), o)}</td>`).join('')}
      ${kind === 'services' ? `<td><a class="btn btn-tint btn-small" href="${esc(entityHref(kind, f, sid, r.id, 'keys'))}">${icon('key')}${(r.keys || []).length}</a></td>` : ''}
      <td class="acts">${editable ? `
        <a class="icon-btn" href="${esc(entityHref(kind, f, sid, r.id, 'edit'))}" aria-label="Edit ${esc(e.title(r))}" title="Edit">${icon('edit')}</a>
        <button class="icon-btn danger" type="button" data-act="ent-del" data-kind="${kind}" data-id="${esc(r.id)}" data-sid="${esc(sid || '')}" aria-label="Delete ${esc(e.title(r))}" title="Delete">${icon('trash')}</button>` : ''}
      </td>
    </tr>`).join('')}</tbody>
  </table>`;
  return `<div class="card ${e.wide ? 'table-scroll' : ''}">${table}</div>`;
}

function entityToolbarHTML(kind, f, sid, editable) {
  const e = ENTITIES[kind];
  const rows = entityRows(kind, f, sid);
  return `<div class="tab-toolbar">
    <span class="page-sub">${rows.length} ${rows.length === 1 ? esc(e.one.toLowerCase()) : esc(e.plural.toLowerCase())}</span>
    ${editable ? `<div class="head-acts">
      ${e.bulk ? `<button class="btn btn-gray" type="button" data-act="ent-bulk" data-kind="${kind}" data-state="Suspended" ${rows.length ? '' : 'disabled'}>Suspend All</button>
      <button class="btn btn-gray" type="button" data-act="ent-bulk" data-kind="${kind}" data-state="Active" ${rows.length ? '' : 'disabled'}>Activate All</button>` : ''}
      <a class="btn btn-primary" href="${esc(entityNewHref(kind, f, sid))}">${icon('plus')}${kind === 'keys' ? 'Create API Key' : `Add New ${esc(e.one)}`}</a>
    </div>` : ''}
  </div>`;
}

function entityTabHTML(kind, f) {
  const editable = !f.deleted;
  return `${entityToolbarHTML(kind, f, null, editable)}${entityTableHTML(kind, f, null, editable)}`;
}

function accountsTabHTML(f) {
  const positions = f.positions || [];
  const auto = storage.get('ep3.firms.prototype.autoReload') === '1';
  return `${entityTabHTML('accounts', f)}
    <section class="section tab-block">
      <div class="section-head">
        <h2 class="section-title">Account Positions</h2>
        <label class="check"><span class="switch"><input type="checkbox" role="switch" id="autoReload" ${auto ? 'checked' : ''}><span></span></span>Auto Reload Positions</label>
      </div>
      ${positions.length ? `<div class="card table-scroll"><table class="tbl tbl-wide">
        <thead><tr><th>Account</th><th>Symbol</th><th>Sub Type</th><th class="num">BOD Position</th><th class="num">Open Positions</th><th class="num">Qty Bought</th><th class="num">Qty Sold</th><th class="num">Unsettled</th></tr></thead>
        <tbody>${positions.map(p => `<tr><td><strong class="firm-name">${esc(p.account)}</strong></td><td class="mono">${esc(p.symbol)}</td><td>${esc(p.subType)}</td><td class="num">${esc(p.bod)}</td><td class="num">${esc(p.open)}</td><td class="num">${esc(p.bought)}</td><td class="num">${esc(p.sold)}</td><td class="num">${esc(p.unsettled)}</td></tr>`).join('')}</tbody>
      </table></div>` : '<div class="card empty small"><p>No open positions for this firm’s accounts.</p></div>'}
    </section>`;
}

function limitsTabHTML(f) {
  return `<div class="filters">
      <label class="filter-field filter-search">
        <span>Filter</span>
        <div class="search">${icon('search')}<input class="field" id="limitFilter" type="search" placeholder="Product or symbol" autocomplete="off"></div>
      </label>
    </div>
    <div id="limitsTab">${collectionHTML('limits', f.limits || [], { editable: !f.deleted })}</div>`;
}

function assocBox(f, key) {
  if (!assocState || assocState.firmId !== f.id) assocState = { firmId: f.id, boxes: {} };
  if (!assocState.boxes[key]) assocState.boxes[key] = { list: [...((f.assoc || {})[key] || [])], picked: new Set() };
  return assocState.boxes[key];
}

const assocCfg = (f, key) => (ASSOC[f.type] || []).find(c => c.key === key);

function assocListHTML(key, side, title, ids, box, editable) {
  return `<div class="assoc-col">
    <h3 class="assoc-title">${esc(title)} <span>${ids.length}</span></h3>
    <div class="assoc-list" role="group" aria-label="${esc(title)}">
      ${ids.length ? ids.map(id => {
        const other = firmById(id);
        return `<button class="assoc-item" type="button" data-act="assoc-pick" data-key="${key}" data-id="${esc(id)}" aria-pressed="${box.picked.has(id)}" ${editable ? '' : 'disabled'}>
          <span>${esc(other ? other.name : id)}</span>${icon('check')}</button>`;
      }).join('') : '<p class="assoc-empty">None</p>'}
    </div>
  </div>`;
}

function assocBoxHTML(f, cfg) {
  const box = assocBox(f, cfg.key);
  const typeLabel = TYPES[cfg.type].label;
  const editable = !f.deleted;
  const available = firms.filter(x => !x.deleted && x.type === cfg.type && x.id !== f.id && !box.list.includes(x.id)).map(x => x.id);
  const saved = (f.assoc || {})[cfg.key] || [];
  const dirty = JSON.stringify(saved) !== JSON.stringify(box.list);
  return `<section class="section" id="assoc-${cfg.key}">
    <div class="section-head"><h2 class="section-title">${esc(cfg.title(f.name))}</h2></div>
    <div class="card form-card">
      <p class="assoc-help">${esc(cfg.help(f.name))}</p>
      <div class="assoc-grid">
        ${assocListHTML(cfg.key, 'available', cfg.available || `Available ${typeLabel}s`, available, box, editable)}
        <div class="assoc-arrows">
          <button class="icon-btn btn-gray" type="button" data-act="assoc-add" data-key="${cfg.key}" aria-label="Associate selected firms" title="Associate selected" ${editable ? '' : 'disabled'}>${icon('forward')}</button>
          <button class="icon-btn btn-gray" type="button" data-act="assoc-remove" data-key="${cfg.key}" aria-label="Remove selected firms" title="Remove selected" ${editable ? '' : 'disabled'}>${icon('back')}</button>
        </div>
        ${assocListHTML(cfg.key, 'associated', cfg.associated || `Associated ${typeLabel}s`, box.list, box, editable)}
      </div>
      ${editable ? `<div class="assoc-foot">
        <a class="btn btn-tint" href="firm-new.html?type=${cfg.type}">${icon('plus')}Add New ${esc(typeLabel)}</a>
        <div class="head-acts">
          <button class="btn btn-plain" type="button" data-act="assoc-cancel" data-key="${cfg.key}" ${dirty ? '' : 'disabled'}>Cancel</button>
          <button class="btn btn-primary" type="button" data-act="assoc-update" data-key="${cfg.key}" ${dirty ? '' : 'disabled'}>Update</button>
        </div>
      </div>` : ''}
    </div>
  </section>`;
}

function associationsTabHTML(f) {
  return `<div class="sections">${(ASSOC[f.type] || []).map(cfg => assocBoxHTML(f, cfg)).join('')}</div>`;
}

function refreshAssocBox(f, key, focusSelector) {
  const host = document.getElementById(`assoc-${key}`);
  if (!host) return;
  host.outerHTML = assocBoxHTML(f, assocCfg(f, key));
  if (focusSelector) { const el = $(focusSelector); if (el) el.focus({ preventScroll: true }); }
}
