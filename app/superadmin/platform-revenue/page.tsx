"use client";
import React, { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Award, CheckCircle } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-500">Loading platform revenue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Platform Revenue</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Overview of platform fees collected (10% from all awards)
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="text-blue-600" size={20} />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Total Revenue (All Awards)</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              GHS {(revenue?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-green-600" size={20} />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Platform Fees (10%)</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
              GHS {(revenue?.totalPlatformFees || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="text-purple-600" size={20} />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Transferred to Organizers</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              GHS {(revenue?.totalTransferred || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-orange-600" size={20} />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Successful Transfers</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              {revenue?.successfulTransfers || 0}
            </p>
          </div>
        </div>

        {/* Revenue by Organization */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Revenue by Organization</h2>
            <p className="text-sm text-gray-500 mt-1">Breakdown of revenue and fees per organization</p>
          </div>

          {!revenue || revenue.revenueByOrganization.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No revenue data available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platform Fee (10%)
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transferred to Organizer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {revenue.revenueByOrganization.map((org) => (
                    <tr key={org.organizationId} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{org.organizationName}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900">
                          GHS {org.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-green-600">
                          GHS {org.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-900">
                          GHS {org.transferredToOrganizer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformRevenuePage;
