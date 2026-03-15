"use client";
import React, { useEffect, useState } from "react";
import {
  Plus,
  ChevronLeft,
  Search,
  Grid3x3,
  MoreHorizontal,
  BarChart3,
  Table,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

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

interface Category {
  _id: string;
  name: string;
}

interface Nominee {
  _id: string;
  name: string;
  nomineeCode?: string;
  categoryId: {
    _id: string;
    name: string;
  };
  image?: string;
  voteCount: number;
}

const ManageResultsComplete = () => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [currentScreen, setCurrentScreen] = useState<"list" | "results">(
    "list",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [awards, setAwards] = useState<Award[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);
  const [loadingNominees, setLoadingNominees] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNominees, setTotalNominees] = useState(0);

  useEffect(() => {
    fetchAwards();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      setCurrentPage(1);
      fetchAwardData(selectedAward._id, 1);
    }
  }, [selectedAward]);

  // Debounce search/filter changes — reset to page 1
  useEffect(() => {
    if (!selectedAward) return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchAwardData(selectedAward._id, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  
  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/awards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAwards(data.data);
        if (data.serviceFeePercentage != null) {
          setServiceFeePercentage(data.serviceFeePercentage);
        }
      } else {
        toast.error("Failed to fetch awards");
      }
    } catch (error) {
      toast.error("Failed to fetch awards");
    } finally {
      setLoading(false);
    }
  };

  const fetchAwardData = async (awardId: string, page = currentPage) => {
    setLoadingNominees(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '8');
      if (selectedCategory && selectedCategory !== "all") {
        params.set('categoryId', selectedCategory);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      const url = `/api/awards/${awardId}/nominees-data?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
        const sortedNominees = (data.nominees || []).sort((a: Nominee, b: Nominee) => 
          (b.voteCount || 0) - (a.voteCount || 0)
        );
        setNominees(sortedNominees);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.pages);
        setTotalNominees(data.pagination.total);
      }
    } catch (error) {
      toast.error("Failed to load results");
    } finally {
      setLoadingNominees(false);
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("results");
  };

  // Calculate total votes for percentage calculation
  const totalVotes = nominees.reduce((sum, n) => sum + (n.voteCount || 0), 0);
  
  // Get max votes for graph scaling
  const maxVotes = Math.max(...nominees.map((n) => n.voteCount || 0), 1);
  
  // Helper function to get initials
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };
  
  // Helper function to calculate percentage
  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === "list" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Manage Payments
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select an award program to proceed with payment management.
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
                Create an award to be able to manage payments.
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
                      <span>{serviceFeePercentage}% service fee later applied for all awards.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {currentScreen === "results" && (
        <>
          <button
            onClick={() => setCurrentScreen("list")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Results: {selectedAward?.name}
            </h1>
            <p className="text-gray-500 mt-1">see all results.</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-black pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 min-w-50 justify-between"
              >
                <div className="flex items-center gap-2">
                  <Grid3x3 size={18} className="text-gray-500" />
                  <span className="text-gray-700">
                    {selectedCategory === "all" 
                      ? "All Categories" 
                      : categories.find((c) => c._id === selectedCategory)?.name || "All Categories"}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-70">
                  <div className="max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 ${
                        selectedCategory === "all"
                          ? "text-green-600 bg-green-50"
                          : "text-gray-700"
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => {
                          setSelectedCategory(category._id);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 ${
                          category._id === selectedCategory
                            ? "text-green-600 bg-green-50"
                            : "text-gray-700"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              {" "}
              {showMoreOptions ? (
                <>
                  <div className="inline-flex rounded-lg border border-gray-300 bg-white">
                    <button
                      onClick={() => {
                        setViewMode("table");
                      }}
                      className={`px-4 py-2 flex items-center gap-2 rounded-l-lg transition-colors ${
                        viewMode === "table"
                          ? "bg-green-600 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Table size={18} />
                      <span>Table</span>
                    </button>
                    <button
                      onClick={() => setViewMode("graph")}
                      className={`px-4 py-2 flex items-center gap-2 rounded-r-lg transition-colors ${
                        viewMode === "graph"
                          ? "bg-green-600 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <BarChart3 size={18} />
                      <span>Graph</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowMoreOptions(true)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2"
                  >
                    <MoreHorizontal size={18} className="text-gray-500" />
                    <span className="text-gray-700">More Options</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {loadingNominees ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-500">Loading results...</p>
              </div>
            ) : nominees.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">No results found</p>
              </div>
            ) : viewMode === "table" ? (
              <>
                {nominees.map((nominee) => {
                  const percentage = getPercentage(nominee.voteCount || 0);
                  return (
                    <div
                      key={nominee._id}
                      className="p-6 border-b border-gray-100 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-700 font-semibold">
                            {getInitials(nominee.name)}
                          </span>
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {nominee.name}
                          </h3>
                          {nominee.nomineeCode && (
                            <span className="text-xs text-red-600 font-bold">
                              {nominee.nomineeCode}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 rounded-full">
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          <span className="text-sm text-green-700">
                            {nominee.categoryId.name}
                          </span>
                        </div>

                        <div className="text-right min-w-30">
                          <span className="text-gray-600">
                            {nominee.voteCount || 0} Valid Votes
                          </span>
                        </div>

                        <div className="w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-600"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 min-w-8.75">
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-sm p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Visual Breakdown
                  </h2>
                  <p className="text-gray-500 mb-8">
                    Comparative vote analytics for the selected candidates.
                  </p>

                  <div className="space-y-6">
                    {nominees.map((nominee) => (
                      <div key={nominee._id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {nominee.name}
                            </span>
                            {nominee.nomineeCode && (
                              <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                                {nominee.nomineeCode}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-600">
                            {(nominee.voteCount || 0).toLocaleString()} Votes
                          </span>
                        </div>

                        <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className="h-full bg-green-600 transition-all duration-500 ease-out"
                            style={{
                              width: `${((nominee.voteCount || 0) / maxVotes) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 mt-4">
              <p className="text-xs sm:text-sm text-gray-500">
                Showing {((currentPage - 1) * 8) + 1}–{Math.min(currentPage * 8, totalNominees)} of {totalNominees}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { const p = currentPage - 1; setCurrentPage(p); if (selectedAward) fetchAwardData(selectedAward._id, p); }}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs sm:text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => { const p = currentPage + 1; setCurrentPage(p); if (selectedAward) fetchAwardData(selectedAward._id, p); }}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ManageResultsComplete;
