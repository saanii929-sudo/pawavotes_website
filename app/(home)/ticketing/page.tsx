"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import {
  Calendar,
  MapPin,
  Video,
  Search,
  Ticket,
  Clock,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react";

// ─── types ────────────────────────────────────────────────────────────────────

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

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "",             label: "All Events"  },
  { value: "conference",   label: "Conference"  },
  { value: "concert",      label: "Concert"     },
  { value: "sports",       label: "Sports"      },
  { value: "workshop",     label: "Workshop"    },
  { value: "gala",         label: "Gala"        },
  { value: "festival",     label: "Festival"    },
  { value: "networking",   label: "Networking"  },
];

// subtle placeholder bg per category (when no banner)
const CAT_BG: Record<string, string> = {
  conference: "bg-blue-50",
  concert:    "bg-purple-50",
  sports:     "bg-green-50",
  workshop:   "bg-orange-50",
  gala:       "bg-yellow-50",
  festival:   "bg-pink-50",
  networking: "bg-teal-50",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function lowestPrice(tickets: TicketType[]) {
  if (!tickets.length) return null;
  const min = Math.min(...tickets.map(t => t.price));
  return min === 0 ? "Free" : `GHS ${min.toFixed(2)}`;
}

// ─── skeleton card ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
        <div className="h-9 bg-slate-100 rounded-xl mt-4" />
      </div>
    </div>
  );
}

// ─── event card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const isSoldOut = event.totalCapacity > 0 && event.totalSold >= event.totalCapacity;
  const price = lowestPrice(event.ticketTypes);
  const placeholderBg = CAT_BG[event.category] || "bg-slate-100";

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col">

      {/* Banner */}
      <div className={`relative h-44 overflow-hidden ${!event.banner ? placeholderBg : ""}`}>
        {event.banner ? (
          <img
            src={event.banner}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Ticket className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* overlay for text readability on real images */}
        {event.banner && (
          <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        )}

        {/* Price or sold out */}
        <div className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${
          isSoldOut
            ? "bg-slate-800/80 text-white"
            : price === "Free"
            ? "bg-green-600 text-white"
            : "bg-white/90 text-slate-800"
        }`}>
          {isSoldOut ? "Sold Out" : price ?? "Free"}
        </div>

        {/* Virtual badge */}
        {event.venue?.isVirtual && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">
            <Video className="w-3 h-3" />
            Online
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Category pill */}
        <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full mb-2 self-start capitalize">
          {event.category || "Event"}
        </span>

        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1 line-clamp-2">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {event.description}
          </p>
        )}

        {/* Meta */}
        <div className="space-y-1.5 mt-auto mb-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{fmtDate(event.startDate)}</span>
            {event.startTime && (
              <>
                <span className="text-slate-300">·</span>
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{event.startTime}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {event.venue?.isVirtual ? (
              <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="truncate">
              {event.venue?.isVirtual
                ? "Online event"
                : [event.venue?.name, event.venue?.city].filter(Boolean).join(", ") || "Venue TBA"}
            </span>
          </div>
        </div>

        {/* CTA */}
        {isSoldOut ? (
          <div className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 text-center">
            Sold Out
          </div>
        ) : (
          <Link
            href={`/ticketing/${event._id}`}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            Get Tickets <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TicketingPage() {
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);

  const fetchEvents = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: "9",
        ...(search   && { search }),
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

  const hasFilters = !!(search || category);

  return (
    <>
      <PublicNav />

      <main className="min-h-screen bg-slate-50">

        {/* ── page header ────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
                Events & Ticketing
              </h1>
              <p className="text-sm text-slate-400 mb-6">
                Discover events near you — buy tickets in seconds, get them delivered instantly.
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by event name, venue or city…"
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-slate-700 placeholder:text-slate-300"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

          {/* ── category filters ───────────────────────────────────────────── */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                  category === c.value
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* ── results meta ───────────────────────────────────────────────── */}
          {!loading && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {hasFilters ? (
                  <>
                    <span className="font-semibold text-slate-800">{total}</span> result{total !== 1 ? "s" : ""}
                    {category && <> in <span className="font-semibold text-slate-800 capitalize">{category}</span></>}
                    {search && <> for <span className="font-semibold text-slate-800">"{search}"</span></>}
                  </>
                ) : (
                  <><span className="font-semibold text-slate-800">{total}</span> events available</>
                )}
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(""); setCategory(""); }}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
            </div>
          )}

          {/* ── grid ───────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-700 mb-1">No events found</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                {hasFilters
                  ? "Try adjusting your search or clearing the filters."
                  : "No events are available right now. Check back soon!"}
              </p>
              {hasFilters && (
                <button
                  onClick={() => { setSearch(""); setCategory(""); }}
                  className="mt-4 text-sm text-green-600 font-semibold hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-10">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        setPage(p);
                        fetchEvents(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                        page === p
                          ? "bg-green-600 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-green-400 hover:text-green-700"
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

        {/* ── organiser CTA ──────────────────────────────────────────────────── */}
        <div className="border-t border-slate-200 bg-white mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Organising an event?</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Create your event, set up ticketing, and start selling in minutes.
              </p>
            </div>
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
