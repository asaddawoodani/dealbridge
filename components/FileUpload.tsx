"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Download, Trash2, FileText, Loader2 } from "lucide-react";

const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const LABELS = [
  "Pitch Deck",
  "Financial Statements",
  "Business Plan",
  "Legal Documents",
  "Other",
] as const;

export type QueuedFile = {
  id: string;
  file: File;
  label: string;
};

export type UploadedDoc = {
  id: string;
  file_name: string;
  file_type: string;
  file_label: string;
  file_size: number;
  storage_path: string;
  created_at: string;
};

type Props = {
  dealId?: string;
  existingDocuments?: UploadedDoc[];
  onQueueChange?: (files: QueuedFile[]) => void;
  onDocumentsChange?: (docs: UploadedDoc[]) => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `File type .${ext} is not allowed.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name} exceeds 10 MB limit.`;
  }
  return null;
}

export default function FileUpload({
  dealId,
  existingDocuments = [],
  onQueueChange,
  onDocumentsChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const isImmediate = !!dealId;

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const arr = Array.from(files);
      const valid: QueuedFile[] = [];

      for (const file of arr) {
        const err = validateFile(file);
        if (err) {
          setError(err);
          continue;
        }
        valid.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          label: "Other",
        });
      }

      if (isImmediate) {
        // Upload immediately
        for (const qf of valid) {
          uploadFile(qf);
        }
      } else {
        const next = [...queue, ...valid];
        setQueue(next);
        onQueueChange?.(next);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dealId, queue, onQueueChange]
  );

  const uploadFile = async (qf: QueuedFile) => {
    if (!dealId) return;
    setUploading((prev) => new Set(prev).add(qf.id));

    const fd = new FormData();
    fd.append("file", qf.file);
    fd.append("file_label", qf.label);

    try {
      const res = await fetch(`/api/deals/${dealId}/documents`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.document) {
        const updated = [...existingDocuments, json.document];
        onDocumentsChange?.(updated);
      } else {
        setError(json?.error ?? "Upload failed");
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading((prev) => {
        const next = new Set(prev);
        next.delete(qf.id);
        return next;
      });
    }
  };

  const removeQueued = (id: string) => {
    const next = queue.filter((q) => q.id !== id);
    setQueue(next);
    onQueueChange?.(next);
  };

  const updateQueueLabel = (id: string, label: string) => {
    const next = queue.map((q) => (q.id === id ? { ...q, label } : q));
    setQueue(next);
    onQueueChange?.(next);
  };

  const deleteDoc = async (doc: UploadedDoc) => {
    if (!dealId) return;
    const res = await fetch(
      `/api/deals/${dealId}/documents/${doc.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const updated = existingDocuments.filter((d) => d.id !== doc.id);
      onDocumentsChange?.(updated);
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Delete failed");
    }
  };

  const downloadDoc = async (doc: UploadedDoc) => {
    if (!dealId) return;
    const res = await fetch(
      `/api/deals/${dealId}/documents/${doc.id}/download`
    );
    const json = await res.json().catch(() => null);
    if (json?.url) {
      window.open(json.url, "_blank");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-sm text-[--text-secondary]">Documents</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-teal-500 bg-teal-500/5"
            : "border-[--border] hover:border-[--border-hover]",
        ].join(" ")}
      >
        <Upload className="h-8 w-8 mx-auto text-[--text-muted] mb-2" />
        <p className="text-sm text-[--text-secondary]">
          Drag & drop or click to browse
        </p>
        <p className="text-xs text-[--text-muted] mt-1">
          PDF, DOCX, XLSX, PPTX, PNG, JPG — max 10 MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            addFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Queued files (queue mode) */}
      {!isImmediate && queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((qf) => (
            <div
              key={qf.id}
              className="flex items-center gap-3 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3"
            >
              <FileText className="h-4 w-4 text-teal-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{qf.file.name}</p>
                <p className="text-xs text-[--text-muted]">
                  {formatSize(qf.file.size)}
                </p>
              </div>
              <select
                value={qf.label}
                onChange={(e) => updateQueueLabel(qf.id, e.target.value)}
                className="text-xs rounded-lg bg-[--bg-card] border border-[--border] px-2 py-1.5 text-[--text-primary]"
              >
                {LABELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeQueued(qf.id)}
                className="text-[--text-muted] hover:text-red-400 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploading indicators (immediate mode) */}
      {uploading.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-[--text-muted]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      )}

      {/* Uploaded documents */}
      {existingDocuments.length > 0 && (
        <div className="space-y-2">
          {existingDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3"
            >
              <FileText className="h-4 w-4 text-teal-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{doc.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400">
                    {doc.file_label}
                  </span>
                  <span className="text-xs text-[--text-muted]">
                    {formatSize(doc.file_size)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => downloadDoc(doc)}
                className="text-[--text-muted] hover:text-teal-400 transition"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteDoc(doc)}
                className="text-[--text-muted] hover:text-red-400 transition"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
