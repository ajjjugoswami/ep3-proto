'use strict';

const TIP_GAP = 6;
const TIP_MARGIN = 8;
let openTip = null;

const tipHTML = (tip, values) => {
  const text = typeof tip === 'function' ? tip(values) : tip;
  if (!text) return '';
  return `<button class="tip" type="button" tabindex="-1" data-act="tip" data-tip="${esc(text)}" aria-label="${esc(text)}">${icon('help')}</button>`;
};

function hideTip() {
  if (!openTip) return;
  openTip.pop.remove();
  openTip = null;
}

function showTip(btn) {
  if (openTip && openTip.btn === btn) return;
  hideTip();
  const pop = document.createElement('div');
  pop.className = 'tip-pop';
  pop.setAttribute('role', 'tooltip');
  pop.textContent = btn.dataset.tip;
  (btn.closest('dialog') || document.body).append(pop);
  const anchor = btn.getBoundingClientRect();
  const size = pop.getBoundingClientRect();
  const above = anchor.top - size.height - TIP_GAP;
  const left = anchor.left + anchor.width / 2 - size.width / 2;
  pop.style.left = `${Math.max(TIP_MARGIN, Math.min(left, innerWidth - size.width - TIP_MARGIN))}px`;
  pop.style.top = `${above < TIP_MARGIN ? anchor.bottom + TIP_GAP : above}px`;
  openTip = { btn, pop };
}

const TIP_TARGETS = '.tip, .chart-hit';

document.addEventListener('mouseover', e => {
  const btn = e.target.closest && e.target.closest(TIP_TARGETS);
  if (btn) showTip(btn);
  else hideTip();
});

document.addEventListener('focusin', e => {
  if (e.target.matches && e.target.matches('.chart-hit')) showTip(e.target);
});

document.addEventListener('focusout', e => {
  if (e.target.matches && e.target.matches('.chart-hit')) hideTip();
});

document.addEventListener('click', e => {
  if (!e.target.closest(TIP_TARGETS)) hideTip();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideTip();
});
