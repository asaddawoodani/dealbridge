"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Download,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

type Doc = {
  id: string;
  file_name: string;
  file_type: string;
  file_label: string;
  file_size: number;
  created_at: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DealDocuments({
  dealId,
  verificationStatus,
  userRole,
}: {
  dealId: string;
  verificationStatus: string | null;
  userRole: string | null;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPrivileged =
    userRole === "admin" || userRole === "operator";
  const isVerified = verificationStatus === "verified";
  const canAccess = isPrivileged || isVerified;

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/deals/${dealId}/documents`);
        const json = await res.json().catch(() => null);
        if (res.ok && json?.documents) {
          setDocs(json.documents);
        } else if (res.status === 403) {
          // User doesn't have access — show gate
          setError("forbidden");
        }
      } catch {
        setError("Failed to load documents");
      } finally {
        setLoading(false);
      }
    })();
  }, [dealId, canAccess]);

  const downloadDoc = async (doc: Doc) => {
    const res = await fetch(
      `/api/deals/${dealId}/documents/${doc.id}/download`
    );
    const json = await res.json().catch(() => null);
    if (json?.url) {
      window.open(json.url, "_blank");
    }
  };

  // Verification gate
  if (!canAccess && error !== "forbidden") {
    return (
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">
              Verify to access documents
            </h3>
            <p className="text-sm text-[--text-secondary] mt-1">
              Deal documents are available to verified investors. Complete
              verification to view and download files.
            </p>
            <Link
              href="/investor/verify"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-amber-400 hover:text-amber-300 transition"
            >
              Get verified
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-[--border] bg-[--bg-input] p-6">
        <div className="flex items-center gap-2 text-[--text-muted]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading documents...</span>
        </div>
      </section>
    );
  }

  if (error && error !== "forbidden") {
    return null;
  }

  return (
    <section className="rounded-xl border border-[--border] bg-[--bg-input] p-6">
      <div className="text-sm font-semibold flex items-center gap-1.5 mb-4">
        <FileText className="h-4 w-4 text-teal-400" />
        Documents
      </div>

      {docs.length === 0 ? (
        <p className="text-sm text-[--text-muted]">No documents available.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-[--border] bg-[--bg-card] px-4 py-3"
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
                onClick={() => downloadDoc(doc)}
                className="text-[--text-muted] hover:text-teal-400 transition"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
