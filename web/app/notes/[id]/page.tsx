"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Globe,
  History,
  Loader2,
  Lock,
  RotateCcw,
  Upload,
  User,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api, parseApiError } from "@/lib/api";
import { getTokenPayload } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/api";
import { formatFileSize, getFileTypeInfo, timeAgo } from "@/lib/utils";
import type { Note, NoteVersion } from "@/app/types";

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [note, setNote] = useState<Note | null>(null);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // New-version upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadChangeNote, setUploadChangeNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("note_share_token")) {
      router.replace("/login");
      return;
    }
    const payload = getTokenPayload();
    if (payload) {
      setCurrentUserId(payload.userId);
      setCurrentUserRole(payload.role);
    }
    void loadNote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Data fetching ───────────────────────────────────────────────────
  async function loadNote() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<{ note: Note }>(`/notes/${id}`);
      setNote(data.note);
    } catch (err) {
      const e = parseApiError(err);
      setError(e.type === "field" ? "Unexpected error" : e.message);
    } finally {
      setLoading(false);
    }
  }

  const loadVersions = useCallback(async () => {
    try {
      const { data } = await api.get<{ versions: NoteVersion[] }>(
        `/notes/${id}/versions`
      );
      setVersions(data.versions);
    } catch {
      // Non-critical — silently ignore
    }
  }, [id]);

  useEffect(() => {
    if (showVersions) void loadVersions();
  }, [showVersions, loadVersions]);

  // ── Upload new version ──────────────────────────────────────────────
  async function handleUploadVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) { setUploadError("Please select a file."); return; }

    setUploadError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", uploadFile);
      if (uploadChangeNote.trim()) body.append("changeNote", uploadChangeNote.trim());

      await api.post(`/notes/${id}/versions`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowUpload(false);
      setUploadFile(null);
      setUploadChangeNote("");
      await loadNote();
      if (showVersions) await loadVersions();
    } catch (err) {
      const e = parseApiError(err);
      setUploadError(e.type === "field" ? "Validation error" : e.message);
    } finally {
      setUploading(false);
    }
  }

  // ── Restore version ─────────────────────────────────────────────────
  async function handleRestore(versionId: string) {
    if (!confirm("Restore this version as the current version?")) return;
    setRestoringId(versionId);
    try {
      await api.post(`/notes/${id}/versions/${versionId}/restore`);
      await loadNote();
      await loadVersions();
    } catch (err) {
      const e = parseApiError(err);
      alert(e.type === "field" ? "Error restoring version" : e.message);
    } finally {
      setRestoringId(null);
    }
  }

  const isOwner =
    !!currentUserId &&
    !!note &&
    (note.ownerId === currentUserId || currentUserRole === "ADMIN");

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !note) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
        <AlertCircle className="w-10 h-10 text-zinc-400" strokeWidth={1.5} />
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {error ?? "Note not found"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => loadNote()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const latestVersion = note.versions?.[0];
  const fileInfo = getFileTypeInfo(latestVersion?.mimeType);
  const downloadUrl = `${API_BASE_URL}/notes/${note.id}/download`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to feed
      </Link>

      {/* ── Note header ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden mb-4">
        {/* Accent bar */}
        <div className={`h-1 w-full ${fileInfo.accentClass}`} />

        <div className="p-6">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md tracking-wide ${fileInfo.badgeClass}`}>
              <FileText className="w-3 h-3" />
              {fileInfo.label}
            </span>
            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {note.subject}
            </span>
            <span className={`inline-flex items-center gap-1 text-[12px] px-2.5 py-0.5 rounded-full ${
              note.visibility === "PUBLIC"
                ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            }`}>
              {note.visibility === "PUBLIC"
                ? <><Globe className="w-3 h-3" /> Public</>
                : <><Lock className="w-3 h-3" /> Private</>
              }
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
            {note.title}
          </h1>

          {/* Description */}
          {note.description && (
            <p className="text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
              {note.description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-zinc-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {note.owner?.name ?? "Unknown"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(note.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Current version card ─────────────────────────────────────── */}
      {latestVersion && (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4">
          <div className="flex items-start gap-4">
            {/* File icon */}
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-zinc-400" strokeWidth={1.75} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {latestVersion.fileName}
                </p>
                <StatusBadge status={latestVersion.status} />
              </div>
              <p className="text-[13px] text-zinc-400 dark:text-zinc-500">
                v{latestVersion.versionNumber} · {formatFileSize(latestVersion.fileSize)} ·{" "}
                {timeAgo(latestVersion.createdAt)}
              </p>
              {latestVersion.changeNote && (
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1 italic">
                  &ldquo;{latestVersion.changeNote}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Download button */}
          <a
            href={downloadUrl}
            download
            className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[14px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Download className="w-4 h-4" />
            Download latest version
          </a>
        </div>
      )}

      {/* ── Owner actions ────────────────────────────────────────────── */}
      {isOwner && (
        <div className="mb-4">
          {!showUpload ? (
            <button
              onClick={() => setShowUpload(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[14px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload new version
            </button>
          ) : (
            <form
              onSubmit={handleUploadVersion}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-50">
                  Upload new version
                </h3>
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setUploadFile(null); setUploadError(""); }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <p className="mb-3 text-[12px] text-red-500 dark:text-red-400">{uploadError}</p>
              )}

              {/* File picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mb-3 flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">
                  {uploadFile ? uploadFile.name : "Click to select a file"}
                </span>
                {uploadFile && (
                  <span className="text-[12px] text-zinc-400 shrink-0">
                    {formatFileSize(uploadFile.size)}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />

              <input
                type="text"
                placeholder="Change note (optional)"
                value={uploadChangeNote}
                onChange={(e) => setUploadChangeNote(e.target.value)}
                className="w-full px-4 py-2.5 mb-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-[14px] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-colors"
              />

              <button
                type="submit"
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Version history ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowVersions((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-[14px] font-semibold text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-400" />
            Version history
          </span>
          {showVersions ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showVersions && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {versions.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-zinc-400 text-center">
                No versions found.
              </p>
            ) : (
              versions.map((v) => (
                <VersionRow
                  key={v.id}
                  version={v}
                  isCurrent={v.id === note.currentVersionId}
                  isOwner={isOwner}
                  noteId={note.id}
                  onRestore={handleRestore}
                  restoringId={restoringId}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NoteVersion["status"] }) {
  const map = {
    READY: {
      label: "Ready",
      className: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400",
      icon: CheckCircle2,
    },
    PROCESSING: {
      label: "Processing",
      className: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
      icon: Loader2,
    },
    FAILED: {
      label: "Failed",
      className: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
      icon: AlertCircle,
    },
  };
  const { label, className, icon: Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${className}`}>
      <Icon className={`w-3 h-3 ${status === "PROCESSING" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function VersionRow({
  version,
  isCurrent,
  isOwner,
  noteId,
  onRestore,
  restoringId,
}: {
  version: NoteVersion;
  isCurrent: boolean;
  isOwner: boolean;
  noteId: string;
  onRestore: (id: string) => void;
  restoringId: string | null;
}) {
  const downloadUrl = `${API_BASE_URL}/notes/${noteId}/versions/${version.id}/download`;
  const isRestoring = restoringId === version.id;

  return (
    <div className="flex items-start gap-3 px-5 py-4">
      {/* Version number bubble */}
      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
        isCurrent
          ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
      }`}>
        v{version.versionNumber}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
            {version.fileName}
          </span>
          <StatusBadge status={version.status} />
          {isCurrent && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black">
              Current
            </span>
          )}
        </div>

        <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          {formatFileSize(version.fileSize)} · uploaded {timeAgo(version.createdAt)}
          {version.uploadedBy?.name ? ` by ${version.uploadedBy.name}` : ""}
        </p>

        {version.changeNote && (
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1 italic">
            &ldquo;{version.changeNote}&rdquo;
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={downloadUrl}
          download
          title="Download this version"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Download className="w-4 h-4" />
        </a>
        {isOwner && !isCurrent && (
          <button
            onClick={() => onRestore(version.id)}
            disabled={isRestoring}
            title="Restore this version"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isRestoring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
