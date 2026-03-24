"use client";

import { useEffect, useState, type ElementType } from "react";
import {
  TrendingUp, Wallet, ArrowDownToLine, CheckCircle, Clock, Building2,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── types ───────────────────────────────────────────────── */

interface OrgRevenue {
  organizationId: string;
  organizationName: string;
  totalRevenue: number;
  platformFee: number;
  transferredToOrganizer: number;
  serviceFeePercentage: number;
}

interface PlatformRevenue {
  totalRevenue: number;
  totalPlatformFees: number;
  totalTransferred: number;
  successfulTransfers: number;
  pendingTransfers: number;
  revenueByOrganization: OrgRevenue[];
}

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

function fmtAmt(n: number) {
  return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── skeleton ────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-7 w-44 bg-gray-100 rounded-lg" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        <div className="h-14 bg-gray-50 border-b border-gray-50" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-50">
            <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
            <div className="flex-1 h-4 bg-gray-100 rounded" />
            <div className="h-4 w-28 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-28 bg-gray-100 rounded" />
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
  label: string; value: string; sub: string;
  icon: ElementType; numColor: string; iconCls: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 hover:ring-gray-200 transition-all">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${iconCls}`}>
        <Icon size={16} strokeWidth={2} />
      </div>
      <p className={`text-2xl sm:text-3xl font-bold leading-none tabular-nums ${numColor}`}>
        {value}
      </p>
      <p className="text-xs font-semibold text-gray-700 mt-2">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────── */

export default function PlatformRevenuePage() {
  const [revenue, setRevenue] = useState<PlatformRevenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRevenue(); }, []);

  const fetchRevenue = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/superadmin/platform-revenue", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setRevenue((await res.json()).data);
      else toast.error("Failed to fetch platform revenue");
    } catch {
      toast.error("Failed to fetch platform revenue");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;

  const orgs = revenue?.revenueByOrganization ?? [];

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Platform Revenue</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Fees collected from all awards across {orgs.length} organization{orgs.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Revenue"
          value={fmtAmt(revenue?.totalRevenue ?? 0)}
          sub="All awards combined"
          icon={TrendingUp}
          numColor="text-gray-900"
          iconCls="bg-gray-50 text-gray-500"
        />
        <StatCard
          label="Platform Fees"
          value={fmtAmt(revenue?.totalPlatformFees ?? 0)}
          sub="Platform earnings"
          icon={Wallet}
          numColor="text-green-700"
          iconCls="bg-green-50 text-green-600"
        />
        <StatCard
          label="Paid to Organizers"
          value={fmtAmt(revenue?.totalTransferred ?? 0)}
          sub="Transferred out"
          icon={ArrowDownToLine}
          numColor="text-gray-900"
          iconCls="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Successful Payouts"
          value={String(revenue?.successfulTransfers ?? 0)}
          sub="Completed transfers"
          icon={CheckCircle}
          numColor="text-gray-900"
          iconCls="bg-blue-50 text-blue-500"
        />
      </div>

      {/* ── Pending strip ── */}
      {(revenue?.pendingTransfers ?? 0) > 0 && (
        <div className="bg-white rounded-xl ring-1 ring-amber-100 px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Clock size={14} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800 leading-tight">Pending transfers</p>
              <p className="text-[11px] text-gray-400">Awaiting approval or processing</p>
            </div>
          </div>
          <span className="text-sm font-bold text-amber-700 tabular-nums">
            {revenue?.pendingTransfers}
          </span>
        </div>
      )}

      {/* ── Revenue by Organization ── */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">

        {/* Section header */}
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-gray-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">By Organization</h2>
            <p className="text-[11px] text-gray-400">Revenue breakdown per account</p>
          </div>
        </div>

        {orgs.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            No revenue data yet — appears once organizations generate income
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    {["Organization", "Total Revenue", "Platform Fee", "Net to Organizer"].map((h) => (
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
                  {orgs.map((org) => {
                    const pal = orgPal(org.organizationName);
                    return (
                      <tr key={org.organizationId} className="hover:bg-gray-50/70 transition-colors">

                        {/* Org */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                              {org.organizationName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-900 truncate">
                              {org.organizationName}
                            </span>
                          </div>
                        </td>

                        {/* Total revenue */}
                        <td className="py-3.5 px-5 font-semibold text-gray-900 tabular-nums">
                          {fmtAmt(org.totalRevenue)}
                        </td>

                        {/* Platform fee */}
                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-green-700 tabular-nums">
                            {fmtAmt(org.platformFee)}
                          </span>
                          <span className="ml-1.5 text-[11px] text-gray-400">
                            {org.serviceFeePercentage}%
                          </span>
                        </td>

                        {/* Net to organizer */}
                        <td className="py-3.5 px-5 font-semibold text-gray-900 tabular-nums">
                          {fmtAmt(org.transferredToOrganizer)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Totals footer */}
                {orgs.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-gray-100 bg-gray-50/60">
                      <td className="py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Total
                      </td>
                      <td className="py-3 px-5 font-bold text-gray-900 tabular-nums">
                        {fmtAmt(revenue?.totalRevenue ?? 0)}
                      </td>
                      <td className="py-3 px-5 font-bold text-green-700 tabular-nums">
                        {fmtAmt(revenue?.totalPlatformFees ?? 0)}
                      </td>
                      <td className="py-3 px-5 font-bold text-gray-900 tabular-nums">
                        {fmtAmt(revenue?.totalTransferred ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {orgs.map((org) => {
                const pal = orgPal(org.organizationName);
                return (
                  <div key={org.organizationId} className="px-4 py-4">
                    {/* Org name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${pal.bg} ${pal.text}`}>
                        {org.organizationName.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{org.organizationName}</p>
                    </div>

                    {/* Three amounts */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <p className="text-[10px] text-gray-400 font-medium mb-0.5">Revenue</p>
                        <p className="text-xs font-bold text-gray-900 tabular-nums leading-tight">
                          {fmtAmt(org.totalRevenue)}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-2.5">
                        <p className="text-[10px] text-green-600 font-medium mb-0.5">
                          Fee · {org.serviceFeePercentage}%
                        </p>
                        <p className="text-xs font-bold text-green-700 tabular-nums leading-tight">
                          {fmtAmt(org.platformFee)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5">
                        <p className="text-[10px] text-gray-400 font-medium mb-0.5">Paid out</p>
                        <p className="text-xs font-bold text-gray-900 tabular-nums leading-tight">
                          {fmtAmt(org.transferredToOrganizer)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
