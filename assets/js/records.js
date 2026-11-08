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
  const base = rec ? clone(rec) : Object.fromEntries([['id', ''], ...fields.filter(x => x.def !== undefined).map(x => [x.k, x.def])]);
  form = {
    mode: rec ? 'edit' : 'create', draft: base, original: clone(base), errors: {}, idTouched: true, saving: false,
    entity: { kind, firmId: f.id, sid, fields, one: e.one },
  };
  const listLabel = listLabelFor(kind, f, sid);
  const back = directoryBack(kind) || (rec
    ? editBack(entityHref(kind, f, sid, rec.id), e.title(rec), entityBase(kind, f, sid), listLabel)
    : { href: entityBase(kind, f, sid), label: listLabel });
  const backHref = back.href;
  const backLabel = back.label;
  document.title = `${rec ? `Edit ${e.title(rec)}` : `New ${e.one}`} · EP3 Admin`;
  $('#view').innerHTML = `<div class="page form-page">
    <a class="crumb" href="${esc(backHref)}">${icon('back')}${esc(backLabel)}</a>
    <header class="page-head"><h1 class="large-title" tabindex="-1">${rec ? `Edit ${esc(e.one)}` : (kind === 'keys' ? 'Create API Key' : `New ${esc(e.one)}`)}</h1></header>
    <form id="firmForm" novalidate>
      <div class="form-stack" id="formBody">${formBodyHTML()}</div>
      ${dockHTML(backHref, rec ? 'Save Changes' : `Create ${e.one}`)}
    </form>
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
  });
  if (mode === 'create' && !errors.id && entityRows(entity.kind, f, entity.sid).some(r => r.id === String(draft.id).trim())) {
    errors.id = `Another ${entity.one.toLowerCase()} already uses this ID. Enter a different one.`;
  }
  return errors;
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
