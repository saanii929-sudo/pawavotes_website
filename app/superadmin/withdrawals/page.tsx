"use client";

import { useEffect, useState, type ElementType } from "react";
import {
  Search, X, CheckCircle, XCircle, Clock,
  Banknote, Smartphone, CreditCard,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── types ───────────────────────────────────────────────── */

interface Transfer {
  _id: string;
  referenceId: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientBank?: string;
  recipientAccountNumber?: string;
  recipientPhoneNumber?: string;
  transferType: "bank" | "mobile_money";
  status: "successful" | "completed" | "pending" | "failed" | "approved" | "rejected";
  initiatedBy: string;
  notes?: string;
  createdAt: string;
}

type Filter = "all" | "pending" | "successful" | "failed";

/* ─── helpers ─────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtAmt(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  successful: { dot: "bg-green-500", text: "text-green-700",  label: "Successful" },
  completed:  { dot: "bg-green-500", text: "text-green-700",  label: "Completed"  },
  approved:   { dot: "bg-green-400", text: "text-green-700",  label: "Approved"   },
  pending:    { dot: "bg-amber-400", text: "text-amber-700",  label: "Pending"    },
  failed:     { dot: "bg-red-400",   text: "text-red-600",    label: "Failed"     },
  rejected:   { dot: "bg-red-400",   text: "text-red-600",    label: "Rejected"   },
};

const TYPE = {
  bank:         { label: "Bank",  cls: "bg-blue-50 text-blue-700"     },
  mobile_money: { label: "MoMo",  cls: "bg-violet-50 text-violet-700" },
};

/* ─── skeleton ────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-7 w-36 bg-gray-100 rounded-lg" />
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="h-11 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-50" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-gray-100 rounded" />
              <div className="h-3 w-44 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-5 w-14 bg-gray-100 rounded-lg" />
            <div className="h-4 w-12 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-7 w-20 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── stat card ───────────────────────────────────────────── */

function StatCard({
  label, value, sub, icon: Icon, numColor, iconCls,
}: {
  label: string; value: string | number; sub: string;
  icon: ElementType; numColor: string; iconCls: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 hover:ring-gray-200 transition-all">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${iconCls}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <p className={`text-3xl sm:text-4xl font-bold leading-none tabular-nums ${numColor}`}>
        {value}
      </p>
      <p className="text-xs font-semibold text-gray-700 mt-2">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",        label: "All"        },
  { id: "pending",    label: "Pending"    },
  { id: "successful", label: "Successful" },
  { id: "failed",     label: "Failed"     },
];

export default function WithdrawalsPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<Filter>("all");
  const [search, setSearch]       = useState("");
  const [acting, setActing]       = useState<Record<string, boolean>>({});

  useEffect(() => { fetchTransfers(); }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/superadmin/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTransfers((await res.json()).data || []);
      else toast.error("Failed to fetch withdrawals");
    } catch {
      toast.error("Failed to fetch withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const act = async (id: string, action: "approve" | "reject") => {
    setActing((p) => ({ ...p, [id]: true }));
    const t = toast.loading(action === "approve" ? "Approving…" : "Rejecting…");
    try {
      const token = localStorage.getItem("token");
      const endpoint =
        action === "approve"
          ? `/api/admin/transfers/${id}/approve`
          : `/api/admin/transfers/${id}/reject`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(action === "reject" && { body: JSON.stringify({ reason: "Rejected by superadmin" }) }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(d.message || `Transfer ${action}d`, { id: t });
        fetchTransfers();
      } else {
        toast.error(d.error || `Failed to ${action}`, { id: t });
      }
    } catch {
      toast.error(`Failed to ${action}`, { id: t });
    } finally {
      setActing((p) => ({ ...p, [id]: false }));
    }
  };

  if (loading) return <PageSkeleton />;

  const isSuccess = (s: string) => s === "successful" || s === "completed" || s === "approved";
  const isFailed  = (s: string) => s === "failed" || s === "rejected";

  const stats = {
    all:        transfers.length,
    pending:    transfers.filter((t) => t.status === "pending").length,
    successful: transfers.filter((t) => isSuccess(t.status)).length,
    failed:     transfers.filter((t) => isFailed(t.status)).length,
    paidOut:    transfers.filter((t) => isSuccess(t.status)).reduce((s, t) => s + t.amount, 0),
    currency:   transfers[0]?.currency ?? "GHS",
  };

  const filtered = transfers.filter((t) => {
    const matchFilter =
      filter === "all" ||
      (filter === "successful" && isSuccess(t.status)) ||
      (filter === "failed" && isFailed(t.status)) ||
      (filter === "pending" && t.status === "pending");
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.referenceId.toLowerCase().includes(q) ||
      t.recipientName.toLowerCase().includes(q) ||
      t.initiatedBy.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Withdrawals</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {transfers.length} request{transfers.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total"
          value={stats.all}
          sub="All requests"
          icon={Banknote}
          numColor="text-gray-900"
          iconCls="bg-gray-50 text-gray-500"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          sub="Awaiting action"
          icon={Clock}
          numColor="text-amber-700"
          iconCls="bg-amber-50 text-amber-500"
        />
        <StatCard
          label="Successful"
          value={stats.successful}
          sub="Completed"
          icon={CheckCircle}
          numColor="text-green-700"
          iconCls="bg-green-50 text-green-600"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          sub="Rejected / error"
          icon={XCircle}
          numColor="text-red-600"
          iconCls="bg-red-50 text-red-500"
        />
      </div>

      {/* ── Total paid out strip ── */}
      <div className="bg-white rounded-xl ring-1 ring-gray-100 px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <CreditCard size={14} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800 leading-tight">Total Paid Out</p>
            <p className="text-[11px] text-gray-400">Successful withdrawals</p>
          </div>
        </div>
        <p className="text-sm font-bold text-green-700 tabular-nums">
          {stats.currency}{" "}
          {stats.paidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* ── Search + filter row ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search reference, recipient or initiator…"
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
        <div className="flex items-center gap-1.5 bg-white ring-1 ring-gray-200 rounded-xl px-2 py-1.5">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === id
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              <span className={`ml-1 ${filter === id ? "text-gray-300" : "text-gray-400"}`}>
                {stats[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 py-20 text-center text-sm text-gray-400">
          {search || filter !== "all" ? "No withdrawals match your filters" : "No withdrawal requests yet"}
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden sm:block bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Recipient", "Amount", "Type", "Initiated by", "Date", "Status", ""].map((h) => (
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
                {filtered.map((t) => {
                  const st = STATUS[t.status] ?? STATUS.failed;
                  const ty = TYPE[t.transferType] ?? TYPE.bank;
                  const busy = acting[t._id];
                  return (
                    <tr key={t._id} className="hover:bg-gray-50/70 transition-colors">

                      {/* Recipient */}
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-gray-900 leading-tight">{t.recipientName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.transferType === "bank"
                            ? `${t.recipientBank ?? ""} · ${t.recipientAccountNumber ?? ""}`
                            : `MoMo · ${t.recipientPhoneNumber ?? ""}`}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 font-semibold text-gray-900 tabular-nums">
                        {fmtAmt(t.currency, t.amount)}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${ty.cls}`}>
                          {t.transferType === "bank"
                            ? <CreditCard size={11} />
                            : <Smartphone size={11} />}
                          {ty.label}
                        </span>
                      </td>

                      {/* Initiated by */}
                      <td className="py-3.5 px-5 text-sm text-gray-600 max-w-35 truncate">
                        {t.initiatedBy}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-5 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                        {fmtDate(t.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5">
                        {t.status === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => act(t._id, "approve")}
                              disabled={busy}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {busy ? "…" : "Approve"}
                            </button>
                            <button
                              onClick={() => act(t._id, "reject")}
                              disabled={busy}
                              className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {busy ? "…" : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile list ── */}
          <div className="sm:hidden bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden divide-y divide-gray-50">
            {filtered.map((t) => {
              const st = STATUS[t.status] ?? STATUS.failed;
              const ty = TYPE[t.transferType] ?? TYPE.bank;
              const busy = acting[t._id];
              return (
                <div key={t._id} className="px-4 py-4 space-y-3">
                  {/* Row 1: recipient + status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{t.recipientName}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {t.transferType === "bank"
                          ? `${t.recipientBank ?? ""} · ${t.recipientAccountNumber ?? ""}`
                          : `MoMo · ${t.recipientPhoneNumber ?? ""}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>

                  {/* Row 2: amount + type + date */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-bold text-gray-900 tabular-nums text-sm">
                      {fmtAmt(t.currency, t.amount)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${ty.cls}`}>
                      {t.transferType === "bank" ? <CreditCard size={10} /> : <Smartphone size={10} />}
                      {ty.label}
                    </span>
                    <span className="ml-auto tabular-nums">{fmtDate(t.createdAt)}</span>
                  </div>

                  {/* Row 3: initiator */}
                  <p className="text-xs text-gray-400 truncate">
                    Initiated by <span className="text-gray-600 font-medium">{t.initiatedBy}</span>
                  </p>

                  {/* Row 4: actions (pending only) */}
                  {t.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => act(t._id, "approve")}
                        disabled={busy}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy ? "…" : "Approve"}
                      </button>
                      <button
                        onClick={() => act(t._id, "reject")}
                        disabled={busy}
                        className="flex-1 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy ? "…" : "Reject"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
