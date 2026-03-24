"use client";

import { useEffect, useState } from "react";
import { Search, Save, RotateCcw, Percent, X } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

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
function orgPal(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  active:    { dot: "bg-green-500", text: "text-green-700",  label: "Active"    },
  inactive:  { dot: "bg-gray-300",  text: "text-gray-500",   label: "Inactive"  },
  suspended: { dot: "bg-red-400",   text: "text-red-600",    label: "Suspended" },
};

/* ─── types ───────────────────────────────────────────────── */

interface Organization {
  _id: string;
  name: string;
  email: string;
  serviceFeePercentage: number;
  status: string;
}

/* ─── skeleton ────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-gray-100 rounded-lg" />
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="h-16 bg-gray-100 rounded-xl" />
      <div className="h-11 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="h-11 bg-gray-50 border-b border-gray-50" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-gray-100 rounded" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-12 bg-gray-100 rounded" />
            <div className="h-8 w-24 bg-gray-100 rounded-lg" />
            <div className="h-7 w-16 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

export default function ServiceFeesPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [globalFee, setGlobalFee]         = useState("10");
  const [editingFees, setEditingFees]     = useState<Record<string, string>>({});
  const [saving, setSaving]               = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal]   = useState({
    isOpen: false, title: "", message: "",
    onConfirm: () => {}, type: "warning" as "warning" | "danger" | "info",
  });

  useEffect(() => { fetchOrganizations(); }, []);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/superadmin/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.data || []);
      } else {
        toast.error("Failed to fetch organizations");
      }
    } catch {
      toast.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? organizations.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.email.toLowerCase().includes(search.toLowerCase())
      )
    : organizations;

  const updateFee = async (orgId: string) => {
    const raw = editingFees[orgId];
    const fee = parseFloat(raw);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Fee must be 0 – 100");
      return;
    }
    setSaving((p) => ({ ...p, [orgId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceFeePercentage: fee }),
      });
      if (res.ok) {
        toast.success("Fee updated");
        fetchOrganizations();
        setEditingFees((p) => { const n = { ...p }; delete n[orgId]; return n; });
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving((p) => ({ ...p, [orgId]: false }));
    }
  };

  const resetFee = async (orgId: string) => {
    setSaving((p) => ({ ...p, [orgId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceFeePercentage: 10 }),
      });
      if (res.ok) {
        toast.success("Reset to 10%");
        fetchOrganizations();
        setEditingFees((p) => { const n = { ...p }; delete n[orgId]; return n; });
      } else {
        toast.error("Failed to reset");
      }
    } catch {
      toast.error("Failed to reset");
    } finally {
      setSaving((p) => ({ ...p, [orgId]: false }));
    }
  };

  const applyGlobal = () => {
    const fee = parseFloat(globalFee);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Fee must be 0 – 100");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Apply to all organizations",
      message: `Set ${fee}% service fee for every organization on the platform?`,
      type: "warning",
      onConfirm: async () => {
        setConfirmModal((p) => ({ ...p, isOpen: false }));
        const t = toast.loading("Applying…");
        try {
          const token = localStorage.getItem("token");
          const res = await fetch("/api/superadmin/service-fees/bulk-update", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ serviceFeePercentage: fee }),
          });
          if (res.ok) {
            const d = await res.json();
            toast.success(`Updated ${d.count} organizations`, { id: t });
            fetchOrganizations();
          } else {
            const d = await res.json();
            toast.error(d.error || "Failed", { id: t });
          }
        } catch {
          toast.error("Failed", { id: t });
        }
      },
    });
  };

  if (loading) return <PageSkeleton />;

  const statusCfg = (s: string) => STATUS[s] ?? STATUS.inactive;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Service Fees</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Global rate strip ── */}
      <div className="bg-white rounded-xl ring-1 ring-gray-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Percent size={14} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 leading-tight">Global rate</p>
            <p className="text-[11px] text-gray-400">Apply one fee to all organizations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={globalFee}
              onChange={(e) => setGlobalFee(e.target.value)}
              className="w-24 pl-3 pr-7 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-center tabular-nums"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
          </div>
          <button
            onClick={applyGlobal}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Apply to all
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
        <input
          type="text"
          placeholder="Search by name or email…"
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

      {/* ── Desktop table ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 py-20 text-center text-sm text-gray-400">
          {search ? "No organizations match your search" : "No organizations yet"}
        </div>
      ) : (
        <>
          <div className="hidden sm:block bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Organization", "Status", "Service Fee", ""].map((h) => (
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
                {filtered.map((org) => {
                  const pal = orgPal(org.name);
                  const cfg = statusCfg(org.status);
                  const isDirty = editingFees[org._id] !== undefined;
                  const isSaving = saving[org._id];
                  return (
                    <tr key={org._id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Org */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate leading-tight">{org.name}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{org.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Fee input */}
                      <td className="py-3.5 px-5">
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={isDirty ? editingFees[org._id] : org.serviceFeePercentage}
                            onChange={(e) =>
                              setEditingFees((p) => ({ ...p, [org._id]: e.target.value }))
                            }
                            className={`w-full pl-3 pr-6 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors tabular-nums ${
                              isDirty ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                            }`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1.5 justify-end">
                          {isDirty && (
                            <button
                              onClick={() => updateFee(org._id)}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <Save size={12} />
                              {isSaving ? "Saving…" : "Save"}
                            </button>
                          )}
                          <button
                            onClick={() => resetFee(org._id)}
                            disabled={isSaving}
                            title="Reset to 10%"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-40"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile list ── */}
          <div className="sm:hidden bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden divide-y divide-gray-50">
            {filtered.map((org) => {
              const pal = orgPal(org.name);
              const cfg = statusCfg(org.status);
              const isDirty = editingFees[org._id] !== undefined;
              const isSaving = saving[org._id];
              return (
                <div key={org._id} className="px-4 py-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{org.name}</p>
                      <p className="text-xs text-gray-400 truncate">{org.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Fee row */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={isDirty ? editingFees[org._id] : org.serviceFeePercentage}
                        onChange={(e) =>
                          setEditingFees((p) => ({ ...p, [org._id]: e.target.value }))
                        }
                        className={`w-full pl-3 pr-8 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors tabular-nums ${
                          isDirty ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                    </div>
                    {isDirty && (
                      <button
                        onClick={() => updateFee(org._id)}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
                      >
                        <Save size={14} />
                        {isSaving ? "Saving…" : "Save"}
                      </button>
                    )}
                    <button
                      onClick={() => resetFee(org._id)}
                      disabled={isSaving}
                      title="Reset to 10%"
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-40 shrink-0"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
