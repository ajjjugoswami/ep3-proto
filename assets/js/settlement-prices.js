'use strict';

function csvField(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportInstruments() {
  const header = ['Product Name', 'ID (Symbol)', 'Description', 'Type', 'Tradable', 'Clearing House', 'Scheduled', 'State', 'Open', 'High', 'Low', 'Close', 'Last-Px', 'Settl-Px'];
  const rows = filteredInstruments().map(i => {
    const s = i.stats || {};
    return [i.productId, i.id, i.description, i.type, i.nonTradable ? 'N' : 'Y', i.clearingHouse, i.isScheduled ? 'Scheduled' : 'Manual', i.state, s.open, s.high, s.low, s.close, s.lastPrice, s.settlementPrice];
  });
  downloadText('instruments.csv', [header, ...rows].map(r => r.map(csvField).join(',')).join('\n'));
  toast(`Exported ${rows.length} instrument${rows.length === 1 ? '' : 's'}.`);
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  const [head = [], ...body] = rows;
  const keys = head.map(h => h.trim());
  return body.map(values => Object.fromEntries(keys.map((k, i) => [k, (values[i] ?? '').trim()])));
}

function settlementRowErrors(rows) {
  const errors = [];
  rows.forEach((row, index) => {
    if (!row.product_name || !row.instrument_id || !row.settlement_price) errors.push(`Row ${index + 1}: required fields are missing.`);
    else if (!Number.isFinite(Number(row.settlement_price))) errors.push(`Row ${index + 1}: settlement price for ${row.instrument_id} must be a number.`);
  });
  return errors;
}

const settlementStatusHTML = status => (status === 'Success' || status === 'Approved'
  ? esc(status)
  : `<span class="text-bad" title="${esc(status)}">${esc(status)}</span>`);

function handleSettlementFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCSV(String(reader.result));
    if (!rows.length) { toast('That file has no settlement prices.', { info: true }); return; }
    const errors = settlementRowErrors(rows);
    if (errors.length) { toast(errors[0], { info: true }); return; }
    openImportSheet(rows.map(r => ({ ...r, status: 'Pending' })));
  };
  reader.readAsText(file);
}

function openImportSheet(rows) {
  let applied = false;
  openWideSheet({
    title: 'Import Settlement Prices',
    primary: () => (applied ? '' : 'Apply Prices'),
    onClose: () => { if (applied) refreshInstruments(); },
    body: () => `<div class="card table-scroll"><table class="tbl tbl-wide">
      <thead><tr><th>Product Name</th><th>Instrument ID</th><th>Expiration Date</th><th class="num">Settlement Price</th><th>Trading Date</th><th>Status</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(r.product_name)}</td><td class="mono">${esc(r.instrument_id)}</td><td>${esc(r.expiration_date)}</td><td class="num">${esc(r.settlement_price)}</td><td>${esc(r.trading_date)}</td><td>${settlementStatusHTML(r.status)}</td></tr>`).join('')}</tbody>
    </table></div>`,
    onPrimary: paint => {
      let done = 0;
      rows.forEach(r => {
        const inst = instrumentById(r.instrument_id);
        if (!inst) { r.status = 'Instrument not found'; return; }
        if (!validScale(r.settlement_price, inst.minimumPriceIncrement)) { r.status = 'Price scale is not valid'; return; }
        inst.stats = { ...inst.stats, settlementPrice: r.settlement_price, settlementSetTime: isoDateTime(new Date()), settlementPreliminary: true };
        r.status = 'Success';
        done += 1;
      });
      saveMarket();
      applied = true;
      paint();
      toast(`Imported ${done} of ${rows.length} settlement price${rows.length === 1 ? '' : 's'}.`);
    },
  });
}

function openApproveSheet() {
  const rows = market.instruments.filter(i => (i.stats || {}).settlementPreliminary).map(i => ({ inst: i, selected: false, status: 'Pending' }));
  if (!rows.length) {
    toast('No instruments found for approval.', { info: true });
    return;
  }
  openWideSheet({
    title: 'Approve Settlement Prices',
    primary: 'Approve Prices',
    onClose: () => refreshInstruments(),
    body: () => {
      const pending = rows.filter(r => r.status === 'Pending');
      const allOn = pending.length > 0 && pending.every(r => r.selected);
      return `<div class="card table-scroll"><table class="tbl tbl-wide">
        <thead><tr><th class="check-cell"><input type="checkbox" data-approve-all ${allOn ? 'checked' : ''} aria-label="Select all"></th><th>Product Name</th><th>Instrument ID</th><th>Expiration Date</th><th class="num">Settlement Price</th><th>Settlement Set Time</th><th>Status</th></tr></thead>
        <tbody>${rows.map((r, n) => `<tr>
          <td class="check-cell"><input type="checkbox" data-approve="${n}" ${r.selected ? 'checked' : ''} ${r.status === 'Approved' ? 'disabled' : ''} aria-label="Select ${esc(r.inst.id)}"></td>
          <td>${esc(r.inst.productId)}</td><td class="mono">${esc(r.inst.id)}</td><td>${esc(showDateTime(r.inst.expirationDate))}</td>
          <td class="num">${esc(px(r.inst, r.inst.stats.settlementPrice))}</td><td>${esc(showDateTime(r.inst.stats.settlementSetTime))}</td><td>${settlementStatusHTML(r.status)}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
    },
    onPaint: (d, paint) => {
      const all = $('[data-approve-all]', d);
      all.addEventListener('change', () => {
        rows.forEach(r => { if (r.status === 'Pending') r.selected = all.checked; });
        paint();
      });
      $$('[data-approve]', d).forEach(box => box.addEventListener('change', () => {
        rows[Number(box.dataset.approve)].selected = box.checked;
        paint();
      }));
    },
    onPrimary: paint => {
      const chosen = rows.filter(r => r.selected && r.status === 'Pending');
      if (!chosen.length) {
        toast('No settlement prices selected for approval.', { info: true });
        return;
      }
      chosen.forEach(r => {
        r.inst.stats.settlementPreliminary = false;
        r.status = 'Approved';
        r.selected = false;
      });
      saveMarket();
      paint();
      toast(`Approved ${chosen.length} settlement price${chosen.length === 1 ? '' : 's'}.`);
    },
  });
}
