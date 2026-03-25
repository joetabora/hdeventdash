"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
} from "@/lib/events";
import {
  EventDocument,
  DocumentTag,
  DOCUMENT_TAGS,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

export function DocumentManager({
  eventId,
  documents,
  onUpdate,
}: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<DocumentTag>("other");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

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

  function handleView(doc: EventDocument) {
    const url = getDocumentUrl(supabase, doc.file_path);
    window.open(url, "_blank");
  }

  function handleDownload(doc: EventDocument) {
    const url = getDocumentUrl(supabase, doc.file_path);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const tagVariant: Record<DocumentTag, "default" | "info" | "warning" | "orange" | "success" | "danger"> = {
    contract: "info",
    invoice: "warning",
    flyer: "orange",
    photo: "success",
    receipt: "default",
    other: "default",
  };

  return (
    <div className="bg-harley-dark rounded-xl border border-harley-gray p-5">
      <h3 className="font-semibold text-harley-text mb-4">Documents</h3>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value as DocumentTag)}
          className="px-3 py-2 rounded-lg bg-harley-gray border border-harley-gray-lighter text-harley-text text-sm focus:outline-none focus:border-harley-orange"
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
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Upload File
        </Button>
      </div>

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
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleView(doc)}
                  className="p-1.5 text-harley-text-muted hover:text-harley-orange transition-colors"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 text-harley-text-muted hover:text-harley-orange transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 text-harley-text-muted hover:text-harley-danger transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
