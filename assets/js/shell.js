'use strict';

function renderSidebar() {
  const min = document.body.classList.contains('side-min');
  const pref = themePref();
  $('#sidebar').innerHTML = `
    <div class="side-head">
      <div class="brand">${logo('logo')}<div class="brand-text"><strong>Admin</strong><span>Connamara</span></div></div>
      <button class="icon-btn" data-act="side-toggle" aria-label="${min ? 'Expand' : 'Collapse'} Navigation" title="${min ? 'Expand' : 'Collapse'} Navigation">${icon('sidebar')}</button>
    </div>
    <div class="side-scroll">
      ${NAV.map(g => `
        <div class="side-group">
          <div class="side-label">${esc(g.label)}</div>
          ${g.items.map(([label, ic, live, act]) => live
            ? `<a class="nav-item" href="firms.html" aria-current="page" title="${esc(label)}">${icon(ic)}<span class="nav-text">${esc(label)}</span></a>`
            : `<button class="nav-item" type="button" data-act="${act || 'nav-soon'}" data-label="${esc(label)}" title="${esc(label)}">${icon(ic)}<span class="nav-text">${esc(label)}${act === 'license' ? `<small class="nav-sub">Expires ${esc(licenseExpiry(APP_INFO.expires))}</small>` : ''}</span></button>`).join('')}
        </div>`).join('')}
    </div>
    <div class="side-foot">
      <div class="appearance">
        <div class="side-label" id="appearanceLabel">Appearance</div>
        <div class="theme-seg" role="group" aria-labelledby="appearanceLabel">
          ${THEMES.map(([value, label, ic]) => `<button type="button" data-act="theme-set" data-pref="${value}" aria-pressed="${pref === value}" aria-label="${label}" title="${label}">${icon(ic)}<span>${label}</span></button>`).join('')}
        </div>
      </div>
      <button class="btn btn-logoff" type="button" data-act="logout" title="Log Off">${icon('logout')}<span class="nav-text">Log Off</span></button>
      <div class="side-info">
        <span>${esc(APP_INFO.client)}</span>
        <span class="mono">${esc(APP_INFO.appVersion)}</span>
      </div>
    </div>`;
}

function themePref() {
  const stored = storage.get(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function applyTheme() {
  const pref = themePref();
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = pref === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : pref;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
}

function licenseExpiry(raw) {
  const parts = String(raw).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!parts) return raw;
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function showLicense() {
  const d = $('#alert');
  d.innerHTML = `
    <div class="alert-body">
      <div class="alert-glyph">${icon('seal')}</div>
      <h2 id="alertTitle">License</h2>
      <p id="alertText">${esc(APP_INFO.client)}</p>
      <dl class="license-list">
        <div><dt>App Version</dt><dd class="mono">${esc(APP_INFO.appVersion)}</dd></div>
        <div><dt>Version</dt><dd>${esc(APP_INFO.licenseVersion)}</dd></div>
        <div><dt>Expires On</dt><dd>${esc(licenseExpiry(APP_INFO.expires))}</dd></div>
      </dl>
    </div>
    <div class="alert-acts alert-acts-single">
      <button class="btn btn-primary" type="button" autofocus>OK</button>
    </div>`;
  $('button', d).addEventListener('click', () => d.close());
  d.showModal();
}

function renderLogin() {
  document.title = 'Log In · EP3 Admin';
  document.body.classList.add('auth');
  $('#view').innerHTML = `
    <div class="login">
      <div class="login-side">
        <form class="login-form" id="loginForm" novalidate>
          ${logo('login-logo')}
          <h1 tabindex="-1">Welcome back</h1>
          <p>Log in to the EP3 admin console.</p>
          <label class="login-field"><span>Username</span><input class="field" name="username" autocomplete="username" autocapitalize="off" spellcheck="false"></label>
          <label class="login-field"><span>Password</span>
            <span class="login-input">
              <input class="field" name="password" type="password" autocomplete="current-password">
              <button class="login-show" type="button" id="loginShow" aria-pressed="false" aria-label="Show password" title="Show password">${icon('eye')}</button>
            </span>
          </label>
          <div class="row-err" id="loginErr" role="alert" hidden></div>
          <button class="btn btn-primary" type="submit">Log In${icon('forward')}</button>
          <p class="login-foot">Need to register? <button type="button" data-act="nav-soon" data-label="Registration">Register</button></p>
        </form>
      </div>
    </div>`;
  $('#loginShow').addEventListener('click', e => {
    const input = $('#loginForm [name=password]');
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    const label = showing ? 'Hide password' : 'Show password';
    e.currentTarget.innerHTML = icon(showing ? 'eye-off' : 'eye');
    e.currentTarget.setAttribute('aria-pressed', String(showing));
    e.currentTarget.setAttribute('aria-label', label);
    e.currentTarget.title = label;
  });
  $('#loginForm [name=username]').focus();
}
