"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import {
  Calendar,
  MapPin,
  Video,
  Search,
  Ticket,
  Users,
  ChevronRight,
  Filter,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Globe,
} from "lucide-react";

/* ─── Types ─── */
interface TicketType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  color: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  banner: string;
  venue: { name: string; city: string; country: string; isVirtual: boolean };
  startDate: string;
  endDate: string;
  startTime: string;
  ticketTypes: TicketType[];
  totalCapacity: number;
  totalSold: number;
  organizationName: string;
}

const CATEGORIES = [
  { value: "", label: "All Events", emoji: "🌐" },
  { value: "conference", label: "Conference", emoji: "🎤" },
  { value: "concert", label: "Concert", emoji: "🎵" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "workshop", label: "Workshop", emoji: "🛠️" },
  { value: "gala", label: "Gala", emoji: "✨" },
  { value: "festival", label: "Festival", emoji: "🎉" },
  { value: "networking", label: "Networking", emoji: "🤝" },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function lowestPrice(tickets: TicketType[]) {
  if (!tickets.length) return null;
  const prices = tickets.map((t) => t.price);
  const min = Math.min(...prices);
  return min === 0 ? "Free" : `GHS ${min.toFixed(2)}`;
}

function soldPct(event: Event) {
  return event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0;
}

/* ─── Event card ─── */
function EventCard({ event, index }: { event: Event; index: number }) {
  const cat = CATEGORIES.find((c) => c.value === event.category);
  const pct = soldPct(event);
  const isSoldOut = pct >= 100;
  const price = lowestPrice(event.ticketTypes);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-400"
    >
      {/* Banner */}
      <div className="relative h-48 overflow-hidden">
        {event.banner ? (
          <img src={event.banner} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center">
            <span className="text-6xl opacity-70">{cat?.emoji || "📅"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />

        {/* Category badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-800">
          <span>{cat?.emoji}</span> {cat?.label || "Event"}
        </div>

        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
          {isSoldOut ? "Sold Out" : price ?? "Free"}
        </div>

        {/* Virtual indicator */}
        {event.venue?.isVirtual && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1 rounded-full text-xs font-medium">
            <Video className="w-3 h-3" /> Virtual
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
          {event.title}
        </h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{event.description}</p>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{formatDate(event.startDate)} · {event.startTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            {event.venue?.isVirtual ? (
              <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            )}
            <span className="truncate">
              {event.venue?.isVirtual
                ? "Online event"
                : [event.venue?.name, event.venue?.city].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>

        {/* Capacity */}
        {event.totalCapacity > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.totalSold} attending</span>
              <span>{Math.round(pct)}% filled</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: index * 0.06 + 0.3 }}
                className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/ticketing/${event._id}`}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isSoldOut
              ? "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-emerald-200"
          }`}
        >
          {isSoldOut ? "Sold Out" : "Get Tickets"}
          {!isSoldOut && <ArrowRight className="w-4 h-4" />}
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── Page ─── */
export default function TicketingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: "9",
        ...(search && { search }),
        ...(category && { category }),
      });
      const res = await fetch(`/api/public/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { setPage(1); fetchEvents(1); }, [search, category]);

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-gray-50">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" /> Live Events & Ticketing
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight"
            >
              Find Your Next <br className="hidden sm:block" />
              <span className="text-emerald-300">Unforgettable Experience</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/80 text-lg max-w-xl mx-auto mb-8"
            >
              Discover concerts, conferences, galas and more — buy tickets in seconds, get them delivered to your inbox.
            </motion.p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative max-w-lg mx-auto"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, venues, cities…"
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-sm font-medium bg-white shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </motion.div>
          </div>
        </section>

        {/* ── Stats strip ── */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-6 overflow-x-auto">
            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-gray-900">{total}</span> events available
            </div>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <Ticket className="w-4 h-4 text-emerald-600" /> Instant delivery to your email
            </div>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-2 text-sm text-gray-600 shrink-0">
              <Globe className="w-4 h-4 text-emerald-600" /> Physical & virtual events
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* ── Category filters ── */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  category === c.value
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                }`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>

          {/* ── Events grid ── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-10 bg-gray-200 rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">No events found</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                {search || category
                  ? "Try adjusting your search or filters."
                  : "No events are currently available. Check back soon!"}
              </p>
              {(search || category) && (
                <button
                  onClick={() => { setSearch(""); setCategory(""); }}
                  className="mt-4 text-sm text-emerald-600 font-semibold hover:underline"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{events.length}</span> of <span className="font-semibold">{total}</span> events
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, i) => (
                  <EventCard key={event._id} event={event} index={i} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPage(p); fetchEvents(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                        page === p ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer CTA ── */}
        <section className="bg-gradient-to-r from-emerald-700 to-teal-700 py-16 mt-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Organising an event?</h2>
            <p className="text-white/80 mb-6 text-sm">Create your event, set up ticketing, and start selling in minutes.</p>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-6 py-3 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
