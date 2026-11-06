'use strict';

Object.assign(ACT, {
  'inst-row-menu'(el) { openMenu(el, instrumentMenuItems(instrumentById(el.dataset.id), false)); },
  'inst-detail-menu'(el) { openMenu(el, instrumentMenuItems(instrumentById(el.dataset.id), true)); },
  'inst-clear-filters'() {
    Object.assign(instList, blankInstrumentFilters(), { page: 0 });
    refreshInstrumentFilters();
    refreshInstruments();
    $('[data-filter]').focus();
  },
  'inst-halt-all'() { haltAllInstruments(); },
  'inst-ops-menu'(el) { openMenu(el, instrumentOpsMenuItems()); },
  'inst-refresh'() { refreshMarketData(); },
  'inst-state'(el) { openStateSheet([el.dataset.id]); },
  'inst-sel-state'() { openStateSheet(filteredInstruments().filter(i => instSelected.has(i.id)).map(i => i.id)); },
  'inst-sel-delete'() { deleteInstruments(filteredInstruments().filter(i => instSelected.has(i.id)).map(i => i.id), true); },
  'inst-sel-clear'() {
    instSelected.clear();
    refreshInstruments();
  },
  'calc-dates'() { calculateSwapDates(); },
  'schedule-add'() { openScheduleSheet(null); },
  'schedule-edit'(el) { openScheduleSheet(Number(el.dataset.i)); },
  'schedule-del'(el) {
    form.draft.tradingSchedule.splice(Number(el.dataset.i), 1);
    refreshFormBody('[data-act="schedule-add"]');
    updateDock();
  },
  'list-add'(el) {
    const key = el.dataset.list;
    (form.draft[key] || (form.draft[key] = [])).push(LIST_BLANKS[key]());
    refreshFormBody(`[data-act="list-add"][data-list="${key}"]`);
    updateDock();
  },
  'list-del'(el) {
    const key = el.dataset.list;
    form.draft[key].splice(Number(el.dataset.i), 1);
    form.errors = Object.fromEntries(Object.entries(form.errors).filter(([k]) => !k.startsWith(`${key}.`)));
    refreshFormBody(`[data-act="list-add"][data-list="${key}"]`);
    updateDock();
  },
  'category-add'() { openCategorySheet(); },
  'category-del'(el) {
    form.draft.categoryLevels.splice(Number(el.dataset.i), 1);
    refreshFormBody('[data-act="category-add"]');
    updateDock();
  },
  'state-eod'() { performEodActions(); },
  'state-resolve'() { performResolution(); },
  'state-undo-resolve'() { undoResolution(); },
  'history-filter'() {
    historyList.from = $('#historyFrom').value;
    historyList.to = $('#historyTo').value;
    historyList.page = 0;
    listCtl.refresh();
  },
  'history-reset'() {
    Object.assign(historyList, todayRange(), { page: 0 });
    [['#historyFrom', historyList.from], ['#historyTo', historyList.to]].forEach(([selector, value]) => {
      const input = $(selector);
      input.value = value;
      syncDateButton(input);
    });
    listCtl.refresh();
  },
  'history-view'(el) { openHistoryDetail(instrumentById(param('id')), el.dataset.time); },
  'book-search'() {
    const value = $('#bookSearch').value.trim();
    if (value) go(bookHref(value));
  },
  'book-cancel'(el) { cancelBookOrder(el.dataset.order, el.dataset.sym); },
  'book-cancel-all'(el) { cancelAllBookOrders(el.dataset.sym); },
  'product-save-create'() {
    form.saveAndCreate = true;
    submitProduct();
  },
  'product-remove'() { removeProduct(); },
  'calendar-today'() {
    calendarView.anchor = isoDate(new Date());
    renderCalendars();
  },
  'calendar-move'(el) { moveCalendar(Number(el.dataset.d)); },
  'calendar-view'(el) {
    calendarView.view = el.dataset.view;
    renderCalendars();
  },
  'calendar-manage'() { openCalendarManager(); },
  'holiday-add'() { openHolidaySheet(); },
  'holiday-open'(el) { openHolidayEvent(el.dataset.id); },
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('input[data-filter]') && t.type === 'search') {
    instList[t.dataset.filter] = t.value;
    instList.page = 0;
    refreshInstruments();
    return;
  }
  if (form && form.module && t.dataset.field && !t.closest('#sheet')) syncMirrors(t.dataset.field);
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-filter]') && t.type !== 'search') {
    instList[t.dataset.filter] = t.value;
    instList.page = 0;
    if (t.dataset.filter === 'type') {
      if (t.value !== IT.IRS) INSTRUMENT_FILTERS.filter(f => f.irs).forEach(f => { instList[f.k] = ''; });
      refreshInstrumentFilters();
      enhanceSelects();
      $('[data-filter="type"]').focus();
    }
    refreshInstruments();
    return;
  }
  if (t.id === 'instCheckAll') {
    $$('.inst-check').forEach(box => {
      box.checked = t.checked;
      if (t.checked) instSelected.add(box.value); else instSelected.delete(box.value);
    });
    refreshSelection();
    return;
  }
  if (t.classList.contains('inst-check')) {
    if (t.checked) instSelected.add(t.value); else instSelected.delete(t.value);
    refreshSelection();
    return;
  }
  if (t.id === 'csvFile') {
    if (t.files[0]) handleSettlementFile(t.files[0]);
    t.value = '';
    return;
  }
  if (!form || !form.module || t.closest('#sheet')) return;
  if (t.dataset.multi) {
    const key = t.dataset.multi;
    const current = getPath(form.draft, key) || [];
    setPath(form.draft, key, t.checked ? [...current, t.value] : current.filter(x => x !== t.value));
    syncMirrors(key);
    updateDock();
    return;
  }
  if (t.dataset.holiday) {
    const current = form.draft.holidayCalendars || [];
    form.draft.holidayCalendars = t.checked ? [...current, t.dataset.holiday] : current.filter(x => x !== t.dataset.holiday);
    updateDock();
    return;
  }
  if (t.dataset.field) syncMirrors(t.dataset.field);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'bookSearch') {
    e.preventDefault();
    ACT['book-search']();
  }
});
