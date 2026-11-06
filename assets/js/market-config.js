'use strict';

const MARKET_KEY = 'ep3.market.prototype.v1';
const MARKET_TZ = 'America/Chicago';
const NETTING_ENABLED = true;

const IT = {
  DEFAULT: 'Default',
  FUTURE: 'Future',
  OPTION: 'Option',
  FOREX: 'Foreign Exchange (Forex)',
  IRS: 'Interest Rate Swap',
  FSIRS: 'Forward Starting Interest Rate Swap',
  MULTILEG: 'Multi Leg',
  BASIS: 'Basis Swap',
  FRA: 'Forward Rate Agreement Swap',
  EVENT: 'Event',
  OIS: 'Over Night Index Swap',
  SPS: 'Single Period Swap',
  NDF: 'Non Deliverable Forwards',
  ZCIS: 'Zero Coupon Inflation Swap',
};
const PRODUCT_TYPES = Object.values(IT);
const INST_STATES = ['Pending', 'Closed', 'Open', 'Preopen', 'Suspended', 'Expired', 'Terminated', 'Halted', 'Match And Close Auction'];
const HALTABLE_EXCLUDED = ['Pending', 'Expired', 'Terminated', 'Halted'];
const SCHEDULE_STATES = INST_STATES.filter(s => !['Pending', 'Closed', 'Expired', 'Terminated'].includes(s));
const DELETE_BLOCKED = 'You can only delete an instrument in Pending or Terminated state.';
const STATS_BLOCKED = 'Market stats aren’t available for Pending or Terminated instruments.';
const EDIT_BLOCKED = 'Terminated instruments can’t be edited.';
const WEEK_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PERIODICITY = { everyday: 'Every Day', weekdays: 'Every Week Day (M-F)', custom: 'Custom' };
const ROLL_TYPES = { unset: 'Unset', same: 'Same Every Day', byDay: 'Configure By Day' };
const OPPOSING = ['As Defined', 'Opposing'];
const RESOLUTION_SIDES = ['Buy', 'Sell', 'Dual'];

const numberRange = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
const THIS_YEAR = new Date().getFullYear();

const OPT = {
  bdc: ['Modified Following', 'Following', 'FRN', 'Preceding', 'Modified Preceding', 'Nearest', 'None', 'Not Applicable'],
  compounding: ['None', 'Flat'],
  dayCount: ['30 360', 'ACT 360', 'ACT 365 Fixed', 'One To One'],
  relativeTo: ['Calculation Period Start Date', 'Calculation Period End Date', 'Last Pricing Date', 'Reset Date', 'Valuation Date'],
  dayType: ['Business', 'Calendar', 'Commodity Business', 'Currency Business', 'Exchange Business', 'Scheduled Trading Day'],
  timePeriod: ['Years', 'Months', 'Days'],
  quoteBasis: ['Currency 1 Per Currency 2', 'Currency 2 Per Currency 1'],
  side: ['Buy', 'Sell'],
  fixedFreq: ['Quarterly', 'Semiannually', 'Annually'],
  floatFreq: ['Quarterly', 'Semiannually'],
  resetFreq: ['Monthly', 'Quarterly', 'Semiannually'],
  roll: ['EOM', 'FRN', 'IMM', 'IMMCAD', 'IMMAUD', 'IMMNZD', 'SFE', 'NONE', 'TBILL', ...numberRange(1, 30), 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  rateIndex: ['1M USD LIBOR', '3M USD LIBOR', '6M USD LIBOR', '3M EURIBOR', '6M EURIBOR', '3M GDP LIBOR', '6M GDP LIBOR', '3M CDOR', '6M NIBOR', '3M JPY LIBOR', '6M JPY LIBOR', '6M CNF LIBOR', '3M BBSW', '6M BBSW', '3M STIBOR', '6M CIBOR2'],
  indexSource: ['UKRPI', 'CPTFEMU', 'FRCPXTOB'],
  holiday: ['New York', 'London', 'TARGET', 'Canada', 'Norway', 'Swiss', 'Japan', 'Sweden', 'Denmark'],
  currency: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'BTC', 'ETH'],
  underlying: ['Agency', 'Commodity', 'Corporate', 'Currency', 'Equity', 'Government', 'Index', 'Loan', 'Money Market', 'Mortgage', 'Municipal', 'Other', 'Financing', 'Energy'],
  rollConvention: ['Next Day Booking', 'Prior Day Booking'],
  settlementLogic: ['VWAP', 'EVENT'],
  endingMethod: ['VWAP TIER 1', 'VWAP TIER 2 RULE 1', 'VWAP TIER 2 RULE 2', 'VWAP TIER 2 RULE 3', 'VWAP TIER 2 RULE 4', 'VWAP TIER 2 RULE 5', 'VWAP TIER 2 RULE 6', 'VWAP TIER 2 RULE 7', 'VWAP TIER 2 RULE 8'],
  putOrCall: ['Put', 'Call'],
  payout: ['Binary', 'Continuous'],
  outcome: ['Independent', 'Mutually Exclusive', 'Directional'],
  calcMethod: ['Month Over Month', 'Year Over Year', 'Value', 'Quarter Over Quarter'],
  strikeUnit: ['String', 'Integer', 'Decimal', 'Percentage', 'Date'],
  evaluation: ['>=', '<=', '==', '!=', '<', '>'],
  securitySource: ['Exchange Symbol', 'CUSIP', 'SEDOL', 'QUIK', 'ISIN', 'RIC', 'ISO Currency Code', 'ISO Country Code', 'CTA', 'Bloomberg Symbol', 'Wertpapier', 'Dutch', 'Valoren', 'Sicovam', 'Belgian', 'Common', 'Clearing House', 'ISDA FpML Product Specification', 'OPRA', 'ISDA FpML Product URL', 'Letter Of Credit', 'Marketplace Assigned', 'Markit RED Entity CLIP', 'Markit RED Pair CLIP', 'CFTC Commodity Code', 'ISDA Commodity Reference Price', 'Financial Instrument Global Identifier', 'Legal Entity Identifier', 'Synthetic', 'Fidessa Instrument Mnemonic', 'Index Name', 'Uniform Symbol', 'Digital Token Identifier'],
  scheduleFilter: ['Manual', 'Scheduled'],
  tradableFilter: ['Non Tradable', 'Tradable'],
  legsFilter: ['Has Legs', 'No Legs'],
};

const humanize = key => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
const select = (options, extra = {}) => ({ kind: 'select', options, blank: 'Not set', ...extra });
const isContinuous = v => v.evtAttPayoutType === 'Continuous';
const isDirectional = v => v.evtAttEventOutcome === 'Directional';
const isLocked = v => !!v.state && v.state !== 'Pending';
const requiredOnTradableInstrument = v => 'productId' in v && !v.nonTradable;
const clearingHouseNames = () => firmNamesOfType('clearingHouse');
const instrumentCanSetStartDate = type => [IT.DEFAULT, IT.FUTURE, IT.OPTION, IT.MULTILEG, IT.EVENT, IT.NDF, IT.FOREX, IT.ZCIS].includes(type);

const joined = k => v => (v[k] || []).join(', ');
const partsDisplay = (keys, sep) => v => keys.map(k => v[k]).filter(p => p !== undefined && p !== null && p !== '').join(sep);
const ymdField = (k, label, extra = {}) => ({
  kind: 'parts', label,
  parts: [
    { k: `${k}Year`, label: 'Year', options: numberRange(THIS_YEAR, THIS_YEAR + 10) },
    { k: `${k}Month`, label: 'Month', options: numberRange(1, 12) },
    { k: `${k}Day`, label: 'Day', options: numberRange(1, 31) },
  ],
  display: partsDisplay([`${k}Year`, `${k}Month`, `${k}Day`], '-'),
  ...extra,
});
const durationField = (k, label, tip) => ({
  kind: 'parts', label, tip,
  parts: [
    { k: `${k}H`, label: 'Hours' },
    { k: `${k}M`, label: 'Minutes' },
    { k: `${k}S`, label: 'Seconds' },
    { k: `${k}Ms`, label: 'Milliseconds' },
  ],
  display: v => [[`${k}H`, 'h'], [`${k}M`, 'm'], [`${k}S`, 's'], [`${k}Ms`, 'ms']].filter(([p]) => Number(v[p])).map(([p, unit]) => `${v[p]}${unit}`).join(' '),
});

const FIELD_RULES = [
  [/HolidayCalendarsList$/, { kind: 'multi', options: OPT.holiday }],
  [/(BusinessDay|PaymentDay|CalculationPeriodDay)Convention$/, select(OPT.bdc)],
  [/DayCountConvention$/, select(OPT.dayCount)],
  [/CompoundingMethod$/, select(OPT.compounding)],
  [/RelativeTo$/, select(OPT.relativeTo)],
  [/RollConvention$/, select(OPT.roll)],
  [/DayType$/, select(OPT.dayType)],
  [/TimePeriod$/, select(OPT.timePeriod)],
  [/QuoteBasis$/, select(OPT.quoteBasis)],
  [/^fixedPaymentFrequency$|^leg\dFloatPaymentFrequency$/, select(OPT.fixedFreq)],
  [/^floatPaymentFrequency$/, select(OPT.floatFreq)],
  [/RateResetFrequency$/, select(OPT.resetFreq)],
  [/[fF]loatingRateIndex$/, select(OPT.rateIndex)],
  [/urrency[12]?$/, select(OPT.currency)],
  [/FloatingRateIndexTenor$|^floatingRateIndexTenor$|Offset$|^tenor$|^forwardStartingPeriod$|^inflationLag$|^calculationPeriodNumberOfDays$/, {}],
  [/Date$/, { inputType: 'date' }],
  [/SetTime$|^transactTime$|^scheduleExecutionTime$/, { inputType: 'datetime-local' }],
];

const FIELD_DEFS = {
  type: select(PRODUCT_TYPES, { label: 'Product Type', blank: undefined, createOnly: true, refresh: true }),
  id: { mono: true, createOnly: true },
  productId: { kind: 'select', blank: 'Choose a product', createOnly: true, options: () => market.products.map(p => p.id) },
  description: { tip: TIPS.description },
  routingkey: { tip: TIPS.routingkey, disabled: v => isLocked(v) || [IT.MULTILEG, IT.BASIS, IT.ZCIS].includes(v.type) },
  externalSymbol: { tip: TIPS.externalSymbol, lock: 'pending' },
  evtAttEventId: { list: 'eventIds', createOnly: true, when: v => v.type === IT.EVENT, refresh: true },
  evtAttEventDisplayName: { createOnly: true, when: v => v.type === IT.EVENT },
  nonTradable: { kind: 'toggle', lock: 'pending', refresh: true },
  hideMarketData: { kind: 'toggle', disabled: v => !v.nonTradable },
  securityId: { label: 'Security ID', tip: TIPS.securityId, disabled: v => !v.securityIdSource || v.securityIdSource === 'Exchange Symbol' },
  securityIdSource: select(OPT.securitySource, { label: 'Security ID Source', tip: TIPS.securityIdSource, refresh: true }),
  cfiCode: { label: 'CFI Code', tip: TIPS.cfiCode },
  unitOfMeasure: { label: 'Unit of Measure', tip: TIPS.unitOfMeasure },
  calculationPeriodNumberOfDays: { label: 'Calculation Period Number of Days' },
  unitOfMeasureQty: { label: 'Unit of Measure Qty', tip: TIPS.unitOfMeasureQty },
  tradeDayRollScheduleType: select(Object.values(ROLL_TYPES), { label: 'Schedule Type', blank: undefined, refresh: true }),
  tradeDayRollConvention: select(OPT.rollConvention, { label: 'Trade Day Roll Convention', blank: undefined, when: v => v.tradeDayRollScheduleType && v.tradeDayRollScheduleType !== ROLL_TYPES.unset }),
  cutoffTime: { inputType: 'time', label: 'Cutoff Time', when: v => v.tradeDayRollScheduleType === ROLL_TYPES.same },
  ...Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => [`${d}CutoffTime`, { inputType: 'time', label: `${d.toUpperCase()} Cutoff Time`, when: v => v.tradeDayRollScheduleType === ROLL_TYPES.byDay }])),
  basecurrency: select(OPT.currency, { label: 'Currency', refresh: true }),
  clearingHouse: { kind: 'select', blank: 'Not set', options: clearingHouseNames, disabled: v => !!v.nonTradable || isLocked(v) },
  multiplier: { num: true, gt: 0, tip: TIPS.multiplier, lock: 'pending' },
  tradeSettlementPeriod: { num: true, gte: 0, tip: TIPS.tradeSettlementPeriod, disabled: v => !!v.nonTradable || isLocked(v) },
  instrumentProductType: select(OPT.underlying, { label: 'Underlying Type', tip: TIPS.instrumentProductType }),
  minimumPriceIncrement: { label: 'Min Price Increment', num: true, gt: 0, max: 1, tip: TIPS.minimumPriceIncrement, lock: 'pending' },
  minimumTradeQuantity: { label: 'Min Trade Quantity', num: true, gt: 0, ph: '0', tip: TIPS.minimumTradeQuantity, req: requiredOnTradableInstrument, disabled: v => !!v.nonTradable || isLocked(v) },
  minimumUnaffiliatedFirms: { num: true, gte: 0, ph: '0', tip: TIPS.minimumUnaffiliatedFirms, req: requiredOnTradableInstrument, disabled: v => !!v.nonTradable || isLocked(v) },
  crossOrderRestingDuration: durationField('crossOrderRestingDuration', 'Cross Order Resting Duration', TIPS.crossOrderRestingDuration),
  setBlockTradeThreshold: { kind: 'toggle', label: 'Enabled', tip: TIPS.setBlockTradeThreshold, refresh: true },
  blockTradeMinimumQuantity: { label: 'Minimum Quantity', num: true, gt: 0, tip: TIPS.blockTradeMinimumQuantity, req: v => !!v.setBlockTradeThreshold, disabled: v => !v.setBlockTradeThreshold },
  blockTradeMinimumNotional: { label: 'Minimum Notional', num: true, gt: 0, tip: TIPS.blockTradeMinimumNotional, req: v => !!v.setBlockTradeThreshold, disabled: v => !v.setBlockTradeThreshold },
  settlementPeriodStartOffsetFromCloseDuration: durationField('settlementPeriodStartOffsetFromCloseDuration', 'Settlement Start Period Offset from Market Close', TIPS.settlementPeriodStartOffsetFromCloseDuration),
  settlementPeriodEndOffsetFromCloseDuration: durationField('settlementPeriodEndOffsetFromCloseDuration', 'Settlement End Period Offset from Market Close', TIPS.settlementPeriodEndOffsetFromCloseDuration),
  settlementPriceLogic: select(OPT.settlementLogic),
  settlementPriceCalculationEndingMethod: select(OPT.endingMethod, { tip: TIPS.settlementPriceCalculationEndingMethod }),
  minimumTradeQtyForVwapSettlementCalculation: { label: 'Minimum Trade Quantity for VWAP', num: true, tip: TIPS.minimumTradeQtyForVwapSettlementCalculation },
  bufferFromEndOfSettlementPeriodDuration: durationField('bufferFromEndOfSettlementPeriodDuration', 'Minimum Order Time in Market', TIPS.bufferFromEndOfSettlementPeriodDuration),
  settlementPriceCalculationRequiresApproval: { kind: 'toggle', label: 'Requires Approval', tip: TIPS.settlementPriceCalculationRequiresApproval },
  marketOrderProtectionBasisPoints: { num: true, gte: 0, max: 10000, tip: TIPS.marketOrderProtectionBasisPoints },
  skipRiskAndCurrencyChecks: { kind: 'toggle', label: 'Skip Risk Checks and Currency Balance Updates', tip: TIPS.skipRiskAndCurrencyChecks },
  startDate: { inputType: 'date', tip: TIPS.startDate, disabled: v => !!form && form.mode === 'edit' && v.startDate && new Date(v.startDate) <= new Date() },
  startTime: { inputType: 'time', tip: TIPS.startTime },
  lastTradeDate: { inputType: 'datetime-local', label: 'Last Trade Date/Time', tip: TIPS.lastTradeDate },
  expirationDate: { inputType: 'datetime-local', label: 'Expiration Date/Time', tip: TIPS.expirationDate },
  terminationDate: { inputType: 'date', tip: TIPS.terminationDate },
  isScheduled: { kind: 'toggle', label: 'Follow Trading Hours' },
  effectiveDateOffset: { label: 'Swap Effective Date Offset' },
  rollAndPaymentDateHolidayCalendarsList: { label: 'Roll and Payment Date Holiday Calendar List', display: joined('rollAndPaymentDateHolidayCalendarsList') },
  floatHolidayCalendarsList: { label: 'Float Holiday Calendar List', display: joined('floatHolidayCalendarsList') },
  floatFixingDateHolidayCalendarsList: { label: 'Float Fixing Date Holiday Calendar List', display: joined('floatFixingDateHolidayCalendarsList') },
  sideConvention: select(OPT.side),
  indexSource: select(OPT.indexSource),
  settlementCurrency: select(['USD']),
  fallbackBondApplicable: { kind: 'toggle' },
  fxBaseCurrency: select(OPT.currency, { label: 'Base Currency' }),
  fxQuoteCurrency: { kind: 'select', blank: 'Not set', label: 'Quote Currency', options: v => (v.basecurrency ? [v.basecurrency] : []) },
  maturityDateParts: ymdField('maturityDate', 'Contract Month / Expiration Date', { tip: TIPS.maturityDate, lock: 'pending' }),
  putOrCall: select(OPT.putOrCall, { lock: 'pending' }),
  strikePrice: { num: true, lock: 'pending' },
  underlyingInstrumentId: { label: 'Underlying Instrument ID', list: 'instIds', ph: 'Instrument ID' },
  noLegs: select(numberRange(0, 10), { label: '# of Legs', blank: undefined, lock: 'pending', refresh: true }),
  evtAttPayoutType: select(OPT.payout, { label: 'Payout Type', blank: undefined, lock: 'create', refresh: true, tip: TIPS.evtAttPayoutType }),
  evtAttEventOutcome: select(OPT.outcome, { label: 'Event Outcome', blank: undefined, lock: 'create', refresh: true, tip: TIPS.evtAttEventOutcome }),
  evtAttOrdinalRank: { label: 'Ordinal Rank', num: true, gt: 0, tip: TIPS.evtAttOrdinalRank, req: isDirectional, disabled: v => !isDirectional(v) },
  evtAttPositionAccountability: { label: 'Position Accountability Value', tip: TIPS.evtAttPositionAccountability },
  evtAttPositionLimit: { label: 'Position Limit', tip: TIPS.evtAttPositionLimit },
  evtAttQuestion: { label: 'Question', wide: true, tip: TIPS.evtAttQuestion },
  settlementFee: { num: true, gte: 0, tip: TIPS.settlementFee },
  settlementFeeDestinationAccount: { tip: TIPS.settlementFeeDestinationAccount },
  evtAttPayoutValue: { label: 'Payout Value', num: true, gt: 0, lock: 'create', req: v => !isContinuous(v), disabled: isContinuous },
  evtAttPayoutLowerBound: { label: 'Payout Lower Bound', num: true, lock: 'create', req: isContinuous, disabled: v => !isContinuous(v) },
  evtAttPayoutUpperBound: { label: 'Payout Upper Bound', num: true, gt: 0, lock: 'create', req: isContinuous, disabled: v => !isContinuous(v) },
  evtAttSourceAgency: { label: 'Source Agency' },
  evtAttSourceAgencyUrl: { label: 'Source Agency URL' },
  evtAttCalculationMethod: select(OPT.calcMethod, { label: 'Outcome Value Calculation Method', tip: TIPS.evtAttCalculationMethod }),
  evtAttUnderlyingEventSpecification: { kind: 'textarea', wide: true, label: 'Underlying Event Specification', help: 'The legal language describing how the market outcome and expiration is determined.' },
  evtAttStrikeUnit: select(OPT.strikeUnit, { label: 'Strike Unit', tip: TIPS.evtAttStrikeUnit, disabled: isContinuous }),
  evtAttStrikeValue: { label: 'Strike Value', req: v => !isContinuous(v), disabled: isContinuous },
  evtAttStrikeDescription: { label: 'Strike Description', tip: TIPS.evtAttStrikeDescription, disabled: isContinuous },
  evtAttEvaluationType: select(OPT.evaluation, { label: 'Evaluation Type', req: v => !isContinuous(v), disabled: isContinuous }),
  evtAttTimeSpecifier: ymdField('evtAttTimeSpecifier', 'Event Time Specifier', { tip: TIPS.evtAttTimeSpecifier, lock: 'pending' }),
  evtAttTimeOfDay: {
    kind: 'parts', label: 'Event Time Specifier Time Of Day', tip: TIPS.evtAttTimeOfDay, lock: 'pending',
    parts: [{ k: 'evtAttTimeOfDayHour', label: 'Hour', options: numberRange(0, 23) }, { k: 'evtAttTimeOfDayMinute', label: 'Minute', options: numberRange(0, 59) }, { k: 'evtAttTimeOfDaySecond', label: 'Second', options: numberRange(0, 59) }],
    display: partsDisplay(['evtAttTimeOfDayHour', 'evtAttTimeOfDayMinute', 'evtAttTimeOfDaySecond'], ':'),
  },
  evtAttStrikeEvaluationLowerLimit: { label: 'Strike Evaluation Lower Limit', tip: TIPS.evtAttStrikeEvaluationLowerLimit, disabled: isContinuous },
  evtAttStrikeEvaluationUpperLimit: { label: 'Strike Evaluation Upper Limit', tip: TIPS.evtAttStrikeEvaluationUpperLimit, disabled: isContinuous },
  evtExpectedPayoutDateTime: { inputType: 'datetime-local', label: 'Expected Payout Date/Time' },
  evtAttFrequencyType: { label: 'Frequency Type' },
  syncTradingInfo: { kind: 'toggle', label: 'Sync Child Instruments?', when: () => !!form && form.mode === 'edit' },
  syncTradeDayRollSchedule: { kind: 'toggle', label: 'Sync Child Instruments?', when: () => !!form && form.mode === 'edit' },
  syncCrossOrderInfo: { kind: 'toggle', label: 'Sync Child Instruments?', when: () => !!form && form.mode === 'edit' },
  syncSettlementPriceCalcInfo: { kind: 'toggle', label: 'Sync Child Instruments?', when: () => !!form && form.mode === 'edit' },
  syncAdditionalInfo: { kind: 'toggle', label: 'Sync Child Instruments?', when: () => !!form && form.mode === 'edit' },
};

function parseItem(raw, secLock) {
  let s = raw;
  const ro = s[0] === '=';
  if (ro) s = s.slice(1);
  const req = s.endsWith('*');
  if (req) s = s.slice(0, -1);
  const [k, label] = s.split('|');
  const rule = FIELD_RULES.find(([rx]) => rx.test(k));
  const parsed = { k, label: humanize(k), lock: secLock, ...(rule ? rule[1] : {}), ...FIELD_DEFS[k], ro };
  if (label) parsed.label = label;
  if (req) parsed.req = true;
  if (parsed.inputType && !parsed.display) parsed.display = v => formatWhen(getPath(v, k));
  return parsed;
}

function resolveField(x, v) {
  const lockedByRule = (x.lock === 'pending' && isLocked(v)) || (x.lock === 'create' && !!form && form.mode === 'edit');
  return {
    ...x,
    options: typeof x.options === 'function' ? x.options(v) : x.options,
    req: typeof x.req === 'function' ? x.req(v) : x.req,
    disabled: lockedByRule || !!(typeof x.disabled === 'function' ? x.disabled(v) : x.disabled),
  };
}

const LIMIT_GROUPS = [
  { title: 'Absolute Price Limits', tip: 'The minimum and maximum price for acceptable orders. Orders that violate a limit are rejected.', low: ['setLowPriceLimit', 'lowPriceLimit'], high: ['setHighPriceLimit', 'highPriceLimit'], unit: '' },
  { title: 'Relative Price Limits', tip: '', low: ['relativeLowSet', 'relativeLow'], high: ['relativeHighSet', 'relativeHigh'], unit: ' (%)' },
  { title: 'Order Size Limits', tip: 'The minimum and maximum quantity for acceptable orders. Orders that violate a limit are rejected.', low: ['setLowOrderLimit', 'lowOrderLimit'], high: ['setHighOrderLimit', 'highOrderLimit'], unit: '' },
  { title: 'Total Notional Limits', tip: 'The minimum and maximum notional value for acceptable orders, in the instrument’s Currency.', low: ['setLowTotalNotionalLimit', 'lowTotalNotionalLimit'], high: ['setHighTotalNotionalLimit', 'highTotalNotionalLimit'], unit: '' },
];
