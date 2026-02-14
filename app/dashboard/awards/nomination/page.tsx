'use client';
import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  MoreVertical,
  ChevronLeft,
  Coffee,
  Info,
  Check,
  X,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface Award {
  _id: string;
  name: string;
  code: string;
  organizationName: string;
  status: string;
  categories: number;
  settings?: { showResults: boolean };
  banner?: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Nominee {
  _id: string;
  name: string;
  nomineeCode?: string;
  categoryId: { _id: string; name: string };
  image?: string;
  bio?: string;
  email?: string;
  phone?: string;
  nominationStatus: 'pending' | 'accepted' | 'rejected';
  nominationType: 'organizer' | 'self';
  status: string;
  createdAt: string;
}

const AwardNomineesManager = () => {
  const [currentScreen, setCurrentScreen] = useState("list");
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNominees, setLoadingNominees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAwards();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchCategories(selectedAward._id);
      fetchNominees(selectedAward._id);
    }
  }, [selectedAward, searchQuery, selectedCategoryFilter, statusFilter]);

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

  const fetchCategories = async (awardId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/categories?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchNominees = async (awardId: string) => {
    setLoadingNominees(true);
    try {
      const token = localStorage.getItem("token");
      let url = `/api/nominees?awardId=${awardId}`;
      
      if (selectedCategoryFilter && selectedCategoryFilter !== "all") {
        url += `&categoryId=${selectedCategoryFilter}`;
      }
      
      if (statusFilter) {
        url += `&status=${statusFilter.toLowerCase()}`;
      }
      
      if (searchQuery) {
        url += `&search=${searchQuery}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNominees(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch nominees:", error);
    } finally {
      setLoadingNominees(false);
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("nominations");
  };

  const handleUpdateNominationStatus = async (
    nomineeId: string,
    newStatus: 'pending' | 'accepted' | 'rejected'
  ) => {
    const action = newStatus === 'accepted' ? 'approve' : 'decline';
    const loadingToast = toast.loading(`${action === 'approve' ? 'Approving' : 'Declining'} nomination...`);
    
    try {
      const token = localStorage.getItem("token");
      const endpoint = newStatus === 'accepted' 
        ? `/api/nominees/${nomineeId}/approve`
        : `/api/nominees/${nomineeId}/decline`;
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || `Nomination ${newStatus} successfully!`, { id: loadingToast });
        if (selectedAward) {
          fetchNominees(selectedAward._id);
        }
        setShowActionMenu(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update nomination status", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to update nomination status", { id: loadingToast });
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-orange-100 text-orange-600';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gray-50">
      {currentScreen === "list" ? (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Manage Nominations
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select an award program to view and manage nomination requests.
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
                Create an award to be able to manage nominations.
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
                          Price (GHS 0.50)
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
                        <span className="text-gray-500 text-[10px] sm:text-xs">
                          Categories
                        </span>
                        <p className="font-semibold text-gray-900 text-sm">
                          {award.categories}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">
                          Show Results
                        </span>
                        <p className="font-semibold text-gray-900 text-sm text-end">
                          {award.settings?.showResults ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    <p className="text-green-600 text-[10px] sm:text-xs mt-3 flex items-start sm:items-center gap-1">
                      <Info size={12} className="shrink-0 mt-0.5 sm:mt-0" />
                      <span>10% service fee later applied for all awards.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {currentScreen === "nominations" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <button
            onClick={() => {
              setCurrentScreen("list");
              setSelectedAward(null);
              setSearchQuery("");
              setSelectedCategoryFilter("all");
              setStatusFilter(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">
              Nominations: {selectedAward?.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Review and manage nomination requests for this award program.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="w-full relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by nominee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-black pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <button
                  onClick={() => setCategoryFilterOpen(!categoryFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Filter size={16} className="text-gray-500 shrink-0" />
                    <span className="text-xs sm:text-sm text-gray-700 truncate">
                      {selectedCategoryFilter === "all"
                        ? "All categories"
                        : categories.find((c) => c._id === selectedCategoryFilter)?.name ||
                          "All categories"}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500 shrink-0" />
                </button>

                {categoryFilterOpen && (
                  <div className="absolute top-full mt-2 w-full sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCategoryFilter("all");
                        setCategoryFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                        selectedCategoryFilter === "all"
                          ? "bg-green-50 text-green-700"
                          : "text-gray-700"
                      }`}
                    >
                      All categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => {
                          setSelectedCategoryFilter(category._id);
                          setCategoryFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                          selectedCategoryFilter === category._id
                            ? "bg-green-50 text-green-700"
                            : "text-gray-700"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative sm:w-auto">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors w-full sm:w-auto justify-center ${
                    statusFilter
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Filter size={16} />
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    Status | {statusFilter || "All"}
                  </span>
                </button>

                {filterOpen && (
                  <div className="absolute top-full mt-2 right-0 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <button
                      onClick={() => {
                        setStatusFilter(null);
                        setFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                        !statusFilter ? "bg-green-50 text-green-700" : "text-gray-700"
                      }`}
                    >
                      All
                    </button>
                    {["Pending", "Accepted", "Rejected"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                          statusFilter === status
                            ? "bg-green-50 text-green-700"
                            : "text-gray-700"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {loadingNominees ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading nominations...</p>
            </div>
          ) : nominees.length > 0 ? (
            <div className="space-y-3">
              {nominees.map((nominee) => (
                <div
                  key={nominee._id}
                  className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex md:hidden flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm shrink-0">
                          {getInitials(nominee.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 text-sm truncate">
                              {nominee.name}
                            </h3>
                            {nominee.nomineeCode && (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                {nominee.nomineeCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {nominee.categoryId.name}
                          </p>
                          {nominee.nominationType === 'self' && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                              Self-Nomination
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          onClick={() =>
                            setShowActionMenu(
                              showActionMenu === nominee._id ? null : nominee._id
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>

                        {showActionMenu === nominee._id && nominee.nominationStatus === 'pending' && (
                          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() =>
                                handleUpdateNominationStatus(nominee._id, "accepted")
                              }
                              className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                            >
                              <Check size={14} className="text-green-600" />
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateNominationStatus(nominee._id, "rejected")
                              }
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-block px-3 py-1 rounded text-xs font-medium ${getStatusColor(
                          nominee.nominationStatus
                        )}`}
                      >
                        {nominee.nominationStatus.charAt(0).toUpperCase() +
                          nominee.nominationStatus.slice(1)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(nominee.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-semibold text-sm shrink-0">
                        {getInitials(nominee.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {nominee.name}
                          </h3>
                          {nominee.nomineeCode && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                              {nominee.nomineeCode}
                            </span>
                          )}
                        </div>
                        {nominee.nominationType === 'self' && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                            Self-Nomination
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 flex-1 min-w-0">
                        <div className="w-4 h-4 rounded-full border-2 border-gray-400 shrink-0"></div>
                        <span className="truncate">{nominee.categoryId.name}</span>
                      </div>
                      <div className="flex-1 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                            nominee.nominationStatus
                          )}`}
                        >
                          {nominee.nominationStatus.charAt(0).toUpperCase() +
                            nominee.nominationStatus.slice(1)}
                        </span>
                      </div>
                      <div className="flex-1 text-right text-sm text-gray-500 min-w-0">
                        <span className="truncate block">
                          {new Date(nominee.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          onClick={() =>
                            setShowActionMenu(
                              showActionMenu === nominee._id ? null : nominee._id
                            )
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={20} className="text-gray-500" />
                        </button>

                        {showActionMenu === nominee._id && nominee.nominationStatus === 'pending' && (
                          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() =>
                                handleUpdateNominationStatus(nominee._id, "accepted")
                              }
                              className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                            >
                              <Check size={14} className="text-green-600" />
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateNominationStatus(nominee._id, "rejected")
                              }
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 sm:py-20">
              <div className="text-center">
                <Coffee size={40} className="mx-auto text-green-600 mb-4" />
                <p className="text-gray-500 text-sm">No nominations found</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AwardNomineesManager;
