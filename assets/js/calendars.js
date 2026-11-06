'use strict';

const calendarView = { view: 'agenda', anchor: isoDate(new Date()), ...readSaved('calendarView') };
const dayMs = 86400000;
const parseDay = text => new Date(`${text}T12:00`);
const longDate = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const holidayName = e => `${e.calendar}${(market.calendars[e.calendar] || {}).global ? ' (Global)' : ''}`;
const holidayLabel = e => `${holidayName(e)} - ${e.title}`;
const sortedHolidays = () => [...market.holidays].sort((a, b) => a.start.localeCompare(b.start));
const weekStart = date => new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay(), 12);

function holidayTime(e) {
  const start = new Date(e.start);
  const end = new Date(e.end);
  if (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23) return 'All day';
  return `${timeLabel(start.getHours() * 3600 + start.getMinutes() * 60)} - ${timeLabel(end.getHours() * 3600 + end.getMinutes() * 60)}`;
}

function agendaHTML(anchor) {
  const from = isoDate(anchor);
  const to = isoDate(new Date(anchor.getTime() + 365 * dayMs));
  const rows = sortedHolidays().filter(e => e.start.slice(0, 10) >= from && e.start.slice(0, 10) <= to);
  if (!rows.length) return '<div class="card empty"><h3>No events</h3><p>There are no holidays in this range.</p></div>';
  return `<div class="card"><table class="tbl">
    <thead><tr><th>Date</th><th class="hide-compact">Time</th><th>Event</th></tr></thead>
    <tbody>${rows.map(e => `<tr>
      <td class="cal-date">${esc(longDate(new Date(e.start)))}</td>
      <td class="hide-compact">${esc(holidayTime(e))}</td>
      <td><button class="link-btn" type="button" data-act="holiday-open" data-id="${esc(e.id)}">${esc(holidayLabel(e))}</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function weekHTML(anchor) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * dayMs));
  const today = isoDate(new Date());
  return `<div class="cal-week">${days.map(d => {
    const key = isoDate(d);
    const events = sortedHolidays().filter(e => e.start.slice(0, 10) === key);
    return `<div class="card cal-day ${key === today ? 'is-today' : ''}">
      <div class="cal-day-head"><span>${WEEK_DAYS[d.getDay()]}</span><strong>${d.getDate()}</strong></div>
      ${events.map(e => `<button class="cal-event" type="button" data-act="holiday-open" data-id="${esc(e.id)}">${esc(holidayLabel(e))}</button>`).join('')}
    </div>`;
  }).join('')}</div>`;
}

function renderCalendars() {
  document.title = 'Calendars · EP3 Admin';
  session.set('calendarView', JSON.stringify(calendarView));
  const anchor = parseDay(calendarView.anchor);
  const start = calendarView.view === 'week' ? weekStart(anchor) : anchor;
  const end = new Date(start.getTime() + (calendarView.view === 'week' ? 6 : 365) * dayMs);
  $('#view').innerHTML = `<div class="detail-page">
    ${moduleHeadHTML('calendars', `
      <button class="btn btn-gray" type="button" data-act="calendar-manage">Manage Calendars</button>
      <button class="btn btn-primary" type="button" data-act="holiday-add">${icon('plus')}Add New Event</button>`)}
    <div class="detail-scroll">
      <div class="cal-toolbar">
        <div class="head-acts">
          <button class="btn btn-gray" type="button" data-act="calendar-today">Today</button>
          <button class="icon-btn" type="button" data-act="calendar-move" data-d="-1" aria-label="Back" title="Back">${icon('back')}</button>
          <button class="icon-btn" type="button" data-act="calendar-move" data-d="1" aria-label="Next" title="Next">${icon('forward')}</button>
        </div>
        <strong class="cal-range">${esc(longDate(start))} – ${esc(longDate(end))}</strong>
        <div class="theme-seg cal-seg" role="group" aria-label="Calendar view">
          ${[['week', 'Week'], ['agenda', 'Agenda']].map(([key, label]) => `<button type="button" data-act="calendar-view" data-view="${key}" aria-pressed="${calendarView.view === key}"><span>${label}</span></button>`).join('')}
        </div>
      </div>
      ${calendarView.view === 'week' ? weekHTML(anchor) : agendaHTML(anchor)}
    </div>
  </div>`;
}

function moveCalendar(direction) {
  const anchor = parseDay(calendarView.anchor);
  const step = calendarView.view === 'week' ? 7 : 30;
  calendarView.anchor = isoDate(new Date(anchor.getTime() + direction * step * dayMs));
  renderCalendars();
}

function openHolidaySheet() {
  const today = isoDate(new Date());
  openFormSheet({
    title: 'Create Holiday Event',
    submit: 'Create',
    values: { calendar: '', title: '', start: `${today}T00:00`, end: `${today}T23:59` },
    fields: () => [
      { k: 'calendar', label: 'Holiday Calendar', kind: 'select', options: Object.keys(market.calendars), blank: 'Choose a calendar', req: true },
      { k: 'title', label: 'Holiday Title', req: true },
      { k: 'start', label: 'Start Date/Time', inputType: 'datetime-local', req: true },
      { k: 'end', label: 'End Date/Time', inputType: 'datetime-local', req: true },
    ],
    validate: v => (new Date(v.end) < new Date(v.start) ? { end: 'End must be after Start.' } : {}),
    onSubmit: v => {
      market.holidays.push({ id: `h${Date.now()}`, calendar: v.calendar, title: v.title.trim(), start: v.start, end: v.end });
      saveMarket();
      renderCalendars();
      toast(`Added ${v.title.trim()}.`);
    },
  });
}

async function openHolidayEvent(id) {
  const e = market.holidays.find(h => h.id === id);
  if (!e) return;
  const ok = await ask({ title: holidayName(e), text: `${e.title} · ${longDate(new Date(e.start))} · ${holidayTime(e)}`, confirm: 'Delete', danger: true, glyph: 'calendar' });
  if (!ok) return;
  market.holidays = market.holidays.filter(h => h.id !== id);
  saveMarket();
  renderCalendars();
  toast(`Deleted ${e.title}.`);
}

function openCalendarManager() {
  const exists = name => Object.prototype.hasOwnProperty.call(market.calendars, name);
  openFormSheet({
    title: 'Manage Holiday Calendars',
    submit: 'Create',
    note: 'Choose a calendar to delete it, or type a new title to create one.',
    values: { existing: '', name: '', description: '', global: false },
    fields: () => [
      { k: 'existing', label: 'Holiday Calendar', kind: 'select', options: Object.keys(market.calendars), blank: 'New calendar' },
      { k: 'name', label: 'Calendar Title', req: true },
      { k: 'description', label: 'Description' },
      { k: 'global', label: 'Global (apply to all instruments)', kind: 'toggle' },
    ],
    sync: (v, d) => {
      const nameInput = document.getElementById('rec-name');
      const existingSelect = document.getElementById('rec-existing');
      if (d.dataset.lastExisting !== v.existing) {
        d.dataset.lastExisting = v.existing;
        if (v.existing) {
          v.name = v.existing;
          nameInput.value = v.existing;
        }
      } else if (v.existing && v.name !== v.existing) {
        v.existing = '';
        d.dataset.lastExisting = '';
        existingSelect.value = '';
        syncSelect(existingSelect);
      }
      const found = exists(v.name.trim());
      const description = document.getElementById('rec-description');
      const global = document.getElementById('rec-global');
      description.disabled = found;
      global.disabled = found;
      if (found) {
        description.value = market.calendars[v.name.trim()].description;
        global.checked = market.calendars[v.name.trim()].global;
      }
      $('[data-sheet-submit]', d).textContent = found ? 'Delete' : 'Create';
      $('[data-sheet-submit]', d).className = `btn ${found ? 'btn-danger' : 'btn-primary'}`;
    },
    onSubmit: async v => {
      const name = v.name.trim();
      const deleting = exists(name);
      const ok = await ask(deleting
        ? { title: `Delete ${name}?`, text: 'This deletes the calendar and all of its events.', confirm: 'Delete Calendar', danger: true, glyph: 'trash' }
        : { title: `Create ${name}?`, text: 'This creates a new holiday calendar.', confirm: 'Create Calendar', glyph: 'calendar' });
      if (!ok) return;
      if (deleting) {
        delete market.calendars[name];
        market.holidays = market.holidays.filter(h => h.calendar !== name);
      } else {
        market.calendars[name] = { global: !!v.global, description: v.description.trim() };
      }
      saveMarket();
      renderCalendars();
      toast(deleting ? `Deleted ${name}.` : `Created ${name}.`);
    },
  });
}
