"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import toast from "react-hot-toast";
import {
  Calendar,
  MapPin,
  Video,
  Clock,
  Ticket,
  ChevronLeft,
  CheckCircle,
  Minus,
  Plus,
  Shield,
  Mail,
  Phone,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

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

// ─── helpers ──────────────────────────────────────────────────────────────────

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

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
    err ? "border-red-400" : "border-slate-200"
  } text-slate-800 placeholder:text-slate-300`;

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <>
      <PublicNav />
      <div className="min-h-screen bg-slate-50 animate-pulse">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <div className="h-56 sm:h-80 lg:h-96 bg-slate-200 rounded-2xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-40 bg-slate-100 rounded-xl" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── main content ─────────────────────────────────────────────────────────────

function EventDetailContent() {
  const params      = useParams();
  const router      = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [event, setEvent]           = useState<EventData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [cancelled, setCancelled]   = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity]             = useState(1);
  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState({ name: "", email: "", phone: "" });
  const [formErrors, setFormErrors]         = useState<Record<string, string>>({});
  const [purchasing, setPurchasing]         = useState(false);

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

  const available  = selectedTicket ? Math.max(0, selectedTicket.capacity - selectedTicket.sold) : 0;
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
        router.push(`/ticket-success?ref=${data.reference}&free=1`);
        return;
      }

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

  // ── states ──

  if (loading) return <PageSkeleton />;

  if (notFound) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center px-4">
          <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Event Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">This event may not be available or has ended.</p>
          <Link href="/ticketing" className="text-green-600 font-semibold hover:underline flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> Browse all events
          </Link>
        </div>
      </>
    );
  }

  if (!event) return null;

  const isSameDay = event.startDate.split("T")[0] === event.endDate.split("T")[0];
  const venueLabel = event.venue?.isVirtual
    ? "Online event"
    : [event.venue?.name, event.venue?.city].filter(Boolean).join(", ") || "Venue TBA";

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-slate-50">

        {/* Cancelled notice */}
        {cancelled && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
            <p className="text-amber-700 text-sm font-medium">
              Payment was cancelled. You can try again below.
            </p>
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-0">
          {/* ── banner ───────────────────────────────────────────────────────── */}
          <div className="relative h-56 sm:h-80 lg:h-96 overflow-hidden rounded-2xl bg-slate-200">
            {event.banner ? (
              <img src={event.banner} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Ticket className="w-16 h-16 text-slate-300" />
              </div>
            )}
            {event.banner && (
              <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

          {/* ── breadcrumb ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 mb-5">
            <Link
              href="/ticketing"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Events
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500 truncate">{event.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ── left: event details ────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Title block */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full capitalize">
                    {CATEGORY_LABELS[event.category] || "Event"}
                  </span>
                  {event.status === "ongoing" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                      </span>
                      Happening Now
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-1">
                  {event.title}
                </h1>
                <p className="text-sm text-slate-400">
                  by {event.organizationName} · #{event.code}
                </p>
              </div>

              {/* Info strip */}
              <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Date</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatDate(event.startDate)}
                      {!isSameDay && <span className="font-normal text-slate-400"> — {formatShort(event.endDate)}</span>}
                    </p>
                  </div>
                </div>
                {(event.startTime || event.endTime) && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Time</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {event.startTime}
                        {event.endTime && <span className="font-normal text-slate-400"> — {event.endTime}</span>}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  {event.venue?.isVirtual
                    ? <Video className="w-4 h-4 text-slate-400 shrink-0" />
                    : <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  }
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Venue</p>
                    <p className="text-sm font-semibold text-slate-800">{venueLabel}</p>
                    {!event.venue?.isVirtual && event.venue?.address && (
                      <p className="text-xs text-slate-400 mt-0.5">{event.venue.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <h2 className="text-sm font-bold text-slate-700 mb-3">About this event</h2>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Security notice */}
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tickets are delivered instantly to your email after purchase. Keep your ticket codes safe — present them at the venue entrance.
                </p>
              </div>
            </div>

            {/* ── right: ticket selection ────────────────────────────────────── */}
            <div>
              <div className="sticky top-20 space-y-4">

                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-slate-400" /> Select Tickets
                </h2>

                {/* Overall capacity bar */}
                {event.settings?.showAttendeeCount && event.totalCapacity > 0 && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>{event.totalSold} attending</span>
                      <span>{event.totalCapacity} capacity</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min((event.totalSold / event.totalCapacity) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Ticket types */}
                {event.ticketTypes.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-xl p-6 text-center">
                    <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No tickets configured yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {event.ticketTypes.map((ticket) => {
                      const avail      = ticket.capacity - ticket.sold;
                      const isSoldOut  = avail <= 0;
                      const isSelected = selectedTicket?.id === ticket.id;
                      const pct        = ticket.capacity > 0 ? (ticket.sold / ticket.capacity) * 100 : 0;

                      return (
                        <button
                          key={ticket.id}
                          onClick={() => selectTicket(ticket)}
                          disabled={isSoldOut}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : isSoldOut
                              ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                              : "border-slate-200 bg-white hover:border-green-400 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                                style={{ backgroundColor: ticket.color }}
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 text-sm leading-snug">{ticket.name}</p>
                                {ticket.description && (
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{ticket.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-slate-900 text-sm">
                                {ticket.price === 0 ? "Free" : `GHS ${ticket.price.toFixed(2)}`}
                              </p>
                              {isSoldOut && (
                                <span className="text-xs text-red-400 font-medium">Sold out</span>
                              )}
                              {isSelected && !isSoldOut && (
                                <CheckCircle className="w-4 h-4 text-green-600 ml-auto mt-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Perks */}
                          {ticket.perks && ticket.perks.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {ticket.perks.map((perk, i) => (
                                <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                  {perk}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Availability bar */}
                          {!isSoldOut && pct > 0 && (
                            <div className="mt-3">
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: pct >= 80 ? "#ef4444" : ticket.color,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quantity + buyer form */}
                {selectedTicket && (
                  <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-5">

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-bold text-slate-900">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                          disabled={quantity >= available}
                          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-slate-400">max {Math.min(available, 20)}</span>
                      </div>
                    </div>

                    {/* Order summary */}
                    <div className="bg-slate-50 rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">{quantity} × {selectedTicket.name}</p>
                        <p className="font-black text-slate-900 text-lg leading-tight">
                          {totalPrice === 0 ? "Free" : `GHS ${totalPrice.toFixed(2)}`}
                        </p>
                      </div>
                      <Ticket className="w-5 h-5 text-slate-300" />
                    </div>

                    {/* Buyer form or continue button */}
                    {!showForm ? (
                      <button
                        onClick={() => setShowForm(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        Continue <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {/* Name */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
                            <User className="w-3 h-3" /> Full Name
                          </label>
                          <input
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Your full name"
                            className={inputCls(formErrors.name)}
                          />
                          {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
                            <Mail className="w-3 h-3" /> Email Address
                          </label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="you@example.com"
                            className={inputCls(formErrors.email)}
                          />
                          {formErrors.email
                            ? <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                            : <p className="text-xs text-slate-400 mt-1">Tickets will be sent here</p>
                          }
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1">
                            <Phone className="w-3 h-3" /> Phone Number
                          </label>
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="+233 XX XXX XXXX"
                            className={inputCls(formErrors.phone)}
                          />
                          {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Shield className="w-3 h-3" />
                          Secured by Hubtel · Your data is protected
                        </div>

                        <button
                          onClick={handlePurchase}
                          disabled={purchasing}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          {purchasing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                          ) : totalPrice === 0 ? (
                            <><CheckCircle className="w-4 h-4" /> Claim Free Tickets</>
                          ) : (
                            <>Pay GHS {totalPrice.toFixed(2)} <ArrowRight className="w-4 h-4" /></>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email delivery</span>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ─── page wrapper ─────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EventDetailContent />
    </Suspense>
  );
}
