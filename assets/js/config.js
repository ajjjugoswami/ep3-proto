'use strict';

const STORE_KEY = 'ep3.firms.prototype.v2';
const SESSION_KEY = 'ep3.firms.prototype.session';
const SIDE_KEY = 'ep3.firms.prototype.side';
const THEME_KEY = 'ep3.firms.prototype.theme';

const TYPES = {
  clearingHouse: { label: 'Clearing House' },
  clearingMember: { label: 'Clearing Member' },
  participant: { label: 'Participant' },
  agent: { label: 'Agent' },
  supervisor: { label: 'Supervisor' },
};
const STATES = { active: 'Active', suspended: 'Suspended' };
const ORG_TYPES = ['C Corporation', 'Subchapter S Corporation', 'Limited Liability Company', 'Limited Partnership', 'General Partnership', 'Other'];
const PARTICIPANT_TYPES = ['Swap Dealer', 'Major Swap Participant', 'Financial Entity', 'Non US Person', 'US Person'];
const ROLES = ['CEO', 'CFO', 'COO', 'CRO', 'CIO', 'CCO', 'FINOP', 'Authorized Representative'];
const ACTIVE_OPTIONS = Object.values(STATES);

const isParticipant = f => f.type === 'participant';
const tradesOrClears = f => f.type === 'participant' || f.type === 'clearingMember';

const SECTIONS = [
  { id: 'identity', title: 'Identity', fields: [
    { k: 'name', label: 'Firm Name', req: true },
    { k: 'id', label: 'Firm ID', req: true, mono: true, createOnly: true, help: 'Must be unique. It can’t be changed after the firm is created.' },
    { k: 'type', label: 'Firm Type', kind: 'type' },
    { k: 'state', label: 'Firm State', kind: 'select', options: Object.entries(STATES).map(([value, label]) => ({ value, label })) },
  ] },
  { id: 'trading', title: 'Trading Settings', fields: [
    { k: 'applyCommissionsAsSpread', label: 'Apply Commissions as Spread', kind: 'toggle', when: isParticipant },
    { k: 'skipCommissionBalanceAdjustment', label: 'Skip Commission Balance Adjustment', kind: 'toggle', when: isParticipant },
    { k: 'skipRiskAndCurrencyChecks', label: 'Skip Risk and Currency Checks', kind: 'toggle', when: isParticipant, help: 'Skips Pre-Trade Risk checks for all accounts under this firm.' },
    { k: 'hasSponsoredDirectMarketAccess', label: 'Has Sponsored / Direct Market Access', kind: 'toggle', when: isParticipant },
    { k: 'isDisintermediated', label: 'Disintermediated', kind: 'toggle', when: tradesOrClears, help: 'An in-house firm operated by the exchange. This doesn’t change EP3 behavior, but some regulatory reports treat these firms differently.' },
  ] },
  { id: 'regulatory', title: 'Legal & Regulatory', fields: [
    { k: 'participantType', label: 'Participant Type', kind: 'select', options: PARTICIPANT_TYPES, blank: 'Not set', when: isParticipant },
    { k: 'organizationType', label: 'Organization Type', kind: 'select', options: ORG_TYPES, blank: 'Not set' },
    { k: 'legalEntityIdentifier', label: 'Legal Entity Identifier', mono: true, kind: 'lei', help: 'The 20-character ISO 17442 code. Regulatory reports may require it.' },
    { k: 'legalName', label: 'Legal Name' },
    { k: 'usTaxpayerIdentificationNumber', label: 'US Taxpayer Identification Number' },
    { k: 'designatedSelfRegulatoryOrganization', label: 'Designated Self Regulatory Organization' },
    { k: 'designatedExaminingAuthority', label: 'Designated Examining Authority' },
  ] },
  { id: 'contact', title: 'Contact', fields: [
    { k: 'businessContactName', label: 'Business Contact Name' },
    { k: 'email', label: 'Email', inputType: 'email', ph: 'name@example.com' },
    { k: 'phoneNumber', label: 'Phone Number', inputType: 'tel', ph: '+1 312 555 0100' },
  ] },
  { id: 'address', title: 'Main Address', fields: [
    { k: 'mainAddress1', label: 'Address Line 1', auto: 'address-line1' },
    { k: 'mainAddress2', label: 'Address Line 2', auto: 'address-line2' },
    { k: 'mainAddressCity', label: 'City', auto: 'address-level2' },
    { k: 'mainAddressState', label: 'State', auto: 'address-level1' },
    { k: 'mainAddressPostalCode', label: 'Postal Code', auto: 'postal-code' },
    { k: 'mainAddressCountryCode', label: 'Country Code', auto: 'country', ph: 'US' },
  ] },
  { id: 'clearing', title: 'Clearing Integration', note: 'Maps this firm’s trading accounts to a risk group on a clearing system. It doesn’t change how trades or balances are processed in EP3.', fields: [
    { k: 'riskGroup', label: 'Risk Group ID', mono: true, when: isParticipant, help: 'The firm’s position accounts on the clearing platform must belong to this risk group.' },
  ] },
  { id: 'altNames', title: 'Alternate Legal Names', collection: 'altNames' },
  { id: 'personnel', title: 'Key Personnel', collection: 'personnel' },
  { id: 'aliases', title: 'Aliases', collection: 'aliases', note: 'Maps this firm to the identifiers used by third-party integrations, such as a regulator’s report.' },
];

const COLLECTIONS = {
  altNames: { title: 'Alternate Legal Names', one: 'Legal Name', primary: 'name', empty: 'No alternate legal names.', fields: [
    { k: 'name', label: 'Legal Name', req: true },
  ] },
  personnel: { title: 'Key Personnel', one: 'Person', primary: 'name', empty: 'No key personnel.', columns: [['name', 'Name'], ['role', 'Role'], ['email', 'Email', true], ['phoneNumber', 'Phone', true]], fields: [
    { k: 'name', label: 'Name', req: true },
    { k: 'email', label: 'Email', inputType: 'email', req: true },
    { k: 'phoneNumber', label: 'Phone Number', inputType: 'tel', req: true },
    { k: 'role', label: 'Role', kind: 'select', options: ROLES, blank: 'Not set' },
    { k: 'address1', label: 'Address Line 1' },
    { k: 'address2', label: 'Address Line 2' },
    { k: 'addressCity', label: 'City' },
    { k: 'addressState', label: 'State' },
    { k: 'addressPostalCode', label: 'Postal Code' },
    { k: 'addressCountryCode', label: 'Country Code' },
  ] },
  aliases: { title: 'Aliases', one: 'Alias', primary: 'option', empty: 'No aliases.', columns: [['option', 'Integration'], ['alias', 'Alias']], fields: [
    { k: 'option', label: 'Integration', req: true, ph: 'CFTC' },
    { k: 'alias', label: 'Alias', req: true, mono: true },
  ] },
  limits: { title: 'Position Limits', one: 'Position Limit', primary: 'label', labelOf: r => r.symbol || r.product, empty: 'No position limits are set for this firm.', note: 'Set a limit for a product or a symbol.', columns: [['product', 'Product'], ['symbol', 'Symbol'], ['aggregated', 'Aggregated', true, 'bool'], ['shortPositionLimit', 'Short Limit', false, 'num'], ['longPositionLimit', 'Long Limit', false, 'num']], fields: [
    { k: 'product', label: 'Product', ph: 'BTC', lockedBy: 'symbol' },
    { k: 'aggregated', label: 'Aggregated by Product', kind: 'toggle', lockedBy: 'symbol' },
    { k: 'symbol', label: 'Symbol', mono: true, ph: 'BTC-DEC26', lockedBy: 'product' },
    { k: 'shortPositionLimit', label: 'Short Position Limit', inputType: 'number', min: 0 },
    { k: 'longPositionLimit', label: 'Long Position Limit', inputType: 'number', min: 0 },
  ], validate: r => {
    if (!r.product && !r.symbol) return { product: 'Enter a product or a symbol.' };
    if (r.product && r.symbol) return { symbol: 'Enter a product or a symbol, not both.' };
    if (r.aggregated && !r.product) return { aggregated: 'Only product limits can be aggregated.' };
    return {};
  } },
};

const TABS = [
  { path: '', label: 'Firm Profile', when: () => true },
  { path: 'users', label: 'Users', render: f => entityTabHTML('users', f), when: f => ['participant', 'clearingMember', 'supervisor', 'agent'].includes(f.type) },
  { path: 'accounts', label: 'Accounts', render: f => accountsTabHTML(f), when: f => !['supervisor', 'agent'].includes(f.type) },
  { path: 'position-limits', label: 'Position Limits', render: f => limitsTabHTML(f), when: f => !['supervisor', 'agent'].includes(f.type) },
  { path: 'association', label: 'Firm Associations', render: f => associationsTabHTML(f), when: f => f.type !== 'supervisor' },
  { path: 'services', label: 'Firm Services', render: f => entityTabHTML('services', f), when: f => ['clearingMember', 'supervisor'].includes(f.type) },
];

const ASSOC = {
  participant: [
    { key: 'affiliated', type: 'participant', title: n => `Participant Firms Affiliated with ${n}`, help: () => 'Associate any Participant Firms that are affiliated with this firm, such as subsidiaries of the same parent company.', available: 'Available Participant Firms', associated: 'Affiliated Participant Firms' },
    { key: 'rfq', type: 'participant', title: n => `RFQ Participant Firms for ${n}`, help: n => `Firms that ${n} will accept RFQs from.`, available: 'Available Participant Firms', associated: 'Associated RFQ Participant Firms' },
    { key: 'agent', type: 'agent', title: n => `Agents for ${n}`, help: () => 'Agents, typically brokers, that can enter orders on behalf of this firm.', available: 'Available Agents / Brokers', associated: 'Associated Agents / Brokers' },
    { key: 'clearingMembers', type: 'clearingMember', title: n => `Clearing Members associated with ${n}`, help: () => 'Clearing Members where this firm has accounts.' },
  ],
  clearingMember: [
    { key: 'participants', type: 'participant', title: n => `Participant Firms Associated with ${n}`, help: () => 'These Participant Firms submit trades for clearance and settlement with this Clearing Member.' },
    { key: 'clearingHouses', type: 'clearingHouse', title: n => `Clearing Houses Associated with ${n}`, help: () => 'The Clearing Houses that this Clearing Member belongs to.' },
  ],
  clearingHouse: [
    { key: 'clearingMembers', type: 'clearingMember', title: n => `Clearing Member Firms Associated with ${n}`, help: () => 'The Clearing Members that have clearing privileges with this clearing house.' },
  ],
  agent: [
    { key: 'participants', type: 'participant', title: n => `Participant Firms Associated with ${n}`, help: () => 'The Participant Firms that this Agent Firm trades on behalf of.', available: 'Available Participant Firms', associated: 'Associated Participant Firms' },
  ],
};

const ROLES_BY_TYPE = {
  participant: ['Trading', 'Trading Read Only', 'Market Data', 'Drop Copy'],
  agent: ['Trading', 'Trading Read Only', 'Market Data', 'Drop Copy', 'Broker'],
  supervisor: ['Supervisor Read Only Admin', 'Supervisor Limited Member Admin', 'Supervisor Onboarding Admin', 'Supervisor Exchange Operation Admin', 'Supervisor Admin'],
  clearingMember: ['Supervisor Read Only Admin', 'Supervisor Limited Member Admin', 'Supervisor Onboarding Admin'],
};
const ACCOUNT_TYPES = ['Customer', 'Non Customer', 'House Trader', 'Floor Trader', 'Non Customer Cross Margined', 'House Trader Cross Margined', 'Joint Back Office', 'Equities Specialist', 'Options Market Maker', 'Options Firm Account', 'Aggregated Customer And Non Customer', 'Aggregated Multiple Customers', 'Liquidity Provider', 'Operating', 'Clearing Fund', 'Futures Market Maker'];
const ACCOUNT_STATES = ['Active', 'Suspended', 'Liquidate Only'];
const firmNamesOfType = type => firms.filter(x => !x.deleted && x.type === type).map(x => x.name);
const firmField = f => ({ k: '_firm', label: 'Firm', kind: 'static', value: f.name });

const ENTITIES = {
  users: {
    key: 'users', one: 'User', plural: 'Users', newSeg: 'new', bulk: true, title: r => r.displayName,
    columns: [['Name', r => r.displayName, { strong: true }], ['User ID', r => r.id, { mono: true, sec: true }], ['User Role', r => r.role], ['State', r => r.state, { pill: true }], ['Firm', (r, f) => f.name, { sec: true }]],
    fields: f => [
      { k: 'id', label: 'User ID', req: true, mono: true, createOnly: true, help: 'It can’t be changed after the user is created.' },
      { k: 'displayName', label: 'User Name', req: true },
      firmField(f),
      { k: 'role', label: 'Role', kind: 'select', options: ROLES_BY_TYPE[f.type] || [], blank: 'Choose a role', req: true },
      { k: 'groupName', label: 'Group Name' },
      { k: 'state', label: 'User State', kind: 'select', options: ['Active', 'Suspended'], def: 'Active' },
    ],
  },
  accounts: {
    key: 'accounts', one: 'Account', plural: 'Accounts', newSeg: 'new', bulk: true, wide: true, title: r => r.displayName,
    columns: [
      ['Name', r => r.displayName, { strong: true }], ['Account Type', r => r.accountType], ['Associated Firm', (r, f) => f.name], ['Clearing Firm', r => r.clearingMember],
      ['Risk System', r => r.riskSystem], ['Risk Profile', r => r.riskProfile || 'N/A'], ['Collateral Return', r => (r.collateralReturnEnabled ? 'Enabled' : '')], ['Collateral Account', r => r.collateralAccount],
      ['State', r => r.state, { pill: true }], ['Order Size Lower Limit', r => r.orderSizeLow, { num: true }], ['Lower Limit Set', r => (r.orderSizeLowSet ? 'On' : 'Off')], ['Order Size Higher Limit', r => r.orderSizeHigh, { num: true }], ['Higher Limit Set', r => (r.orderSizeHighSet ? 'On' : 'Off')],
    ],
    fields: f => [
      { k: 'displayName', label: 'Account Name', req: true },
      { k: 'id', label: 'Account ID', req: true, mono: true, createOnly: true, help: 'It can’t be changed after the account is created.' },
      { k: 'accountType', label: 'Account Type', kind: 'select', options: ACCOUNT_TYPES, blank: 'Not set' },
      { k: 'state', label: 'Account State', kind: 'select', options: ACCOUNT_STATES, def: 'Active' },
      { k: '_firm', label: 'Participant Firm', kind: 'static', value: f.name },
      { k: 'clearingMember', label: 'Clearing Member Firm', kind: 'select', options: firmNamesOfType('clearingMember'), blank: 'Choose a firm', req: true },
      { k: 'clearingHouse', label: 'Clearing House', kind: 'select', options: firmNamesOfType('clearingHouse'), blank: 'Not set' },
      { k: 'riskSystem', label: 'Risk System', kind: 'select', options: ['Default'], def: 'Default' },
      { k: 'riskProfile', label: 'Risk Profile' },
      { k: 'priorityWeight', label: 'Account Priority Weight', inputType: 'number', min: 0 },
      { k: 'collateralAccount', label: 'Collateral Account', kind: 'select', options: (f.accounts || []).map(a => a.id), blank: 'Not set' },
      { k: 'collateralReturnEnabled', label: 'Collateral Return Enabled', kind: 'toggle' },
      { k: 'orderSizeLow', label: 'Order Size Lower Limit', inputType: 'number', min: 0 },
      { k: 'orderSizeLowSet', label: 'Lower Limit Set', kind: 'toggle' },
      { k: 'orderSizeHigh', label: 'Order Size Higher Limit', inputType: 'number', min: 0 },
      { k: 'orderSizeHighSet', label: 'Higher Limit Set', kind: 'toggle' },
    ],
  },
  services: {
    key: 'services', one: 'Firm Service', plural: 'Firm Services', newSeg: 'newService', title: r => r.id,
    columns: [['Name', r => r.id, { strong: true }], ['Firm', (r, f) => f.name, { sec: true }], ['Description', r => r.description, { sec: true }], ['State', r => r.state, { pill: true }]],
    fields: f => [
      { k: 'id', label: 'Firm Service ID', req: true, mono: true, createOnly: true, help: 'It can’t be changed after the service is created.' },
      { k: 'description', label: 'Description' },
      firmField(f),
      { k: 'role', label: 'Role', kind: 'select', options: ROLES_BY_TYPE[f.type] || [], blank: 'Choose a role', req: true },
      { k: 'state', label: 'Firm Service State', kind: 'select', options: ['Active', 'Suspended'], def: 'Active' },
    ],
  },
  keys: {
    key: 'keys', one: 'API Key', plural: 'API Keys', newSeg: 'new', title: r => r.id,
    columns: [['Name', r => r.id, { strong: true }], ['Token ID', r => r.jti, { mono: true }], ['Role', r => r.role]],
    fields: (f, sid) => [
      { k: 'id', label: 'API Key Name', req: true, createOnly: true, help: 'It can’t be changed after the key is created.' },
      { k: 'description', label: 'API Key Description' },
      { k: '_service', label: 'Firm Service', kind: 'static', value: sid },
      { k: 'role', label: 'Role', kind: 'select', options: ROLES_BY_TYPE[f.type] || [], blank: 'Choose a role', req: true },
    ],
  },
};

const NAV = [
  { label: 'Directory', items: [['Firms', 'building', true], ['Users', 'users'], ['Accounts', 'card'], ['Groups', 'group']] },
  { label: 'Markets', items: [['Instruments', 'list'], ['Time & Sales', 'calendar'], ['Order Search', 'search'], ['RFQ Search', 'quote']] },
  { label: 'Operations', items: [['Admin Requests', 'check'], ['Jobs', 'terminal'], ['Alerts', 'bell']] },
  { label: 'Account', items: [['Change Password', 'shield'], ['License', 'seal']] },
];
const THEMES = [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'monitor']];
