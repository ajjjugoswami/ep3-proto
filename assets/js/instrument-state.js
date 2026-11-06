'use strict';

let stateSheet = null;

function allowedStates(rows) {
  const allPending = rows.every(r => r.state === 'Pending');
  return INST_STATES.filter(s => s !== 'Pending' || allPending);
}

const stateFields = rows => v => [
  { k: 'selState', label: 'State', kind: 'select', options: allowedStates(rows), blank: 'Choose a state', req: !v.isScheduled, disabled: !!v.isScheduled },
  { k: 'isScheduled', label: 'Follow Instrument Trading Hours', kind: 'toggle' },
  { k: 'scheduleExecutionTime', label: 'Schedule Execution Time', inputType: 'datetime-local', help: 'Leave empty to change the state now.' },
];

function resolutionFieldsHTML(rows, v) {
  const hasSubTypes = (rows[0].subTypes || []).length > 0;
  const row = x => fieldRow(x, v, stateSheet.errors, 'rec');
  return `${hasSubTypes
    ? row({ k: 'symbolSubType', label: 'Winning Symbol Sub Type', kind: 'select', options: rows[0].subTypes.map(t => t.symbol), blank: 'Choose a sub type' })
    : row({ k: 'side', label: 'Winning Side', kind: 'select', options: RESOLUTION_SIDES, blank: 'Choose a side' })}
    ${row({ k: 'resolutionPrice', label: 'Resolution Price', tip: TIPS.resolutionPrice, disabled: !hasSubTypes && v.side !== 'Dual' })}
    ${row({ k: 'outcomeResult', label: 'Resolution Outcome Result', tip: TIPS.outcomeResult })}`;
}

function stateExtraHTML(rows, v) {
  const isEvent = rows.every(r => r.type === IT.EVENT);
  return `<div class="sheet-extra card-acts">
      <button class="btn btn-gray" type="button" data-act="state-eod">Perform EOD Actions</button>
    </div>
    ${NETTING_ENABLED && isEvent ? `<div class="sheet-extra">
      <h3 class="section-title">Resolution</h3>
      <div class="card">${resolutionFieldsHTML(rows, v)}</div>
      <div class="card-acts">
        <button class="btn btn-tint" type="button" data-act="state-resolve">Perform Resolution</button>
        <button class="btn btn-gray" type="button" data-act="state-undo-resolve">Undo Resolution</button>
      </div>
    </div>` : ''}`;
}

function finishStateChange(message) {
  saveMarket();
  instSelected.clear();
  if (PAGE === 'instruments') refreshInstruments();
  else route();
  toast(message);
}

function saveInstrumentState(rows, v) {
  const future = v.scheduleExecutionTime && new Date(v.scheduleExecutionTime) > new Date();
  rows.forEach(r => {
    r.isScheduled = !!v.isScheduled;
    if (future) r.scheduledChange = { state: v.isScheduled ? stateFromSchedule(r) : v.selState, at: v.scheduleExecutionTime };
    else {
      r.state = v.isScheduled ? stateFromSchedule(r) : v.selState;
      delete r.scheduledChange;
    }
  });
  finishStateChange(future ? 'State change scheduled.' : 'Instrument state saved.');
}

function openStateSheet(ids) {
  const rows = ids.map(instrumentById).filter(Boolean);
  if (!rows.length) return;
  const single = rows.length === 1 ? rows[0] : null;
  const values = {
    selState: single ? single.state : '', isScheduled: single ? !!single.isScheduled : false, scheduleExecutionTime: '',
    symbolSubType: '', side: '', resolutionPrice: '', outcomeResult: '',
  };
  stateSheet = { rows, values, errors: {}, sheet: null };
  stateSheet.sheet = openFormSheet({
    title: single ? 'Change State' : `Change State for ${rows.length} Instruments`,
    submit: 'Save',
    note: `${single ? 'Instrument' : 'Instruments'}: ${rows.map(r => r.id).join(', ')}`,
    fields: stateFields(rows),
    values,
    repaintOn: ['isScheduled', 'side'],
    extra: v => stateExtraHTML(rows, v),
    onSubmit: v => saveInstrumentState(rows, v),
  });
}

async function performEodActions() {
  const { rows } = stateSheet;
  const ok = await ask({ title: 'Perform EOD actions?', text: `This runs end of day actions for ${rows.length === 1 ? rows[0].id : `${rows.length} instruments`}.`, confirm: 'Confirm', glyph: 'play' });
  if (!ok) return;
  $('#sheet').close();
  finishStateChange('EOD actions submitted.');
}

async function performResolution() {
  const { rows, values: v } = stateSheet;
  const hasSubTypes = (rows[0].subTypes || []).length > 0;
  stateSheet.errors = {};
  if (v.resolutionPrice && !Number.isFinite(Number(v.resolutionPrice))) stateSheet.errors.resolutionPrice = 'Please enter a valid Resolution Price.';
  else if (hasSubTypes && !v.symbolSubType) stateSheet.errors.symbolSubType = 'Please select Winning Symbol Sub Type.';
  else if (!hasSubTypes && !v.side) stateSheet.errors.side = 'Please select Winning Side.';
  const failed = Object.keys(stateSheet.errors)[0];
  if (failed) {
    stateSheet.sheet.paint();
    document.getElementById(`rec-${failed}`).focus();
    return;
  }
  stateSheet.sheet.paint();
  const ok = await ask({ title: 'Perform resolution?', text: 'This performs resolution for all selected instruments.', confirm: 'Perform Resolution', glyph: 'check' });
  if (!ok) return;
  rows.forEach(r => { r.resolution = { winner: v.symbolSubType || v.side, price: v.resolutionPrice, outcomeResult: v.outcomeResult }; });
  $('#sheet').close();
  finishStateChange('Perform resolution completed successfully.');
}

async function undoResolution() {
  const { rows } = stateSheet;
  const ok = await ask({ title: 'Undo resolution?', text: 'This undoes resolution for all selected instruments.', confirm: 'Undo Resolution', danger: true, glyph: 'restore' });
  if (!ok) return;
  rows.forEach(r => { delete r.resolution; });
  $('#sheet').close();
  finishStateChange('Undo resolution completed successfully.');
}
