"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Palette, RefreshCw, Trash2, X } from "lucide-react";
import {
  adminDeleteClientLogo, adminGetClientBranding,
  adminUpdateClientBranding, adminUploadClientLogo,
} from "@/lib/api";
import { useBranding } from "@/components/branding-context";
import { useToast } from "@/components/toast-context";
import type { ClientBrandingDto } from "@/lib/types";

// ── Shared input style ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white " +
  "placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

// ── Component ──────────────────────────────────────────────────────────────────

export function ClientBrandingSection({
  clientId,
  activeClientId,
}: {
  clientId: number;
  activeClientId: number | null;
}) {
  const toast = useToast();
  const { reload: reloadBranding } = useBranding();

  const [branding, setBranding]             = useState<ClientBrandingDto | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingSaving, setBrandingSaving]   = useState(false);
  const [brandingSystemName, setBrandingSystemName] = useState("");
  const [brandingColor, setBrandingColor]     = useState("");
  const [brandingLinkColor, setBrandingLinkColor] = useState("");
  const [logoUploading, setLogoUploading]     = useState(false);
  const [logoDeleting, setLogoDeleting]       = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBrandingLoading(true);
    adminGetClientBranding(clientId)
      .then(b => {
        setBranding(b);
        setBrandingSystemName(b.systemName ?? "");
        setBrandingColor(b.primaryColor ?? "");
        setBrandingLinkColor(b.linkColor ?? "");
      })
      .catch(() => setBranding(null))
      .finally(() => setBrandingLoading(false));
  }, [clientId]);

  async function handleSaveBranding() {
    setBrandingSaving(true);
    try {
      await adminUpdateClientBranding(clientId, {
        systemName: brandingSystemName.trim() || null,
        primaryColor: brandingColor || null,
        linkColor: brandingLinkColor || null,
      });
      setBranding(prev => prev
        ? { ...prev, systemName: brandingSystemName.trim() || null, primaryColor: brandingColor || null, linkColor: brandingLinkColor || null }
        : { systemName: brandingSystemName.trim() || null, primaryColor: brandingColor || null, linkColor: brandingLinkColor || null, logoUrl: null }
      );
      if (clientId === activeClientId) reloadBranding();
      toast.success("Branding saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  async function handleRemoveBranding() {
    setBrandingSaving(true);
    try {
      await adminUpdateClientBranding(clientId, { systemName: null, primaryColor: null, linkColor: null });
      if (branding?.logoUrl) await adminDeleteClientLogo(clientId);
      setBranding(prev => prev ? { ...prev, systemName: null, primaryColor: null, linkColor: null, logoUrl: null } : null);
      setBrandingSystemName("");
      setBrandingColor("");
      setBrandingLinkColor("");
      if (clientId === activeClientId) reloadBranding();
      toast.success("Branding cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB."); return; }
    setLogoUploading(true);
    try {
      const result = await adminUploadClientLogo(clientId, file);
      setBranding(prev => prev ? { ...prev, logoUrl: result.logoUrl } : result);
      if (clientId === activeClientId) reloadBranding();
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleDeleteLogo() {
    setLogoDeleting(true);
    try {
      await adminDeleteClientLogo(clientId);
      setBranding(prev => prev ? { ...prev, logoUrl: null } : null);
      if (clientId === activeClientId) reloadBranding();
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo.");
    } finally {
      setLogoDeleting(false);
    }
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <Palette size={15} className="text-slate-500" />
        <div>
          <h2 className="text-sm font-semibold text-white">Branding</h2>
          <p className="text-xs text-slate-500 mt-0.5">Custom logo, system name, and accent color for this client.</p>
        </div>
      </div>
      {brandingLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin text-slate-600" />
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Logo */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Logo</p>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {branding?.logoUrl
                  ? <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  : <ImageIcon size={24} className="text-slate-600" />
                }
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-xs font-medium transition disabled:opacity-60"
                >
                  {logoUploading
                    ? <><RefreshCw size={12} className="animate-spin" /> Uploading…</>
                    : <><ImageIcon size={12} /> {branding?.logoUrl ? "Replace Logo" : "Upload Logo"}</>
                  }
                </button>
                {branding?.logoUrl && (
                  <button
                    onClick={handleDeleteLogo}
                    disabled={logoDeleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-800/60 hover:bg-red-950/20 text-xs font-medium transition disabled:opacity-60"
                  >
                    {logoDeleting
                      ? <><RefreshCw size={12} className="animate-spin" /> Removing…</>
                      : <><Trash2 size={12} /> Remove Logo</>
                    }
                  </button>
                )}
                <p className="text-[11px] text-slate-600">PNG, JPEG, WebP or SVG · max 2 MB</p>
              </div>
            </div>
          </div>

          {/* System name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">System Name</label>
            <input
              value={brandingSystemName}
              onChange={e => setBrandingSystemName(e.target.value)}
              placeholder="e.g. Acme Safety Hub"
              maxLength={100}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-slate-600">Replaces &quot;IMPERAOPS&quot; in the navigation sidebar.</p>
          </div>

          {/* Primary color */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandingColor || "#2F80ED"}
                onChange={e => {
                  setBrandingColor(e.target.value);
                  document.documentElement.style.setProperty("--color-brand", e.target.value);
                }}
                className="h-9 w-14 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
              />
              <input
                value={brandingColor}
                onChange={e => {
                  setBrandingColor(e.target.value);
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value))
                    document.documentElement.style.setProperty("--color-brand", e.target.value);
                }}
                placeholder="#2F80ED"
                maxLength={7}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition font-mono"
              />
              {brandingColor && (
                <button
                  onClick={() => {
                    setBrandingColor("");
                    document.documentElement.style.removeProperty("--color-brand");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                  title="Reset to default"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-600">Used for buttons, active states, and background highlights.</p>
          </div>

          {/* Link color */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Link / Text Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandingLinkColor || brandingColor || "#2F80ED"}
                onChange={e => {
                  setBrandingLinkColor(e.target.value);
                  document.documentElement.style.setProperty("--color-brand-link", e.target.value);
                }}
                className="h-9 w-14 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
              />
              <input
                value={brandingLinkColor}
                onChange={e => {
                  setBrandingLinkColor(e.target.value);
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value))
                    document.documentElement.style.setProperty("--color-brand-link", e.target.value);
                }}
                placeholder={brandingColor || "#2F80ED"}
                maxLength={7}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition font-mono"
              />
              {brandingLinkColor && (
                <button
                  onClick={() => {
                    setBrandingLinkColor("");
                    document.documentElement.style.setProperty("--color-brand-link", brandingColor || "#2F80ED");
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition"
                  title="Reset to accent color"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-600">Used for hyperlinks and text on light backgrounds. Leave blank to match the accent color.</p>
          </div>

          {/* Live preview */}
          <div className="rounded-lg bg-white border border-slate-700 px-4 py-3 flex items-center gap-5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide shrink-0">Preview</span>
            <span className="text-sm font-medium text-brand-link">Hyperlink text →</span>
            <span className="text-sm font-medium text-slate-700">Normal text</span>
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold text-brand-text bg-brand">Button</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleRemoveBranding}
              disabled={brandingSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 text-sm font-semibold transition"
            >
              {brandingSaving ? <><RefreshCw size={13} className="animate-spin" /> Clearing…</> : "Remove Branding"}
            </button>
            <button
              onClick={handleSaveBranding}
              disabled={brandingSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-brand-text text-sm font-semibold transition"
            >
              {brandingSaving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : "Save Branding"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
