'use strict';

function selectedStateIds() {
  const raw = param('ids');
  if (raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return param('id') ? [param('id')] : [];
}

function renderStatePage() {
  const ids = selectedStateIds();
  const rows = ids.map(instrumentById);
  if (!ids.length || rows.some(r => !r)) {
    marketNotFound('Instrument not found', ids.join(', '), 'instruments.html', 'Instruments');
    return;
  }
  const single = param('id') ? rows[0] : null;
  const title = single ? 'Edit Instrument State' : 'Edit Multiple Instrument State';
  document.title = `${title} · EP3 Admin`;
  const draft = {
    ids: ids.join(', '), selState: single ? single.state : '', isScheduled: single ? !!single.isScheduled : false, scheduleExecutionTime: '',
    symbolSubType: '', side: '', resolutionPrice: '', outcomeResult: '',
  };
  startMarketForm({
    mode: 'edit',
    draft,
    validate: () => validateStateForm(rows),
    submit: () => submitStateForm(rows),
    onChange: k => { if (k === 'isScheduled' || k === 'side') refreshFormBody(`#firm-${k}`); },
    crumb: single ? { href: instHref(single.id), label: single.id } : { href: 'instruments.html', label: 'Instruments' },
    title,
    backHref: single ? instHref(single.id) : 'instruments.html',
    saveLabel: 'Save Instrument State',
    extra: `<button class="btn btn-gray" type="button" data-act="state-eod">Perform EOD Actions</button>`,
  });
  form.module.body = () => stateFormBody(rows);
  refreshFormBody();
}

function allowedStates(rows) {
  const allPending = rows.every(r => r.state === 'Pending');
  return INST_STATES.filter(s => s !== 'Pending' || allPending);
}

function stateFormBody(rows) {
  const v = form.draft;
  const hasSubTypes = (rows[0].subTypes || []).length > 0;
  const isEvent = rows.every(r => r.type === IT.EVENT);
  return `<div class="card form-card"><div class="form-grid form-list">
      ${readRow({ k: 'ids', label: rows.length > 1 ? 'Instrument IDs (Symbol)' : 'Instrument ID (Symbol)', mono: true }, v)}
      ${fieldRow({ k: 'selState', label: 'State', kind: 'select', options: allowedStates(rows), blank: 'Choose a state', req: !v.isScheduled, disabled: !!v.isScheduled }, v, form.errors, 'firm')}
      ${fieldRow({ k: 'isScheduled', label: 'Follow Instrument Trading Hours', kind: 'toggle' }, v, form.errors, 'firm')}
      ${fieldRow({ k: 'scheduleExecutionTime', label: 'Schedule Execution Time', inputType: 'datetime-local', help: 'Leave empty to change the state now.' }, v, form.errors, 'firm')}
    </div></div>
    ${NETTING_ENABLED && isEvent ? `<div class="card form-card">
      <h2 class="section-title card-title">Resolution</h2>
      <div class="form-grid form-list">
        ${hasSubTypes
          ? fieldRow({ k: 'symbolSubType', label: 'Winning Symbol Sub Type', kind: 'select', options: rows[0].subTypes.map(t => t.symbol), blank: 'Choose a sub type' }, v, form.errors, 'firm')
          : fieldRow({ k: 'side', label: 'Winning Side', kind: 'select', options: RESOLUTION_SIDES, blank: 'Choose a side' }, v, form.errors, 'firm')}
        ${fieldRow({ k: 'resolutionPrice', label: 'Resolution Price', tip: TIPS.resolutionPrice, disabled: !hasSubTypes && v.side !== 'Dual' }, v, form.errors, 'firm')}
        ${fieldRow({ k: 'outcomeResult', label: 'Resolution Outcome Result', tip: TIPS.outcomeResult }, v, form.errors, 'firm')}
      </div>
      <div class="card-acts">
        <button class="btn btn-tint" type="button" data-act="state-resolve">Perform Resolution</button>
        <button class="btn btn-gray" type="button" data-act="state-undo-resolve">Undo Resolution</button>
      </div>
    </div>` : ''}`;
}

function validateStateForm() {
  const v = form.draft;
  const e = {};
  if (!v.isScheduled && !v.selState) e.selState = 'Choose a state.';
  return e;
}

async function submitStateForm(rows) {
  const v = form.draft;
  form.errors = validateStateForm();
  if (Object.keys(form.errors).length) {
    refreshFormBody();
    updateDock();
    return;
  }
  const ok = await ask({ title: `Update ${rows.length === 1 ? 'the state' : 'all states'}?`, text: rows.length === 1 ? `This updates the state of ${rows[0].id}.` : `This updates the state of ${rows.length} instruments.`, confirm: 'Update State', glyph: 'warn' });
  if (!ok) return;
  const future = v.scheduleExecutionTime && new Date(v.scheduleExecutionTime) > new Date();
  rows.forEach(r => {
    r.isScheduled = !!v.isScheduled;
    if (future) r.scheduledChange = { state: v.isScheduled ? stateFromSchedule(r) : v.selState, at: v.scheduleExecutionTime };
    else {
      r.state = v.isScheduled ? stateFromSchedule(r) : v.selState;
      delete r.scheduledChange;
    }
  });
  saveMarket();
  form = null;
  go('instruments.html');
  toast(future ? 'State change scheduled.' : 'Instrument state saved.');
}

async function performEodActions() {
  const rows = selectedStateIds().map(instrumentById);
  const ok = await ask({ title: 'Perform EOD actions?', text: `This runs end of day actions for ${rows.length === 1 ? rows[0].id : `${rows.length} instruments`}.`, confirm: 'Perform EOD Actions', glyph: 'play' });
  if (!ok) return;
  form = null;
  go('instruments.html');
  toast('EOD actions submitted.');
}

async function performResolution() {
  const rows = selectedStateIds().map(instrumentById);
  const v = form.draft;
  const hasSubTypes = (rows[0].subTypes || []).length > 0;
  form.errors = {};
  if (v.resolutionPrice && !Number.isFinite(Number(v.resolutionPrice))) form.errors.resolutionPrice = 'Please enter a valid Resolution Price.';
  else if (hasSubTypes && !v.symbolSubType) form.errors.symbolSubType = 'Please select Winning Symbol Sub Type.';
  else if (!hasSubTypes && !v.side) form.errors.side = 'Please select Winning Side.';
  if (Object.keys(form.errors).length) {
    refreshFormBody();
    updateDock();
    return;
  }
  const ok = await ask({ title: 'Perform resolution?', text: 'This performs resolution for all selected instruments.', confirm: 'Perform Resolution', glyph: 'check' });
  if (!ok) return;
  rows.forEach(r => { r.resolution = { winner: v.symbolSubType || v.side, price: v.resolutionPrice, outcomeResult: v.outcomeResult }; });
  saveMarket();
  form = null;
  go('instruments.html');
  toast('Perform resolution completed successfully.');
}

async function undoResolution() {
  const rows = selectedStateIds().map(instrumentById);
  const ok = await ask({ title: 'Undo resolution?', text: 'This undoes resolution for all selected instruments.', confirm: 'Undo Resolution', danger: true, glyph: 'restore' });
  if (!ok) return;
  rows.forEach(r => { delete r.resolution; });
  saveMarket();
  form = null;
  go('instruments.html');
  toast('Undo resolution completed successfully.');
}
