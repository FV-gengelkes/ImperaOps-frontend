"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, File, FileImage, FileText, Loader2, Paperclip, Trash2, X } from "lucide-react";
import {
  deleteAttachment,
  getAttachmentUrl,
  getAttachments,
  uploadAttachment,
} from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import type { AttachmentDto } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// ── Helpers ───────────────────────────────────────────────────────────────────

function isImage(contentType: string) {
  return contentType.startsWith("image/");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function FileIcon({ contentType }: { contentType: string }) {
  if (isImage(contentType))
    return <FileImage size={16} className="text-brand shrink-0" />;
  if (contentType === "application/pdf" || contentType.includes("word") || contentType.includes("text"))
    return <FileText size={16} className="text-slate-400 shrink-0" />;
  return <File size={16} className="text-slate-400 shrink-0" />;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function ImageLightbox({
  url,
  fileName,
  onClose,
}: {
  url: string;
  fileName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-w-[92vw] max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-slate-900/90 rounded-t-xl">
          <span className="text-sm text-slate-200 truncate max-w-[60vw]">{fileName}</span>
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={url}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download size={15} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="object-contain rounded-b-xl max-w-[92vw] max-h-[calc(92vh-44px)]"
        />
      </div>
    </div>
  );
}

// ── Attachment row ─────────────────────────────────────────────────────────────

function AttachmentRow({
  attachment,
  publicId,
  canDelete,
  onDeleted,
  onPreview,
  thumbnailUrl,
}: {
  attachment: AttachmentDto;
  publicId: string;
  canDelete: boolean;
  onDeleted: (id: number) => void;
  onPreview: (attachment: AttachmentDto) => void;
  thumbnailUrl?: string;
}) {
  const toast = useToast();
  const [actioning, setActioning] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const image = isImage(attachment.contentType);

  async function handlePrimaryAction() {
    setActioning(true);
    try {
      if (image) {
        onPreview(attachment);
      } else {
        const { url } = await getAttachmentUrl(publicId, attachment.id);
        window.open(url, "_blank");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open file.");
    } finally {
      setActioning(false);
    }
  }

  async function handleDownload() {
    setActioning(true);
    try {
      const { url } = await getAttachmentUrl(publicId, attachment.id);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to get download link.");
    } finally {
      setActioning(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${attachment.fileName}"?`)) return;
    setDeleting(true);
    try {
      await deleteAttachment(publicId, attachment.id);
      onDeleted(attachment.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete attachment.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-3">
      {image ? (
        thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={attachment.fileName}
            onClick={() => onPreview(attachment)}
            className="w-14 h-14 shrink-0 object-cover rounded-lg cursor-pointer border border-slate-200 hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-14 h-14 shrink-0 animate-pulse bg-slate-100 rounded-lg" />
        )
      ) : (
        <div className="w-14 shrink-0 flex items-center justify-center">
          <button
            onClick={handlePrimaryAction}
            disabled={actioning}
            className="disabled:opacity-40"
            title="Open file"
          >
            <FileIcon contentType={attachment.contentType} />
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <button
          onClick={handlePrimaryAction}
          disabled={actioning}
          className="text-left w-full bg-transparent disabled:opacity-40"
        >
          <p className="text-sm font-medium text-slate-800 truncate hover:text-brand-link transition-colors">
            {attachment.fileName}
          </p>
        </button>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatSize(attachment.fileSizeBytes)}
          {" · "}
          {attachment.uploadedByDisplayName}
          {" · "}
          {timeAgo(attachment.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {image ? (
          <button
            onClick={handlePrimaryAction}
            disabled={actioning}
            className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors disabled:opacity-40"
            title="Preview"
          >
            {actioning ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          </button>
        ) : (
          <button
            onClick={handleDownload}
            disabled={actioning}
            className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors disabled:opacity-40"
            title="Download"
          >
            {actioning ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
        )}
        {image && (
          <button
            onClick={handleDownload}
            disabled={actioning}
            className="p-1.5 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors disabled:opacity-40"
            title="Download"
          >
            <Download size={14} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
            title="Delete"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function AttachmentsCard({ publicId }: { publicId: string }) {
  const { user, isSuperAdmin } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments]     = useState<AttachmentDto[]>([]);
  const [loading, setLoading]             = useState(true);
  const [uploading, setUploading]         = useState(false);
  const [uploadingName, setUploadingName] = useState("");
  const [uploadError, setUploadError]     = useState("");

  const [lightboxUrl, setLightboxUrl]   = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState("");
  const [previewing, setPreviewing]     = useState<number | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    setLoading(true);
    setThumbnailUrls({});
    getAttachments(publicId)
      .then(list => {
        setAttachments(list);
        // Fetch thumbnail URLs for all image attachments in parallel
        const imageAttachments = list.filter(a => isImage(a.contentType));
        Promise.allSettled(
          imageAttachments.map(a =>
            getAttachmentUrl(publicId, a.id).then(({ url }) => ({ id: a.id, url }))
          )
        ).then(results => {
          const urls: Record<number, string> = {};
          for (const r of results) {
            if (r.status === "fulfilled") urls[r.value.id] = r.value.url;
          }
          setThumbnailUrls(urls);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [publicId]);

  async function handlePreview(attachment: AttachmentDto) {
    const cached = thumbnailUrls[attachment.id];
    if (cached) {
      setLightboxName(attachment.fileName);
      setLightboxUrl(cached);
      return;
    }
    setPreviewing(attachment.id);
    try {
      const { url } = await getAttachmentUrl(publicId, attachment.id);
      setLightboxName(attachment.fileName);
      setLightboxUrl(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load image.");
    } finally {
      setPreviewing(null);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target) return;
    e.target.value = "";
    if (!file) return;

    setUploadError("");

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setUploadError(`File type "${file.type || file.name.split(".").pop()}" is not allowed.`);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File exceeds the 25 MB limit (${formatSize(file.size)}).`);
      return;
    }

    setUploading(true);
    setUploadingName(file.name);
    try {
      const attachment = await uploadAttachment(publicId, file);
      setAttachments(prev => [attachment, ...prev]);
      if (isImage(attachment.contentType)) {
        getAttachmentUrl(publicId, attachment.id)
          .then(({ url }) => setThumbnailUrls(prev => ({ ...prev, [attachment.id]: url })))
          .catch(() => {});
      }
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
      setUploadingName("");
    }
  }

  return (
    <>
      {lightboxUrl && (
        <ImageLightbox
          url={lightboxUrl}
          fileName={lightboxName}
          onClose={() => setLightboxUrl(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Paperclip size={15} className="text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Attachments</h2>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload File"
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={[...ALLOWED_MIME_TYPES].join(",")}
            onChange={handleFileSelected}
          />
        </div>

        {uploading && uploadingName && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-brand/5 border border-brand/10">
            <Loader2 size={13} className="animate-spin text-brand shrink-0" />
            <p className="text-xs text-brand truncate">Uploading {uploadingName}…</p>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-red-500 mb-3">{uploadError}</p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="h-4 w-4 rounded bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-slate-400 py-2">No attachments yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {attachments.map(a => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                publicId={publicId}
                canDelete={isSuperAdmin || (!!user?.id && a.uploadedByUserId !== null && String(a.uploadedByUserId) === user.id)}
                onDeleted={id => setAttachments(prev => prev.filter(x => x.id !== id))}
                onPreview={handlePreview}
                thumbnailUrl={thumbnailUrls[a.id]}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
