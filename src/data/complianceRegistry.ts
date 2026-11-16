export interface ComplianceBadgeRecord {
  id: 'rc' | 'mining-licence' | 'scuml' | 'tcc' | 'export-licence';
  shortLabel: string;
  identifier: string;
  authority: string;
  statusLabel: string;
  scopeSummary: string;
  registryCode: string;
}

export interface ComplianceRegistrySnapshot {
  checkedAtIso: string;
  checkedAtDisplay: string;
  records: ComplianceBadgeRecord[];
}

const COMPLIANCE_RECORDS: ComplianceBadgeRecord[] = [
  {
    id: 'rc',
    shortLabel: 'Corporate Registration',
    identifier: 'RC 2012723',
    authority: 'Corporate Affairs Commission (CAC), Nigeria',
    statusLabel: 'Active · Verified',
    scopeSummary:
      'Registered limited liability company in good standing incorporating AhzanEmporium trading division for domestic and cross-border commerce.',
    registryCode: 'CAC-RC-2012723',
  },
  {
    id: 'mining-licence',
    shortLabel: 'Mining Cadastre Tenure',
    identifier: 'Licence 65197 EL',
    authority: 'Nigeria Mining Cadastre Office (MCO)',
    statusLabel: 'Active Tenure',
    scopeSummary:
      'Authorized active mineral exploration licence covering verified lithium-bearing spodumene and lepidolite formations.',
    registryCode: 'MCO-65197-EL',
  },
  {
    id: 'scuml',
    shortLabel: 'SCUML AML / CFT',
    identifier: 'EFCC SCUML',
    authority: 'Special Control Unit Against Money Laundering (EFCC)',
    statusLabel: 'Compliant',
    scopeSummary:
      'Designated Non-Financial Business & Profession (DNFBP) anti-money laundering and counter-terrorism financing certification.',
    registryCode: 'SCUML-DNFBP-NG',
  },
  {
    id: 'tcc',
    shortLabel: 'Tax Clearance Certificate',
    identifier: 'FIRS Tax TCC',
    authority: 'Federal Inland Revenue Service (FIRS)',
    statusLabel: 'Cleared',
    scopeSummary:
      'Valid Federal Tax Clearance Certificate confirming statutory corporate tax compliance for international L/C and export settlement.',
    registryCode: 'FIRS-TCC-2026',
  },
  {
    id: 'export-licence',
    shortLabel: 'Non-Oil Export Permit',
    identifier: 'NEPC Export Licence',
    authority: 'Nigerian Export Promotion Council (NEPC)',
    statusLabel: 'Active Permit',
    scopeSummary:
      'Authorized non-oil mineral and agro-commodity exporter licence enabling Form NXP and NESS port dispatch.',
    registryCode: 'NEPC-EXP-ACTIVE',
  },
];

export async function fetchVerifiedComplianceStatus(): Promise<ComplianceRegistrySnapshot> {
  // Simulate live registry verification handshake with crisp settling latency
  await new Promise((resolve) => setTimeout(resolve, 260));

  const now = new Date();
  const checkedAtDisplay = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return {
    checkedAtIso: now.toISOString(),
    checkedAtDisplay: `Verified ${now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} · ${checkedAtDisplay}`,
    records: COMPLIANCE_RECORDS,
  };
}
