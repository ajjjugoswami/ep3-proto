'use strict';

const BOOK_FIRMS = [['Connamara Trading', 'CT-Main', 'alex.morgan'], ['Connamara Trading', 'CT-Prop', 'riley.chen'], ['A1 Trading', 'A1-Main', 'a1.desk'], ['Northline Capital', 'NL-House', 'nl.trader']];

function bookOf(inst) {
  if (inst.book) return inst.book;
  const last = Number((inst.stats || {}).lastPrice);
  if (!Number.isFinite(last) || !last || !['Open', 'Preopen', 'Halted', 'Suspended'].includes(inst.state)) return (inst.book = { limit: [], stop: [] });
  const seed = hashText(inst.id);
  const step = Number(inst.minimumPriceIncrement) || 0.01;
  const decimals = decimalsOf(inst.minimumPriceIncrement);
  const order = (prefix, n) => `${prefix}${String((seed + n * 7919) % 900000 + 100000)}`;
  const side = n => BOOK_FIRMS[(seed + n) % BOOK_FIRMS.length];
  const level = (n, stop) => {
    const buy = side(n);
    const sell = side(n + 1);
    return {
      buyorderid: order('B', n + (stop ? 40 : 0)), buyFirm: buy[0], buyAccount: buy[1], buyUser: buy[2], qtyToBuy: String(1 + (seed + n) % 40),
      priceToBuy: (last - step * (n + 1) * 2).toFixed(decimals), sellorderid: order('S', n + (stop ? 40 : 0)), sellFirm: sell[0], sellAccount: sell[1], sellUser: sell[2], qtyToSell: String(1 + (seed + n * 3) % 40),
      priceToSell: (last + step * (n + 1) * 2).toFixed(decimals),
      ...(stop ? { stopBuyPrice: (last + step * (n + 6) * 2).toFixed(decimals), stopSellPrice: (last - step * (n + 6) * 2).toFixed(decimals) } : {}),
    };
  };
  return (inst.book = { limit: Array.from({ length: 6 }, (_, n) => level(n, false)), stop: Array.from({ length: 2 }, (_, n) => level(n, true)) });
}

function orderCell(id, sym) {
  if (!id) return '';
  return `<button class="link-btn mono" type="button" data-act="nav-soon" data-label="Order Search">${esc(id)}</button>
    <button class="icon-btn danger book-cancel" type="button" data-act="book-cancel" data-order="${esc(id)}" data-sym="${esc(sym)}" aria-label="Cancel ${esc(id)}" title="Cancel Order">${icon('x')}</button>`;
}

function bookTableHTML(rows, inst, isStop) {
  if (!rows.length) return '<div class="card empty small"><p>No resting orders.</p></div>';
  return `<div class="card table-scroll"><table class="tbl tbl-wide book-table">
    <thead><tr>
      <th class="buy">Buy Order ID</th><th class="buy">Firm</th><th class="buy">Account</th><th class="buy">User</th><th class="buy num">Qty to Buy</th><th class="buy num">Limit Buy Px</th>
      ${isStop ? '<th class="buy num">Stop Buy Px</th><th class="sell num">Stop Sell Px</th>' : ''}
      <th class="sell num">Limit Sell Px</th><th class="sell num">Qty to Sell</th><th class="sell">Firm</th><th class="sell">Account</th><th class="sell">User</th><th class="sell">Sell Order ID</th>
    </tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td class="buy">${orderCell(r.buyorderid, inst.id)}</td>
      <td class="buy">${r.buyorderid ? esc(r.buyFirm) : ''}</td><td class="buy">${r.buyorderid ? esc(r.buyAccount) : ''}</td><td class="buy">${r.buyorderid ? esc(r.buyUser) : ''}</td>
      <td class="buy num">${r.buyorderid ? esc(r.qtyToBuy) : ''}</td><td class="buy num">${r.buyorderid ? esc(px(inst, r.priceToBuy)) : ''}</td>
      ${isStop ? `<td class="buy num">${r.buyorderid ? esc(px(inst, r.stopBuyPrice)) : ''}</td><td class="sell num">${r.sellorderid ? esc(px(inst, r.stopSellPrice)) : ''}</td>` : ''}
      <td class="sell num">${r.sellorderid ? esc(px(inst, r.priceToSell)) : ''}</td><td class="sell num">${r.sellorderid ? esc(r.qtyToSell) : ''}</td>
      <td class="sell">${r.sellorderid ? esc(r.sellFirm) : ''}</td><td class="sell">${r.sellorderid ? esc(r.sellAccount) : ''}</td><td class="sell">${r.sellorderid ? esc(r.sellUser) : ''}</td>
      <td class="sell">${orderCell(r.sellorderid, inst.id)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderBooksPage() {
  const symbol = param('instrumentId') || '';
  const inst = symbol ? instrumentById(symbol) : null;
  document.title = symbol ? `${symbol} Book · EP3 Admin` : 'Book · EP3 Admin';
  const book = inst ? bookOf(inst) : null;
  const hasOrders = book && (book.limit.length || book.stop.length);
  let body = '<div class="card empty"><h3>Find a book</h3><p>Enter an Instrument ID to see its limit and stop orders.</p></div>';
  if (symbol && !inst) body = '<div class="card empty"><h3>No instrument found</h3><p>Sorry, but we didn’t find any Instrument with that ID.</p></div>';
  if (inst) {
    body = `<section class="section"><div class="section-head"><h2 class="section-title">Limit Book</h2></div>${bookTableHTML(book.limit, inst, false)}</section>
      <section class="section tab-block"><div class="section-head"><h2 class="section-title">Stop Book</h2></div>${bookTableHTML(book.stop, inst, true)}</section>`;
  }
  $('#view').innerHTML = `<div class="detail-page">
    ${moduleHeadHTML('instruments', hasOrders ? `<button class="btn btn-gray" type="button" data-act="book-cancel-all" data-sym="${esc(inst.id)}">Cancel All Orders</button>` : '', inst ? `${inst.id} Book` : 'Unaggregated Book')}
    <div class="detail-scroll">
      <div class="filters">
        <label class="filter-field filter-search"><span>Instrument ID</span>
          <div class="search">${icon('search')}<input class="field" id="bookSearch" type="search" list="bookIds" placeholder="Instrument ID" value="${esc(symbol)}" autocomplete="off" spellcheck="false"></div>
        </label>
        <datalist id="bookIds">${market.instruments.map(i => `<option value="${esc(i.id)}"></option>`).join('')}</datalist>
        <button class="btn btn-primary" type="button" data-act="book-search">Search</button>
      </div>
      ${body}
    </div>
  </div>`;
}

async function cancelBookOrder(orderId, symbol) {
  const inst = instrumentById(symbol);
  const ok = await ask({ title: `Cancel ${orderId}?`, text: 'Are you sure you want to cancel this order?', confirm: 'Cancel Order', danger: true, glyph: 'x' });
  if (!ok) return;
  const book = bookOf(inst);
  ['limit', 'stop'].forEach(kind => {
    book[kind].forEach(row => {
      if (row.buyorderid === orderId) row.buyorderid = '';
      if (row.sellorderid === orderId) row.sellorderid = '';
    });
    book[kind] = book[kind].filter(row => row.buyorderid || row.sellorderid);
  });
  saveMarket();
  route();
  toast(`Submitted cancel for ${orderId}.`);
}

async function cancelAllBookOrders(symbol) {
  const inst = instrumentById(symbol);
  const ok = await ask({ title: `Cancel all orders for ${symbol}?`, text: 'This submits a mass cancel for every resting order in this book.', confirm: 'Cancel All Orders', danger: true, glyph: 'stop' });
  if (!ok) return;
  inst.book = { limit: [], stop: [] };
  saveMarket();
  route();
  toast(`Submitted mass cancel for ${symbol}.`);
}
