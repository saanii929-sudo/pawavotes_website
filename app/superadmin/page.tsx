"use client";

import { useEffect, useState } from "react";
import { Building2, Users, CheckCircle, XCircle } from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">
          Manage organizations and monitor platform activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="text-blue-600" size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Organizations</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.organizations?.total || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Active Organizations</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.organizations?.active || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="text-gray-600" size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Inactive Organizations</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.organizations?.inactive || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Admins</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.admins?.total || 0}
          </p>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Recent Organizations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrganizations?.map((org: any) => (
                <tr key={org._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">{org.name}</td>
                  <td className="py-3 px-4 text-sm">{org.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        org.status === "active"
                          ? "bg-green-100 text-green-700"
                          : org.status === "inactive"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
