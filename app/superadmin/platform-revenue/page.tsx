"use client";
import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Award, CheckCircle, Building2, PieChart, ArrowUpRight, Wallet, Activity } from "lucide-react";
import toast from "react-hot-toast";

interface PlatformRevenue {
  totalRevenue: number;
  totalPlatformFees: number;
  totalTransferred: number;
  transferCount: number;
  successfulTransfers: number;
  pendingTransfers: number;
  revenueByOrganization: Array<{
    organizationId: string;
    organizationName: string;
    totalRevenue: number;
    platformFee: number;
    transferredToOrganizer: number;
  }>;
}

const PlatformRevenuePage = () => {
  const [revenue, setRevenue] = useState<PlatformRevenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformRevenue();
  }, []);

  const fetchPlatformRevenue = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/platform-revenue", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRevenue(data.data);
      } else {
        toast.error("Failed to fetch platform revenue");
      }
    } catch (error) {
      console.error("Failed to fetch platform revenue:", error);
      toast.error("Failed to fetch platform revenue");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading platform revenue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className=" rounded-xl sm:rounded-2xl p-6 sm:p-8 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
              <PieChart className="w-8 h-8" />
              Platform Revenue
            </h1>
            <p className="text-black text-sm sm:text-base">
              Overview of platform fees collected (10% from all awards)
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-600 text-white backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
            <Activity className="w-5 h-5" />
            <span className="text-sm font-medium">Financial Overview</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-blue-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <DollarSign className="text-white w-6 h-6" />
            </div>
            <div className="bg-blue-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-blue-600">Total</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Total Revenue (All Awards)</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            GHS {(revenue?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3" />
            <span>All transactions</span>
          </div>
        </div>

        {/* Platform Fees */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-green-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Wallet className="text-white w-6 h-6" />
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-green-600">10%</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Platform Fees</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
            GHS {(revenue?.totalPlatformFees || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ArrowUpRight className="w-3 h-3" />
            <span>Platform earnings</span>
          </div>
        </div>

        {/* Transferred to Organizers */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-purple-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Award className="text-white w-6 h-6" />
            </div>
            <div className="bg-purple-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-purple-600">90%</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Transferred to Organizers</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            GHS {(revenue?.totalTransferred || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Building2 className="w-3 h-3" />
            <span>Paid to organizers</span>
          </div>
        </div>

        {/* Successful Transfers */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-l-4 border-orange-500 group hover:scale-105">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="text-white w-6 h-6" />
            </div>
            <div className="bg-orange-50 rounded-lg px-3 py-1">
              <span className="text-xs font-semibold text-orange-600">Count</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 font-medium">Successful Transfers</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {revenue?.successfulTransfers || 0}
          </p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <CheckCircle className="w-3 h-3" />
            <span>Completed payouts</span>
          </div>
        </div>
      </div>

      {/* Revenue by Organization */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className=" px-6 py-4">
          <h2 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Revenue by Organization
          </h2>
          <p className="text-black text-sm mt-1">Breakdown of revenue and fees per organization</p>
        </div>

        {!revenue || revenue.revenueByOrganization.length === 0 ? (
          <div className="p-12 text-center">
            <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium">No revenue data available yet</p>
            <p className="text-sm text-gray-400 mt-1">Revenue will appear once organizations start generating income</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Organization
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Total Revenue
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Platform Fee (10%)
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Transferred to Organizer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.revenueByOrganization.map((org, index) => (
                    <tr 
                      key={org.organizationId} 
                      className={`border-b hover:bg-indigo-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {org.organizationName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{org.organizationName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">
                            GHS {org.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-green-600">
                            GHS {org.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-600" />
                          <span className="font-semibold text-gray-900">
                            GHS {org.transferredToOrganizer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {revenue.revenueByOrganization.map((org) => (
                <div 
                  key={org.organizationId} 
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {org.organizationName.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-bold text-gray-900 flex-1">{org.organizationName}</h3>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-gray-600 font-medium">Total Revenue</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        GHS {org.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Wallet className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-gray-600 font-medium">Platform Fee (10%)</p>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        GHS {org.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Award className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-gray-600 font-medium">Transferred to Organizer</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        GHS {org.transferredToOrganizer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformRevenuePage;
