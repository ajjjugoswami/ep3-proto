'use strict';

const RISK_PROFILES = ['Exchange Default', 'Exchange Scoped', 'Symbol Scoped'];
const ACCOUNT_PROPERTIES = ['Error', 'Non Tradable', 'Omnibus', 'Gold Preferred', 'Silver Preferred', 'Bronze Preferred', ...Array.from({ length: 9 }, (_, i) => `Commission Tier ${i + 1}`)];
const BANK_ID_TYPES = ['Swift', 'Fed'];
const BANK_ACCOUNT_TYPES = ['Settlement Bank', 'Cash Withdrawal', 'Securities Withdrawal'];
const ROUNDING_METHODS = ['Banker', 'Away From Zero', 'Half Away From Zero', 'Half Towards Zero'];
const COMMISSION_TYPES = ['Basis Points', 'Flat Fee'];
const ORDER_SIDES = ['Buy', 'Sell'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'USDC'];
const TRANSFER_REASONS = ['Position Transfer', 'Average Price Transfer', 'Give Up'];
const ADJUST_ACTIONS = ['Adjust', 'Set'];
const STATE_WARNING_STATES = ['Suspended', 'Liquidate Only'];

const tradesOnAccount = f => ['participant', 'clearingMember'].includes(f.type);

const ACCOUNT_TABS = [
  { path: '', label: 'Account Profile' },
  { path: 'users', label: 'Users', when: tradesOnAccount },
  { path: 'positions', label: 'Positions' },
  { path: 'balances', label: 'Balances' },
  { path: 'balance-ledger', label: 'Ledger', also: ['position-ledger'] },
  { path: 'whitelist', label: 'Whitelist', when: tradesOnAccount },
  { path: 'commissions', label: 'Commissions' },
  { path: 'association', label: 'Account Associations' },
  { path: 'bank-accounts', label: 'Bank Accounts' },
  { path: 'position-limits', label: 'Position Limits' },
];
const LEDGER_TABS = [{ path: 'balance-ledger', label: 'Balance Ledger' }, { path: 'position-ledger', label: 'Position Ledger' }];

const accountName = (f, id) => {
  const a = liveRows('accounts', f).find(x => x.id === id);
  return a ? a.displayName : id;
};

function accountFirmFields(f) {
  const clearingMember = { k: 'clearingMember', label: 'Clearing Member Firm', kind: 'select', options: firmNamesOfType('clearingMember'), blank: 'Choose a firm', req: true, createOnly: true };
  if (f.type === 'participant') return [{ k: '_firm', label: 'Participant Firm', kind: 'static', value: f.name }, clearingMember];
  if (f.type === 'clearingHouse') return [{ k: '_firm', label: 'Clearing House', kind: 'static', value: f.name }, clearingMember];
  return [
    { k: 'clearingHouse', label: 'Clearing House', kind: 'select', options: firmNamesOfType('clearingHouse'), blank: 'Not set', createOnly: true },
    { k: '_firm', label: 'Clearing Member Firm', kind: 'static', value: f.name },
  ];
}

const accountDefaults = f => ({
  clearingMember: f.type === 'clearingMember' ? f.name : '',
  clearingHouse: f.type === 'clearingHouse' ? f.name : '',
});

const accountFields = f => [
  { k: 'displayName', label: 'Account Name', req: true },
  { k: 'id', label: 'Account ID', req: true, mono: true, createOnly: true, help: 'Account ID must be unique. It can’t be changed after the account is created.' },
  { k: 'accountType', label: 'Account Type', kind: 'select', options: ACCOUNT_TYPES, blank: 'Not set' },
  { k: 'priorityWeight', label: 'Account Priority Weight', ph: '0', tip: TIPS.accountPriorityWeight },
  ...accountFirmFields(f),
  { k: 'collateralAccount', label: 'Collateral Account', kind: 'select', options: liveRows('accounts', f).map(a => ({ value: a.id, label: a.displayName })), blank: 'Not set', display: r => (r.collateralAccount ? accountName(f, r.collateralAccount) : '') },
  { k: 'riskSystem', label: 'Risk System', kind: 'select', options: ['Default'], def: 'Default', tip: TIPS.riskSystem },
  { k: 'riskProfile', label: 'Risk Profile', kind: 'select', options: RISK_PROFILES, def: 'Exchange Default', tip: TIPS.riskProfile },
  { k: 'collateralReturnEnabled', label: 'Collateral Return Enabled', kind: 'toggle' },
  { k: 'properties', label: 'Properties', kind: 'multi', options: ACCOUNT_PROPERTIES, def: [], display: r => (r.properties || []).join(', ') },
  { k: 'state', label: 'Account State', kind: 'select', options: ACCOUNT_STATES, def: 'Active', tip: TIPS.accountState },
  { k: '_mqp', label: 'Mass Quote Protection', kind: 'head', tip: TIPS.massQuoteProtection },
  { k: 'mqpInterval', label: 'Interval (seconds)', inputType: 'number', min: 0 },
  { k: 'mqpTradedQuantity', label: 'Traded Quantity', inputType: 'number', min: 0 },
  { k: '_clearing', label: 'Clearing Integration', kind: 'head', tip: TIPS.accountClearingIntegration },
  { k: 'clearingAccount', label: 'Clearing Account ID', mono: true, tip: TIPS.clearingAccountId },
  { k: 'positionAccount', label: 'Position Account ID', mono: true, tip: TIPS.positionAccountId },
  { k: '_limits', label: 'Order Size Limits', kind: 'head' },
  { k: 'orderSizeLow', label: 'Order Size Lower Limit', inputType: 'number', min: 0 },
  { k: 'orderSizeLowSet', label: 'Lower Limit Set', kind: 'toggle' },
  { k: 'orderSizeHigh', label: 'Order Size Higher Limit', inputType: 'number', min: 0 },
  { k: 'orderSizeHighSet', label: 'Higher Limit Set', kind: 'toggle' },
];

const addressFields = (prefix, label) => ['Address 1', 'Address 2', 'City', 'State', 'Postal Code', 'Country Code']
  .map(part => ({ k: `${prefix}${part.replace(/\s+/g, '')}`, label: `${label} ${part}` }));

Object.assign(COLLECTIONS, {
  beneficialOwners: {
    title: 'Beneficial Ownership', one: 'Beneficial Owner', primary: 'legalName', empty: 'No beneficial owners.', tip: TIPS.beneficialOwnership,
    columns: [['legalName', 'Legal Name'], ['title', 'Title'], ['email', 'Email', true], ['cftcForm102Owner', 'CFTC Form 102 Owner', true, 'bool'], ['cftcForm102Controller', 'CFTC Form 102 Controller', true, 'bool']],
    fields: [
      { k: 'legalName', label: 'Legal Name', req: true },
      { k: 'title', label: 'Title' },
      { k: 'employerName', label: 'Employer Name' },
      { k: 'email', label: 'Email', inputType: 'email', ph: 'name@example.com' },
      { k: 'phoneNumber', label: 'Phone Number', inputType: 'tel', ph: '+1 312 555 0100' },
      { k: 'dateOfBirth', label: 'Date of Birth', inputType: 'date' },
      { k: 'registrationNumber', label: 'Registration Number', tip: TIPS.userRegistrationNumber },
      { k: 'oauthId', label: 'OAuth ID', tip: TIPS.userOauthId },
      { k: 'legalEntityIdentifier', label: 'Legal Entity Identifier', kind: 'textarea' },
      { k: 'address', label: 'Address', kind: 'textarea' },
      { k: 'submissionDate', label: 'Submission Date', inputType: 'date' },
      { k: 'cftcForm102Owner', label: 'CFTC Form 102 Owner', kind: 'toggle' },
      { k: 'cftcForm102Controller', label: 'CFTC Form 102 Controller', kind: 'toggle' },
    ],
  },
  bankDetails: {
    title: 'Bank Accounts', one: 'Bank Account', primary: 'accountTitle', labelOf: r => r.accountTitle || r.bankId || r.bankAccountType, empty: 'This account has no bank accounts yet.',
    columns: [
      ['bankId', 'Bank ID'], ['bankIdType', 'Bank ID Type'], ['accountTitle', 'Account Title'], ['cashAccountNumber', 'Cash Account Number', true],
      ['virtualCashAccountNumber', 'Virtual Cash Account Number', true], ['securitiesAccountNumber', 'Securities Account Number', true], ['beneficiaryName', 'Beneficiary Name'],
      ['bankAccountType', 'Bank Account Type'], ['additionalWithdrawalMemo', 'Addl Withdrawal Memo', true], ['isDefault', 'Default', false, 'bool'],
    ],
    fields: [
      { k: 'bankAccountType', label: 'Bank Account Type', kind: 'select', options: BANK_ACCOUNT_TYPES, blank: 'Choose a type', req: true },
      { k: 'isDefault', label: 'Default', kind: 'toggle', tip: TIPS.bankDefault },
      { k: 'bankId', label: 'Bank ID', mono: true },
      { k: 'bankIdType', label: 'Bank ID Type', kind: 'select', options: BANK_ID_TYPES, blank: 'Not set' },
      { k: 'cashAccountNumber', label: 'Cash Account Number', mono: true },
      { k: 'virtualCashAccountNumber', label: 'Virtual Cash Account Number', mono: true },
      { k: 'securitiesAccountNumber', label: 'Securities Account Number', mono: true },
      { k: 'accountTitle', label: 'Account Title' },
      { k: 'beneficiaryName', label: 'Beneficiary Name' },
      ...addressFields('beneficiary', 'Beneficiary'),
      { k: 'bankName', label: 'Bank Name' },
      ...addressFields('bank', 'Bank'),
      { k: 'additionalWithdrawalMemo', label: 'Additional Withdrawal Memo' },
    ],
    afterSave: (rows, saved) => {
      if (saved.isDefault) rows.forEach(r => { if (r !== saved && r.bankAccountType === saved.bankAccountType) r.isDefault = false; });
    },
  },
});

const COMMISSION_OVERRIDES = ['userOverride', 'accountOverride', 'accountTypeOverride', 'sideOverride', 'symbolOverride', 'productOverride', 'blockTradeOverride', 'rfqTradeOverride'];
const COMMISSION_NUMBERS = [['basisPoints', 'Basis Points'], ['makerBasisPoints', 'Maker Basis Points'], ['flatFee', 'Flat Fee'], ['makerFlatFee', 'Maker Flat Fee'], ['minimumNotional', 'Minimum Notional'], ['maximumRateBasisPoints', 'Maximum Rate Basis Points'], ['maximumNotional', 'Maximum Notional']];
const isBasisPoints = v => v.type !== 'Flat Fee';
const commissionFirmOptions = () => firms.filter(x => !x.deleted && tradesOnAccount(x)).map(x => ({ value: x.id, label: x.name }));

function commissionFields(editing) {
  const fixed = x => (editing ? { ...x, disabled: true, lockedBy: undefined } : x);
  return v => [
    { k: 'type', label: 'Commission Type', kind: 'select', options: COMMISSION_TYPES },
    { k: 'basisPoints', label: 'Basis Points', tip: TIPS.basisPoints, when: isBasisPoints },
    { k: 'makerBasisPoints', label: 'Maker Basis Points', tip: TIPS.makerBasisPoints, when: isBasisPoints, disabled: !!v.applyAsSpread },
    { k: 'flatFee', label: 'Flat Fee', tip: TIPS.flatFee, when: x => !isBasisPoints(x) },
    { k: 'makerFlatFee', label: 'Maker Flat Fee', tip: TIPS.makerFlatFee, when: x => !isBasisPoints(x) },
    { k: 'applyAsSpread', label: 'Apply as Commission Spread', kind: 'toggle', tip: TIPS.applyAsSpread, when: isBasisPoints, disabled: !!(v.minimumNotional || v.maximumNotional) },
    { k: 'allowOrderEntryOverride', label: 'Allow Order Entry Override', kind: 'toggle', tip: TIPS.allowOrderEntryOverride },
    { k: 'roundToCurrencyPrecision', label: 'Round to Currency Precision', kind: 'toggle', tip: TIPS.roundToCurrencyPrecision },
    { k: 'roundingMethod', label: 'Rounding Method', kind: 'select', options: ROUNDING_METHODS, tip: TIPS.roundingMethod },
    { k: 'evaluateAsExpression', label: 'Evaluate as Expression', kind: 'toggle', tip: TIPS.evaluateAsExpression },
    { k: 'minimumNotional', label: 'Minimum Notional', tip: TIPS.minimumNotional },
    { k: 'maximumRateBasisPoints', label: 'Maximum Rate Basis Points', tip: TIPS.maximumRateBasisPoints },
    { k: 'maximumNotional', label: 'Maximum Notional', tip: TIPS.maximumNotional },
    { k: '_overrides', label: editing ? 'Filters and Overrides (can’t be changed)' : 'Filters and Overrides', kind: 'head' },
    fixed({ k: 'firm', label: 'Firm', kind: 'select', options: commissionFirmOptions(), blank: 'Any firm', display: r => (firmById(r.firm) || {}).name }),
    fixed({ k: 'includeProperties', label: 'Include Account Properties', kind: 'multi', options: ACCOUNT_PROPERTIES, display: r => (r.includeProperties || []).join(', ') }),
    fixed({ k: 'excludeProperties', label: 'Exclude Account Properties', kind: 'multi', options: ACCOUNT_PROPERTIES, display: r => (r.excludeProperties || []).join(', ') }),
    fixed({ k: 'userOverride', label: 'User Override', mono: true, tip: TIPS.userOverride, ph: 'firms/firmA/users/userA' }),
    fixed({ k: 'accountOverride', label: 'Account Override', mono: true, tip: TIPS.accountOverride, ph: 'firms/firmA/accounts/accountA' }),
    fixed({ k: 'accountTypeOverride', label: 'Account Type Override', kind: 'select', options: ACCOUNT_TYPES, blank: 'Any' }),
    fixed({ k: 'sideOverride', label: 'Side Override', kind: 'select', options: ORDER_SIDES, blank: 'Any' }),
    fixed({ k: 'symbolOverride', label: 'Symbol Override', mono: true, lockedBy: 'productOverride' }),
    fixed({ k: 'productOverride', label: 'Product Override', mono: true, lockedBy: 'symbolOverride' }),
    fixed({ k: 'blockTradeOverride', label: 'Block Trade Override', kind: 'toggle' }),
    fixed({ k: 'rfqTradeOverride', label: 'RFQ Trade Override', kind: 'toggle' }),
    { k: 'expirationTime', label: 'Expiration Date/Time', inputType: 'datetime-local', display: r => (r.expirationTime ? formatWhen(r.expirationTime) : '') },
  ];
}

const COMMISSION_OVERRIDE_LABELS = { userOverride: 'User', accountOverride: 'Account', accountTypeOverride: 'Account Type', sideOverride: 'Side', symbolOverride: 'Symbol', productOverride: 'Product', blockTradeOverride: 'Block Trades', rfqTradeOverride: 'RFQ Trades' };
const commissionOverridesText = c => COMMISSION_OVERRIDES.filter(k => !isEmpty(c[k]))
  .map(k => (typeof c[k] === 'boolean' ? COMMISSION_OVERRIDE_LABELS[k] : `${COMMISSION_OVERRIDE_LABELS[k]}: ${c[k]}`)).join(', ');

const COMMISSION_COLUMNS = [
  ['Commission Type', c => c.type], ['Basis Points', c => c.basisPoints, true], ['Maker Basis Points', c => c.makerBasisPoints, true],
  ['Flat Fee', c => c.flatFee, true], ['Maker Flat Fee', c => c.makerFlatFee, true], ['Minimum Notional', c => c.minimumNotional, true],
  ['Maximum Notional', c => c.maximumNotional, true], ['Rounding Method', c => c.roundingMethod], ['Firm', c => (firmById(c.firm) || {}).name || 'Any firm'],
  ['Overrides', commissionOverridesText], ['Expiration', c => (c.expirationTime ? formatWhen(c.expirationTime) : '')],
];

const POSITION_COLUMNS = [['symbol', 'Symbol'], ['subType', 'Sub Type'], ['bod', 'BOD Position', true], ['open', 'Open Positions', true], ['bought', 'Qty Bought', true], ['sold', 'Qty Sold', true], ['unsettled', 'Unsettled', true]];

const LEDGER_VIEWS = {
  'balance-ledger': {
    noun: 'balance ledger entries',
    file: 'balance-ledger.csv',
    search: { k: 'symbol', label: 'Symbol', ph: 'Find by exact symbol', exact: true, test: (r, v) => exactMatch(r.symbol, v) },
    filters: [
      { k: 'from', label: 'Transaction Time From', short: 'From', date: true, test: (r, v) => r.time.slice(0, 10) >= v },
      { k: 'to', label: 'Transaction Time To', short: 'To', date: true, test: (r, v) => r.time.slice(0, 10) <= v },
      { k: 'bizFrom', label: 'Start Business Date', short: 'Business Date From', date: true, test: (r, v) => r.businessDate >= v },
      { k: 'bizTo', label: 'End Business Date', short: 'Business Date To', date: true, test: (r, v) => r.businessDate <= v },
      { k: 'description', label: 'Description', test: (r, v) => String(r.description).toLowerCase().includes(v.toLowerCase()) },
    ],
    columns: [
      ['time', 'Transaction Time', 'when'], ['businessDate', 'Business Date', 'when'], ['currency', 'Currency'], ['description', 'Description'], ['symbol', 'Symbol', 'mono'],
      ['balanceBefore', 'Fiat Balance Before', 'money'], ['balanceAfter', 'Fiat Balance After', 'money'], ['capitalBefore', 'Capital Requirement Before', 'money'],
      ['capitalAfter', 'Capital Requirement After', 'money'], ['excessBefore', 'Excess Capital Before', 'money'], ['excessAfter', 'Excess Capital After', 'money'],
    ],
  },
  'position-ledger': {
    noun: 'position ledger entries',
    file: 'position-ledger.csv',
    search: { k: 'symbol', label: 'Symbol', ph: 'Find by exact symbol', exact: true, test: (r, v) => exactMatch(r.symbol, v) },
    filters: [
      { k: 'from', label: 'Transaction Time From', short: 'From', date: true, test: (r, v) => r.time.slice(0, 10) >= v },
      { k: 'to', label: 'Transaction Time To', short: 'To', date: true, test: (r, v) => r.time.slice(0, 10) <= v },
      { k: 'tradeFrom', label: 'Start Trade Date', short: 'Trade Date From', date: true, test: (r, v) => r.tradeDate >= v },
      { k: 'tradeTo', label: 'End Trade Date', short: 'Trade Date To', date: true, test: (r, v) => r.tradeDate <= v },
      { k: 'tradeId', label: 'Trade ID', exact: true, ph: 'Exact trade ID', test: (r, v) => exactMatch(r.tradeId, v) },
      { k: 'referenceId', label: 'Reference ID', exact: true, ph: 'Exact reference ID', test: (r, v) => exactMatch(r.referenceId, v) },
      { k: 'description', label: 'Description', test: (r, v) => String(r.description).toLowerCase().includes(v.toLowerCase()) },
    ],
    columns: [
      ['time', 'Transaction Time', 'when'], ['tradeDate', 'Trade Date', 'when'], ['description', 'Description'], ['symbol', 'Symbol', 'mono'], ['subType', 'Sub Type'],
      ['entryType', 'Entry Type'], ['before', 'Position Before', 'num'], ['after', 'Position After', 'num'], ['tradeId', 'Trade ID', 'mono'], ['referenceId', 'Reference ID', 'mono'],
      ['allocationGroupId', 'Allocation Group ID', 'mono'], ['transferReferenceTradeIds', 'Transfer Reference Trade IDs', 'mono'],
    ],
  },
};
