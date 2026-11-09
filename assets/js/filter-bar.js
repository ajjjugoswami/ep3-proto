'use strict';

let openFilter = null;
const filterDateInput = document.createElement('input');
filterDateInput.type = 'date';
filterDateInput.dataset.enhanced = '1';

const filterOptionsOf = x => (typeof x.options === 'function' ? x.options() : x.options).map(o => (typeof o === 'string' ? { value: o, label: o } : o));
const shownListFilters = () => listCtl.filters().filter(x => !x.when || x.when(listCtl.state));
const filterKeys = () => [listCtl.search.k, ...listCtl.filters().map(x => x.k)];
const hasFilterValue = key => String(listCtl.state[key] || '').trim() !== '';
const anyListFilter = () => filterKeys().some(hasFilterValue);
const filterButtonFor = key => $(`[data-act="fb-open"][data-k="${key}"]`);

function filterValueLabel(x) {
  const value = String(listCtl.state[x.k] || '').trim();
  if (!value) return '';
  if (x.date) return formatWhen(value);
  if (x.options) {
    const option = filterOptionsOf(x).find(o => o.value === value);
    return option ? option.label : value;
  }
  return value;
}

const FILTER_INLINE_MAX = 4;

function filterGroups() {
  const shown = shownListFilters();
  const inline = shown.filter(x => !x.more).slice(0, FILTER_INLINE_MAX);
  return { inline, more: shown.filter(x => !inline.includes(x)) };
}

function filterIdleLabel(x) {
  const name = x.short || x.label;
  return x.options && filterOptionsOf(x).length <= 2 ? `${name}: All` : name;
}

function filterButtonHTML(x) {
  const name = x.short || x.label;
  const value = filterValueLabel(x);
  const attrs = `type="button" data-act="fb-open" data-k="${x.k}" aria-haspopup="${x.options ? 'listbox' : 'dialog'}" aria-expanded="false"`;
  if (!value) {
    return `<button class="fb" ${attrs} aria-label="Filter by ${esc(x.label)}"><span class="fb-text">${esc(filterIdleLabel(x))}</span>${icon('down')}</button>`;
  }
  return `<button class="fb fb-on" ${attrs} aria-label="${esc(x.label)}: ${esc(value)}. Change filter"><span class="fb-tag" aria-hidden="true">${esc(name)}</span><span class="fb-value" title="${esc(value)}">${esc(value)}</span>${icon('down')}</button>`;
}

function filterToolsHTML(more) {
  const open = !!listCtl.state.moreFilters;
  const hiddenSet = more.filter(x => hasFilterValue(x.k)).length;
  const moreBtn = more.length
    ? `<button class="fb fb-tool" type="button" data-act="fb-more" aria-expanded="${open}">${icon('filter')}Filters${hiddenSet ? `<span class="fb-count" aria-label="${hiddenSet} set">${hiddenSet}</span>` : ''}</button>`
    : '';
  return `${moreBtn}<button class="fb fb-tool" type="button" data-act="fb-clear" ${anyListFilter() ? '' : 'disabled'}>${icon('restore')}Reset</button>`;
}

function filterButtonsHTML() {
  const { inline, more } = filterGroups();
  return `${inline.map(filterButtonHTML).join('')}${filterToolsHTML(more)}`;
}

function moreFiltersHTML() {
  const { more } = filterGroups();
  return more.length && listCtl.state.moreFilters ? more.map(filterButtonHTML).join('') : '';
}

function toggleMoreFilters() {
  listCtl.state.moreFilters = !listCtl.state.moreFilters;
  refreshFilterBar();
  const btn = $('[data-act="fb-more"]');
  if (btn) btn.focus();
}

function filterBarHTML(end = '') {
  const { search, state, noun } = listCtl;
  return `<div class="fbar" role="search" aria-label="Filter ${esc(noun)}">
    <div class="search fbar-search">
      ${icon('search')}
      <input class="field" type="search" data-fb-search="${search.k}" ${search.exact ? 'data-fb-exact' : ''} placeholder="${esc(search.ph)}" value="${esc(state[search.k] || '')}" aria-label="${esc(search.label)}" autocomplete="off" spellcheck="false">
      <kbd aria-hidden="true">/</kbd>
      ${search.exact ? '<kbd class="kbd-enter" aria-hidden="true">Enter ↵</kbd>' : ''}
    </div>
    <div class="fbar-filters" id="fbarFilters">${filterButtonsHTML()}</div>
    ${end ? `<div class="fbar-end">${end}</div>` : ''}
    <div class="fbar-more" id="fbarMore" role="group" aria-label="More filters">${moreFiltersHTML()}</div>
  </div>`;
}

function refreshFilterBar() {
  const box = $('#fbarFilters');
  if (box) box.innerHTML = filterButtonsHTML();
  const more = $('#fbarMore');
  if (more) more.innerHTML = moreFiltersHTML();
  if (openFilter) {
    const btn = filterButtonFor(openFilter.key);
    if (btn) { btn.setAttribute('aria-expanded', 'true'); openFilter.btn = btn; }
  }
}

function setListFilter(key, value) {
  const { state } = listCtl;
  state[key] = value;
  state.page = 0;
  if (listCtl.onFilter) listCtl.onFilter(key, value);
  refreshFilterBar();
  listCtl.refresh();
}

function onSearchInput(input) {
  const key = input.dataset.fbSearch;
  if (input.dataset.fbExact === undefined) { setListFilter(key, input.value); return; }
  const value = input.value.trim();
  if (!value && listCtl.state[key]) { setListFilter(key, ''); return; }
  input.classList.toggle('is-pending', value !== String(listCtl.state[key] || ''));
}

function commitSearch(input) {
  input.classList.remove('is-pending');
  setListFilter(input.dataset.fbSearch, input.value.trim());
}

function clearListFilters() {
  closeFilterPop(false);
  filterKeys().forEach(key => { listCtl.state[key] = ''; });
  listCtl.state.page = 0;
  if (listCtl.onFilter) listCtl.onFilter('', '');
  const input = $('[data-fb-search]');
  if (input) { input.value = ''; input.classList.remove('is-pending'); }
  refreshFilterBar();
  listCtl.refresh();
  if (input) input.focus();
}

function closeFilterPop(refocus = true) {
  if (!openFilter) return;
  const { pop, key } = openFilter;
  openFilter = null;
  pop.remove();
  const btn = filterButtonFor(key);
  if (!btn) return;
  btn.setAttribute('aria-expanded', 'false');
  if (refocus) btn.focus({ preventScroll: true });
}

function placeFilterPop(pop, btn) {
  const rect = btn.getBoundingClientRect();
  const size = pop.getBoundingClientRect();
  const below = rect.bottom + 6;
  pop.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - size.width - 8))}px`;
  pop.style.top = `${below + size.height > innerHeight - 8 ? Math.max(8, rect.top - size.height - 6) : below}px`;
}

const FILTER_OPTION_LIMIT = 50;

function optionRowsHTML(options, value, needle) {
  const matches = needle ? options.filter(o => o.label.toLowerCase().includes(needle)) : options;
  const shown = matches.slice(0, FILTER_OPTION_LIMIT);
  const selected = !needle && options.find(o => o.value === value);
  if (selected && !shown.includes(selected)) shown.unshift(selected);
  const optRow = (v, label, on) => `<button class="fb-opt" type="button" role="option" aria-selected="${on}" data-v="${esc(v)}"><span>${esc(label)}</span>${icon('check')}</button>`;
  const rows = (needle ? '' : optRow('', 'All', !value)) + shown.map(o => optRow(o.value, o.label, o.value === value)).join('');
  const note = !matches.length ? 'No matches.'
    : matches.length > shown.length ? `Showing ${shown.length} of ${matches.length.toLocaleString('en-US')}. Type to narrow the list.` : '';
  return { rows, note };
}

function optionsPopHTML(x) {
  const options = filterOptionsOf(x);
  const { rows, note } = optionRowsHTML(options, listCtl.state[x.k], '');
  return `<p class="fb-pop-title">${esc(x.label)}</p>
    ${options.length > 7 ? `<div class="search fb-pop-search">${icon('search')}<input class="field" type="search" data-fb-find placeholder="Search" aria-label="Search ${esc(x.label)}" autocomplete="off"></div>` : ''}
    <div class="fb-opts" role="listbox" aria-label="${esc(x.label)}">${rows}</div>
    <p class="fb-empty" ${note ? '' : 'hidden'}>${esc(note)}</p>`;
}

const textPopHTML = x => `<label class="fb-pop-field"><span>${esc(x.label)}</span>
    <input class="field" type="search" data-fb-text placeholder="${esc(x.ph || 'Contains…')}" value="${esc(listCtl.state[x.k] || '')}" autocomplete="off" spellcheck="false">
  </label>
  <div class="fb-pop-foot"><button class="btn btn-primary btn-small" type="button" data-fb-done>${x.exact ? 'Apply' : 'Done'}</button></div>`;

function wireOptionsPop(pop, x) {
  const find = $('[data-fb-find]', pop);
  const visibleOpts = () => $$('.fb-opt', pop);
  pop.addEventListener('click', e => {
    const opt = e.target.closest('.fb-opt');
    if (!opt) return;
    const value = opt.dataset.v === listCtl.state[x.k] ? '' : opt.dataset.v;
    closeFilterPop(false);
    setListFilter(x.k, value);
    const btn = filterButtonFor(x.k);
    if (btn && e.detail === 0) btn.focus({ preventScroll: true });
  });
  if (find) {
    const options = filterOptionsOf(x);
    find.addEventListener('input', () => {
      const { rows, note } = optionRowsHTML(options, listCtl.state[x.k], find.value.trim().toLowerCase());
      $('.fb-opts', pop).innerHTML = rows;
      $('.fb-empty', pop).textContent = note;
      $('.fb-empty', pop).hidden = !note;
    });
  }
  pop.addEventListener('keydown', e => {
    const opts = visibleOpts();
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (opts.length) opts[(i + 1) % opts.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0 && find) find.focus(); else if (opts.length) opts[(i - 1 + opts.length) % opts.length].focus(); }
  });
  (find || $('.fb-opt[aria-selected="true"]', pop) || $('.fb-opt', pop)).focus();
}

function wireTextPop(pop, x) {
  const input = $('[data-fb-text]', pop);
  const finish = () => {
    if (x.exact) setListFilter(x.k, input.value.trim());
    closeFilterPop();
  };
  if (!x.exact) input.addEventListener('input', () => setListFilter(x.k, input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finish(); } });
  $('[data-fb-done]', pop).addEventListener('click', finish);
  input.focus();
}

function openFilterDate(btn, x) {
  filterDateInput.value = listCtl.state[x.k] || '';
  filterDateInput._btn = btn;
  filterDateInput.setAttribute('aria-label', x.label);
  filterDateInput.onchange = () => {
    setListFilter(x.k, filterDateInput.value);
    const again = filterButtonFor(x.k);
    if (again) filterDateInput._btn = again;
  };
  openDatePicker(filterDateInput);
}

function openFilterPop(btn) {
  const x = shownListFilters().find(f => f.k === btn.dataset.k);
  if (!x) return;
  if (openFilter && openFilter.key === x.k) { closeFilterPop(); return; }
  closeMenu(false);
  closeSelect(false);
  closeDatePicker(false);
  closeFilterPop(false);
  if (x.date) { openFilterDate(btn, x); return; }
  const pop = document.createElement('div');
  pop.className = 'fb-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `Filter by ${x.label}`);
  pop.innerHTML = x.options ? optionsPopHTML(x) : textPopHTML(x);
  document.body.append(pop);
  placeFilterPop(pop, btn);
  openFilter = { key: x.k, pop, btn };
  btn.setAttribute('aria-expanded', 'true');
  pop.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFilterPop(); }
    if (e.key === 'Tab') closeFilterPop(false);
  });
  if (x.options) wireOptionsPop(pop, x);
  else wireTextPop(pop, x);
}

document.addEventListener('mousedown', e => {
  if (openFilter && !openFilter.pop.contains(e.target) && !e.target.closest('[data-act="fb-open"]')) closeFilterPop(false);
});

window.addEventListener('scroll', e => {
  if (openFilter && !(e.target.closest && e.target.closest('.fb-pop'))) closeFilterPop(false);
}, { passive: true, capture: true });

window.addEventListener('resize', () => closeFilterPop(false));
