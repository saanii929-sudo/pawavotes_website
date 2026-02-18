"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  X,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Contestant {
  _id: string;
  nomineeId: string;
  nomineeName: string;
  categoryName: string;
  addedBy: "manual" | "qualification" | "initial";
  addedAt: string;
  sourceStageId?: string;
}

interface Nominee {
  _id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  image?: string;
}

interface Stage {
  _id: string;
  name: string;
  awardId: string;
  status: "upcoming" | "active" | "completed";
  order: number;
}

const ContestantManagement = () => {
  const params = useParams();
  const router = useRouter();
  const stageId = params.id as string;

  const [stage, setStage] = useState<Stage | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [availableNominees, setAvailableNominees] = useState<Nominee[]>([]);
  const [selectedNominees, setSelectedNominees] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingNominees, setLoadingNominees] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    fetchStage();
    fetchContestants();
  }, [stageId]);

  const fetchStage = async () => {
    try {
      const response = await fetch(`/api/stages/${stageId}`);
      if (response.ok) {
        const data = await response.json();
        setStage(data.data);
        fetchCategories(data.data.awardId);
      } else {
        toast.error("Failed to fetch stage details");
      }
    } catch (error) {
      toast.error("Failed to fetch stage details");
    }
  };

  const fetchCategories = async (awardId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/categories?awardId=${awardId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchContestants = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stages/${stageId}/contestants`);
      if (response.ok) {
        const data = await response.json();
        setContestants(data.data || []);
      } else {
        toast.error("Failed to fetch contestants");
      }
    } catch (error) {
      toast.error("Failed to fetch contestants");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableNominees = async () => {
    if (!stage) return;

    setLoadingNominees(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/nominees?awardId=${stage.awardId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const allNominees = data.data || [];
        
        // Filter out nominees already in stage
        const contestantNomineeIds = contestants.map((c) => c.nomineeId);
        const available = allNominees.filter(
          (n: Nominee) => !contestantNomineeIds.includes(n._id)
        );
        
        setAvailableNominees(available);
      } else {
        toast.error("Failed to fetch nominees");
      }
    } catch (error) {
      toast.error("Failed to fetch nominees");
    } finally {
      setLoadingNominees(false);
    }
  };

  const handleAddContestants = async () => {
    if (selectedNominees.length === 0) {
      toast.error("Please select at least one nominee");
      return;
    }

    const loadingToast = toast.loading("Adding contestants...");
    try {
      const response = await fetch(`/api/stages/${stageId}/contestants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomineeIds: selectedNominees }),
      });

      if (response.ok) {
        toast.success("Contestants added successfully!", { id: loadingToast });
        setShowAddModal(false);
        setSelectedNominees([]);
        fetchContestants();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to add contestants", {
          id: loadingToast,
        });
      }
    } catch (error) {
      toast.error("Failed to add contestants", { id: loadingToast });
    }
  };

  const handleRemoveContestant = async (nomineeId: string, nomineeName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${nomineeName} from this stage? Their existing votes will be preserved.`
      )
    )
      return;

    const loadingToast = toast.loading("Removing contestant...");
    try {
      const response = await fetch(
        `/api/stages/${stageId}/contestants/${nomineeId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Contestant removed successfully!", { id: loadingToast });
        fetchContestants();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to remove contestant", {
          id: loadingToast,
        });
      }
    } catch (error) {
      toast.error("Failed to remove contestant", { id: loadingToast });
    }
  };

  const toggleNomineeSelection = (nomineeId: string) => {
    setSelectedNominees((prev) =>
      prev.includes(nomineeId)
        ? prev.filter((id) => id !== nomineeId)
        : [...prev, nomineeId]
    );
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "manual":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            <Users size={12} />
            Manual
          </span>
        );
      case "qualification":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle size={12} />
            Qualified
          </span>
        );
      case "initial":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
            <AlertCircle size={12} />
            Initial
          </span>
        );
      default:
        return null;
    }
  };

  const filteredContestants =
    categoryFilter === "all"
      ? contestants
      : contestants.filter((c) => c.categoryName === categoryFilter);

  const filteredAvailableNominees =
    categoryFilter === "all"
      ? availableNominees
      : availableNominees.filter((n) => n.categoryName === categoryFilter);

  return (
    <div className="font-sans min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Manage Contestants
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {stage?.name} - {contestants.length} contestant(s)
            </p>
          </div>
          <button
            onClick={() => {
              fetchAvailableNominees();
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            Add Contestants
          </button>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-64 text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-gray-500">Loading contestants...</p>
          </div>
        ) : filteredContestants.length === 0 ? (
          <div
            className="bg-white rounded-xl border border-gray-200 flex items-center justify-center"
            style={{ minHeight: "400px" }}
          >
            <div className="text-center flex flex-col items-center gap-4">
              <Users size={48} className="text-gray-400" />
              <h2 className="text-xl md:text-2xl font-bold text-black mb-4">
                No contestants in this stage yet
              </h2>
              <button
                onClick={() => {
                  fetchAvailableNominees();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 cursor-pointer transition-colors font-medium"
              >
                <Plus size={20} />
                Add your first contestant
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
                      Nominee Name
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Added Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContestants.map((contestant) => (
                    <tr key={contestant._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {contestant.nomineeName}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {contestant.categoryName}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {getSourceBadge(contestant.addedBy)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(contestant.addedAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() =>
                            handleRemoveContestant(
                              contestant.nomineeId,
                              contestant.nomineeName
                            )
                          }
                          className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                        >
                          <Trash2 size={16} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Contestants Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => {
              setShowAddModal(false);
              setSelectedNominees([]);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 bg-green-600 sticky top-0 z-10">
                <h2 className="text-xl font-semibold text-white">
                  Add Contestants
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedNominees([]);
                  }}
                  className="text-white hover:text-white cursor-pointer transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {loadingNominees ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                    <p className="text-gray-500">Loading nominees...</p>
                  </div>
                ) : filteredAvailableNominees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No available nominees to add. All nominees are already in
                      this stage.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        Select nominees to add to this stage. Selected:{" "}
                        <span className="font-semibold">
                          {selectedNominees.length}
                        </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {filteredAvailableNominees.map((nominee) => (
                        <div
                          key={nominee._id}
                          onClick={() => toggleNomineeSelection(nominee._id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedNominees.includes(nominee._id)
                              ? "border-green-600 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedNominees.includes(nominee._id)}
                              onChange={() => {}}
                              className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {nominee.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {nominee.categoryName}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-6 mt-6 border-t">
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setSelectedNominees([]);
                        }}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddContestants}
                        disabled={selectedNominees.length === 0}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add {selectedNominees.length} Contestant(s)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContestantManagement;
