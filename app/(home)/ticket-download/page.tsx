"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileImage,
  Printer,
  Loader2,
  Ticket,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Share2,
  Mail,
  X,
  Send,
  MessageCircle,
  ExternalLink,
  Lock,
} from "lucide-react";

interface SharedCode {
  code: string;
  sharedTo: string;
  sharedVia: "email" | "whatsapp";
  sharedAt: string;
}

interface OrderData {
  reference: string;
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  ticketTypeName: string;
  ticketTypeColor: string;
  ticketBg?: string;
  ticketTextColor?: string; // 'light' | 'dark'
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  ticketCodes: string[];
  sharedCodes?: SharedCode[];
  status: string;
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function QRCode({ code, size = 108 }: { code: string; size?: number }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=111111&margin=6`}
      alt={`QR for ${code}`}
      width={size}
      height={size}
      style={{ display: "block", borderRadius: 8 }}
      crossOrigin="anonymous"
    />
  );
}

/* ─── Share Modal ─── */
interface ShareModalProps {
  code: string;
  order: OrderData;
  onClose: () => void;
  onShared: (code: string, sharedTo: string, sharedVia: "email" | "whatsapp") => void;
}

function ShareModal({ code, order, onClose, onShared }: ShareModalProps) {
  const [tab, setTab] = useState<"email" | "whatsapp">("email");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [done, setDone] = useState(false);

  async function handleShare() {
    setError("");
    if (!recipient.trim()) {
      setError(tab === "email" ? "Enter an email address." : "Enter a WhatsApp number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/tickets/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: order.reference,
          ticketCode: code,
          shareVia: tab,
          recipient: recipient.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to share ticket.");
        return;
      }
      if (tab === "whatsapp" && data.whatsappUrl) {
        setWhatsappUrl(data.whatsappUrl);
        // Auto-open WhatsApp immediately so the message is ready to send
        window.open(data.whatsappUrl, "_blank");
      }
      setDone(true);
      onShared(code, recipient.trim(), tab); // updates parent order state only
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-900 text-sm">Transfer Ticket</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{code.slice(0, 20)}…</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="font-bold text-gray-900 mb-1">Ticket Transferred!</p>
              <p className="text-sm text-gray-500 mb-4">
                {tab === "email"
                  ? `Sent to ${recipient}`
                  : "Ticket shared — open WhatsApp to send the message."}
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-5 py-2.5 rounded-xl text-sm mb-3 hover:bg-[#22c05e] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open WhatsApp <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              )}
              <button onClick={onClose} className="block w-full text-center text-sm text-gray-400 hover:text-gray-700 transition-colors mt-2">
                Close
              </button>
            </div>
          ) : (
            <>

              {/* Tab switcher */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => { setTab("email"); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "email" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  onClick={() => { setTab("whatsapp"); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "whatsapp" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>

              {/* Input */}
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {tab === "email" ? "Recipient's email address" : "WhatsApp number (with country code)"}
                </label>
                <input
                  type={tab === "email" ? "email" : "tel"}
                  placeholder={tab === "email" ? "friend@example.com" : "+233 20 000 0000"}
                  value={recipient}
                  onChange={(e) => { setRecipient(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleShare()}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ focusRingColor: "var(--accent)" } as any}
                  autoFocus
                />
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              </div>

              <button
                onClick={handleShare}
                disabled={loading || !recipient.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: order.ticketTypeColor || "#10b981" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {loading ? "Sending…" : tab === "email" ? "Send Ticket by Email" : "Share via WhatsApp"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Ticket Card ─── */
interface TicketCardProps {
  code: string;
  index: number;
  order: OrderData;
  isShared: boolean;
  sharedInfo?: SharedCode;
  onShareClick: (code: string) => void;
  printable?: boolean;
}

function TicketCard({ code, index, order, isShared, sharedInfo, onShareClick, printable }: TicketCardProps) {
  const [hovered, setHovered] = useState(false);
  const color = order.ticketTypeColor || "#10b981";
  const hasBg = !!order.ticketBg;
  const isLightText = !hasBg || order.ticketTextColor !== "dark";
  const textColor = hasBg ? (isLightText ? "#fff" : "#111") : "#111";
  const subColor = hasBg ? (isLightText ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)") : "#888";
  const overlayBg = hasBg ? (isLightText ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)") : "transparent";

  return (
    <div
      className={`ticket-card${isShared ? " shared-ticket" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...(hasBg
          ? { backgroundImage: `url(${order.ticketBg})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: "#fff" }),
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: isShared
          ? "0 2px 12px rgba(0,0,0,0.06)"
          : "0 8px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        maxWidth: 560,
        width: "100%",
        margin: "0 auto",
        opacity: isShared ? 0.55 : 1,
        filter: isShared ? "grayscale(0.6)" : "none",
        transition: "box-shadow 0.2s, opacity 0.2s",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      {/* Share hover button — only for non-shared tickets, not in print mode */}
      {!isShared && !printable && (
        <AnimatePresence>
          {hovered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => onShareClick(code)}
              className="no-print absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-900 hover:text-white hover:border-gray-900 font-semibold text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Transfer
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Shared overlay stamp */}
      {isShared && (
        <div
          className="no-print absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[20px]"
          style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(2px)" }}
        >
          <div className="bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
            <Lock className="w-3.5 h-3.5" />
            Transferred
          </div>
          {sharedInfo && (
            <p className="text-xs text-gray-600 mt-2 font-medium">
              Sent to <span className="font-bold text-gray-800">{sharedInfo.sharedTo}</span> via {sharedInfo.sharedVia === "email" ? "email" : "WhatsApp"}
            </p>
          )}
        </div>
      )}
      {/* Overlay for background image */}
      {hasBg && (
        <div style={{ position: "absolute", inset: 0, background: overlayBg, zIndex: 0, pointerEvents: "none" }} />
      )}

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "18px 22px 14px",
          background: hasBg ? "transparent" : `linear-gradient(135deg, ${color}15 0%, ${color}06 100%)`,
          borderBottom: hasBg ? `1px solid ${isLightText ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}` : `1px solid ${color}20`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 9, color: subColor, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", margin: 0 }}>PAWAVOTES EVENTS</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: textColor, margin: 0 }}>{order.ticketTypeName}</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: subColor, margin: 0 }}>Ticket {index + 1} of {order.quantity}</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: hasBg ? textColor : color, margin: 0 }}>
              {order.unitPrice === 0 ? "FREE" : `GHS ${order.unitPrice.toFixed(2)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Main body */}
      <div style={{ display: "flex", flex: 1, position: "relative", zIndex: 1 }}>
        {/* Event info */}
        <div style={{ flex: 1, padding: "16px 18px 16px 22px" }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: textColor, margin: "0 0 12px 0", lineHeight: 1.25 }}>
            {order.eventTitle}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {order.eventDate && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={hasBg ? textColor : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <p style={{ fontSize: 12, color: hasBg ? textColor : "#333", margin: 0, fontWeight: 500 }}>{formatDate(order.eventDate)}</p>
              </div>
            )}
            {order.eventTime && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={hasBg ? textColor : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <p style={{ fontSize: 12, color: hasBg ? textColor : "#333", margin: 0, fontWeight: 500 }}>{order.eventTime}</p>
              </div>
            )}
            {order.venueName && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={hasBg ? textColor : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <p style={{ fontSize: 12, color: hasBg ? textColor : "#333", margin: 0, fontWeight: 600 }}>{order.venueName}</p>
                  {order.venueAddress && <p style={{ fontSize: 11, color: subColor, margin: "2px 0 0 0" }}>{order.venueAddress}</p>}
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={hasBg ? textColor : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <p style={{ fontSize: 12, color: hasBg ? textColor : "#333", margin: 0, fontWeight: 500 }}>{order.buyerName}</p>
            </div>
          </div>
        </div>

        {/* Perforated divider */}
        <div style={{ width: 1, background: `repeating-linear-gradient(to bottom, ${hasBg ? (isLightText ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)") : `${color}35`} 0px, ${hasBg ? (isLightText ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)") : `${color}35`} 6px, transparent 6px, transparent 12px)`, margin: "10px 0", position: "relative", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", width: 18, height: 18, borderRadius: "50%", background: "#f3f4f6", border: "1px solid #e5e7eb" }} />
          <div style={{ position: "absolute", bottom: -9, left: "50%", transform: "translateX(-50%)", width: 18, height: 18, borderRadius: "50%", background: "#f3f4f6", border: "1px solid #e5e7eb" }} />
        </div>

        {/* QR code — always white bg for scanability */}
        <div style={{ width: 148, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 18px", gap: 8, flexShrink: 0 }}>
          <div style={{ padding: 5, background: "#fff", border: "2px solid rgba(0,0,0,0.08)", borderRadius: 11 }}>
            <QRCode code={code} size={108} />
          </div>
          <p style={{ fontSize: 8, color: subColor, textAlign: "center", margin: 0, letterSpacing: "0.05em", textTransform: "uppercase" }}>Scan at entrance</p>
        </div>
      </div>

      {/* Stub — always neutral for readability */}
      <div style={{ position: "relative", zIndex: 1, borderTop: `2px dashed ${hasBg ? (isLightText ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)") : `${color}35`}`, background: hasBg ? (isLightText ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.4)") : `${color}07`, padding: "9px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 8, color: subColor, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px 0" }}>TICKET CODE</p>
          <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: textColor, letterSpacing: "0.08em", margin: 0 }}>{code}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 8, color: subColor, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2px 0" }}>REF</p>
          <p style={{ fontFamily: "monospace", fontSize: 10, color: subColor, margin: 0 }}>{order.reference}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
function TicketDownloadContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") || "";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareTarget, setShareTarget] = useState<string | null>(null);

  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reference) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/public/tickets/status?ref=${reference}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data.status === "completed") setOrder(data.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [reference]);

  const handlePrint = useCallback(() => window.print(), []);

  const handleDownloadImage = useCallback(async () => {
    if (!printableRef.current || !order) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(printableRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f9fafb",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `tickets-${order.reference}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) {
      console.error("Image download failed", err);
    } finally {
      setDownloading(false);
    }
  }, [order]);

  function handleShared(code: string, sharedTo: string, sharedVia: "email" | "whatsapp") {
    // Update the order state so the ticket shows as transferred immediately
    // Don't close the modal here — it stays open showing the success screen
    setOrder((prev) => {
      if (!prev) return prev;
      const existing = prev.sharedCodes || [];
      return {
        ...prev,
        sharedCodes: [...existing, { code, sharedTo, sharedVia, sharedAt: new Date().toISOString() }],
      };
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
        <p className="text-gray-500 text-sm font-medium">Loading your tickets…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-5">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Tickets Not Found</h2>
        <p className="text-gray-400 text-sm mb-6 max-w-xs">
          We couldn't find this order. Tickets are only available after payment is confirmed.
        </p>
        <Link href="/ticketing" className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
          <ChevronLeft className="w-4 h-4" /> Browse Events
        </Link>
      </div>
    );
  }

  const color = order!.ticketTypeColor || "#10b981";
  const sharedCodes = order!.sharedCodes || [];
  const sharedCodeSet = new Set(sharedCodes.map((s) => s.code));
  const availableCodes = order!.ticketCodes.filter((c) => !sharedCodeSet.has(c));
  const allShared = availableCodes.length === 0;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-tickets, #printable-tickets * { visibility: visible; }
          #printable-tickets {
            position: fixed;
            inset: 0;
            padding: 24px;
            background: white !important;
          }
          .no-print { display: none !important; }
          .shared-ticket { display: none !important; }
          .ticket-card {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 32px !important;
          }
        }
      `}</style>

      {/* Share Modal */}
      <AnimatePresence>
        {shareTarget && (
          <ShareModal
            code={shareTarget}
            order={order!}
            onClose={() => setShareTarget(null)}
            onShared={handleShared}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gray-100">
        {/* Top bar */}
        <div className="no-print sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href={`/ticket-success?ref=${reference}`}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Link>
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <Ticket className="w-4 h-4 text-emerald-600" /> My Tickets
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadImage}
                disabled={downloading || allShared}
                title={allShared ? "All tickets have been transferred" : undefined}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
                {downloading ? "Saving…" : "Image"}
              </button>
              <button
                onClick={handlePrint}
                disabled={allShared}
                title={allShared ? "All tickets have been transferred" : undefined}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-10">
          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="no-print text-center mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-3"
              style={{ background: `${color}18`, color }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {order!.quantity} Ticket{order!.quantity > 1 ? "s" : ""} Confirmed
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{order!.eventTitle}</h1>
            <p className="text-gray-400 text-sm">
              Hover a ticket to <span className="font-semibold text-gray-600">transfer it</span> to someone
            </p>
          </motion.div>

          {/* Printable ticket area */}
          <div id="printable-tickets" ref={printableRef} style={{ padding: 16, background: "#f9fafb", borderRadius: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {order!.ticketCodes.map((code, i) => {
                const isShared = sharedCodeSet.has(code);
                const sharedInfo = sharedCodes.find((s) => s.code === code);
                return (
                  <motion.div
                    key={code}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <TicketCard
                      code={code}
                      index={i}
                      order={order!}
                      isShared={isShared}
                      sharedInfo={sharedInfo}
                      onShareClick={setShareTarget}
                    />
                  </motion.div>
                );
              })}
            </div>
            <div style={{ textAlign: "center", marginTop: 24, padding: "10px 0" }}>
              <p style={{ fontSize: 10, color: "#ccc", letterSpacing: "0.06em" }}>
                POWERED BY PAWAVOTES · pawavotes.com · Tickets are non-transferable after use
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TicketDownloadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
        <p className="text-gray-500 text-sm font-medium">Loading your tickets…</p>
      </div>
    }>
      <TicketDownloadContent />
    </Suspense>
  );
}