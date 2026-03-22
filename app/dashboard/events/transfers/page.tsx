"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, ChevronLeft, Banknote, CreditCard, Smartphone, Info,
  Eye, EyeOff, Calendar, MapPin, Video, Ticket, CheckCircle,
  Clock, XCircle, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { authFetch } from "@/lib/authFetch";

/* ─── Types ─── */
interface Event {
  _id: string;
  title: string;
  code: string;
  banner?: string;
  status: string;
  organizationName: string;
  startDate: string;
  endDate: string;
  totalSold: number;
  totalRevenue: number;
  venue: { name: string; city?: string; isVirtual?: boolean };
}

interface EventTransfer {
  _id: string;
  referenceId: string;
  eventId: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientBank?: string;
  recipientAccountNumber?: string;
  recipientPhoneNumber?: string;
  momoNetwork?: string;
  transferType: "bank" | "mobile_money";
  status: "pending" | "approved" | "completed" | "rejected" | "failed";
  initiatedBy: string;
  notes?: string;
  createdAt: string;
}

interface RevenueInfo {
  totalRevenue: number;
  platformFee: number;
  organizerShare: number;
  alreadyTransferred: number;
  totalRequested: number;
  availableAmount: number;
  serviceFeePercentage: number;
  ticketsSold: number;
}

/* ─── Helpers ─── */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  pending:   { label: "Pending",   bg: "bg-orange-100", text: "text-orange-600", icon: Clock        },
  approved:  { label: "Approved",  bg: "bg-blue-100",   text: "text-blue-600",   icon: CheckCircle  },
  completed: { label: "Completed", bg: "bg-green-100",  text: "text-green-600",  icon: CheckCircle  },
  rejected:  { label: "Rejected",  bg: "bg-red-100",    text: "text-red-600",    icon: XCircle      },
  failed:    { label: "Failed",    bg: "bg-red-100",    text: "text-red-600",    icon: AlertCircle  },
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EventTransfersPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [screen, setScreen] = useState<"list" | "transfer">("list");
  const [transfers, setTransfers] = useState<EventTransfer[]>([]);
  const [revenueInfo, setRevenueInfo] = useState<RevenueInfo | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [serviceFeePercentage, setServiceFeePercentage] = useState(10);

  /* ─── Modal states ─── */
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"bank" | "mobile_money">("bank");
  const [processingTransfer, setProcessingTransfer] = useState(false);
  const [formData, setFormData] = useState({
    recipientName: "",
    bankName: "",
    accountNumber: "",
    momoNetwork: "",
    momoNumber: "",
    amount: "",
  });

  /* ─── Bootstrap ─── */
  useEffect(() => {
    fetchEvents();
    fetchServiceFee();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTransfers(selectedEvent._id);
      fetchRevenueInfo(selectedEvent._id);
    }
  }, [selectedEvent]);

  const fetchServiceFee = async () => {
    try {
      const res = await authFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setServiceFeePercentage(data.data?.serviceFeePercentage || 10);
      }
    } catch {}
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await authFetch("/api/events?limit=100");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
      } else {
        toast.error("Failed to load events");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchTransfers = async (eventId: string) => {
    setLoadingTransfers(true);
    try {
      const res = await authFetch(`/api/event-transfers?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setTransfers(data.data || []);
      } else {
        toast.error("Failed to fetch transfers");
      }
    } catch {
      toast.error("Failed to fetch transfers");
    } finally {
      setLoadingTransfers(false);
    }
  };

  const fetchRevenueInfo = async (eventId: string) => {
    try {
      const res = await authFetch(`/api/event-transfers/revenue?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setRevenueInfo(data.data);
      }
    } catch {}
  };

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setScreen("transfer");
  };

  const handleAddTransferClick = () => {
    setShowPasswordModal(true);
    setPassword("");
    setShowPassword(false);
  };

  const handlePasswordVerification = async () => {
    if (!password) { toast.error("Please enter your password"); return; }
    setVerifyingPassword(true);
    try {
      const res = await authFetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Password verified");
        setShowPasswordModal(false);
        setPassword("");
        setShowTransferModal(true);
      } else {
        toast.error(data.error || "Invalid password");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!formData.recipientName || !selectedEvent || !formData.amount) {
      toast.error("Please fill in all required fields"); return;
    }
    const requestedAmount = parseFloat(formData.amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast.error("Please enter a valid amount"); return;
    }
    if (revenueInfo && requestedAmount > revenueInfo.availableAmount) {
      toast.error(`Amount exceeds available balance (GHS ${revenueInfo.availableAmount.toFixed(2)})`); return;
    }
    if (paymentMode === "bank" && (!formData.bankName || !formData.accountNumber)) {
      toast.error("Please fill in bank details"); return;
    }
    if (paymentMode === "mobile_money" && (!formData.momoNetwork || !formData.momoNumber)) {
      toast.error("Please fill in mobile money details"); return;
    }

    setProcessingTransfer(true);
    const loadingToast = toast.loading("Initiating transfer…");
    try {
      const res = await authFetch("/api/event-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent._id,
          amount: requestedAmount,
          recipientName: formData.recipientName,
          transferType: paymentMode,
          ...(paymentMode === "bank"
            ? { recipientBank: formData.bankName, recipientAccountNumber: formData.accountNumber }
            : { recipientPhoneNumber: formData.momoNumber, momoNetwork: formData.momoNetwork }),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Transfer initiated successfully!", { id: loadingToast });
        setFormData({ recipientName: "", bankName: "", accountNumber: "", momoNetwork: "", momoNumber: "", amount: "" });
        setShowTransferModal(false);
        fetchTransfers(selectedEvent._id);
        fetchRevenueInfo(selectedEvent._id);
      } else {
        toast.error(data.error || "Failed to initiate transfer", { id: loadingToast });
      }
    } catch {
      toast.error("Failed to initiate transfer", { id: loadingToast });
    } finally {
      setProcessingTransfer(false);
    }
  };

  /* ═══════════════════════════════════════════ RENDER ════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── Event List Screen ─── */}
      {screen === "list" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Transfers</h1>
              <p className="text-sm text-gray-500 mt-1">Select an event to manage ticket revenue transfers.</p>
            </div>
            <button
              onClick={() => (window.location.href = "/dashboard/events")}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Create New Event
            </button>
          </div>

          {loadingEvents ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mb-4" />
              <p className="text-sm">Loading events…</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center">
              <Calendar className="w-12 h-12 text-gray-300 mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h2>
              <p className="text-sm text-gray-500 mb-6">Create an event to start managing ticket revenue transfers.</p>
              <button
                onClick={() => (window.location.href = "/dashboard/events")}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus size={16} /> Create New Event
              </button>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event._id}
                  onClick={() => handleSelectEvent(event)}
                  className="group overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transition-all"
                >
                  {/* Banner */}
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    {event.banner ? (
                      <img src={event.banner} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                        <Calendar className="w-12 h-12 text-green-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90 ${
                      event.status === "ongoing" ? "text-green-600" : event.status === "published" ? "text-blue-600" : "text-gray-600"
                    }`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-green-700 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">#{event.code}</p>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {fmt(event.startDate)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {event.venue?.isVirtual
                          ? <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          : <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        <span className="truncate">{event.venue?.name}{event.venue?.city ? `, ${event.venue.city}` : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Ticket className="w-3.5 h-3.5" />
                        <span>{event.totalSold} sold</span>
                      </div>
                      <div className="text-xs font-bold text-green-600">
                        GHS {(event.totalRevenue || 0).toFixed(2)}
                      </div>
                    </div>

                    <p className="text-green-600 text-[10px] flex items-start gap-1">
                      <Info size={10} className="shrink-0 mt-0.5" />
                      <span>{serviceFeePercentage}% service fee applied on ticket revenue.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Transfer Screen ─── */}
      {screen === "transfer" && selectedEvent && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <button
            onClick={() => { setScreen("list"); setSelectedEvent(null); setRevenueInfo(null); setTransfers([]); }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors text-sm"
          >
            <ChevronLeft size={20} /> Back to Events
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transfer: {selectedEvent.title}</h1>
              <p className="text-gray-500 mt-1 text-sm">Manage ticket revenue withdrawal requests for this event.</p>
            </div>
            <button
              onClick={handleAddTransferClick}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Add New Transfer
            </button>
          </div>

          {/* Revenue Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Banknote className="text-blue-600" size={20} />
                </div>
                <span className="text-gray-600 text-sm">Ticket Revenue</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">GHS {(revenueInfo?.totalRevenue || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Platform Fee ({revenueInfo?.serviceFeePercentage || 10}%): GHS {(revenueInfo?.platformFee || 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-green-600" size={20} />
                </div>
                <span className="text-gray-600 text-sm">Organizer Share</span>
              </div>
              <p className="text-2xl font-bold text-green-600">GHS {(revenueInfo?.organizerShare || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">After platform fee deduction</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="text-orange-600" size={20} />
                </div>
                <span className="text-gray-600 text-sm">Total Requested</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">GHS {(revenueInfo?.totalRequested || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Pending + Approved transfers</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md p-5 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-white" size={20} />
                </div>
                <span className="text-gray-700 text-sm font-semibold">Available Balance</span>
              </div>
              <p className="text-3xl font-bold text-green-700">GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}</p>
              <div className="mt-3 pt-3 border-t border-green-200 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Organizer Share:</span>
                  <span className="font-semibold">GHS {(revenueInfo?.organizerShare || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Already Transferred:</span>
                  <span className="font-semibold text-red-600">− GHS {(revenueInfo?.alreadyTransferred || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending/Approved:</span>
                  <span className="font-semibold text-orange-600">− GHS {(revenueInfo?.totalRequested || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Transfer History</h2>
              <p className="text-xs text-gray-500 mt-0.5">{transfers.length} transfer{transfers.length !== 1 ? "s" : ""} for this event</p>
            </div>

            {loadingTransfers ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
            ) : transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Banknote className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No transfers yet for this event.</p>
                <button onClick={handleAddTransferClick} className="mt-3 text-sm text-green-600 hover:underline">
                  Initiate your first transfer
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-6 py-3">Reference</th>
                      <th className="text-left px-6 py-3">Recipient</th>
                      <th className="text-left px-6 py-3">Type</th>
                      <th className="text-left px-6 py-3">Amount</th>
                      <th className="text-left px-6 py-3">Status</th>
                      <th className="text-left px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transfers.map((t) => {
                      const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                      const StatusIcon = sc.icon;
                      return (
                        <tr key={t._id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gray-600">{t.referenceId}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{t.recipientName}</p>
                            <p className="text-xs text-gray-400">
                              {t.transferType === "bank"
                                ? `${t.recipientBank || "—"} · ${t.recipientAccountNumber || "—"}`
                                : `${t.momoNetwork || "—"} · ${t.recipientPhoneNumber || "—"}`}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              t.transferType === "bank" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            }`}>
                              {t.transferType === "bank" ? <CreditCard className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                              {t.transferType === "bank" ? "Bank" : "MoMo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">GHS {t.amount.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                              <StatusIcon className="w-3 h-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">{fmt(t.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Password Verification Modal ═══ */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Confirm Identity</h3>
              <p className="text-sm text-gray-500 mt-1">Enter your password to proceed with the transfer.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordVerification()}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl pr-10 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handlePasswordVerification}
                disabled={verifyingPassword}
                className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {verifyingPassword ? "Verifying…" : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Transfer Form Modal ═══ */}
      {showTransferModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">New Transfer</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{selectedEvent.title}</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Available balance banner */}
              <div className="bg-green-50 rounded-xl p-3 text-sm">
                <p className="text-gray-600">Available Balance:</p>
                <p className="text-2xl font-bold text-green-700">GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}</p>
              </div>

              {/* Payment mode toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Transfer Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["bank", "mobile_money"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        paymentMode === mode
                          ? "bg-green-600 text-white border-green-600"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {mode === "bank" ? <CreditCard size={16} /> : <Smartphone size={16} />}
                      {mode === "bank" ? "Bank Transfer" : "Mobile Money"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Name *</label>
                <input
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="Full name of recipient"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Bank fields */}
              {paymentMode === "bank" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name *</label>
                    <input
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g. GCB Bank"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Number *</label>
                    <input
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="0000000000"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                </>
              )}

              {/* MoMo fields */}
              {paymentMode === "mobile_money" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Network *</label>
                    <select
                      value={formData.momoNetwork}
                      onChange={(e) => setFormData({ ...formData, momoNetwork: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="">Select network</option>
                      <option value="MTN">MTN Mobile Money</option>
                      <option value="Vodafone">Vodafone Cash</option>
                      <option value="AirtelTigo">AirtelTigo Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input
                      value={formData.momoNumber}
                      onChange={(e) => setFormData({ ...formData, momoNumber: e.target.value })}
                      placeholder="024 000 0000"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                </>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (GHS) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  max={revenueInfo?.availableAmount || 0}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Max: GHS {(revenueInfo?.availableAmount || 0).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTransfer}
                  disabled={processingTransfer}
                  className="flex-1 py-2.5 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {processingTransfer ? "Processing…" : "Submit Transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
