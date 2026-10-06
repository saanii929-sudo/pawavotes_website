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
  Video,
  DollarSign,
  CheckCircle,
  Zap,
  Star,
  Upload,
  ImageIcon,
  Palette,
  Wand2,
} from "lucide-react";
import toast from "react-hot-toast";
import { authFetch } from "@/lib/authFetch";

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
  ticketBg?: string;
  ticketTextColor?: string;
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

const TEMPLATE_CATEGORIES = [
  { id: "all",     label: "All",      emoji: "✦" },
  { id: "dark",    label: "Dark",     emoji: "🌑" },
  { id: "vibrant", label: "Vibrant",  emoji: "⚡" },
  { id: "elegant", label: "Elegant",  emoji: "✨" },
  { id: "nature",  label: "Nature",   emoji: "🌿" },
];

const TICKET_TEMPLATES = [
  { id: "midnight", name: "Midnight",  description: "Deep cosmos",      gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", textColor: "light" as const, category: "dark" },
  { id: "abyss",    name: "Abyss",     description: "Dark navy depth",  gradient: "linear-gradient(135deg, #0c1445 0%, #1a237e 100%)",               textColor: "light" as const, category: "dark" },
  { id: "noir",     name: "Noir",      description: "Timeless black",   gradient: "linear-gradient(135deg, #141414 0%, #2d1b69 100%)",               textColor: "light" as const, category: "dark" },
  { id: "eclipse",  name: "Eclipse",   description: "Black to crimson", gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0000 50%, #5a0000 100%)",  textColor: "light" as const, category: "dark" },
  { id: "carbon",   name: "Carbon",    description: "Sleek & minimal",  gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",  textColor: "light" as const, category: "dark" },
  { id: "cosmic",   name: "Cosmic",    description: "Space teal",       gradient: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",  textColor: "light" as const, category: "dark" },

  { id: "ember",    name: "Ember",     description: "Fire & heat",      gradient: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",               textColor: "light" as const, category: "vibrant" },
  { id: "candy",    name: "Candy",     description: "Sweet & bold",     gradient: "linear-gradient(135deg, #fc5c7d 0%, #6a3093 100%)",               textColor: "light" as const, category: "vibrant" },
  { id: "neon",     name: "Neon",      description: "Electric glow",    gradient: "linear-gradient(135deg, #00b09b 0%, #96c93d 100%)",               textColor: "dark"  as const, category: "vibrant" },
  { id: "citrus",   name: "Citrus",    description: "Bright & zesty",   gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",               textColor: "dark"  as const, category: "vibrant" },
  { id: "ocean",    name: "Ocean",     description: "Deep sea blue",    gradient: "linear-gradient(135deg, #0575e6 0%, #021b79 100%)",               textColor: "light" as const, category: "vibrant" },
  { id: "aurora",   name: "Aurora",    description: "Northern lights",  gradient: "linear-gradient(135deg, #1a0533 0%, #0f3460 60%, #53354a 100%)",  textColor: "light" as const, category: "vibrant" },

  { id: "royal",    name: "Royal",     description: "Gold & prestige",  gradient: "linear-gradient(135deg, #0d0d0d 0%, #2d1b00 50%, #7a5c00 100%)",  textColor: "light" as const, category: "elegant" },
  { id: "rose",     name: "Rose Gold", description: "Soft luxury",      gradient: "linear-gradient(135deg, #c9a0dc 0%, #e8b4b8 50%, #b8797c 100%)",  textColor: "dark"  as const, category: "elegant" },
  { id: "steel",    name: "Steel",     description: "Modern corporate", gradient: "linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)",               textColor: "light" as const, category: "elegant" },
  { id: "ivory",    name: "Ivory",     description: "Clean & warm",     gradient: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",               textColor: "dark"  as const, category: "elegant" },
  { id: "champagne",name: "Champagne", description: "Golden warmth",    gradient: "linear-gradient(135deg, #f5f0e8 0%, #e8d5b7 50%, #d4af7a 100%)",  textColor: "dark"  as const, category: "elegant" },

  { id: "emerald",  name: "Emerald",   description: "Fresh & lush",     gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",               textColor: "dark"  as const, category: "nature" },
  { id: "forest",   name: "Forest",    description: "Deep woodland",    gradient: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",               textColor: "light" as const, category: "nature" },
  { id: "lagoon",   name: "Lagoon",    description: "Tropical waters",  gradient: "linear-gradient(135deg, #43c6ac 0%, #191654 100%)",               textColor: "light" as const, category: "nature" },
  { id: "dusk",     name: "Dusk",      description: "Evening sky",      gradient: "linear-gradient(135deg, #2c3e50 0%, #fd746c 100%)",               textColor: "light" as const, category: "nature" },
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
  ticketBg: "",
  ticketTextColor: "light" as "light" | "dark",
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "GHS", minimumFractionDigits: 0 }).format(amount);
}

function getCategoryEmoji(category: string) {
  return CATEGORIES.find((c) => c.value === category)?.emoji ?? "📅";
}

function calcRevenue(tickets: TicketType[]) {
  return tickets.reduce((s, t) => s + t.sold * t.price, 0);
}

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

function TicketBgUploader({
  value,
  onChange,
  folder = "ticket-backgrounds",
  aspectHint = "PNG, JPG, WebP · max 10 MB",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  aspectHint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await authFetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isCssGradient = value.startsWith("linear-gradient") || value.startsWith("radial-gradient");

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 group" style={{ height: 96 }}>
          {isCssGradient ? (
            <div className="w-full h-full" style={{ background: value }} />
          ) : (
            <img src={value} alt="Uploaded image" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg border border-white/40 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-semibold text-white bg-white/20 hover:bg-red-500/70 px-3 py-1.5 rounded-lg border border-white/40 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 bg-gray-50 hover:bg-green-50/40 transition-all cursor-pointer"
          style={{ height: 96 }}
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-500">Uploading…</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-6 h-6 text-gray-300" />
              <p className="text-xs text-gray-500 text-center">
                <span className="font-semibold text-green-600">Click to upload</span> or drag &amp; drop
              </p>
              <p className="text-xs text-gray-400">{aspectHint}</p>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

function TicketPreview({
  title,
  ticketBg,
  ticketTextColor,
  startDate,
  startTime,
  venueName,
  ticketTypes,
}: {
  title: string;
  ticketBg: string;
  ticketTextColor: "light" | "dark";
  startDate: string;
  startTime: string;
  venueName: string;
  ticketTypes: TicketType[];
}) {
  const [typeIdx, setTypeIdx] = useState(0);
  const activeType = ticketTypes[Math.min(typeIdx, Math.max(0, ticketTypes.length - 1))] ?? null;
  const isLight = ticketTextColor === "light";
  const textColor = isLight ? "#fff" : "#111";
  const subColor = isLight ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)";
  const overlayBg = isLight ? "rgba(0,0,0,0.48)" : "rgba(255,255,255,0.55)";
  const accentColor = activeType?.color || "#10b981";
  const isCssGradient = ticketBg.startsWith("linear-gradient") || ticketBg.startsWith("radial-gradient");
  const shortDate = startDate
    ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Date TBD";

  return (
    <div>
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        position: "relative",
        ...(ticketBg
          ? isCssGradient
            ? { background: ticketBg }
            : { backgroundImage: `url(${ticketBg})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}66)` }),
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {ticketBg && !isCssGradient && (
        <div style={{ position: "absolute", inset: 0, background: overlayBg, zIndex: 0, pointerEvents: "none" }} />
      )}

      <div style={{ position: "relative", zIndex: 1, padding: "16px 18px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: subColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            PAWAVOTES · E-TICKET
          </div>
          {activeType && (
            <span style={{ background: accentColor, color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {activeType.name}
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: textColor, lineHeight: 1.25, marginBottom: 10 }}>
          {title || "Event Title"}
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 8, color: subColor, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>DATE</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{shortDate}</div>
          </div>
          {startTime && (
            <div>
              <div style={{ fontSize: 8, color: subColor, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>TIME</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{startTime}</div>
            </div>
          )}
          {venueName && (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 8, color: subColor, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>VENUE</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{venueName}</div>
            </div>
          )}
        </div>
        <div style={{ borderTop: `1px dashed ${isLight ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}`, paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 8, color: subColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>TICKET CODE</div>
            <div style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: textColor, letterSpacing: "0.12em" }}>XXXX-XXXX-XXXX</div>
          </div>
          <div style={{ width: 38, height: 38, background: "#fff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.08)" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="1" fill="#111" />
              <rect x="4" y="4" width="6" height="6" fill="#fff" />
              <rect x="5" y="5" width="4" height="4" fill="#111" />
              <rect x="16" y="2" width="10" height="10" rx="1" fill="#111" />
              <rect x="18" y="4" width="6" height="6" fill="#fff" />
              <rect x="19" y="5" width="4" height="4" fill="#111" />
              <rect x="2" y="16" width="10" height="10" rx="1" fill="#111" />
              <rect x="4" y="18" width="6" height="6" fill="#fff" />
              <rect x="5" y="19" width="4" height="4" fill="#111" />
              <rect x="16" y="16" width="3" height="3" fill="#111" />
              <rect x="20" y="16" width="3" height="3" fill="#111" />
              <rect x="24" y="16" width="2" height="2" fill="#111" />
              <rect x="16" y="20" width="3" height="3" fill="#111" />
              <rect x="20" y="20" width="2" height="2" fill="#111" />
              <rect x="23" y="22" width="3" height="4" fill="#111" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    {ticketTypes.length > 1 && (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 8 }}>
        {ticketTypes.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTypeIdx(i)}
            title={t.name}
            style={{
              width: i === typeIdx ? 18 : 8,
              height: 8,
              borderRadius: 4,
              background: i === typeIdx ? t.color : "#d1d5db",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
    )}
    </div>
  );
}

function TicketTemplateModal({
  currentBg,
  eventTitle,
  onApply,
  onClose,
}: {
  currentBg: string;
  eventTitle: string;
  onApply: (gradient: string, textColor: "light" | "dark") => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"gallery" | "custom">("gallery");
  const [category, setCategory] = useState("all");
  const [color1, setColor1] = useState("#10b981");
  const [color2, setColor2] = useState("#0575e6");
  const [angle, setAngle] = useState(135);
  const [customTextColor, setCustomTextColor] = useState<"light" | "dark">("light");

  const customGradient = `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
  const filtered = category === "all" ? TICKET_TEMPLATES : TICKET_TEMPLATES.filter((t) => t.category === category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        <div
          className="relative px-6 pt-5 pb-4 shrink-0 overflow-hidden"
        >
          <div className="relative flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <Palette className="w-4 h-4 text-black" />
                </div>
                <h3 className="text-lg font-bold text-black tracking-tight">Ticket Designer</h3>
              </div>
              <p className="text-sm text-black leading-relaxed">Choose a style or craft your own — the preview updates live</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-black hover:text-black transition-colors shrink-0 mt-0.5"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.08)" }}>
            {([
              { id: "gallery", label: "Gallery",  Icon: Star    },
              { id: "custom",  label: "Custom",   Icon: Palette },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === id
                    ? "bg-green-600 text-white  shadow-sm"
                    : "text-gray-500 hover:text-gray-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {tab === "gallery" && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="p-5 space-y-4"
              >
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {TEMPLATE_CATEGORIES.map((cat) => {
                    const count = cat.id === "all" ? TICKET_TEMPLATES.length : TICKET_TEMPLATES.filter((t) => t.category === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                          category === cat.id
                            ? "bg-green-600 text-white border-green-600 shadow-sm"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800"
                        }`}
                      >
                        <span className="text-sm leading-none">{cat.emoji}</span>
                        {cat.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${category === cat.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => { onApply("", "light"); onClose(); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                    !currentBg ? "border-green-500 bg-green-50/60 shadow-sm shadow-green-100" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  <div className="w-14 h-9 rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-gray-400 font-bold tracking-wide">AUTO</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">Auto (ticket colour)</p>
                    <p className="text-xs text-gray-400">Inherits the ticket type's accent colour</p>
                  </div>
                  {!currentBg && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                </button>
                <div className="grid grid-cols-3 gap-3">
                  {filtered.map((tpl) => {
                    const isActive = currentBg === tpl.gradient;
                    return (
                      <motion.button
                        key={tpl.id}
                        type="button"
                        whileHover={{ scale: 1.04, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => { onApply(tpl.gradient, tpl.textColor); onClose(); }}
                        className={`relative overflow-hidden rounded-2xl text-left group transition-shadow ${
                          isActive
                            ? "ring-2 ring-green-500 ring-offset-2 shadow-lg shadow-green-100"
                            : "shadow-sm hover:shadow-lg"
                        }`}
                      >
                        <div className="w-full h-22 flex flex-col justify-end p-2.5" style={{ background: tpl.gradient }}>
                          <p
                            className="text-[11px] font-bold leading-tight line-clamp-1"
                            style={{
                              color: tpl.textColor === "light" ? "#fff" : "#111",
                              textShadow: tpl.textColor === "light" ? "0 1px 4px rgba(0,0,0,0.55)" : "none",
                            }}
                          >
                            {eventTitle || "Your Event"}
                          </p>
                        </div>
                        <div className="px-2.5 py-2 bg-white border-t border-gray-100 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 leading-tight truncate">{tpl.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{tpl.description}</p>
                          </div>
                          <div
                            className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0"
                            style={{ background: tpl.textColor === "light" ? "#18181b" : "#f4f4f5" }}
                            title={tpl.textColor === "light" ? "Light text" : "Dark text"}
                          />
                        </div>

                        {/* Selected badge */}
                        {isActive && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ───── CUSTOM TAB ───── */}
            {tab === "custom" && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="p-5"
              >
                <div className="flex gap-5">
                  {/* ── Controls column ── */}
                  <div className="flex-1 min-w-0 space-y-5">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Build Your Gradient</p>
                      <p className="text-xs text-gray-400 mt-0.5">Pick two colours and an angle to create your unique ticket style</p>
                    </div>

                    {/* Color pickers */}
                    <div className="space-y-3">
                      {([
                        { label: "Start Colour", value: color1, set: setColor1 },
                        { label: "End Colour",   value: color2, set: setColor2 },
                      ] as const).map(({ label, value, set }) => (
                        <div key={label}>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">{label}</label>
                          <div className="flex items-center gap-3">
                            {/* Color swatch + native picker overlay */}
                            <div className="relative w-11 h-11 rounded-xl border-2 border-white shadow-md shrink-0 cursor-pointer overflow-hidden" style={{ background: value }}>
                              <input
                                type="color"
                                value={value}
                                onChange={(e) => set(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </div>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set(e.target.value); }}
                              className="flex-1 px-3 py-2 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50 uppercase tracking-widest"
                              maxLength={7}
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-600">Direction</label>
                        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg tabular-nums">{angle}°</span>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                        {[45, 90, 135, 180].map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setAngle(a)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              angle === a
                                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {a}°
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={angle}
                        onChange={(e) => setAngle(Number(e.target.value))}
                        className="w-full accent-green-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">Text on Ticket</label>
                      <div className="flex gap-2">
                        {([
                          { value: "light", label: "Light", bg: "#18181b", fg: "#fff"  },
                          { value: "dark",  label: "Dark",  bg: "#f4f4f5", fg: "#111" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setCustomTextColor(opt.value)}
                            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                              customTextColor === opt.value
                                ? "border-green-500 bg-green-50 shadow-sm"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: opt.bg, color: opt.fg }}
                            >
                              Aa
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{opt.label} text</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onApply(customGradient, customTextColor); onClose(); }}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-green-200"
                    >
                      <Wand2 className="w-4 h-4" />
                      Apply Custom Style
                    </button>
                  </div>
                  <div className="w-44 shrink-0 flex flex-col gap-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</p>

                    <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100 flex-1" style={{ minHeight: 180 }}>
                      
                      <div
                        className="flex flex-col justify-end p-3"
                        style={{ background: customGradient, minHeight: 140 }}
                      >
                        <p
                          className="text-xs font-bold leading-tight"
                          style={{
                            color: customTextColor === "light" ? "#fff" : "#111",
                            textShadow: customTextColor === "light" ? "0 1px 4px rgba(0,0,0,0.55)" : "none",
                          }}
                        >
                          {eventTitle || "Your Event"}
                        </p>
                        <p
                          className="text-[10px] mt-0.5 opacity-70"
                          style={{ color: customTextColor === "light" ? "#fff" : "#333" }}
                        >
                          E-Ticket · Custom
                        </p>
                      </div>
                      <div className="px-3 py-2 bg-white flex items-center gap-2 border-t border-gray-100">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color1 }} />
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: color2 }} />
                        <span className="text-[10px] text-gray-400 font-mono ml-1">{angle}°</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 py-2 px-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div
                        className="w-10 h-10 rounded-full border-2 border-gray-200 relative flex items-center justify-center overflow-hidden"
                      >
                        <div
                          className="absolute w-0.5 rounded-full bg-green-600"
                          style={{
                            height: 18,
                            bottom: "50%",
                            left: "calc(50% - 1px)",
                            transformOrigin: "bottom center",
                            transform: `rotate(${angle}deg)`,
                          }}
                        />
                        <div className="w-1.5 h-1.5 rounded-full bg-green-600 relative z-10" />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">{angle}° direction</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80 rounded-b-3xl flex items-center justify-between shrink-0">
          <p className="text-xs text-gray-400">
            {tab === "gallery" ? `${filtered.length} template${filtered.length !== 1 ? "s" : ""}` : "Custom gradient builder"}
          </p>
          <p className="text-xs text-gray-400">Upload a custom image in the main form</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
  const [showTemplates, setShowTemplates] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [assignEvent, setAssignEvent] = useState<Event | null>(null);
  const [assignedAdmins, setAssignedAdmins] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminResults, setAdminResults] = useState<{ _id: string; name: string; email: string }[]>([]);
  const [adminSearching, setAdminSearching] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUserRole(JSON.parse(userData).role || "");
  }, []);
  const stats = {
    total: pagination.total,
    published: events.filter((e) => e.status === "published" || e.status === "ongoing").length,
    revenue: events.reduce((s, e) => s + (e.totalRevenue || 0), 0),
    attendees: events.reduce((s, e) => s + (e.totalSold || 0), 0),
  };
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
  const openAssignModal = async (event: Event) => {
    setAssignEvent(event);
    setAdminSearch("");
    setAdminResults([]);
    try {
      const res = await authFetch(`/api/events/${event._id}/assign-admins`);
      const data = await res.json();
      setAssignedAdmins(data.success ? data.data : []);
    } catch {
      setAssignedAdmins([]);
    }
  };

  const searchAdmins = async (q: string) => {
    setAdminSearch(q);
    if (q.trim().length < 2) { setAdminResults([]); return; }
    setAdminSearching(true);
    try {
      const res = await authFetch(`/api/org-admins/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setAdminResults(data.success ? data.data : []);
    } catch {
      setAdminResults([]);
    } finally {
      setAdminSearching(false);
    }
  };

  const addAdminToList = (admin: { _id: string; name: string; email: string }) => {
    if (!assignedAdmins.find((a) => a._id === admin._id)) {
      setAssignedAdmins((prev) => [...prev, admin]);
    }
    setAdminSearch("");
    setAdminResults([]);
  };

  const removeAdminFromList = (id: string) => {
    setAssignedAdmins((prev) => prev.filter((a) => a._id !== id));
  };

  const saveAssignment = async () => {
    if (!assignEvent) return;
    setAssignSaving(true);
    try {
      const res = await authFetch(`/api/events/${assignEvent._id}/assign-admins`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminIds: assignedAdmins.map((a) => a._id) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${assignedAdmins.length} admin(s) assigned`);
        setAssignEvent(null);
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAssignSaving(false);
    }
  };
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
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
      ticketBg: event.ticketBg || "",
      ticketTextColor: (event.ticketTextColor as "light" | "dark") || "light",
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
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Events" value={stats.total} icon={Calendar} color="bg-blue-50 text-blue-600" />
        <StatCard label="Active Events" value={stats.published} icon={Zap} color="bg-green-50 text-green-600" />
        <StatCard label="Total Revenue" value={formatCurrency(stats.revenue)} icon={DollarSign} color="bg-amber-50 text-amber-600" />
        <StatCard label="Tickets Sold" value={stats.attendees.toLocaleString()} icon={Ticket} color="bg-purple-50 text-purple-600" />
      </div>
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
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="relative h-36 bg-linear-to-br from-green-400 via-teal-500 to-blue-600">
                    {/* Image clipped inside its own wrapper, not the whole banner div */}
                    <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                      {event.banner ? (
                        <img src={event.banner} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-5xl opacity-60">{catEmoji}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90 ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </div>
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
                            className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50"
                          >
                            <button
                              onClick={() => setDetailEvent(event)}
                              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </button>
                            {userRole !== "org-admin" && (
                              <button
                                onClick={() => openEdit(event)}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                              </button>
                            )}
                            {userRole === "event-organizer" && (
                              <button
                                onClick={() => { setActionMenu(null); openAssignModal(event); }}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50"
                              >
                                <Users className="w-3.5 h-3.5" /> Assign Admins
                              </button>
                            )}
                            {userRole !== "org-admin" && (
                              <button
                                onClick={() => handleDelete(event._id)}
                                disabled={deleting === event._id}
                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deleting === event._id ? "Deleting…" : "Delete"}
                              </button>
                            )}
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
                            {t.name} {t.price > 0 ? `• GHS ${t.price}` : "• Free"}
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
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner (optional)</label>
                        <TicketBgUploader
                          value={formData.banner}
                          onChange={(url) => setFormData((p) => ({ ...p, banner: url }))}
                          folder="event-banners"
                          aspectHint="Recommended: 16:9 · PNG, JPG, WebP · max 10 MB"
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
                              className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${(formData.settings as any)[key] ? "bg-green-500" : "bg-gray-300"}`}
                              style={{ width: 40, height: 22 }}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${(formData.settings as any)[key] ? "translate-x-4.5" : ""}`}
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

                      {/* ── Ticket Appearance ── */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <p className="text-sm font-bold text-gray-800">Ticket Appearance</p>
                          <p className="text-xs text-gray-500 mt-0.5">Set a background image and text color for your tickets</p>
                        </div>
                        <div className="p-4 space-y-4">
                          {/* Two-column: controls + preview */}
                          <div className="flex gap-4">
                            {/* Controls */}
                            <div className="flex-1 space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-semibold text-gray-600">
                                    Ticket Background
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setShowTemplates(true)}
                                    className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                                  >
                                    <Star className="w-3.5 h-3.5" />
                                    Use a template
                                  </button>
                                </div>
                                <TicketBgUploader
                                  value={formData.ticketBg}
                                  onChange={(url) => setFormData((p) => ({ ...p, ticketBg: url }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-2">
                                  Ticket Text Color
                                </label>
                                <div className="flex gap-2">
                                  {([
                                    { value: "light", label: "Light", bg: "#1f2937", fg: "#fff", desc: "White text" },
                                    { value: "dark",  label: "Dark",  bg: "#f9fafb", fg: "#111", desc: "Dark text" },
                                  ] as const).map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setFormData((p) => ({ ...p, ticketTextColor: opt.value }))}
                                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${formData.ticketTextColor === opt.value ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                                    >
                                      <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border border-gray-200"
                                        style={{ background: opt.bg, color: opt.fg }}
                                      >
                                        Aa
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                                        <p className="text-xs text-gray-400">{opt.desc}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Live preview */}
                            <div className="w-52 shrink-0">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                              <TicketPreview
                                title={formData.title}
                                ticketBg={formData.ticketBg}
                                ticketTextColor={formData.ticketTextColor}
                                startDate={formData.startDate}
                                startTime={formData.startTime}
                                venueName={formData.venue.name}
                                ticketTypes={formData.ticketTypes}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary */}
                      {formData.ticketTypes.length > 0 && (
                        <div className="bg-linear-to-r from-green-50 to-teal-50 rounded-xl p-4 border border-green-100">
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

      {/* ════════════════ Ticket Template Designer ════════════════ */}
      <AnimatePresence>
        {showTemplates && (
          <TicketTemplateModal
            currentBg={formData.ticketBg}
            eventTitle={formData.title}
            onApply={(gradient, textColor) =>
              setFormData((p) => ({ ...p, ticketBg: gradient, ticketTextColor: textColor }))
            }
            onClose={() => setShowTemplates(false)}
          />
        )}
      </AnimatePresence>
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
              className="bg-white w-full sm:w-120 h-full overflow-y-auto shadow-2xl"
            >
              {/* Detail header */}
              <div className="relative h-52 bg-linear-to-br from-green-400 via-teal-500 to-blue-600 overflow-hidden">
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
                <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
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
      <AnimatePresence>
        {assignEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setAssignEvent(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Assign Admins</h2>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{assignEvent.title}</p>
                </div>
                <button onClick={() => setAssignEvent(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Search org-admins */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Search org-admin by name or email</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={adminSearch}
                      onChange={(e) => searchAdmins(e.target.value)}
                      placeholder="Type to search…"
                      className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  {/* Dropdown results */}
                  {adminResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                      {adminResults.map((admin) => (
                        <button
                          key={admin._id}
                          onClick={() => addAdminToList(admin)}
                          className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-green-50 text-left text-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 shrink-0">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-medium text-gray-900 truncate">{admin.name}</p>
                            <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {adminSearching && (
                    <p className="text-xs text-gray-400 mt-1">Searching…</p>
                  )}
                </div>

                {/* Assigned list */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Assigned admins ({assignedAdmins.length})
                  </label>
                  {assignedAdmins.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      No admins assigned yet.<br />Search above to add one.
                    </div>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {assignedAdmins.map((admin) => (
                        <li key={admin._id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 shrink-0">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-gray-900 truncate">{admin.name}</p>
                            <p className="text-xs text-gray-400 truncate">{admin.email}</p>
                          </div>
                          <button
                            onClick={() => removeAdminFromList(admin._id)}
                            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setAssignEvent(null)}
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAssignment}
                  disabled={assignSaving}
                  className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {assignSaving ? "Saving…" : "Save Assignment"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
