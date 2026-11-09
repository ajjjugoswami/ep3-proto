'use strict';

function renderEntityList(kind, f, sid) {
  const e = ENTITIES[kind];
  document.title = `${sid} ${e.plural} · EP3 Admin`;
  $('#view').innerHTML = `<div class="page">
    <a class="crumb" href="${esc(hrefFor(f.id, 'services'))}">${icon('back')}${esc(f.name)} · Firm Services</a>
    <header class="page-head"><h1 class="large-title" tabindex="-1">${esc(sid)} ${esc(e.plural)}</h1></header>
    ${entityToolbarHTML(kind, f, sid, !f.deleted)}
    ${entityTableHTML(kind, f, sid, !f.deleted)}
  </div>`;
}

const SOFT_DELETE = ['users', 'accounts'];
const DIRECTORY_PAGES = { users: 'users.html', accounts: 'accounts.html' };

function directoryBack(kind) {
  const prev = session.get('pagePrev');
  return prev && DIRECTORY_PAGES[kind] && pageFile(prev) === pageFile(DIRECTORY_PAGES[kind]) ? { href: prev, label: ENTITIES[kind].plural } : null;
}

const listLabelFor = (kind, f, sid) => (kind === 'keys' ? `${sid} API Keys` : `${f.name} · ${ENTITIES[kind].plural}`);

function recordBack(kind, f, rec, editing) {
  const list = { href: entityBase(kind, f), label: listLabelFor(kind, f) };
  const fromDirectory = directoryBack(kind);
  if (fromDirectory) return fromDirectory;
  return editing ? editBack(entityHref(kind, f, null, rec.id), ENTITIES[kind].title(rec), list.href, list.label) : list;
}

const recordPill = rec => (rec.deleted ? '<span class="pill pill-deleted">Deleted</span>' : statusPill(rec.state));
const recordMeta = (f, rec, detail) => `${detail ? `<span>${esc(detail)}</span>` : ''}<span class="mono">${esc(rec.id)}</span><a href="${esc(hrefFor(f.id))}">${esc(f.name)}</a>`;
const tabIsCurrent = (t, current) => t.path === current || (t.also || []).includes(current);

function recordHeadHTML({ back, title, pill, meta, actions, tabs, current, hrefOf, label }) {
  return `<div class="detail-head">
    <a class="crumb" href="${esc(back.href)}">${icon('back')}${esc(back.label)}</a>
    <header class="firm-head">
      <div>
        <div class="firm-title"><h1 class="large-title" tabindex="-1">${esc(title)}</h1>${pill}</div>
        <div class="firm-meta">${meta}</div>
      </div>
      <div class="head-acts">${actions}</div>
    </header>
    ${tabs.length > 1 ? `<nav class="tabs" aria-label="${esc(label)}">${tabs.map(t => `<a href="${esc(hrefOf(t.path))}" ${tabIsCurrent(t, current) ? 'aria-current="page"' : ''}>${esc(t.label)}</a>`).join('')}</nav>` : ''}
  </div>`;
}

function recordProfileHTML(kind, f, rec) {
  const e = ENTITIES[kind];
  return `<div class="sections">
    <section class="section"><div class="card">${e.fields(f).map(x => readRow(x, rec)).join('')}</div></section>
    ${(e.collections || []).map(c => `<section class="section">${collectionHTML(c.collection, rec[c.collection] || [], { editable: false, heading: true, tip: c.tip })}</section>`).join('')}
  </div>`;
}

const deletedBanner = noun => `<div class="banner bad">${icon('trash')}<span>This ${noun} is deleted, so its details are read-only.</span></div>`;

const PICKER_PAGE_SIZE = 10;

function pickerPagerHTML(page, shown, hasMore) {
  return `<div class="pager pager-cursor">
    <span>${shown ? `Rows ${page * PICKER_PAGE_SIZE + 1}–${page * PICKER_PAGE_SIZE + shown}` : 'No rows'}</span>
    <div class="pager-pages">
      <button class="btn btn-line btn-small" type="button" data-pick-page="-1" ${page ? '' : 'disabled'}>${icon('back')}Previous</button>
      <button class="btn btn-line btn-small" type="button" data-pick-page="1" ${hasMore ? '' : 'disabled'}>Next${icon('forward')}</button>
    </div>
  </div>`;
}

function openCapacityPicker({ title, intro, empty, noun, candidates, columns, onAdd }) {
  const picked = new Set();
  const capacities = new Map();
  let page = 0;
  const body = () => {
    if (!candidates.length) return `<div class="card empty small"><p>${esc(empty)}</p></div>`;
    const rows = candidates.slice(page * PICKER_PAGE_SIZE, (page + 1) * PICKER_PAGE_SIZE);
    return `<p class="sheet-note">${esc(intro)} ${picked.size ? `${picked.size} selected.` : ''}</p>
      <div class="card table-scroll"><table class="tbl">
        <thead><tr><th class="check-cell"><span class="sr">Select</span></th>${columns.map(([label]) => `<th>${esc(label)}</th>`).join('')}<th>Customer Order Capacity</th></tr></thead>
        <tbody>${rows.map(item => `<tr>
          <td class="check-cell"><input type="checkbox" data-pick="${esc(item.id)}" ${picked.has(item.id) ? 'checked' : ''} aria-label="Select ${esc(item.displayName)}"></td>
          ${columns.map(([, cell]) => `<td>${cell(item)}</td>`).join('')}
          <td><select class="field" data-pick-capacity="${esc(item.id)}" aria-label="Customer order capacity for ${esc(item.displayName)}">${ORDER_CAPACITIES.map(c => `<option ${(capacities.get(item.id) || 'Other') === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></td>
        </tr>`).join('')}</tbody>
      </table></div>
      ${pickerPagerHTML(page, rows.length, (page + 1) * PICKER_PAGE_SIZE < candidates.length)}`;
  };
  openWideSheet({
    title,
    closeLabel: 'Cancel',
    primary: () => {
      if (!candidates.length) return '';
      return picked.size ? `Add ${picked.size} ${noun}${picked.size === 1 ? '' : 's'}` : `Add ${noun}s`;
    },
    body,
    onPaint: (d, paint) => {
      $$('[data-pick]', d).forEach(box => box.addEventListener('change', () => {
        if (box.checked) picked.add(box.dataset.pick); else picked.delete(box.dataset.pick);
        paint();
      }));
      $$('[data-pick-capacity]', d).forEach(sel => sel.addEventListener('change', () => capacities.set(sel.dataset.pickCapacity, sel.value)));
      $$('[data-pick-page]', d).forEach(btn => btn.addEventListener('click', () => {
        page += Number(btn.dataset.pickPage);
        paint();
      }));
    },
    onPrimary: () => {
      if (!picked.size) { toast(`Select at least one ${noun.toLowerCase()} to add.`, { info: true }); return; }
      const picks = candidates.filter(item => picked.has(item.id)).map(item => ({ item, capacity: capacities.get(item.id) || 'Other' }));
      $('#sheet').close();
      onAdd(picks);
    },
  });
}

function recordActionsHTML(kind, f, sid, rec) {
  const e = ENTITIES[kind];
  if (f.deleted) return '';
  if (rec.deleted) return `<div class="head-acts"><button class="btn btn-primary" type="button" data-act="ent-restore" data-kind="${kind}" data-firm="${esc(f.id)}" data-id="${esc(rec.id)}">${icon('restore')}Restore ${esc(e.one)}</button></div>`;
  return `<div class="head-acts">
    ${kind === 'services' ? `<a class="btn btn-gray" href="${esc(entityHref(kind, f, sid, rec.id, 'keys'))}">${icon('key')}API Keys</a>` : ''}
    <button class="btn btn-gray" type="button" data-act="ent-del" data-kind="${kind}" data-firm="${esc(f.id)}" data-id="${esc(rec.id)}" data-sid="${esc(sid || '')}">Delete</button>
    <a class="btn btn-primary" href="${esc(entityHref(kind, f, sid, rec.id, 'edit'))}">${icon('edit')}Edit ${esc(e.one)}</a>
  </div>`;
}

function afterRecordChange(kind, f, sid) {
  if (DIRECTORY_PAGES[kind] && PAGE === pageFile(DIRECTORY_PAGES[kind])) route();
  else go(directoryBack(kind) ? directoryBack(kind).href : entityBase(kind, f, sid));
}

async function deleteRecord(kind, f, sid, id) {
  const e = ENTITIES[kind];
  const rows = entityRows(kind, f, sid);
  const index = rows.findIndex(r => r.id === id);
  const name = e.title(rows[index]);
  const soft = SOFT_DELETE.includes(kind);
  const text = soft
    ? `The ${e.one.toLowerCase()} is removed from ${f.name}. You can restore it later from Show Deleted on the ${e.plural} page.`
    : `This removes the ${e.one.toLowerCase()} from ${f.name}.`;
  const ok = await ask({ title: `Delete ${name}?`, text, confirm: `Delete ${e.one}`, danger: true, glyph: 'trash' });
  if (!ok) return;
  if (soft) rows[index].deleted = true;
  else rows.splice(index, 1);
  persist();
  toast(`Deleted ${name}.`);
  afterRecordChange(kind, f, sid);
}

async function restoreRecord(kind, f, id) {
  const e = ENTITIES[kind];
  const rec = entityRows(kind, f).find(r => r.id === id);
  const name = e.title(rec);
  const ok = await ask({ title: `Restore ${name}?`, text: `The ${e.one.toLowerCase()} returns to ${f.name} in the state it had before it was deleted.`, confirm: `Restore ${e.one}`, glyph: 'restore' });
  if (!ok) return;
  rec.deleted = false;
  persist();
  route();
  toast(`Restored ${name}.`);
}

function renderEntityView(kind, f, sid, rec) {
  const e = ENTITIES[kind];
  const name = e.title(rec);
  document.title = `${name} · EP3 Admin`;
  const fields = e.fields(f, sid);
  const back = directoryBack(kind) || { href: entityBase(kind, f, sid), label: listLabelFor(kind, f, sid) };
  $('#view').innerHTML = `<div class="page">
    <a class="crumb" href="${esc(back.href)}">${icon('back')}${esc(back.label)}</a>
    <header class="page-head">
      <div class="firm-title"><h1 class="large-title" tabindex="-1">${esc(name)}</h1>${rec.deleted ? '<span class="pill pill-deleted">Deleted</span>' : rec.state ? statusPill(rec.state) : ''}</div>
      ${recordActionsHTML(kind, f, sid, rec)}
    </header>
    <div class="card">${fields.map(x => readRow(x, rec)).join('')}${kind === 'keys' ? readRow({ k: 'jti', label: 'Token ID', mono: true }, rec) : ''}</div>
  </div>`;
}

function startEntityForm(kind, f, sid, rec) {
  const e = ENTITIES[kind];
  const fields = e.fields(f, sid);
  const defaults = [['id', ''], ...Object.entries(e.defaults ? e.defaults(f) : {}), ...fields.filter(x => x.def !== undefined).map(x => [x.k, clone(x.def)]), ...(e.collections || []).map(c => [c.collection, []])];
  const base = rec ? clone(rec) : Object.fromEntries(defaults);
  form = {
    mode: rec ? 'edit' : 'create', draft: base, original: clone(base), errors: {}, idTouched: true, saving: false, open: new Set(),
    entity: { kind, firmId: f.id, sid, fields, one: e.one, collections: e.collections, validate: e.validate, confirmSave: e.confirmSave },
  };
  const listLabel = listLabelFor(kind, f, sid);
  const back = directoryBack(kind) || (rec
    ? editBack(entityHref(kind, f, sid, rec.id), e.title(rec), entityBase(kind, f, sid), listLabel)
    : { href: entityBase(kind, f, sid), label: listLabel });
  const backHref = back.href;
  const backLabel = back.label;
  document.title = `${rec ? `Edit ${e.title(rec)}` : `New ${e.one}`} · EP3 Admin`;
  const formHTML = `<form id="firmForm" novalidate>
      <div class="form-stack" id="formBody">${formBodyHTML()}</div>
      ${dockHTML(backHref, rec ? 'Save Changes' : `Create ${e.one}`)}
    </form>`;
  $('#view').innerHTML = rec && e.head
    ? `<div class="detail-page">${e.head(f, rec)}<div class="detail-scroll detail-form">${formHTML}</div></div>`
    : `<div class="page form-page">
      <a class="crumb" href="${esc(backHref)}">${icon('back')}${esc(backLabel)}</a>
      <header class="page-head"><h1 class="large-title" tabindex="-1">${rec ? `Edit ${esc(e.one)}` : (kind === 'keys' ? 'Create API Key' : `New ${esc(e.one)}`)}</h1></header>
      ${formHTML}
    </div>`;
  updateDock();
}

function validateEntity() {
  const { entity, draft, mode } = form;
  const f = firmById(entity.firmId);
  const errors = {};
  entity.fields.forEach(x => {
    const v = draft[x.k];
    if (x.req && !String(v ?? '').trim()) errors[x.k] = requiredMessage(x);
    if (x.inputType === 'number' && !isEmpty(v) && !(Number(v) >= 0)) errors[x.k] = `${x.label} must be 0 or more.`;
    if (x.inputType === 'email' && v && !validEmail(v)) errors[x.k] = EMAIL_ERROR;
  });
  if (mode === 'create' && !errors.id && entityRows(entity.kind, f, entity.sid).some(r => r.id === String(draft.id).trim())) {
    errors.id = `Another ${entity.one.toLowerCase()} already uses this ID. Enter a different one.`;
  }
  return entity.validate ? { ...entity.validate(draft, f, mode), ...errors } : errors;
}

async function submitEntity() {
  const { entity } = form;
  const creating = form.mode === 'create';
  if (!creating && !isDirty()) return;
  const draft = form.draft;
  if (creating) draft.id = String(draft.id || '').trim();
  form.errors = validateEntity();
  if (Object.keys(form.errors).length) {
    refreshFormBody();
    const el = $(`#firm-${Object.keys(form.errors)[0]}`);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
    return;
  }
  if (entity.confirmSave && !(await entity.confirmSave(draft, form.original, form.mode))) return;
  form.saving = true;
  updateDock();
  await wait(350);
  const f = firmById(entity.firmId);
  const rows = entityRows(entity.kind, f, entity.sid);
  const saved = clone(draft);
  if (entity.kind === 'keys' && creating) saved.jti = Math.random().toString(16).slice(2, 6) + '-' + Math.random().toString(16).slice(2, 6);
  if (creating) rows.push(saved);
  else rows[rows.findIndex(r => r.id === form.original.id)] = saved;
  persist();
  form = null;
  go(entityHref(entity.kind, f, entity.sid, saved.id));
  toast(creating ? `Created ${ENTITIES[entity.kind].title(saved)}.` : `Saved changes to ${ENTITIES[entity.kind].title(saved)}.`);
}

function renderNotFound(id) {
  document.title = 'Firm Not Found · EP3 Admin';
  $('#view').innerHTML = `<div class="page"><a class="crumb" href="firms.html">${icon('back')}Firms</a><div class="card empty"><h1 class="large-title" tabindex="-1">Firm not found</h1><p>No firm has the ID “${esc(id)}”.</p><a class="btn btn-tint" href="firms.html">Show All Firms</a></div></div>`;
}
