'use strict';

const chartSpecs = new Map();
let chartObserver = null;

function chartSlotHTML(key, draw, cls = '') {
  chartSpecs.set(key, draw);
  return `<div class="chart ${cls}" data-chart="${esc(key)}"></div>`;
}

function drawChart(el) {
  const draw = chartSpecs.get(el.dataset.chart);
  const width = Math.floor(el.clientWidth);
  const height = Math.floor(el.clientHeight);
  const size = `${width}x${height}`;
  if (!draw || !width || el.chartSize === size) return;
  el.chartSize = size;
  el.innerHTML = draw(width, height);
}

function paintCharts() {
  if (chartObserver) chartObserver.disconnect();
  chartObserver = new ResizeObserver(entries => entries.forEach(entry => drawChart(entry.target)));
  $$('[data-chart]').forEach(el => {
    drawChart(el);
    chartObserver.observe(el);
  });
}

function niceStep(max, count) {
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(step => step >= raw);
}

const columnPath = (x, y, w, h) => {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

function columnChartSVG(points, { width, height = 220, format, label, labelEvery = 1 }) {
  const pad = { top: 10, right: 2, bottom: 26, left: 48 };
  const max = Math.max(0, ...points.map(p => p.value)) || 1;
  const step = niceStep(max, 4);
  const top = Math.ceil(max / step) * step;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const band = plotW / points.length;
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const yOf = v => pad.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const every = Math.max(labelEvery, Math.ceil(42 / band));
  return `<svg class="chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="${esc(label)}">
    <defs><linearGradient id="chart-col-fill" x1="0" y1="0" x2="0" y2="1"><stop class="chart-stop-1" offset="0"/><stop class="chart-stop-2" offset="1"/></linearGradient></defs>
    ${ticks.map(v => `<line class="${v ? 'chart-grid' : 'chart-axis'}" x1="${pad.left}" x2="${width - pad.right}" y1="${yOf(v)}" y2="${yOf(v)}"/>
      <text class="chart-tick" x="${pad.left - 8}" y="${yOf(v)}" dy="0.32em" text-anchor="end">${esc(format(v))}</text>`).join('')}
    ${points.map((p, i) => {
      const x = pad.left + i * band;
      const h = yOf(0) - yOf(p.value);
      const showLabel = (points.length - 1 - i) % every === 0;
      return `<g class="chart-bar">
        ${h > 0 ? `<path class="chart-col" d="${columnPath(x + (band - barW) / 2, yOf(p.value), barW, h)}"/>` : ''}
        <rect class="chart-hit" x="${x}" y="${pad.top}" width="${band}" height="${plotH}" tabindex="0" data-tip="${esc(p.tip)}" aria-label="${esc(p.tip.replace(/\n/g, ', '))}"/>
        ${showLabel ? `<text class="chart-tick" x="${x + band / 2}" y="${height - 8}" text-anchor="middle">${esc(p.short)}</text>` : ''}
      </g>`;
    }).join('')}
  </svg>`;
}

function sparklineSVG(values, { width = 88, height = 28 } = {}) {
  if (values.length < 2) return '';
  const pad = 5;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => [pad + (i * (width - pad * 2)) / (values.length - 1), pad + (1 - (v - min) / span) * (height - pad * 2)]);
  const [lastX, lastY] = pts[pts.length - 1];
  return `<svg class="spark" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <polyline class="spark-line" points="${pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/>
    <circle class="spark-dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3"/>
  </svg>`;
}

function segmentedBarSVG(parts, width, height = 8) {
  const shown = parts.filter(p => p.value > 0);
  const total = shown.reduce((sum, p) => sum + p.value, 0);
  if (!total) return '';
  const gap = 2;
  const room = width - gap * (shown.length - 1);
  let x = 0;
  return `<svg class="seg-bar" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${shown.map(p => {
    const w = Math.max(height, (p.value / total) * room);
    const rect = `<rect class="${esc(p.tone)}" x="${x.toFixed(1)}" y="0" width="${Math.min(w, width - x).toFixed(1)}" height="${height}" rx="${height / 2}"/>`;
    x += w + gap;
    return rect;
  }).join('')}</svg>`;
}

const chartTableHTML = (caption, headers, rows) => `<table class="sr">
  <caption>${esc(caption)}</caption>
  <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`;
