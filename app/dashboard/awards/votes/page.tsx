"use client";
import React, { useEffect, useState } from "react";
import {
  Plus,
  ChevronLeft,
  Search,
  Grid3x3,
  Filter,
  MoreHorizontal,
  Download,
  AlertCircle,
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

interface Vote {
  _id: string;
  awardId: string;
  categoryId: string;
  nomineeId: string;
  voterEmail: string;
  voterPhone: string;
  numberOfVotes: number;
  amount: number;
  bulkPackageId?: string;
  paymentReference: string;
  paymentMethod: string;
  paymentStatus: "completed" | "pending" | "failed";
  createdAt: string;
  nominee?: {
    name: string;
    image?: string;
  };
  category?: {
    name: string;
  };
}

interface Category {
  _id: string;
  name: string;
  awardId: string;
}

interface Nominee {
  _id: string;
  name: string;
  categoryId: string;
  image?: string;
}

const ManageVotesEnhanced = () => {
  const [currentScreen, setCurrentScreen] = useState<"list" | "votes">("list");
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showAddVotesModal, setShowAddVotesModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedNominee, setSelectedNominee] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [numberOfVotes, setNumberOfVotes] = useState("");
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [savingVote, setSavingVote] = useState(false);
  const [showCategoryDropdownInModal, setShowCategoryDropdownInModal] = useState(false);
  const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);

  useEffect(() => {
    fetchAwards();
    fetchServiceFee();
    fetchAwards();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchVotes(selectedAward._id);
      fetchCategories(selectedAward._id);
      fetchNominees(selectedAward._id);
    }
  }, [selectedAward]);

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

  const fetchVotes = async (awardId: string) => {
    setLoadingVotes(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/votes?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVotes(data.data || []);
      } else {
        toast.error("Failed to fetch votes");
      }
    } catch (error) {
      console.error("Failed to fetch votes:", error);
      toast.error("Failed to fetch votes");
    } finally {
      setLoadingVotes(false);
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
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchNominees = async (awardId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/nominees?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched nominees:', data.data);
        setNominees(data.data || []);
      } else {
        console.error('Failed to fetch nominees:', response.status);
      }
    } catch (error) {
      console.error("Failed to fetch nominees:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-orange-500";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "Successful";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  };

  const handleAddVotes = async () => {
    if (!selectedNominee || !selectedCategory || !numberOfVotes) {
      toast.error("Please fill in all required fields");
      return;
    }

    const votesNum = parseInt(numberOfVotes);
    if (isNaN(votesNum) || votesNum <= 0) {
      toast.error("Please enter a valid number of votes");
      return;
    }

    setSavingVote(true);
    const loadingToast = toast.loading("Adding votes...");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/votes/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          awardId: selectedAward?._id,
          categoryId: selectedCategory,
          nomineeId: selectedNominee,
          numberOfVotes: votesNum,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Votes added successfully!", { id: loadingToast });
        setShowAddVotesModal(false);
        setSelectedNominee("");
        setSelectedCategory("");
        setNumberOfVotes("");
        fetchVotes(selectedAward!._id);
      } else {
        toast.error(data.error || "Failed to add votes", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to add votes", { id: loadingToast });
    } finally {
      setSavingVote(false);
    }
  };

  const handleDownloadCodes = () => {
    if (filteredVotes.length === 0) {
      toast.error("No votes to download");
      return;
    }

    const headers = ["Payment Reference", "Nominee", "Category", "Votes", "Amount", "Type", "Status", "Date"];
    const rows = filteredVotes.map(vote => [
      vote.paymentReference,
      vote.nominee?.name || "N/A",
      vote.category?.name || "N/A",
      vote.numberOfVotes,
      `GHS ${vote.amount.toFixed(2)}`,
      vote.bulkPackageId ? "Bulk" : "Normal",
      getStatusLabel(vote.paymentStatus),
      new Date(vote.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `votes_${selectedAward?.name.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Votes downloaded successfully!");
  };

  const filteredNominees = selectedCategory
    ? nominees.filter(n => {
        let nomineeCategoryId;
        
        if (typeof n.categoryId === 'object' && n.categoryId !== null) {
          nomineeCategoryId = (n.categoryId as any)._id?.toString() || (n.categoryId as any).toString();
        } else {
          nomineeCategoryId = n.categoryId?.toString();
        }
        
        console.log('Comparing:', nomineeCategoryId, 'with', selectedCategory);
        return nomineeCategoryId === selectedCategory;
      })
    : nominees;

  const getSelectedCategoryName = () => {
    const category = categories.find(c => c._id === selectedCategory);
    return category ? category.name : "Select Category";
  };

  const filterOptions = [
    { id: "all", label: "All" },
    { id: "completed", label: "Successful" },
    { id: "pending", label: "Pending" },
    { id: "failed", label: "Failed" },
  ];

  const filteredVotes =
    selectedFilter === "all"
      ? votes
      : votes.filter((vote) => vote.paymentStatus.toLowerCase() === selectedFilter);

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("votes");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {" "}
      {currentScreen === "list" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Manage Transfer
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select an award program to proceed with transfer management.
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
                Create an award to be able to manage transfers.
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
      {currentScreen === "votes" && (
        <>
          <button
            onClick={() => setCurrentScreen("list")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>

          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Votes: {selectedAward?.name}
              </h1>
              <p className="text-gray-500 mt-1">
                Manage large-scale vote imports and historical records.
              </p>
            </div>
            <button
              onClick={() => setShowAddVotesModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Add Votes
            </button>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by transaction ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown);
                  setShowFilterDropdown(false);
                  setShowMoreOptions(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 min-w-50 justify-between"
              >
                <div className="flex items-center gap-2">
                  <Grid3x3 size={18} className="text-gray-500" />
                  <span className="text-gray-700">All categories</span>
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
                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => setShowCategoryDropdown(false)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 text-sm"
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowFilterDropdown(!showFilterDropdown);
                  setShowCategoryDropdown(false);
                  setShowMoreOptions(false);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2"
              >
                <Filter size={18} className="text-gray-500" />
                <span className="text-gray-700">Filter</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedFilter(option.id);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                        option.id === selectedFilter
                          ? "bg-green-50 text-green-700"
                          : "text-gray-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowMoreOptions(!showMoreOptions);
                  setShowFilterDropdown(false);
                  setShowCategoryDropdown(false);
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2"
              >
                <MoreHorizontal size={18} className="text-gray-500" />
                <span className="text-gray-700">More Options</span>
              </button>

              {showMoreOptions && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button 
                    onClick={() => {
                      handleDownloadCodes();
                      setShowMoreOptions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-700 rounded-t-lg flex items-center gap-2"
                  >
                    <Download size={16} />
                    <span>Download Codes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {loadingVotes ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading votes...</p>
            </div>
          ) : filteredVotes.length === 0 ? (
            <>
              <div className="bg-white rounded-lg shadow-sm p-16">
                <div className="max-w-md mx-auto text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No Votes yet
                  </h2>
                  <p className="text-gray-500">Direct & Transparent Voting</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                {filteredVotes.map((vote) => {
                  const initials = getInitials(vote.nominee?.name || "N/A");
                  const statusColor = getStatusColor(vote.paymentStatus);
                  const statusLabel = getStatusLabel(vote.paymentStatus);
                  
                  return (
                    <div
                      key={vote._id}
                      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-green-700 font-semibold">
                            {initials}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">
                            {vote.nominee?.name || "N/A"}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {vote.category?.name || "N/A"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            GHS {vote.amount.toFixed(2)}
                          </p>
                        </div>

                        <div className="text-right min-w-25">
                          <p className="text-gray-600">{vote.numberOfVotes} votes</p>
                        </div>

                        <div className="text-right min-w-20">
                          <p className="text-gray-600">
                            {vote.bulkPackageId ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Bulk
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Normal
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="text-right min-w-40">
                          <p className="text-gray-600 text-sm">
                            {new Date(vote.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="text-right min-w-25">
                          <span className={`font-medium ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
      {showAddVotesModal && (
        <>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
                <h2 className="text-lg font-semibold">Add Votes</h2>
                <p className="text-sm text-green-100">
                  All votes count directly toward final results.
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>
                    Votes added via this section will not be added to your
                    revenue.
                  </p>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => setShowCategoryDropdownInModal(!showCategoryDropdownInModal)}
                    className="w-full px-4 py-2.5 border-2 border-green-500 rounded-lg text-left flex justify-between items-center"
                  >
                    <span className={selectedCategory ? "text-gray-900" : "text-gray-400"}>
                      {getSelectedCategoryName()}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${showCategoryDropdownInModal ? "" : "rotate-180"}`}
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

                  {showCategoryDropdownInModal && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-green-500 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {categories.length === 0 ? (
                        <div className="px-4 py-2.5 text-gray-500 text-sm">
                          No categories available
                        </div>
                      ) : (
                        categories.map((category) => (
                          <button
                            key={category._id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(category._id);
                              setSelectedNominee(""); // Reset nominee when category changes
                              setShowCategoryDropdownInModal(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-gray-700 text-sm first:rounded-t-lg last:rounded-b-lg"
                          >
                            {category.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nominee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedNominee}
                    onChange={(e) => setSelectedNominee(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={!selectedCategory}
                  >
                    <option value="">
                      {selectedCategory ? "Select nominee" : "Select category first"}
                    </option>
                    {filteredNominees.map((nominee) => (
                      <option key={nominee._id} value={nominee._id}>
                        {nominee.name}
                      </option>
                    ))}
                  </select>
                  {selectedCategory && filteredNominees.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      No nominees found in this category
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Votes <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="E.g. 1000"
                    value={numberOfVotes}
                    onChange={(e) => setNumberOfVotes(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowAddVotesModal(false);
                    setSelectedNominee("");
                    setSelectedCategory("");
                    setNumberOfVotes("");
                    setShowCategoryDropdownInModal(false);
                  }}
                  disabled={savingVote}
                  className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddVotes}
                  disabled={savingVote}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingVote ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageVotesEnhanced;
