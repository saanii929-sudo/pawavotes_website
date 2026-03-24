"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Clock,
  RefreshCw,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalVotes: number;
    totalRevenue: number;
    votesToday: number;
    revenueToday: number;
    averageVoteValue: number;
  };
  topNominees: Array<{
    _id: string;
    totalVotes: number;
    totalAmount: number;
    voteCount: number;
    nominee: { name: string; image: string; categoryId: { name: string } };
  }>;
  votesByHour: Array<{ _id: number; count: number; amount: number }>;
  paymentMethods: Array<{ _id: string; count: number; amount: number }>;
  votingTrend: Array<{ _id: string; votes: number; transactions: number; revenue: number }>;
  recentVotes: Array<any>;
  timestamp: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#16a34a', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

const ghs = (n: number) =>
  `GHS ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 'h-4', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} bg-slate-200 rounded animate-pulse`} />;
}

function PageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton h="h-7" w="w-48" />
          <Skeleton h="h-3" w="w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
            <Skeleton h="h-3" w="w-20" />
            <Skeleton h="h-7" w="w-28" />
            <Skeleton h="h-3" w="w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5"><Skeleton h="h-64" /></div>
        <div className="bg-white rounded-xl border border-slate-100 p-5"><Skeleton h="h-64" /></div>
      </div>
    </div>
  );
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  live = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <span className="text-slate-300">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
          {live && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
          )}
          {sub}
        </p>
      </div>
    </div>
  );
}

// ─── chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      {label && <p className="text-slate-400 mb-1.5">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold text-slate-700">
          {p.name}: <span className="text-slate-900">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 sm:p-6">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">{title}</p>
      {children}
    </div>
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────

function Empty({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-300">
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-medium text-slate-400">{text}</p>
      {sub && <p className="text-xs text-slate-300 mt-1">{sub}</p>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/analytics/realtime', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
        setLastUpdate(new Date());
      }
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(true); }, [fetchAnalytics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchAnalytics(true), 10000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAnalytics]);

  if (loading) return <PageSkeleton />;

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Empty icon={<Activity className="w-10 h-10" />} text="No analytics data available" />
      </div>
    );
  }

  // ── prepare chart data ────────────────────────────────────────────────────

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const h = data.votesByHour.find(x => x._id === i);
    return { hour: `${i}h`, votes: h?.count || 0, revenue: h?.amount || 0 };
  });

  const paymentMethodData = data.paymentMethods.map(pm => ({
    name: pm._id === 'ussd' ? 'USSD'
        : pm._id === 'mobile_money' ? 'Mobile Money'
        : pm._id === 'manual' ? 'Manual'
        : pm._id,
    value: pm.count,
    amount: pm.amount,
  }));

  const todayPct = data.overview.totalVotes > 0
    ? ((data.overview.votesToday / data.overview.totalVotes) * 100).toFixed(1)
    : '0.0';

  const maxNomineeVotes = data.topNominees[0]?.totalVotes || 1;

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time voting data
            {mounted && (
              <> · Updated {lastUpdate.toLocaleTimeString()}</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className="flex items-center gap-2 text-sm text-slate-600 select-none"
          >
            <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${autoRefresh ? 'bg-green-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="hidden sm:inline text-xs font-medium text-slate-500">
              {autoRefresh ? 'Live' : 'Paused'}
            </span>
          </button>

          {/* manual refresh */}
          <button
            onClick={() => fetchAnalytics()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Total Votes"
          value={data.overview.totalVotes.toLocaleString()}
          sub={`${data.overview.votesToday.toLocaleString()} today`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Total Revenue"
          value={ghs(data.overview.totalRevenue)}
          sub={`${ghs(data.overview.revenueToday)} today`}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          label="Avg Vote Value"
          value={ghs(data.overview.averageVoteValue)}
          sub="Per transaction"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Votes Today"
          value={data.overview.votesToday.toLocaleString()}
          sub={`${todayPct}% of all votes`}
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label="Live Status"
          value="Active"
          sub="Updates every 10s"
          icon={<Zap className="w-4 h-4" />}
          live
        />
      </div>

      {/* ── charts row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 7-day trend */}
        <Section title="7-Day Voting Trend">
          {data.votingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.votingTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="voteGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="votes"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#voteGrad)"
                  name="Votes"
                  dot={false}
                  activeDot={{ r: 4, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty icon={<Activity className="w-8 h-8" />} text="No voting data yet" />
          )}
        </Section>

        {/* 24h activity */}
        <Section title="24-Hour Activity">
          {data.votesByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="votes" fill="#16a34a" name="Votes" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty icon={<Clock className="w-8 h-8" />} text="No activity in last 24 hours" />
          )}
        </Section>
      </div>

      {/* ── charts row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* payment methods */}
        <Section title="Payment Methods">
          {paymentMethodData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {paymentMethodData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {paymentMethodData.map((pm, i) => (
                  <div key={pm.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-slate-600">{pm.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700">{pm.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty icon={<DollarSign className="w-8 h-8" />} text="No payment data" />
          )}
        </Section>

        {/* top nominees */}
        <div className="lg:col-span-2">
          <Section title="Top Nominees">
            {data.topNominees.length > 0 ? (
              <div className="space-y-3">
                {data.topNominees.slice(0, 5).map((item, i) => {
                  const pct = Math.round((item.totalVotes / maxNomineeVotes) * 100);
                  return (
                    <div key={item._id} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-slate-300 shrink-0 text-right">
                        {i + 1}
                      </span>
                      {item.nominee?.image ? (
                        <img
                          src={item.nominee.image}
                          alt={item.nominee.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                          {item.nominee?.name?.[0] || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {item.nominee?.name || 'Unknown'}
                          </span>
                          <span className="text-sm font-bold text-slate-800 shrink-0 ml-2">
                            {item.totalVotes.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">
                            {ghs(item.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty icon={<Users className="w-8 h-8" />} text="No nominees with votes yet" />
            )}
          </Section>
        </div>
      </div>

      {/* ── recent votes ────────────────────────────────────────────────────── */}
      <Section title="Live Feed">
        {data.recentVotes.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto -mx-1 px-1">
            {data.recentVotes.map((vote, i) => (
              <div key={vote._id || i} className="flex items-center gap-3 py-3">
                {vote.nominee?.image ? (
                  <img
                    src={vote.nominee.image}
                    alt={vote.nominee.name}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                    {vote.nominee?.name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {vote.nominee?.name || 'Unknown Nominee'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {vote.numberOfVotes} vote{vote.numberOfVotes !== 1 ? 's' : ''} · {vote.paymentMethod}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-600">{ghs(vote.amount)}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(vote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            icon={<Activity className="w-8 h-8" />}
            text="No recent votes"
            sub="Votes will appear here in real time"
          />
        )}
      </Section>
    </div>
  );
}
