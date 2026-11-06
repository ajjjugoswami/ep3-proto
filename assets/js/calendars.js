'use strict';

const calendarView = { view: 'agenda', anchor: isoDate(new Date()), ...readListState('calendarView') };
const dayMs = 86400000;
const AGENDA_DAYS = 365;
const CAL_HOUR_PX = 44;
const CAL_OPEN_HOUR = 6;
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
  const to = isoDate(new Date(anchor.getTime() + AGENDA_DAYS * dayMs));
  const rows = sortedHolidays().filter(e => e.start.slice(0, 10) >= from && e.start.slice(0, 10) <= to);
  if (!rows.length) return '<div class="card empty"><h3>No events</h3><p>There are no events in this range.</p></div>';
  return `<div class="card"><table class="tbl">
    <thead><tr><th>Date</th><th class="hide-compact">Time</th><th>Event</th></tr></thead>
    <tbody>${rows.map(e => `<tr>
      <td class="cal-date">${esc(longDate(new Date(e.start)))}</td>
      <td class="hide-compact">${esc(holidayTime(e))}</td>
      <td><button class="link-btn" type="button" data-act="holiday-open" data-id="${esc(e.id)}">${esc(holidayLabel(e))}</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

const isAllDayEvent = e => holidayTime(e) === 'All day' || e.start.slice(0, 10) !== e.end.slice(0, 10);
const eventCoversDay = (e, key) => e.start.slice(0, 10) <= key && e.end.slice(0, 10) >= key;
const minutesOf = text => { const d = new Date(text); return d.getHours() * 60 + d.getMinutes(); };
const calEventButton = (e, cls, extra = '') => `<button class="cal-event ${cls}" type="button" data-act="holiday-open" data-id="${esc(e.id)}" title="${esc(holidayLabel(e))}" ${extra}>${esc(holidayLabel(e))}</button>`;

function timedEventsHTML(events) {
  const laneEnds = [];
  const placed = events.map(e => {
    const start = minutesOf(e.start);
    const end = Math.max(minutesOf(e.end), start + 30);
    let lane = laneEnds.findIndex(until => until <= start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = end;
    return { e, start, end, lane };
  });
  return placed.map(p => calEventButton(p.e, 'cal-timed', `data-start="${p.start}" data-end="${p.end}" data-lane="${p.lane}" data-lanes="${laneEnds.length}"`)).join('');
}

function weekHTML(anchor) {
  const start = weekStart(anchor);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * dayMs));
  const now = new Date();
  const today = isoDate(now);
  const events = sortedHolidays();
  const dayClass = key => (key === today ? 'is-today' : '');
  return `<div class="card card-clip"><div class="cal-scroll" id="calScroll">
    <div class="cal-sticky">
      <div class="cal-row"><span class="cal-gutter"></span>${days.map(d => `<div class="cal-head ${dayClass(isoDate(d))}">${pad2(d.getDate())} ${WEEK_DAYS[d.getDay()][0]}${WEEK_DAYS[d.getDay()].slice(1).toLowerCase()}</div>`).join('')}</div>
      <div class="cal-row cal-allday"><span class="cal-gutter"></span>${days.map(d => {
        const key = isoDate(d);
        return `<div class="cal-allday-cell ${dayClass(key)}">${events.filter(e => isAllDayEvent(e) && eventCoversDay(e, key)).map(e => calEventButton(e, '')).join('')}</div>`;
      }).join('')}</div>
    </div>
    <div class="cal-row">
      <div class="cal-gutter cal-hours">${Array.from({ length: 24 }, (_, h) => `<span>${timeLabel(h * 3600)}</span>`).join('')}</div>
      ${days.map(d => {
        const key = isoDate(d);
        const timed = events.filter(e => !isAllDayEvent(e) && e.start.slice(0, 10) === key);
        return `<div class="cal-col ${dayClass(key)}">${timedEventsHTML(timed)}${key === today ? `<span class="cal-now" data-minute="${now.getHours() * 60 + now.getMinutes()}"></span>` : ''}</div>`;
      }).join('')}
    </div>
  </div></div>`;
}

function layoutWeek() {
  const percent = minutes => `${(minutes / 1440) * 100}%`;
  $$('.cal-timed').forEach(el => {
    const { start, end, lane, lanes } = el.dataset;
    el.style.top = percent(Number(start));
    el.style.height = percent(Number(end) - Number(start));
    el.style.left = `${(Number(lane) / Number(lanes)) * 100}%`;
    el.style.width = `${100 / Number(lanes)}%`;
  });
  $$('.cal-now').forEach(el => { el.style.top = percent(Number(el.dataset.minute)); });
  const scroller = $('#calScroll');
  if (scroller) scroller.scrollTop = CAL_OPEN_HOUR * CAL_HOUR_PX;
}

function calendarRangeLabel(anchor) {
  if (calendarView.view === 'week') {
    const start = weekStart(anchor);
    const end = new Date(start.getTime() + 6 * dayMs);
    const month = d => MONTH_NAMES[d.getMonth()];
    return start.getMonth() === end.getMonth()
      ? `${month(start)} ${pad2(start.getDate())} – ${pad2(end.getDate())}`
      : `${month(start)} ${pad2(start.getDate())} – ${month(end)} ${pad2(end.getDate())}`;
  }
  const short = d => `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
  return `${short(anchor)} – ${short(new Date(anchor.getTime() + AGENDA_DAYS * dayMs))}`;
}

function renderCalendars() {
  document.title = 'Calendars · EP3 Admin';
  saveListState('calendarView', calendarView);
  const anchor = parseDay(calendarView.anchor);
  $('#view').innerHTML = `<div class="detail-page">
    ${moduleHeadHTML('calendars', `
      <button class="btn btn-gray" type="button" data-act="calendar-manage">Manage Calendars</button>
      <button class="btn btn-primary" type="button" data-act="holiday-add">${icon('plus')}Add New Event</button>`)}
    <div class="detail-scroll">
      <div class="cal-toolbar">
        <div class="btn-group" role="group" aria-label="Calendar navigation">
          <button type="button" data-act="calendar-today">Today</button>
          <button type="button" data-act="calendar-move" data-d="-1">Back</button>
          <button type="button" data-act="calendar-move" data-d="1">Next</button>
        </div>
        <strong class="cal-range">${esc(calendarRangeLabel(anchor))}</strong>
        <div class="theme-seg cal-seg" role="group" aria-label="Calendar view">
          ${[['week', 'Week'], ['agenda', 'Agenda']].map(([key, label]) => `<button type="button" data-act="calendar-view" data-view="${key}" aria-pressed="${calendarView.view === key}"><span>${label}</span></button>`).join('')}
        </div>
      </div>
      ${calendarView.view === 'week' ? weekHTML(anchor) : agendaHTML(anchor)}
    </div>
  </div>`;
  layoutWeek();
}

function moveCalendar(direction) {
  const anchor = parseDay(calendarView.anchor);
  const step = calendarView.view === 'week' ? 7 : AGENDA_DAYS;
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
