"use client";
import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Search,
  Grid3x3,
  ChevronDown,
  Plus,
  Info,
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
  pricing?: {
    votingCost: number;
  };
}

interface Category {
  _id: string;
  name: string;
}

interface Payment {
  _id: string;
  transactionId: string;
  nomineeId: {
    _id: string;
    name: string;
    categoryId: { _id: string; name: string };
  };
  awardId: string;
  paymentMethod: 'mobile_money' | 'bank_transfer' | 'card' | 'manual';
  amount: number;
  currency: string;
  voteCount: number;
  status: 'successful' | 'pending' | 'failed' | 'refunded';
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

const PaymentManagementSystem = () => {
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [currentScreen, setCurrentScreen] = useState<"list" | "payment">("list");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [awards, setAwards] = useState<Award[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);  const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    fetchAwards();    
    fetchServiceFee();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchCategories(selectedAward._id);
      fetchPayments(selectedAward._id);
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

  const fetchPayments = async (awardId: string) => {
    setLoadingPayments(true);
    try {
      const token = localStorage.getItem("token");
      
      // Fetch nomination payments
      const nominationResponse = await fetch(`/api/payments?awardId=${awardId}`);
      let nominationPayments: any[] = [];
      if (nominationResponse.ok) {
        const data = await nominationResponse.json();
        nominationPayments = (data.data || []).map((p: any) => ({
          ...p,
          paymentType: 'nomination'
        }));
      }

      // Fetch voting payments
      const votingResponse = await fetch(`/api/votes?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let votingPayments: any[] = [];
      if (votingResponse.ok) {
        const data = await votingResponse.json();
        votingPayments = (data.data || []).map((v: any) => ({
          _id: v._id,
          transactionId: v.paymentReference,
          nomineeId: {
            _id: v.nomineeId,
            name: 'Voting Payment', // We'll need to fetch nominee details
            categoryId: { _id: v.categoryId, name: 'Vote' }
          },
          awardId: v.awardId,
          paymentMethod: v.paymentMethod || 'mobile_money',
          amount: v.amount,
          currency: 'GHS',
          voteCount: v.numberOfVotes,
          status: v.paymentStatus === 'completed' ? 'successful' : v.paymentStatus,
          reference: v.paymentReference,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          paymentType: 'voting'
        }));
      }

      // Combine and sort by date
      const allPayments = [...nominationPayments, ...votingPayments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setPayments(allPayments);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      toast.error("Failed to fetch payments");
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("payment");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "successful":
        return "text-green-600";
      case "pending":
        return "text-orange-500";
      case "failed":
        return "text-red-600";
      case "refunded":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "successful":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-orange-100 text-orange-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "mobile_money":
        return "Mobile Money";
      case "bank_transfer":
        return "Bank Transfer";
      case "card":
        return "Card";
      case "manual":
        return "Manual";
      default:
        return method;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    if (selectedCategory !== "all" && payment.nomineeId.categoryId._id !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        payment.transactionId.toLowerCase().includes(query) ||
        payment.nomineeId.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const calculateTotalAmount = () => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateSuccessfulPayments = () => {
    return filteredPayments.filter((p) => p.status === "successful").length;
  };

  const calculateTotalVotes = () => {
    return filteredPayments.reduce((sum, p) => sum + p.voteCount, 0);
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
      )}

      {currentScreen === "payment" && selectedAward && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <button
            onClick={() => {
              setCurrentScreen("list");
              setSelectedAward(null);
              setSearchQuery("");
              setSelectedCategory("all");
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Payment: {selectedAward.name}
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Real-time ledger of all monetized vote transactions.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by transaction ID or nominee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm text-black pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="relative sm:w-auto">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 w-full sm:min-w-62.5 justify-between"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Grid3x3 size={16} className="text-gray-500 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">
                    {selectedCategory === "all"
                      ? "All categories"
                      : categories.find((c) => c._id === selectedCategory)?.name || "All categories"}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 shrink-0 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                      selectedCategory === "all" ? "text-green-600 bg-green-50" : "text-gray-700"
                    }`}
                  >
                    All categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => {
                        setSelectedCategory(category._id);
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 ${
                        category._id === selectedCategory
                          ? "text-green-600 bg-green-50"
                          : "text-gray-700"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {loadingPayments ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== "all" ? "No payments found" : "No payments recorded"}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nominee
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Method
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Votes
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredPayments.map((payment) => (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-4">
                            <span className="text-xs font-mono text-gray-600 break-all">
                              {payment.transactionId}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              (payment as any).paymentType === 'voting' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {(payment as any).paymentType === 'voting' ? 'Voting' : 'Nomination'}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <p className="font-medium text-sm text-gray-900">
                              {payment.nomineeId?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payment.nomineeId?.categoryId?.name || 'N/A'}
                            </p>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {getPaymentMethodLabel(payment.paymentMethod)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-sm text-gray-900">
                              {payment.currency} {payment.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{payment.voteCount}</span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-gray-600">
                              {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBgColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      GHS {calculateTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Votes</p>
                    <p className="text-2xl font-bold text-green-600">{calculateTotalVotes().toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentManagementSystem;
