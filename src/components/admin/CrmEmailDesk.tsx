import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Loader2,
  Mail,
  Send,
  Search,
  Trash2,
} from 'lucide-react';
import {
  useBuyerAuth,
  type AdminCrmEmailInput,
  type CrmEmailDirection,
  type CrmEmailDoc,
  type CrmEmailStatus,
} from '../../context/BuyerAuthContext';
import type { EmailComposerPrefill } from './CrmLeadsWorkspace';

interface CrmEmailDeskProps {
  prefill?: EmailComposerPrefill | null;
  onClearPrefill?: () => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CrmEmailDesk({
  prefill,
  onClearPrefill,
  onNotify,
  onError,
}: CrmEmailDeskProps) {
  const {
    crmEmails,
    crmContacts,
    unifiedTradeBook,
    marketConfig,
    adminCreateCrmEmail,
    adminUpdateCrmEmail,
    adminDeleteCrmEmail,
  } = useBuyerAuth();

  const [directionFilter, setDirectionFilter] = useState<
    'All' | CrmEmailDirection
  >('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [draft, setDraft] = useState<AdminCrmEmailInput>({
    direction: 'Outbound',
    toEmail: '',
    fromEmail: 'abdoul@ahzantechltd.com',
    contactName: '',
    companyName: '',
    leadId: '',
    subject: '',
    body: '',
    status: 'Sent',
    sentDate: todayIso(),
  });

  useEffect(() => {
    if (!prefill) return;
    setEditingId(null);
    setDraft((prev) => ({
      ...prev,
      direction: 'Outbound',
      status: 'Sent',
      toEmail: prefill.toEmail,
      contactName: prefill.contactName,
      companyName: prefill.companyName,
      leadId: prefill.leadId || '',
      leadRankId: prefill.leadRankId,
      activityType: 'EMAIL',
      subject:
        prefill.subject ||
        `Ahzan Tech Ltd · Trade Quotation for ${prefill.companyName}`,
      body:
        prefill.body ||
        `Dear ${prefill.contactName || 'Trade Partner'},\n\nFollowing our commercial desk review at Ahzan Tech Ltd (RC 2012723, EL No. 65197), please let us know your preferred discharge port, target MT allocation, and Incoterms 2020 preference so we can issue your signed Proforma / SCO.\n\nBest regards,\nAbdulganiyu Hamza\nManaging Director, Ahzan Tech Ltd\n+234 803 704 1966 · abdoul@ahzantechltd.com`,
      sentDate: todayIso(),
    }));
  }, [prefill]);

  const applyTemplate = (
    templateKey: 'lithium' | 'agro' | 'followup' | 'dispatch'
  ) => {
    const recipient = draft.contactName || 'Procurement Team';
    const company = draft.companyName || 'your organization';
    const liPerMt = (
      marketConfig.lithiumRatePerPercentUsd * marketConfig.lithiumAssayPct
    ).toFixed(2);

    if (templateKey === 'lithium') {
      setDraft((p) => ({
        ...p,
        subject: `SCO Offer: Nigerian Spodumene / Lithium Ore (${marketConfig.lithiumAssayPct}% Li2O @ $${marketConfig.lithiumRatePerPercentUsd}/%)`,
        body: `Dear ${recipient},\n\nAhzan Tech Ltd (MCO Licence No. 65197 EL) submits this formal export offer for ${company}:\n\n- Commodity: Nigerian Lithium-Bearing Spodumene Ore\n- Verified SGS Assay Benchmark: ${marketConfig.lithiumAssayPct}% Li2O (Lot ZMGN057)\n- Unit Price: US$${marketConfig.lithiumRatePerPercentUsd.toFixed(2)} per 1% Li2O (~US$${liPerMt}/MT FOB Apapa)\n- Quote Validity: ${marketConfig.quoteValidityDays} calendar days\n- Inspection & Terms: SGS pre-shipment assay & NESS clearance under ICC Incoterms 2020\n\nKindly confirm target MT volume and discharge port for Proforma Invoice issuance.\n\nBest regards,\nAbdulganiyu Hamza\nAhzan Tech Ltd · abdoul@ahzantechltd.com`,
      }));
    } else if (templateKey === 'agro') {
      setDraft((p) => ({
        ...p,
        subject: `Official FOB Lagos Agro-Commodities Price Schedule (${marketConfig.agroIssueDate})`,
        body: `Dear ${recipient},\n\nPlease find our updated FOB Lagos Agro-Export benchmark valid for ${marketConfig.quoteValidityDays} days (Schedule Date: ${marketConfig.agroIssueDate}):\n\n- Whitish Sesame Seeds (99/1 Machine Cleaned): $1,400/MT FOB Lagos\n- Dried Split Ginger (ASTA Grade): $2,350/MT FOB Lagos\n- Hibiscus Flower Whole (Sift Grade): $1,800/MT FOB Lagos\n- Raw Cashew Nuts (KOR 48+): $1,250/MT FOB Lagos\n\nSettlement options: Irrevocable L/C at sight or 30/70 T/T upon SGS & NAQS Phytosanitary release.\n\nBest regards,\nAhzan Tech Ltd Trade Desk\nabdoul@ahzantechltd.com`,
      }));
    } else if (templateKey === 'followup') {
      setDraft((p) => ({
        ...p,
        subject: `Follow-Up: ${company} — Export Allocation & Shipping Schedule`,
        body: `Dear ${recipient},\n\nChecking in regarding our active quotation for ${company}. Vessel space out of Apapa Wharf and Tin Can Island is currently open for upcoming FCL bookings.\n\nPlease advise if you require an updated SGS certificate preview or revised CIF ocean freight quote.\n\nWarm regards,\nAbdulganiyu Hamza\nAhzan Tech Ltd`,
      }));
    } else {
      setDraft((p) => ({
        ...p,
        subject: `Export Dispatch Notice: SGS Certificate, Form NXP & Ocean B/L`,
        body: `Dear ${recipient},\n\nYour shipment dossier for ${company} has been updated in the Ahzan Tech Ltd Buyer Portal with verified SGS Assay, NESS Form NXP clearance, and Bill of Lading details.\n\nPlease review and countersign directly inside your portal workspace.\n\nRegards,\nAhzan Tech Ltd Logistics Desk`,
      }));
    }
  };

  const handleSelectRecipient = (contactId: string) => {
    const contact = crmContacts.find((c) => c.id === contactId);
    if (!contact) return;
    setDraft((p) => ({
      ...p,
      toEmail: contact.email,
      contactName: contact.fullName,
      companyName: contact.companyName,
    }));
  };

  const handleSelectLead = (rankIdStr: string) => {
    const rankNum = Number(rankIdStr);
    const lead = unifiedTradeBook.find((l) => l.rankId === rankNum);
    if (!lead) {
      setDraft((p) => ({ ...p, leadId: '', leadRankId: undefined }));
      return;
    }
    setDraft((p) => ({
      ...p,
      leadId: lead.id,
      leadRankId: lead.rankId,
      toEmail: lead.directEmail || lead.generalEmail || p.toEmail,
      contactName: lead.decisionMaker || p.contactName,
      companyName: lead.companyName,
      subject: lead.emailSubject || `Ahzan Tech Ltd · ${lead.companyName}`,
      body: lead.emailBody || p.body,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await adminUpdateCrmEmail(editingId, {
          direction: draft.direction,
          toEmail: draft.toEmail,
          contactName: draft.contactName,
          companyName: draft.companyName,
          leadId: draft.leadId,
          leadRankId: draft.leadRankId,
          activityType: 'EMAIL',
          subject: draft.subject,
          body: draft.body,
          status: draft.status,
          sentDate: draft.sentDate,
        });
        setEditingId(null);
        onNotify('CRM email record updated and synced.');
      } else {
        await adminCreateCrmEmail({
          ...draft,
          activityType: 'EMAIL',
        });
        onNotify(
          draft.status === 'Draft'
            ? 'Email draft saved to CRM.'
            : 'Email thread logged and synced to CRM.'
        );
      }
      onClearPrefill?.();
      setDraft({
        direction: 'Outbound',
        toEmail: '',
        fromEmail: 'abdoul@ahzantechltd.com',
        contactName: '',
        companyName: '',
        leadId: '',
        subject: '',
        body: '',
        status: 'Sent',
        sentDate: todayIso(),
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to save CRM email.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (mail: CrmEmailDoc) => {
    setEditingId(mail.id);
    setDraft({
      direction: mail.direction,
      toEmail: mail.toEmail,
      fromEmail: mail.fromEmail,
      contactName: mail.contactName,
      companyName: mail.companyName,
      leadId: mail.leadId,
      subject: mail.subject,
      body: mail.body,
      status: mail.status,
      sentDate: mail.sentDate,
    });
  };

  const handleMarkSent = async (mail: CrmEmailDoc) => {
    try {
      await adminUpdateCrmEmail(mail.id, {
        direction: 'Outbound',
        toEmail: mail.toEmail,
        contactName: mail.contactName,
        companyName: mail.companyName,
        leadId: mail.leadId,
        subject: mail.subject,
        body: mail.body,
        status: 'Sent',
        sentDate: todayIso(),
      });
      onNotify('Draft marked as Sent in CRM log.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };

  const handleCopyBody = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const filteredEmails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return crmEmails.filter((m) => {
      if (directionFilter !== 'All' && m.direction !== directionFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.subject.toLowerCase().includes(q) ||
        m.toEmail.toLowerCase().includes(q) ||
        m.companyName.toLowerCase().includes(q) ||
        m.contactName.toLowerCase().includes(q)
      );
    });
  }, [crmEmails, directionFilter, searchQuery]);

  const mailtoHref = `mailto:${encodeURIComponent(
    draft.toEmail.trim()
  )}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(
    draft.body
  )}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Left 5 Columns: Composer & Templates */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-600" />
            <span>{editingId ? 'Edit CRM Email Thread' : 'Compose & Log Email'}</span>
          </h4>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft({
                  direction: 'Outbound',
                  toEmail: '',
                  fromEmail: 'abdoul@ahzantechltd.com',
                  contactName: '',
                  companyName: '',
                  leadId: '',
                  subject: '',
                  body: '',
                  status: 'Sent',
                  sentDate: todayIso(),
                });
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Quick Templates */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-600">
            Quick B2B Trade Templates
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyTemplate('lithium')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 border border-slate-200 rounded cursor-pointer"
            >
              Lithium ${marketConfig.lithiumRatePerPercentUsd}/% SCO
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('agro')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 border border-slate-200 rounded cursor-pointer"
            >
              Agro Price List
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('followup')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 border border-slate-200 rounded cursor-pointer"
            >
              Lead Follow-Up
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('dispatch')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 border border-slate-200 rounded cursor-pointer"
            >
              Docs Dispatch
            </button>
          </div>
        </div>

        {/* Contact & Lead Auto-Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Fill from CRM Contact
            </label>
            <select
              value=""
              onChange={(e) => handleSelectRecipient(e.target.value)}
              className="w-full h-8 px-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="">Select Contact...</option>
              {crmContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} — {c.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Link to Trade Book Lead (#Rank)
            </label>
            <select
              value={draft.leadRankId ? String(draft.leadRankId) : ''}
              onChange={(e) => handleSelectLead(e.target.value)}
              className="w-full h-8 px-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="">No Linked Lead</option>
              {unifiedTradeBook.map((l) => (
                <option key={l.rankId} value={l.rankId}>
                  #{l.rankId} {l.companyName} ({l.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Recipient Email
            </label>
            <input
              type="email"
              required
              maxLength={160}
              value={draft.toEmail}
              onChange={(e) =>
                setDraft((p) => ({ ...p, toEmail: e.target.value }))
              }
              placeholder="buyer@company.com"
              className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              maxLength={160}
              value={draft.companyName}
              onChange={(e) =>
                setDraft((p) => ({ ...p, companyName: e.target.value }))
              }
              className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={draft.contactName}
              onChange={(e) =>
                setDraft((p) => ({ ...p, contactName: e.target.value }))
              }
              className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Direction
              </label>
              <select
                value={draft.direction}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    direction: e.target.value as CrmEmailDirection,
                  }))
                }
                className="w-full h-9 px-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
              >
                <option value="Outbound">Outbound</option>
                <option value="Inbound">Inbound</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    status: e.target.value as CrmEmailStatus,
                  }))
                }
                className="w-full h-9 px-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
              >
                <option value="Sent">Sent</option>
                <option value="Received">Received</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Email Subject
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              value={draft.subject}
              onChange={(e) =>
                setDraft((p) => ({ ...p, subject: e.target.value }))
              }
              className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={draft.sentDate}
              onChange={(e) =>
                setDraft((p) => ({ ...p, sentDate: e.target.value }))
              }
              className="w-full h-9 px-2 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Message Body
          </label>
          <textarea
            rows={7}
            required
            minLength={2}
            maxLength={5000}
            value={draft.body}
            onChange={(e) => setDraft((p) => ({ ...p, body: e.target.value }))}
            className="w-full p-2.5 text-xs text-slate-900 border border-slate-300 rounded-md leading-relaxed"
          />
        </div>

        <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {draft.toEmail.trim() && (
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                <span>Open in Mail App</span>
              </a>
            )}
            <button
              type="button"
              onClick={() =>
                void handleCopyBody('composer-body', `${draft.subject}\n\n${draft.body}`)
              }
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              {copiedId === 'composer-body' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedId === 'composer-body' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 rounded-md cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{editingId ? 'Update Email Log' : 'Save & Log in CRM'}</span>
          </button>
        </div>
      </form>

      {/* Right 7 Columns: Thread History & Filterable Log */}
      <div className="xl:col-span-7 space-y-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'Outbound', 'Inbound', 'Draft'] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setDirectionFilter(dir)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border cursor-pointer ${
                  directionFilter === dir
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {dir}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject, email, company..."
              className="w-full h-8 pl-8 pr-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>
        </div>

        {filteredEmails.length === 0 ? (
          <div className="py-12 px-4 text-center bg-white border border-slate-200 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              No logged CRM email threads found.
            </p>
            <p className="text-xs text-slate-500">
              Use the Email Composer on the left to send B2B quotations or log inbound buyer correspondence synced with your companion app.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
            {filteredEmails.map((mail) => {
              const isExpanded = expandedId === mail.id;
              const isConfirmDel = confirmDeleteId === mail.id;
              return (
                <div key={mail.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span
                          className={`font-semibold ${
                            mail.direction === 'Inbound'
                              ? 'text-emerald-700'
                              : mail.direction === 'Draft'
                                ? 'text-amber-700'
                                : 'text-slate-800'
                          }`}
                        >
                          {mail.direction}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium text-slate-600">
                          {mail.status}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          {mail.sentDate}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : mail.id)
                        }
                        className="text-left text-sm font-bold text-slate-900 hover:text-amber-700 cursor-pointer"
                      >
                        {mail.subject}
                      </button>
                      <div className="text-xs text-slate-600 font-mono truncate">
                        {mail.companyName} ({mail.contactName}) · {mail.toEmail}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {mail.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => void handleMarkSent(mail)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                        >
                          Mark Sent
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(mail)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                        title="Edit email record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {isConfirmDel ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            void adminDeleteCrmEmail(mail.id).then(() =>
                              onNotify('Email log deleted.')
                            );
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 rounded cursor-pointer"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(mail.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete email record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {mail.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
