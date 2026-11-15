import {
  Anchor,
  Building2,
  CheckCircle2,
  FileCheck2,
  Landmark,
  Microscope,
} from 'lucide-react';
import { TRADE_CORRIDORS } from '../data/tradeData';

const COMPLIANCE_PILLARS = [
  {
    icon: FileCheck2,
    code: 'MCO 65197 EL',
    title: 'Statutory Mining & Export Licensing',
    body: 'Operations are backed by active Nigeria Mining Cadastre Office Exploration Licence No. 65197 EL alongside Nigerian Export Promotion Council (NEPC) registration and CAC incorporation RC 2012723.',
    facts: [
      'Mining Cadastre Tenure: 65197 EL',
      'Corporate Registry: RC 2012723',
      'NESS Export Form NXP Compliant',
    ],
  },
  {
    icon: Microscope,
    code: 'ASSAY ZMGN057',
    title: 'Independent Third-Party Inspection',
    body: 'Zero shipment leaves Nigerian terminals without independent sampling, moisture verification, and geochemical assay by buyer-nominated inspection agencies including SGS, Bureau Veritas, or Intertek.',
    facts: [
      'ICP-OES & XRF Mineral Assaying',
      'EU MRL & NAQS Phytosanitary Certs',
      'Pre-Loading Weight & Seal Witnessing',
    ],
  },
  {
    icon: Landmark,
    code: 'UCP 600 BANKING',
    title: 'Bankable Trade Finance & Settlement',
    body: 'Structured settlement protocols engineered for institutional comfort—supporting Irrevocable Letters of Credit (L/C) at sight from top-tier international confirming banks, CAD, and milestone T/T.',
    facts: [
      'Irrevocable L/C at Sight (UCP 600)',
      'Cash Against Documents (CAD)',
      'Performance-Backed Export Contracts',
    ],
  },
];

export default function ComplianceCenter() {
  return (
    <section
      id="compliance"
      className="py-16 lg:py-24 bg-slate-900 text-white border-b border-slate-800"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <p className="text-sm font-semibold text-amber-400 mb-2">
            03. Global Compliance &amp; Trust Center
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance mb-3">
            Verifiable Governance from Origin Mine-Gate to Discharge Port
          </h2>
          <p className="text-base text-slate-300 leading-relaxed">
            International commodity buyers require transparent title documentation, independent assay chains, and bank-grade settlement certainty before committing vessel space.
          </p>
        </div>

        {/* 3 Compliance Pillars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {COMPLIANCE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.code}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 sm:p-7 flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-medium text-emerald-400">
                    {pillar.code}
                  </span>
                </div>

                <h3 className="font-display text-xl font-semibold text-white mb-2.5">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  {pillar.body}
                </p>

                <ul className="mt-auto pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-200">
                  {pillar.facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Global Logistics Corridors Matrix */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Anchor className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Active Maritime &amp; Wholesale Logistics Corridors
                </h3>
                <p className="text-xs text-slate-400">
                  Direct containerised FCL &amp; break-bulk routing across Europe, Asia, MENA, and Africa
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Export Hub: Lagos &amp; Port Harcourt, Nigeria</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            {TRADE_CORRIDORS.map((corridor) => (
              <div key={corridor.region} className="space-y-1.5">
                <div className="text-sm font-semibold text-white">
                  {corridor.region}
                </div>
                <div className="font-mono text-xs text-amber-400 leading-relaxed">
                  {corridor.ports}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  {corridor.focus}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
