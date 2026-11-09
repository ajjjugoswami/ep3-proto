'use strict';

const withAccount = fn => (el, e) => {
  const { f, a } = currentAccountRecord();
  if (f && a) fn(f, a, el, e);
};

Object.assign(ACT, {
  'acct-menu': withAccount((f, a, el) => openMenu(el, accountMenuItems(f, a))),
  'acct-user-add': withAccount((f, a) => openAddAccountUsers(f, a)),
  'acct-user-remove': withAccount((f, a, el) => removeAccountUser(f, a, el.dataset.id)),
  'acct-assoc-add': withAccount((f, a) => openAddAssociations(f, a)),
  'acct-assoc-remove': withAccount((f, a, el) => removeAccountAssoc(f, a, el.dataset.firm, el.dataset.id)),
  'acct-asof-clear': withAccount((f, a) => go(accountTabHref(f, a, 'positions'))),
  'acct-positions-export': withAccount((f, a) => exportPositions(f, a)),
  'acct-position-adjust': withAccount((f, a, el) => openAdjustPosition(f, a, el.dataset.symbol)),
  'acct-position-transfer': withAccount((f, a, el) => openTransferPosition(f, a, el.dataset.symbol)),
  'acct-balance-set': withAccount((f, a, el) => openSetBalance(a, el.dataset.currency)),
  'acct-capital-set': withAccount((f, a, el) => openSetCapital(a, el.dataset.currency)),
  'acct-withdrawal-new': withAccount((f, a) => openWithdrawal(a)),
  'acct-withdrawal-approve': withAccount((f, a, el) => approveWithdrawal(a, el.dataset.id)),
  'acct-withdrawal-delete': withAccount((f, a, el) => deletePending(a, 'withdrawals', el.dataset.id, 'Withdrawal Request')),
  'acct-credit-approve': withAccount((f, a, el) => approveCredit(a, el.dataset.id)),
  'acct-credit-delete': withAccount((f, a, el) => deletePending(a, 'pendingCredits', el.dataset.id, 'Pending Credit')),
  'acct-ledger-export': withAccount((f, a, el) => exportLedger(f, a, el.dataset.kind)),
  'wl-save'() { saveWhitelist(); },
  'wl-reset'() { resetWhitelist(); },
  'wl-page'(el) {
    const key = el.dataset.list === 'product' ? 'productPage' : 'instPage';
    wl[key] += Number(el.dataset.d);
    if (key === 'productPage') paintWhitelistProducts(); else paintWhitelistInstruments();
  },
  'comm-new': withAccount((f, a) => openCommissionForm(a, null)),
  'comm-view': withAccount((f, a, el) => openCommissionView(f, a, Number(el.dataset.i))),
  'comm-edit': withAccount((f, a, el) => openCommissionForm(a, Number(el.dataset.i))),
  'comm-del': withAccount((f, a, el) => deleteCommission(a, Number(el.dataset.i))),
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.closest('#sheet')) return;
  if (t.id === 'acctAsOf') {
    const { f, a } = currentAccountRecord();
    go(recordUrl('accounts', f, null, { id: a.id, tab: 'positions', ...(t.value ? { asOf: t.value } : {}) }));
    return;
  }
  if (wl && !form) onWhitelistChange(t);
});

document.addEventListener('input', e => {
  const t = e.target;
  if (!wl) return;
  if (t.id === 'wlProductFilter') {
    wl.productQuery = t.value.trim();
    wl.productPage = 0;
    paintWhitelistProducts();
  }
  if (t.id === 'wlInstFilter' && !t.value.trim() && wl.instQuery) {
    wl.instQuery = '';
    wl.instPage = 0;
    paintWhitelistInstruments();
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.target.id !== 'wlInstFilter' || !wl) return;
  e.preventDefault();
  wl.instQuery = e.target.value.trim();
  wl.instPage = 0;
  paintWhitelistInstruments();
});

window.addEventListener('beforeunload', e => {
  if (wlDirty()) { e.preventDefault(); e.returnValue = ''; }
});
