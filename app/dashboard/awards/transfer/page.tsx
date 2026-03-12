"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  Banknote,
  CreditCard,
  Smartphone,
  Info,
  Eye,
  EyeOff,
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

interface Transfer {
  _id: string;
  referenceId: string;
  awardId: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientBank?: string;
  recipientAccountNumber?: string;
  recipientPhoneNumber?: string;
  transferType: "bank" | "momo";
  status: "pending" | "approved" | "completed" | "rejected" | "failed";
  initiatedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const TransferManagementSystem = () => {
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [currentScreen, setCurrentScreen] = useState<"list" | "transfer">(
    "list",
  );
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"bank" | "mobile_money">(
    "bank",
  );
  const [awards, setAwards] = useState<Award[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState(false);

  const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);
  const [revenueInfo, setRevenueInfo] = useState<{
    totalRevenue: number;
    platformFee: number;
    organizerShare: number;
    alreadyTransferred: number;
    totalRequested: number;
    availableAmount: number;
    serviceFeePercentage: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    recipientName: "",
    bankName: "",
    accountNumber: "",
    momoNetwork: "",
    momoNumber: "",
    amount: "",
  });

  useEffect(() => {
    fetchAwards();
    fetchServiceFee();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchTransfers(selectedAward._id);
      fetchRevenueInfo(selectedAward._id);
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

  const fetchRevenueInfo = async (awardId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/transfers/revenue?awardId=${awardId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Fetch revenue response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Revenue data:", data);
        setRevenueInfo(data.data);
      } else {
        const errorData = await response.json();
        console.error("Fetch revenue error:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch revenue info:", error);
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

  const fetchTransfers = async (awardId: string) => {
    setLoadingTransfers(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/transfers?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetch transfers response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Transfers data:", data);
        setTransfers(data.data || []);
      } else {
        const errorData = await response.json();
        console.error("Fetch transfers error:", errorData);
        toast.error(
          errorData.error || errorData.message || "Failed to fetch transfers",
        );
      }
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
      toast.error("Failed to fetch transfers");
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("transfer");
  };

  const handleAddTransferClick = () => {
    // Show password verification modal first
    setShowPasswordModal(true);
    setPassword("");
  };

  const handlePasswordVerification = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setVerifyingPassword(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Password verified successfully");
        setShowPasswordModal(false);
        setPassword("");
        setShowPassword(false);
        setShowModal(true); // Show transfer modal
      } else {
        toast.error(data.error || "Invalid password");
      }
    } catch (error) {
      toast.error("Failed to verify password");
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.recipientName || !selectedAward || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const requestedAmount = parseFloat(formData.amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!revenueInfo || requestedAmount > revenueInfo.availableAmount) {
      toast.error(
        `Amount exceeds available balance (GHS ${revenueInfo?.availableAmount.toFixed(2) || "0.00"})`,
      );
      return;
    }

    if (
      paymentMode === "bank" &&
      (!formData.bankName || !formData.accountNumber)
    ) {
      toast.error("Please fill in bank details");
      return;
    }

    if (
      paymentMode === "mobile_money" &&
      (!formData.momoNetwork || !formData.momoNumber)
    ) {
      toast.error("Please fill in mobile money details");
      return;
    }

    setProcessingTransfer(true);
    const loadingToast = toast.loading("Initiating transfer with Hubtel...");

    try {
      const token = localStorage.getItem("token");
      const body = {
        awardId: selectedAward._id,
        amount: requestedAmount,
        recipientName: formData.recipientName,
        transferType: paymentMode,
        ...(paymentMode === "bank"
          ? {
              recipientBank: formData.bankName,
              recipientAccountNumber: formData.accountNumber,
            }
          : {
              recipientPhoneNumber: formData.momoNumber,
              momoNetwork: formData.momoNetwork,
            }),
      };

      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Transfer initiated successfully!", { id: loadingToast });
        setFormData({
          recipientName: "",
          bankName: "",
          accountNumber: "",
          momoNetwork: "",
          momoNumber: "",
          amount: "",
        });
        setShowModal(false);
        fetchTransfers(selectedAward._id);
        fetchRevenueInfo(selectedAward._id);
      } else {
        toast.error(
          data.error || data.message || "Failed to initiate transfer",
          { id: loadingToast },
        );
      }
    } catch (error) {
      toast.error("Failed to initiate transfer", { id: loadingToast });
    } finally {
      setProcessingTransfer(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "approved":
        return "text-blue-600";
      case "pending":
        return "text-orange-500";
      case "rejected":
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100";
      case "approved":
        return "bg-blue-100";
      case "pending":
        return "bg-orange-100";
      case "rejected":
      case "failed":
        return "bg-red-100";
      default:
        return "bg-gray-100";
    }
  };

  const getStatusIconColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "approved":
        return "text-blue-600";
      case "pending":
        return "text-orange-600";
      case "rejected":
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                          Price (GHS{" "}
                          {award.pricing?.votingCost?.toFixed(2) || "0.50"})
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
                      <span>
                        {serviceFeePercentage}% service fee later applied for
                        all awards.
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentScreen === "transfer" && selectedAward && (
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                Transfer: {selectedAward.name}
              </h1>
              <p className="text-gray-500 mt-1 text-sm sm:text-base">
                Transparent history of all manually reassigned votes.
              </p>
            </div>
            <button
              onClick={handleAddTransferClick}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <Plus size={18} />
              Add New Transfer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Banknote className="text-blue-600" size={20} />
                </div>
                <span className="text-gray-600 text-sm">Total Revenue</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                GHS {(revenueInfo?.totalRevenue || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Platform Fee ({revenueInfo?.serviceFeePercentage || 10}%): GHS {(revenueInfo?.platformFee || 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-green-600" size={20} />
                </div>
                <span className="text-gray-600 text-sm">Organizer Share</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">
                GHS {(revenueInfo?.organizerShare || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                After platform fee deduction
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="text-orange-600" size={20} />
                </div>
                <span className="text-gray-600 text-sm">Total Requested</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                GHS {(revenueInfo?.totalRequested || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Pending + Approved transfers
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-4 sm:p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-white" size={20} />
                </div>
                <span className="text-gray-700 text-sm font-semibold">Available Balance</span>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-green-700">
                GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}
              </p>
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Organizer Share:</span>
                    <span className="font-semibold">GHS {(revenueInfo?.organizerShare || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already Transferred:</span>
                    <span className="font-semibold text-red-600">- GHS {(revenueInfo?.alreadyTransferred || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending/Approved:</span>
                    <span className="font-semibold text-orange-600">- GHS {(revenueInfo?.totalRequested || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300">
                    <span className="font-bold text-gray-700">Available:</span>
                    <span className="font-bold text-green-700">GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loadingTransfers ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading transfers...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">No transfers found</p>
              <button
                onClick={handleAddTransferClick}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={20} />
                Add your first transfer
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction Ref
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recipient Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Initiated By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {transfers.map((transfer) => (
                        <tr key={transfer._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusBgColor(transfer.status)}`}
                              >
                                <Banknote
                                  className={getStatusIconColor(transfer.status)}
                                  size={16}
                                />
                              </div>
                              <span className="font-medium text-gray-900 text-sm">
                                {transfer.referenceId}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-gray-900 text-sm">
                              {transfer.currency} {transfer.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900 text-sm">
                              {transfer.recipientName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {transfer.transferType === "bank"
                                ? `${transfer.recipientBank} • ${transfer.recipientAccountNumber}`
                                : `Mobile Money • ${transfer.recipientPhoneNumber}`}
                            </p>
                            {transfer.notes && (
                              <p className="text-xs text-orange-500">
                                {transfer.notes}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-900 text-sm">
                              {transfer.initiatedBy}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-gray-600 text-xs">
                              {new Date(transfer.createdAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`font-medium text-sm ${getStatusColor(transfer.status)}`}
                            >
                              {transfer.status.charAt(0).toUpperCase() +
                                transfer.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {transfers.map((transfer) => (
                  <div key={transfer._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBgColor(transfer.status)}`}
                        >
                          <Banknote
                            className={getStatusIconColor(transfer.status)}
                            size={18}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {transfer.referenceId}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transfer.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${getStatusBgColor(transfer.status)} ${getStatusColor(transfer.status)}`}
                      >
                        {transfer.status.charAt(0).toUpperCase() +
                          transfer.status.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Amount:</span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {transfer.currency} {transfer.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Recipient:</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {transfer.recipientName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {transfer.transferType === "bank"
                            ? `${transfer.recipientBank} • ${transfer.recipientAccountNumber}`
                            : `Mobile Money • ${transfer.recipientPhoneNumber}`}
                        </p>
                        {transfer.notes && (
                          <p className="text-xs text-orange-500 mt-1">
                            {transfer.notes}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Initiated by:</span>
                          <span className="text-xs text-gray-900">
                            {transfer.initiatedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            if (!verifyingPassword) {
              setShowPasswordModal(false);
              setPassword("");
              setShowPassword(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-xl font-bold">Verify Password</h2>
              <p className="text-sm text-green-100 mt-1">
                Please enter your password to continue
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !verifyingPassword) {
                        handlePasswordVerification();
                      }
                    }}
                    className="w-full text-sm text-black px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                    disabled={verifyingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={verifyingPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>Security Check:</strong> We need to verify your identity before allowing transfer operations.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                  setShowPassword(false);
                }}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                disabled={verifyingPassword}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordVerification}
                disabled={verifyingPassword || !password}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {verifyingPassword ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => {
              if (!processingTransfer) {
                setShowModal(false);
                setFormData({
                  recipientName: "",
                  bankName: "",
                  accountNumber: "",
                  momoNetwork: "",
                  momoNumber: "",
                  amount: "",
                });
              }
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-green-600 text-white px-4 sm:px-6 py-4 rounded-t-lg sticky top-0 z-10">
                <h2 className="text-lg sm:text-xl font-bold">
                  Request Transfer
                </h2>
                <p className="text-xs sm:text-sm text-green-100">
                  Transfer funds via Hubtel (
                  {revenueInfo?.serviceFeePercentage || 10}% platform fee
                  applied)
                </p>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Available Balance:</strong> GHS{" "}
                    {(revenueInfo?.availableAmount || 0).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Amount (GHS){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={revenueInfo?.availableAmount || 0}
                    placeholder="Enter amount to transfer"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: e.target.value,
                      })
                    }
                    className="w-full text-sm text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  
                  {/* Balance Breakdown */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Available Balance:</span>
                        <span className="font-semibold text-green-600">
                          GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}
                        </span>
                      </div>
                      {formData.amount && parseFloat(formData.amount) > 0 && (
                        <>
                          <div className="flex justify-between text-gray-600">
                            <span>Requesting:</span>
                            <span className="font-semibold text-blue-600">
                              - GHS {parseFloat(formData.amount).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300">
                            <span className="font-bold text-gray-700">Remaining After Transfer:</span>
                            <span className={`font-bold ${
                              (revenueInfo?.availableAmount || 0) - parseFloat(formData.amount) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              GHS {((revenueInfo?.availableAmount || 0) - parseFloat(formData.amount)).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {formData.amount &&
                    parseFloat(formData.amount) >
                      (revenueInfo?.availableAmount || 0) && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs text-red-700 font-semibold">
                          ⚠️ Amount exceeds available balance
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Maximum you can request: GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}
                        </p>
                      </div>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Name{" "}
                    <span className="text-xs text-gray-500">
                      (Must match the account name)
                    </span>{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Michael Kpelle"
                    value={formData.recipientName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipientName: e.target.value,
                      })
                    }
                    className="w-full text-sm text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Method <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentMode("bank")}
                      className={`flex-1 px-3 sm:px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 border text-sm ${
                        paymentMode === "bank"
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      <CreditCard size={16} />
                      <span>Bank Transfer</span>
                    </button>
                    <button
                      onClick={() => setPaymentMode("mobile_money")}
                      className={`flex-1 px-3 sm:px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 border text-sm ${
                        paymentMode === "mobile_money"
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      <Smartphone size={16} />
                      <span>Mobile Money</span>
                    </button>
                  </div>
                </div>

                {paymentMode === "mobile_money" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Money Network{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.momoNetwork}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            momoNetwork: e.target.value,
                          })
                        }
                        className="w-full text-sm text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select Network</option>
                        <option value="MTN">MTN Mobile Money</option>
                        <option value="VOD">Vodafone Cash</option>
                        <option value="ATL">AirtelTigo Money</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Money Number{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0241234567"
                        value={formData.momoNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            momoNumber: e.target.value,
                          })
                        }
                        className="w-full text-sm text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({ ...formData, bankName: e.target.value })
                        }
                        className="w-full text-sm text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select Bank</option>
                        <option value="GCB Bank">GCB Bank</option>
                        <option value="Ecobank">Ecobank Ghana</option>
                        <option value="Stanbic Bank">Stanbic Bank</option>
                        <option value="Absa Bank">Absa Bank Ghana</option>
                        <option value="Fidelity Bank">Fidelity Bank</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter account number"
                        value={formData.accountNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            accountNumber: e.target.value,
                          })
                        }
                        className="w-full text-sm text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> The transfer will be processed
                    through Hubtel. Ensure the recipient details are correct
                    as transfers cannot be reversed.
                  </p>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      recipientName: "",
                      bankName: "",
                      accountNumber: "",
                      momoNetwork: "",
                      momoNumber: "",
                      amount: "",
                    });
                  }}
                  className="px-4 sm:px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  disabled={processingTransfer}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    processingTransfer ||
                    !formData.amount ||
                    parseFloat(formData.amount) <= 0 ||
                    parseFloat(formData.amount) >
                      (revenueInfo?.availableAmount || 0)
                  }
                  className="px-4 sm:px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {processingTransfer ? "Processing..." : "Request Transfer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransferManagementSystem;
