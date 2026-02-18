"use client";
import { useState, useEffect } from "react";
import { Search, Save, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

interface Organization {
  _id: string;
  name: string;
  email: string;
  serviceFeePercentage: number;
  status: string;
  createdAt: string;
}

const ServiceFeesManagement = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalFee, setGlobalFee] = useState("10");
  const [editingFees, setEditingFees] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = organizations.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(organizations);
    }
  }, [searchQuery, organizations]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data || []);
        setFilteredOrgs(data.data || []);
      } else {
        toast.error("Failed to fetch organizations");
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleFeeChange = (orgId: string, value: string) => {
    setEditingFees((prev) => ({ ...prev, [orgId]: value }));
  };

  const updateServiceFee = async (orgId: string) => {
    const feeValue = editingFees[orgId];
    const fee = parseFloat(feeValue);

    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Service fee must be between 0 and 100");
      return;
    }

    setSaving((prev) => ({ ...prev, [orgId]: true }));
    const loadingToast = toast.loading("Updating service fee...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serviceFeePercentage: fee }),
      });

      if (response.ok) {
        toast.success("Service fee updated successfully!", { id: loadingToast });
        fetchOrganizations();
        setEditingFees((prev) => {
          const newFees = { ...prev };
          delete newFees[orgId];
          return newFees;
        });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update service fee", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to update service fee", { id: loadingToast });
    } finally {
      setSaving((prev) => ({ ...prev, [orgId]: false }));
    }
  };

  const updateAllServiceFees = async () => {
    const fee = parseFloat(globalFee);

    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Service fee must be between 0 and 100");
      return;
    }

    if (!confirm(`Are you sure you want to set ${fee}% service fee for ALL organizations?`)) {
      return;
    }

    const loadingToast = toast.loading("Updating all service fees...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/service-fees/bulk-update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serviceFeePercentage: fee }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Updated ${data.count} organizations successfully!`, { id: loadingToast });
        fetchOrganizations();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update service fees", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to update service fees", { id: loadingToast });
    }
  };

  const resetToDefault = async (orgId: string) => {
    setSaving((prev) => ({ ...prev, [orgId]: true }));
    const loadingToast = toast.loading("Resetting to default...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/superadmin/organizations/${orgId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ serviceFeePercentage: 10 }),
      });

      if (response.ok) {
        toast.success("Reset to default 10%!", { id: loadingToast });
        fetchOrganizations();
      } else {
        toast.error("Failed to reset", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to reset", { id: loadingToast });
    } finally {
      setSaving((prev) => ({ ...prev, [orgId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Service Fee Management
          </h1>
          <p className="text-gray-600">
            Manage service fee percentages for all organizations
          </p>
        </div>

        {/* Global Update Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Set Global Service Fee
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Fee Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalFee}
                  onChange={(e) => setGlobalFee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  %
                </span>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={updateAllServiceFees}
                className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Apply to All Organizations
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This will update the service fee for all organizations at once
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Organizations Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Loading organizations...</p>
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              {searchQuery ? "No organizations found" : "No organizations yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service Fee
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrgs.map((org) => (
                      <tr key={org._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {org.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{org.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              org.status === "active"
                                ? "bg-green-100 text-green-800"
                                : org.status === "suspended"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="relative w-24">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={
                                  editingFees[org._id] !== undefined
                                    ? editingFees[org._id]
                                    : org.serviceFeePercentage
                                }
                                onChange={(e) =>
                                  handleFeeChange(org._id, e.target.value)
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                                %
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {editingFees[org._id] !== undefined && (
                              <button
                                onClick={() => updateServiceFee(org._id)}
                                disabled={saving[org._id]}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Save size={14} />
                                {saving[org._id] ? "Saving..." : "Save"}
                              </button>
                            )}
                            <button
                              onClick={() => resetToDefault(org._id)}
                              disabled={saving[org._id]}
                              className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <RefreshCw size={14} />
                              Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredOrgs.map((org) => (
                <div
                  key={org._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3"
                >
                  {/* Organization Name & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500 break-all">{org.email}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        org.status === "active"
                          ? "bg-green-100 text-green-800"
                          : org.status === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {org.status}
                    </span>
                  </div>

                  {/* Service Fee Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Service Fee Percentage
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={
                          editingFees[org._id] !== undefined
                            ? editingFees[org._id]
                            : org.serviceFeePercentage
                        }
                        onChange={(e) =>
                          handleFeeChange(org._id, e.target.value)
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {editingFees[org._id] !== undefined && (
                      <button
                        onClick={() => updateServiceFee(org._id)}
                        disabled={saving[org._id]}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        <Save size={16} />
                        {saving[org._id] ? "Saving..." : "Save Changes"}
                      </button>
                    )}
                    <button
                      onClick={() => resetToDefault(org._id)}
                      disabled={saving[org._id]}
                      className={`${editingFees[org._id] !== undefined ? 'flex-1' : 'w-full'} inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium`}
                    >
                      <RefreshCw size={16} />
                      Reset to 10%
                    </button>
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

export default ServiceFeesManagement;
