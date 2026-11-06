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

function renderEntityView(kind, f, sid, rec) {
  const e = ENTITIES[kind];
  const name = e.title(rec);
  document.title = `${name} · EP3 Admin`;
  const fields = e.fields(f, sid);
  const backLabel = kind === 'keys' ? `${sid} API Keys` : `${f.name} · ${e.plural}`;
  $('#view').innerHTML = `<div class="page">
    <a class="crumb" href="${esc(entityBase(kind, f, sid))}">${icon('back')}${esc(backLabel)}</a>
    <header class="page-head">
      <div class="firm-title"><h1 class="large-title" tabindex="-1">${esc(name)}</h1>${rec.state ? statusPill(rec.state) : ''}</div>
      ${f.deleted ? '' : `<div class="head-acts">
        ${kind === 'services' ? `<a class="btn btn-gray" href="${esc(entityHref(kind, f, sid, rec.id, 'keys'))}">${icon('key')}API Keys</a>` : ''}
        <button class="btn btn-gray" type="button" data-act="ent-del" data-kind="${kind}" data-id="${esc(rec.id)}" data-sid="${esc(sid || '')}">Delete</button>
        <a class="btn btn-primary" href="${esc(entityHref(kind, f, sid, rec.id, 'edit'))}">${icon('edit')}Edit ${esc(e.one)}</a>
      </div>`}
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
  const backHref = rec ? entityHref(kind, f, sid, rec.id) : entityBase(kind, f, sid);
  const backLabel = rec ? e.title(rec) : (kind === 'keys' ? `${sid} API Keys` : `${f.name} · ${e.plural}`);
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
    if (x.req && !String(v ?? '').trim()) errors[x.k] = x.kind === 'select' ? `Choose ${x.label.toLowerCase()}.` : `Enter ${x.label.toLowerCase()}.`;
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
