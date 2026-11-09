'use strict';

const isAdminRole = u => String(u.role || '').toLowerCase().includes('admin');
const USER_TABS = [
  { path: '', label: 'User Profile' },
  { path: 'accounts', label: 'Accounts', when: u => !isAdminRole(u) },
];
const userAcctList = { page: 0, size: 10 };
const isAdminFirm = f => ['supervisor', 'clearingMember'].includes(f.type);
const userTabsFor = u => USER_TABS.filter(t => !t.when || t.when(u));
const userTabHref = (f, u, path) => recordUrl('users', f, null, { id: u.id, ...(path ? { tab: path } : {}) });
const userResource = (f, u) => `firms/${f.id}/users/${u.id}`;
const accountLinks = u => u.accounts || (u.accounts = []);

function userMenuItems(f, u, onProfile) {
  return [
    ...(onProfile ? [
      { label: 'Generate Test Token', icon: 'key', run: () => showUserToken(f, u, false) },
      { label: 'Force Logoff', icon: 'logout', run: () => forceLogoff(f, u) },
      { label: 'Remove Multi-factor Authentication', icon: 'shield', run: () => removeUserMfa(u) },
      '-',
    ] : []),
    { label: 'Delete User', icon: 'trash', danger: true, run: () => deleteRecord('users', f, null, u.id) },
  ];
}

function userActionsHTML(f, u, onProfile, editing) {
  if (f.deleted || editing) return '';
  if (u.deleted) return `<button class="btn btn-primary" type="button" data-act="ent-restore" data-kind="users" data-firm="${esc(f.id)}" data-id="${esc(u.id)}">${icon('restore')}Restore User</button>`;
  return `${onProfile ? `<button class="btn btn-gray" type="button" data-act="user-reg-token">${icon('key')}Generate Registration Token</button>` : ''}
    <a class="btn btn-primary" href="${esc(entityHref('users', f, null, u.id, 'edit'))}">${icon('edit')}Edit User</a>
    <button class="icon-btn btn-gray" type="button" data-act="user-menu" aria-haspopup="menu" aria-label="More actions" title="More">${icon('more')}</button>`;
}

function userHeadHTML(f, u, tabPath, editing = false) {
  return recordHeadHTML({
    back: recordBack('users', f, u, editing),
    title: u.displayName,
    pill: recordPill(u),
    meta: recordMeta(f, u, u.role),
    actions: userActionsHTML(f, u, tabPath === '', editing),
    tabs: userTabsFor(u),
    current: tabPath,
    hrefOf: path => userTabHref(f, u, path),
    label: 'User sections',
  });
}

function userAccountsTabHTML(f, u) {
  return `<div class="tab-toolbar">
      <h2 class="section-title">Associated Accounts</h2>
      ${f.deleted || u.deleted ? '' : `<button class="btn btn-primary" type="button" data-act="user-acct-add">${icon('plus')}Add Associated Account</button>`}
    </div>
    <section class="card card-clip list-card" id="userAccts" aria-label="Associated accounts"></section>`;
}

function renderUserPage(f, u, tabPath) {
  const tab = userTabsFor(u).find(t => t.path === (tabPath || '')) || USER_TABS[0];
  document.title = `${u.displayName} · EP3 Admin`;
  $('#view').innerHTML = `<div class="detail-page">
    ${userHeadHTML(f, u, tab.path)}
    <div class="detail-scroll ${tab.path ? 'list-view' : ''}">
      ${u.deleted ? deletedBanner('user') : ''}
      ${tab.path === 'accounts' ? userAccountsTabHTML(f, u) : recordProfileHTML('users', f, u)}
    </div>
  </div>`;
  if (tab.path === 'accounts') {
    listCtl = { state: userAcctList, refresh: () => refreshUserAccounts(f, u) };
    refreshUserAccounts(f, u);
  }
}

function linkedAccountRowHTML(f, u, link) {
  const a = entityRows('accounts', f).find(x => x.id === link.id);
  if (!a) return '';
  const href = entityHref('accounts', f, null, a.id);
  return `<tr data-href="${esc(href)}" class="${a.deleted ? 'is-deleted' : ''}">
    <td class="dir-name"><a class="firm-name" href="${esc(href)}">${esc(a.displayName)}</a></td>
    <td data-label="Customer Order Capacity">${esc(link.capacity || 'Other')}</td>
    <td data-label="Account Type">${entityCell(a.accountType, {})}</td>
    <td data-label="Associated Firm">${esc(f.name)}</td>
    <td data-label="Clearing Firm">${entityCell(a.clearingMember, {})}</td>
    <td data-label="Collateral Account">${entityCell(a.collateralAccount, {})}</td>
    <td class="inst-state">${a.deleted ? '<span class="pill pill-deleted">Deleted</span>' : statusPill(a.state)}</td>
    <td class="acts">
      <a class="icon-btn" href="${esc(href)}" aria-label="View ${esc(a.displayName)}" title="View">${icon('eye')}</a>
      ${a.deleted
        ? `<button class="btn btn-tint btn-small" type="button" data-act="ent-restore" data-kind="accounts" data-firm="${esc(f.id)}" data-id="${esc(a.id)}">Restore</button>`
        : `<a class="icon-btn" href="${esc(entityHref('accounts', f, null, a.id, 'edit'))}" aria-label="Edit ${esc(a.displayName)}" title="Edit">${icon('edit')}</a>
           ${u.deleted ? '' : `<button class="icon-btn danger" type="button" data-act="user-acct-remove" data-id="${esc(a.id)}" aria-label="Remove ${esc(a.displayName)} from this user" title="Remove from user">${icon('x')}</button>`}`}
    </td>
  </tr>`;
}

function refreshUserAccounts(f, u) {
  const links = accountLinks(u).filter(link => entityRows('accounts', f).some(a => a.id === link.id));
  const { rows, hasMore } = cursorPage(links, userAcctList);
  const box = $('#userAccts');
  if (!rows.length) {
    box.innerHTML = `<div class="empty"><h3>No associated accounts</h3><p>Link accounts that ${esc(u.displayName)} can trade on.</p></div>`;
    return;
  }
  patchListTable(box, `<div class="table-scroll"><table class="tbl tbl-wide tbl-dir tbl-nosort">
      <thead><tr><th>Name</th><th>Customer Order Capacity</th><th>Account Type</th><th>Associated Firm</th><th>Clearing Firm</th><th>Collateral Account</th><th>State</th><th class="acts">Actions</th></tr></thead>
      <tbody>${rows.map(link => linkedAccountRowHTML(f, u, link)).join('')}</tbody>
    </table></div>
    ${cursorPagerHTML(rows.length, hasMore)}`);
}

async function removeUserAccount(f, u, id) {
  const ok = await ask({ title: `Remove ${id} from ${u.displayName}?`, text: 'The user can no longer trade on this account. The account itself isn’t changed.', confirm: 'Remove Account', danger: true, glyph: 'x' });
  if (!ok) return;
  u.accounts = accountLinks(u).filter(link => link.id !== id);
  persist();
  refreshUserAccounts(f, u);
  toast(`Removed ${id} from ${u.displayName}.`);
}

function openLinkAccounts(f, u) {
  const linked = new Set(accountLinks(u).map(link => link.id));
  openCapacityPicker({
    title: 'Add Account',
    noun: 'Account',
    intro: 'Select accounts to link, and choose the customer order capacity the user trades in on each.',
    empty: 'Every account in this firm is already linked to this user.',
    candidates: liveRows('accounts', f).filter(a => !linked.has(a.id)),
    columns: [['Account Name', a => `<strong class="firm-name">${esc(a.displayName)}</strong>`], ['Account Type', a => entityCell(a.accountType, {})]],
    onAdd: picks => {
      picks.forEach(({ item, capacity }) => accountLinks(u).push({ id: item.id, capacity }));
      persist();
      refreshUserAccounts(f, u);
      toast(`Added ${picks.length} account${picks.length === 1 ? '' : 's'} to ${u.displayName}.`);
    },
  });
}

const base64Url = value => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const randomHex = length => Array.from(crypto.getRandomValues(new Uint8Array(length)), b => b.toString(16).padStart(2, '0')).join('');

function sampleUserToken(f, u, singleUse) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = singleUse ? 86400 : 600;
  return [base64Url({ alg: 'HS256', typ: 'JWT' }), base64Url({ sub: userResource(f, u), iat: now, exp: now + ttl, single_use: singleUse, admin: isAdminFirm(f) }), randomHex(24)].join('.');
}

function showUserToken(f, u, singleUse) {
  const token = sampleUserToken(f, u, singleUse);
  const title = `${singleUse ? 'Single Use' : 'Test'} ${isAdminFirm(f) ? 'Admin Token' : 'API Token'}`;
  const mail = `mailto:?subject=${encodeURIComponent(`${u.displayName} Registration Token`)}&body=${encodeURIComponent(`Welcome ${u.displayName}! Please find your registration token below:\n${token}`)}`;
  const d = $('#alert');
  d.innerHTML = `
    <div class="alert-body">
      <div class="alert-glyph">${icon('key')}</div>
      <h2 id="alertTitle">${esc(title)}</h2>
      <p id="alertText">${singleUse ? 'Send this to the user so they can register. It works once and expires in 24 hours.' : 'Use this token for testing. It expires in 10 minutes.'}</p>
      <textarea class="field mono token-box" readonly aria-label="${esc(title)}">${esc(token)}</textarea>
    </div>
    <div class="alert-acts alert-acts-3">
      <button class="btn btn-gray" type="button" data-token-close>OK</button>
      <a class="btn btn-gray" href="${esc(mail)}">Email</a>
      <button class="btn btn-primary" type="button" data-token-copy autofocus>${icon('copy')}Copy</button>
    </div>`;
  $('[data-token-close]', d).addEventListener('click', () => d.close());
  $('[data-token-copy]', d).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(token); toast(`${title} copied to clipboard.`); }
    catch { $('.token-box', d).select(); toast('Couldn’t copy. The token is selected, so copy it manually.', { info: true }); }
  });
  d.showModal();
}

async function forceLogoff(f, u) {
  const ok = await ask({ title: 'Revoke active tokens?', text: `${u.displayName} (${userResource(f, u)}) is signed out everywhere and has to sign in again.`, confirm: 'Force Logoff', danger: true, glyph: 'logout' });
  if (ok) toast('Tokens revoked.');
}

async function removeUserMfa(u) {
  const ok = await ask({ title: 'Remove multi-factor authentication?', text: `${u.displayName} has to set up multi-factor authentication again the next time they sign in.`, confirm: 'Remove MFA', danger: true, glyph: 'shield' });
  if (ok) toast('Multi-factor authentication removed.');
}

const currentUserRecord = () => {
  const f = firmById(currentDetailId());
  return { f, u: entityRows('users', f).find(r => r.id === param('id')) };
};
