"use client";
import React, { useState, useEffect } from "react";
import { Plus, ChevronLeft, X, Info, Edit2, Trash2, MoreVertical } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

interface BulkVotePackage {
  _id: string;
  awardId: string;
  amount: number;
  votes: number;
  currency: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Award {
  _id: string;
  name: string;
  code: string;
  organizationName: string;
  status: string;
  categories: number;
  settings?: { showResults: boolean };
  banner?: string;
  pricing?: {
    votingCost: number;
  };
}

const BulkVotingManager = () => {
  const [currentScreen, setCurrentScreen] = useState("list");
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [bulkVotePackages, setBulkVotePackages] = useState<BulkVotePackage[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    votes: "",
    description: "",
  });
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  useEffect(() => {
    fetchAwards();
    fetchServiceFee();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchBulkVotePackages(selectedAward._id);
    }
  }, [selectedAward]);


  
  const fetchServiceFee = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServiceFeePercentage(data.data.serviceFeePercentage || 10);
      }
    } catch (error) {
      console.error("Failed to fetch service fee");
    }
  };

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/awards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAwards(data.data);
      } else {
        toast.error("Failed to fetch awards");
      }
    } catch (error) {
      toast.error("Failed to fetch awards");
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkVotePackages = async (awardId: string) => {
    setLoadingPackages(true);
    try {
      const response = await fetch(`/api/bulk-vote-packages?awardId=${awardId}&onlyActive=false`);
      if (response.ok) {
        const data = await response.json();
        setBulkVotePackages(data.data || []);
      } else {
        toast.error("Failed to fetch bulk vote packages");
      }
    } catch (error) {
      console.error("Failed to fetch bulk vote packages:", error);
      toast.error("Failed to fetch bulk vote packages");
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("bulk-voting");
  };

  const handleSubmit = async () => {
    if (!formData.amount || !formData.votes || !selectedAward) {
      toast.error("Please fill in all required fields");
      return;
    }

    const isEditing = !!editingPackageId;
    const loadingToast = toast.loading(
      isEditing ? "Updating bulk vote package..." : "Creating bulk vote package..."
    );

    try {
      const url = isEditing
        ? `/api/bulk-vote-packages/${editingPackageId}`
        : "/api/bulk-vote-packages";
      const method = isEditing ? "PUT" : "POST";

      const body = {
        amount: parseFloat(formData.amount),
        votes: parseInt(formData.votes),
        description: formData.description || undefined,
        ...(isEditing ? {} : { awardId: selectedAward._id }),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(
          isEditing
            ? "Bulk vote package updated successfully!"
            : "Bulk vote package created successfully!",
          { id: loadingToast }
        );
        setFormData({ amount: "", votes: "", description: "" });
        setEditingPackageId(null);
        setShowModal(false);
        fetchBulkVotePackages(selectedAward._id);
      } else {
        const data = await response.json();
        toast.error(
          data.message || (isEditing ? "Failed to update package" : "Failed to create package"),
          { id: loadingToast }
        );
      }
    } catch (error) {
      toast.error(
        isEditing ? "Failed to update package" : "Failed to create package",
        { id: loadingToast }
      );
    }
  };

  const handleEditPackage = (pkg: BulkVotePackage) => {
    setFormData({
      amount: pkg.amount.toString(),
      votes: pkg.votes.toString(),
      description: pkg.description || "",
    });
    setEditingPackageId(pkg._id);
    setShowModal(true);
    setShowActionMenu(null);
  };

  const handleDeletePackage = async (packageId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Bulk Vote Package",
      message: "Are you sure you want to delete this bulk vote package?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        const loadingToast = toast.loading("Deleting package...");
        try {
          const response = await fetch(`/api/bulk-vote-packages/${packageId}`, {
            method: "DELETE",
          });

          if (response.ok) {
            toast.success("Package deleted successfully!", { id: loadingToast });
            if (selectedAward) {
              fetchBulkVotePackages(selectedAward._id);
            }
            setShowActionMenu(null);
          } else {
            toast.error("Failed to delete package", { id: loadingToast });
          }
        } catch (error) {
          toast.error("Failed to delete package", { id: loadingToast });
        }
      }
    });
  };

  const handleToggleActive = async (packageId: string, currentStatus: boolean) => {
    const loadingToast = toast.loading("Updating package status...");
    try {
      const response = await fetch(`/api/bulk-vote-packages/${packageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success("Package status updated!", { id: loadingToast });
        if (selectedAward) {
          fetchBulkVotePackages(selectedAward._id);
        }
      } else {
        toast.error("Failed to update status", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to update status", { id: loadingToast });
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gray-50">
      {currentScreen === "list" ? (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Manage Bulk Voting
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select an award program to proceed with bulk voting management.
              </p>
            </div>
            <button
              onClick={() => (window.location.href = "/dashboard/awards")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <Plus size={18} />
              Create New Award
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading awards...</p>
            </div>
          ) : awards.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-16 md:p-24 flex flex-col items-center justify-center">
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 text-center">
                No award created yet
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-6 text-center">
                Create an award to be able to manage bulk voting.
              </p>
              <button
                onClick={() => (window.location.href = "/dashboard/awards")}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                <Plus size={18} />
                Create New Award
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {awards.map((award) => (
                <div
                  key={award._id}
                  onClick={() => handleSelectAward(award)}
                  className="group overflow-hidden rounded-xl bg-white shadow transition cursor-pointer hover:shadow-lg"
                >
                  <div className="relative aspect-square h-48 sm:h-56 md:h-60 w-full overflow-hidden">
                    <Image
                      src={award.banner || "/images/events/event-1.png"}
                      alt={award.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-0 p-3 sm:p-4 left-0 right-0 flex justify-between items-center">
                      <div className="bg-white/80 py-1 px-2 rounded-full">
                        <p className="text-[9px] sm:text-[10px] text-black font-semibold">
                          Price (GHS {award.pricing?.votingCost?.toFixed(2) || '0.50'})
                        </p>
                      </div>
                      <div
                        className={`${
                          award.status === "active"
                            ? "bg-green-600"
                            : award.status === "voting"
                              ? "bg-blue-600"
                              : "bg-yellow-600"
                        } py-1 px-2 rounded-full`}
                      >
                        <p className="text-[9px] sm:text-[10px] text-white font-semibold uppercase">
                          {award.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex-1">
                        {award.name}
                      </h3>
                      <p className="text-red-700 font-bold text-xs">
                        {award.code}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
                      {award.organizationName}
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">Categories</span>
                        <p className="font-semibold text-gray-900 text-sm">{award.categories}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">Show Results</span>
                        <p className="font-semibold text-gray-900 text-sm text-end">
                          {award.settings?.showResults ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    <p className="text-green-600 text-[10px] sm:text-xs mt-3 flex items-start sm:items-center gap-1">
                      <Info size={12} className="shrink-0 mt-0.5 sm:mt-0" />
                      <span>{serviceFeePercentage}% service fee later applied for all awards.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {currentScreen === "bulk-voting" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <button
            onClick={() => {
              setCurrentScreen("list");
              setSelectedAward(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Bulk Voting: {selectedAward?.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Manage large-scale vote packages and pricing.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Plus size={18} />
              Add Bulk Votes
            </button>
          </div>

          {loadingPackages ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading packages...</p>
            </div>
          ) : bulkVotePackages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center" style={{ minHeight: "400px" }}>
              <div className="text-center flex flex-col items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-black mb-4">
                  You do not have any Bulk Voting packages.
                </h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 cursor-pointer transition-colors font-medium"
                >
                  <Plus size={20} />
                  Add your first bulk vote package
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Votes
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bulkVotePackages.map((pkg) => (
                      <tr key={pkg._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {pkg.currency} {pkg.amount.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{pkg.votes} votes</div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {pkg.description || "-"}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(pkg._id, pkg.isActive)}
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pkg.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {pkg.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(pkg.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative inline-block">
                            <button
                              onClick={() =>
                                setShowActionMenu(showActionMenu === pkg._id ? null : pkg._id)
                              }
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={18} className="text-gray-400" />
                            </button>

                            {showActionMenu === pkg._id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <button
                                  onClick={() => handleEditPackage(pkg)}
                                  className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                                >
                                  <Edit2 size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePackage(pkg._id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => {
              setShowModal(false);
              setFormData({ amount: "", votes: "", description: "" });
              setEditingPackageId(null);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex bg-green-600 justify-between p-4 rounded-t-xl items-center">
                <h2 className="text-xl font-semibold text-white">
                  {editingPackageId ? "Edit Bulk Vote Package" : "Add Bulk Vote Package"}
                </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({ amount: "", votes: "", description: "" });
                  setEditingPackageId(null);
                }}
                className="absolute top-4 right-4 text-white cursor-pointer hover:bg-green-700 hover:rounded-xl p-1 hover:text-white transition-colors"
              >
                <X size={24} />
              </button></div>

              <div className="p-6">

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (GHS) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="Enter amount (e.g., 10.00)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Votes <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.votes}
                      onChange={(e) => setFormData({ ...formData, votes: e.target.value })}
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="Enter number of votes (e.g., 100)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                      placeholder="Enter package description..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setFormData({ amount: "", votes: "", description: "" });
                        setEditingPackageId(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!formData.amount || !formData.votes}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {editingPackageId ? "Update" : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
};

export default BulkVotingManager;
