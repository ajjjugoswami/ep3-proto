'use strict';

function renderSidebar() {
  const min = document.body.classList.contains('side-min');
  const pref = themePref();
  const currentNav = MARKET_PAGES.includes(PAGE) ? 'instruments.html' : 'firms.html';
  $('#sidebar').innerHTML = `
    <div class="side-head">
      <div class="brand">${logo('logo')}<div class="brand-text"><strong>Admin</strong><span>Connamara</span></div></div>
      <button class="icon-btn" data-act="side-toggle" aria-label="${min ? 'Expand' : 'Collapse'} Navigation" title="${min ? 'Expand' : 'Collapse'} Navigation">${icon('sidebar')}</button>
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

const passwordInput = (name, autocomplete) => `
  <span class="login-input">
    <input class="field" name="${name}" type="password" autocomplete="${autocomplete}">
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
  $('#view').innerHTML = `
    <div class="login">
      <div class="login-side">
        <form class="login-form" id="loginForm" novalidate>
          ${logo('login-logo')}
          <h1 tabindex="-1">Welcome back</h1>
          <p>Log in to the EP3 admin console.</p>
          ${loginField('Username', '<input class="field" name="username" autocomplete="username" autocapitalize="off" spellcheck="false">')}
          ${loginField('Password', passwordInput('password', 'current-password'))}
          <div class="row-err" id="loginErr" role="alert" hidden></div>
          <button class="btn btn-primary" type="submit">Log In${icon('forward')}</button>
          <p class="login-foot">Need to register? <a href="index.html?register=true">Register</a></p>
        </form>
      </div>
    </div>`;
  $('#loginForm [name=username]').focus();
}
