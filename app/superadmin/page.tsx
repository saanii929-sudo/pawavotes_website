"use client";

import { useEffect, useState } from "react";
import { Building2, Users, CheckCircle, XCircle, TrendingUp, Activity, Award, Calendar, MessageSquare } from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [smsBalance, setSmsBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [smsLoading, setSmsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSmsBalance();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmsBalance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/sms-balance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSmsBalance(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch SMS balance:", error);
    } finally {
      setSmsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className=" rounded-xl sm:rounded-2xl p-6 sm:p-8 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Dashboard Overview</h1>
            <p className="text-black text-sm sm:text-base">
              Manage organizations and monitor platform activity
            </p>
          </div>
          <div className="flex items-center  gap-2 bg-green-600 text-white backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">Live Stats</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Organizations */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-blue-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Building2 className="text-white" size={24} />
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-blue-600">Total</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Total Organizations</p>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
            {stats?.organizations?.total || 0}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3" />
            <span>All registered</span>
          </div>
        </div>

        {/* Active Organizations */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-green-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="text-white" size={24} />
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-green-600">Active</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Active Organizations</p>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
            {stats?.organizations?.active || 0}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Activity className="w-3 h-3" />
            <span>Currently active</span>
          </div>
        </div>

        {/* Inactive Organizations */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-gray-400 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <XCircle className="text-white" size={24} />
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-gray-600">Inactive</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Inactive Organizations</p>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
            {stats?.organizations?.inactive || 0}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <XCircle className="w-3 h-3" />
            <span>Not active</span>
          </div>
        </div>

        {/* Total Admins */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-green-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Users className="text-white" size={24} />
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-green-600">Admins</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Total Admins</p>
          <p className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
            {stats?.admins?.total || 0}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            <span>System admins</span>
          </div>
        </div>
      </div>

      {/* SMS Balance Card */}
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-purple-500">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="text-white" size={24} />
          </div>
          <div className="bg-purple-50 rounded-lg px-3 py-1">
            <span className="text-xs font-semibold text-purple-600">SMS</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-2 font-medium">SMS Balance</p>
        {smsLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        ) : smsBalance ? (
          <>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>~{Number(smsBalance.balance || 0).toFixed(2) || 0} SMS credits</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-red-500">Failed to load SMS balance</p>
        )}
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className=" px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2">
            <Award className="w-6 h-6" />
            Recent Organizations
          </h2>
          <p className="text-black text-sm mt-1">Latest registered organizations</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Organization
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Email
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrganizations?.length > 0 ? (
                stats.recentOrganizations.map((org: any, index: number) => (
                  <tr 
                    key={org._id} 
                    className={`border-b hover:bg-green-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">{org.email}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full ${
                          org.status === "active"
                            ? "bg-green-100 text-green-700"
                            : org.status === "inactive"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {org.status === "active" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {org.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(org.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    No organizations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {stats?.recentOrganizations?.length > 0 ? (
            stats.recentOrganizations.map((org: any) => (
              <div 
                key={org._id} 
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-green-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-linear-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{org.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{org.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full ${
                      org.status === "active"
                        ? "bg-green-100 text-green-700"
                        : org.status === "inactive"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {org.status === "active" ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {org.status}
                  </span>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(org.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No organizations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
