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
            : `<button class="nav-item" type="button" data-act="${act || 'nav-soon'}" data-label="${esc(label)}" title="${esc(label)}">${icon(ic)}<span class="nav-text">${esc(label)}</span></button>`).join('')}
        </div>`).join('')}
    </div>
    <div class="side-foot">
      <div class="appearance">
        <div class="side-label" id="appearanceLabel">Appearance</div>
        <div class="theme-seg" role="group" aria-labelledby="appearanceLabel">
          ${THEMES.map(([value, label, ic]) => `<button type="button" data-act="theme-set" data-pref="${value}" aria-pressed="${pref === value}" aria-label="${label}" title="${label}">${icon(ic)}<span>${label}</span></button>`).join('')}
        </div>
      </div>
      <button class="nav-item" type="button" data-act="reset-data" title="Reset Sample Data">${icon('restore')}<span class="nav-text">Reset Sample Data</span></button>
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

function renderLogin() {
  document.title = 'Log In · EP3 Admin';
  document.body.classList.add('auth');
  $('#view').innerHTML = `
    <div class="login">
      <div class="login-box">
        ${logo('login-logo')}
        <form class="login-card" id="loginForm" novalidate>
          <h1 tabindex="-1">Log in to EP3 Admin</h1>
          <p>Enter your details to continue.</p>
          <label class="login-field"><span>Username</span><input class="field" name="username" autocomplete="username" autocapitalize="off" spellcheck="false"></label>
          <label class="login-field"><span>Password</span><input class="field" name="password" type="password" autocomplete="current-password"></label>
          <div class="row-err" id="loginErr" role="alert" hidden></div>
          <button class="btn btn-primary" type="submit">Log In</button>
        </form>
        <p class="login-foot">Need to register? <button type="button" data-act="nav-soon" data-label="Registration">Register</button></p>
      </div>
    </div>`;
  $('#loginForm [name=username]').focus();
}
