"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useToast } from "@/components/toast-context";
import { ModuleGuard } from "@/components/ModuleGuard";
import { getAgField, updateAgField, deleteAgField, getSprayJobs } from "@/lib/api";
import type { AgFieldDto, SprayJobListItemDto } from "@/lib/types";
import { ArrowLeft, Loader2, Trash2, Save, Plus } from "lucide-react";

export function AgFieldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeClientId } = useAuth();
  const toast = useToast();
  const fieldId = Number(params.id);

  const [field, setField] = useState<AgFieldDto | null>(null);
  const [jobs, setJobs] = useState<SprayJobListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [growerName, setGrowerName] = useState("");
  const [growerContact, setGrowerContact] = useState("");
  const [acreage, setAcreage] = useState("");
  const [address, setAddress] = useState("");
  const [boundaryGeoJson, setBoundaryGeoJson] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!activeClientId || !fieldId) return;
    setLoading(true);
    try {
      const [f, j] = await Promise.all([
        getAgField(activeClientId, fieldId),
        getSprayJobs(activeClientId, { fieldId }),
      ]);
      setField(f);
      setJobs(j);
      // Populate form
      setName(f.name);
      setGrowerName(f.growerName ?? "");
      setGrowerContact(f.growerContact ?? "");
      setAcreage(f.acreage != null ? String(f.acreage) : "");
      setAddress(f.address ?? "");
      setBoundaryGeoJson(f.boundaryGeoJson ?? "");
      setNotes(f.notes ?? "");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load field");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClientId, fieldId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!activeClientId || !name.trim()) return;
    setSaving(true);
    try {
      await updateAgField(activeClientId, fieldId, {
        name: name.trim(),
        growerName: growerName.trim() || null,
        growerContact: growerContact.trim() || null,
        acreage: acreage ? Number(acreage) : null,
        address: address.trim() || null,
        boundaryGeoJson: boundaryGeoJson.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Field saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeClientId) return;
    setDeleting(true);
    try {
      await deleteAgField(activeClientId, fieldId);
      toast.success("Field deleted");
      router.push("/ag/fields");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete field");
      setDeleting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-200 " +
    "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors";

  const statusColors: Record<string, string> = {
    Scheduled: "bg-info/20 text-info",
    InProgress: "bg-warning/20 text-warning",
    Completed: "bg-success/20 text-success",
    Cancelled: "bg-slate-700/40 text-slate-400",
  };

  return (
    <ModuleGuard moduleId="ag_field_mapping" moduleName="Precision Ag Field Mapping">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back link */}
        <button
          onClick={() => router.push("/ag/fields")}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Fields
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-500" />
          </div>
        )}

        {/* Content */}
        {!loading && field && (
          <>
            {/* Field Edit Form */}
            <form onSubmit={handleSave}>
              <div className="rounded-xl bg-graphite border border-slate-line p-6 mb-8">
                <div className="flex items-center justify-between mb-5">
                  <h1 className="text-xl font-semibold text-steel-white">{field.name}</h1>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-critical/30 text-critical hover:bg-critical/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !name.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Name <span className="text-critical">*</span></label>
                    <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Acreage</label>
                    <input className={inputCls} type="number" step="0.01" value={acreage} onChange={e => setAcreage(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Grower Name</label>
                    <input className={inputCls} value={growerName} onChange={e => setGrowerName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Grower Contact</label>
                    <input className={inputCls} value={growerContact} onChange={e => setGrowerContact(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Address</label>
                    <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Boundary GeoJSON</label>
                    <textarea className={inputCls + " h-24 resize-y font-mono text-xs"} value={boundaryGeoJson} onChange={e => setBoundaryGeoJson(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Notes</label>
                    <textarea className={inputCls + " h-20 resize-y"} value={notes} onChange={e => setNotes(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                  <span>Created: {new Date(field.createdAt).toLocaleString()}</span>
                  <span>Updated: {new Date(field.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </form>

            {/* Spray Jobs Section */}
            <div className="rounded-xl bg-graphite border border-slate-line overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Spray Jobs for this Field
                  <span className="ml-2 text-slate-500 normal-case font-normal">({jobs.length})</span>
                </h2>
                <button
                  onClick={() => router.push(`/ag/jobs/new?fieldId=${fieldId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand text-white hover:bg-brand-hover transition-colors"
                >
                  <Plus size={14} />
                  New Spray Job
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No spray jobs linked to this field yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-left text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium">Job #</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Operator</th>
                      <th className="px-4 py-3 font-medium">Scheduled</th>
                      <th className="px-4 py-3 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40">
                    {jobs.map(job => (
                      <tr
                        key={job.id}
                        onClick={() => router.push(`/ag/jobs/${job.id}`)}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-200 font-medium">{job.jobNumber}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusColors[job.status] ?? "bg-slate-700/40 text-slate-400"}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{job.product ?? "\u2014"}</td>
                        <td className="px-4 py-3 text-slate-400">{job.droneOperator ?? "\u2014"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {job.completedDate ? new Date(job.completedDate).toLocaleDateString() : "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Delete Confirmation */}
            {confirmDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="rounded-xl bg-graphite border border-slate-line p-6 max-w-sm w-full mx-4 shadow-2xl">
                  <h3 className="text-lg font-semibold text-steel-white mb-2">Delete Field</h3>
                  <p className="text-sm text-slate-400 mb-5">
                    Are you sure you want to delete <strong className="text-slate-200">{field.name}</strong>?
                    This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-4 py-2 text-sm rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-critical text-white hover:bg-critical/80 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Not found */}
        {!loading && !field && (
          <div className="text-center py-20">
            <h2 className="text-lg font-semibold text-slate-300 mb-2">Field not found</h2>
            <p className="text-sm text-slate-500">This field may have been deleted or you don&apos;t have access.</p>
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}
