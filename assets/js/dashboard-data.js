'use strict';

const DASH_SNAPSHOT = {
  users: {
    byState: { Active: 2394611, Suspended: 18195 },
    byRole: {
      Trading: 1486220, 'Trading Read Only': 512904, 'Market Data': 318447, 'Drop Copy': 71388, Broker: 22615,
      'Supervisor Read Only Admin': 612, 'Supervisor Limited Member Admin': 248, 'Supervisor Onboarding Admin': 186,
      'Supervisor Exchange Operation Admin': 121, 'Supervisor Admin': 65,
    },
  },
  accounts: { byState: { Active: 3058214, Suspended: 122187, 'Liquidate Only': 4151 } },
  instruments: {
    byState: { Pending: 3412, Closed: 41875, Open: 96530, Preopen: 8214, Suspended: 162, Expired: 33904, Terminated: 61288, Halted: 37, 'Match And Close Auction': 96 },
    settlementToApprove: 1284,
  },
  notional24h: 41.8e9,
};

const DASH_TOP_LIMIT = 6;
const DASH_HOLIDAY_LIMIT = 5;

const sumOf = values => values.reduce((sum, n) => sum + n, 0);
const countWhere = (rows, test) => rows.filter(test).length;
const liveFirms = () => firms.filter(f => !f.deleted);
const listedInstruments = () => market.instruments.filter(i => i.state !== 'Terminated');
const notionalOf = i => Number((i.stats || {}).notionalTraded) || 0;
const countBy = (rows, keys, read) => Object.fromEntries(keys.map(k => [k, countWhere(rows, r => read(r) === k)]));

function statsAsOf() {
  const at = new Date();
  at.setMinutes(at.getMinutes() - (at.getMinutes() % 5), 0, 0);
  return isoDateTime(at);
}

function getDashboardStats() {
  const { users, accounts, instruments } = DASH_SNAPSHOT;
  const live = liveFirms();
  return {
    asOf: statsAsOf(),
    firms: { total: live.length, byState: countBy(live, ['active', 'suspended'], f => f.state), byType: countBy(live, Object.keys(TYPES), f => f.type) },
    users: { total: sumOf(Object.values(users.byState)), byState: users.byState, byRole: users.byRole },
    accounts: { total: sumOf(Object.values(accounts.byState)), byState: accounts.byState },
    instruments: { listed: sumOf(Object.values(instruments.byState)) - instruments.byState.Terminated, byState: instruments.byState, settlementToApprove: instruments.settlementToApprove },
    products: market.products.length,
  };
}

function getHourlyNotional() {
  const histories = listedInstruments().map(historyRows).filter(rows => rows.length >= 24);
  if (!histories.length) return [];
  const hours = Array.from({ length: 24 }, (_, k) => {
    const n = 23 - k;
    return { at: histories[0][n].transactionTime, value: sumOf(histories.map(rows => Number(rows[n].notionalTraded))) };
  });
  const scale = DASH_SNAPSHOT.notional24h / (sumOf(hours.map(h => h.value)) || 1);
  return hours.map(h => ({ at: h.at, value: h.value * scale }));
}

function listTopInstruments(limit = DASH_TOP_LIMIT) {
  return sortRows(listedInstruments().filter(i => notionalOf(i) > 0), notionalOf, -1).slice(0, limit).map(i => ({
    inst: i,
    notional: notionalOf(i),
    volume: Number(i.stats.sharesTraded) || 0,
    trend: historyRows(i).slice(0, 24).reverse().map(row => Number(row.lastTradePx)),
  }));
}

function listUpcomingHolidays(limit = DASH_HOLIDAY_LIMIT) {
  const today = isoDate(new Date());
  return market.holidays.filter(h => h.start.slice(0, 10) >= today).sort((a, b) => a.start.localeCompare(b.start)).slice(0, limit);
}
