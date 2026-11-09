'use strict';

const money = v => (isEmpty(v) && v !== 0 ? '' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const qty = v => (isEmpty(v) && v !== 0 ? '' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 8 }));
const nowStamp = () => isoDateTime(new Date());
const todayStamp = () => isoDate(new Date());
const refId = prefix => `${prefix}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
const nonZero = v => Number.isFinite(Number(v)) && Number(v) !== 0 && String(v).trim() !== '';
const isNumber = v => String(v ?? '').trim() !== '' && Number.isFinite(Number(v));
const daysAgo = (n, hour = 9) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(hour, (n * 17) % 60, 0, 0); return d; };

function cellOf(kind, v) {
  if (kind === 'money') return money(v) || '—';
  if (kind === 'num') return isEmpty(v) && v !== 0 ? '—' : esc(qty(v));
  if (kind === 'when') return v ? esc(formatWhen(v)) : '—';
  if (isEmpty(v)) return '<span class="row-value unset">—</span>';
  return kind === 'mono' ? `<span class="mono">${esc(v)}</span>` : esc(v);
}

const numClass = kind => (['money', 'num'].includes(kind) ? 'num' : '');

const accountPositions = (f, a) => (f.positions || []).filter(p => p.account === a.id);

function balancesOf(a) {
  if (a.balances) return a.balances;
  const h = hashText(a.id);
  a.balances = ['USD', ...(h % 2 ? ['USDC'] : [])].map((currency, i) => {
    const balance = 50000 + ((h >> (i * 3)) % 950) * 1000;
    return { currency, balance, capitalRequirement: Math.round(balance * 0.2), openOrders: Math.round(balance * 0.05), marginRequirement: Math.round(balance * 0.12), unsettledFunds: (h % 7) * 250, alternateCurrency: '' };
  });
  return a.balances;
}

function withdrawalsOf(a) {
  if (!a.withdrawals) {
    const h = hashText(a.id);
    a.withdrawals = h % 3 ? [] : [{ id: refId('WD'), time: isoDateTime(daysAgo(1, 14)), currency: 'USD', amount: 2500 + (h % 9) * 500, description: 'Monthly withdrawal to settlement bank', correlationId: `corr-${(h % 9000) + 1000}` }];
  }
  return a.withdrawals;
}

function creditsOf(a) {
  if (!a.pendingCredits) {
    const h = hashText(a.id);
    a.pendingCredits = h % 4 === 1 ? [{ id: refId('PC'), time: isoDateTime(daysAgo(0, 8)), currency: 'USD', amount: 1000 + (h % 5) * 250, description: 'Incoming wire', acknowledged: false }] : [];
  }
  return a.pendingCredits;
}

const balanceRow = (a, currency) => balancesOf(a).find(b => b.currency === currency);
const buyingPower = b => b.balance - b.marginRequirement - b.openOrders;
const excessCapital = b => b.balance - b.capitalRequirement;

function balanceLedgerOf(a) {
  if (a.balanceLedger) return a.balanceLedger;
  const entries = [];
  balancesOf(a).forEach(b => {
    let after = b.balance;
    const events = ['Commission collected', 'Trade settlement', 'Wire deposit', 'Trade settlement', 'Variation margin'];
    events.forEach((description, i) => {
      const change = ((hashText(`${a.id}${b.currency}${i}`) % 4000) - 1500);
      const before = after - change;
      const day = i * 2 + 1;
      entries.push({ time: isoDateTime(daysAgo(day, 10 + i)), businessDate: isoDate(daysAgo(day)), currency: b.currency, description, symbol: description === 'Trade settlement' ? SAMPLE_SYMBOLS[i % SAMPLE_SYMBOLS.length] : '', balanceBefore: before, balanceAfter: after, capitalBefore: b.capitalRequirement, capitalAfter: b.capitalRequirement, excessBefore: before - b.capitalRequirement, excessAfter: after - b.capitalRequirement });
      after = before;
    });
  });
  a.balanceLedger = entries.sort((x, y) => y.time.localeCompare(x.time));
  return a.balanceLedger;
}

function positionLedgerOf(f, a) {
  if (a.positionLedger) return a.positionLedger;
  a.positionLedger = accountPositions(f, a).flatMap((p, i) => {
    const h = hashText(`${a.id}${p.symbol}`);
    return [
      { time: isoDateTime(daysAgo(1, 11 + i)), tradeDate: isoDate(daysAgo(1)), description: 'Fill', symbol: p.symbol, subType: p.subType, entryType: 'Trade', before: p.open - p.bought, after: p.open, tradeId: `T${100000 + h % 900000}`, referenceId: '', allocationGroupId: '', transferReferenceTradeIds: '' },
      { time: isoDateTime(daysAgo(3, 15)), tradeDate: isoDate(daysAgo(3)), description: 'Beginning of day roll', symbol: p.symbol, subType: p.subType, entryType: 'Roll', before: p.bod, after: p.bod, tradeId: '', referenceId: `R${200000 + h % 800000}`, allocationGroupId: '', transferReferenceTradeIds: '' },
    ];
  }).sort((x, y) => y.time.localeCompare(x.time));
  return a.positionLedger;
}

function recordBalanceChange(a, b, description, apply) {
  const before = { balance: b.balance, capital: b.capitalRequirement };
  apply(b);
  balanceLedgerOf(a).unshift({
    time: nowStamp(), businessDate: todayStamp(), currency: b.currency, description, symbol: '',
    balanceBefore: before.balance, balanceAfter: b.balance, capitalBefore: before.capital, capitalAfter: b.capitalRequirement,
    excessBefore: before.balance - before.capital, excessAfter: excessCapital(b),
  });
}

function changePosition(f, a, symbol, delta, entry) {
  let p = accountPositions(f, a).find(x => x.symbol === symbol);
  if (!p) {
    p = { account: a.id, symbol, subType: '', bod: 0, open: 0, bought: 0, sold: 0, unsettled: 0 };
    (f.positions || (f.positions = [])).push(p);
  }
  const before = Number(p.open) || 0;
  p.open = before + delta;
  positionLedgerOf(f, a).unshift({ time: nowStamp(), tradeDate: todayStamp(), symbol, subType: p.subType, before, after: p.open, tradeId: '', referenceId: refId('ADJ'), allocationGroupId: '', transferReferenceTradeIds: '', ...entry });
}

function positionsTabHTML(f, a) {
  const asOf = param('asOf') || '';
  const live = !asOf && !accountLocked(f, a);
  const rows = accountPositions(f, a).map(p => (asOf ? { ...p, open: p.bod, bought: 0, sold: 0, unsettled: '' } : p));
  return `<div class="filters">
      <label class="filter-field"><span>As Of Date/Time</span><input class="field" type="datetime-local" id="acctAsOf" value="${esc(asOf)}"></label>
      ${asOf ? '<button class="btn btn-gray" type="button" data-act="acct-asof-clear">Clear</button>' : ''}
      <div class="push head-acts">
        <button class="btn btn-gray" type="button" data-act="acct-positions-export" ${rows.length ? '' : 'disabled'}>${icon('download')}Export Data</button>
        ${live ? `<button class="btn btn-primary" type="button" data-act="acct-position-adjust">${icon('plus')}Adjust Position</button>` : ''}
      </div>
    </div>
    ${asOf ? `<div class="banner info">${icon('clock')}<span>Showing positions as of ${esc(formatWhen(asOf))}. Historical positions can’t be changed.</span></div>` : ''}
    ${rows.length ? `<div class="card table-scroll"><table class="tbl tbl-wide">
      <thead><tr>${POSITION_COLUMNS.map(([, label, num]) => `<th class="${num ? 'num' : ''}">${esc(label)}</th>`).join('')}${live ? '<th class="acts">Actions</th>' : ''}</tr></thead>
      <tbody>${rows.map(p => `<tr>
        ${POSITION_COLUMNS.map(([k, , num]) => `<td class="${num ? 'num' : ''}">${num ? cellOf('num', p[k]) : cellOf(k === 'symbol' ? 'mono' : '', p[k])}</td>`).join('')}
        ${live ? `<td class="acts">
          <button class="icon-btn" type="button" data-act="acct-position-adjust" data-symbol="${esc(p.symbol)}" aria-label="Adjust ${esc(p.symbol)}" title="Adjust Position">${icon('edit')}</button>
          <button class="icon-btn" type="button" data-act="acct-position-transfer" data-symbol="${esc(p.symbol)}" aria-label="Transfer ${esc(p.symbol)}" title="Transfer Position">${icon('arrow')}</button>
        </td>` : ''}
      </tr>`).join('')}</tbody>
    </table></div>` : '<div class="card empty"><h3>No positions</h3><p>This account has no open positions.</p></div>'}
    <datalist id="acctSymbols">${market.instruments.map(i => `<option value="${esc(i.id)}"></option>`).join('')}</datalist>`;
}

function exportPositions(f, a) {
  const header = ['Account', ...POSITION_COLUMNS.map(([, label]) => label)];
  const rows = accountPositions(f, a).map(p => [a.displayName, ...POSITION_COLUMNS.map(([k]) => p[k])]);
  downloadText(`${a.id}-positions.csv`, [header, ...rows].map(r => r.map(csvField).join(',')).join('\n'));
  toast('Exported positions.');
}

function openAdjustPosition(f, a, symbol) {
  openFormSheet({
    title: 'Adjust Position',
    submit: 'Adjust',
    note: `Changes the open positions of ${a.displayName} for one symbol.`,
    fields: [
      { k: 'symbol', label: 'Symbol', req: true, mono: true, list: 'acctSymbols', ph: 'Enter symbol' },
      { k: 'change', label: 'Change to Open Positions', req: true, tip: TIPS.positionChange, ph: '-10' },
      { k: 'description', label: 'Description of Change', kind: 'textarea', req: true, tip: TIPS.ledgerDescription },
    ],
    values: { symbol: symbol || '', change: '', description: '' },
    validate: v => {
      if (!instrumentById(String(v.symbol).trim())) return { symbol: 'No instrument has this symbol.' };
      if (!nonZero(v.change)) return { change: 'Enter a change other than 0, such as 10 or -10.' };
      return {};
    },
    onSubmit: v => {
      changePosition(f, a, String(v.symbol).trim(), Number(v.change), { description: v.description, entryType: 'Adjustment' });
      persist();
      route();
      toast('Position adjusted.');
    },
  });
}

const transferNeedsAllocation = v => v.transferReason !== TRANSFER_REASONS[0];
const participantFirmOptions = () => firms.filter(x => !x.deleted && x.type === 'participant' && liveRows('accounts', x).length).map(x => ({ value: x.id, label: x.name }));

function openTransferPosition(f, a, symbol) {
  openFormSheet({
    title: `Transfer ${symbol}`,
    submit: 'Transfer',
    note: `Moves part of the ${symbol} position in ${a.displayName} to another account.`,
    repaintOn: ['transferReason', 'toFirm'],
    fields: v => [
      { k: 'transferReason', label: 'Transfer Reason', kind: 'select', options: TRANSFER_REASONS, tip: TIPS.transferReason },
      { k: 'allocationGroupId', label: 'Allocation Group ID', mono: true, req: true, tip: TIPS.allocationGroupId, when: transferNeedsAllocation },
      { k: 'referenceTradeIds', label: 'Reference Trade IDs', mono: true, req: true, tip: TIPS.referenceTradeIds, ph: 'T100001, T100002', when: transferNeedsAllocation },
      { k: 'quantity', label: 'Quantity', req: true, tip: TIPS.transferQty, ph: '10' },
      { k: 'price', label: 'Price', req: true },
      { k: 'toFirm', label: 'Destination Firm', kind: 'select', options: participantFirmOptions(), blank: 'Choose a firm', req: true },
      { k: 'toAccount', label: 'Destination Account', kind: 'select', options: v.toFirm ? liveRows('accounts', firmById(v.toFirm)).filter(x => !(v.toFirm === f.id && x.id === a.id)).map(x => ({ value: x.id, label: x.displayName })) : [], blank: v.toFirm ? 'Choose an account' : 'Choose a firm first', req: true, disabled: !v.toFirm },
      { k: 'description', label: 'Description of Change', kind: 'textarea', req: true, tip: TIPS.ledgerDescription },
    ],
    values: { transferReason: TRANSFER_REASONS[0], quantity: '', price: '', toFirm: '', toAccount: '', description: '' },
    validate: v => {
      if (!nonZero(v.quantity)) return { quantity: 'Enter a quantity other than 0.' };
      if (!nonZero(v.price)) return { price: 'Enter a price other than 0.' };
      return {};
    },
    onSubmit: v => {
      const target = firmById(v.toFirm);
      const dest = liveRows('accounts', target).find(x => x.id === v.toAccount);
      const amount = Number(v.quantity);
      const entry = { description: v.description, entryType: v.transferReason, allocationGroupId: v.allocationGroupId || '', transferReferenceTradeIds: v.referenceTradeIds || '' };
      changePosition(f, a, symbol, -amount, entry);
      changePosition(target, dest, symbol, amount, entry);
      persist();
      route();
      toast(`Transferred ${qty(amount)} ${symbol} to ${dest.displayName}.`);
    },
  });
}

function balancesTabHTML(f, a) {
  const locked = accountLocked(f, a);
  const collateral = a.collateralAccount && liveRows('accounts', f).find(x => x.id === a.collateralAccount);
  const balances = balancesOf(a);
  const withdrawals = withdrawalsOf(a);
  const credits = creditsOf(a);
  const actionsCol = locked ? '' : '<th class="acts">Actions</th>';
  return `<section class="section">
      ${tabToolbarHTML('Balance Details by Currency', '', `${collateral ? `<a class="btn btn-gray" href="${esc(accountTabHref(f, collateral, 'balances'))}">${icon('arrow')}Switch To: ${esc(collateral.displayName)}</a>` : ''}
        ${locked ? '' : `<button class="btn btn-gray" type="button" data-act="acct-capital-set">Set Capital</button>
        <button class="btn btn-primary" type="button" data-act="acct-balance-set">Set Balance</button>`}`)}
      <div class="card table-scroll"><table class="tbl tbl-wide">
        <thead><tr><th>Currency</th><th class="num">Fiat Balance</th><th class="num">Capital Requirement</th><th class="num">Excess Capital</th><th class="num">Buying Power</th><th class="num">Open Orders</th><th class="num">Margin Requirement</th><th class="num">Unsettled Funds</th>${actionsCol}</tr></thead>
        <tbody>${balances.map(b => `<tr>
          <td><strong class="firm-name">${esc(b.currency)}</strong></td><td class="num">${money(b.balance)}</td><td class="num">${money(b.capitalRequirement)}</td>
          <td class="num ${excessCapital(b) < 0 ? 'text-bad' : ''}">${money(excessCapital(b))}</td><td class="num">${money(buyingPower(b))}</td><td class="num">${money(b.openOrders)}</td>
          <td class="num">${money(b.marginRequirement)}</td><td class="num">${money(b.unsettledFunds)}</td>
          ${locked ? '' : `<td class="acts">
            <button class="icon-btn" type="button" data-act="acct-balance-set" data-currency="${esc(b.currency)}" aria-label="Set ${esc(b.currency)} balance" title="Set Balance">${icon('edit')}</button>
            <button class="icon-btn" type="button" data-act="acct-capital-set" data-currency="${esc(b.currency)}" aria-label="Set ${esc(b.currency)} capital requirement" title="Set Capital">${icon('shield')}</button>
          </td>`}
        </tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="section tab-block">
      ${tabToolbarHTML('Pending Currency Withdrawals', '', locked ? '' : `<button class="btn btn-primary" type="button" data-act="acct-withdrawal-new">${icon('plus')}Create Currency Withdrawal Request</button>`)}
      ${withdrawals.length ? `<div class="card table-scroll"><table class="tbl tbl-wide">
        <thead><tr><th>Create Time</th><th>Currency</th><th class="num">Amount</th><th>Description</th><th>Correlation ID</th>${actionsCol}</tr></thead>
        <tbody>${withdrawals.map(w => `<tr>
          <td>${esc(formatWhen(w.time))}</td><td>${esc(w.currency)}</td><td class="num">${money(w.amount)}</td><td class="desc-cell" title="${esc(w.description)}">${esc(w.description)}</td><td class="mono">${esc(w.correlationId)}</td>
          ${locked ? '' : `<td class="acts">
            <button class="icon-btn" type="button" data-act="acct-withdrawal-approve" data-id="${esc(w.id)}" aria-label="Approve withdrawal" title="Approve">${icon('check')}</button>
            <button class="icon-btn danger" type="button" data-act="acct-withdrawal-delete" data-id="${esc(w.id)}" aria-label="Delete withdrawal" title="Delete">${icon('trash')}</button>
          </td>`}
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="card empty small"><p>No pending currency withdrawals.</p></div>'}
    </section>
    <section class="section tab-block">
      ${tabToolbarHTML('Pending Credits')}
      ${credits.length ? `<div class="card table-scroll"><table class="tbl tbl-wide">
        <thead><tr><th>Create Time</th><th>Currency</th><th class="num">Balance</th><th>Description</th><th>Acknowledged</th>${actionsCol}</tr></thead>
        <tbody>${credits.map(c => `<tr>
          <td>${esc(formatWhen(c.time))}</td><td>${esc(c.currency)}</td><td class="num">${money(c.amount)}</td><td class="desc-cell" title="${esc(c.description)}">${esc(c.description)}</td><td>${c.acknowledged ? 'Yes' : 'No'}</td>
          ${locked ? '' : `<td class="acts">
            <button class="icon-btn" type="button" data-act="acct-credit-approve" data-id="${esc(c.id)}" aria-label="Approve credit" title="Approve">${icon('check')}</button>
            <button class="icon-btn danger" type="button" data-act="acct-credit-delete" data-id="${esc(c.id)}" aria-label="Delete credit" title="Delete">${icon('trash')}</button>
          </td>`}
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="card empty small"><p>No pending credits.</p></div>'}
    </section>`;
}

const currencyField = { k: 'currency', label: 'Currency', kind: 'select', options: CURRENCIES, blank: 'Choose a currency', req: true };
const changeDescription = { k: 'description', label: 'Description of Change', kind: 'textarea', req: true, tip: TIPS.ledgerDescription };

function ensureBalance(a, currency) {
  return balanceRow(a, currency) || (balancesOf(a).push({ currency, balance: 0, capitalRequirement: 0, openOrders: 0, marginRequirement: 0, unsettledFunds: 0, alternateCurrency: '' }), balanceRow(a, currency));
}

function openSetBalance(a, currency) {
  openFormSheet({
    title: 'Set Balance',
    submit: 'Save',
    repaintOn: ['action'],
    fields: v => [
      { k: 'action', label: 'Adjust/Set', kind: 'select', options: ADJUST_ACTIONS },
      currencyField,
      { k: 'amount', label: v.action === 'Set' ? 'New Balance' : 'Change to Balance', req: true, ph: v.action === 'Set' ? '100000.00' : '-2500.00' },
      changeDescription,
    ],
    values: { action: 'Adjust', currency: currency || '', amount: '', description: '' },
    validate: v => (isNumber(v.amount) ? {} : { amount: 'Enter an amount, such as 2500 or -2500.' }),
    onSubmit: v => {
      const amount = Number(v.amount);
      recordBalanceChange(a, ensureBalance(a, v.currency), v.description, b => { b.balance = v.action === 'Set' ? amount : b.balance + amount; });
      persist();
      route();
      toast(`Updated the ${v.currency} balance.`);
    },
  });
}

function openSetCapital(a, currency) {
  const current = currency && balanceRow(a, currency);
  openFormSheet({
    title: 'Set Capital',
    submit: 'Save',
    fields: [
      currencyField,
      { k: 'capital', label: 'Capital Requirement', req: true, ph: '20000.00' },
      { k: 'alternateCurrency', label: 'Alternate Capital Requirement Currency', kind: 'select', options: CURRENCIES, blank: 'None' },
      changeDescription,
    ],
    values: { currency: currency || '', capital: current ? String(current.capitalRequirement) : '', alternateCurrency: current ? current.alternateCurrency || '' : '', description: '' },
    validate: v => (isNumber(v.capital) && Number(v.capital) >= 0 ? {} : { capital: 'Enter a capital requirement of 0 or more.' }),
    onSubmit: v => {
      recordBalanceChange(a, ensureBalance(a, v.currency), v.description, b => { b.capitalRequirement = Number(v.capital); b.alternateCurrency = v.alternateCurrency; });
      persist();
      route();
      toast(`Updated the ${v.currency} capital requirement.`);
    },
  });
}

function openWithdrawal(a) {
  const banks = (a.bankDetails || []).filter(b => b.bankAccountType === 'Cash Withdrawal');
  openFormSheet({
    title: 'Create Currency Withdrawal Request',
    submit: 'Create Request',
    note: 'The request waits here until it’s approved, and the balance changes when it is.',
    fields: [
      currencyField,
      { k: 'amount', label: 'Balance Amount', req: true, ph: '2500.00' },
      ...(banks.length ? [{ k: 'bank', label: 'Bank Account', kind: 'select', options: banks.map(b => recordLabel(COLLECTIONS.bankDetails, b)), blank: 'Default bank account' }] : []),
      changeDescription,
    ],
    values: { currency: '', amount: '', bank: '', description: '' },
    validate: v => (isNumber(v.amount) && Number(v.amount) > 0 ? {} : { amount: 'Enter an amount greater than 0.' }),
    onSubmit: v => {
      withdrawalsOf(a).unshift({ id: refId('WD'), time: nowStamp(), currency: v.currency, amount: Number(v.amount), description: v.description, correlationId: refId('corr').toLowerCase(), bank: v.bank });
      persist();
      route();
      toast('Created the withdrawal request.');
    },
  });
}

async function approveWithdrawal(a, id) {
  const w = withdrawalsOf(a).find(x => x.id === id);
  const ok = await ask({ title: 'Approve this withdrawal?', text: `${money(w.amount)} ${w.currency} is taken from the ${a.displayName} balance.`, confirm: 'Approve Withdrawal', glyph: 'check' });
  if (!ok) return;
  recordBalanceChange(a, ensureBalance(a, w.currency), `Withdrawal approved: ${w.description}`, b => { b.balance -= w.amount; });
  a.withdrawals = withdrawalsOf(a).filter(x => x.id !== id);
  persist();
  route();
  toast('Approved the withdrawal.');
}

function deletePending(a, listKey, id, noun) {
  openFormSheet({
    title: `Delete ${noun}`,
    submit: 'Delete',
    note: 'Nothing changes on the balance. The description is kept with the record of the deletion.',
    fields: [{ k: 'reason', label: 'Description of Deletion', kind: 'textarea', req: true }],
    values: { reason: '' },
    onSubmit: () => {
      a[listKey] = a[listKey].filter(x => x.id !== id);
      persist();
      route();
      toast(`Deleted the ${noun.toLowerCase()}.`);
    },
  });
}

async function approveCredit(a, id) {
  const c = creditsOf(a).find(x => x.id === id);
  const ok = await ask({ title: 'Approve this credit?', text: `${money(c.amount)} ${c.currency} is added to the ${a.displayName} balance.`, confirm: 'Approve Credit', glyph: 'check' });
  if (!ok) return;
  recordBalanceChange(a, ensureBalance(a, c.currency), `Credit approved: ${c.description}`, b => { b.balance += c.amount; });
  a.pendingCredits = creditsOf(a).filter(x => x.id !== id);
  persist();
  route();
  toast('Approved the credit.');
}

const ledgerStates = {};
const ledgerState = kind => ledgerStates[kind] || (ledgerStates[kind] = { page: 0, size: 25, ...readListState(`acct.${kind}`) });
const ledgerRows = (f, a, kind) => (kind === 'balance-ledger' ? balanceLedgerOf(a) : positionLedgerOf(f, a));

function filteredLedger(f, a, kind) {
  const cfg = LEDGER_VIEWS[kind];
  const state = ledgerState(kind);
  const active = [cfg.search, ...cfg.filters].filter(x => String(state[x.k] || '').trim());
  return ledgerRows(f, a, kind).filter(r => active.every(x => x.test(r, String(state[x.k]).trim())));
}

function ledgerTabHTML(f, a, kind) {
  const cfg = LEDGER_VIEWS[kind];
  listCtl = { state: ledgerState(kind), refresh: () => refreshLedger(f, a, kind), noun: cfg.noun, search: cfg.search, filters: () => cfg.filters };
  return `<nav class="subtabs" aria-label="Ledger">${LEDGER_TABS.map(t => `<a href="${esc(accountTabHref(f, a, t.path))}" ${t.path === kind ? 'aria-current="page"' : ''}>${esc(t.label)}</a>`).join('')}</nav>
    ${filterBarHTML(`<button class="btn btn-gray" type="button" data-act="acct-ledger-export" data-kind="${kind}">${icon('download')}Export Data</button>`)}
    <section class="card card-clip list-card" id="acctLedger" aria-label="${esc(LEDGER_TABS.find(t => t.path === kind).label)}"></section>`;
}

function mountLedger(f, a, kind) {
  refreshLedger(f, a, kind);
}

function refreshLedger(f, a, kind) {
  const cfg = LEDGER_VIEWS[kind];
  const state = ledgerState(kind);
  saveListState(`acct.${kind}`, state);
  const { rows, hasMore } = cursorPage(filteredLedger(f, a, kind), state);
  const box = $('#acctLedger');
  if (!rows.length) {
    box.innerHTML = anyListFilter()
      ? '<div class="empty"><h3>No matching entries</h3><p>Try a different search, or clear the filters.</p><button class="btn btn-tint" type="button" data-act="fb-clear">Clear Filters</button></div>'
      : '<div class="empty"><h3>No ledger entries</h3><p>Changes to this account show here.</p></div>';
    return;
  }
  patchListTable(box, `<div class="table-scroll"><table class="tbl tbl-wide tbl-nosort">
      <thead><tr>${cfg.columns.map(([, label, kindOf]) => `<th class="${numClass(kindOf)}">${esc(label)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${cfg.columns.map(([k, label, kindOf]) => `<td class="${numClass(kindOf)}" data-label="${esc(label)}">${cellOf(kindOf, r[k])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    ${cursorPagerHTML(rows.length, hasMore)}`);
}

function exportLedger(f, a, kind) {
  const cfg = LEDGER_VIEWS[kind];
  const rows = filteredLedger(f, a, kind).map(r => cfg.columns.map(([k]) => r[k]));
  downloadText(`${a.id}-${cfg.file}`, [cfg.columns.map(([, label]) => label), ...rows].map(r => r.map(csvField).join(',')).join('\n'));
  toast('Exported the ledger.');
}
