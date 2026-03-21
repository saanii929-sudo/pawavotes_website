"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Ticket,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  TrendingUp,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  Globe,
  Video,
  Tag,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Layers,
  Zap,
  Star,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { authFetch } from "@/lib/authFetch";

/* ─────────────────── Types ─────────────────── */
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

interface Event {
  _id: string;
  title: string;
  description: string;
  code: string;
  category: string;
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled";
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
  totalRevenue: number;
  organizationName: string;
  createdAt: string;
  settings: {
    requireApproval: boolean;
    showAttendeeCount: boolean;
    allowRefunds: boolean;
    isPublic: boolean;
  };
}

/* ─────────────────── Constants ─────────────────── */
const CATEGORIES = [
  { value: "conference", label: "Conference", emoji: "🎤" },
  { value: "concert", label: "Concert", emoji: "🎵" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "workshop", label: "Workshop", emoji: "🛠️" },
  { value: "gala", label: "Gala", emoji: "✨" },
  { value: "festival", label: "Festival", emoji: "🎉" },
  { value: "networking", label: "Networking", emoji: "🤝" },
  { value: "other", label: "Other", emoji: "📅" },
];

const TICKET_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" },
  published: { label: "Published", color: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" },
  ongoing: { label: "Ongoing", color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
  completed: { label: "Completed", color: "text-purple-600", bg: "bg-purple-50", dot: "bg-purple-500" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" },
};

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "conference",
  banner: "",
  venue: {
    name: "",
    address: "",
    city: "",
    country: "",
    isVirtual: false,
    virtualLink: "",
  },
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "17:00",
  ticketTypes: [] as TicketType[],
  status: "draft",
  settings: {
    requireApproval: false,
    showAttendeeCount: true,
    allowRefunds: false,
    isPublic: true,
  },
};

/* ─────────────────── Helpers ─────────────────── */
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

function getCategoryEmoji(category: string) {
  return CATEGORIES.find((c) => c.value === category)?.emoji ?? "📅";
}

function calcRevenue(tickets: TicketType[]) {
  return tickets.reduce((s, t) => s + t.sold * t.price, 0);
}

/* ─────────────────── Sub-components ─────────────────── */
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

function TicketTypeRow({
  ticket,
  index,
  onChange,
  onRemove,
}: {
  ticket: TicketType;
  index: number;
  onChange: (i: number, field: string, val: any) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: ticket.color }}
          />
          <span className="text-sm font-semibold text-gray-700">Ticket Type {index + 1}</span>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            value={ticket.name}
            onChange={(e) => onChange(index, "name", e.target.value)}
            placeholder="e.g. General Admission"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Price (USD)</label>
          <input
            type="number"
            min={0}
            value={ticket.price}
            onChange={(e) => onChange(index, "price", parseFloat(e.target.value) || 0)}
            placeholder="0 = Free"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
          <input
            type="number"
            min={1}
            value={ticket.capacity}
            onChange={(e) => onChange(index, "capacity", parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
          <div className="flex items-center gap-2">
            {TICKET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(index, "color", c)}
                className={`w-5 h-5 rounded-full transition-transform ${ticket.color === c ? "scale-125 ring-2 ring-offset-1 ring-gray-400" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
        <input
          value={ticket.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          placeholder="What's included?"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState<typeof INITIAL_FORM>({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const actionMenuRef = useRef<HTMLDivElement>(null);

  /* ── Stats derived ── */
  const stats = {
    total: pagination.total,
    published: events.filter((e) => e.status === "published" || e.status === "ongoing").length,
    revenue: events.reduce((s, e) => s + (e.totalRevenue || 0), 0),
    attendees: events.reduce((s, e) => s + (e.totalSold || 0), 0),
  };

  /* ── Fetch events ── */
  const fetchEvents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        ...(search && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterCategory && { category: filterCategory }),
      });
      const res = await authFetch(`/api/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
        setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
      } else {
        toast.error("Failed to load events");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* ── Close action menu on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Open create / edit modal ── */
  const openCreate = () => {
    setEditingEvent(null);
    setFormData({ ...INITIAL_FORM });
    setFormStep(1);
    setShowModal(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      category: event.category,
      banner: event.banner || "",
      venue: { ...event.venue },
      startDate: event.startDate.split("T")[0],
      endDate: event.endDate.split("T")[0],
      startTime: event.startTime,
      endTime: event.endTime,
      ticketTypes: [...event.ticketTypes],
      status: event.status,
      settings: { ...event.settings },
    });
    setFormStep(1);
    setShowModal(true);
    setActionMenu(null);
  };

  /* ── Save event ── */
  const handleSave = async () => {
    if (!formData.title.trim()) { toast.error("Event title is required"); return; }
    if (!formData.startDate || !formData.endDate) { toast.error("Start and end dates are required"); return; }
    if (!formData.venue.name.trim()) { toast.error("Venue name is required"); return; }

    setSaving(true);
    try {
      const url = editingEvent ? `/api/events/${editingEvent._id}` : "/api/events";
      const method = editingEvent ? "PUT" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingEvent ? "Event updated!" : "Event created!");
        setShowModal(false);
        fetchEvents();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete event ── */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await authFetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Event deleted");
        fetchEvents();
      } else {
        toast.error("Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(null);
      setActionMenu(null);
    }
  };

  /* ── Ticket type helpers ── */
  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: [
        ...prev.ticketTypes,
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          price: 0,
          capacity: 100,
          sold: 0,
          color: TICKET_COLORS[prev.ticketTypes.length % TICKET_COLORS.length],
          perks: [],
        },
      ],
    }));
  };

  const updateTicketType = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const tickets = [...prev.ticketTypes];
      tickets[index] = { ...tickets[index], [field]: value };
      return { ...prev, ticketTypes: tickets };
    });
  };

  const removeTicketType = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, i) => i !== index),
    }));
  };

  /* ─────────────────── Render ─────────────────── */
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Event Ticketing
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create, manage, and track all your ticketed events</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </motion.button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Events" value={stats.total} icon={Calendar} color="bg-blue-50 text-blue-600" />
        <StatCard label="Active Events" value={stats.published} icon={Zap} color="bg-green-50 text-green-600" />
        <StatCard label="Total Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} color="bg-amber-50 text-amber-600" />
        <StatCard label="Tickets Sold" value={stats.attendees.toLocaleString()} icon={Ticket} color="bg-purple-50 text-purple-600" />
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, venues…"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
            />
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${showFilters ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filterStatus || filterCategory) && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 mt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {["", "draft", "published", "ongoing", "completed", "cancelled"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {s ? STATUS_CONFIG[s].label : "All"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: "", label: "All", emoji: "🌐" }, ...CATEGORIES].map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setFilterCategory(c.value)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === c.value ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        <span>{c.emoji}</span>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Events Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse">
              <div className="h-32 bg-gray-200 rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No events yet</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            {search || filterStatus || filterCategory
              ? "No events match your current filters. Try adjusting them."
              : "Create your first event and start selling tickets today."}
          </p>
          {!search && !filterStatus && !filterCategory && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          )}
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {events.map((event, index) => {
              const sc = STATUS_CONFIG[event.status] || STATUS_CONFIG.draft;
              const soldPct = event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0;
              const catEmoji = getCategoryEmoji(event.category);
              return (
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  {/* Banner / Placeholder */}
                  <div className="relative h-36 bg-gradient-to-br from-green-400 via-teal-500 to-blue-600 overflow-hidden">
                    {event.banner ? (
                      <img src={event.banner} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl opacity-60">{catEmoji}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20" />
                    {/* Status badge */}
                    <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90 ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </div>
                    {/* Action menu */}
                    <div className="absolute top-3 right-3" ref={actionMenu === event._id ? actionMenuRef : undefined}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === event._id ? null : event._id); }}
                        className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {actionMenu === event._id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20"
                          >
                            <button
                              onClick={() => setDetailEvent(event)}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </button>
                            <button
                              onClick={() => openEdit(event)}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(event._id)}
                              disabled={deleting === event._id}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {deleting === event._id ? "Deleting…" : "Delete"}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    {/* Category tag */}
                    <div className="absolute bottom-3 left-3 text-xs font-medium bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-gray-700">
                      {catEmoji} {CATEGORIES.find((c) => c.value === event.category)?.label || "Other"}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-green-700 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono tracking-wide">#{event.code}</p>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {formatDate(event.startDate)}
                        {event.startDate !== event.endDate && ` → ${formatDate(event.endDate)}`}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {event.venue?.isVirtual ? (
                          <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        )}
                        <span className="truncate">
                          {event.venue?.isVirtual
                            ? "Virtual Event"
                            : [event.venue?.name, event.venue?.city].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Ticket types chips */}
                    {event.ticketTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.ticketTypes.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                            style={{ backgroundColor: t.color }}
                          >
                            {t.name} {t.price > 0 ? `• $${t.price}` : "• Free"}
                          </span>
                        ))}
                        {event.ticketTypes.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                            +{event.ticketTypes.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Capacity bar */}
                    {event.totalCapacity > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{event.totalSold} / {event.totalCapacity} tickets sold</span>
                          <span className="text-xs font-semibold text-gray-700">{Math.round(soldPct)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${soldPct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${soldPct >= 90 ? "bg-red-500" : soldPct >= 60 ? "bg-amber-500" : "bg-green-500"}`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Revenue */}
                    {event.totalRevenue > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Revenue</span>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                          {formatCurrency(event.totalRevenue)}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => fetchEvents(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchEvents(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ════════════════ Create / Edit Modal ════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingEvent ? "Edit Event" : "Create New Event"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className="flex items-center gap-1">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${formStep >= s ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"}`}
                        >
                          {formStep > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                        </div>
                        <span className={`text-xs ${formStep === s ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          {s === 1 ? "Details" : s === 2 ? "Venue & Schedule" : "Tickets"}
                        </span>
                        {s < 3 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <AnimatePresence mode="wait">
                  {formStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          Event Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={formData.title}
                          onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                          placeholder="e.g. Annual Tech Summit 2026"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                          rows={3}
                          placeholder="Tell attendees what to expect…"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                        <div className="grid grid-cols-4 gap-2">
                          {CATEGORIES.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, category: c.value }))}
                              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${formData.category === c.value ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                            >
                              <span className="text-xl">{c.emoji}</span>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner URL (optional)</label>
                        <input
                          value={formData.banner}
                          onChange={(e) => setFormData((p) => ({ ...p, banner: e.target.value }))}
                          placeholder="https://…"
                          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setFormData((p) => ({ ...p, status: key }))}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${formData.status === key ? `${sc.bg} ${sc.color} border-current` : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {formStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      {/* Virtual toggle */}
                      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                        <Video className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900">Virtual Event</p>
                          <p className="text-xs text-blue-600">Host this event online</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              venue: { ...p.venue, isVirtual: !p.venue.isVirtual },
                            }))
                          }
                          className={`w-11 h-6 rounded-full transition-colors relative ${formData.venue.isVirtual ? "bg-blue-500" : "bg-gray-300"}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.venue.isVirtual ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </div>

                      {formData.venue.isVirtual ? (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Streaming Link</label>
                          <input
                            value={formData.venue.virtualLink}
                            onChange={(e) =>
                              setFormData((p) => ({ ...p, venue: { ...p.venue, virtualLink: e.target.value } }))
                            }
                            placeholder="https://meet.example.com/…"
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                              Venue Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              value={formData.venue.name}
                              onChange={(e) =>
                                setFormData((p) => ({ ...p, venue: { ...p.venue, name: e.target.value } }))
                              }
                              placeholder="e.g. Grand Conference Hall"
                              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
                            <input
                              value={formData.venue.address}
                              onChange={(e) =>
                                setFormData((p) => ({ ...p, venue: { ...p.venue, address: e.target.value } }))
                              }
                              placeholder="Street address"
                              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
                              <input
                                value={formData.venue.city}
                                onChange={(e) =>
                                  setFormData((p) => ({ ...p, venue: { ...p.venue, city: e.target.value } }))
                                }
                                placeholder="City"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
                              <input
                                value={formData.venue.country}
                                onChange={(e) =>
                                  setFormData((p) => ({ ...p, venue: { ...p.venue, country: e.target.value } }))
                                }
                                placeholder="Country"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            End Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                          <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                          <input
                            type="time"
                            value={formData.endTime}
                            onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                          />
                        </div>
                      </div>

                      {/* Settings */}
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Settings</p>
                        {[
                          { key: "isPublic", label: "Public event", sub: "Visible to everyone" },
                          { key: "showAttendeeCount", label: "Show attendee count", sub: "Display on event page" },
                          { key: "allowRefunds", label: "Allow refunds", sub: "Attendees can request refunds" },
                          { key: "requireApproval", label: "Require approval", sub: "Manually approve registrations" },
                        ].map(({ key, label, sub }) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{label}</p>
                              <p className="text-xs text-gray-500">{sub}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((p) => ({
                                  ...p,
                                  settings: { ...p.settings, [key]: !(p.settings as any)[key] },
                                }))
                              }
                              className={`w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0 ${(formData.settings as any)[key] ? "bg-green-500" : "bg-gray-300"}`}
                              style={{ width: 40, height: 22 }}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${(formData.settings as any)[key] ? "translate-x-[18px]" : ""}`}
                                style={{ width: 18, height: 18 }}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {formStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900">Ticket Types</p>
                          <p className="text-xs text-gray-500">Add different ticket tiers for your event</p>
                        </div>
                        <button
                          onClick={addTicketType}
                          className="flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Ticket
                        </button>
                      </div>

                      {formData.ticketTypes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-center">
                          <Ticket className="w-10 h-10 text-gray-300 mb-3" />
                          <p className="text-sm font-medium text-gray-500">No ticket types yet</p>
                          <p className="text-xs text-gray-400 mb-4">Add at least one ticket type to enable registration</p>
                          <button
                            onClick={addTicketType}
                            className="text-sm font-semibold text-green-600 hover:text-green-700"
                          >
                            + Add first ticket
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.ticketTypes.map((t, i) => (
                            <TicketTypeRow
                              key={t.id}
                              ticket={t}
                              index={i}
                              onChange={updateTicketType}
                              onRemove={removeTicketType}
                            />
                          ))}
                        </div>
                      )}

                      {/* Summary */}
                      {formData.ticketTypes.length > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-100">
                          <p className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-2">Summary</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-green-700">Ticket Types</p>
                              <p className="text-lg font-bold text-green-900">{formData.ticketTypes.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-green-700">Total Capacity</p>
                              <p className="text-lg font-bold text-green-900">
                                {formData.ticketTypes.reduce((s, t) => s + t.capacity, 0).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-green-700">Max Revenue</p>
                              <p className="text-lg font-bold text-green-900">
                                {formatCurrency(formData.ticketTypes.reduce((s, t) => s + t.price * t.capacity, 0))}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  onClick={() => formStep > 1 ? setFormStep((s) => s - 1) : setShowModal(false)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {formStep > 1 ? "Back" : "Cancel"}
                </button>
                <div className="flex items-center gap-3">
                  {formStep < 3 ? (
                    <button
                      onClick={() => setFormStep((s) => s + 1)}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {editingEvent ? "Save Changes" : "Create Event"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════ Detail Drawer ════════════════ */}
      <AnimatePresence>
        {detailEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDetailEvent(null); }}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-white w-full sm:w-[480px] h-full overflow-y-auto shadow-2xl"
            >
              {/* Detail header */}
              <div className="relative h-52 bg-gradient-to-br from-green-400 via-teal-500 to-blue-600 overflow-hidden">
                {detailEvent.banner && (
                  <img src={detailEvent.banner} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/30" />
                <button
                  onClick={() => setDetailEvent(null)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-5">
                  <div className="text-3xl mb-1">{getCategoryEmoji(detailEvent.category)}</div>
                  <h2 className="text-xl font-bold text-white leading-tight">{detailEvent.title}</h2>
                  <p className="text-white/70 text-xs font-mono">#{detailEvent.code}</p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Status & actions */}
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_CONFIG[detailEvent.status]?.bg} ${STATUS_CONFIG[detailEvent.status]?.color}`}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[detailEvent.status]?.dot}`} />
                    {STATUS_CONFIG[detailEvent.status]?.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { openEdit(detailEvent); setDetailEvent(null); }}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                </div>

                {/* Description */}
                {detailEvent.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{detailEvent.description}</p>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3.5 h-3.5" /> Date
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(detailEvent.startDate)}
                    </p>
                    {detailEvent.startDate !== detailEvent.endDate && (
                      <p className="text-xs text-gray-500">to {formatDate(detailEvent.endDate)}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {detailEvent.startTime} — {detailEvent.endTime}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      {detailEvent.venue?.isVirtual ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                      Venue
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {detailEvent.venue?.isVirtual ? "Virtual Event" : detailEvent.venue?.name}
                    </p>
                    {!detailEvent.venue?.isVirtual && (
                      <p className="text-xs text-gray-500">
                        {[detailEvent.venue?.address, detailEvent.venue?.city, detailEvent.venue?.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ticket stats */}
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-green-600" /> Ticket Types
                  </p>
                  {detailEvent.ticketTypes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No ticket types configured</p>
                  ) : (
                    <div className="space-y-2">
                      {detailEvent.ticketTypes.map((t) => {
                        const pct = t.capacity > 0 ? (t.sold / t.capacity) * 100 : 0;
                        return (
                          <div key={t.id} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                                <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                              </div>
                              <span className="text-sm font-bold text-gray-900">
                                {t.price > 0 ? formatCurrency(t.price) : "Free"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                              <span>{t.sold} / {t.capacity} sold</span>
                              <span>{Math.round(pct)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: t.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Revenue summary */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                  <p className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-3">Revenue Overview</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{detailEvent.totalSold}</p>
                      <p className="text-xs text-gray-500">Tickets Sold</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{detailEvent.totalCapacity}</p>
                      <p className="text-xs text-gray-500">Total Capacity</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(detailEvent.totalRevenue)}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-2">Settings</p>
                  <div className="space-y-1.5">
                    {[
                      { key: "isPublic", label: "Public event" },
                      { key: "showAttendeeCount", label: "Show attendee count" },
                      { key: "allowRefunds", label: "Refunds allowed" },
                      { key: "requireApproval", label: "Requires approval" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{label}</span>
                        <span className={`font-semibold ${(detailEvent.settings as any)?.[key] ? "text-green-600" : "text-gray-400"}`}>
                          {(detailEvent.settings as any)?.[key] ? "Yes" : "No"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
