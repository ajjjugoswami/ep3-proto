'use strict';

const acctUserList = { page: 0, size: 10 };
const acctAssocList = { page: 0, size: 10 };
const accountTabsFor = f => ACCOUNT_TABS.filter(t => !t.when || t.when(f));
const accountTabHref = (f, a, path) => recordUrl('accounts', f, null, { id: a.id, ...(path ? { tab: path } : {}) });
const accountLocked = (f, a) => !!(f.deleted || a.deleted);
const accountUsers = (f, a) => liveRows('users', f).filter(u => (u.accounts || []).some(link => link.id === a.id));
const linkOf = (u, a) => (u.accounts || []).find(link => link.id === a.id) || {};
const assocLinks = a => a.associated || (a.associated = []);

function findAccount(firmId, id) {
  const f = firmById(firmId);
  const a = f && !f.deleted ? liveRows('accounts', f).find(x => x.id === id) : null;
  return a ? { f, a } : null;
}

function currentAccountRecord() {
  const f = firmById(currentDetailId());
  return { f, a: entityRows('accounts', f).find(r => r.id === param('id')) };
}

function validateAccount(d, f) {
  const errors = {};
  const weight = String(d.priorityWeight ?? '').trim();
  if (weight && !/^-?\d+$/.test(weight)) errors.priorityWeight = 'Account Priority Weight must be a whole number.';
  const interval = Number(d.mqpInterval) > 0;
  const quantity = Number(d.mqpTradedQuantity) > 0;
  if (interval !== quantity) {
    const text = 'Enter both Interval and Traded Quantity, or neither.';
    errors[interval ? 'mqpTradedQuantity' : 'mqpInterval'] = text;
  }
  if (d.collateralAccount && d.collateralAccount === String(d.id).trim()) errors.collateralAccount = 'An account can’t be its own collateral account.';
  return errors;
}

function confirmAccountState(d, original, mode) {
  if (mode === 'create' || d.state === original.state) return Promise.resolve(true);
  const warning = STATE_WARNING_STATES.includes(d.state);
  const text = warning
    ? `This change removes any working orders for ${d.displayName} from all markets. Are you sure you want to ${d.state === 'Suspended' ? 'suspend the account' : 'put this account in a Liquidate Only state'}?`
    : `Are you sure you want to re-enable ${d.displayName}?`;
  return ask({ title: 'Change the account state?', text, confirm: warning ? `Set to ${d.state}` : 'Activate Account', danger: warning, glyph: warning ? 'pause' : 'play' });
}

const accountMenuItems = (f, a) => [
  { label: 'Open Firm', icon: 'building', run: () => go(hrefFor(f.id, 'accounts')) },
  '-',
  { label: 'Delete Account', icon: 'trash', danger: true, run: () => deleteRecord('accounts', f, null, a.id) },
];

function accountActionsHTML(f, a, editing) {
  if (f.deleted || editing) return '';
  if (a.deleted) return `<button class="btn btn-primary" type="button" data-act="ent-restore" data-kind="accounts" data-firm="${esc(f.id)}" data-id="${esc(a.id)}">${icon('restore')}Restore Account</button>`;
  return `<a class="btn btn-primary" href="${esc(entityHref('accounts', f, null, a.id, 'edit'))}">${icon('edit')}Edit Account</a>
    <button class="icon-btn btn-gray" type="button" data-act="acct-menu" aria-haspopup="menu" aria-label="More actions" title="More">${icon('more')}</button>`;
}

function accountHeadHTML(f, a, tabPath, editing = false) {
  return recordHeadHTML({
    back: recordBack('accounts', f, a, editing),
    title: a.displayName,
    pill: recordPill(a),
    meta: recordMeta(f, a, a.accountType),
    actions: accountActionsHTML(f, a, editing),
    tabs: accountTabsFor(f),
    current: tabPath,
    hrefOf: path => accountTabHref(f, a, path),
    label: 'Account sections',
  });
}

const tabToolbarHTML = (title, tip, actions = '') => `<div class="tab-toolbar">
    <h2 class="section-title">${esc(title)}${tipHTML(tip)}</h2>
    ${actions ? `<div class="head-acts">${actions}</div>` : ''}
  </div>`;

const ACCOUNT_VIEWS = {
  '': { html: (f, a) => recordProfileHTML('accounts', f, a) },
  users: { list: true, html: (f, a) => accountUsersTabHTML(f, a), mount: (f, a) => mountAccountUsers(f, a) },
  positions: { html: (f, a) => positionsTabHTML(f, a) },
  balances: { html: (f, a) => balancesTabHTML(f, a) },
  'balance-ledger': { list: true, html: (f, a) => ledgerTabHTML(f, a, 'balance-ledger'), mount: (f, a) => mountLedger(f, a, 'balance-ledger') },
  'position-ledger': { list: true, html: (f, a) => ledgerTabHTML(f, a, 'position-ledger'), mount: (f, a) => mountLedger(f, a, 'position-ledger') },
  whitelist: { form: true, html: (f, a) => whitelistTabHTML(f, a), mount: () => mountWhitelist() },
  commissions: { html: (f, a) => commissionsTabHTML(f, a) },
  association: { list: true, html: (f, a) => accountAssocTabHTML(f, a), mount: (f, a) => mountAccountAssoc(f, a) },
  'bank-accounts': { html: (f, a) => collectionHTML('bankDetails', a.bankDetails || [], { editable: !accountLocked(f, a), heading: true }) },
  'position-limits': { html: (f, a) => limitsTabHTML(a, !accountLocked(f, a)) },
};

function renderAccountPage(f, a, tabPath) {
  const tabs = accountTabsFor(f);
  const path = tabs.some(t => tabIsCurrent(t, tabPath || '')) ? tabPath || '' : '';
  const view = ACCOUNT_VIEWS[path];
  pageRecord = a;
  document.title = `${a.displayName} · EP3 Admin`;
  $('#view').innerHTML = `<div class="detail-page">
    ${accountHeadHTML(f, a, path)}
    <div class="detail-scroll ${view.list ? 'list-view' : ''} ${view.form && !accountLocked(f, a) ? 'detail-form' : ''}">
      ${a.deleted ? deletedBanner('account') : ''}
      ${view.html(f, a)}
    </div>
  </div>`;
  if (view.mount) view.mount(f, a);
}

function accountUsersTabHTML(f, a) {
  const add = accountLocked(f, a) ? '' : `<button class="btn btn-primary" type="button" data-act="acct-user-add">${icon('plus')}Add Associated User</button>`;
  return `${tabToolbarHTML('Associated Users', '', add)}
    <section class="card card-clip list-card" id="acctUsers" aria-label="Associated users"></section>`;
}

function mountAccountUsers(f, a) {
  listCtl = { state: acctUserList, refresh: () => refreshAccountUsers(f, a) };
  refreshAccountUsers(f, a);
}

function accountUserRowHTML(f, a, u) {
  const href = entityHref('users', f, null, u.id);
  return `<tr data-href="${esc(href)}">
    <td class="dir-name"><a class="firm-name" href="${esc(href)}">${esc(u.displayName)}</a></td>
    <td data-label="User ID"><span class="mono firm-id">${esc(u.id)}</span></td>
    <td data-label="Customer Order Capacity">${esc(linkOf(u, a).capacity || 'Other')}</td>
    <td data-label="User Role">${entityCell(u.role, {})}</td>
    <td class="inst-state">${statusPill(u.state)}</td>
    <td class="acts">
      <a class="icon-btn" href="${esc(href)}" aria-label="View ${esc(u.displayName)}" title="View">${icon('eye')}</a>
      <a class="icon-btn" href="${esc(entityHref('users', f, null, u.id, 'edit'))}" aria-label="Edit ${esc(u.displayName)}" title="Edit">${icon('edit')}</a>
      ${accountLocked(f, a) ? '' : `<button class="icon-btn danger" type="button" data-act="acct-user-remove" data-id="${esc(u.id)}" aria-label="Remove ${esc(u.displayName)} from this account" title="Remove from account">${icon('x')}</button>`}
    </td>
  </tr>`;
}

function refreshAccountUsers(f, a) {
  const { rows, hasMore } = cursorPage(accountUsers(f, a), acctUserList);
  const box = $('#acctUsers');
  if (!rows.length) {
    box.innerHTML = `<div class="empty"><h3>No associated users</h3><p>Add the users who can trade on ${esc(a.displayName)}.</p></div>`;
    return;
  }
  patchListTable(box, `<div class="table-scroll"><table class="tbl tbl-wide tbl-dir tbl-nosort">
      <thead><tr><th>Name</th><th>User ID</th><th>Customer Order Capacity</th><th>User Role</th><th>State</th><th class="acts">Actions</th></tr></thead>
      <tbody>${rows.map(u => accountUserRowHTML(f, a, u)).join('')}</tbody>
    </table></div>
    ${cursorPagerHTML(rows.length, hasMore)}`);
}

function openAddAccountUsers(f, a) {
  openCapacityPicker({
    title: 'Add User',
    noun: 'User',
    intro: `Select users to associate with ${a.displayName}, and choose the customer order capacity each one trades in.`,
    empty: 'Every user in this firm is already associated with this account.',
    candidates: liveRows('users', f).filter(u => !(u.accounts || []).some(link => link.id === a.id)),
    columns: [['User Name', u => `<strong class="firm-name">${esc(u.displayName)}</strong>`], ['User Role', u => entityCell(u.role, {})]],
    onAdd: picks => {
      picks.forEach(({ item, capacity }) => { (item.accounts || (item.accounts = [])).push({ id: a.id, capacity }); });
      persist();
      refreshAccountUsers(f, a);
      toast(`Added ${picks.length} user${picks.length === 1 ? '' : 's'} to ${a.displayName}.`);
    },
  });
}

async function removeAccountUser(f, a, userId) {
  const u = liveRows('users', f).find(x => x.id === userId);
  const ok = await ask({ title: `Remove ${u.displayName} from ${a.displayName}?`, text: 'The user can no longer trade on this account. The user itself isn’t changed.', confirm: 'Remove User', danger: true, glyph: 'x' });
  if (!ok) return;
  u.accounts = (u.accounts || []).filter(link => link.id !== a.id);
  persist();
  refreshAccountUsers(f, a);
  toast(`Removed ${u.displayName} from ${a.displayName}.`);
}

function accountAssocTabHTML(f, a) {
  const add = accountLocked(f, a) ? '' : `<button class="btn btn-primary" type="button" data-act="acct-assoc-add">${icon('plus')}Add Associations</button>`;
  return `${tabToolbarHTML('Associated Accounts', TIPS.accountAssociations, add)}
    <section class="card card-clip list-card" id="acctAssoc" aria-label="Associated accounts"></section>`;
}

function mountAccountAssoc(f, a) {
  listCtl = { state: acctAssocList, refresh: () => refreshAccountAssoc(f, a) };
  refreshAccountAssoc(f, a);
}

function assocRowHTML(f, a, link) {
  const found = findAccount(link.firm, link.id);
  if (!found) return '';
  const href = entityHref('accounts', found.f, null, found.a.id);
  return `<tr data-href="${esc(href)}">
    <td class="dir-name"><a class="firm-name" href="${esc(href)}">${esc(found.a.displayName)}</a></td>
    <td data-label="Firm">${esc(found.f.name)}</td>
    <td data-label="Clearing Firm">${entityCell(found.a.clearingMember, {})}</td>
    <td data-label="Account Type">${entityCell(found.a.accountType, {})}</td>
    <td class="inst-state">${statusPill(found.a.state)}</td>
    <td class="acts">
      <a class="icon-btn" href="${esc(href)}" aria-label="View ${esc(found.a.displayName)}" title="View">${icon('eye')}</a>
      ${accountLocked(f, a) ? '' : `<button class="icon-btn danger" type="button" data-act="acct-assoc-remove" data-firm="${esc(link.firm)}" data-id="${esc(link.id)}" aria-label="Remove the association with ${esc(found.a.displayName)}" title="Remove association">${icon('x')}</button>`}
    </td>
  </tr>`;
}

function refreshAccountAssoc(f, a) {
  const links = assocLinks(a).filter(link => findAccount(link.firm, link.id));
  const { rows, hasMore } = cursorPage(links, acctAssocList);
  const box = $('#acctAssoc');
  if (!rows.length) {
    box.innerHTML = `<div class="empty"><h3>No associated accounts</h3><p>Associate accounts that share beneficial ownership with ${esc(a.displayName)}.</p></div>`;
    return;
  }
  patchListTable(box, `<div class="table-scroll"><table class="tbl tbl-wide tbl-dir tbl-nosort">
      <thead><tr><th>Account</th><th>Firm</th><th>Clearing Firm</th><th>Account Type</th><th>State</th><th class="acts">Actions</th></tr></thead>
      <tbody>${rows.map(link => assocRowHTML(f, a, link)).join('')}</tbody>
    </table></div>
    ${cursorPagerHTML(rows.length, hasMore)}`);
}

function assocCandidates(f, a, filter) {
  const taken = new Set(assocLinks(a).map(link => `${link.firm}/${link.id}`));
  return firms.filter(x => !x.deleted && (!filter.firm || x.id === filter.firm))
    .flatMap(x => liveRows('accounts', x).map(acct => ({ f: x, a: acct, key: `${x.id}/${acct.id}` })))
    .filter(c => c.key !== `${f.id}/${a.id}` && !taken.has(c.key) && (!filter.id || c.a.id === filter.id));
}

function assocPickerHTML(f, a, state) {
  const all = assocCandidates(f, a, state.filter);
  const rows = all.slice(state.page * PICKER_PAGE_SIZE, (state.page + 1) * PICKER_PAGE_SIZE);
  const firmChoices = firmsWithTab('accounts').map(x => `<option value="${esc(x.id)}" ${state.draft.firm === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  return `<p class="sheet-note">Accounts you add share beneficial ownership with ${esc(a.displayName)}. ${state.picked.size ? `${state.picked.size} selected.` : ''}</p>
    <div class="filters">
      <label class="filter-field"><span>Firm</span><select class="field" data-assoc-firm><option value="">All firms</option>${firmChoices}</select></label>
      <label class="filter-field filter-search"><span>Account ID${tipHTML(TIPS.exactAccountId)}</span><input class="field filter-input mono" type="search" data-assoc-id value="${esc(state.draft.id)}" placeholder="Exact account ID" autocomplete="off" spellcheck="false"></label>
      <button class="btn btn-primary" type="button" data-assoc-apply>Apply</button>
      <button class="btn btn-gray" type="button" data-assoc-clear>Clear</button>
    </div>
    ${rows.length ? `<div class="card table-scroll"><table class="tbl">
      <thead><tr><th class="check-cell"><span class="sr">Select</span></th><th>Account</th><th>Firm</th><th>Account Type</th></tr></thead>
      <tbody>${rows.map(c => `<tr>
        <td class="check-cell"><input type="checkbox" data-assoc-pick="${esc(c.key)}" ${state.picked.has(c.key) ? 'checked' : ''} aria-label="Select ${esc(c.a.displayName)}"></td>
        <td><strong class="firm-name">${esc(c.a.displayName)}</strong></td><td>${esc(c.f.name)}</td><td>${entityCell(c.a.accountType, {})}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    ${pickerPagerHTML(state.page, rows.length, (state.page + 1) * PICKER_PAGE_SIZE < all.length)}` : '<div class="card empty small"><p>No accounts match. Try a different firm or account ID.</p></div>'}`;
}

function openAddAssociations(f, a) {
  const state = { page: 0, picked: new Set(), filter: { firm: '', id: '' }, draft: { firm: '', id: '' } };
  const apply = paint => { state.filter = { ...state.draft }; state.page = 0; paint(); };
  openWideSheet({
    title: 'Add Associations',
    closeLabel: 'Cancel',
    primary: () => (state.picked.size ? `Add ${state.picked.size} Association${state.picked.size === 1 ? '' : 's'}` : 'Add Associations'),
    body: () => assocPickerHTML(f, a, state),
    onPaint: (d, paint) => {
      $('[data-assoc-firm]', d).addEventListener('change', e => { state.draft.firm = e.target.value; });
      const idBox = $('[data-assoc-id]', d);
      idBox.addEventListener('input', () => { state.draft.id = idBox.value.trim(); });
      idBox.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(paint); } });
      $('[data-assoc-apply]', d).addEventListener('click', () => apply(paint));
      $('[data-assoc-clear]', d).addEventListener('click', () => { state.draft = { firm: '', id: '' }; apply(paint); });
      $$('[data-assoc-pick]', d).forEach(box => box.addEventListener('change', () => {
        if (box.checked) state.picked.add(box.dataset.assocPick); else state.picked.delete(box.dataset.assocPick);
        paint();
      }));
      $$('[data-pick-page]', d).forEach(btn => btn.addEventListener('click', () => { state.page += Number(btn.dataset.pickPage); paint(); }));
    },
    onPrimary: () => {
      if (!state.picked.size) { toast('Select at least one account to associate.', { info: true }); return; }
      state.picked.forEach(key => {
        const [firm, ...rest] = key.split('/');
        assocLinks(a).push({ firm, id: rest.join('/') });
      });
      const count = state.picked.size;
      persist();
      $('#sheet').close();
      refreshAccountAssoc(f, a);
      toast(`Added ${count} association${count === 1 ? '' : 's'}.`);
    },
  });
}

async function removeAccountAssoc(f, a, firmId, id) {
  const found = findAccount(firmId, id);
  const ok = await ask({ title: `Remove ${found ? found.a.displayName : id}?`, text: `It no longer shares beneficial ownership with ${a.displayName}. Neither account is changed otherwise.`, confirm: 'Remove Association', danger: true, glyph: 'x' });
  if (!ok) return;
  a.associated = assocLinks(a).filter(link => !(link.firm === firmId && link.id === id));
  persist();
  refreshAccountAssoc(f, a);
  toast('Associations updated.');
}
