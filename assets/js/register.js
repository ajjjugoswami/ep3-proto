'use strict';

const REGISTER_FIELDS = ['token', 'password', 'matchpassword'];
const PASSWORD_MIN_STRENGTH = 12;
const SAMPLE_REGISTER_TOKEN = [{ alg: 'none' }, { sub: 'firms/A1-Trading/users/alex.morgan' }, { sample: true }]
  .map(part => btoa(JSON.stringify(part)).replace(/=+$/, ''))
  .join('.');

function tokenUsername(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).sub.split('/').pop();
  } catch {
    return '';
  }
}

function passwordSuggestion(password) {
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(re => re.test(password)).length;
  const strength = password.length + (variety - 1) * 2;
  if (strength >= PASSWORD_MIN_STRENGTH) return '';
  const percent = (strength / PASSWORD_MIN_STRENGTH).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 });
  return `${percent} Add another word or two, or mix in capitals, numbers and symbols.`;
}

function registerErrors(values) {
  const errors = {};
  if (!values.token) errors.token = 'Token is required.';
  if (!values.password) errors.password = 'Password is required.';
  if (values.password !== values.matchpassword) errors.matchpassword = 'Password must match.';
  else if (values.password && passwordSuggestion(values.password)) errors.matchpassword = passwordSuggestion(values.password);
  return errors;
}

const registerValues = formEl => ({
  token: formEl.elements.token.value.trim(),
  password: formEl.elements.password.value,
  matchpassword: formEl.elements.matchpassword.value,
});

const registerErrorBox = name => `<span class="row-err" id="${name}Err" hidden></span>`;

function showRegisterErrors(formEl, errors) {
  REGISTER_FIELDS.forEach(name => {
    showRowErr($(`#${name}Err`), errors[name]);
    if (errors[name]) formEl.elements[name].setAttribute('aria-invalid', 'true');
    else formEl.elements[name].removeAttribute('aria-invalid');
  });
}

function onRegisterInput(e) {
  const formEl = e.currentTarget;
  const values = registerValues(formEl);
  formEl.elements.username.value = tokenUsername(values.token);
  const next = registerErrors(values);
  REGISTER_FIELDS.filter(name => $(`#${name}Err`).hidden).forEach(name => delete next[name]);
  showRegisterErrors(formEl, next);
  showRowErr($('#registerErr'), '');
}

function useSampleToken() {
  const formEl = $('#registerForm');
  formEl.elements.token.value = SAMPLE_REGISTER_TOKEN;
  formEl.elements.token.dispatchEvent(new Event('input', { bubbles: true }));
  formEl.elements.password.focus();
}

async function submitRegister(formEl) {
  const values = registerValues(formEl);
  const errors = registerErrors(values);
  showRegisterErrors(formEl, errors);
  showRowErr($('#registerErr'), '');
  if (Object.keys(errors).length) {
    $('[aria-invalid="true"]', formEl).focus();
    return;
  }
  const restore = setLoginBusy(formEl, 'Registering…');
  await wait(500);
  if (!tokenUsername(values.token)) {
    restore();
    showRowErr($('#registerErr'), 'Unable to register user.');
    return;
  }
  toast('Successfully submitted registration for new user, you may now log in');
  go('index.html');
}

function renderRegister() {
  document.title = 'Register · EP3 Admin';
  document.body.classList.add('auth');
  $('#view').innerHTML = authPageHTML(`
    <form class="login-form" id="registerForm" novalidate>
      ${logo('login-logo')}
      <h2 tabindex="-1">Create your account</h2>
      <p>Paste your registration token and choose a password</p>
      ${loginField('Token', `
        ${iconInput('key', '<input class="field" name="token" placeholder="Enter your token" autocomplete="off" autocapitalize="off" spellcheck="false">')}
        ${registerErrorBox('token')}
        <span class="login-hint">No token? <button type="button" data-act="register-sample">Use a sample token</button></span>`)}
      ${loginField('Username', iconInput('user', '<input class="field" name="username" placeholder="Filled in from your token" autocomplete="username" disabled>'))}
      ${loginField('Password', `${passwordInput('password', 'new-password', 'Enter your password')}${registerErrorBox('password')}`)}
      ${loginField('Confirm Password', `${passwordInput('matchpassword', 'new-password', 'Confirm your password')}${registerErrorBox('matchpassword')}`)}
      <div class="row-err" id="registerErr" role="alert" hidden></div>
      <button class="btn btn-primary" type="submit">Register${icon('arrow')}</button>
      <p class="login-foot">Already have an account? <a href="index.html">Sign In</a></p>
    </form>`);
  $('#registerForm').addEventListener('input', onRegisterInput);
  $('#registerForm [name=token]').focus();
}
