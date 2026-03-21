"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import {
  CheckCircle,
  Ticket,
  Mail,
  Download,
  Calendar,
  ArrowRight,
  Loader2,
  Home,
  Share2,
  Copy,
  Check,
} from "lucide-react";

interface OrderInfo {
  reference: string;
  eventTitle: string;
  ticketTypeName: string;
  ticketTypeColor: string;
  quantity: number;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  ticketCodes: string[];
  status: string;
}

function ConfettiPiece({ style }: { style: React.CSSProperties }) {
  return (
    <motion.div
      className="absolute w-2.5 h-2.5 rounded-sm"
      style={style}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{ y: "100vh", opacity: 0, rotate: 720 }}
      transition={{ duration: Math.random() * 2 + 2, ease: "easeIn" }}
    />
  );
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function TicketSuccessPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") || "";
  const isFree = searchParams.get("free") === "1";

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confetti] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 0.8,
      size: Math.random() * 8 + 6,
    }))
  );
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) { setNotFound(true); setLoading(false); return; }

    fetch(`/api/public/tickets/status?ref=${reference}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrder(data.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [reference]);

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading your tickets…</p>
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
          <Ticket className="w-14 h-14 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Tickets Not Found</h2>
          <p className="text-gray-400 text-sm mb-4 max-w-xs">
            We couldn't find your ticket order. If you just paid, your tickets may still be processing — please check your email.
          </p>
          <Link href="/ticketing" className="text-emerald-600 font-semibold hover:underline">
            Browse events
          </Link>
        </div>
      </>
    );
  }

  const isPending = !order || order.status === "pending";
  const isCompleted = order?.status === "completed";

  return (
    <>
      <PublicNav />
      <div className="relative overflow-hidden min-h-screen bg-linear-to-b from-emerald-50 to-gray-50">

        {/* Confetti */}
        {isCompleted && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {confetti.map((c) => (
              <ConfettiPiece
                key={c.id}
                style={{
                  left: c.left,
                  top: 0,
                  backgroundColor: c.color,
                  width: c.size,
                  height: c.size,
                  animationDelay: `${c.delay}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">

          {/* Status header */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center text-center mb-8"
          >
            {isPending ? (
              <>
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Processing Payment</h1>
                <p className="text-gray-500 text-sm max-w-xs">
                  Your payment is being verified. Your tickets will be emailed to you once confirmed — usually within a minute.
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                  className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-5"
                >
                  <CheckCircle className="w-14 h-14 text-emerald-600" />
                </motion.div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">You're in! 🎉</h1>
                <p className="text-gray-500 text-sm max-w-sm">
                  Your tickets are confirmed. We've sent them to{" "}
                  <span className="font-semibold text-gray-700">{order?.buyerEmail}</span>
                </p>
              </>
            )}
          </motion.div>

          {/* Order card */}
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden mb-6"
            >
              {/* Card header */}
              <div
                className="px-6 py-5 text-white"
                style={{ background: `linear-gradient(135deg, ${order.ticketTypeColor}, ${order.ticketTypeColor}cc)` }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-medium mb-1">EVENT</p>
                    <h2 className="font-extrabold text-lg leading-tight">{order.eventTitle}</h2>
                    <p className="text-white/80 text-xs mt-1">{order.ticketTypeName} · {order.quantity} ticket{order.quantity > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-xs">Total</p>
                    <p className="font-extrabold text-xl">
                      {order.totalAmount === 0 ? "Free" : `GHS ${order.totalAmount.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ticket codes */}
              {isCompleted && order.ticketCodes.length > 0 && (
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Ticket className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-bold text-gray-800">
                      Your Ticket{order.ticketCodes.length > 1 ? "s" : ""}
                    </p>
                    <span className="text-xs text-gray-400">(present at entrance)</span>
                  </div>
                  <div className="space-y-2">
                    {order.ticketCodes.map((code, i) => (
                      <div
                        key={code}
                        className="flex items-center justify-between border-2 border-dashed rounded-xl px-4 py-3"
                        style={{ borderColor: order.ticketTypeColor + "60" }}
                      >
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Ticket {i + 1} of {order.ticketCodes.length}</p>
                          <p className="font-mono font-bold text-gray-900 tracking-widest text-sm">{code}</p>
                        </div>
                        <button
                          onClick={() => copyCode(code)}
                          className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                        >
                          {copied === code ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buyer info + ref */}
              <div className="px-6 pb-5 space-y-2 border-t border-gray-100 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Registered to</span>
                  <span className="font-semibold text-gray-800">{order.buyerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-700 truncate ml-4 max-w-50">{order.buyerEmail}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Reference</span>
                  <span className="font-mono text-gray-400">{order.reference}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col gap-3"
          >
            {isCompleted && reference && (
              <Link
                href={`/ticket-download?ref=${reference}`}
                className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <Download className="w-4 h-4" /> Download / Print Tickets
              </Link>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/ticketing"
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" /> Browse More Events
              </Link>
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                <Home className="w-4 h-4" /> Go Home
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
