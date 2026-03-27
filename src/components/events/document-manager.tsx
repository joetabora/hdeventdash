"use client";

import { useState, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  uploadDocument,
  deleteDocument,
  createSignedEventDocumentUrl,
  EVENT_DOCUMENTS_SIGNED_URL_TTL_SECONDS,
} from "@/lib/events";
import {
  EventDocument,
  DocumentTag,
  DOCUMENT_TAGS,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";

interface DocumentManagerProps {
  eventId: string;
  documents: EventDocument[];
  onUpdate: () => void;
  /** Staff: view/download only */
  canMutate?: boolean;
}

export function DocumentManager({
  eventId,
  documents,
  onUpdate,
  canMutate = true,
}: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<DocumentTag>("other");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseBrowserClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email || "unknown";

      for (const file of Array.from(files)) {
        await uploadDocument(supabase, eventId, file, selectedTag, email);
      }
      onUpdate();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(doc: EventDocument) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    try {
      await deleteDocument(supabase, doc);
      onUpdate();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function handleView(doc: EventDocument) {
    const url = await createSignedEventDocumentUrl(supabase, doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDownload(doc: EventDocument) {
    const url = await createSignedEventDocumentUrl(
      supabase,
      doc.file_path,
      EVENT_DOCUMENTS_SIGNED_URL_TTL_SECONDS,
      { download: doc.file_name }
    );
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.rel = "noopener noreferrer";
    a.click();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const tagVariant: Record<DocumentTag, "default" | "muted" | "warning" | "orange" | "success" | "danger"> = {
    contract: "muted",
    invoice: "warning",
    flyer: "orange",
    photo: "success",
    receipt: "default",
    other: "default",
  };

  return (
    <Card className="!p-3.5 md:!p-5">
      <h3 className="font-semibold text-harley-text mb-4">Documents</h3>

      {canMutate && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value as DocumentTag)}
            className="px-3 py-2.5 md:py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
          >
            {DOCUMENT_TAGS.map((tag) => (
              <option key={tag.value} value={tag.value}>
                {tag.label}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            multiple
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="!py-2.5 md:!py-1.5"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload File
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-harley-text-muted py-4 text-center">
          No documents uploaded yet
        </p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-harley-gray/50 hover:bg-harley-gray transition-colors group"
            >
              <FileText className="w-5 h-5 text-harley-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-harley-text truncate">
                  {doc.file_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={tagVariant[doc.tag]}>{doc.tag}</Badge>
                  <span className="text-xs text-harley-text-muted">
                    {formatSize(doc.file_size)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => void handleView(doc)}
                  className="p-2 md:p-1.5 text-harley-text-muted hover:text-harley-orange transition-colors rounded-md"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownload(doc)}
                  className="p-2 md:p-1.5 text-harley-text-muted hover:text-harley-orange transition-colors rounded-md"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                {canMutate && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="p-2 md:p-1.5 text-harley-text-muted hover:text-harley-danger transition-colors rounded-md"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
