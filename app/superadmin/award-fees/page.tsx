"use client";

import { useEffect, useState } from "react";
import { Search, Save, RotateCcw, X } from "lucide-react";
import toast from "react-hot-toast";

/* ─── helpers ─────────────────────────────────────────────── */

const PALETTE = [
  { bg: "bg-violet-50", text: "text-violet-700" },
  { bg: "bg-blue-50",   text: "text-blue-700"   },
  { bg: "bg-emerald-50",text: "text-emerald-700" },
  { bg: "bg-amber-50",  text: "text-amber-700"   },
  { bg: "bg-rose-50",   text: "text-rose-700"    },
  { bg: "bg-cyan-50",   text: "text-cyan-700"    },
  { bg: "bg-indigo-50", text: "text-indigo-700"  },
  { bg: "bg-orange-50", text: "text-orange-700"  },
];
function awardPal(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

const STATUS_CFG: Record<string, { dot: string; text: string; label: string }> = {
  draft:     { dot: "bg-gray-300",   text: "text-gray-500",   label: "Draft"     },
  active:    { dot: "bg-green-500",  text: "text-green-700",  label: "Active"    },
  voting:    { dot: "bg-blue-400",   text: "text-blue-700",   label: "Voting"    },
  completed: { dot: "bg-violet-400", text: "text-violet-700", label: "Completed" },
  cancelled: { dot: "bg-red-400",    text: "text-red-600",    label: "Cancelled" },
};

/* ─── types ───────────────────────────────────────────────── */

interface AwardFee {
  _id: string;
  name: string;
  code: string;
  organizationId: string;
  organizationName: string;
  status: string;
  awardServiceFeePercentage: number | null;
  orgServiceFeePercentage: number;
}

/* ─── skeleton ────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-7 w-32 bg-gray-100 rounded-lg" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-11 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="h-11 bg-gray-50 border-b border-gray-50" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-44 bg-gray-100 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-14 bg-gray-100 rounded" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg" />
            <div className="h-7 w-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

export default function AwardFeesPage() {
  const [awards, setAwards]         = useState<AwardFee[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [editingFees, setEditingFees] = useState<Record<string, string>>({});
  const [saving, setSaving]         = useState<Record<string, boolean>>({});

  useEffect(() => { fetchAwards(); }, []);

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/superadmin/award-fees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAwards(data.data || []);
      } else {
        toast.error("Failed to fetch awards");
      }
    } catch {
      toast.error("Failed to fetch awards");
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? awards.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.code.toLowerCase().includes(search.toLowerCase()) ||
          a.organizationName.toLowerCase().includes(search.toLowerCase())
      )
    : awards;

  const updateFee = async (awardId: string) => {
    const raw = editingFees[awardId];
    // empty string means reset to null (org default)
    const feeValue = raw.trim() === "" ? null : parseFloat(raw);
    if (feeValue !== null && (isNaN(feeValue) || feeValue < 0 || feeValue > 100)) {
      toast.error("Fee must be 0 – 100");
      return;
    }
    setSaving((p) => ({ ...p, [awardId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/award-fees/${awardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ awardServiceFeePercentage: feeValue }),
      });
      if (res.ok) {
        toast.success(feeValue === null ? "Reset to org default" : "Fee updated");
        fetchAwards();
        setEditingFees((p) => { const n = { ...p }; delete n[awardId]; return n; });
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving((p) => ({ ...p, [awardId]: false }));
    }
  };

  const resetFee = async (awardId: string) => {
    setSaving((p) => ({ ...p, [awardId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/award-fees/${awardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ awardServiceFeePercentage: null }),
      });
      if (res.ok) {
        toast.success("Reset to org default");
        fetchAwards();
        setEditingFees((p) => { const n = { ...p }; delete n[awardId]; return n; });
      } else {
        toast.error("Failed to reset");
      }
    } catch {
      toast.error("Failed to reset");
    } finally {
      setSaving((p) => ({ ...p, [awardId]: false }));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Award Fees</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {awards.length} award{awards.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="text"
          placeholder="Search by name, code, or organization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Table / Empty ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 py-20 text-center text-sm text-gray-400">
          {search ? "No awards match your search" : "No awards yet"}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Award", "Organization", "Status", "Fee", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((award) => {
                  const pal = awardPal(award.name);
                  const sCfg = STATUS_CFG[award.status] ?? STATUS_CFG.draft;
                  const isDirty = editingFees[award._id] !== undefined;
                  const isSaving = saving[award._id];
                  const hasCustomFee = award.awardServiceFeePercentage != null;

                  return (
                    <tr key={award._id} className="hover:bg-gray-50/70 transition-colors">

                      {/* Award */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                            {award.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate leading-tight">{award.name}</p>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{award.code}</p>
                          </div>
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="py-3.5 px-5">
                        <p className="text-sm text-gray-700 truncate max-w-40">{award.organizationName}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${sCfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                          {sCfg.label}
                        </span>
                      </td>

                      {/* Fee input */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <div className="relative w-28">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder={`${award.orgServiceFeePercentage}`}
                              value={
                                isDirty
                                  ? editingFees[award._id]
                                  : hasCustomFee
                                  ? String(award.awardServiceFeePercentage)
                                  : ""
                              }
                              onChange={(e) =>
                                setEditingFees((p) => ({ ...p, [award._id]: e.target.value }))
                              }
                              className={`w-full pl-3 pr-7 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors tabular-nums ${
                                isDirty ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                              }`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                          </div>
                          {!isDirty && !hasCustomFee && (
                            <p className="text-[10px] text-gray-400">
                              org default · {award.orgServiceFeePercentage}%
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 justify-end">
                          {isDirty && (
                            <button
                              onClick={() => updateFee(award._id)}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <Save size={12} />
                              {isSaving ? "Saving…" : "Save"}
                            </button>
                          )}
                          {hasCustomFee && !isDirty && (
                            <button
                              onClick={() => resetFee(award._id)}
                              disabled={isSaving}
                              title="Reset to org default"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-40"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden divide-y divide-gray-50">
            {filtered.map((award) => {
              const pal = awardPal(award.name);
              const sCfg = STATUS_CFG[award.status] ?? STATUS_CFG.draft;
              const isDirty = editingFees[award._id] !== undefined;
              const isSaving = saving[award._id];
              const hasCustomFee = award.awardServiceFeePercentage != null;

              return (
                <div key={award._id} className="px-4 py-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                      {award.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{award.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{award.code} · {award.organizationName}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${sCfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                      {sCfg.label}
                    </span>
                  </div>

                  {/* Fee row */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder={`${award.orgServiceFeePercentage}`}
                          value={
                            isDirty
                              ? editingFees[award._id]
                              : hasCustomFee
                              ? String(award.awardServiceFeePercentage)
                              : ""
                          }
                          onChange={(e) =>
                            setEditingFees((p) => ({ ...p, [award._id]: e.target.value }))
                          }
                          className={`w-full pl-3 pr-8 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors tabular-nums ${
                            isDirty ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                      </div>
                      {!isDirty && !hasCustomFee && (
                        <p className="text-[10px] text-gray-400 pl-1">
                          org default · {award.orgServiceFeePercentage}%
                        </p>
                      )}
                    </div>
                    {isDirty && (
                      <button
                        onClick={() => updateFee(award._id)}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Save size={14} />
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                    )}
                    {hasCustomFee && !isDirty && (
                      <button
                        onClick={() => resetFee(award._id)}
                        disabled={isSaving}
                        title="Reset to org default"
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
