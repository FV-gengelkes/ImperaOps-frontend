"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { ModuleGuard } from "@/components/ModuleGuard";
import { getAgFields, createAgField } from "@/lib/api";
import type { AgFieldListItemDto } from "@/lib/types";
import { Plus, ChevronDown, ChevronUp, Loader2, MapPin } from "lucide-react";

// ── Inline Create Form ───────────────────────────────────────────────────────

function CreateFieldForm({ onCreated, onCancel, clientId }: {
  onCreated: () => void;
  onCancel: () => void;
  clientId: number;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [growerName, setGrowerName] = useState("");
  const [growerContact, setGrowerContact] = useState("");
  const [acreage, setAcreage] = useState("");
  const [address, setAddress] = useState("");
  const [boundaryGeoJson, setBoundaryGeoJson] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createAgField(clientId, {
        name: name.trim(),
        growerName: growerName.trim() || null,
        growerContact: growerContact.trim() || null,
        acreage: acreage ? Number(acreage) : null,
        address: address.trim() || null,
        boundaryGeoJson: boundaryGeoJson.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Field created");
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create field");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 " +
    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-graphite border border-slate-line p-5 mb-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">New Field</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Name <span className="text-critical">*</span></label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Field name" required />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Acreage</label>
          <input className={inputCls} type="number" step="0.01" value={acreage} onChange={e => setAcreage(e.target.value)} placeholder="e.g. 120.5" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Grower Name</label>
          <input className={inputCls} value={growerName} onChange={e => setGrowerName(e.target.value)} placeholder="Grower name" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Grower Contact</label>
          <input className={inputCls} value={growerContact} onChange={e => setGrowerContact(e.target.value)} placeholder="Phone or email" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Address</label>
          <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="Field address" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Boundary GeoJSON</label>
          <textarea className={inputCls + " h-20 resize-y"} value={boundaryGeoJson} onChange={e => setBoundaryGeoJson(e.target.value)} placeholder='{"type":"Polygon","coordinates":...}' />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Notes</label>
          <textarea className={inputCls + " h-20 resize-y"} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : "Create Field"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main List Page ───────────────────────────────────────────────────────────

export function AgFieldsListPage() {
  const router = useRouter();
  const { activeClientId } = useAuth();
  const toast = useToast();

  const [fields, setFields] = useState<AgFieldListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchFields = useCallback(async () => {
    if (!activeClientId) return;
    setLoading(true);
    try {
      const data = await getAgFields(activeClientId);
      setFields(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load fields");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClientId]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  function handleCreated() {
    setShowCreate(false);
    fetchFields();
  }

  return (
    <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-steel-white">Fields</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your agricultural fields and boundaries.</p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
          >
            {showCreate ? <ChevronUp size={16} /> : <Plus size={16} />}
            New Field
          </button>
        </div>

        {/* Inline Create Form */}
        {showCreate && (
          <CreateFieldForm
            clientId={activeClientId}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-4">
              <MapPin size={24} className="text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-300 mb-2">No fields yet</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Create your first field to start tracking acreage, growers, and spray jobs.
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && fields.length > 0 && (
          <div className="rounded-xl bg-graphite border border-slate-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Grower</th>
                  <th className="px-4 py-3 font-medium">Acreage</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Jobs</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {fields.map(field => (
                  <tr
                    key={field.id}
                    onClick={() => router.push(`/ag/fields/${field.id}`)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-200 font-medium">{field.name}</td>
                    <td className="px-4 py-3 text-slate-400">{field.growerName ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-400">{field.acreage != null ? field.acreage.toLocaleString() : "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{field.address ?? "\u2014"}</td>
                    <td className="px-4 py-3 text-slate-400">{field.sprayJobCount}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(field.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}
