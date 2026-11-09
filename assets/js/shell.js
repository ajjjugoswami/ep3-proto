'use strict';

function renderSidebar() {
  const min = document.body.classList.contains('side-min') && !matchMedia('(max-width: 860px)').matches;
  const pref = themePref();
  const currentNav = NAV_FOR_PAGE[PAGE] || (MARKET_PAGES.includes(PAGE) ? 'instruments.html' : 'firms.html');
  $('#sidebar').innerHTML = `
    <div class="side-head">
      <div class="brand">${logo('logo')}<strong class="brand-text">Admin Console</strong></div>
      <button class="icon-btn side-toggle" data-act="side-toggle" aria-label="${min ? 'Expand' : 'Collapse'} Navigation" title="${min ? 'Expand' : 'Collapse'} Navigation">${icon(min ? 'side-open' : 'side-close')}</button>
    </div>
    <div class="side-scroll">
      ${NAV.map(g => `
        <div class="side-group">
          <div class="side-label">${esc(g.label)}</div>
          ${g.items.map(([label, ic, href, act]) => href
            ? `<a class="nav-item" href="${esc(href)}" ${href === currentNav ? 'aria-current="page"' : ''} title="${esc(label)}">${icon(ic)}<span class="nav-text">${esc(label)}</span></a>`
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
  return storage.get(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function applyTheme() {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.dataset.theme = themePref();
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

const loginField = (label, control) => `<label class="login-field"><span>${esc(label)}</span>${control}</label>`;

const iconInput = (ic, input) => `<span class="login-input has-icon">${icon(ic)}${input}</span>`;

const authPageHTML = form => `
  <div class="login">
    <aside class="login-aside">
      <div class="login-brand">${logo('login-brand-logo')}<span>Admin Portal</span></div>
      <h1>Manage your trading platform with complete control</h1>
      <p>Oversee firms, users, accounts, instruments and market activity, all in one place.</p>
      <img class="login-art" src="assets/img/login-dashboard.png" alt="" width="640" height="495">
    </aside>
    <div class="login-pane">${form}</div>
  </div>`;

const passwordInput = (name, autocomplete, placeholder) => `
  <span class="login-input has-icon">
    ${icon('lock')}
    <input class="field" name="${name}" type="password" autocomplete="${autocomplete}" placeholder="${placeholder}">
    <button class="login-show" type="button" data-act="password-show" aria-pressed="false" aria-label="Show password" title="Show password">${icon('eye')}</button>
  </span>`;

function togglePassword(btn) {
  const input = $('input', btn.parentElement);
  const showing = input.type === 'password';
  input.type = showing ? 'text' : 'password';
  const label = showing ? 'Hide password' : 'Show password';
  btn.innerHTML = icon(showing ? 'eye-off' : 'eye');
  btn.setAttribute('aria-pressed', String(showing));
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

function showRowErr(el, message) {
  el.hidden = !message;
  el.innerHTML = message ? `${icon('warn')}<span>${esc(message)}</span>` : '';
}

function setLoginBusy(formEl, label) {
  const btn = $('button[type=submit]', formEl);
  const idle = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(label)}`;
  return () => {
    btn.disabled = false;
    btn.innerHTML = idle;
  };
}

function renderLogin() {
  document.title = 'Log In · EP3 Admin';
  document.body.classList.add('auth');
  $('#view').innerHTML = authPageHTML(`
    <form class="login-form" id="loginForm" novalidate>
      ${logo('login-logo')}
      <h2 tabindex="-1">Sign in to Admin Portal</h2>
      <p>Access and manage your trading platform</p>
      ${loginField('Username', iconInput('user', `<input class="field" name="username" placeholder="Enter your username" autocomplete="username" autocapitalize="off" spellcheck="false">`))}
      ${loginField('Password', passwordInput('password', 'current-password', 'Enter your password'))}
      <div class="row-err" id="loginErr" role="alert" hidden></div>
      <button class="btn btn-primary" type="submit">Sign In${icon('arrow')}</button>
      <p class="login-foot">Need an account? <a href="index.html?register=true">Register</a></p>
    </form>`);
  $('#loginForm [name=username]').focus();
}
