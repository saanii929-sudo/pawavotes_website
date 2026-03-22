"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import toast from "react-hot-toast";
import {
  Calendar,
  MapPin,
  Video,
  Clock,
  Users,
  Ticket,
  ChevronLeft,
  CheckCircle,
  X,
  Minus,
  Plus,
  Shield,
  Mail,
  Phone,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  Globe,
  Tag,
  Building2,
  Star,
} from "lucide-react";

/* ─── Types ─── */
interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  sold: number;
  color: string;
  perks: string[];
}

interface EventData {
  _id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  status: string;
  banner: string;
  venue: {
    name: string;
    address: string;
    city: string;
    country: string;
    isVirtual: boolean;
    virtualLink: string;
  };
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  ticketTypes: TicketType[];
  totalCapacity: number;
  totalSold: number;
  organizationName: string;
  settings: {
    showAttendeeCount: boolean;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  conference: "Conference", concert: "Concert", sports: "Sports",
  workshop: "Workshop", gala: "Gala", festival: "Festival",
  networking: "Networking", other: "Event",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Page ─── */
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  /* Purchase state */
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);

  /* Fetch event */
  useEffect(() => {
    if (!id) return;
    if (searchParams.get("cancelled")) setCancelled(true);

    fetch(`/api/public/events/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setEvent(data.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const available = selectedTicket
    ? Math.max(0, selectedTicket.capacity - selectedTicket.sold)
    : 0;

  const totalPrice = selectedTicket ? selectedTicket.price * quantity : 0;

  function selectTicket(ticket: TicketType) {
    const avail = ticket.capacity - ticket.sold;
    if (avail <= 0) { toast.error("This ticket is sold out"); return; }
    setSelectedTicket(ticket);
    setQuantity(1);
    setShowForm(false);
    setFormErrors({});
  }

  function validate() {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Full name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Valid email is required — your tickets will be sent here";
    if (!form.phone.trim()) errors.phone = "Phone number is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handlePurchase() {
    if (!selectedTicket || !event) return;
    if (!validate()) return;

    setPurchasing(true);
    try {
      const res = await fetch("/api/public/tickets/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          ticketTypeId: selectedTicket.id,
          quantity,
          buyerName: form.name.trim(),
          buyerEmail: form.email.toLowerCase().trim(),
          buyerPhone: form.phone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Purchase failed. Please try again.");
        return;
      }

      if (data.free) {
        // Free tickets — redirect to success page immediately
        router.push(`/ticket-success?ref=${data.reference}&free=1`);
        return;
      }

      // Paid — redirect to Hubtel checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error("Could not initialize payment. Please try again.");
      }
    } catch {
      toast.error("Network error. Please check your connection.");
    } finally {
      setPurchasing(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
          <AlertCircle className="w-14 h-14 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Event Not Found</h2>
          <p className="text-gray-400 text-sm mb-6">This event may not be available or has ended.</p>
          <Link href="/ticketing" className="text-emerald-600 font-semibold hover:underline flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Browse all events
          </Link>
        </div>
      </>
    );
  }

  if (!event) return null;

  const isSameDay = event.startDate.split("T")[0] === event.endDate.split("T")[0];

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-gray-50">

        {/* Cancelled banner */}
        <AnimatePresence>
          {cancelled && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center"
            >
              <p className="text-amber-700 text-sm font-medium">
                Payment was cancelled. You can try again below.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hero banner ── */}
        <div className="relative h-72 sm:h-96 overflow-hidden">
          {event.banner ? (
            <img src={event.banner} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-emerald-500 via-teal-600 to-cyan-700" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute bottom-6 left-4 sm:left-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {CATEGORY_LABELS[event.category] || "Event"}
              </span>
              <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {event.status === "ongoing" ? "Happening Now" : "Upcoming"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight max-w-2xl">
              {event.title}
            </h1>
            <p className="text-white/70 text-sm mt-1">by {event.organizationName} · #{event.code}</p>
          </div>

          <Link
            href="/ticketing"
            className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> All Events
          </Link>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── Left column: Event details ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Info cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Date
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{formatShort(event.startDate)}</p>
                  {!isSameDay && <p className="text-xs text-gray-500">to {formatShort(event.endDate)}</p>}
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Time
                  </div>
                  <p className="font-bold text-gray-900 text-sm">{event.startTime}</p>
                  <p className="text-xs text-gray-500">— {event.endTime}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    {event.venue?.isVirtual ? <Video className="w-3.5 h-3.5 text-purple-500" /> : <MapPin className="w-3.5 h-3.5 text-orange-500" />}
                    Venue
                  </div>
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {event.venue?.isVirtual ? "Virtual Event" : (event.venue?.name || "TBA")}
                  </p>
                  {!event.venue?.isVirtual && event.venue?.city && (
                    <p className="text-xs text-gray-500">{[event.venue.city, event.venue.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900 mb-3">About this event</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
                </div>
              )}

              {/* Full venue details */}
              {!event.venue?.isVirtual && event.venue?.address && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-500" /> Venue Details
                  </h2>
                  <p className="text-sm font-semibold text-gray-800">{event.venue.name}</p>
                  <p className="text-sm text-gray-500">
                    {[event.venue.address, event.venue.city, event.venue.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}

              {/* Safety notice */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Secure & Instant Delivery</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Your tickets are delivered instantly to your email after purchase. Keep your ticket codes safe — present them at the venue entrance.</p>
                </div>
              </div>
            </div>

            {/* ── Right column: Ticket selection ── */}
            <div className="space-y-4">
              <div className="sticky top-20">
                <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-600" /> Select Tickets
                </h2>

                {/* Attendee count */}
                {event.settings?.showAttendeeCount && event.totalCapacity > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-3 mb-4 shadow-sm">
                    
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min((event.totalSold / event.totalCapacity) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Ticket types */}
                {event.ticketTypes.length === 0 ? (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                    <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No tickets configured for this event yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {event.ticketTypes.map((ticket) => {
                      const avail = ticket.capacity - ticket.sold;
                      const isSoldOut = avail <= 0;
                      const isSelected = selectedTicket?.id === ticket.id;
                      const pct = (ticket.sold / ticket.capacity) * 100;

                      return (
                        <motion.button
                          key={ticket.id}
                          onClick={() => selectTicket(ticket)}
                          disabled={isSoldOut}
                          whileTap={isSoldOut ? {} : { scale: 0.99 }}
                          className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50 shadow-md"
                              : isSoldOut
                              ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                              : "border-gray-100 bg-white hover:border-emerald-300 shadow-sm cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                                style={{ backgroundColor: ticket.color }}
                              />
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{ticket.name}</p>
                                {ticket.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{ticket.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="font-extrabold text-gray-900 text-base">
                                {ticket.price === 0 ? "Free" : `GHS ${ticket.price.toFixed(2)}`}
                              </p>
                              {isSoldOut ? (
                                <span className="text-xs text-red-500 font-semibold">Sold Out</span>
                              ) : (
                                <span className="text-xs text-gray-400"></span>
                              )}
                            </div>
                          </div>

                          {/* Perks */}
                          {ticket.perks && ticket.perks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {ticket.perks.map((perk, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  ✓ {perk}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Availability bar */}
                          {!isSoldOut && (
                            <div className="mt-2.5">
                              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: pct >= 80 ? "#ef4444" : ticket.color,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Selected check */}
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Quantity + form */}
                <AnimatePresence>
                  {selectedTicket && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4 shadow-sm space-y-5">
                        {/* Quantity selector */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-bold text-gray-900 text-lg">{quantity}</span>
                            <button
                              onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                              disabled={quantity >= available}
                              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-gray-400 ml-1">(max {Math.min(available, 20)})</span>
                          </div>
                        </div>

                        {/* Total */}
                        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">{quantity} × {selectedTicket.name}</p>
                            <p className="text-lg font-extrabold text-gray-900">
                              {totalPrice === 0 ? "Free" : `GHS ${totalPrice.toFixed(2)}`}
                            </p>
                          </div>
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: selectedTicket.color + "20" }}
                          >
                            <Ticket className="w-5 h-5" style={{ color: selectedTicket.color }} />
                          </div>
                        </div>

                        {/* Buyer form */}
                        {!showForm ? (
                          <button
                            onClick={() => setShowForm(true)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            Continue <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-3"
                          >
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                <User className="w-3 h-3 inline mr-1" /> Full Name
                              </label>
                              <input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Your full name"
                                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 ${formErrors.name ? "border-red-400" : "border-gray-200"}`}
                              />
                              {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                <Mail className="w-3 h-3 inline mr-1" /> Email Address
                              </label>
                              <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                placeholder="tickets@example.com"
                                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 ${formErrors.email ? "border-red-400" : "border-gray-200"}`}
                              />
                              {formErrors.email ? (
                                <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-1">Tickets will be sent to this email</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                <Phone className="w-3 h-3 inline mr-1" /> Phone Number
                              </label>
                              <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                                placeholder="+233 XX XXX XXXX"
                                className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 ${formErrors.phone ? "border-red-400" : "border-gray-200"}`}
                              />
                              {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                            </div>

                            {/* Trust signals */}
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Shield className="w-3 h-3 text-emerald-500" />
                              Secured by Hubtel · Your data is protected
                            </div>

                            <button
                              onClick={handlePurchase}
                              disabled={purchasing}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                              {purchasing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Processing…
                                </>
                              ) : totalPrice === 0 ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Claim Free Tickets
                                </>
                              ) : (
                                <>
                                  Pay GHS {totalPrice.toFixed(2)}
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure payment</div>
                  <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
