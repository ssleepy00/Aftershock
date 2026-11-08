export type HazardType = 'Hurricane' | 'Earthquake' | 'Low';
export type RiskLevel = 'high' | 'moderate' | 'low';
export type InfraCategory = 'Data Center' | 'Power Supply' | 'Corporate HQ' | 'Wafer Fab';

export interface InfraSite {
  id: string;
  ticker: string;
  company: string;
  name: string;
  city: string;
  state: string;
  category: InfraCategory;
  lat: number;
  lng: number;
  hazard: HazardType;
  riskLevel: RiskLevel;
  unpricedImpactPct: number; // e.g. -0.6 means -0.6% unpriced risk from this site
  hazardDetail: string;
  powerCapacityMW: string;
}

export interface StockRiskProfile {
  ticker: string;
  company: string;
  weight: number; // portfolio weight % (0 - 100)
  hedgedWeight: number; // suggested rebalanced weight %
  exposureScore: number; // 0 - 100 risk score across HQ, Power Supply, Data Centers, Fabs
  unpricedRiskPct: number; // e.g. -1.4 means stock is overpriced by 1.4% due to unpriced disaster exposure
  expectedReturnPct: number; // annualized expected return %
  annualVolPct: number; // annualized volatility %
  maxEventDrawdownPct: number; // historical/simulated disaster max drawdown %
  primaryHazard: HazardType;
  riskLevel: RiskLevel;
  color: string;
  sites: InfraSite[];
}

export interface ScoreBreakdown {
  totalScore: number; // 0 - 100
  dataCenterPts: number;
  powerSupplyPts: number;
  hqPts: number;
  fabPts: number;
  corridorPenaltyPts: number;
  topDrivers: string[];
}

export interface PortfolioMetricsSnapshot {
  exposureScore: number;
  scoreBreakdown: ScoreBreakdown;
  unpricedRiskPct: number; // Net of transaction costs when hedged
  sharpeRatio: number; // Net of transaction costs when hedged
  sortinoRatio: number; // Net of transaction costs when hedged
  maxDrawdownPct: number;
  tailCvar99Pct: number;
  annualReturnPct: number;
  annualVolPct: number;
  turnoverPct: number;
  transactionCostPct: number;
}

export interface PortfolioMetricsComparison {
  current: PortfolioMetricsSnapshot;
  hedged: PortfolioMetricsSnapshot;
}

export interface PortfolioPreset {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  items: { ticker: string; weight: number }[];
}

export const STOCK_DATABASE: Record<string, Omit<StockRiskProfile, 'weight' | 'hedgedWeight'>> = {
  NVDA: {
    ticker: 'NVDA',
    company: 'NVIDIA',
    exposureScore: 84,
    unpricedRiskPct: -1.4,
    expectedReturnPct: 24.5,
    annualVolPct: 38.0,
    maxEventDrawdownPct: -26.4,
    primaryHazard: 'Earthquake',
    riskLevel: 'high',
    color: '#E57A54',
    sites: [
      {
        id: 'nvda-hq',
        ticker: 'NVDA',
        company: 'NVIDIA',
        name: 'Voyager & Endeavor Corporate HQ',
        city: 'Santa Clara',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.3708,
        lng: -121.9636,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.5,
        hazardDetail: 'San Andreas & Hayward Faults · 0.68g Peak Ground Accel',
        powerCapacityMW: '180 MW Silicon Valley Grid',
      },
      {
        id: 'nvda-dc',
        ticker: 'NVDA',
        company: 'NVIDIA',
        name: 'Selene & Eos AI Supercomputer Cluster',
        city: 'Santa Clara',
        state: 'CA',
        category: 'Data Center',
        lat: 37.385,
        lng: -121.952,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'High Liquefaction Zone · Liquid-Cooling Loop Risk',
        powerCapacityMW: '240 MW High-Density Feed',
      },
      {
        id: 'nvda-pwr',
        ticker: 'NVDA',
        company: 'NVIDIA',
        name: 'Austin ERCOT High-Voltage AI Substation',
        city: 'Austin',
        state: 'TX',
        category: 'Power Supply',
        lat: 30.397,
        lng: -97.724,
        hazard: 'Hurricane',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.3,
        hazardDetail: 'Gulf Storm Corridor & ERCOT Grid Fragility',
        powerCapacityMW: '310 MW Dedicated Substation',
      },
      {
        id: 'nvda-fab',
        ticker: 'NVDA',
        company: 'NVIDIA',
        name: 'Hillsboro Silicon Photonics & Validation Lab',
        city: 'Hillsboro',
        state: 'OR',
        category: 'Wafer Fab',
        lat: 45.541,
        lng: -122.961,
        hazard: 'Earthquake',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Cascadia Subduction Zone · Cleanroom Vibration Risk',
        powerCapacityMW: '95 MW BPA Grid Feed',
      },
    ],
  },
  META: {
    ticker: 'META',
    company: 'Meta Platforms',
    exposureScore: 76,
    unpricedRiskPct: -1.1,
    expectedReturnPct: 19.2,
    annualVolPct: 31.5,
    maxEventDrawdownPct: -22.0,
    primaryHazard: 'Hurricane',
    riskLevel: 'high',
    color: '#F25C54',
    sites: [
      {
        id: 'meta-hq',
        ticker: 'META',
        company: 'Meta Platforms',
        name: 'Menlo Park Bayfront Corporate HQ',
        city: 'Menlo Park',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.484,
        lng: -122.148,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'San Francisco Bay Margin Liquefaction & Fault Zone',
        powerCapacityMW: '140 MW Campus Microgrid',
      },
      {
        id: 'meta-dc',
        ticker: 'META',
        company: 'Meta Platforms',
        name: 'Henrico Hyperscale AI Data Center',
        city: 'Henrico',
        state: 'VA',
        category: 'Data Center',
        lat: 37.501,
        lng: -77.332,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Atlantic Hurricane Track & Extreme Rainfall Basin',
        powerCapacityMW: '450 MW Dominion Feed',
      },
      {
        id: 'meta-pwr',
        ticker: 'META',
        company: 'Meta Platforms',
        name: 'Coastal Virginia Transmission & Solar Switchyard',
        city: 'CHESAPEAKE',
        state: 'VA',
        category: 'Power Supply',
        lat: 36.768,
        lng: -76.287,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.3,
        hazardDetail: 'Tidal Storm Surge & 500kV Transmission Corridor',
        powerCapacityMW: '620 MW High-Voltage Substation',
      },
    ],
  },
  AMZN: {
    ticker: 'AMZN',
    company: 'Amazon (AWS)',
    exposureScore: 72,
    unpricedRiskPct: -0.9,
    expectedReturnPct: 18.4,
    annualVolPct: 26.8,
    maxEventDrawdownPct: -18.5,
    primaryHazard: 'Hurricane',
    riskLevel: 'high',
    color: '#F4A261',
    sites: [
      {
        id: 'amzn-dc',
        ticker: 'AMZN',
        company: 'Amazon (AWS)',
        name: 'AWS US-East-1 Core Interconnect Cluster',
        city: 'Ashburn',
        state: 'VA',
        category: 'Data Center',
        lat: 39.0438,
        lng: -77.4874,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Primary East Coast Cloud Concentration Bottleneck',
        powerCapacityMW: '1,200 MW PJM Data Alley Feed',
      },
      {
        id: 'amzn-pwr',
        ticker: 'AMZN',
        company: 'Amazon (AWS)',
        name: 'North Anna Nuclear Power Supply Hub',
        city: 'Mineral',
        state: 'VA',
        category: 'Power Supply',
        lat: 38.06,
        lng: -77.789,
        hazard: 'Hurricane',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.3,
        hazardDetail: 'Co-located Nuclear/Transmission Cooling Water Exposure',
        powerCapacityMW: '960 MW Dedicated Baseload',
      },
      {
        id: 'amzn-hq',
        ticker: 'AMZN',
        company: 'Amazon (AWS)',
        name: 'Seattle South Lake Union Corporate HQ',
        city: 'Seattle',
        state: 'WA',
        category: 'Corporate HQ',
        lat: 47.622,
        lng: -122.336,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Seattle Fault & Cascadia Subduction Zone',
        powerCapacityMW: '210 MW Seattle City Light',
      },
    ],
  },
  GOOGL: {
    ticker: 'GOOGL',
    company: 'Alphabet',
    exposureScore: 67,
    unpricedRiskPct: -0.8,
    expectedReturnPct: 17.6,
    annualVolPct: 24.5,
    maxEventDrawdownPct: -16.8,
    primaryHazard: 'Hurricane',
    riskLevel: 'moderate',
    color: '#E9C46A',
    sites: [
      {
        id: 'googl-dc',
        ticker: 'GOOGL',
        company: 'Alphabet',
        name: 'Berkeley County Coastal Cloud Campus',
        city: 'Moncks Corner',
        state: 'SC',
        category: 'Data Center',
        lat: 33.126,
        lng: -80.008,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Charleston Coastal Storm Surge & Category 4 Wind Zone',
        powerCapacityMW: '380 MW Santee Cooper Grid',
      },
      {
        id: 'googl-hq',
        ticker: 'GOOGL',
        company: 'Alphabet',
        name: 'Googleplex & Bay View Corporate HQ',
        city: 'Mountain View',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.422,
        lng: -122.084,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.3,
        hazardDetail: 'San Andreas Fault 11km West · Bay Margin Soil',
        powerCapacityMW: '195 MW Clean Microgrid',
      },
      {
        id: 'googl-pwr',
        ticker: 'GOOGL',
        company: 'Alphabet',
        name: 'Midwest Wind & Substation Intertie',
        city: 'Council Bluffs',
        state: 'IA',
        category: 'Power Supply',
        lat: 41.201,
        lng: -95.842,
        hazard: 'Low',
        riskLevel: 'low',
        unpricedImpactPct: -0.1,
        hazardDetail: 'Inland Low-Seismic / Low-Hurricane Redundancy Zone',
        powerCapacityMW: '540 MW MidAmerican Grid',
      },
    ],
  },
  MSFT: {
    ticker: 'MSFT',
    company: 'Microsoft',
    exposureScore: 44,
    unpricedRiskPct: -0.4,
    expectedReturnPct: 17.9,
    annualVolPct: 21.2,
    maxEventDrawdownPct: -12.4,
    primaryHazard: 'Hurricane',
    riskLevel: 'moderate',
    color: '#52B788',
    sites: [
      {
        id: 'msft-dc',
        ticker: 'MSFT',
        company: 'Microsoft',
        name: 'Azure East US Boydton Mega-Campus',
        city: 'Boydton',
        state: 'VA',
        category: 'Data Center',
        lat: 36.667,
        lng: -78.387,
        hazard: 'Hurricane',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Inland Virginia Piedmont · Buffered from Coastal Surge',
        powerCapacityMW: '650 MW Redundant Substation',
      },
      {
        id: 'msft-hq',
        ticker: 'MSFT',
        company: 'Microsoft',
        name: 'Redmond Global Corporate HQ',
        city: 'Redmond',
        state: 'WA',
        category: 'Corporate HQ',
        lat: 47.642,
        lng: -122.125,
        hazard: 'Earthquake',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.1,
        hazardDetail: 'Seismically Retrofitted Low-Rise Campus',
        powerCapacityMW: '165 MW Geothermal & Hydro',
      },
      {
        id: 'msft-pwr',
        ticker: 'MSFT',
        company: 'Microsoft',
        name: 'Columbia River Hydro Power Supply Station',
        city: 'Quincy',
        state: 'WA',
        category: 'Power Supply',
        lat: 47.234,
        lng: -119.852,
        hazard: 'Low',
        riskLevel: 'low',
        unpricedImpactPct: -0.1,
        hazardDetail: 'Safe Inland Basalt Plateau · Dedicated Hydro Dams',
        powerCapacityMW: '780 MW Grant County Hydro',
      },
    ],
  },
  AAPL: {
    ticker: 'AAPL',
    company: 'Apple',
    exposureScore: 58,
    unpricedRiskPct: -0.6,
    expectedReturnPct: 16.5,
    annualVolPct: 22.4,
    maxEventDrawdownPct: -14.2,
    primaryHazard: 'Earthquake',
    riskLevel: 'moderate',
    color: '#A8DADC',
    sites: [
      {
        id: 'aapl-hq',
        ticker: 'AAPL',
        company: 'Apple',
        name: 'Apple Park Corporate HQ & Silicon Lab',
        city: 'Cupertino',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.334,
        lng: -122.009,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'San Andreas Fault Proximity (Base-Isolated Ring)',
        powerCapacityMW: '130 MW Solar + Fuel Cell Microgrid',
      },
      {
        id: 'aapl-dc',
        ticker: 'AAPL',
        company: 'Apple',
        name: 'Maiden iCloud Data Center & Solar Farm',
        city: 'Maiden',
        state: 'NC',
        category: 'Data Center',
        lat: 35.575,
        lng: -81.211,
        hazard: 'Hurricane',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Inland Carolina Remnant Tropical Storm Track',
        powerCapacityMW: '260 MW Duke Energy + Biogas',
      },
    ],
  },
  EQIX: {
    ticker: 'EQIX',
    company: 'Equinix',
    exposureScore: 91,
    unpricedRiskPct: -1.9,
    expectedReturnPct: 14.2,
    annualVolPct: 27.5,
    maxEventDrawdownPct: -25.8,
    primaryHazard: 'Hurricane',
    riskLevel: 'high',
    color: '#F25C54',
    sites: [
      {
        id: 'eqix-dc1',
        ticker: 'EQIX',
        company: 'Equinix',
        name: 'MI1 Miami NAP of the Americas',
        city: 'Miami',
        state: 'FL',
        category: 'Data Center',
        lat: 25.782,
        lng: -80.193,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.9,
        hazardDetail: 'Cat 5 Hurricane Wind & Coastal Storm Surge Zone',
        powerCapacityMW: '190 MW FPL Coastal Grid + Fuel Tanks',
      },
      {
        id: 'eqix-pwr',
        ticker: 'EQIX',
        company: 'Equinix',
        name: 'Ashburn DC1–DC21 Power Substation Ring',
        city: 'Ashburn',
        state: 'VA',
        category: 'Power Supply',
        lat: 39.016,
        lng: -77.459,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.5,
        hazardDetail: 'High-Density Grid Transformer Bottleneck',
        powerCapacityMW: '680 MW Dominion Substation Ring',
      },
      {
        id: 'eqix-hq',
        ticker: 'EQIX',
        company: 'Equinix',
        name: 'Redwood City HQ & SV1 Interconnect',
        city: 'Redwood City',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.529,
        lng: -122.254,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.5,
        hazardDetail: 'Bay Mud Liquefaction & San Andreas Fault Zone',
        powerCapacityMW: '215 MW PG&E Peninsula Feed',
      },
    ],
  },
  INTC: {
    ticker: 'INTC',
    company: 'Intel',
    exposureScore: 79,
    unpricedRiskPct: -1.2,
    expectedReturnPct: 12.8,
    annualVolPct: 32.0,
    maxEventDrawdownPct: -24.0,
    primaryHazard: 'Earthquake',
    riskLevel: 'high',
    color: '#E57A54',
    sites: [
      {
        id: 'intc-fab',
        ticker: 'INTC',
        company: 'Intel',
        name: 'Ronler Acres D1X EUV Wafer Fab',
        city: 'Hillsboro',
        state: 'OR',
        category: 'Wafer Fab',
        lat: 45.545,
        lng: -122.912,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.7,
        hazardDetail: 'Cascadia Megathrust · Extreme Lithography Alignment Sensitivity',
        powerCapacityMW: '420 MW Ultrapure Power & Water Plant',
      },
      {
        id: 'intc-hq',
        ticker: 'INTC',
        company: 'Intel',
        name: 'Robert Noyce Corporate HQ',
        city: 'Santa Clara',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.387,
        lng: -121.963,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.3,
        hazardDetail: 'Silicon Valley Seismic Corridor',
        powerCapacityMW: '115 MW Municipal Substation',
      },
      {
        id: 'intc-pwr',
        ticker: 'INTC',
        company: 'Intel',
        name: 'Ocotillo Fab Power & Water Reclamation Plant',
        city: 'Chandler',
        state: 'AZ',
        category: 'Power Supply',
        lat: 33.243,
        lng: -111.884,
        hazard: 'Low',
        riskLevel: 'low',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Low Seismic Risk · Extreme Heat Load on Chillers',
        powerCapacityMW: '490 MW APS Redundant Substation',
      },
    ],
  },
  TSLA: {
    ticker: 'TSLA',
    company: 'Tesla',
    exposureScore: 86,
    unpricedRiskPct: -1.5,
    expectedReturnPct: 21.0,
    annualVolPct: 44.0,
    maxEventDrawdownPct: -29.5,
    primaryHazard: 'Earthquake',
    riskLevel: 'high',
    color: '#F25C54',
    sites: [
      {
        id: 'tsla-fab',
        ticker: 'TSLA',
        company: 'Tesla',
        name: 'Fremont Vehicle & Battery Assembly Plant',
        city: 'Fremont',
        state: 'CA',
        category: 'Wafer Fab',
        lat: 37.492,
        lng: -121.944,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.8,
        hazardDetail: 'Directly Astride Hayward Fault Trace (0.75g PGA)',
        powerCapacityMW: '280 MW East Bay Industrial Feed',
      },
      {
        id: 'tsla-hq',
        ticker: 'TSLA',
        company: 'Tesla',
        name: 'Giga Texas Corporate HQ & Cortex AI Cluster',
        city: 'Austin',
        state: 'TX',
        category: 'Corporate HQ',
        lat: 30.222,
        lng: -97.617,
        hazard: 'Low',
        riskLevel: 'low',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Inland Travis County (FEMA NRI Relatively Low Hurricane/Seismic)',
        powerCapacityMW: '350 MW ERCOT + Megapack Buffer',
      },
      {
        id: 'tsla-pwr',
        ticker: 'TSLA',
        company: 'Tesla',
        name: 'Corpus Christi Lithium & Gulf Power Substation',
        city: 'Corpus Christi',
        state: 'TX',
        category: 'Power Supply',
        lat: 27.78,
        lng: -97.51,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.3,
        hazardDetail: 'Direct Gulf Coast Hurricane Landfall & Surge Corridor',
        powerCapacityMW: '220 MW Coastal Industrial Grid',
      },
    ],
  },
  NEE: {
    ticker: 'NEE',
    company: 'NextEra Energy',
    exposureScore: 94,
    unpricedRiskPct: -2.1,
    expectedReturnPct: 11.8,
    annualVolPct: 24.8,
    maxEventDrawdownPct: -27.2,
    primaryHazard: 'Hurricane',
    riskLevel: 'high',
    color: '#F25C54',
    sites: [
      {
        id: 'nee-pwr1',
        ticker: 'NEE',
        company: 'NextEra Energy',
        name: 'Turkey Point Coastal Nuclear & Grid Hub',
        city: 'Homestead',
        state: 'FL',
        category: 'Power Supply',
        lat: 25.435,
        lng: -80.331,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -1.1,
        hazardDetail: 'Biscayne Bay Category 5 Storm Surge & Cooling Canal Zone',
        powerCapacityMW: '2,400 MW Coastal Baseload Generation',
      },
      {
        id: 'nee-hq',
        ticker: 'NEE',
        company: 'NextEra Energy',
        name: 'Juno Beach Corporate HQ & Grid Control Center',
        city: 'Juno Beach',
        state: 'FL',
        category: 'Corporate HQ',
        lat: 26.879,
        lng: -80.056,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.6,
        hazardDetail: 'Direct Atlantic Hurricane Landfall Exposure',
        powerCapacityMW: '90 MW Hardened Command Microgrid',
      },
      {
        id: 'nee-pwr2',
        ticker: 'NEE',
        company: 'NextEra Energy',
        name: 'St. Lucie 500kV Coastal Transmission Switchyard',
        city: 'Jensen Beach',
        state: 'FL',
        category: 'Power Supply',
        lat: 27.348,
        lng: -80.246,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Barrier Island Hurricane Wind & Salt-Spray Outage Risk',
        powerCapacityMW: '1,980 MW Nuclear Transmission Tie',
      },
    ],
  },
  XOM: {
    ticker: 'XOM',
    company: 'ExxonMobil',
    exposureScore: 88,
    unpricedRiskPct: -1.7,
    expectedReturnPct: 13.4,
    annualVolPct: 25.2,
    maxEventDrawdownPct: -23.6,
    primaryHazard: 'Hurricane',
    riskLevel: 'high',
    color: '#F25C54',
    sites: [
      {
        id: 'xom-pwr',
        ticker: 'XOM',
        company: 'ExxonMobil',
        name: 'Baytown Cogeneration Power & Refinery Complex',
        city: 'Baytown',
        state: 'TX',
        category: 'Power Supply',
        lat: 29.745,
        lng: -95.012,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.9,
        hazardDetail: 'Houston Ship Channel Storm Surge (18ft Flood Plain)',
        powerCapacityMW: '850 MW Gas Turbine Cogeneration',
      },
      {
        id: 'xom-hq',
        ticker: 'XOM',
        company: 'ExxonMobil',
        name: 'Spring Global Corporate HQ Campus',
        city: 'Spring',
        state: 'TX',
        category: 'Corporate HQ',
        lat: 30.098,
        lng: -95.442,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Extreme Tropical Rainfall & Hurricane Wind Corridor',
        powerCapacityMW: '125 MW Dual-Substation Campus',
      },
      {
        id: 'xom-fab',
        ticker: 'XOM',
        company: 'ExxonMobil',
        name: 'Beaumont Chemical & Refining Plant',
        city: 'Beaumont',
        state: 'TX',
        category: 'Wafer Fab',
        lat: 30.068,
        lng: -94.095,
        hazard: 'Hurricane',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'Neches River Floodplain & Gulf Hurricane Alley',
        powerCapacityMW: '510 MW Industrial Steam & Electric',
      },
    ],
  },
  ORCL: {
    ticker: 'ORCL',
    company: 'Oracle',
    exposureScore: 49,
    unpricedRiskPct: -0.5,
    expectedReturnPct: 16.8,
    annualVolPct: 22.6,
    maxEventDrawdownPct: -13.5,
    primaryHazard: 'Hurricane',
    riskLevel: 'moderate',
    color: '#52B788',
    sites: [
      {
        id: 'orcl-hq',
        ticker: 'ORCL',
        company: 'Oracle',
        name: 'Austin Waterfront Corporate HQ',
        city: 'Austin',
        state: 'TX',
        category: 'Corporate HQ',
        lat: 30.244,
        lng: -97.721,
        hazard: 'Low',
        riskLevel: 'low',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Inland Travis County (FEMA NRI Relatively Low Hurricane/Seismic)',
        powerCapacityMW: '85 MW Austin Energy Feed',
      },
      {
        id: 'orcl-dc',
        ticker: 'ORCL',
        company: 'Oracle',
        name: 'OCI Ashburn Cloud Region',
        city: 'Ashburn',
        state: 'VA',
        category: 'Data Center',
        lat: 39.025,
        lng: -77.471,
        hazard: 'Hurricane',
        riskLevel: 'moderate',
        unpricedImpactPct: -0.2,
        hazardDetail: 'Northern Virginia Power Alley Concentration',
        powerCapacityMW: '340 MW PJM Grid Tie',
      },
      {
        id: 'orcl-pwr',
        ticker: 'ORCL',
        company: 'Oracle',
        name: 'Abilene AI Supercluster Dedicated Gas/Solar Plant',
        city: 'Abilene',
        state: 'TX',
        category: 'Power Supply',
        lat: 32.448,
        lng: -99.733,
        hazard: 'Low',
        riskLevel: 'low',
        unpricedImpactPct: -0.1,
        hazardDetail: 'Inland West Texas · Low Hurricane & Seismic Exposure',
        powerCapacityMW: '800 MW Behind-the-Meter Generation',
      },
    ],
  },
  AMD: {
    ticker: 'AMD',
    company: 'AMD',
    exposureScore: 63,
    unpricedRiskPct: -0.7,
    expectedReturnPct: 18.9,
    annualVolPct: 33.4,
    maxEventDrawdownPct: -19.2,
    primaryHazard: 'Earthquake',
    riskLevel: 'moderate',
    color: '#E9C46A',
    sites: [
      {
        id: 'amd-hq',
        ticker: 'AMD',
        company: 'AMD',
        name: 'Santa Clara Global Corporate HQ',
        city: 'Santa Clara',
        state: 'CA',
        category: 'Corporate HQ',
        lat: 37.381,
        lng: -121.972,
        hazard: 'Earthquake',
        riskLevel: 'high',
        unpricedImpactPct: -0.4,
        hazardDetail: 'San Andreas & Hayward Fault Seismic Zone',
        powerCapacityMW: '95 MW Silicon Valley Power',
      },
      {
        id: 'amd-dc',
        ticker: 'AMD',
        company: 'AMD',
        name: 'Austin Server Architecture & Validation Data Center',
        city: 'Austin',
        state: 'TX',
        category: 'Data Center',
        lat: 30.251,
        lng: -97.861,
        hazard: 'Hurricane',
        riskLevel: 'low',
        unpricedImpactPct: -0.3,
        hazardDetail: 'Hill Country Elevated Campus · Low Flood Risk',
        powerCapacityMW: '150 MW Dual Substation',
      },
    ],
  },
};

export const PORTFOLIO_PRESETS: PortfolioPreset[] = [
  {
    id: 'ai-cloud',
    label: 'AI & Cloud Leaders',
    subtitle: 'NVDA · META · AMZN · GOOGL · MSFT · EQIX',
    badge: '6 stocks',
    items: [
      { ticker: 'NVDA', weight: 24 },
      { ticker: 'META', weight: 18 },
      { ticker: 'AMZN', weight: 18 },
      { ticker: 'GOOGL', weight: 15 },
      { ticker: 'MSFT', weight: 15 },
      { ticker: 'EQIX', weight: 10 },
    ],
  },
  {
    id: 'coastal-energy',
    label: 'Coastal Grid & Data REITs',
    subtitle: 'NEE · EQIX · XOM · AMZN · MSFT',
    badge: '5 stocks',
    items: [
      { ticker: 'NEE', weight: 28 },
      { ticker: 'EQIX', weight: 24 },
      { ticker: 'XOM', weight: 22 },
      { ticker: 'AMZN', weight: 14 },
      { ticker: 'MSFT', weight: 12 },
    ],
  },
  {
    id: 'west-coast-semi',
    label: 'Fault-Line Hardware & Fabs',
    subtitle: 'NVDA · TSLA · INTC · AAPL · AMD',
    badge: '5 stocks',
    items: [
      { ticker: 'NVDA', weight: 28 },
      { ticker: 'TSLA', weight: 22 },
      { ticker: 'INTC', weight: 20 },
      { ticker: 'AAPL', weight: 18 },
      { ticker: 'AMD', weight: 12 },
    ],
  },
];

const RESERVED_CSV_WORDS = new Set([
  'TICKER',
  'TICKERS',
  'WEIGHT',
  'WEIGHTS',
  'SYMBOL',
  'SYMBOLS',
  'ALLOCATION',
  'STOCK',
  'STOCKS',
  'HOLDING',
  'HOLDINGS',
  'TOTAL',
  'SUM',
  'CASH',
  'PORTFOLIO',
  'SHARES',
  'VALUE',
  'NAME',
  'COMPANY',
  'CSV',
  'USD',
  'PCT',
  'PERCENT',
]);

export function parsePortfolioText(
  textContent: string
): { ticker: string; weight: number }[] {
  if (!textContent || typeof textContent !== 'string') return [];

  const totals = new Map<string, number>();
  const lines = textContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Strip leading list indices like "1." or "2)"
    const cleaned = line.replace(/^\d+[\.\)]\s*/, '');

    // Match first 1-5 letter ticker token and the first signed number that follows on the same line
    const match = cleaned.match(
      /(?:^|["',;\t|\s])([A-Za-z]{1,5})(?:["',;\t|\s:=]+)(-?\d+(?:\.\d+)?)/
    );
    if (!match) continue;

    const ticker = match[1].toUpperCase();
    if (RESERVED_CSV_WORDS.has(ticker)) continue;

    const weight = parseFloat(match[2]);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1000) continue;

    totals.set(ticker, Number(((totals.get(ticker) || 0) + weight).toFixed(4)));
  }

  return Array.from(totals.entries()).map(([ticker, weight]) => ({
    ticker,
    weight: Number(weight.toFixed(2)),
  }));
}

function allocateBounded(
  targetSum: number,
  priorities: number[],
  caps: number[]
): number[] {
  const n = priorities.length;
  const alloc = new Array(n).fill(0);
  const locked = new Array(n).fill(false);
  let remaining = targetSum;

  for (let iter = 0; iter < n + 2; iter++) {
    if (remaining <= 1e-9) break;
    let prioSum = 0;
    for (let i = 0; i < n; i++) {
      if (!locked[i]) prioSum += priorities[i];
    }
    if (prioSum <= 1e-9) break;

    let anyClamped = false;
    for (let i = 0; i < n; i++) {
      if (locked[i]) continue;
      const share = (remaining * priorities[i]) / prioSum;
      if (alloc[i] + share >= caps[i] - 1e-9) {
        remaining -= caps[i] - alloc[i];
        alloc[i] = caps[i];
        locked[i] = true;
        anyClamped = true;
      }
    }
    if (!anyClamped) {
      for (let i = 0; i < n; i++) {
        if (!locked[i]) {
          alloc[i] += (remaining * priorities[i]) / prioSum;
        }
      }
      remaining = 0;
      break;
    }
  }
  return alloc;
}

export function buildPortfolioProfiles(
  rawItems: { ticker: string; weight: number }[]
): StockRiskProfile[] {
  const validItems = rawItems.filter((item) => Number(item.weight) > 0);
  const sourceItems = validItems.length > 0 ? validItems : rawItems;
  const total =
    sourceItems.reduce((acc, item) => acc + (Number(item.weight) || 0), 0) || 100;

  // Normalize initial weights and ensure exact 100.0% sum
  const normalized = sourceItems.map((item) => ({
    ticker: item.ticker.toUpperCase().trim(),
    weight: Number(((Number(item.weight) / total) * 100).toFixed(1)),
  }));
  if (normalized.length > 0) {
    const normSum = Number(
      normalized.reduce((s, x) => s + x.weight, 0).toFixed(1)
    );
    const diff = Number((100.0 - normSum).toFixed(1));
    if (Math.abs(diff) > 0 && Math.abs(diff) <= 0.5) {
      normalized[0].weight = Number((normalized[0].weight + diff).toFixed(1));
    }
  }

  const profiles: StockRiskProfile[] = normalized.map((item, idx) => {
    const known = STOCK_DATABASE[item.ticker];
    if (known) {
      return {
        ...known,
        weight: item.weight,
        hedgedWeight: item.weight,
      };
    }

    const fallbackColors = ['#E57A54', '#F4A261', '#E9C46A', '#52B788', '#A8DADC'];
    const isEven = idx % 2 === 0;
    return {
      ticker: item.ticker,
      company: `${item.ticker} Corp`,
      weight: item.weight,
      hedgedWeight: item.weight,
      exposureScore: isEven ? 68 : 52,
      unpricedRiskPct: isEven ? -0.6 : -0.3,
      expectedReturnPct: 16.0,
      annualVolPct: 24.0,
      maxEventDrawdownPct: isEven ? -16.5 : -13.0,
      primaryHazard: isEven ? 'Hurricane' : 'Earthquake',
      riskLevel: isEven ? 'moderate' : 'low',
      color: fallbackColors[idx % fallbackColors.length],
      sites: [
        {
          id: `${item.ticker.toLowerCase()}-hq`,
          ticker: item.ticker,
          company: `${item.ticker} Corp`,
          name: `${item.ticker} Corporate HQ`,
          city: 'Santa Clara',
          state: 'CA',
          category: 'Corporate HQ',
          lat: 37.37 + (idx % 3) * 0.12,
          lng: -121.96 - (idx % 3) * 0.12,
          hazard: 'Earthquake',
          riskLevel: 'moderate',
          unpricedImpactPct: -0.2,
          hazardDetail: 'Silicon Valley Seismic Zone',
          powerCapacityMW: '110 MW Campus Grid',
        },
        {
          id: `${item.ticker.toLowerCase()}-dc`,
          ticker: item.ticker,
          company: `${item.ticker} Corp`,
          name: `${item.ticker} Northern Virginia Data Center`,
          city: 'Ashburn',
          state: 'VA',
          category: 'Data Center',
          lat: 39.04 + (idx % 3) * 0.15,
          lng: -77.48 - (idx % 3) * 0.15,
          hazard: 'Hurricane',
          riskLevel: isEven ? 'moderate' : 'low',
          unpricedImpactPct: isEven ? -0.2 : -0.1,
          hazardDetail: 'East Coast Cloud & Grid Corridor',
          powerCapacityMW: '280 MW PJM Substation',
        },
        {
          id: `${item.ticker.toLowerCase()}-pwr`,
          ticker: item.ticker,
          company: `${item.ticker} Corp`,
          name: `${item.ticker} Gulf Power Substation`,
          city: 'Houston',
          state: 'TX',
          category: 'Power Supply',
          lat: 29.85 + (idx % 3) * 0.12,
          lng: -95.32 - (idx % 3) * 0.12,
          hazard: 'Hurricane',
          riskLevel: isEven ? 'high' : 'moderate',
          unpricedImpactPct: isEven ? -0.2 : 0.0,
          hazardDetail: 'Gulf Coast Storm Track',
          powerCapacityMW: '350 MW Dedicated Tie',
        },
      ],
    };
  });

  // Spec Layer 04 Constrained Hedge Optimizer:
  // 1) |hedgedWeight_i - weight_i| <= 5.0 percentage points
  // 2) One-way turnover 0.5 * sum(|hedgedWeight_i - weight_i|) <= 15.0%
  // 3) hedgedWeight_i >= 0 and sum(hedgedWeight_i) == 100.0%
  const MAX_DELTA_PER_STOCK = 5.0;
  const MAX_ONE_WAY_TURNOVER = 15.0;

  const severities = profiles.map((p) => Math.abs(p.unpricedRiskPct));
  const meanSeverity =
    severities.reduce((a, b) => a + b, 0) / (severities.length || 1);

  const highIdx: number[] = [];
  const lowIdx: number[] = [];
  profiles.forEach((_, i) => {
    if (severities[i] > meanSeverity + 1e-6) highIdx.push(i);
    else if (severities[i] < meanSeverity - 1e-6) lowIdx.push(i);
  });

  if (highIdx.length > 0 && lowIdx.length > 0) {
    const highCaps = highIdx.map((i) =>
      Math.min(MAX_DELTA_PER_STOCK, profiles[i].weight)
    );
    const lowCaps = lowIdx.map((i) =>
      Math.min(MAX_DELTA_PER_STOCK, 100.0 - profiles[i].weight)
    );

    const maxReductionSum = highCaps.reduce((a, b) => a + b, 0);
    const maxIncreaseSum = lowCaps.reduce((a, b) => a + b, 0);
    const targetTurnover = Math.min(
      MAX_ONE_WAY_TURNOVER,
      maxReductionSum,
      maxIncreaseSum
    );

    const highPrios = highIdx.map((i) => severities[i] - meanSeverity);
    const lowPrios = lowIdx.map((i) => meanSeverity - severities[i]);

    const reductions = allocateBounded(targetTurnover, highPrios, highCaps);
    const increases = allocateBounded(targetTurnover, lowPrios, lowCaps);

    highIdx.forEach((idx, k) => {
      profiles[idx].hedgedWeight = Number(
        Math.max(0, profiles[idx].weight - reductions[k]).toFixed(1)
      );
    });
    lowIdx.forEach((idx, k) => {
      profiles[idx].hedgedWeight = Number(
        Math.min(100, profiles[idx].weight + increases[k]).toFixed(1)
      );
    });

    // Reconcile 0.1% rounding drift without violating the 5.0-pt cap
    const hedgedSum = Number(
      profiles.reduce((s, p) => s + p.hedgedWeight, 0).toFixed(1)
    );
    const residual = Number((100.0 - hedgedSum).toFixed(1));
    if (Math.abs(residual) > 0 && Math.abs(residual) <= 0.5) {
      for (const p of profiles) {
        const candidate = Number((p.hedgedWeight + residual).toFixed(1));
        if (
          candidate >= 0 &&
          candidate <= 100 &&
          Math.abs(candidate - p.weight) <= MAX_DELTA_PER_STOCK + 1e-6
        ) {
          p.hedgedWeight = candidate;
          break;
        }
      }
    }
  }

  // Sort by highest exposure / most negative unpriced risk first so lists are always sorted
  return profiles.sort((a, b) => a.unpricedRiskPct - b.unpricedRiskPct);
}

export function computePortfolioMetrics(
  profiles: StockRiskProfile[]
): PortfolioMetricsComparison {
  const riskFreeRate = 4.2; // 10-Yr Treasury baseline %
  const diversificationFactor = 0.76;

  // One-way turnover (%) = 0.5 * sum(|w_hedged - w_current|)
  const turnoverPct = Number(
    (
      0.5 *
      profiles.reduce((sum, p) => sum + Math.abs(p.hedgedWeight - p.weight), 0)
    ).toFixed(1)
  );
  // Institutional transaction cost: ~14 bps (0.14%) per 100% turnover (spread + market impact)
  const totalTxCostPct = Number(((turnoverPct / 100) * 0.18).toFixed(2));

  const calcForWeights = (
    getWeight: (p: StockRiskProfile) => number,
    applyTxCost: boolean
  ): PortfolioMetricsSnapshot => {
    let dataCenterPts = 0;
    let powerSupplyPts = 0;
    let hqPts = 0;
    let fabPts = 0;

    for (const p of profiles) {
      const w = getWeight(p) / 100;
      const totalSiteImpact =
        p.sites.reduce((s, site) => s + Math.abs(site.unpricedImpactPct), 0) || 1;

      for (const site of p.sites) {
        const siteShare = Math.abs(site.unpricedImpactPct) / totalSiteImpact;
        const pts = w * p.exposureScore * siteShare;
        if (site.category === 'Data Center') dataCenterPts += pts;
        else if (site.category === 'Power Supply') powerSupplyPts += pts;
        else if (site.category === 'Corporate HQ') hqPts += pts;
        else fabPts += pts;
      }
    }

    const baseScore = dataCenterPts + powerSupplyPts + hqPts + fabPts;
    const corridorPenaltyPts = applyTxCost ? 3 : 7; // Lower geographic cluster overlap after hedging
    const exposureScore = Math.min(
      99,
      Math.max(15, Math.round(baseScore + corridorPenaltyPts))
    );

    const rawUnpricedRiskPct = profiles.reduce(
      (sum, p) => sum + (getWeight(p) / 100) * p.unpricedRiskPct,
      0
    );
    const txDrag = applyTxCost ? totalTxCostPct : 0;
    // Net unpriced risk after subtracting rebalance transaction cost
    const unpricedRiskPct = rawUnpricedRiskPct - txDrag;

    const rawReturn = profiles.reduce(
      (sum, p) => sum + (getWeight(p) / 100) * p.expectedReturnPct,
      0
    );
    const annualReturnPct = rawReturn + rawUnpricedRiskPct * 1.4 - txDrag;

    const weightedVol = profiles.reduce(
      (sum, p) => sum + (getWeight(p) / 100) * p.annualVolPct,
      0
    );
    const clusterPenalty = Math.abs(rawUnpricedRiskPct) * 1.85;
    const annualVolPct = Math.max(12, weightedVol * diversificationFactor + clusterPenalty);

    const sharpeRatio = (annualReturnPct - riskFreeRate) / annualVolPct;
    const downsideVolPct = annualVolPct * (0.68 + Math.abs(rawUnpricedRiskPct) * 0.09);
    const sortinoRatio = (annualReturnPct - riskFreeRate) / downsideVolPct;

    const maxDrawdownPct = profiles.reduce(
      (sum, p) => sum + (getWeight(p) / 100) * p.maxEventDrawdownPct * 0.85,
      0
    );
    const tailCvar99Pct = maxDrawdownPct * 0.52 + rawUnpricedRiskPct * 2.1;

    const sortedByContribution = [...profiles].sort(
      (a, b) =>
        getWeight(b) * b.exposureScore - getWeight(a) * a.exposureScore
    );
    const topDrivers = sortedByContribution
      .slice(0, 2)
      .map(
        (s) =>
          `${s.ticker} (${s.primaryHazard} · ${s.sites.map((x) => x.category).join(', ')})`
      );

    return {
      exposureScore,
      scoreBreakdown: {
        totalScore: exposureScore,
        dataCenterPts: Math.round(dataCenterPts),
        powerSupplyPts: Math.round(powerSupplyPts),
        hqPts: Math.round(hqPts),
        fabPts: Math.round(fabPts),
        corridorPenaltyPts,
        topDrivers,
      },
      unpricedRiskPct: Number(unpricedRiskPct.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      sortinoRatio: Number(sortinoRatio.toFixed(2)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(1)),
      tailCvar99Pct: Number(tailCvar99Pct.toFixed(1)),
      annualReturnPct: Number(annualReturnPct.toFixed(1)),
      annualVolPct: Number(annualVolPct.toFixed(1)),
      turnoverPct: applyTxCost ? turnoverPct : 0,
      transactionCostPct: txDrag,
    };
  };

  return {
    current: calcForWeights((p) => p.weight, false),
    hedged: calcForWeights((p) => p.hedgedWeight, true),
  };
}
