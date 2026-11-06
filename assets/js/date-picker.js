'use strict';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DATE_INPUTS = 'input[type="date"], input[type="datetime-local"], input[type="time"]';
const PICKER_EMPTY = { date: 'Select date', 'datetime-local': 'Select date and time', time: 'Select time' };
let openDate = null;

function formatWhen(value) {
  if (typeof value !== 'string') return value;
  const full = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (full) {
    const date = `${MONTH_NAMES[Number(full[2]) - 1].slice(0, 3)} ${Number(full[3])}, ${full[1]}`;
    return full[4] ? `${date}, ${timeLabel(Number(full[4]) * 3600 + Number(full[5]) * 60)}` : date;
  }
  const time = value.match(/^(\d{2}):(\d{2})$/);
  return time ? timeLabel(Number(time[1]) * 3600 + Number(time[2]) * 60) : value;
}

function syncDateButton(input) {
  if (!input._btn) return;
  $('.select-value', input._btn).textContent = input.value ? formatWhen(input.value) : PICKER_EMPTY[input.type];
  input._btn.classList.toggle('is-empty', !input.value);
}

function readPickerValue(input) {
  const [first = '', second = ''] = input.value.split('T');
  const date = input.type === 'time' ? '' : first;
  const time = input.type === 'time' ? first : second;
  const [hour, minute] = time ? time.split(':').map(Number) : [null, null];
  return { date, hour, minute };
}

function commitPicker() {
  const s = openDate;
  const hour = s.hour ?? 0;
  const minute = s.minute ?? 0;
  const time = `${pad2(hour)}:${pad2(minute)}`;
  const kind = s.input.type;
  let value = '';
  if (kind === 'date') value = s.date;
  else if (kind === 'time') value = s.hour === null && s.minute === null ? '' : time;
  else if (s.date) value = `${s.date}T${time}`;
  s.input.value = value;
  s.input.dispatchEvent(new Event('input', { bubbles: true }));
  s.input.dispatchEvent(new Event('change', { bubbles: true }));
  syncDateButton(s.input);
}

function closeDatePicker(refocus = true) {
  if (!openDate) return;
  const { pop, input } = openDate;
  openDate = null;
  pop.remove();
  input._btn.setAttribute('aria-expanded', 'false');
  if (refocus && input._btn.isConnected) input._btn.focus({ preventScroll: true });
}

function dayCellsHTML(s) {
  const first = new Date(s.year, s.month, 1, 12);
  const start = new Date(s.year, s.month, 1 - first.getDay(), 12);
  const today = isoDate(new Date());
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12);
    const key = isoDate(day);
    const classes = [day.getMonth() !== s.month ? 'is-out' : '', key === today ? 'is-today' : ''].filter(Boolean).join(' ');
    const label = `${MONTH_NAMES[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()}`;
    return `<button type="button" class="date-day ${classes}" data-day="${key}" aria-label="${label}" aria-pressed="${key === s.date}" tabindex="${key === s.cursor ? '0' : '-1'}">${day.getDate()}</button>`;
  }).join('');
}

function calendarBodyHTML(s) {
  if (s.view === 'months') {
    return `<div class="date-grid-lg">${MONTH_NAMES.map((name, i) => `<button type="button" class="date-pick" data-month="${i}" aria-pressed="${i === s.month}">${name.slice(0, 3)}</button>`).join('')}</div>`;
  }
  if (s.view === 'years') {
    const from = s.year - (s.year % 12);
    return `<div class="date-grid-lg">${Array.from({ length: 12 }, (_, i) => from + i).map(y => `<button type="button" class="date-pick" data-year="${y}" aria-pressed="${y === s.year}">${y}</button>`).join('')}</div>`;
  }
  return `<div class="date-heads">${DAY_HEADS.map(d => `<span>${d}</span>`).join('')}</div><div class="date-days">${dayCellsHTML(s)}</div>`;
}

function calendarPaneHTML(s) {
  const from = s.year - (s.year % 12);
  return `<div class="date-cal">
    <div class="date-head">
      <button class="icon-btn date-nav" type="button" data-nav="-1" aria-label="Previous">${icon('back')}</button>
      <div class="date-title">
        ${s.view === 'years' ? `<span>${from} – ${from + 11}</span>` : `<button type="button" data-view="${s.view === 'months' ? 'days' : 'months'}">${MONTH_NAMES[s.month]}</button><button type="button" data-view="years">${s.year}</button>`}
      </div>
      <button class="icon-btn date-nav" type="button" data-nav="1" aria-label="Next">${icon('forward')}</button>
    </div>
    <div class="date-body">${calendarBodyHTML(s)}</div>
  </div>`;
}

function timeColumnHTML(name, label, values, current, text) {
  return `<div class="date-col" role="group" aria-label="${label}" data-col="${name}">${values.map(v => `<button type="button" data-${name}="${v}" aria-pressed="${v === current}">${text(v)}</button>`).join('')}</div>`;
}

function timePaneHTML(s) {
  const hour12 = s.hour === null ? null : (s.hour % 12 || 12);
  const meridiem = s.hour === null ? null : (s.hour < 12 ? 'AM' : 'PM');
  return `<div class="date-time">
    <div class="date-time-head"><span>Hour</span><span>Min</span><span></span></div>
    <div class="date-cols">
      ${timeColumnHTML('hour', 'Hour', [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], hour12, v => v)}
      ${timeColumnHTML('minute', 'Minute', Array.from({ length: 60 }, (_, i) => i), s.minute, pad2)}
      ${timeColumnHTML('meridiem', 'AM or PM', ['AM', 'PM'], meridiem, v => v)}
    </div>
  </div>`;
}

function renderDatePicker(focusSelector) {
  const s = openDate;
  const kind = s.input.type;
  s.pop.innerHTML = `<div class="date-panes">
      ${kind === 'time' ? '' : calendarPaneHTML(s)}
      ${kind === 'date' ? '' : timePaneHTML(s)}
    </div>
    <div class="date-foot">
      <button class="btn btn-plain btn-small" type="button" data-clear>Clear</button>
      <button class="btn btn-plain btn-small" type="button" data-today>${kind === 'date' ? 'Today' : 'Now'}</button>
      ${kind === 'date' ? '' : '<button class="btn btn-primary btn-small date-done" type="button" data-done>Done</button>'}
    </div>`;
  $$('.date-col', s.pop).forEach(col => {
    const on = $('[aria-pressed="true"]', col);
    if (on) col.scrollTop = on.offsetTop - (col.clientHeight - on.offsetHeight) / 2;
  });
  const target = focusSelector && $(focusSelector, s.pop);
  if (target) target.focus({ preventScroll: true });
}

function placeDatePicker() {
  const { pop, input } = openDate;
  const rect = input._btn.getBoundingClientRect();
  const size = pop.getBoundingClientRect();
  const below = rect.bottom + 4;
  pop.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - size.width - 8))}px`;
  pop.style.top = `${below + size.height > innerHeight - 8 ? Math.max(8, rect.top - size.height - 4) : below}px`;
}

function moveCursor(days) {
  const s = openDate;
  const [y, m, d] = s.cursor.split('-').map(Number);
  const next = new Date(y, m - 1, d + days, 12);
  s.cursor = isoDate(next);
  s.year = next.getFullYear();
  s.month = next.getMonth();
  renderDatePicker(`[data-day="${s.cursor}"]`);
}

function moveMonth(step) {
  const s = openDate;
  const next = new Date(s.year, s.month + step, 1, 12);
  s.year = next.getFullYear();
  s.month = next.getMonth();
  s.cursor = isoDate(next);
}

function onPickerClick(e) {
  const b = e.target.closest('button');
  if (!b || !openDate) return;
  const s = openDate;
  const d = b.dataset;
  const kind = s.input.type;
  if (d.nav) {
    const step = Number(d.nav);
    if (s.view === 'years') s.year += step * 12;
    else if (s.view === 'months') s.year += step;
    else moveMonth(step);
    renderDatePicker(`[data-nav="${d.nav}"]`);
  } else if (d.view) {
    s.view = d.view;
    renderDatePicker(`[data-view="${d.view}"], [data-nav="1"]`);
  } else if (d.month !== undefined) {
    s.month = Number(d.month);
    s.view = 'days';
    s.cursor = isoDate(new Date(s.year, s.month, 1, 12));
    renderDatePicker(`[data-day="${s.cursor}"]`);
  } else if (d.year !== undefined) {
    s.year = Number(d.year);
    s.view = 'months';
    renderDatePicker(`[data-month="${s.month}"]`);
  } else if (d.day) {
    s.date = d.day;
    s.cursor = d.day;
    commitPicker();
    if (kind === 'date') closeDatePicker();
    else {
      const [y, m] = d.day.split('-').map(Number);
      s.year = y;
      s.month = m - 1;
      renderDatePicker(`[data-day="${d.day}"]`);
    }
  } else if (d.hour !== undefined || d.minute !== undefined || d.meridiem) {
    if (kind !== 'time' && !s.date) {
      s.date = isoDate(new Date());
      s.cursor = s.date;
    }
    const pm = (s.hour ?? 0) >= 12;
    const twelve = (s.hour ?? 0) % 12;
    if (d.hour !== undefined) s.hour = (Number(d.hour) % 12) + (pm ? 12 : 0);
    if (d.meridiem) s.hour = twelve + (d.meridiem === 'PM' ? 12 : 0);
    if (d.minute !== undefined) s.minute = Number(d.minute);
    if (s.hour === null) s.hour = 0;
    if (s.minute === null) s.minute = 0;
    commitPicker();
    const key = d.hour !== undefined ? `[data-hour="${d.hour}"]` : d.minute !== undefined ? `[data-minute="${d.minute}"]` : `[data-meridiem="${d.meridiem}"]`;
    renderDatePicker(key);
  } else if (b.hasAttribute('data-clear')) {
    s.date = '';
    s.hour = null;
    s.minute = null;
    commitPicker();
    closeDatePicker();
  } else if (b.hasAttribute('data-today')) {
    const now = new Date();
    s.date = kind === 'time' ? '' : isoDate(now);
    s.hour = kind === 'date' ? null : now.getHours();
    s.minute = kind === 'date' ? null : now.getMinutes();
    commitPicker();
    closeDatePicker();
  } else if (b.hasAttribute('data-done')) {
    closeDatePicker();
  }
}

function onPickerKey(e) {
  if (!openDate) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeDatePicker();
    return;
  }
  if (e.key === 'Tab') {
    const items = $$('button:not([tabindex="-1"])', openDate.pop);
    const at = items.indexOf(document.activeElement);
    const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at === items.length - 1 ? 0 : at + 1);
    e.preventDefault();
    items[next].focus();
    return;
  }
  if (!e.target.dataset.day) return;
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (moves[e.key]) {
    e.preventDefault();
    moveCursor(moves[e.key]);
  } else if (e.key === 'PageUp' || e.key === 'PageDown') {
    e.preventDefault();
    moveMonth(e.key === 'PageUp' ? -1 : 1);
    renderDatePicker(`[data-day="${openDate.cursor}"]`);
  }
}

function openDatePicker(input) {
  closeMenu(false);
  closeSelect(false);
  closeDatePicker(false);
  const { date, hour, minute } = readPickerValue(input);
  const anchor = date ? new Date(`${date}T12:00`) : new Date();
  const pop = document.createElement('div');
  pop.className = 'date-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', input._btn.getAttribute('aria-label') || 'Choose a date');
  (input.closest('dialog') || document.body).append(pop);
  openDate = { input, pop, date, hour, minute, view: 'days', year: anchor.getFullYear(), month: anchor.getMonth(), cursor: isoDate(anchor) };
  input._btn.setAttribute('aria-expanded', 'true');
  pop.addEventListener('mousedown', e => { if (!e.target.closest('.date-col') || e.target.closest('button')) e.preventDefault(); });
  pop.addEventListener('click', onPickerClick);
  pop.addEventListener('keydown', onPickerKey);
  renderDatePicker(input.type === 'time' ? '.date-col button[aria-pressed="true"], .date-col button' : `[data-day="${openDate.cursor}"]`);
  placeDatePicker();
}

function enhanceDates() {
  $$(DATE_INPUTS).filter(input => !input.dataset.enhanced).forEach(input => {
    const focused = document.activeElement === input;
    const wrap = document.createElement('span');
    wrap.className = 'select-wrap';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'field select-btn date-btn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    const label = input.labels && input.labels[0];
    const name = input.getAttribute('aria-label') || (label && label.firstChild && label.firstChild.textContent.trim());
    if (name) btn.setAttribute('aria-label', name);
    ['aria-invalid', 'aria-describedby', 'aria-required'].forEach(attr => {
      if (input.hasAttribute(attr)) btn.setAttribute(attr, input.getAttribute(attr));
    });
    btn.innerHTML = `<span class="select-value"></span>${icon(input.type === 'time' ? 'clock' : 'calendar')}`;
    btn.disabled = input.disabled;
    input.dataset.enhanced = '1';
    input.classList.remove('field', 'filter-input');
    input.classList.add('select-native');
    input.tabIndex = -1;
    input._btn = btn;
    input.parentNode.insertBefore(wrap, input);
    wrap.append(input, btn);
    syncDateButton(input);
    input.addEventListener('focus', () => btn.focus({ preventScroll: true }));
    input.addEventListener('input', () => syncDateButton(input));
    input.addEventListener('change', () => syncDateButton(input));
    btn.addEventListener('click', () => {
      if (openDate && openDate.input === input) closeDatePicker();
      else openDatePicker(input);
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); openDatePicker(input); }
    });
    if (focused) btn.focus({ preventScroll: true });
  });
}

document.addEventListener('mousedown', e => {
  if (openDate && !e.target.closest('.date-pop') && !openDate.input._btn.contains(e.target)) closeDatePicker(false);
});
document.addEventListener('cancel', e => {
  if (openDate) { e.preventDefault(); closeDatePicker(); }
}, true);
window.addEventListener('scroll', e => {
  if (e.target.closest && e.target.closest('.date-pop')) return;
  closeDatePicker(false);
}, { passive: true, capture: true });
window.addEventListener('resize', () => closeDatePicker(false));
