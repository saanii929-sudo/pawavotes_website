'use client';

import { useEffect, useState } from 'react';
import { Eye, Users, Monitor, Smartphone, Tablet, Globe, Clock, TrendingUp } from 'lucide-react';

interface Analytics {
  overview: {
    totalViews: number;
    uniqueSessions: number;
    todayViews: number;
    todaySessions: number;
  };
  topPages: Array<{ _id: string; views: number; uniqueVisitors: number }>;
  deviceBreakdown: Array<{ _id: string; count: number }>;
  browserBreakdown: Array<{ _id: string; count: number }>;
  viewsByDay: Array<{ _id: string; views: number; uniqueVisitors: number }>;
  topReferrers: Array<{ _id: string; count: number }>;
  recentViews: Array<{ path: string; device: string; browser: string; createdAt: string }>;
}

export default function SiteAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/superadmin/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const deviceIcon = (device: string) => {
    if (device === 'mobile') return <Smartphone size={16} className="text-blue-500" />;
    if (device === 'tablet') return <Tablet size={16} className="text-purple-500" />;
    return <Monitor size={16} className="text-gray-500" />;
  };

  const maxDayViews = data?.viewsByDay?.length
    ? Math.max(...data.viewsByDay.map(d => d.views), 1)
    : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-gray-500">
        No analytics data available yet. Data will appear as visitors browse the site.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Site Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Track visitor activity across the platform</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {r === '24h' ? '24h' : r === '7d' ? '7 days' : r === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="text-blue-600" size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Total Page Views</p>
          <p className="text-2xl font-bold text-gray-900">{data.overview.totalViews.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Unique Visitors</p>
          <p className="text-2xl font-bold text-gray-900">{data.overview.uniqueSessions.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Views Today</p>
          <p className="text-2xl font-bold text-gray-900">{data.overview.todayViews.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="text-orange-600" size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Visitors Today</p>
          <p className="text-2xl font-bold text-gray-900">{data.overview.todaySessions.toLocaleString()}</p>
        </div>
      </div>

      {/* Views Chart */}
      {data.viewsByDay.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Views</h2>
          <div className="space-y-2">
            {data.viewsByDay.map((day) => (
              <div key={day._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0">
                  {new Date(day._id).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((day.views / maxDayViews) * 100, 8)}%` }}
                  >
                    <span className="text-[10px] text-white font-medium">{day.views}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-16 text-right">{day.uniqueVisitors} visitors</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h2>
          {data.topPages.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topPages.map((page, i) => (
                <div key={page._id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm text-gray-700 truncate">{page._id}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-500">{page.uniqueVisitors} visitors</span>
                    <span className="text-sm font-semibold text-gray-900">{page.views}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices & Browsers */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Devices</h2>
            {data.deviceBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.deviceBreakdown.map((d) => {
                  const total = data.deviceBreakdown.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={d._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {deviceIcon(d._id)}
                        <span className="text-sm text-gray-700 capitalize">{d._id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{d.count}</span>
                        <span className="text-xs text-gray-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Browsers</h2>
            {data.browserBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
            ) : (
              <div className="space-y-3">
                {data.browserBreakdown.map((b) => {
                  const total = data.browserBreakdown.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={b._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{b._id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{b.count}</span>
                        <span className="text-xs text-gray-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Referrers */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h2>
          {data.topReferrers.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No referrer data yet</p>
          ) : (
            <div className="space-y-3">
              {data.topReferrers.map((ref, i) => (
                <div key={ref._id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <span className="text-sm text-gray-700 truncate">{ref._id}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">{ref.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {data.recentViews.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentViews.map((view, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  {deviceIcon(view.device)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{view.path}</p>
                    <p className="text-xs text-gray-400">{view.browser}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Clock size={12} />
                    <span>
                      {new Date(view.createdAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
