"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  uploadMedia,
  deleteMedia,
  createSignedEventDocumentUrl,
  createSignedEventDocumentUrls,
} from "@/lib/events";
import {
  EVENT_FILE_UPLOAD_MAX_BYTES,
  EVENT_UPLOAD_ACCEPT_ATTR,
} from "@/lib/validation/upload-file";
import { EventMedia, MediaTag, MEDIA_TAGS } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Upload,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Film,
  FileText,
  X,
} from "lucide-react";

interface MediaGalleryProps {
  eventId: string;
  media: EventMedia[];
  onUpdate: () => void;
  canMutate?: boolean;
}

const tagVariant: Record<MediaTag, "muted" | "orange" | "success"> = {
  social_media: "muted",
  recap: "orange",
  marketing_asset: "success",
};

export function MediaGallery({
  eventId,
  media,
  onUpdate,
  canMutate = true,
}: MediaGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<MediaTag>("social_media");
  const [filterTag, setFilterTag] = useState<MediaTag | "all">("all");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");
  const [signedUrlByPath, setSignedUrlByPath] = useState<Record<string, string>>(
    {}
  );
  const [urlsLoading, setUrlsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    let cancelled = false;
    const paths = media.map((m) => m.file_path);
    if (paths.length === 0) {
      setSignedUrlByPath({});
      setUrlsLoading(false);
      return;
    }
    setUrlsLoading(true);
    void (async () => {
      const map = await createSignedEventDocumentUrls(supabase, paths);
      if (cancelled) return;
      const next: Record<string, string> = {};
      map.forEach((url, path) => {
        next[path] = url;
      });
      setSignedUrlByPath(next);
      setUrlsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [media, supabase]);

  const filteredMedia =
    filterTag === "all" ? media : media.filter((m) => m.tag === filterTag);

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
        await uploadMedia(supabase, eventId, file, selectedTag, email);
      }
      onUpdate();
    } catch (err) {
      console.error("Media upload failed:", err);
      window.alert(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(item: EventMedia) {
    if (!confirm(`Delete "${item.file_name}"?`)) return;
    try {
      await deleteMedia(supabase, item);
      onUpdate();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  async function openPreview(item: EventMedia) {
    const url = await createSignedEventDocumentUrl(supabase, item.file_path);
    if (url) {
      setPreviewUrl(url);
      setPreviewType(item.file_type);
    }
  }

  function isImage(fileType: string) {
    return (
      fileType.startsWith("image/") && fileType !== "image/svg+xml"
    );
  }

  function isVideo(fileType: string) {
    return fileType.startsWith("video/");
  }

  function isPdf(fileType: string) {
    return fileType === "application/pdf";
  }

  return (
    <Card className="!p-3.5 md:!p-5">
      <h3 className="font-semibold text-harley-text mb-4">Media</h3>

      {canMutate && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-4">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value as MediaTag)}
            className="px-3 py-2.5 md:py-2 rounded-lg bg-harley-gray-light/40 border border-harley-gray-lighter/50 text-harley-text text-sm focus:outline-none focus:border-harley-orange/70 focus:ring-1 focus:ring-harley-orange/20 transition-all duration-150"
          >
            {MEDIA_TAGS.map((tag) => (
              <option key={tag.value} value={tag.value}>
                {tag.label}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            accept={EVENT_UPLOAD_ACCEPT_ATTR}
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
            Upload Media
          </Button>
          <p className="text-[11px] text-harley-text-muted sm:ml-1">
            Images and PDF only, up to{" "}
            {Math.round(EVENT_FILE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB each.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      {media.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setFilterTag("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterTag === "all"
                ? "bg-harley-orange text-white"
                : "bg-harley-gray text-harley-text-muted hover:bg-harley-gray-light"
            }`}
          >
            All ({media.length})
          </button>
          {MEDIA_TAGS.map((tag) => {
            const count = media.filter((m) => m.tag === tag.value).length;
            if (count === 0) return null;
            return (
              <button
                type="button"
                key={tag.value}
                onClick={() => setFilterTag(tag.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterTag === tag.value
                    ? "bg-harley-orange text-white"
                    : "bg-harley-gray text-harley-text-muted hover:bg-harley-gray-light"
                }`}
              >
                {tag.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Gallery grid */}
      {filteredMedia.length === 0 ? (
        <p className="text-sm text-harley-text-muted py-4 text-center">
          {media.length === 0
            ? "No media uploaded yet"
            : "No media with this tag"}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
          {filteredMedia.map((item) => {
            const url = signedUrlByPath[item.file_path];
            return (
              <div
                key={item.id}
                className="group relative rounded-lg overflow-hidden border border-harley-gray bg-harley-gray/30 aspect-square"
              >
                {urlsLoading && !url ? (
                  <div className="w-full h-full flex items-center justify-center bg-harley-gray/40">
                    <Loader2 className="w-6 h-6 text-harley-text-muted animate-spin" />
                  </div>
                ) : isImage(item.file_type) && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={item.file_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => void openPreview(item)}
                  />
                ) : isImage(item.file_type) ? (
                  <div className="w-full h-full flex items-center justify-center bg-harley-gray/40">
                    <ImageIcon className="w-8 h-8 text-harley-text-muted" />
                  </div>
                ) : isPdf(item.file_type) && url ? (
                  <button
                    type="button"
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-harley-gray/50 p-2"
                    onClick={() => void openPreview(item)}
                  >
                    <FileText className="w-8 h-8 text-harley-orange mb-2 shrink-0" />
                    <span className="text-xs text-harley-text-muted text-center truncate max-w-full">
                      {item.file_name}
                    </span>
                  </button>
                ) : isVideo(item.file_type) ? (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer bg-harley-gray/50"
                    onClick={() => void openPreview(item)}
                  >
                    <Film className="w-8 h-8 text-harley-text-muted mb-2" />
                    <span className="text-xs text-harley-text-muted px-2 text-center truncate max-w-full">
                      {item.file_name}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-harley-text-muted" />
                  </div>
                )}

                {/* Overlay on hover (managers+: delete) */}
                <div
                  className={`absolute inset-0 bg-black/60 flex flex-col justify-between p-2 transition-opacity ${
                    canMutate
                      ? "md:opacity-0 md:group-hover:opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="flex justify-end">
                    {canMutate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                        className="p-1.5 rounded-lg bg-harley-danger/80 text-white hover:bg-harley-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Badge variant={tagVariant[item.tag]}>
                      {MEDIA_TAGS.find((t) => t.value === item.tag)?.label}
                    </Badge>
                    <p className="text-xs text-white/70 mt-1 truncate">
                      {item.file_name}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview lightbox */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-lg bg-harley-gray/80 text-white hover:bg-harley-gray transition-colors"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-4xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage(previewType) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : isPdf(previewType) ? (
              <iframe
                src={previewUrl}
                title="PDF preview"
                className="w-full min-h-[70vh] rounded-lg bg-harley-gray-light border border-harley-gray"
              />
            ) : isVideo(previewType) ? (
              <video
                src={previewUrl}
                controls
                autoPlay
                className="w-full max-h-[85vh] rounded-lg"
              />
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
