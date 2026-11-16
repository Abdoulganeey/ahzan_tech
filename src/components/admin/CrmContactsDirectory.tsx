import { useMemo, useState, type FormEvent } from 'react';
import {
  Briefcase,
  Check,
  Copy,
  Download,
  Edit3,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  useBuyerAuth,
  type AdminCrmContactInput,
  type CrmContactDoc,
  type CrmSegment,
  type CrmSource,
} from '../../context/BuyerAuthContext';
import { checkDuplicateLead, normalizeCompanyKey, type DuplicateMatchResult } from '../../utils/duplicateDetector';
import type {
  EmailComposerPrefill,
  LeadFormPrefill,
} from './CrmLeadsWorkspace';

const CRM_SEGMENTS: CrmSegment[] = [
  'Offtaker',
  'Broker',
  'Supplier',
  'Logistics',
  'VIP',
];

const CRM_SOURCES: CrmSource[] = [
  'Manual',
  'Companion App',
  'Website RFQ',
  'Price Alert',
  'Direct Inquiry',
];

interface CrmContactsDirectoryProps {
  onOpenEmailComposer: (prefill: EmailComposerPrefill) => void;
  onCreateLeadForContact: (prefill: LeadFormPrefill) => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function CrmContactsDirectory({
  onOpenEmailComposer,
  onCreateLeadForContact,
  onNotify,
  onError,
}: CrmContactsDirectoryProps) {
  const {
    crmContacts,
    unifiedTradeBook,
    adminCreateCrmContact,
    adminUpdateCrmContact,
    adminDeleteCrmContact,
    adminSyncWebActivityToCrm,
  } = useBuyerAuth();

  const [segmentFilter, setSegmentFilter] = useState<'All' | CrmSegment>('All');
  const [directoryScope, setDirectoryScope] = useState<'custom' | 'tradebook'>('custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncingWeb, setSyncingWeb] = useState(false);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [newContact, setNewContact] = useState<AdminCrmContactInput>({
    fullName: '',
    companyName: '',
    roleTitle: 'Procurement Director',
    email: '',
    phoneWhatsapp: '',
    countryPort: 'Qingdao / Rotterdam',
    segment: 'Offtaker',
    tagsSummary: 'Lithium Ore · FCL Buyer',
    notes: '',
    source: 'Manual',
  });

  const [editDraft, setEditDraft] = useState<Omit<AdminCrmContactInput, 'source'>>({
    fullName: '',
    companyName: '',
    roleTitle: '',
    email: '',
    phoneWhatsapp: '',
    countryPort: '',
    segment: 'Offtaker',
    tagsSummary: '',
    notes: '',
  });

  const liveContactDuplicate: DuplicateMatchResult = useMemo(() => {
    if (!showAddForm) return { hasDuplicate: false, matchedBy: [], matches: [] };
    if (
      !newContact.companyName.trim() &&
      !newContact.email.trim() &&
      !newContact.phoneWhatsapp.trim()
    ) {
      return { hasDuplicate: false, matchedBy: [], matches: [] };
    }
    const bookResult = checkDuplicateLead(
      {
        companyName: newContact.companyName,
        directEmail: newContact.email,
        generalEmail: newContact.email,
        whatsappNumber: newContact.phoneWhatsapp,
      },
      unifiedTradeBook
    );
    if (bookResult.hasDuplicate) return bookResult;

    const normNewComp = normalizeCompanyKey(newContact.companyName);
    const normNewEmail = newContact.email.trim().toLowerCase();
    const matchedCrm = crmContacts.find(
      (c) =>
        (normNewComp && (c.normalizedCompanyKey || normalizeCompanyKey(c.companyName)) === normNewComp) ||
        (normNewEmail.length >= 5 && c.email.trim().toLowerCase() === normNewEmail)
    );
    if (matchedCrm) {
      return {
        hasDuplicate: true,
        matchedBy: ['company'],
        matches: unifiedTradeBook.slice(0, 0),
      };
    }
    return { hasDuplicate: false, matchedBy: [], matches: [] };
  }, [showAddForm, newContact, unifiedTradeBook, crmContacts]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return crmContacts.filter((c) => {
      if (segmentFilter !== 'All' && c.segment !== segmentFilter) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.countryPort.toLowerCase().includes(q) ||
        c.tagsSummary.toLowerCase().includes(q)
      );
    });
  }, [crmContacts, segmentFilter, searchQuery]);

  const filteredTradeBookContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedTradeBook.filter((r) => {
      if (!q) return true;
      return (
        r.decisionMaker.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.directEmail.toLowerCase().includes(q) ||
        r.generalEmail.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.whatsappNumber.toLowerCase().includes(q)
      );
    });
  }, [unifiedTradeBook, searchQuery]);

  const handleCopyEmail = async (id: string, email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmailId(id);
      setTimeout(() => setCopiedEmailId(null), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminCreateCrmContact(newContact);
      setShowAddForm(false);
      setNewContact({
        fullName: '',
        companyName: '',
        roleTitle: 'Procurement Director',
        email: '',
        phoneWhatsapp: '',
        countryPort: 'Qingdao / Rotterdam',
        segment: 'Offtaker',
        tagsSummary: 'Lithium Ore · FCL Buyer',
        notes: '',
        source: 'Manual',
      });
      onNotify('Contact added to CRM Directory.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to add contact.');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (c: CrmContactDoc) => {
    setEditingId(c.id);
    setEditDraft({
      fullName: c.fullName,
      companyName: c.companyName,
      roleTitle: c.roleTitle,
      email: c.email,
      phoneWhatsapp: c.phoneWhatsapp,
      countryPort: c.countryPort,
      segment: c.segment,
      tagsSummary: c.tagsSummary,
      notes: c.notes,
    });
  };

  const handleSaveEdit = async (contactId: string) => {
    setSavingEdit(true);
    try {
      await adminUpdateCrmContact(contactId, editDraft);
      setEditingId(null);
      onNotify('CRM Contact updated.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to update contact.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSyncWeb = async () => {
    setSyncingWeb(true);
    try {
      const res = await adminSyncWebActivityToCrm();
      onNotify(
        `Synced ${res.contactsAdded} contact(s) & ${res.leadsAdded} lead(s) from Website RFQs and Alerts.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Web sync failed.');
    } finally {
      setSyncingWeb(false);
    }
  };

  const handleExportContactsCsv = () => {
    const header = [
      'FullName',
      'Company',
      'Role',
      'Email',
      'PhoneWhatsApp',
      'CountryPort',
      'Segment',
      'Source',
      'Tags',
    ];
    const escapeCell = (v: string) => `"${String(v || '').replace(/"/g, '""')}"`;
    const rows = crmContacts.map((c) =>
      [
        c.fullName,
        c.companyName,
        c.roleTitle,
        c.email,
        c.phoneWhatsapp,
        c.countryPort,
        c.segment,
        c.source,
        c.tagsSummary,
      ]
        .map(escapeCell)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AhzanTech-CRM-Contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, company, email, port..."
              className="w-full h-9 pl-8 pr-3 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>

          <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md">
            <button
              type="button"
              onClick={() => setDirectoryScope('custom')}
              className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer whitespace-nowrap ${
                directoryScope === 'custom'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CRM Directory ({crmContacts.length})
            </button>
            <button
              type="button"
              onClick={() => setDirectoryScope('tradebook')}
              className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer whitespace-nowrap ${
                directoryScope === 'tradebook'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trade Book ({unifiedTradeBook.length})
            </button>
          </div>

          {directoryScope === 'custom' && (
            <div className="flex flex-wrap items-center gap-1">
              {(['All', ...CRM_SEGMENTS] as const).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setSegmentFilter(seg)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border cursor-pointer whitespace-nowrap ${
                    segmentFilter === seg
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={syncingWeb}
            onClick={() => void handleSyncWeb()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-amber-600 ${
                syncingWeb ? 'animate-spin' : ''
              }`}
            />
            <span>Sync Web Contacts</span>
          </button>

          <button
            type="button"
            onClick={handleExportContactsCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddForm ? 'Close Form' : 'Add Contact'}</span>
          </button>
        </div>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="p-5 bg-white border border-amber-300 rounded-lg space-y-4"
        >
          <h4 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-600" />
            <span>Add Trade Contact to CRM Directory</span>
          </h4>
          {liveContactDuplicate.hasDuplicate && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-950">
              <span className="font-bold">Duplicate Match Warning:</span>{' '}
              {liveContactDuplicate.matchedBy.join(' · ')}
              {liveContactDuplicate.matches.length > 0 &&
                ` — ${liveContactDuplicate.matches
                  .map((m) => `#${m.rankId} ${m.companyName}`)
                  .join(', ')}`}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={newContact.fullName}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, fullName: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={160}
                value={newContact.companyName}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, companyName: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Role / Title
              </label>
              <input
                type="text"
                maxLength={120}
                value={newContact.roleTitle}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, roleTitle: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Corporate Email
              </label>
              <input
                type="email"
                required
                maxLength={160}
                value={newContact.email}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Phone / WhatsApp
              </label>
              <input
                type="text"
                maxLength={60}
                value={newContact.phoneWhatsapp}
                onChange={(e) =>
                  setNewContact((p) => ({
                    ...p,
                    phoneWhatsapp: e.target.value,
                  }))
                }
                className="w-full h-9 px-2.5 text-xs font-mono text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Country / Discharge Port
              </label>
              <input
                type="text"
                maxLength={120}
                value={newContact.countryPort}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, countryPort: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Segment
              </label>
              <select
                value={newContact.segment}
                onChange={(e) =>
                  setNewContact((p) => ({
                    ...p,
                    segment: e.target.value as CrmSegment,
                  }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
              >
                {CRM_SEGMENTS.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Source
              </label>
              <select
                value={newContact.source}
                onChange={(e) =>
                  setNewContact((p) => ({
                    ...p,
                    source: e.target.value as CrmSource,
                  }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-md"
              >
                {CRM_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Commodity Tags
              </label>
              <input
                type="text"
                maxLength={240}
                value={newContact.tagsSummary}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, tagsSummary: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Relationship Notes
              </label>
              <input
                type="text"
                maxLength={1500}
                value={newContact.notes}
                onChange={(e) =>
                  setNewContact((p) => ({ ...p, notes: e.target.value }))
                }
                className="w-full h-9 px-2.5 text-xs text-slate-900 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Contact</span>
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      {directoryScope === 'tradebook' ? (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {filteredTradeBookContacts.slice(0, 80).map((r) => {
            const email = r.directEmail || r.generalEmail;
            return (
              <div
                key={r.rankId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-slate-500">#{r.rankId}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-slate-900 text-sm">{r.decisionMaker}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-amber-700">{r.leadCategory}</span>
                  </div>
                  <div className="text-xs text-slate-700">
                    {r.companyName} · {r.title} · {r.location}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600">
                    {email && <span>{email}</span>}
                    {r.whatsappNumber && <span>{r.whatsappNumber}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenEmailComposer({
                        toEmail: email,
                        contactName: r.decisionMaker,
                        companyName: r.companyName,
                        leadId: r.id,
                        leadRankId: r.rankId,
                        subject: r.emailSubject,
                        body: r.emailBody,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 rounded-md cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-700" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white border border-slate-200 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-slate-900">
            No contacts match this segment or search query.
          </p>
          <p className="text-xs text-slate-500">
            Add contacts directly or click &ldquo;Sync Web Contacts&rdquo; to import all RFQ &amp; Price Alert buyers automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
          {filteredContacts.map((c) => {
            const isEditing = editingId === c.id;
            const isConfirmDel = confirmDeleteId === c.id;
            return (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900 text-sm">
                        {c.fullName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-amber-700">
                        {c.segment}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500">{c.source}</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      {c.companyName}
                      {c.roleTitle ? ` · ${c.roleTitle}` : ''}
                      {c.countryPort ? ` · ${c.countryPort}` : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <span>{c.email}</span>
                        <button
                          type="button"
                          onClick={() => void handleCopyEmail(c.id, c.email)}
                          className="text-slate-400 hover:text-slate-800 cursor-pointer"
                          title="Copy email"
                        >
                          {copiedEmailId === c.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                      {c.phoneWhatsapp && <span>{c.phoneWhatsapp}</span>}
                    </div>
                    {c.tagsSummary && (
                      <div className="text-[11px] text-slate-500">
                        Tags: {c.tagsSummary}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenEmailComposer({
                          toEmail: c.email,
                          contactName: c.fullName,
                          companyName: c.companyName,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-amber-100 rounded-md cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-amber-700" />
                      <span>Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onCreateLeadForContact({
                          contactId: c.id,
                          contactName: c.fullName,
                          companyName: c.companyName,
                          email: c.email,
                          phoneWhatsapp: c.phoneWhatsapp,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>New Lead</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(c)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer"
                      title="Edit contact"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {isConfirmDel ? (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          void adminDeleteCrmContact(c.id).then(() =>
                            onNotify('Contact removed.')
                          );
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <input
                        type="text"
                        value={editDraft.fullName}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, fullName: e.target.value }))
                        }
                        placeholder="Full Name"
                        className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        value={editDraft.companyName}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            companyName: e.target.value,
                          }))
                        }
                        placeholder="Company"
                        className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded"
                      />
                      <input
                        type="email"
                        value={editDraft.email}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="Email"
                        className="h-8 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        value={editDraft.phoneWhatsapp}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            phoneWhatsapp: e.target.value,
                          }))
                        }
                        placeholder="Phone / WhatsApp"
                        className="h-8 px-2.5 text-xs font-mono bg-white border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        value={editDraft.roleTitle}
                        onChange={(e) =>
                          setEditDraft((p) => ({ ...p, roleTitle: e.target.value }))
                        }
                        placeholder="Role Title"
                        className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded"
                      />
                      <input
                        type="text"
                        value={editDraft.countryPort}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            countryPort: e.target.value,
                          }))
                        }
                        placeholder="Country / Port"
                        className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded"
                      />
                      <select
                        value={editDraft.segment}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            segment: e.target.value as CrmSegment,
                          }))
                        }
                        className="h-8 px-2 text-xs bg-white border border-slate-300 rounded"
                      >
                        {CRM_SEGMENTS.map((seg) => (
                          <option key={seg} value={seg}>
                            {seg}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editDraft.tagsSummary}
                        onChange={(e) =>
                          setEditDraft((p) => ({
                            ...p,
                            tagsSummary: e.target.value,
                          }))
                        }
                        placeholder="Tags"
                        className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => void handleSaveEdit(c.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
