'use strict';

function toast(message, opts = {}) {
  lastToast = { message, opts, at: Date.now() };
  if (leaving) {
    saveFlash();
    return;
  }
  const el = document.createElement('div');
  el.className = `toast ${opts.info ? 'info' : ''}`;
  el.innerHTML = `${icon(opts.info ? 'warn' : 'check')}<span>${esc(message)}</span>`;
  $('#toasts').replaceChildren(el);
  setTimeout(() => el.remove(), 3600);
}

function ask({ title, text, confirm, danger, glyph }) {
  const d = $('#alert');
  d.innerHTML = `
    <div class="alert-body">
      <div class="alert-glyph ${danger ? 'danger' : ''}">${icon(glyph || (danger ? 'warn' : 'restore'))}</div>
      <h2 id="alertTitle">${esc(title)}</h2>
      <p id="alertText">${esc(text)}</p>
    </div>
    <div class="alert-acts">
      <button class="btn btn-gray" type="button" data-r="0" autofocus>Cancel</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-r="1">${esc(confirm)}</button>
    </div>`;
  return new Promise(resolve => {
    const onClose = () => {
      if (d.open) return;
      d.removeEventListener('close', onClose);
      resolve(false);
    };
    $$('button', d).forEach(b => b.addEventListener('click', () => {
      d.removeEventListener('close', onClose);
      d.close();
      resolve(b.dataset.r === '1');
    }));
    d.addEventListener('close', onClose);
    d.showModal();
  });
}

function closeMenu(refocus = true) {
  const m = $('.menu');
  if (!m) return;
  const opener = m._opener;
  m.remove();
  if (refocus && opener && opener.isConnected) opener.focus();
}

function openMenu(anchor, items, at) {
  closeMenu(false);
  const m = document.createElement('div');
  m.className = 'menu';
  m.setAttribute('role', 'menu');
  m._opener = anchor;
  items.forEach(it => {
    if (it === '-') { m.append(document.createElement('hr')); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.tabIndex = -1;
    if (it.danger) b.className = 'danger';
    if (it.disabled) { b.disabled = true; b.title = it.reason || ''; }
    b.innerHTML = `${icon(it.icon)}<span>${esc(it.label)}</span>`;
    b.addEventListener('click', () => { closeMenu(); it.run(); });
    m.append(b);
  });
  document.body.append(m);
  const rect = at || anchor.getBoundingClientRect();
  const r = m.getBoundingClientRect();
  const left = Math.max(8, Math.min((at ? at.left : rect.right - r.width), innerWidth - r.width - 8));
  const below = (at ? at.top : rect.bottom + 6);
  const top = below + r.height > innerHeight - 8 ? Math.max(8, (at ? at.top : rect.top - 6) - r.height) : below;
  m.style.left = `${left}px`;
  m.style.top = `${top}px`;
  $('button:not(:disabled)', m).focus();
  m.addEventListener('keydown', e => {
    const btns = $$('button:not(:disabled)', m);
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    if (e.key === 'Home') { e.preventDefault(); btns[0].focus(); }
    if (e.key === 'End') { e.preventDefault(); btns[btns.length - 1].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); }
    if (e.key === 'Tab') closeMenu();
  });
}

let openSel = null;
let selectUid = 0;

function syncSelect(sel) {
  if (!sel || !sel._btn) return;
  const option = sel.selectedOptions[0];
  $('.select-value', sel._btn).textContent = option ? option.textContent : '';
  sel._btn.classList.toggle('is-empty', !sel.value);
}

function closeSelect(refocus = true) {
  if (!openSel) return;
  const { sel, pop } = openSel;
  openSel = null;
  pop.remove();
  sel._btn.setAttribute('aria-expanded', 'false');
  sel._btn.removeAttribute('aria-activedescendant');
  sel._btn.removeAttribute('aria-controls');
  if (refocus && sel._btn.isConnected) sel._btn.focus({ preventScroll: true });
}

function setActiveOption(index) {
  if (!openSel) return;
  const items = $$('.select-opt', openSel.pop);
  openSel.active = Math.max(0, Math.min(index, items.length - 1));
  items.forEach((item, i) => item.classList.toggle('active', i === openSel.active));
  const current = items[openSel.active];
  openSel.sel._btn.setAttribute('aria-activedescendant', current.id);
  const { pop } = openSel;
  if (current.offsetTop < pop.scrollTop) pop.scrollTop = current.offsetTop;
  else if (current.offsetTop + current.offsetHeight > pop.scrollTop + pop.clientHeight) pop.scrollTop = current.offsetTop + current.offsetHeight - pop.clientHeight;
}

function pickOption(index) {
  if (!openSel) return;
  const { sel } = openSel;
  const changed = sel.selectedIndex !== index;
  closeSelect();
  if (!changed) return;
  sel.selectedIndex = index;
  syncSelect(sel);
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

function openSelect(sel) {
  closeMenu(false);
  closeSelect(false);
  const btn = sel._btn;
  const uid = ++selectUid;
  const pop = document.createElement('div');
  pop.className = 'select-pop';
  pop.id = `select-pop-${uid}`;
  pop.setAttribute('role', 'listbox');
  pop.innerHTML = [...sel.options].map((option, i) => `<div class="select-opt" role="option" id="select-${uid}-${i}" data-i="${i}" aria-selected="${i === sel.selectedIndex}"><span>${esc(option.textContent)}</span>${icon('check')}</div>`).join('');
  (sel.closest('dialog') || document.body).append(pop);
  const rect = btn.getBoundingClientRect();
  pop.style.minWidth = `${rect.width}px`;
  const size = pop.getBoundingClientRect();
  const below = rect.bottom + 4;
  pop.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - size.width - 8))}px`;
  pop.style.top = `${below + size.height > innerHeight - 8 ? Math.max(8, rect.top - size.height - 4) : below}px`;
  pop.addEventListener('mousedown', e => e.preventDefault());
  pop.addEventListener('mousemove', e => {
    const item = e.target.closest('.select-opt');
    if (item && openSel && Number(item.dataset.i) !== openSel.active) setActiveOption(Number(item.dataset.i));
  });
  pop.addEventListener('click', e => {
    const item = e.target.closest('.select-opt');
    if (item) pickOption(Number(item.dataset.i));
  });
  openSel = { sel, pop, active: 0 };
  btn.setAttribute('aria-expanded', 'true');
  btn.setAttribute('aria-controls', pop.id);
  setActiveOption(Math.max(0, sel.selectedIndex));
}

function onSelectKey(e, sel) {
  const isOpen = openSel && openSel.sel === sel;
  if (!isOpen) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openSelect(sel); }
    return;
  }
  const count = sel.options.length;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveOption(openSel.active + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveOption(openSel.active - 1); }
  else if (e.key === 'Home') { e.preventDefault(); setActiveOption(0); }
  else if (e.key === 'End') { e.preventDefault(); setActiveOption(count - 1); }
  else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickOption(openSel.active); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSelect(); }
  else if (e.key === 'Tab') closeSelect(false);
  else if (e.key.length === 1) {
    const key = e.key.toLowerCase();
    const options = [...sel.options];
    const after = options.findIndex((o, i) => i > openSel.active && o.textContent.toLowerCase().startsWith(key));
    const match = after >= 0 ? after : options.findIndex(o => o.textContent.toLowerCase().startsWith(key));
    if (match >= 0) setActiveOption(match);
  }
}

function enhanceSelects() {
  $$('select:not([data-enhanced])').forEach(sel => {
    const focused = document.activeElement === sel;
    const wrap = document.createElement('span');
    wrap.className = 'select-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'field select-btn';
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    const label = sel.labels && sel.labels[0];
    if (label) btn.setAttribute('aria-label', label.textContent.trim().split('\n')[0].trim());
    ['aria-invalid', 'aria-describedby', 'aria-required'].forEach(attr => {
      if (sel.hasAttribute(attr)) btn.setAttribute(attr, sel.getAttribute(attr));
    });
    btn.innerHTML = `<span class="select-value"></span>${icon('chevrons')}`;
    btn.disabled = sel.disabled;
    sel.dataset.enhanced = '1';
    sel.classList.remove('field');
    sel.classList.add('select-native');
    sel.tabIndex = -1;
    sel._btn = btn;
    sel.parentNode.insertBefore(wrap, sel);
    wrap.append(sel, btn);
    syncSelect(sel);
    sel.addEventListener('focus', () => btn.focus({ preventScroll: true }));
    btn.addEventListener('click', () => {
      if (openSel && openSel.sel === sel) closeSelect();
      else openSelect(sel);
    });
    btn.addEventListener('keydown', e => onSelectKey(e, sel));
    if (focused) btn.focus({ preventScroll: true });
  });
}

document.addEventListener('mousedown', e => {
  if (openSel && !e.target.closest('.select-pop') && !openSel.sel._btn.contains(e.target)) closeSelect(false);
});
document.addEventListener('cancel', e => {
  if (openSel) { e.preventDefault(); closeSelect(); }
}, true);
document.addEventListener('change', e => {
  if (e.target.matches && e.target.matches('select[data-enhanced]')) syncSelect(e.target);
}, true);
