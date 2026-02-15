"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Clock,
  MapPin,
  CreditCard,
  Trophy,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

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
    nominee: {
      name: string;
      image: string;
      categoryId: { name: string };
    };
  }>;
  votesByHour: Array<{
    _id: number;
    count: number;
    amount: number;
  }>;
  paymentMethods: Array<{
    _id: string;
    count: number;
    amount: number;
  }>;
  votingTrend: Array<{
    _id: string;
    votes: number;
    transactions: number;
    revenue: number;
  }>;
  recentVotes: Array<any>;
  timestamp: string;
}

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/analytics/realtime', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">No analytics data available</div>
      </div>
    );
  }

  // Prepare chart data
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hourData = data.votesByHour.find(h => h._id === i);
    return {
      hour: `${i}:00`,
      votes: hourData?.count || 0,
      revenue: hourData?.amount || 0,
    };
  });

  const paymentMethodData = data.paymentMethods.map(pm => ({
    name: pm._id === 'ussd' ? 'USSD' : pm._id === 'mobile_money' ? 'Mobile Money' : pm._id === 'manual' ? 'Manual' : pm._id,
    value: pm.count,
    amount: pm.amount,
  }));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Analytics</h1>
          <p className="text-gray-500 mt-1">
            Live voting data • Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          title="Total Votes"
          value={data.overview.totalVotes.toLocaleString()}
          subtitle={`${data.overview.votesToday.toLocaleString()} today`}
          color="bg-blue-500"
        />
        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          title="Total Revenue"
          value={`GHS ${data.overview.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`GHS ${data.overview.revenueToday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today`}
          color="bg-green-500"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Avg Vote Value"
          value={`GHS ${data.overview.averageVoteValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Per transaction"
          color="bg-purple-500"
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          title="Votes Today"
          value={data.overview.votesToday.toLocaleString()}
          subtitle={`${data.overview.totalVotes > 0 ? ((data.overview.votesToday / data.overview.totalVotes) * 100).toFixed(1) : '0.0'}% of total`}
          color="bg-orange-500"
        />
        <StatCard
          icon={<Zap className="w-6 h-6" />}
          title="Live Status"
          value="Active"
          subtitle="Updates every 10s"
          color="bg-red-500"
          pulse
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voting Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            7-Day Voting Trend
          </h2>
          {data.votingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.votingTrend}>
                <defs>
                  <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="votes"
                  stroke="#16a34a"
                  fillOpacity={1}
                  fill="url(#colorVotes)"
                  name="Votes"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No voting data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Hourly Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            24-Hour Activity
          </h2>
          {data.votesByHour.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="votes" fill="#16a34a" name="Votes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-75 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity in the last 24 hours</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Methods
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentMethodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Nominees */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Nominees
          </h2>
          {data.topNominees.length > 0 ? (
            <div className="space-y-3">
              {data.topNominees.slice(0, 5).map((nominee, index) => (
                <div
                  key={nominee._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </div>
                    {nominee.nominee?.image && (
                      <img
                        src={nominee.nominee.image}
                        alt={nominee.nominee.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">
                        {nominee.nominee?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {nominee.nominee?.categoryId?.name || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {nominee.totalVotes.toLocaleString()} votes
                    </div>
                    <div className="text-sm text-gray-500">
                      GHS {nominee.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-62.5 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No nominees with votes yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Votes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Recent Votes (Live Feed)
        </h2>
        {data.recentVotes.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.recentVotes.map((vote, index) => (
              <div
                key={vote._id}
                className="flex items-center justify-between p-3 border-l-4 border-green-500 bg-gray-50 rounded animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  {vote.nominee?.image && (
                    <img
                      src={vote.nominee.image}
                      alt={vote.nominee.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">
                      {vote.nominee?.name || 'Unknown Nominee'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {vote.numberOfVotes} votes • {vote.paymentMethod}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    GHS {vote.amount.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(vote.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-50 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent votes</p>
              <p className="text-sm mt-1">Votes will appear here in real-time</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  color,
  pulse = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`${color} text-white p-3 rounded-lg ${pulse ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-600">{title}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
  );
}
