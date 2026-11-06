'use strict';

const weekdayHours = () => [{ days: [1, 2, 3, 4, 5], from: 28800, to: 61200, state: 'Open', periodicity: PERIODICITY.weekdays }];
const roundTheClock = () => [{ days: [0, 1, 2, 3, 4, 5, 6], from: 0, to: 86400, state: 'Open', periodicity: PERIODICITY.everyday }];

const marketDefaults = () => ({
  externalSymbol: '', cfiCode: '', unitOfMeasure: '', unitOfMeasureQty: '', tradingSchedule: weekdayHours(), holidayCalendars: ['US Federal'],
  tradeDayRollScheduleType: ROLL_TYPES.unset, tradeDayRollConvention: OPT.rollConvention[0],
  basecurrency: 'USD', clearingHouse: 'Connamara Clearing House', multiplier: '1', tradeSettlementPeriod: '1', instrumentProductType: '',
  minimumPriceIncrement: '0.01', minimumTradeQuantity: '1', minimumUnaffiliatedFirms: '0', setBlockTradeThreshold: false,
  settlementPriceLogic: 'VWAP', settlementPriceCalculationEndingMethod: '', settlementPriceCalculationRequiresApproval: false,
  marketOrderProtectionBasisPoints: '', skipRiskAndCurrencyChecks: false, subTypes: [],
});

const swapDefaults = () => ({
  instrumentProductType: 'Money Market', minimumPriceIncrement: '0.0001', minimumTradeQuantity: '1000000', multiplier: '1',
  tenor: '5Y', tenorTimePeriod: 'Years', sideConvention: 'Buy', effectiveDateOffset: '2',
  rollAndPaymentDateHolidayCalendarsList: ['New York', 'London'], floatHolidayCalendarsList: ['London'], floatFixingDateHolidayCalendarsList: ['London'],
  effectiveDateBusinessDayConvention: 'Modified Following', maturityDateBusinessDayConvention: 'Modified Following',
  fixedPaymentFrequency: 'Semiannually', fixedCompoundingMethod: 'None', fixedRollConvention: 'EOM', fixedDayCountConvention: '30 360', fixedBusinessDayConvention: 'Modified Following', fixedPaymentDateRelativeTo: 'Calculation Period End Date',
  floatingRateIndex: '3M USD LIBOR', floatingRateIndexTenor: '3', floatDayCountConvention: 'ACT 360', floatCompoundingMethod: 'None', floatPaymentFrequency: 'Quarterly', floatRateResetFrequency: 'Quarterly',
  floatResetDateBusinessDayConvention: 'Modified Following', floatBusinessDayConvention: 'Modified Following', floatRollConvention: 'EOM', floatFixingDatesOffset: '-2', floatResetDateRelativeTo: 'Calculation Period Start Date',
  floatFixingDateBusinessDayConvention: 'Preceding', floatFixingDatesDayType: 'Business', floatPaymentDateRelativeTo: 'Calculation Period End Date',
  startDate: '2026-11-06', swapEffectiveDate: '2026-11-10', maturityDate: '2031-11-10', unadjustedEffectiveDate: '2026-11-10', unadjustedMaturityDate: '2031-11-10',
  fixedFirstUnadjustedPaymentDate: '2027-05-10', firstFloatFixingDate: '2026-11-06', firstFloatResetDate: '2026-11-10', floatFirstUnadjustedPaymentDate: '2027-02-10',
});

const legDefaults = () => Object.assign({}, ...['leg1', 'leg2'].map((leg, i) => ({
  [`${leg}FloatingRateIndex`]: i ? '6M USD LIBOR' : '3M USD LIBOR', [`${leg}FloatingRateIndexTenor`]: i ? '6' : '3', [`${leg}FloatDayCountConvention`]: 'ACT 360', [`${leg}FloatCompoundingMethod`]: 'None',
  [`${leg}FloatRateResetFrequency`]: i ? 'Semiannually' : 'Quarterly', [`${leg}FloatPaymentFrequency`]: i ? 'Semiannually' : 'Quarterly', [`${leg}FloatBusinessDayConvention`]: 'Modified Following',
  [`${leg}FloatResetDateBusinessDayConvention`]: 'Modified Following', [`${leg}FloatResetDateRelativeTo`]: 'Calculation Period Start Date', [`${leg}FloatFixingDateBusinessDayConvention`]: 'Preceding',
  [`${leg}FirstFloatResetDate`]: '2026-11-10', [`${leg}FirstFloatFixingDate`]: '2026-11-06', [`${leg}FloatRollConvention`]: 'EOM', [`${leg}FloatFixingDatesOffset`]: '-2',
  [`${leg}FloatPaymentDateRelativeTo`]: 'Calculation Period End Date', [`${leg}FloatFixingDatesDayType`]: 'Business', [`${leg}FloatFirstUnadjustedPaymentDate`]: i ? '2027-05-10' : '2027-02-10',
})));

const makeProduct = (id, type, description, extra = {}) => ({ id, type, description, categoryLevels: [], ...marketDefaults(), ...extra });
const blankMarketValues = () => ({ tradingSchedule: [], holidayCalendars: [], tradeDayRollScheduleType: ROLL_TYPES.unset, tradeDayRollConvention: OPT.rollConvention[0], setBlockTradeThreshold: false, settlementPriceCalculationRequiresApproval: false, skipRiskAndCurrencyChecks: false, subTypes: [] });

const statsFor = (px, decimals = 2, { preliminary = false, settled = true } = {}) => {
  const fmt = n => n.toFixed(decimals);
  const at = '2026-11-06T09:30';
  return {
    open: fmt(px * 0.996), openSetTime: at, indicativeOpen: fmt(px * 0.995), indicativeOpenSetTime: '2026-11-06T09:25',
    high: fmt(px * 1.012), highSetTime: '2026-11-06T11:42', low: fmt(px * 0.988), lowSetTime: '2026-11-06T10:03',
    close: fmt(px * 1.001), closeSetTime: '2026-11-05T17:00', lastPrice: fmt(px), lastQuantity: '5', lastTradeSetTime: '2026-11-06T13:18',
    sharesTraded: '1240', notionalTraded: (px * 1240).toFixed(2), notionalSetTime: '2026-11-06T13:18',
    ...(settled ? { settlementPrice: fmt(px * 1.002), settlementSetTime: '2026-11-05T17:05' } : {}),
    settlementPreliminary: preliminary, settlementPriceCalculationMethod: settled ? 'VWAP TIER 1' : '', settlementPriceCalculationText: '',
    openInterest: '3120', openInterestSetTime: '2026-11-05T17:05', tradingReferencePrice: fmt(px * 1.002), tradingReferencePriceSetTime: '2026-11-05T17:05',
    markPrice: fmt(px * 1.0005), markPriceSetTime: '2026-11-06T13:15', transactTime: '2026-11-06T13:18',
  };
};

function seedMarket() {
  const products = [
    makeProduct('BTC', IT.FUTURE, 'Bitcoin Futures', { categoryLevels: ['Crypto', 'Bitcoin'], instrumentProductType: 'Currency', tradingSchedule: roundTheClock(), minimumPriceIncrement: '0.5', multiplier: '5', minimumTradeQuantity: '1', cfiCode: 'FFCPSX', setHighPriceLimit: true, highPriceLimit: '250000', setLowOrderLimit: true, lowOrderLimit: '1', setHighOrderLimit: true, highOrderLimit: '5000' }),
    makeProduct('ETH', IT.FUTURE, 'Ether Futures', { categoryLevels: ['Crypto', 'Ether'], instrumentProductType: 'Currency', tradingSchedule: roundTheClock(), minimumPriceIncrement: '0.25', multiplier: '50', cfiCode: 'FFCPSX' }),
    makeProduct('GC', IT.FUTURE, 'Gold Futures', { categoryLevels: ['Commodities', 'Metals', 'Precious'], instrumentProductType: 'Commodity', minimumPriceIncrement: '0.1', multiplier: '100', unitOfMeasure: 'oz_tr', unitOfMeasureQty: '100', clearingHouse: 'MGEX' }),
    makeProduct('BTC-OPT', IT.OPTION, 'Bitcoin Options', { categoryLevels: ['Crypto', 'Bitcoin', 'Options'], tradingSchedule: roundTheClock(), minimumPriceIncrement: '0.5', multiplier: '1' }),
    makeProduct('EURUSD', IT.FOREX, 'Euro / US Dollar Spot', { categoryLevels: ['FX', 'G10'], instrumentProductType: 'Currency', minimumPriceIncrement: '0.00005', minimumTradeQuantity: '1000', fxBaseCurrency: 'EUR', fxQuoteCurrency: 'USD' }),
    makeProduct('USD-IRS', IT.IRS, 'USD Fixed-Float Interest Rate Swaps', { categoryLevels: ['Rates', 'USD'], ...swapDefaults() }),
    makeProduct('USD-FSIRS', IT.FSIRS, 'USD Forward Starting Swaps', { categoryLevels: ['Rates', 'USD'], ...swapDefaults(), forwardStartingPeriod: '1' }),
    makeProduct('USD-FRA', IT.FRA, 'USD Forward Rate Agreements', { categoryLevels: ['Rates', 'USD'], ...swapDefaults(), tenor: '3M', calculationPeriodNumberOfDays: '90', floatFixingDate: '2026-11-06', forwardStartingPeriod: '3' }),
    makeProduct('USD-BASIS', IT.BASIS, 'USD 3s6s Basis Swaps', { categoryLevels: ['Rates', 'USD'], ...swapDefaults(), ...legDefaults(), floatFirstUnadjustedEffectiveDate: '2026-11-10' }),
    makeProduct('USD-OIS', IT.OIS, 'USD Overnight Index Swaps', { categoryLevels: ['Rates', 'USD'], ...swapDefaults(), tenor: '1', tenorTimePeriod: 'Years', paymentDateDayType: 'Business', fixedPaymentFrequency: 'Annually', fixedPaymentDateOffset: '2', floatPaymentDateOffset: '2', forwardStartingPeriodTimePeriod: 'Months' }),
    makeProduct('USD-SPS', IT.SPS, 'USD Single Period Swaps', { categoryLevels: ['Rates', 'USD'], ...swapDefaults(), tenor: '6', tenorTimePeriod: 'Months' }),
    makeProduct('EUR-ZCIS', IT.ZCIS, 'Euro Zero Coupon Inflation Swaps', { categoryLevels: ['Rates', 'Inflation'], ...swapDefaults(), basecurrency: 'EUR', indexSource: 'CPTFEMU', inflationLag: '3', interpolationMethod: 'Monthly', inflationInstrumentName: 'HICPxT', fallbackBondApplicable: true, fixedPaymentDayConvention: 'Following', fixedCalculationPeriodDayConvention: 'Following', floatPaymentDayConvention: 'Following', floatCalculationPeriodDayConvention: 'Following', forwardStartingPeriod: '0', forwardStartingPeriodTimePeriod: 'Months' }),
    makeProduct('USDBRL-NDF', IT.NDF, 'USD / BRL Non Deliverable Forwards', { categoryLevels: ['FX', 'EM'], instrumentProductType: 'Currency', tenor: '3', tenorTimePeriod: 'Months', sideConvention: 'Buy', forwardStartingPeriod: '0', forwardStartingPeriodTimePeriod: 'Days', currency1: 'USD', currency2: 'EUR', exchangedCurrency1: 'USD', exchangedCurrency2: 'EUR', exchangeRateCurrency1: 'USD', exchangeRateCurrency2: 'EUR', exchangeRateQuoteBasis: OPT.quoteBasis[0], fixingQuoteBasis: OPT.quoteBasis[0], settlementCurrency: 'USD', fixingCurrency1: 'USD', fixingCurrency2: 'EUR', valuationDate: '2027-02-05', fixingDate: '2027-02-03' }),
    makeProduct('BTC-SPREAD', IT.MULTILEG, 'Bitcoin Calendar Spreads', { categoryLevels: ['Crypto', 'Bitcoin', 'Spreads'], tradingSchedule: roundTheClock(), minimumPriceIncrement: '0.5' }),
    makeProduct('FED-RATE', IT.EVENT, 'Fed Funds Target Rate Event Contracts', { categoryLevels: ['Events', 'Economics'], minimumPriceIncrement: '0.01', evtAttPayoutType: 'Binary', evtAttEventOutcome: 'Independent', evtAttPayoutValue: '1', evtAttSourceAgency: 'Federal Reserve', evtAttSourceAgencyUrl: 'https://www.federalreserve.gov', evtAttCalculationMethod: 'Value', evtAttStrikeUnit: 'Percentage', evtAttQuestion: 'Will the Federal Funds target rate be above the strike after the December meeting?', evtAttUnderlyingEventSpecification: 'The contract resolves against the upper bound of the target range published after the meeting.', subTypes: [{ symbol: 'YES', buyPriceIncrement: '0.01', sellPriceIncrement: '0.01', buyScale: '100', sellScale: '100', opposingSide: 'As Defined', buyQuantityRatio: '1', sellQuantityRatio: '1', strictLimit: false }, { symbol: 'NO', buyPriceIncrement: '0.01', sellPriceIncrement: '0.01', buyScale: '100', sellScale: '100', opposingSide: 'Opposing', buyQuantityRatio: '1', sellQuantityRatio: '1', strictLimit: false }] }),
    makeProduct('SPX-IDX', IT.DEFAULT, 'S&P 500 Reference Index', { categoryLevels: ['Equities', 'Index'], instrumentProductType: 'Index', clearingHouse: '', minimumTradeQuantity: '', minimumUnaffiliatedFirms: '', tradeSettlementPeriod: '' }),
  ];
  const fromProduct = (productId, id, description, state, extra = {}) => ({ ...instrumentFromProduct(products.find(p => p.id === productId)), id, description, state, ...extra });
  const dated = { startDate: '2026-01-05', startTime: '08:00', lastTradeDate: '2027-12-30T16:00', expirationDate: '2027-12-31T16:00', terminationDate: '2028-01-31' };
  const future = (y, m, d) => ({ maturityDateYear: y, maturityDateMonth: m, maturityDateDay: d });
  const instruments = [
    fromProduct('BTC', 'BTC-DEC26', 'Bitcoin Futures December 2026', 'Open', { ...dated, ...future('2026', '12', '24'), isScheduled: true, stats: statsFor(98450, 1, { preliminary: true }) }),
    fromProduct('BTC', 'BTC-MAR27', 'Bitcoin Futures March 2027', 'Open', { ...dated, ...future('2027', '3', '26'), isScheduled: true, stats: statsFor(99120.5, 1) }),
    fromProduct('BTC', 'BTC-JUN27', 'Bitcoin Futures June 2027', 'Preopen', { ...dated, ...future('2027', '6', '25'), isScheduled: true, stats: statsFor(100210, 1, { settled: false }) }),
    fromProduct('ETH', 'ETH-DEC26', 'Ether Futures December 2026', 'Open', { ...dated, ...future('2026', '12', '24'), isScheduled: true, stats: statsFor(3480.25, 2, { preliminary: true }) }),
    fromProduct('ETH', 'ETH-MAR27', 'Ether Futures March 2027', 'Halted', { ...dated, ...future('2027', '3', '26'), isScheduled: false, stats: statsFor(3512.75, 2) }),
    fromProduct('GC', 'GCZ26', 'Gold Futures December 2026', 'Closed', { ...dated, ...future('2026', '12', ''), isScheduled: true, stats: statsFor(2384.6, 1) }),
    fromProduct('GC', 'GCG27', 'Gold Futures February 2027', 'Pending', { startDate: '2027-01-04', lastTradeDate: '2027-02-24T16:00', expirationDate: '2027-02-26T16:00', ...future('2027', '2', ''), isScheduled: false }),
    fromProduct('BTC-OPT', 'BTC-DEC26-C-100000', 'Bitcoin December 2026 100000 Call', 'Open', { ...dated, ...future('2026', '12', '24'), putOrCall: 'Call', strikePrice: '100000', underlyingInstrumentId: 'BTC-DEC26', isScheduled: true, stats: statsFor(4210.5, 1) }),
    fromProduct('BTC-OPT', 'BTC-DEC26-P-90000', 'Bitcoin December 2026 90000 Put', 'Suspended', { ...dated, ...future('2026', '12', '24'), putOrCall: 'Put', strikePrice: '90000', underlyingInstrumentId: 'BTC-DEC26', isScheduled: false, stats: statsFor(1875, 1) }),
    fromProduct('EURUSD', 'EURUSD-SPOT', 'Euro / US Dollar Spot', 'Open', { ...dated, isScheduled: true, stats: statsFor(1.08425, 5) }),
    fromProduct('USD-IRS', 'USD-IRS-5Y-2611', 'USD 5Y Swap Trade Date Nov 2026', 'Open', { isScheduled: true, stats: statsFor(4.1285, 4) }),
    fromProduct('USD-IRS', 'USD-IRS-10Y-2611', 'USD 10Y Swap Trade Date Nov 2026', 'Pending', { tenor: '10Y', maturityDate: '2036-11-10', unadjustedMaturityDate: '2036-11-10', isScheduled: false }),
    fromProduct('USD-FSIRS', 'USD-FSIRS-1Y5Y', 'USD 1Y Forward 5Y Swap', 'Open', { isScheduled: true, stats: statsFor(4.2155, 4) }),
    fromProduct('USD-FRA', 'USD-FRA-3X6', 'USD 3x6 Forward Rate Agreement', 'Closed', { isScheduled: true, stats: statsFor(4.0375, 4) }),
    fromProduct('USD-BASIS', 'USD-3S6S-5Y', 'USD 3s6s Basis Swap 5Y', 'Open', { isScheduled: true, stats: statsFor(0.1425, 4) }),
    fromProduct('USD-OIS', 'USD-OIS-1Y', 'USD Overnight Index Swap 1Y', 'Open', { isScheduled: true, stats: statsFor(3.9825, 4) }),
    fromProduct('USD-SPS', 'USD-SPS-6M', 'USD Single Period Swap 6M', 'Expired', { isScheduled: false, stats: statsFor(4.055, 4) }),
    fromProduct('EUR-ZCIS', 'EUR-ZCIS-5Y', 'Euro Inflation Swap 5Y', 'Open', { startDate: '2026-11-06', isScheduled: true, stats: statsFor(2.2175, 4) }),
    fromProduct('USDBRL-NDF', 'USDBRL-NDF-3M', 'USD / BRL NDF 3 Month', 'Open', { ...dated, isScheduled: true, stats: statsFor(5.4125, 4) }),
    fromProduct('BTC-SPREAD', 'BTC-DEC26-MAR27', 'Bitcoin Dec26 / Mar27 Calendar Spread', 'Open', { ...dated, legs: [{ symbol: 'BTC-DEC26', ratio: '1', opposingSide: 'As Defined' }, { symbol: 'BTC-MAR27', ratio: '1', opposingSide: 'Opposing' }], noLegs: '2', isScheduled: true, stats: statsFor(670.5, 1) }),
    fromProduct('FED-RATE', 'FED-DEC26-T425', 'Fed target above 4.25% after December 2026 meeting', 'Open', { ...dated, evtAttEventId: 'FED-DEC26', evtAttEventDisplayName: 'FOMC December 2026 Meeting', evtAttStrikeValue: '4.25', evtAttStrikeDescription: 'Percent', evtAttEvaluationType: '>', evtAttTimeSpecifierYear: '2026', evtAttTimeSpecifierMonth: '12', isScheduled: true, stats: statsFor(0.62, 2, { preliminary: true }) }),
    fromProduct('FED-RATE', 'FED-DEC26-T450', 'Fed target above 4.50% after December 2026 meeting', 'Pending', { ...dated, evtAttEventId: 'FED-DEC26', evtAttEventDisplayName: 'FOMC December 2026 Meeting', evtAttStrikeValue: '4.50', evtAttStrikeDescription: 'Percent', evtAttEvaluationType: '>', evtAttTimeSpecifierYear: '2026', evtAttTimeSpecifierMonth: '12', isScheduled: false }),
    fromProduct('SPX-IDX', 'SPX', 'S&P 500 Index Level', 'Open', { startDate: '2026-01-05', nonTradable: true, hideMarketData: false, isScheduled: false, metadata: [{ key: 'source', value: 'Index vendor feed' }], stats: statsFor(6128.5, 2, { settled: false }) }),
    fromProduct('BTC', 'BTC-SEP26', 'Bitcoin Futures September 2026', 'Terminated', { startDate: '2026-01-05', lastTradeDate: '2026-09-25T16:00', expirationDate: '2026-09-25T16:00', terminationDate: '2026-10-25', ...future('2026', '9', '25'), isScheduled: false, stats: statsFor(94220, 1) }),
  ];
  return {
    products,
    instruments,
    calendars: {
      'US Federal': { global: true, description: 'US federal holidays' },
      'New York': { global: false, description: 'New York bank holidays' },
      London: { global: false, description: 'UK bank holidays' },
      TARGET: { global: false, description: 'TARGET2 closing days' },
    },
    holidays: [
      { id: 'h1', calendar: 'US Federal', title: 'Thanksgiving Day', start: '2026-11-26T00:00', end: '2026-11-26T23:59' },
      { id: 'h2', calendar: 'US Federal', title: 'Christmas Day', start: '2026-12-25T00:00', end: '2026-12-25T23:59' },
      { id: 'h3', calendar: 'US Federal', title: 'New Year’s Day', start: '2027-01-01T00:00', end: '2027-01-01T23:59' },
      { id: 'h4', calendar: 'US Federal', title: 'Martin Luther King Jr. Day', start: '2027-01-18T00:00', end: '2027-01-18T23:59' },
      { id: 'h5', calendar: 'New York', title: 'Early close for Thanksgiving', start: '2026-11-27T13:00', end: '2026-11-27T23:59' },
      { id: 'h6', calendar: 'London', title: 'Boxing Day (substitute)', start: '2026-12-28T00:00', end: '2026-12-28T23:59' },
      { id: 'h7', calendar: 'London', title: 'Summer Bank Holiday', start: '2027-08-30T00:00', end: '2027-08-30T23:59' },
      { id: 'h8', calendar: 'TARGET', title: 'Good Friday', start: '2027-03-26T00:00', end: '2027-03-26T23:59' },
      { id: 'h9', calendar: 'TARGET', title: 'Easter Monday', start: '2027-03-29T00:00', end: '2027-03-29T23:59' },
    ],
  };
}
