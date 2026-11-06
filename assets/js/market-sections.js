'use strict';

const ROLL_ITEMS = ['tradeDayRollScheduleType', 'tradeDayRollConvention', 'cutoffTime', 'monCutoffTime', 'tueCutoffTime', 'wedCutoffTime', 'thuCutoffTime', 'friCutoffTime', 'satCutoffTime', 'sunCutoffTime'];
const TRADING_FIELDS = ['basecurrency|Currency*', 'clearingHouse', 'multiplier*', 'tradeSettlementPeriod', 'instrumentProductType', 'minimumPriceIncrement*', 'minimumTradeQuantity', 'minimumUnaffiliatedFirms'];
const REPORTING_ITEMS = ['#Reporting', 'cfiCode', 'unitOfMeasure', 'unitOfMeasureQty'];
const CROSS_ITEMS = ['crossOrderRestingDuration', '#Instrument-Level Block Trade Thresholds', 'setBlockTradeThreshold', 'blockTradeMinimumQuantity', 'blockTradeMinimumNotional'];
const SETTLEMENT_ITEMS = ['settlementPeriodStartOffsetFromCloseDuration', 'settlementPeriodEndOffsetFromCloseDuration', 'settlementPriceLogic', 'settlementPriceCalculationEndingMethod', 'minimumTradeQtyForVwapSettlementCalculation', 'bufferFromEndOfSettlementPeriodDuration', 'settlementPriceCalculationRequiresApproval'];
const RISK_ITEMS = ['@limits', 'marketOrderProtectionBasisPoints', 'skipRiskAndCurrencyChecks'];
const rollHeading = `#Trade Day Roll Schedule (${MARKET_TZ})`;
const swapSection = (id, title, items) => ({ id, title, lock: 'pending', items });
const calcSection = items => swapSection('calc', 'Date Calculator', [...items, '@calc']);

const INSTRUMENT_TYPE_SECTIONS = {
  [IT.FUTURE]: { after: [{ id: 'derivative', title: 'Derivative Information', open: true, items: ['maturityDateParts'] }] },
  [IT.OPTION]: { after: [{ id: 'derivative', title: 'Derivative Information', open: true, items: ['maturityDateParts', 'putOrCall*', 'strikePrice*', 'underlyingInstrumentId'] }] },
  [IT.FOREX]: { after: [{ id: 'forex', title: 'Forex Information', items: ['fxBaseCurrency*', 'fxQuoteCurrency*'] }] },
  [IT.MULTILEG]: { after: [{ id: 'multileg', title: 'Multileg Information', items: ['noLegs', '@legs'] }] },
  [IT.IRS]: {
    before: [calcSection(['#Swap Input', 'startDate|Trade Date*', 'effectiveDateOffset*', 'tenor*', 'rollAndPaymentDateHolidayCalendarsList*', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', '#Fixed Leg Input', 'fixedPaymentFrequency|Payment Frequency*', 'fixedBusinessDayConvention|Business Day Convention*', 'fixedPaymentDateRelativeTo', '#Float Leg Input', 'floatPaymentFrequency|Payment Frequency*', 'floatRateResetFrequency|Rate Reset Frequency*', 'floatResetDateBusinessDayConvention|Reset Date Business Day Convention', 'floatBusinessDayConvention', 'floatHolidayCalendarsList', 'floatCompoundingMethod|Compounding Method*', 'floatFixingDatesOffset*', 'floatResetDateRelativeTo', 'floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', 'floatFixingDatesDayType', 'floatPaymentDateRelativeTo', 'floatFixingDateHolidayCalendarsList'])],
    after: [
      swapSection('swap', 'Swap Information', ['=tenor', 'sideConvention*', '=effectiveDateBusinessDayConvention', '=maturityDateBusinessDayConvention', '=rollAndPaymentDateHolidayCalendarsList', 'swapEffectiveDate*', 'maturityDate|Swap Maturity Date*', '=effectiveDateOffset', 'unadjustedEffectiveDate*', 'unadjustedMaturityDate*']),
      swapSection('fixed', 'Fixed Leg Information', ['=fixedPaymentFrequency', 'fixedCompoundingMethod|Compounding Method*', 'fixedRollConvention*', 'fixedDayCountConvention|Day Count Convention*', '=fixedBusinessDayConvention|Business Day Convention', '=fixedPaymentDateRelativeTo', 'fixedFirstUnadjustedPaymentDate*']),
      swapSection('float', 'Floating Leg Information', ['floatingRateIndex*', '=floatHolidayCalendarsList', 'floatDayCountConvention|Day Count Convention*', 'firstFloatFixingDate*', '=floatPaymentFrequency|Payment Frequency', '=floatRateResetFrequency|Rate Reset Frequency', '=floatResetDateBusinessDayConvention|Reset Date Business Day Convention', '=floatBusinessDayConvention', '=floatCompoundingMethod|Compounding Method', 'firstFloatResetDate*', '=floatFixingDatesOffset', '=floatResetDateRelativeTo', '=floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', '=floatFixingDatesDayType', 'floatFirstUnadjustedPaymentDate*', 'floatRollConvention*', '=floatPaymentDateRelativeTo', 'floatingRateIndexTenor*', '=floatFixingDateHolidayCalendarsList']),
    ],
  },
  [IT.FRA]: {
    before: [calcSection(['#Swap Input', 'startDate|Trade Date*', 'tenor*', 'rollAndPaymentDateHolidayCalendarsList*', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'calculationPeriodNumberOfDays', 'unadjustedEffectiveDate*', 'unadjustedMaturityDate*', '#Fixed Leg Input', 'fixedDayCountConvention|Day Count Convention*', 'fixedBusinessDayConvention', '#Float Leg Input', 'floatDayCountConvention|Day Count Convention*', 'floatFixingDatesDayType', 'floatBusinessDayConvention', 'floatFixingDatesOffset*', 'floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', 'floatFixingDateHolidayCalendarsList', 'floatFixingDate*'])],
    after: [
      swapSection('swap', 'Swap Information', ['=tenor', 'sideConvention*', '=rollAndPaymentDateHolidayCalendarsList', '=effectiveDateBusinessDayConvention', '=maturityDateBusinessDayConvention', '=calculationPeriodNumberOfDays', 'swapEffectiveDate*', '=unadjustedEffectiveDate', '=unadjustedMaturityDate', 'forwardStartingPeriod', 'maturityDate*']),
      swapSection('fixed', 'Fixed Leg Information', ['=fixedDayCountConvention|Day Count Convention', '=fixedBusinessDayConvention|Business Day Convention']),
      swapSection('float', 'Floating Leg Information', ['floatingRateIndex*', '=floatFixingDateHolidayCalendarsList', '=floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', '=floatFixingDate', '=floatFixingDatesDayType|Fixing Dates Day Type', '=floatFixingDatesOffset', '=floatDayCountConvention|Day Count Convention', '=floatBusinessDayConvention|Business Day Convention', 'floatingRateIndexTenor*']),
    ],
  },
  [IT.FSIRS]: {
    before: [calcSection(['#Swap Input', 'startDate|Trade Date*', 'tenor', 'rollAndPaymentDateHolidayCalendarsList', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'effectiveDateOffset', '#Fixed Leg Input', 'fixedPaymentFrequency', 'fixedCompoundingMethod', 'fixedBusinessDayConvention', 'fixedPaymentDateRelativeTo', '#Float Leg Input', 'floatCompoundingMethod', 'floatPaymentFrequency', 'floatRateResetFrequency', 'floatPaymentDateRelativeTo', 'floatFixingDatesDayType', 'floatFixingDatesOffset', 'floatResetDateBusinessDayConvention', 'floatResetDateRelativeTo', 'floatFixingDateBusinessDayConvention', 'floatHolidayCalendarsList', 'floatFixingDateHolidayCalendarsList'])],
    after: [
      swapSection('swap', 'Swap Information', ['=tenor', 'sideConvention*', 'swapEffectiveDate*', '=effectiveDateBusinessDayConvention', 'maturityDate', '=maturityDateBusinessDayConvention', 'unadjustedEffectiveDate', '=rollAndPaymentDateHolidayCalendarsList', 'unadjustedMaturityDate', '=effectiveDateOffset', 'forwardStartingPeriod']),
      swapSection('fixed', 'Fixed Leg Information', ['=fixedPaymentFrequency', 'fixedDayCountConvention', '=fixedBusinessDayConvention|Business Day Convention', 'fixedRollConvention', 'fixedFirstUnadjustedPaymentDate', '=fixedPaymentDateRelativeTo', '=fixedCompoundingMethod']),
      swapSection('float', 'Floating Leg Information', ['=floatCompoundingMethod|Compounding Method', 'floatDayCountConvention', '=floatHolidayCalendarsList', '=floatPaymentFrequency', '=floatRateResetFrequency', '=floatResetDateBusinessDayConvention|Reset Date Business Day Convention', 'firstFloatResetDate', 'firstFloatFixingDate', 'floatingRateIndex', 'floatRollConvention', 'floatFirstUnadjustedPaymentDate', '=floatPaymentDateRelativeTo', '=floatFixingDatesDayType', '=floatFixingDatesOffset', 'floatingRateIndexTenor', '=floatResetDateRelativeTo', '=floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', 'floatBusinessDayConvention', '=floatFixingDateHolidayCalendarsList']),
    ],
  },
  [IT.BASIS]: {
    before: [calcSection(['#Swap Input', 'startDate|Trade Date*', 'tenor*', 'sideConvention', 'effectiveDateOffset*', 'rollAndPaymentDateHolidayCalendarsList', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'swapEffectiveDate*', 'maturityDate*', '#Float Leg Input', 'leg1FloatPaymentFrequency', 'leg1FloatRateResetFrequency', 'leg1FloatBusinessDayConvention', 'leg1FloatResetDateBusinessDayConvention', 'leg1FloatCompoundingMethod', 'leg1FloatFixingDatesOffset', 'leg1FloatResetDateRelativeTo', 'leg1FloatFixingDateBusinessDayConvention', 'leg1FloatFixingDatesDayType', 'leg1FloatPaymentDateRelativeTo', 'leg2FloatRateResetFrequency', 'leg2FloatPaymentFrequency'])],
    after: [
      swapSection('swap', 'Swap Information', ['=tenor', '=sideConvention', '=effectiveDateBusinessDayConvention', '=maturityDateBusinessDayConvention', '=swapEffectiveDate', '=maturityDate', '=effectiveDateOffset', '=rollAndPaymentDateHolidayCalendarsList']),
      swapSection('float', 'Floating Leg Information', ['leg1FloatingRateIndex*', 'leg2FloatingRateIndex*', 'leg1FloatDayCountConvention', 'leg2FloatDayCountConvention', 'leg1FirstFloatFixingDate', 'leg2FirstFloatFixingDate', 'leg1FirstFloatResetDate*', 'leg2FirstFloatResetDate*', '=leg1FloatPaymentFrequency', '=leg2FloatPaymentFrequency', '=leg1FloatRateResetFrequency', '=leg2FloatRateResetFrequency', '=leg1FloatBusinessDayConvention', 'leg2FloatBusinessDayConvention', '=leg1FloatResetDateBusinessDayConvention|Leg1 Reset Date Business Day Convention', 'leg2FloatResetDateBusinessDayConvention|Leg2 Reset Date Business Day Convention', '=leg1FloatCompoundingMethod', 'leg2FloatCompoundingMethod', '=leg1FloatFixingDatesDayType', 'leg2FloatFixingDatesDayType', '=leg1FloatFixingDatesOffset', 'leg2FloatFixingDatesOffset', '=leg1FloatResetDateRelativeTo', 'leg2FloatResetDateRelativeTo', 'leg1FloatRollConvention*', 'leg2FloatRollConvention*', '=leg1FloatFixingDateBusinessDayConvention|Leg1 Fixing Date Business Day Convention', 'leg2FloatFixingDateBusinessDayConvention|Leg2 Fixing Date Business Day Convention', '=leg1FloatPaymentDateRelativeTo', 'leg2FloatPaymentDateRelativeTo', 'leg1FloatingRateIndexTenor', 'leg2FloatingRateIndexTenor', 'leg1FloatFirstUnadjustedPaymentDate', 'leg2FloatFirstUnadjustedPaymentDate', 'floatFirstUnadjustedEffectiveDate', 'unadjustedMaturityDate']),
    ],
  },
  [IT.OIS]: {
    before: [calcSection(['#Swap Input', 'startDate|Trade Date*', 'tenor', 'tenorTimePeriod', 'sideConvention', 'rollAndPaymentDateHolidayCalendarsList', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'effectiveDateOffset*', 'swapEffectiveDate', 'paymentDateDayType', '#Fixed Leg Input', 'fixedPaymentFrequency', 'fixedCompoundingMethod', 'fixedDayCountConvention', 'fixedBusinessDayConvention', 'fixedPaymentDateRelativeTo', '#Float Leg Input', 'floatCompoundingMethod', 'floatBusinessDayConvention', 'floatPaymentFrequency', 'floatRateResetFrequency', 'floatResetDateBusinessDayConvention|Reset Date Business Day Convention', 'floatFixingDatesDayType', 'floatPaymentDateRelativeTo', 'floatResetDateRelativeTo', 'floatFixingDatesOffset', 'floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', 'floatHolidayCalendarsList', 'floatFixingDateHolidayCalendarsList'])],
    after: [
      swapSection('swap', 'Over Night Index Swap Information', ['=tenor', '=tenorTimePeriod', '=sideConvention', '=swapEffectiveDate', '=effectiveDateBusinessDayConvention', '=maturityDateBusinessDayConvention', 'unadjustedEffectiveDate', 'unadjustedMaturityDate', 'maturityDate', '=effectiveDateOffset', 'forwardStartingPeriod', 'forwardStartingPeriodTimePeriod', '=paymentDateDayType']),
      swapSection('fixed', 'Fixed Leg Information', ['=fixedPaymentFrequency', '=fixedCompoundingMethod', '=fixedDayCountConvention', '=fixedBusinessDayConvention', 'fixedRollConvention*', 'fixedPaymentDateOffset', 'fixedFirstUnadjustedPaymentDate', '=fixedPaymentDateRelativeTo']),
      swapSection('float', 'Floating Leg Information', ['=floatCompoundingMethod', 'floatDayCountConvention', '=floatBusinessDayConvention', '=floatHolidayCalendarsList|Float Holiday Calendars', '=floatPaymentFrequency', '=floatRateResetFrequency', '=floatResetDateBusinessDayConvention|Reset Date Business Day Convention', 'firstFloatResetDate', 'firstFloatFixingDate', '=floatFixingDatesDayType', 'floatingRateIndex', 'floatRollConvention*', 'floatFirstUnadjustedPaymentDate', '=floatPaymentDateRelativeTo', '=floatResetDateRelativeTo', '=floatFixingDatesOffset', '=floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', '=floatFixingDateHolidayCalendarsList|Float Fixing Date Holiday Calendars', 'floatPaymentDateOffset', 'floatingRateIndexTenor']),
    ],
  },
  [IT.SPS]: {
    before: [calcSection(['#Swap Input', 'startDate|Trade Date*', 'tenor', 'rollAndPaymentDateHolidayCalendarsList', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', '#Fixed Leg Input', 'fixedPaymentFrequency', 'fixedCompoundingMethod', 'fixedBusinessDayConvention', 'fixedPaymentDateRelativeTo', '#Float Leg Input', 'floatCompoundingMethod', 'floatPaymentFrequency', 'floatRateResetFrequency', 'floatPaymentDateRelativeTo', 'floatFixingDatesDayType', 'floatFixingDatesOffset', 'floatResetDateBusinessDayConvention', 'floatResetDateRelativeTo', 'floatFixingDateBusinessDayConvention', 'floatHolidayCalendarsList', 'floatFixingDateHolidayCalendarsList'])],
    after: [
      swapSection('swap', 'Swap Information', ['=tenor', 'sideConvention*', 'tenorTimePeriod*', 'swapEffectiveDate*', '=effectiveDateBusinessDayConvention', 'maturityDate', '=maturityDateBusinessDayConvention', 'unadjustedEffectiveDate', '=rollAndPaymentDateHolidayCalendarsList|Roll and Payment Date Holiday Calendars', 'unadjustedMaturityDate']),
      swapSection('fixed', 'Fixed Leg Information', ['=fixedPaymentFrequency', '=fixedCompoundingMethod', '=fixedBusinessDayConvention', 'fixedDayCountConvention', 'fixedRollConvention', 'fixedFirstUnadjustedPaymentDate', '=fixedPaymentDateRelativeTo']),
      swapSection('float', 'Floating Leg Information', ['=floatCompoundingMethod', 'floatDayCountConvention', '=floatHolidayCalendarsList|Float Holiday Calendars', '=floatPaymentFrequency', '=floatRateResetFrequency', '=floatResetDateBusinessDayConvention|Reset Date Business Day Convention', 'firstFloatResetDate', 'firstFloatFixingDate', 'floatingRateIndex', 'floatRollConvention', 'floatFirstUnadjustedPaymentDate', '=floatPaymentDateRelativeTo', '=floatFixingDatesDayType', '=floatFixingDatesOffset', 'floatingRateIndexTenor', '=floatResetDateRelativeTo', '=floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', 'floatBusinessDayConvention', '=floatFixingDateHolidayCalendarsList|Float Fixing Date Holiday Calendars']),
    ],
  },
  [IT.ZCIS]: {
    before: [calcSection(['#Swap Input', 'tenor*', 'sideConvention', 'swapEffectiveDate*', 'forwardStartingPeriodTimePeriod', 'tenorTimePeriod', 'indexSource', 'forwardStartingPeriod', 'rollAndPaymentDateHolidayCalendarsList|Roll and Payment Date Holiday Calendars', 'inflationLag', 'unadjustedEffectiveDate', 'effectiveDateOffset*', 'effectiveDateBusinessDayConvention', 'interpolationMethod', 'maturityDate*', 'unadjustedMaturityDate', 'maturityDateBusinessDayConvention', 'inflationInstrumentName', 'fallbackBondApplicable', '#Fixed Input', 'fixedPaymentFrequency', 'fixedRollConvention*', 'fixedPaymentDateRelativeTo', 'fixedFirstUnadjustedPaymentDate', 'fixedDayCountConvention', 'fixedCompoundingMethod', 'fixedBusinessDayConvention', '#Float Input', 'floatPaymentFrequency', 'floatingRateIndex', 'floatFirstUnadjustedPaymentDate', 'floatRollConvention*', 'floatPaymentDateRelativeTo', 'floatBusinessDayConvention', 'floatDayCountConvention', 'floatCompoundingMethod|Calculation Period Compounding Method', 'floatHolidayCalendarsList|Float Holiday Calendars'])],
    after: [
      swapSection('swap', 'Swap Information', ['=tenor', '=sideConvention', '=swapEffectiveDate', '=forwardStartingPeriodTimePeriod', '=tenorTimePeriod', '=indexSource', '=forwardStartingPeriod', '=rollAndPaymentDateHolidayCalendarsList|Roll and Payment Date Holiday Calendars', '=inflationLag', '=unadjustedEffectiveDate', '=effectiveDateOffset|Effective Date Offset', '=effectiveDateBusinessDayConvention', '=interpolationMethod', '=maturityDate', '=unadjustedMaturityDate', '=maturityDateBusinessDayConvention', '=inflationInstrumentName', '=fallbackBondApplicable']),
      swapSection('fixed', 'Fixed Leg Information', ['=fixedPaymentFrequency', '=fixedRollConvention', '=fixedPaymentDateRelativeTo', '=fixedFirstUnadjustedPaymentDate', '=fixedDayCountConvention', '=fixedCompoundingMethod', '=fixedPaymentDayConvention', '=fixedCalculationPeriodDayConvention']),
      swapSection('float', 'Floating Leg Information', ['=floatHolidayCalendarsList|Float Holiday Calendars', '=floatPaymentFrequency', '=floatingRateIndex', '=floatFirstUnadjustedPaymentDate', '=floatRollConvention', '=floatPaymentDateRelativeTo', '=floatPaymentDayConvention', '=floatCalculationPeriodDayConvention', '=floatDayCountConvention', '=floatCompoundingMethod']),
    ],
  },
  [IT.NDF]: {
    after: [swapSection('ndf', 'Non Deliverable Forward Information', ['#Attributes', 'tenor', 'sideConvention', 'forwardStartingPeriod', 'forwardStartingPeriodTimePeriod', 'currency1|Currency 1', 'currency2|Currency 2', 'exchangedCurrency1|Exchanged Currency 1', 'exchangedCurrency2|Exchanged Currency 2', 'exchangeRateCurrency1|Exchange Rate Currency 1', 'exchangeRateCurrency2|Exchange Rate Currency 2', 'valuationDate', 'fixingDate', 'exchangeRateQuoteBasis', 'fixingQuoteBasis', 'settlementCurrency', 'tenorTimePeriod', 'fixingCurrency1|Fixing Currency 1', 'fixingCurrency2|Fixing Currency 2'])],
  },
  [IT.EVENT]: {
    after: [{ id: 'event', title: 'Event Information', open: true, items: ['#Attributes', 'evtAttPayoutType', 'evtAttEventOutcome', 'evtAttOrdinalRank', 'evtAttPositionAccountability', 'evtAttPositionLimit', 'evtAttQuestion', 'settlementFee', 'settlementFeeDestinationAccount', 'evtAttPayoutValue', 'evtAttPayoutLowerBound', 'evtAttPayoutUpperBound', 'evtAttSourceAgency', 'evtAttSourceAgencyUrl', 'evtAttCalculationMethod', 'evtAttUnderlyingEventSpecification', 'evtAttStrikeUnit', 'evtAttStrikeValue', 'evtAttStrikeDescription', 'evtAttEvaluationType', 'evtAttTimeSpecifier', 'evtAttTimeOfDay', 'evtAttStrikeEvaluationLowerLimit', 'evtAttStrikeEvaluationUpperLimit', 'evtExpectedPayoutDateTime', '@subTypes', '@components'] }],
  },
};

function instrumentSections(v) {
  const typed = INSTRUMENT_TYPE_SECTIONS[v.type] || {};
  const startItem = instrumentCanSetStartDate(v.type) || !v.type ? 'startDate*' : '=startDate|Trade Date';
  return [
    {
      id: 'instrument', title: 'Instrument', always: true,
      items: ['productId|Product*', 'id|Instrument ID (Symbol)*', 'description|Instrument Description', 'evtAttEventId|Event ID*', 'evtAttEventDisplayName|Event Description*', '=type|Instrument Type', 'routingkey|Routing Key', 'externalSymbol', 'nonTradable|Non-Tradable Instrument', 'hideMarketData', 'securityId', 'securityIdSource', ...REPORTING_ITEMS],
    },
    ...(typed.before || []),
    { id: 'trading', title: 'Trading Information', open: true, items: ['@tradingHours', rollHeading, ...ROLL_ITEMS, '#Contract Terms', ...TRADING_FIELDS] },
    { id: 'cross', title: 'Cross Order Information', items: CROSS_ITEMS },
    ...(typed.after || []),
    { id: 'settlement', title: 'Settlement Price Calculation Information', items: SETTLEMENT_ITEMS },
    { id: 'risk', title: 'Risk Settings', open: true, items: RISK_ITEMS },
    { id: 'schedule', title: 'Trading Schedule', open: true, items: [startItem, 'startTime', 'lastTradeDate', 'expirationDate', 'terminationDate', 'isScheduled'] },
    { id: 'metadata', title: 'Metadata', items: ['@metadata'] },
  ];
}

const PRODUCT_FLOAT_INPUTS = ['floatCompoundingMethod', 'floatDayCountConvention', 'floatBusinessDayConvention', 'floatPaymentFrequency', 'floatRateResetFrequency', 'floatResetDateBusinessDayConvention', 'firstFloatResetDate', 'firstFloatFixingDate', 'floatFixingDatesDayType', 'floatingRateIndex', 'floatRollConvention*', 'floatFirstUnadjustedPaymentDate', 'floatPaymentDateRelativeTo', 'floatResetDateRelativeTo', 'floatFixingDatesOffset', 'floatFixingDateBusinessDayConvention', 'floatingRateIndexTenor'];
const PRODUCT_FIXED_INPUTS = ['fixedPaymentFrequency', 'fixedCompoundingMethod', 'fixedDayCountConvention', 'fixedBusinessDayConvention', 'fixedRollConvention*', 'fixedFirstUnadjustedPaymentDate', 'fixedPaymentDateRelativeTo'];
const PRODUCT_SWAP_DATES = ['swapEffectiveDate', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'unadjustedEffectiveDate', 'unadjustedMaturityDate', 'maturityDate'];
const plainSection = (id, title, items, open) => ({ id, title, items, open });

const PRODUCT_TYPE_SECTIONS = {
  [IT.FOREX]: [plainSection('forex', 'Forex Information', ['fxBaseCurrency*', 'fxQuoteCurrency*'], true)],
  [IT.IRS]: [
    plainSection('swap', 'Swap Information', ['effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'effectiveDateOffset*']),
    plainSection('fixed', 'Fixed Leg Information', ['fixedPaymentFrequency', 'fixedCompoundingMethod|Compounding Method', 'fixedRollConvention*', 'fixedDayCountConvention|Day Count Convention*', 'fixedBusinessDayConvention*', 'fixedPaymentDateRelativeTo']),
    plainSection('float', 'Floating Leg Information', ['floatingRateIndex', 'floatDayCountConvention|Day Count Convention*', 'floatCompoundingMethod|Compounding Method', 'floatPaymentFrequency|Payment Frequency', 'floatRateResetFrequency|Rate Reset Frequency', 'floatResetDateBusinessDayConvention|Reset Date Business Day Convention', 'floatRollConvention*', 'floatFixingDatesOffset*', 'floatFixingDateBusinessDayConvention|Fixing Date Business Day Convention', 'floatPaymentDateRelativeTo', 'floatFixingDatesDayType', 'floatingRateIndexTenor']),
  ],
  [IT.FSIRS]: [
    plainSection('swap', 'Forward Starting Swap Information', ['tenor', 'sideConvention', ...PRODUCT_SWAP_DATES, 'effectiveDateOffset', 'forwardStartingPeriod']),
    plainSection('fixed', 'Fixed Leg Swap Information', PRODUCT_FIXED_INPUTS.map(k => k.replace('*', ''))),
    plainSection('float', 'Float Leg Swap Information', PRODUCT_FLOAT_INPUTS.map(k => k.replace('*', ''))),
  ],
  [IT.BASIS]: [
    plainSection('swap', 'Swap Information', ['tenor', 'sideConvention', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'maturityDate*', 'effectiveDateOffset*', 'swapEffectiveDate*']),
    plainSection('float', 'Floating Leg Information', ['leg1FloatingRateIndex', 'leg2FloatingRateIndex', 'leg1FloatDayCountConvention|Leg1 Day Count Convention*', 'leg2FloatDayCountConvention|Leg2 Day Count Convention*', 'leg1FloatCompoundingMethod|Leg1 Compounding Method', 'leg2FloatCompoundingMethod|Leg2 Compounding Method', 'leg1FloatRateResetFrequency', 'leg2FloatRateResetFrequency', 'leg1FloatPaymentFrequency', 'leg2FloatPaymentFrequency', 'leg1FloatBusinessDayConvention', 'leg2FloatBusinessDayConvention', 'leg1FloatResetDateBusinessDayConvention|Leg1 Reset Date Business Day Convention', 'leg2FloatResetDateBusinessDayConvention|Leg2 Reset Date Business Day Convention', 'leg1FloatResetDateRelativeTo', 'leg2FloatResetDateRelativeTo', 'leg1FloatFixingDateBusinessDayConvention|Leg1 Fixing Date Business Day Convention', 'leg2FloatFixingDateBusinessDayConvention|Leg2 Fixing Date Business Day Convention', 'leg1FirstFloatResetDate*', 'leg2FirstFloatResetDate*', 'leg1FirstFloatFixingDate*', 'leg2FirstFloatFixingDate*', 'leg1FloatRollConvention*', 'leg2FloatRollConvention*', 'leg1FloatFixingDatesOffset', 'leg2FloatFixingDatesOffset', 'leg1FloatPaymentDateRelativeTo', 'leg2FloatPaymentDateRelativeTo', 'leg1FloatFixingDatesDayType', 'leg2FloatFixingDatesDayType', 'leg1FloatingRateIndexTenor', 'leg2FloatingRateIndexTenor', 'leg1FloatFirstUnadjustedPaymentDate', 'leg2FloatFirstUnadjustedPaymentDate', 'floatFirstUnadjustedEffectiveDate', 'unadjustedMaturityDate']),
  ],
  [IT.ZCIS]: [
    plainSection('swap', 'Swap Information', ['tenor', 'sideConvention', 'swapEffectiveDate', 'forwardStartingPeriodTimePeriod', 'tenorTimePeriod', 'indexSource', 'forwardStartingPeriod', 'inflationLag', 'unadjustedEffectiveDate', 'effectiveDateOffset|Effective Date Offset*', 'effectiveDateBusinessDayConvention', 'interpolationMethod', 'maturityDate', 'unadjustedMaturityDate', 'maturityDateBusinessDayConvention', 'inflationInstrumentName', 'fallbackBondApplicable']),
    plainSection('fixed', 'Fixed Leg Information', ['fixedPaymentFrequency', 'fixedRollConvention*', 'fixedPaymentDateRelativeTo', 'fixedFirstUnadjustedPaymentDate', 'fixedDayCountConvention', 'fixedCompoundingMethod', 'fixedPaymentDayConvention', 'fixedCalculationPeriodDayConvention']),
    plainSection('float', 'Float Leg Information', ['floatPaymentFrequency', 'floatingRateIndex', 'floatFirstUnadjustedPaymentDate', 'floatRollConvention*', 'floatPaymentDateRelativeTo', 'floatPaymentDayConvention', 'floatCalculationPeriodDayConvention', 'floatDayCountConvention', 'floatCompoundingMethod']),
  ],
  [IT.FRA]: [
    plainSection('swap', 'Forward Rate Agreement Swap Information', ['tenor', 'sideConvention', 'forwardStartingPeriod', 'swapEffectiveDate', 'effectiveDateBusinessDayConvention', 'maturityDateBusinessDayConvention', 'calculationPeriodNumberOfDays', 'unadjustedEffectiveDate', 'unadjustedMaturityDate', 'maturityDate']),
    plainSection('fixed', 'Fixed Leg Swap Information', ['fixedDayCountConvention', 'fixedBusinessDayConvention']),
    plainSection('float', 'Float Leg Swap Information', ['floatDayCountConvention', 'floatBusinessDayConvention', 'floatFixingDateBusinessDayConvention', 'floatingRateIndex', 'floatFixingDatesDayType', 'floatFixingDatesOffset', 'floatFixingDate', 'floatingRateIndexTenor']),
  ],
  [IT.EVENT]: [plainSection('event', 'Event Information', ['#Attributes', 'evtAttPayoutType*', 'evtAttEventOutcome*', 'evtAttPositionAccountability', 'evtAttPositionLimit', 'evtAttSourceAgency', 'evtAttSourceAgencyUrl', 'evtAttPayoutValue', 'evtAttPayoutLowerBound', 'evtAttPayoutUpperBound', 'evtAttCalculationMethod', 'evtAttStrikeUnit', 'evtAttStrikeEvaluationLowerLimit', 'evtAttStrikeEvaluationUpperLimit', 'evtAttFrequencyType', 'evtAttQuestion', 'evtAttUnderlyingEventSpecification', '@subTypes'], true)],
  [IT.OIS]: [
    plainSection('swap', 'Overnight Index Swap Information', ['tenor', 'tenorTimePeriod', 'sideConvention', ...PRODUCT_SWAP_DATES, 'effectiveDateOffset*', 'forwardStartingPeriod', 'forwardStartingPeriodTimePeriod', 'paymentDateDayType']),
    plainSection('fixed', 'Fixed Leg Swap Information', ['fixedPaymentFrequency', 'fixedCompoundingMethod', 'fixedDayCountConvention', 'fixedBusinessDayConvention', 'fixedRollConvention*', 'fixedPaymentDateOffset', 'fixedFirstUnadjustedPaymentDate', 'fixedPaymentDateRelativeTo']),
    plainSection('float', 'Float Leg Swap Information', [...PRODUCT_FLOAT_INPUTS.filter(k => !['floatingRateIndexTenor', 'floatFixingDateBusinessDayConvention'].includes(k)), 'floatFixingDateBusinessDayConvention', 'floatPaymentDateOffset', 'floatingRateIndexTenor']),
  ],
  [IT.NDF]: [plainSection('ndf', 'Non Deliverable Forward Information', INSTRUMENT_TYPE_SECTIONS[IT.NDF].after[0].items.filter(k => k !== '#Attributes'))],
  [IT.SPS]: [
    plainSection('swap', 'Single Period Swap Information', ['tenor*', 'sideConvention', 'tenorTimePeriod', ...PRODUCT_SWAP_DATES]),
    plainSection('fixed', 'Fixed Leg Swap Information', PRODUCT_FIXED_INPUTS),
    plainSection('float', 'Float Leg Swap Information', PRODUCT_FLOAT_INPUTS),
  ],
};

function productSections(v) {
  return [
    {
      id: 'product', title: 'Product', always: true,
      items: ['type', 'id|Product Name (ID)*', 'description*', '@categories', 'externalSymbol', ...REPORTING_ITEMS],
    },
    { id: 'trading', title: 'Trading Information', open: true, items: ['syncTradingInfo', '@tradingHours', rollHeading, 'syncTradeDayRollSchedule', ...ROLL_ITEMS, '#Contract Terms', ...TRADING_FIELDS] },
    { id: 'cross', title: 'Cross Order Information', items: ['syncCrossOrderInfo', ...CROSS_ITEMS] },
    { id: 'settlement', title: 'Settlement Price Calculation Information', items: ['syncSettlementPriceCalcInfo', ...SETTLEMENT_ITEMS] },
    ...(PRODUCT_TYPE_SECTIONS[v.type] || []),
    { id: 'risk', title: 'Risk Settings', open: true, items: ['syncAdditionalInfo', ...RISK_ITEMS] },
  ];
}

const SYNC_GROUPS = {
  syncTradingInfo: ['instrumentProductType', 'tradingSchedule', 'holidayCalendars'],
  syncTradeDayRollSchedule: ['tradeDayRollScheduleType', 'tradeDayRollConvention', 'cutoffTime', 'monCutoffTime', 'tueCutoffTime', 'wedCutoffTime', 'thuCutoffTime', 'friCutoffTime', 'satCutoffTime', 'sunCutoffTime'],
  syncCrossOrderInfo: ['crossOrderRestingDurationH', 'crossOrderRestingDurationM', 'crossOrderRestingDurationS', 'crossOrderRestingDurationMs', 'setBlockTradeThreshold', 'blockTradeMinimumQuantity', 'blockTradeMinimumNotional'],
  syncSettlementPriceCalcInfo: ['settlementPriceLogic', 'settlementPriceCalculationEndingMethod', 'minimumTradeQtyForVwapSettlementCalculation', 'settlementPriceCalculationRequiresApproval', ...['settlementPeriodStartOffsetFromCloseDuration', 'settlementPeriodEndOffsetFromCloseDuration', 'bufferFromEndOfSettlementPeriodDuration'].flatMap(k => [`${k}H`, `${k}M`, `${k}S`, `${k}Ms`])],
  syncAdditionalInfo: ['marketOrderProtectionBasisPoints', 'skipRiskAndCurrencyChecks', ...LIMIT_GROUPS.flatMap(g => [...g.low, ...g.high])],
};

const INSTRUMENT_FILTERS = [
  { k: 'productName', label: 'Product Name (ID)', search: true },
  { k: 'id', label: 'Instrument ID (Symbol)', search: true },
  { k: 'state', label: 'Instrument State', options: INST_STATES },
  { k: 'type', label: 'Instrument Type', options: PRODUCT_TYPES },
  { k: 'isScheduled', label: 'Schedule State', options: OPT.scheduleFilter },
  { k: 'isTradable', label: 'Tradable', options: OPT.tradableFilter },
  { k: 'hasLegs', label: 'Has Legs', options: OPT.legsFilter },
  { k: 'tradeDate', label: 'Trade Date', date: true, irs: true },
  { k: 'clearingHouse', label: 'Clearing House', options: clearingHouseNames, irs: true },
  { k: 'basecurrency', label: 'Currency', options: OPT.currency, irs: true },
  { k: 'tenor', label: 'Tenor', search: true, irs: true },
  { k: 'floatingRateIndex', label: 'Floating Rate Index', options: OPT.rateIndex, irs: true },
  { k: 'floatingRateIndexTenor', label: 'Floating Rate Index Tenor', search: true, irs: true },
];

const STAT_PRICE_FIELDS = [
  { k: 'open', label: 'Open Price', tradable: false },
  { k: 'indicativeOpen', label: 'Indicative Open Price', tradable: false },
  { k: 'high', label: 'High Price', tradable: false },
  { k: 'low', label: 'Low Price', tradable: false },
  { k: 'close', label: 'Close Price', tradable: false },
  { k: 'lastPrice', label: 'Last Price', tradable: false },
  { k: 'lastQuantity', label: 'Last Quantity', tradable: false, qty: true },
  { k: 'notionalTraded', label: 'Total Notional Volume', tradable: false, notional: true },
  { k: 'sharesTraded', label: 'Total Shares Traded', tradable: false, qty: true },
  { k: 'settlementPrice', label: 'Settlement Price', tradable: true },
  { k: 'openInterest', label: 'Open Interest', tradable: true, qty: true },
  { k: 'tradingReferencePrice', label: 'Trading Reference Price', tradable: true },
  { k: 'markPrice', label: 'Mark Price', tradable: true },
];
const STAT_TIME_FIELDS = [
  { k: 'openSetTime', label: 'Open Update Time', tradable: false },
  { k: 'indicativeOpenSetTime', label: 'Indicative Open Update Time', tradable: false },
  { k: 'highSetTime', label: 'High Update Time', tradable: false },
  { k: 'lowSetTime', label: 'Low Update Time', tradable: false },
  { k: 'closeSetTime', label: 'Close Update Time', tradable: false },
  { k: 'lastTradeSetTime', label: 'Last Trade Update Time', tradable: false },
  { k: 'notionalSetTime', label: 'Notional Volume Update Time', tradable: false },
  { k: 'settlementSetTime', label: 'Settlement Update Time', tradable: true },
  { k: 'openInterestSetTime', label: 'Open Interest Update Time', tradable: true },
  { k: 'tradingReferencePriceSetTime', label: 'Trading Reference Price Update Time', tradable: true },
  { k: 'markPriceSetTime', label: 'Mark Price Update Time', tradable: true },
];
const HISTORY_COLUMNS = [
  ['Transaction Time', 'transactionTime'], ['Open Price', 'openPx'], ['Indicative Open Price', 'indicativeOpenPx'], ['High Price', 'highPx'], ['Low Price', 'lowPx'], ['Close Price', 'closePx'],
  ['Last Trade Price', 'lastTradePx'], ['Last Trade Qty', 'lastTradeQty'], ['Notional Volume', 'notionalTraded'], ['Shares Traded', 'sharesTraded'], ['Settlement Price', 'settlementPx'],
  ['Settlement Calc Method', 'settlementPriceCalculationMethod'], ['Settlement Calc Text', 'settlementPriceCalculationText'], ['Open Interest', 'openInterest'], ['Trading Reference Price', 'tradingReferencePrice'], ['Mark Price', 'markPrice'],
];
