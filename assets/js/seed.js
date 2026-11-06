'use strict';

const slug = s => String(s || '').trim().replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
const firm = (name, type, extra = {}) => ({
  id: slug(name), name, type, state: 'active', deleted: false,
  altNames: [], personnel: [], aliases: [], users: [], accounts: [], positions: [], limits: [], assoc: {}, services: [],
  ...extra,
});
const user = (id, displayName, role, state = 'Active') => ({ id, displayName, role, state, groupName: '' });
const account = (id, accountType, clearingMember, extra = {}) => ({
  id, displayName: id, accountType, state: 'Active', clearingMember, clearingHouse: 'Connamara Clearing House',
  riskSystem: 'Default', riskProfile: '', collateralReturnEnabled: false, collateralAccount: '', priorityWeight: '',
  orderSizeLow: '', orderSizeLowSet: false, orderSizeHigh: '', orderSizeHighSet: false, ...extra,
});
const service = (id, description, role, keys = []) => ({ id, description, role, state: 'Active', keys });
const seed = () => [
  firm('DefaultExchangeSupervisorFirm', 'supervisor', {
    users: [user('admin', 'Exchange Admin', 'Supervisor Admin'), user('ops.supervisor', 'Ops Supervisor', 'Supervisor Exchange Operation Admin')],
    services: [service('surveillance-feed', 'Market surveillance export', 'Supervisor Read Only Admin', [{ id: 'surveillance-prod', description: 'Production export', role: 'Supervisor Read Only Admin', jti: 'a91f-2c7e-44d0' }])],
  }),
  firm('MGEX', 'clearingHouse', { organizationType: 'C Corporation', legalName: 'MGEX Clearing', mainAddressCity: 'Minneapolis', mainAddressState: 'MN', mainAddressCountryCode: 'US', assoc: { clearingMembers: ['Clearing-Member-A'] } }),
  firm('Connamara Clearing House', 'clearingHouse', {
    organizationType: 'Limited Liability Company', legalName: 'Connamara Clearing House LLC', legalEntityIdentifier: '5493001KJTIIGC8Y1R12',
    businessContactName: 'Jordan Reyes', email: 'clearing@example.com', phoneNumber: '+1 312 555 0142',
    designatedSelfRegulatoryOrganization: 'NFA', designatedExaminingAuthority: 'CFTC',
    mainAddress1: '200 W Jackson Blvd', mainAddressCity: 'Chicago', mainAddressState: 'IL', mainAddressPostalCode: '60606', mainAddressCountryCode: 'US',
    usTaxpayerIdentificationNumber: '36-5550142',
    accounts: [account('CCH-House', 'House Trader', 'Connamara Clearing')],
    assoc: { clearingMembers: ['Connamara-Clearing'] },
  }),
  firm('Connamara Clearing', 'clearingMember', {
    organizationType: 'Limited Liability Company', legalName: 'Connamara Clearing LLC', businessContactName: 'Sam Patel', email: 'members@example.com',
    mainAddress1: '200 W Jackson Blvd', mainAddressCity: 'Chicago', mainAddressState: 'IL', mainAddressPostalCode: '60606', mainAddressCountryCode: 'US',
    users: [user('sam.patel', 'Sam Patel', 'Supervisor Onboarding Admin')],
    accounts: [account('CC-Omnibus', 'Customer', 'Connamara Clearing', { riskProfile: 'Standard' })],
    assoc: { participants: ['Connamara-Trading', 'A1-Trading'], clearingHouses: ['Connamara-Clearing-House'] },
    services: [service('drop-copy', 'Post-trade drop copy feed', 'Supervisor Read Only Admin')],
  }),
  firm('Connamara Trading', 'participant', {
    participantType: 'Financial Entity', organizationType: 'Limited Liability Company', legalName: 'Connamara Trading LLC', riskGroup: 'RG-1042',
    legalEntityIdentifier: '5493006MHB84DD0ZWV18', businessContactName: 'Alex Morgan', email: 'trading@example.com', phoneNumber: '+1 312 555 0187',
    usTaxpayerIdentificationNumber: '36-5550187', designatedSelfRegulatoryOrganization: 'NFA', designatedExaminingAuthority: 'CFTC',
    mainAddress1: '311 S Wacker Dr', mainAddress2: 'Suite 2400', mainAddressCity: 'Chicago', mainAddressState: 'IL', mainAddressPostalCode: '60606', mainAddressCountryCode: 'US',
    hasSponsoredDirectMarketAccess: true,
    altNames: [{ name: 'Connamara Technologies Trading' }],
    personnel: [{ name: 'Alex Morgan', email: 'alex.morgan@example.com', phoneNumber: '+1 312 555 0187', role: 'CEO', addressCity: 'Chicago', addressState: 'IL' }, { name: 'Riley Chen', email: 'riley.chen@example.com', phoneNumber: '+1 312 555 0133', role: 'CCO' }],
    aliases: [{ option: 'CFTC', alias: 'CONN-TRD-01' }],
    users: [user('alex.morgan', 'Alex Morgan', 'Trading'), user('riley.chen', 'Riley Chen', 'Trading Read Only'), user('desk.bot', 'Desk Bot', 'Drop Copy', 'Suspended')],
    accounts: [
      account('CT-Main', 'Customer', 'Connamara Clearing', { riskProfile: 'Standard', orderSizeLow: 1, orderSizeLowSet: true, orderSizeHigh: 500, orderSizeHighSet: true }),
      account('CT-Prop', 'House Trader', 'Connamara Clearing', { collateralReturnEnabled: true, collateralAccount: 'CT-Main' }),
    ],
    positions: [
      { account: 'CT-Main', symbol: 'BTC-DEC26', subType: 'Long', bod: 12, open: 18, bought: 9, sold: 3, unsettled: 6 },
      { account: 'CT-Prop', symbol: 'ETH-DEC26', subType: 'Short', bod: -40, open: -35, bought: 10, sold: 5, unsettled: 5 },
    ],
    limits: [{ product: 'BTC', symbol: '', aggregated: true, shortPositionLimit: 500, longPositionLimit: 500 }, { product: '', symbol: 'ETH-DEC26', aggregated: false, shortPositionLimit: 1200, longPositionLimit: 1500 }],
    assoc: { affiliated: ['A1-Trading'], rfq: ['Northline-Capital'], agent: ['Connamara-Agent-Firm'], clearingMembers: ['Connamara-Clearing'] },
  }),
  firm('Connamara Agent Firm', 'agent', { users: [user('agent.desk', 'Agent Desk', 'Broker')], assoc: { participants: ['Connamara-Trading'] } }),
  firm('Clearing Member A', 'clearingMember', { organizationType: 'General Partnership', email: 'cma@example.com', assoc: { clearingHouses: ['MGEX'] } }),
  firm('A1 Trading', 'participant', { participantType: 'US Person', organizationType: 'C Corporation', legalName: 'A1 Trading Inc', email: 'desk@example.com', riskGroup: 'RG-2201', accounts: [account('A1-Main', 'Customer', 'Connamara Clearing')], assoc: { clearingMembers: ['Connamara-Clearing'] } }),
  firm('Clearing-House', 'clearingHouse'),
  firm('DCM-Internal-Clearing-Member', 'clearingMember', { isDisintermediated: true, legalName: 'DCM Internal Clearing' }),
  firm('Northline Capital', 'participant', { participantType: 'Financial Entity', organizationType: 'Limited Partnership', legalName: 'Northline Capital LP', businessContactName: 'Casey Lindqvist', email: 'ops@example.com' }),
  firm('Harbor Point Markets', 'participant', { state: 'suspended', participantType: 'Swap Dealer', organizationType: 'Limited Liability Company', legalName: 'Harbor Point Markets LLC', skipRiskAndCurrencyChecks: true }),
  firm('Lakeshore Futures', 'clearingMember', { organizationType: 'C Corporation', mainAddressCity: 'Chicago', mainAddressState: 'IL' }),
  firm('Meridian Prop', 'participant', { participantType: 'US Person', applyCommissionsAsSpread: true }),
  firm('Vantage Execution', 'agent', { state: 'suspended' }),
  firm('Summit Liquidity', 'participant', { participantType: 'Major Swap Participant', organizationType: 'Limited Liability Company' }),
  firm('Blue Ridge Trading', 'participant', { participantType: 'Non US Person', mainAddressCountryCode: 'CA' }),
  firm('Orchard Clearing', 'clearingMember', { state: 'suspended' }),
  firm('Tidewater Commodities', 'participant', { participantType: 'US Person', legalName: 'Tidewater Commodities Inc' }),
  firm('Granite Peak Partners', 'participant', { organizationType: 'General Partnership' }),
  firm('Crestline Agency', 'agent'),
  firm('Pioneer Grain Co', 'participant', { participantType: 'Financial Entity', mainAddressState: 'MN' }),
  firm('Legacy Markets', 'participant', { deleted: true, participantType: 'US Person' }),
  firm('Old Harbor Clearing', 'clearingMember', { deleted: true }),
];
