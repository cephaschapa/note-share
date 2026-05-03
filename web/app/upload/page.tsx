"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  Globe,
  Upload,
  X,
} from "lucide-react";
import { api, parseApiError, type ApiFieldErrors } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXTENSIONS = ".pdf,.doc,.docx,.txt";
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// ── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");

  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    changeNote: "",
    visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
  });
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("note_share_token")) {
      router.replace("/login");
    }
  }, [router]);

  // ── File handling ───────────────────────────────────────────────────
  function validateAndSetFile(f: File) {
    setFileError("");
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      setFileError("Only PDF, DOC, DOCX, and TXT files are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large. Maximum size is 25 MB (this file is ${formatFileSize(f.size)}).`);
      return;
    }
    setFile(f);
    // Pre-fill title from filename if empty
    setForm((prev) =>
      prev.title ? prev : { ...prev, title: f.name.replace(/\.[^.]+$/, "") }
    );
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
    e.target.value = "";
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit ──────────────────────────────────────────────────────────
  function validate(): ApiFieldErrors {
    const errors: ApiFieldErrors = {};
    if (!file) errors.file = ["A file is required"];
    if (!form.title.trim()) errors.title = ["Title is required"];
    if (!form.subject.trim()) errors.subject = ["Subject is required"];
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setServerError("");
    setLoading(true);

    try {
      const body = new FormData();
      body.append("file", file!);
      body.append("title", form.title.trim());
      body.append("subject", form.subject.trim());
      body.append("visibility", form.visibility);
      if (form.description.trim()) body.append("description", form.description.trim());
      if (form.changeNote.trim()) body.append("changeNote", form.changeNote.trim());

      const { data } = await api.post<{ result: { note: { id: string } } }>(
        "/notes",
        body,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setSuccess(true);
      setTimeout(() => router.push(`/notes/${data.result.note.id}`), 1200);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.type === "field") {
        setFieldErrors(parsed.errors);
      } else {
        setServerError(parsed.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ───────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={1.5} />
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Note uploaded!
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Redirecting to your note…
          </p>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Upload a note
        </h1>
        <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1">
          Share your notes with the community. PDF, DOC, DOCX, and TXT — up to 25 MB.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* ── Drop zone ── */}
        <div>
          {file ? (
            <SelectedFile
              file={file}
              onRemove={() => { setFile(null); setFileError(""); }}
            />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition-colors text-center cursor-pointer ${
                dragOver
                  ? "border-zinc-500 bg-zinc-50 dark:bg-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Upload className="w-6 h-6 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-[15px] font-medium text-zinc-700 dark:text-zinc-300">
                  {dragOver ? "Drop it here" : "Drag & drop or click to browse"}
                </p>
                <p className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  PDF, DOC, DOCX, TXT · max 25 MB
                </p>
              </div>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS}
            onChange={onFileInput}
            className="hidden"
          />
          {fileError && (
            <p className="mt-2 text-[12px] text-red-500 dark:text-red-400">{fileError}</p>
          )}
          {fieldErrors.file?.[0] && !fileError && (
            <p className="mt-2 text-[12px] text-red-500 dark:text-red-400">{fieldErrors.file[0]}</p>
          )}
        </div>

        {/* ── Title ── */}
        <Field label="Title" error={fieldErrors.title?.[0]} required>
          <input
            type="text"
            placeholder="e.g. Introduction to Linear Algebra"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className={inputClass(!!fieldErrors.title)}
          />
        </Field>

        {/* ── Subject ── */}
        <Field label="Subject" error={fieldErrors.subject?.[0]} required>
          <input
            type="text"
            placeholder="e.g. Mathematics, Physics, Computer Science"
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            className={inputClass(!!fieldErrors.subject)}
          />
        </Field>

        {/* ── Description ── */}
        <Field label="Description" hint="Optional">
          <textarea
            rows={3}
            placeholder="What's this note about? Topics covered, chapter, etc."
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className={inputClass(false) + " resize-none"}
          />
        </Field>

        {/* ── Change note ── */}
        <Field label="Change note" hint="Optional — describe what's new in this version">
          <input
            type="text"
            placeholder="e.g. Added chapter 4 summary"
            value={form.changeNote}
            onChange={(e) => setForm((p) => ({ ...p, changeNote: e.target.value }))}
            className={inputClass(false)}
          />
        </Field>

        {/* ── Visibility ── */}
        <div>
          <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Visibility
          </p>
          <div className="flex gap-3">
            {(["PUBLIC", "PRIVATE"] as const).map((v) => {
              const active = form.visibility === v;
              const Icon = v === "PUBLIC" ? Globe : Lock;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, visibility: v }))}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[14px] font-medium transition-colors ${
                    active
                      ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-white text-white dark:text-black"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {v === "PUBLIC" ? "Public" : "Private"}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[12px] text-zinc-400 dark:text-zinc-500">
            {form.visibility === "PUBLIC"
              ? "Anyone can discover and view this note."
              : "Only you can see this note."}
          </p>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload note
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectedFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  const extColors: Record<string, string> = {
    PDF: "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400",
    DOC: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    DOCX: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    TXT: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-zinc-400" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-50 truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${extColors[ext] ?? extColors.TXT}`}>
            {ext}
          </span>
          <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
            {formatFileSize(file.size)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Remove file"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && (
          <span className="text-[12px] text-zinc-400 dark:text-zinc-500">{hint}</span>
        )}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-[12px] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return [
    "w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-zinc-950",
    "text-[15px] text-zinc-900 dark:text-zinc-50",
    "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
    "outline-none transition-colors",
    "focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10",
    hasError
      ? "border-red-400 dark:border-red-600"
      : "border-zinc-300 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-500",
  ].join(" ");
}
