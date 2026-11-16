import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useBuyerAuth } from '../../context/BuyerAuthContext';
import {
  clearCachedDriveAccessToken,
  connectGoogleDrive,
  getCachedDriveAccessToken,
  subscribeDriveTokenChange,
} from '../../lib/googleDriveAuth';
import {
  CSV_EXPORT_HEADERS_18,
  type LithiumIntelRecord,
} from '../../types/lithiumIntel';

interface GoogleDriveVaultPanelProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  owners?: Array<{ displayName?: string; emailAddress?: string }>;
}

type DriveCategoryFilter = 'ALL' | 'FOLDERS' | 'DOCS_PDF' | 'SHEETS';

type PendingMutation =
  | {
      type: 'CREATE_FOLDER';
      folderName: string;
      parentId: string;
      parentName: string;
    }
  | {
      type: 'UPLOAD_FILE';
      file: File;
      parentId: string;
      parentName: string;
    }
  | {
      type: 'SYNC_CSV';
      fileName: string;
      rowCount: number;
      csvContent: string;
      parentId: string;
      parentName: string;
    }
  | {
      type: 'RENAME_FILE';
      file: DriveFileItem;
      nextName: string;
    }
  | {
      type: 'DELETE_FILE';
      files: DriveFileItem[];
    };

const FOLDER_MIME = 'application/vnd.google-apps.folder';

function csvCell(val: unknown): string {
  const s = String(val ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildEighteenColumnCsv(records: LithiumIntelRecord[]): string {
  const rows = records.map((r) => {
    const implied =
      r.estimatedTonnage > 0
        ? (r.targetFobValue / r.estimatedTonnage).toFixed(2)
        : String(r.impliedFobPricePerMt || 0);
    const followDate = r.followUpAtMillis
      ? new Date(r.followUpAtMillis).toISOString().slice(0, 10)
      : '';
    return [
      r.companyName,
      r.leadCategory,
      r.regionCode,
      r.decisionMaker,
      r.title,
      r.whatsappNumber,
      r.directEmail || r.generalEmail,
      r.websiteUrl,
      r.priorityScore,
      r.crmStage,
      r.winProbability,
      r.outreachStatus,
      r.estimatedTonnage,
      r.targetFobValue,
      implied,
      followDate,
      r.nextAction,
      r.tags,
    ]
      .map(csvCell)
      .join(',');
  });
  return [CSV_EXPORT_HEADERS_18.join(','), ...rows].join('\n');
}

function formatBytes(rawSize?: string): string {
  if (!rawSize) return '—';
  const bytes = Number(rawSize);
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFriendlyType(mimeType: string): string {
  if (mimeType === FOLDER_MIME) return 'Folder';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Google Slides';
  if (mimeType === 'text/csv') return 'CSV';
  if (mimeType.startsWith('image/')) return 'Image';
  return 'File';
}

export default function GoogleDriveVaultPanel({
  onNotify,
  onError,
}: GoogleDriveVaultPanelProps) {
  const { unifiedTradeBook } = useBuyerAuth();

  const [accessToken, setAccessToken] = useState<string | null>(() =>
    getCachedDriveAccessToken()
  );
  const [connecting, setConnecting] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; name: string }>
  >([{ id: 'root', name: 'My Drive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DriveCategoryFilter>('ALL');

  // Interactive Drafts & Mandatory Confirmation Modal State
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderDraft, setNewFolderDraft] = useState('');
  const [renamingFile, setRenamingFile] = useState<DriveFileItem | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null);
  const [executingMutation, setExecutingMutation] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeDriveTokenChange((nextToken) => {
      setAccessToken(nextToken);
      if (!nextToken) {
        setFiles([]);
      }
    });
  }, []);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const handleUnauthorized = useCallback(() => {
    clearCachedDriveAccessToken();
    setAccessToken(null);
    onError(
      'Your Google Drive session expired. Please sign in with Google again to reconnect.'
    );
  }, [onError]);

  const fetchDriveFiles = useCallback(
    async (token: string, folderId: string, keyword: string) => {
      setLoadingFiles(true);
      try {
        const clauses: string[] = ['trashed = false'];
        if (keyword.trim()) {
          const escaped = keyword.trim().replace(/'/g, "\\'");
          clauses.push(`name contains '${escaped}'`);
        } else {
          clauses.push(`'${folderId}' in parents`);
        }

        const params = new URLSearchParams({
          q: clauses.join(' and '),
          pageSize: '50',
          orderBy: 'folder,modifiedTime desc',
          fields:
            'files(id,name,mimeType,size,modifiedTime,webViewLink,owners(displayName,emailAddress))',
        });

        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Google Drive API error (${res.status}): ${body}`);
        }

        const data = (await res.json()) as { files?: DriveFileItem[] };
        setFiles(Array.isArray(data.files) ? data.files : []);
      } catch (err) {
        onError(
          err instanceof Error ? err.message : 'Unable to load Google Drive files.'
        );
      } finally {
        setLoadingFiles(false);
      }
    },
    [handleUnauthorized, onError]
  );

  useEffect(() => {
    if (accessToken) {
      void fetchDriveFiles(accessToken, currentFolder.id, searchQuery);
    }
  }, [accessToken, currentFolder.id, searchQuery, fetchDriveFiles]);

  const handleConnectDrive = async () => {
    setConnecting(true);
    try {
      const { accessToken: token } = await connectGoogleDrive();
      setAccessToken(token);
      onNotify('Google Drive connected for this session.');
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : 'Google Drive sign-in was cancelled or failed.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingMutation({
      type: 'UPLOAD_FILE',
      file,
      parentId: currentFolder.id,
      parentName: currentFolder.name,
    });
  };

  const handleRequestSyncCsv = () => {
    const csvContent = buildEighteenColumnCsv(unifiedTradeBook);
    const stamp = new Date().toISOString().slice(0, 10);
    setPendingMutation({
      type: 'SYNC_CSV',
      fileName: `Ahzan_Tech_TradeBook_${stamp}.csv`,
      rowCount: unifiedTradeBook.length,
      csvContent,
      parentId: currentFolder.id,
      parentName: currentFolder.name,
    });
  };

  const uploadMultipartToDrive = async (
    token: string,
    metadata: Record<string, unknown>,
    content: Blob | File
  ) => {
    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', content);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (res.status === 401) {
      handleUnauthorized();
      return null;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upload failed (${res.status}): ${body}`);
    }
    return res.json();
  };

  const executeConfirmedMutation = async () => {
    if (!pendingMutation || !accessToken) return;
    setExecutingMutation(true);
    try {
      if (pendingMutation.type === 'CREATE_FOLDER') {
        const res = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: pendingMutation.folderName,
            mimeType: FOLDER_MIME,
            parents: [pendingMutation.parentId],
          }),
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!res.ok) throw new Error(`Folder creation failed (${res.status})`);
        setShowNewFolderInput(false);
        setNewFolderDraft('');
        onNotify(`Created folder "${pendingMutation.folderName}" in Google Drive.`);
      } else if (pendingMutation.type === 'UPLOAD_FILE') {
        const uploaded = await uploadMultipartToDrive(
          accessToken,
          {
            name: pendingMutation.file.name,
            parents: [pendingMutation.parentId],
          },
          pendingMutation.file
        );
        if (!uploaded) return;
        onNotify(`Uploaded "${pendingMutation.file.name}" to Google Drive.`);
      } else if (pendingMutation.type === 'SYNC_CSV') {
        const csvBlob = new Blob([pendingMutation.csvContent], {
          type: 'text/csv;charset=utf-8',
        });
        const uploaded = await uploadMultipartToDrive(
          accessToken,
          {
            name: pendingMutation.fileName,
            mimeType: 'text/csv',
            parents: [pendingMutation.parentId],
          },
          csvBlob
        );
        if (!uploaded) return;
        onNotify(
          `Saved "${pendingMutation.fileName}" (${pendingMutation.rowCount} rows) to Google Drive.`
        );
      } else if (pendingMutation.type === 'RENAME_FILE') {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            pendingMutation.file.id
          )}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: pendingMutation.nextName }),
          }
        );
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!res.ok) throw new Error(`Rename failed (${res.status})`);
        setRenamingFile(null);
        setRenameDraft('');
        onNotify(`Renamed file to "${pendingMutation.nextName}".`);
      } else if (pendingMutation.type === 'DELETE_FILE') {
        for (const item of pendingMutation.files) {
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.id)}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
          if (res.status === 401) {
            handleUnauthorized();
            return;
          }
          if (!res.ok) {
            throw new Error(`Delete failed for "${item.name}" (${res.status})`);
          }
        }
        onNotify(
          `Deleted ${pendingMutation.files.length} file(s) from Google Drive.`
        );
      }

      setPendingMutation(null);
      await fetchDriveFiles(accessToken, currentFolder.id, searchQuery);
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : 'Google Drive operation could not be completed.'
      );
    } finally {
      setExecutingMutation(false);
    }
  };

  const handleDownloadFile = async (file: DriveFileItem) => {
    if (!accessToken) return;
    setDownloadingId(file.id);
    try {
      const isGoogleWorkspaceDoc = file.mimeType.startsWith(
        'application/vnd.google-apps.'
      );
      const url = isGoogleWorkspaceDoc
        ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            file.id
          )}/export?mimeType=application/pdf`
        : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            file.id
          )}?alt=media`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error(`Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = isGoogleWorkspaceDoc ? `${file.name}.pdf` : file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'Unable to download Drive file.'
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (categoryFilter === 'FOLDERS') return f.mimeType === FOLDER_MIME;
      if (categoryFilter === 'DOCS_PDF') {
        return (
          f.mimeType === 'application/pdf' ||
          f.mimeType === 'application/vnd.google-apps.document'
        );
      }
      if (categoryFilter === 'SHEETS') {
        return (
          f.mimeType === 'application/vnd.google-apps.spreadsheet' ||
          f.mimeType === 'text/csv' ||
          f.mimeType.includes('spreadsheet')
        );
      }
      return true;
    });
  }, [files, categoryFilter]);

  if (!accessToken) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
              <HardDrive className="w-3.5 h-3.5" />
              <span>GOOGLE DRIVE WORKSPACE VAULT</span>
            </div>
            <h4 className="font-display text-lg font-bold text-slate-900">
              Connect Google Drive for Trade Documents, Assays &amp; CRM Snapshots
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Browse folders, upload signed Proforma Invoices &amp; SGS Assay PDFs,
              and back up your 18-column Ahzan Tech Ltd Trade Book CSV straight to
              Google Drive. Access tokens remain strictly in memory for your active
              session.
            </p>
          </div>

          <button
            type="button"
            disabled={connecting}
            onClick={() => void handleConnectDrive()}
            className="gsi-material-button inline-flex items-center gap-3 h-11 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-[#1f1f1f] border border-[#747775] rounded-[4px] font-medium text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            <div className="gsi-material-button-icon w-[18px] h-[18px] shrink-0">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="block w-full h-full"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </div>
            <span className="gsi-material-button-contents">
              {connecting ? 'Connecting Google Drive...' : 'Sign in with Google'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <div className="font-semibold text-slate-900">Trade &amp; Assay Archive</div>
            <p>
              Organize EL No. 65197 geological reports, SGS certificates, and signed
              FCO / Proforma PDFs inside dedicated buyer folders.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <div className="font-semibold text-slate-900">1-Click Trade Book Sync</div>
            <p>
              Push an 18-column CSV snapshot of all {unifiedTradeBook.length} CRM
              counterparties directly into your Drive folder.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <div className="font-semibold text-slate-900">Explicit Change Guard</div>
            <p>
              Every Drive upload, folder creation, rename, or file deletion requires
              your explicit review and confirmation first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Action Header Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h4 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-600" />
              <span>Google Drive Trade Vault</span>
            </h4>
            <div className="flex flex-wrap items-center gap-1 text-xs font-mono text-slate-500 mt-1">
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.id} className="inline-flex items-center gap-1">
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <button
                    type="button"
                    onClick={() =>
                      setBreadcrumbs((prev) => prev.slice(0, idx + 1))
                    }
                    className={`hover:text-slate-900 cursor-pointer ${
                      idx === breadcrumbs.length - 1
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowNewFolderInput((p) => !p);
                setNewFolderDraft('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-700" />
              <span>New Folder</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={handleRequestSyncCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Save Trade Book CSV</span>
            </button>

            <button
              type="button"
              disabled={loadingFiles}
              onClick={() =>
                void fetchDriveFiles(accessToken, currentFolder.id, searchQuery)
              }
              aria-label="Refresh Drive files"
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                clearCachedDriveAccessToken();
                onNotify('Disconnected Google Drive session token.');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 bg-white border border-slate-200 rounded-md cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>

        {/* Inline New Folder Name Draft */}
        {showNewFolderInput && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newFolderDraft}
              onChange={(e) => setNewFolderDraft(e.target.value)}
              placeholder="Folder name (e.g., Ahzan Tech - SGS Assays & LoI)"
              className="flex-1 h-9 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-900"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!newFolderDraft.trim()}
                onClick={() =>
                  setPendingMutation({
                    type: 'CREATE_FOLDER',
                    folderName: newFolderDraft.trim(),
                    parentId: currentFolder.id,
                    parentName: currentFolder.name,
                  })
                }
                className="px-3.5 h-9 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer disabled:opacity-50"
              >
                Review &amp; Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewFolderInput(false)}
                className="px-3 h-9 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `All (${files.length})` },
                { id: 'FOLDERS', label: 'Folders' },
                { id: 'DOCS_PDF', label: 'Docs & PDFs' },
                { id: 'SHEETS', label: 'Sheets & CSV' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Google Drive..."
              className="h-8 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-md text-slate-900 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Inline Rename Bar */}
      {renamingFile && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
          <span className="font-semibold text-amber-950 shrink-0">
            Rename &ldquo;{renamingFile.name}&rdquo;:
          </span>
          <input
            type="text"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            className="flex-1 h-8 px-2.5 bg-white border border-amber-300 rounded text-slate-900"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!renameDraft.trim() || renameDraft.trim() === renamingFile.name}
              onClick={() =>
                setPendingMutation({
                  type: 'RENAME_FILE',
                  file: renamingFile,
                  nextName: renameDraft.trim(),
                })
              }
              className="px-3 h-8 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer disabled:opacity-50"
            >
              Review Rename
            </button>
            <button
              type="button"
              onClick={() => setRenamingFile(null)}
              className="px-2.5 h-8 text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Files Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loadingFiles && files.length === 0 ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>Loading files from Google Drive...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No matching files found in &ldquo;{currentFolder.name}&rdquo;. Upload a
            document or save the Trade Book CSV above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-500 uppercase">
                  <th className="py-2.5 px-4">File Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Modified</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file) => {
                  const isFolder = file.mimeType === FOLDER_MIME;
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2 min-w-[200px]">
                          {isFolder ? (
                            <Folder className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() =>
                                setBreadcrumbs((prev) => [
                                  ...prev,
                                  { id: file.id, name: file.name },
                                ])
                              }
                              className="text-left font-semibold text-slate-900 hover:text-amber-700 cursor-pointer truncate max-w-xs"
                            >
                              {file.name}
                            </button>
                          ) : (
                            <span className="truncate max-w-xs">{file.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {getFriendlyType(file.mimeType)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        {formatBytes(file.size)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in Google Drive"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {!isFolder && (
                            <button
                              type="button"
                              disabled={downloadingId === file.id}
                              onClick={() => void handleDownloadFile(file)}
                              title="Download file"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer disabled:opacity-50"
                            >
                              {downloadingId === file.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingFile(file);
                              setRenameDraft(file.name);
                            }}
                            title="Rename file"
                            className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingMutation({
                                type: 'DELETE_FILE',
                                files: [file],
                              })
                            }
                            title="Delete file"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mandatory Confirmation Modal for All Mutating / Destructive Drive Actions */}
      {pendingMutation && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-md shrink-0 ${
                  pendingMutation.type === 'DELETE_FILE'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="font-display text-sm font-bold text-slate-900">
                  {pendingMutation.type === 'DELETE_FILE' &&
                    `Delete ${pendingMutation.files.length} file(s) from Google Drive?`}
                  {pendingMutation.type === 'RENAME_FILE' &&
                    `Rename "${pendingMutation.file.name}" in Google Drive?`}
                  {pendingMutation.type === 'CREATE_FOLDER' &&
                    `Create folder "${pendingMutation.folderName}" in Google Drive?`}
                  {pendingMutation.type === 'UPLOAD_FILE' &&
                    `Upload "${pendingMutation.file.name}" to Google Drive?`}
                  {pendingMutation.type === 'SYNC_CSV' &&
                    `Save Trade Book CSV to Google Drive?`}
                </h5>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {pendingMutation.type === 'DELETE_FILE' &&
                    `This will permanently delete "${pendingMutation.files
                      .map((f) => f.name)
                      .join(', ')}" from your Google Drive. This action cannot be undone.`}
                  {pendingMutation.type === 'RENAME_FILE' &&
                    `The Google Drive item "${pendingMutation.file.name}" will be updated to "${pendingMutation.nextName}".`}
                  {pendingMutation.type === 'CREATE_FOLDER' &&
                    `A new folder named "${pendingMutation.folderName}" will be created inside "${pendingMutation.parentName}".`}
                  {pendingMutation.type === 'UPLOAD_FILE' &&
                    `File "${pendingMutation.file.name}" (${formatBytes(
                      String(pendingMutation.file.size)
                    )}) will be uploaded into "${pendingMutation.parentName}".`}
                  {pendingMutation.type === 'SYNC_CSV' &&
                    `File "${pendingMutation.fileName}" containing ${pendingMutation.rowCount} Trade Book counterparties will be saved inside "${pendingMutation.parentName}".`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={executingMutation}
                onClick={() => setPendingMutation(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={executingMutation}
                onClick={() => void executeConfirmedMutation()}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md cursor-pointer disabled:opacity-60 ${
                  pendingMutation.type === 'DELETE_FILE'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {executingMutation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {pendingMutation.type === 'DELETE_FILE'
                    ? 'Confirm Delete'
                    : 'Confirm'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
