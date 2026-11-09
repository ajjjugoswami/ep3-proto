'use strict';

function partsControlHTML(x, values, id) {
  const off = x.disabled ? 'disabled' : '';
  return `<div class="parts parts-${x.parts.length}" role="group" aria-labelledby="${id}-label">${x.parts.map(p => {
    const value = getPath(values, p.k);
    if (p.type === 'check') {
      return `<label class="day-chip"><input type="checkbox" data-field="${p.k}" ${value ? 'checked' : ''} ${off}><span>${esc(p.label)}</span></label>`;
    }
    const control = p.options
      ? `<select class="field" id="${id}-${p.k}" data-field="${p.k}" aria-label="${esc(p.label)}" ${off}><option value=""></option>${p.options.map(o => `<option value="${esc(o)}" ${String(value ?? '') === String(o) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
      : `<input class="field" id="${id}-${p.k}" data-field="${p.k}" type="number" min="0" value="${esc(value ?? '')}" aria-label="${esc(p.label)}" autocomplete="off" ${off}>`;
    return `<span class="part"><span class="part-label">${esc(p.label)}</span>${control}</span>`;
  }).join('')}</div>`;
}

function fieldRow(x, values, errors, ctx) {
  const id = `${ctx}-${x.k}`;
  const value = getPath(values, x.k);
  const err = errors[x.k];
  const errEl = err ? `<div class="row-err" id="${id}-err">${icon('warn')}<span>${esc(err)}</span></div>` : '';
  const reqTag = x.req ? '<span class="req">Required</span>' : '';
  const help = x.help ? `<span class="row-help" id="${id}-help">${esc(x.help)}</span>` : '';
  const described = [err ? `${id}-err` : '', x.help ? `${id}-help` : ''].filter(Boolean).join(' ');
  const off = x.disabled ? 'disabled' : '';
  const aria = `${described ? `aria-describedby="${described}"` : ''} ${err ? 'aria-invalid="true"' : ''} ${x.req ? 'aria-required="true"' : ''} ${off}`;

  if (x.kind === 'toggle') {
    const warn = x.k === 'skipRiskAndCurrencyChecks' && form && !form.module && form.original.skipRiskAndCurrencyChecks && !value
      ? `<div class="row-warn" id="riskWarn">${icon('warn')}<span>After turning risk checks back on, restart the Position Risk Server. Until then, Pre-Trade Risk checks for this firm may be incorrect.</span></div>` : '';
    return `<div class="row row-toggle" id="row-${id}">
      <label class="row-label" for="${id}">${esc(x.label)}${tipHTML(x.tip, values)}</label>
      ${help}
      <span class="switch"><input id="${id}" data-field="${x.k}" type="checkbox" role="switch" ${value ? 'checked' : ''} ${aria}><span></span></span>
      ${warn}${errEl ? `<div class="row-help">${errEl}</div>` : ''}
    </div>`;
  }

  if (x.kind === 'parts') {
    return `<div class="row" id="row-${id}">
      <span class="row-label" id="${id}-label">${esc(x.label)}${reqTag}${tipHTML(x.tip, values)}</span>
      <div>${partsControlHTML(x, values, id)}${errEl}</div>
      ${help}
    </div>`;
  }

  let control;
  if (x.kind === 'select') {
    const list2 = x.options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
    control = `<select class="field" id="${id}" data-field="${x.k}" ${aria}>
      ${x.blank !== undefined ? `<option value="">${esc(x.blank)}</option>` : ''}
      ${list2.map(o => `<option value="${esc(o.value)}" ${String(value ?? '') === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
    </select>`;
  } else if (x.kind === 'textarea') {
    control = `<textarea class="field" id="${id}" data-field="${x.k}" rows="3" ${aria}>${esc(value ?? '')}</textarea>`;
  } else {
    control = `<input class="field ${x.mono ? 'mono' : ''}" id="${id}" data-field="${x.k}" type="${x.inputType || 'text'}" value="${esc(value ?? '')}"
      ${x.ph ? `placeholder="${esc(x.ph)}"` : ''} ${x.auto ? `autocomplete="${x.auto}"` : 'autocomplete="off"'} ${x.min !== undefined ? `min="${x.min}"` : ''} ${x.list ? `list="${x.list}"` : ''}
      ${x.mono || x.k === 'name' ? 'spellcheck="false"' : ''} ${aria}>`;
  }
  const lei = x.kind === 'lei' ? `<span class="meter ${leiWarn(value) ? 'warn' : ''}" id="leiMeter">${leiText(value)}</span>` : '';
  return `<div class="row ${x.wide ? 'row-wide' : ''}" id="row-${id}">
    <label class="row-label" for="${id}">${esc(x.label)}${reqTag}${tipHTML(x.tip, values)}</label>
    <div>${control}${lei}${errEl}</div>
    ${help}
  </div>`;
}

const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const EMAIL_ERROR = 'Enter an email address like name@example.com.';
const leiWarn = v => !!v && (String(v).length !== 20 || !/^[A-Za-z0-9]+$/.test(v));
const leiText = v => !v ? '' : leiWarn(v) ? `${String(v).length} of 20 characters, letters and numbers only` : '20 characters';

function isDirty() {
  return !!form && JSON.stringify(form.draft) !== JSON.stringify(form.original);
}

function startForm(mode, source, presetType) {
  const base = mode === 'create'
    ? firm('', presetType && TYPES[presetType] ? presetType : '', { id: '' })
    : clone(source);
  form = {
    mode, draft: base, original: clone(base), errors: {}, idTouched: false, saving: false,
    presetType: presetType && TYPES[presetType] ? presetType : null,
    open: new Set(),
  };
  renderFormShell();
}

const subheadHTML = x => `<div class="form-subhead"><h2 class="section-title">${esc(x.label)}${tipHTML(x.tip)}</h2></div>`;

function formFieldRow(x, f) {
  if (form.mode === 'create' && x.editOnly) return '';
  if (x.kind === 'head') return subheadHTML(x);
  if (x.kind === 'static') return readRow(x, f);
  if (form.mode === 'edit' && x.createOnly) return readRow(x, f);
  if (x.kind === 'type') {
    if (form.mode === 'edit' || form.presetType) return `<div class="row"><span class="row-label">Firm Type</span><span class="row-value">${esc(TYPES[f.type].label)}</span></div>`;
    return fieldRow({
      ...x, kind: 'select', req: true, blank: 'Choose a type',
      options: Object.entries(TYPES).map(([value, t]) => ({ value, label: t.label })),
      help: 'Can’t be changed after the firm is created.',
    }, f, form.errors, 'firm');
  }
  if (x.kind === 'multi') return multiRowHTML(x, f);
  return fieldRow(x, f, form.errors, 'firm');
}

const FIRM_FORM_ORDER = [
  'name', 'id', 'type', 'state',
  'applyCommissionsAsSpread', 'skipCommissionBalanceAdjustment', 'skipRiskAndCurrencyChecks', 'hasSponsoredDirectMarketAccess', 'isDisintermediated',
  'participantType', 'organizationType', 'legalEntityIdentifier', 'legalName', 'businessContactName', 'email', 'phoneNumber',
  'usTaxpayerIdentificationNumber', 'designatedSelfRegulatoryOrganization', 'designatedExaminingAuthority',
  'mainAddress1', 'mainAddress2', 'mainAddressCity', 'mainAddressState', 'mainAddressPostalCode', 'mainAddressCountryCode',
];

const firmFieldByKey = key => SECTIONS.flatMap(s => s.fields || []).find(x => x.k === key);
const requiredMessage = x => (x.kind === 'select' || x.kind === 'multi' ? `Choose ${x.label.toLowerCase()}.` : `Enter ${x.label.toLowerCase()}.`);

function formCollapseHTML(s) {
  const rows = form.draft[s.collection] || [];
  return `<details class="card form-collapse" data-sec="${s.id}" ${form.open.has(s.id) ? 'open' : ''}>
    <summary>
      <span class="section-title">${esc(s.title)}${tipHTML(s.tip || COLLECTIONS[s.collection].tip)}</span>
      <span class="form-collapse-meta">${rows.length ? `<span>${rows.length}</span>` : ''}${icon('up')}</span>
    </summary>
    <div class="form-collapse-body">
      ${collectionHTML(s.collection, rows, { editable: true })}
    </div>
  </details>`;
}

function formBodyHTML() {
  const f = form.draft;
  if (form.module) return form.module.body();
  if (form.entity) {
    return `<div class="card form-card"><div class="form-grid form-list">${form.entity.fields.map(x => formFieldRow(x, f)).join('')}</div></div>
      ${(form.entity.collections || []).map(formCollapseHTML).join('')}`;
  }
  const rows = FIRM_FORM_ORDER.map(firmFieldByKey).filter(x => visible(x, f)).map(x => formFieldRow(x, f)).join('');
  const clearing = SECTIONS.find(s => s.id === 'clearing');
  const clearingHTML = isParticipant(f)
    ? `<div class="form-subhead"><h2 class="section-title">${esc(clearing.title)}${tipHTML(clearing.tip)}</h2></div>${clearing.fields.map(x => formFieldRow(x, f)).join('')}`
    : '';
  return `<div class="card form-card"><div class="form-grid form-list">${rows}${clearingHTML}</div></div>
    ${SECTIONS.filter(s => s.collection).map(formCollapseHTML).join('')}`;
}

function dockHTML(backHref, saveLabel, extra = '') {
  form.saveLabel = saveLabel;
  return `<div class="dock">
    <div class="dock-acts">
      <button class="btn btn-primary" type="submit" id="saveBtn">${esc(saveLabel)}</button>
      ${extra}
      <a class="btn btn-plain" href="${esc(backHref)}">Cancel</a>
    </div>
    <span class="dock-status" id="dockStatus"></span>
  </div>`;
}

function renderFormShell() {
  const creating = form.mode === 'create';
  const f = form.draft;
  const backHref = creating ? 'firms.html' : editBack(hrefFor(f.id), f.name, 'firms.html', 'Firms').href;
  document.title = `${creating ? 'New Firm' : `Edit ${f.name}`} · EP3 Admin`;
  if (creating) {
    $('#view').innerHTML = `
      <div class="page form-page">
        <a class="crumb" href="${esc(backHref)}">${icon('back')}Firms</a>
        <header class="page-head"><h1 class="large-title" tabindex="-1">${form.presetType ? `New ${esc(TYPES[form.presetType].label)}` : 'New Firm'}</h1></header>
        <form id="firmForm" novalidate>
          <div class="form-stack" id="formBody">${formBodyHTML()}</div>
          ${dockHTML(backHref, 'Create Firm')}
        </form>
      </div>`;
  } else {
    $('#view').innerHTML = `
      <div class="detail-page">
        ${detailHeadHTML(firmById(form.original.id), '', true)}
        <div class="detail-scroll detail-form">
          <form id="firmForm" novalidate>
            <div class="form-stack" id="formBody">${formBodyHTML()}</div>
            ${dockHTML(backHref, 'Save Changes')}
          </form>
        </div>
      </div>`;
  }
  updateDock();
}

function refreshFormBody(refocusSelector) {
  const view = $('.detail-scroll') || $('#view');
  const y = view.scrollTop;
  $('#formBody').innerHTML = formBodyHTML();
  updateDock();
  view.scrollTop = y;
  startSpy();
  enhanceSelects();
  if (refocusSelector) { const el = $(refocusSelector); if (el) el.focus({ preventScroll: true }); }
}

function updateDock() {
  if (!form) return;
  const status = $('#dockStatus');
  const save = $('#saveBtn');
  const creating = form.mode === 'create';
  const errCount = Object.keys(form.errors).length;
  if (form.saving) {
    save.disabled = true;
    save.innerHTML = `<span class="spinner" aria-hidden="true"></span>${creating ? 'Creating…' : 'Saving…'}`;
    status.textContent = '';
    return;
  }
  save.disabled = !creating && !isDirty();
  save.textContent = form.saveLabel;
  status.className = `dock-status ${errCount ? 'bad' : ''}`;
  status.textContent = errCount ? `Fix ${errCount} field${errCount === 1 ? '' : 's'} to continue` : '';
}

function validateFirm(f, mode) {
  const e = {};
  if (mode === 'create' && !f.type) e.type = 'Choose a firm type.';
  if (!String(f.name || '').trim()) e.name = 'Enter a firm name.';
  if (mode === 'create') {
    if (!String(f.id || '').trim()) e.id = 'Enter a firm ID.';
    else if (firmById(f.id.trim())) e.id = 'Another firm already uses this ID. Enter a different one.';
  }
  if (f.email && !validEmail(f.email)) e.email = EMAIL_ERROR;
  return e;
}

function showFieldError(k) {
  const byId = suffix => document.getElementById(`firm-${k}${suffix}`);
  const row = document.getElementById(`row-firm-${k}`);
  const input = byId('');
  if (!row || !input) return;
  const err = form.errors[k];
  const existing = byId('-err');
  if (existing) existing.remove();
  if (err) {
    input.setAttribute('aria-invalid', 'true');
    input.insertAdjacentHTML('afterend', `<div class="row-err" id="firm-${k}-err">${icon('warn')}<span>${esc(err)}</span></div>`);
    const help = byId('-help');
    input.setAttribute('aria-describedby', [`firm-${k}-err`, help ? `firm-${k}-help` : ''].filter(Boolean).join(' '));
  } else {
    input.removeAttribute('aria-invalid');
    const help = byId('-help');
    if (help) input.setAttribute('aria-describedby', `firm-${k}-help`); else input.removeAttribute('aria-describedby');
  }
}

const validateForm = () => {
  if (form.module) return form.module.validate();
  return form.entity ? validateEntity() : validateFirm(form.draft, form.mode);
};

async function submitFirm() {
  if (form.saving) return;
  if (form.module) { form.module.submit(); return; }
  if (form.entity) { submitEntity(); return; }
  const creating = form.mode === 'create';
  if (!creating && !isDirty()) return;
  const f = form.draft;
  if (typeof f.name === 'string') f.name = f.name.trim();
  if (creating) f.id = String(f.id || '').trim();
  form.errors = validateFirm(f, form.mode);
  if (Object.keys(form.errors).length) {
    refreshFormBody();
    const first = Object.keys(form.errors)[0];
    const el = $(`#firm-${first}`);
    if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
    return;
  }
  form.saving = true;
  updateDock();
  await wait(450);
  const saved = clone(f);
  const previous = creating ? null : firmById(form.original.id);
  if (creating) firms.unshift(saved);
  else firms[firms.indexOf(previous)] = saved;
  persist();
  form = null;
  go(hrefFor(saved.id));
  toast(creating ? `Created ${saved.name}.` : `Saved changes to ${saved.name}.`);
}

function collectionTarget() {
  if (form) return form.draft;
  return pageRecord || firmById(currentDetailId());
}

function sheetFieldHTML(x, values, errors) {
  if (x.kind === 'head') return subheadHTML(x);
  if (x.kind === 'multi') return multiRowHTML(x, values, 'rec');
  return fieldRow(x, values, errors, 'rec');
}

function openFormSheet({ title, submit, note, fields, values, validate, onSubmit, repaintOn = [], sync, extra }) {
  const d = $('#sheet');
  let errors = {};
  const opener = document.activeElement;
  const fieldList = () => (typeof fields === 'function' ? fields(values) : fields).filter(x => visible(x, values));

  const paint = () => {
    d.classList.remove('sheet-wide');
    d.innerHTML = `<form class="sheet-form" novalidate>
      <div class="sheet-head">
        <h2 id="sheetTitle">${esc(title)}</h2>
        <div class="dock-acts">
          <button class="btn btn-plain" type="button" data-sheet-cancel>Cancel</button>
          <button class="btn btn-primary" type="submit" data-sheet-submit>${esc(submit)}</button>
        </div>
      </div>
      <div class="sheet-body">
        ${note ? `<p class="sheet-note">${esc(note)}</p>` : ''}
        <div class="card">${fieldList().map(x => sheetFieldHTML(x, values, errors)).join('')}</div>
        ${extra ? extra(values) : ''}
      </div>
    </form>`;
    $('[data-sheet-cancel]', d).addEventListener('click', () => d.close());
    $('.sheet-form', d).addEventListener('submit', onFormSubmit);
    const applyLocks = () => {
      fieldList().forEach(x => {
        const el = x.lockedBy && document.getElementById(`rec-${x.k}`);
        if (el) el.disabled = !!values[x.lockedBy];
      });
      if (sync) sync(values, d);
    };
    $$('[data-multi]', d).forEach(box => box.addEventListener('change', () => {
      const current = values[box.dataset.multi] || [];
      values[box.dataset.multi] = box.checked ? [...current, box.value] : current.filter(v => v !== box.value);
    }));
    $$('[data-field]', d).forEach(inp => {
      const update = () => { values[inp.dataset.field] = inp.type === 'checkbox' ? inp.checked : inp.value; applyLocks(); };
      inp.addEventListener('input', update);
      inp.addEventListener('change', () => {
        update();
        if (repaintOn.includes(inp.dataset.field)) {
          paint();
          const again = document.getElementById(`rec-${inp.dataset.field}`);
          if (again) again.focus();
        }
      });
    });
    applyLocks();
  };

  const onFormSubmit = e => {
    e.preventDefault();
    errors = {};
    fieldList().forEach(x => {
      const v = values[x.k];
      if (x.req && !String(v ?? '').trim()) errors[x.k] = requiredMessage(x);
      if (x.inputType === 'email' && v && !validEmail(v)) errors[x.k] = EMAIL_ERROR;
      if (x.inputType === 'number' && v !== '' && v !== undefined && !(Number(v) >= 0)) errors[x.k] = `${x.label} must be 0 or more.`;
    });
    if (!Object.keys(errors).length && validate) errors = validate(values);
    if (Object.keys(errors).length) {
      paint();
      const first = document.getElementById(`rec-${Object.keys(errors)[0]}`);
      if (first) first.focus();
      return;
    }
    d.close();
    onSubmit(values);
  };

  paint();
  d.showModal();
  const firstField = $('[data-field]', d);
  if (firstField) firstField.focus();
  d.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus({ preventScroll: true }); }, { once: true });
  return { paint };
}

function openRecordSheet(key, index) {
  const c = COLLECTIONS[key];
  const owner = collectionTarget();
  const rows = owner[key] || (owner[key] = []);
  const editing = index !== null;
  openFormSheet({
    title: editing ? `Edit ${c.one}` : `Add ${c.one}`,
    submit: editing ? 'Save' : 'Add',
    note: c.note,
    fields: c.fields,
    values: editing ? clone(rows[index]) : Object.fromEntries(c.fields.filter(x => x.def !== undefined).map(x => [x.k, x.def])),
    validate: c.validate,
    onSubmit: values => {
      if (editing) rows[index] = values; else rows.push(values);
      if (c.afterSave) c.afterSave(rows, values);
      if (form) {
        refreshFormBody(`[data-act="rec-add"][data-col="${key}"]`);
        return;
      }
      persist();
      route();
      const add = $(`[data-act="rec-add"][data-col="${key}"]`);
      if (add) add.focus({ preventScroll: true });
      toast(editing ? `Saved ${recordLabel(c, values)}.` : `Added ${recordLabel(c, values)}.`);
    },
  });
}

async function removeRecord(key, index) {
  const c = COLLECTIONS[key];
  const owner = collectionTarget();
  const rows = owner[key];
  const rec = rows[index];
  const label = recordLabel(c, rec);
  if (form) {
    rows.splice(index, 1);
    refreshFormBody(`[data-act="rec-add"][data-col="${key}"]`);
    return;
  }
  const ok = await ask({ title: `Remove ${label}?`, text: `This removes it from ${owner.name || owner.displayName}.`, confirm: 'Remove', danger: true, glyph: 'trash' });
  if (!ok) return;
  rows.splice(index, 1);
  persist();
  route();
  toast(`Removed ${label}.`);
}
