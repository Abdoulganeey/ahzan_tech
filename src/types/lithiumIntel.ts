export type LeadCategory = 'LITHIUM' | 'AFRICA_SOURCING' | 'FUNDING_FINANCE';

export type TradeRegion =
  | 'EUROPE_GERMANY'
  | 'SOUTH_KOREA'
  | 'JAPAN'
  | 'TAIWAN'
  | 'MALAYSIA'
  | 'ASIA_PACIFIC'
  | 'NIGER'
  | 'BURKINA_FASO'
  | 'MALI'
  | 'NIGERIA'
  | 'GHANA'
  | 'IVORY_COAST'
  | 'SENEGAL_BENIN_TOGO'
  | 'EUROPE_SOURCING'
  | 'INVESTMENT_PARTNERS'
  | 'DFI_GRANTS'
  | 'EU_GRANTS_FINANCE'
  | 'US_GRANTS_FINANCE'
  | 'COMMERCIAL_TRADE_BANKS'
  | 'EXPORT_CREDIT_FINANCE';

export type OutreachStatus =
  | 'READY'
  | 'WHATSAPP_SENT'
  | 'EMAIL_SENT'
  | 'LINKEDIN_SENT'
  | 'IN_DISCUSSION'
  | 'SAMPLE_REQUESTED'
  | 'DEAL_IN_PROGRESS'
  | 'RISK_PREPAY_ONLY'
  | 'PAUSED';

export type CrmStage =
  | 'PROSPECT'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_QUOTE'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type PriorityTier = 'A' | 'B' | 'C';

export type CrmActivityType =
  | 'WHATSAPP'
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'QUOTE_SENT'
  | 'NOTE'
  | 'STAGE_CHANGE';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type TradeDocumentType =
  | 'PRICE_LIST'
  | 'LOI'
  | 'MOU'
  | 'FCO'
  | 'PROFORMA_INVOICE'
  | 'SALES_CONTRACT'
  | 'MANDATE_NCNDA';

export type PriceCatalogKey =
  | 'AGRO_FOOD'
  | 'FLYSAK_OILS'
  | 'APPLIANCES'
  | 'COOKWARE';

export const STAGE_WIN_PROBABILITY: Record<CrmStage, number> = {
  PROSPECT: 15,
  CONTACTED: 30,
  QUALIFIED: 50,
  PROPOSAL_QUOTE: 70,
  NEGOTIATION: 85,
  WON: 100,
  LOST: 0,
};

export const CRM_STAGE_ORDER: CrmStage[] = [
  'PROSPECT',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_QUOTE',
  'NEGOTIATION',
  'WON',
  'LOST',
];

export const CRM_STAGE_LABELS: Record<CrmStage, string> = {
  PROSPECT: 'Prospect (15%)',
  CONTACTED: 'Contacted (30%)',
  QUALIFIED: 'Qualified (50%)',
  PROPOSAL_QUOTE: 'Proposal / Quote (70%)',
  NEGOTIATION: 'Negotiation (85%)',
  WON: 'Won (100%)',
  LOST: 'Lost (0%)',
};

export const OUTREACH_STATUS_LIST: OutreachStatus[] = [
  'READY',
  'WHATSAPP_SENT',
  'EMAIL_SENT',
  'LINKEDIN_SENT',
  'IN_DISCUSSION',
  'SAMPLE_REQUESTED',
  'DEAL_IN_PROGRESS',
  'RISK_PREPAY_ONLY',
  'PAUSED',
];

export const LEAD_CATEGORY_LABELS: Record<LeadCategory, string> = {
  LITHIUM: 'Lithium Buyers & Refiners',
  AFRICA_SOURCING: 'Africa & EU B2B Sourcing',
  FUNDING_FINANCE: 'Investors, Banks & Grants',
};

export const TRADE_REGION_LABELS: Record<TradeRegion, string> = {
  EUROPE_GERMANY: 'Europe / Germany',
  SOUTH_KOREA: 'South Korea',
  JAPAN: 'Japan (+81)',
  TAIWAN: 'Taiwan (+886)',
  MALAYSIA: 'Malaysia (+60)',
  ASIA_PACIFIC: 'Singapore / ASEAN (+65)',
  NIGER: 'Niger (+227)',
  BURKINA_FASO: 'Burkina Faso (+226)',
  MALI: 'Mali (+223)',
  NIGERIA: 'Nigeria (+234)',
  GHANA: 'Ghana (+233)',
  IVORY_COAST: "Côte d'Ivoire (+225)",
  SENEGAL_BENIN_TOGO: 'Senegal / Benin / Togo',
  EUROPE_SOURCING: 'Europe B2B Importers',
  INVESTMENT_PARTNERS: 'Investment Partners',
  DFI_GRANTS: 'DFI & Development Grants',
  EU_GRANTS_FINANCE: 'EU Grants & Global Gateway',
  US_GRANTS_FINANCE: 'U.S. Grants & DFC',
  COMMERCIAL_TRADE_BANKS: 'Commercial Trade Banks',
  EXPORT_CREDIT_FINANCE: 'Export Credit Agencies',
};

export const TRADE_DOCUMENT_META: Record<
  TradeDocumentType,
  { prefix: string; label: string; shortLabel: string; description: string }
> = {
  PRICE_LIST: {
    prefix: 'AZT-PL',
    label: 'Official Commodity Price List',
    shortLabel: 'Price List',
    description: 'Factory-direct / FOB export schedule with configurable FX & margins.',
  },
  LOI: {
    prefix: 'AZT-LOI',
    label: 'Letter of Intent (LOI)',
    shortLabel: 'LOI',
    description: 'Buyer/Seller formal mineral or commodity allocation intent.',
  },
  MOU: {
    prefix: 'AZT-MOU',
    label: 'Memorandum of Understanding (MOU)',
    shortLabel: 'MOU',
    description: 'Strategic multi-shipment supply framework & exclusivity terms.',
  },
  FCO: {
    prefix: 'AZT-FCO',
    label: 'Full Corporate Offer (FCO)',
    shortLabel: 'FCO',
    description: 'Binding commercial offer referencing EL 65197 & Lab Assays.',
  },
  PROFORMA_INVOICE: {
    prefix: 'AZT-PI',
    label: 'Proforma Invoice (PI)',
    shortLabel: 'Proforma Invoice',
    description: 'Bankable proforma invoice for SWIFT MT700 L/C or T/T deposit.',
  },
  SALES_CONTRACT: {
    prefix: 'AZT-SPA',
    label: 'Sales & Purchase Agreement (SPA)',
    shortLabel: 'Sales Contract',
    description: 'Full international SPA with penalty/bonus Li2O clauses & SGS umpire.',
  },
  MANDATE_NCNDA: {
    prefix: 'AZT-NCN',
    label: 'Mandate / NCNDA Agreement',
    shortLabel: 'Mandate / NCNDA',
    description: 'ICC-compliant Non-Circumvention, Non-Disclosure & Commission agreement.',
  },
};

export interface LithiumIntelRecord {
  id: string;
  rankId: number;
  companyName: string;
  normalizedCompanyKey: string;
  leadCategory: LeadCategory;
  regionCode: TradeRegion;
  location: string;
  primaryRole: string;

  // 100-pt rubric
  priorityScore: number;
  priorityTier: PriorityTier;
  fitScore: number; // /25
  procScore: number; // /25
  finScore: number; // /15
  dmScore: number; // /15
  esgScore: number; // /10
  volScore: number; // /10

  // Contacts
  decisionMaker: string;
  title: string;
  generalEmail: string;
  directEmail: string;
  emailRouteNote: string;
  whatsappNumber: string;
  websiteUrl: string;
  websiteDisplay: string;
  profileSource: string;

  // Outreach Templates
  operationalFit: string;
  emailSubject: string;
  emailBody: string;
  linkedInNote: string;

  // Live Pipeline State
  outreachStatus: OutreachStatus;
  crmStage: CrmStage;
  winProbability: number;
  estimatedTonnage: number;
  targetFobValue: number;
  impliedFobPricePerMt: number;
  weightedValueUsd: number;
  followUpAtMillis: number;
  nextAction: string;
  tags: string;
  lostReason: string;
  notes: string;
  isRiskWatch: boolean;
  isCustomLead: boolean;
  leadSource: string;
  lastUpdatedMillis: number;

  // Source marker (client UI helper, not required in Firestore)
  syncedInCloud?: boolean;
}

export interface CrmActivityRecord {
  id: string;
  ownerUid: string;
  leadRankId: number;
  leadId?: string;
  companyName: string;
  activityType: CrmActivityType;
  outcome: string;
  summary: string;
  quoteAmountUsd?: number;
  createdAtMillis: number;
  direction?: 'Outbound' | 'Inbound' | 'Draft';
  toEmail?: string;
  fromEmail?: string;
  contactName?: string;
  subject?: string;
  body?: string;
  status?: 'Sent' | 'Received' | 'Scheduled' | 'Draft';
  sentDate?: string;
}

export interface CrmTaskRecord {
  id: string;
  ownerUid: string;
  leadRankId: number;
  companyName: string;
  title: string;
  priority: TaskPriority;
  dueAtMillis: number;
  isCompleted: boolean;
  completedAtMillis?: number;
}

export interface CanonicalCompanyConfig {
  companyName: string;
  domain: string;
  ceoName: string;
  ceoEmail: string;
  primaryMineralAsset: string;
  miningCadastreId: string;
  miningLocation: string;
  assayRefPrimary: string;
  assayRefSecondary: string;
  verifiedLi2OPct: number;
  activeSupplyCorridors: string;
  multiCommodityCapabilities: string;
  bankReadinessDocs: {
    nepcCacVerified: boolean;
    cadastreAssaysVerified: boolean;
    signedOfftakeLoiVerified: boolean;
    sealedProformaVerified: boolean;
  };
}

export interface AndroidBackupPayload {
  appName: 'ahzan_lithium_intel_crm_backup';
  backupVersion: 1;
  exportedAtMillis: number;
  companyProfile: {
    company: string;
    domain: string;
    ceo: string;
    email: string;
    cadastreId: string;
    location: string;
    assays: string[];
  };
  marketConfig: {
    lithiumRatePerPercentUsd: number;
    lithiumAssayPct: number;
    fxNgnPerUsd: number;
    fxXofPerUsd: number;
    quoteValidityDays: number;
  };
  leads: LithiumIntelRecord[];
  activities: CrmActivityRecord[];
  tasks: CrmTaskRecord[];
  rfqs?: Array<Record<string, unknown>>;
  shipments?: Array<Record<string, unknown>>;
  tradeDocuments?: Array<Record<string, unknown>>;
}

export const CSV_EXPORT_HEADERS_18 = [
  'Company Name',
  'Category',
  'Country/Region',
  'Decision Maker',
  'Title',
  'WhatsApp Number',
  'Email',
  'Website',
  'Priority Score',
  'Deal Stage',
  'Win %',
  'Status',
  'Estimated Tonnage (MT)',
  'Target Value (USD)',
  'Implied Price (USD/MT)',
  'Follow-Up Date',
  'Next Action',
  'Tags',
] as const;

export function computePriorityTier(score: number): PriorityTier {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  return 'C';
}
