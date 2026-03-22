"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode, LogOut, Camera, CameraOff, CheckCircle, XCircle,
  AlertCircle, User, Ticket, MapPin, Calendar, Hash,
  ArrowLeftRight, ScanLine, Keyboard,
} from "lucide-react";
import toast from "react-hot-toast";

type Action = "check-in" | "check-out";
type CamState = "idle" | "requesting" | "active" | "denied" | "unavailable";

interface ScanResult {
  valid: boolean;
  eventEnded?: boolean;
  message: string;
  ticket?: {
    code: string;
    buyerName: string;
    buyerPhone?: string;
    ticketTypeName: string;
    eventTitle: string;
    eventDate?: string;
    venueName?: string;
  };
}

interface ScanLog {
  id: string;
  buyerName: string;
  ticketType: string;
  action: Action;
  success: boolean;
  time: Date;
}

export default function ScannerDashboard() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastCodeRef = useRef("");
  const lastTimeRef = useRef(0);
  const processingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [action, setAction] = useState<Action>("check-in");
  const [camState, setCamState] = useState<CamState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [stats, setStats] = useState({ checkins: 0, checkouts: 0 });
  const [tab, setTab] = useState<"camera" | "log">("camera");
  const [resultFlash, setResultFlash] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("scannerUser");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  const handleLogout = () => {
    stopCamera();
    ["scannerToken", "scannerUser", "scannerTokenTimestamp"].forEach((k) =>
      localStorage.removeItem(k)
    );
    router.push("/scanner/login");
  };

  const processCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const now = Date.now();
      if (trimmed === lastCodeRef.current && now - lastTimeRef.current < 3000) return;
      lastCodeRef.current = trimmed;
      lastTimeRef.current = now;

      setScanning(true);
      setResult(null);
      try {
        const token = localStorage.getItem("scannerToken");
        const res = await fetch("/api/tickets/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ code: trimmed, action }),
        });
        const data: ScanResult = await res.json();
        setResult(data);
        setResultFlash(true);
        setTimeout(() => setResultFlash(false), 600);

        const log: ScanLog = {
          id: Date.now().toString(),
          buyerName: data.ticket?.buyerName || "Unknown",
          ticketType: data.ticket?.ticketTypeName || "",
          action,
          success: !!data.valid,
          time: new Date(),
        };
        setLogs((p) => [log, ...p].slice(0, 100));
        if (data.valid) {
          setStats((s) => ({
            ...s,
            checkins: action === "check-in" ? s.checkins + 1 : s.checkins,
            checkouts: action === "check-out" ? s.checkouts + 1 : s.checkouts,
          }));
        }
      } catch {
        toast.error("Connection error — check your internet");
      } finally {
        setScanning(false);
        setManualCode("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [action]
  );

  // jsQR scan loop
  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const tick = async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!processingRef.current) {
          processingRef.current = true;
          try {
            const jsQR = (await import("jsqr")).default;
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            if (code?.data) await processCode(code.data);
          } catch { /* ignore */ } finally {
            processingRef.current = false;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [processCode]);

  const startCamera = useCallback(async () => {
    setCamState("requesting");
    try {
      // Check permission state first if API is available
      if (navigator.permissions) {
        try {
          const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (perm.state === "denied") {
            setCamState("denied");
            return;
          }
        } catch { /* permissions API not fully supported, continue */ }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState("active");
      startScanLoop();
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCamState("denied");
      } else if (err?.name === "NotFoundError") {
        setCamState("unavailable");
      } else {
        setCamState("idle");
        toast.error("Could not start camera");
      }
    }
  }, [startScanLoop]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamState("idle");
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) processCode(manualCode);
  };

  const isCheckin = action === "check-in";

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1a1f35 100%)" }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
            <QrCode size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Ticket Scanner</p>
            {user && (
              <p className="text-xs text-slate-500 leading-tight">{user.name || user.email}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pill */}
          <div className="hidden sm:flex items-center gap-3 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium">
            <span className="text-green-400">{stats.checkins} in</span>
            <span className="text-slate-600">·</span>
            <span className="text-orange-400">{stats.checkouts} out</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-slate-500 hover:text-white hover:bg-white/5 transition"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {/* ── Mode selector ── */}
      <div className="flex items-center gap-2 px-5 pt-5">
        <button
          onClick={() => setAction("check-in")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
            isCheckin
              ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
              : "bg-white/5 text-slate-500 hover:bg-white/10"
          }`}
        >
          <CheckCircle size={16} /> Check In
        </button>
        <button
          onClick={() => setAction("check-out")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
            !isCheckin
              ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
              : "bg-white/5 text-slate-500 hover:bg-white/10"
          }`}
        >
          <ArrowLeftRight size={16} /> Check Out
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-5 pt-4">
        {(["camera", "log"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition capitalize ${
              tab === t ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "camera" ? "Scanner" : `Log (${logs.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 pt-3 pb-6 space-y-4">
        {tab === "camera" ? (
          <>
            {/* ── Camera viewport ── */}
            <div
              className={`relative overflow-hidden rounded-2xl transition-all ${
                resultFlash && result?.valid
                  ? "ring-2 ring-green-400"
                  : resultFlash && !result?.valid
                  ? "ring-2 ring-red-400"
                  : "ring-1 ring-white/5"
              }`}
              style={{ aspectRatio: "4/3", background: "#080c16" }}
            >
              <video
                ref={videoRef}
                className={`h-full w-full object-cover ${camState === "active" ? "" : "hidden"}`}
                muted
                playsInline
              />

              {/* Camera idle / states */}
              {camState !== "active" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                  {camState === "idle" && (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                        <Camera size={32} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Ready to scan</p>
                        <p className="text-xs text-slate-500 mt-1">Tap below to enable camera</p>
                      </div>
                    </>
                  )}
                  {camState === "requesting" && (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
                        <Camera size={32} className="text-slate-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Waiting for permission…</p>
                        <p className="text-xs text-slate-500 mt-1">
                          A browser prompt should appear. Click <strong className="text-white">Allow</strong>.
                        </p>
                      </div>
                    </>
                  )}
                  {camState === "denied" && (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
                        <CameraOff size={32} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Camera access blocked</p>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Click the <span className="text-white font-medium">🔒 lock icon</span> in your browser's address bar, set <span className="text-white font-medium">Camera → Allow</span>, then reload the page.
                        </p>
                      </div>
                    </>
                  )}
                  {camState === "unavailable" && (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                        <CameraOff size={32} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">No camera detected</p>
                        <p className="text-xs text-slate-500 mt-1">Use the manual input or a hardware scanner below.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Viewfinder */}
              {camState === "active" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-52 w-52">
                    <span className="absolute top-0 left-0 h-7 w-7 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-lg" />
                    <span className="absolute top-0 right-0 h-7 w-7 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-green-400 rounded-br-lg" />
                    <div className="absolute inset-x-1 top-0 h-0.5 bg-linear-to-r from-transparent via-green-400 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-sm">
                    <ScanLine size={12} className="text-green-400" />
                    <span className="text-xs text-green-300 font-medium">
                      {scanning ? "Processing…" : "Scanning…"}
                    </span>
                  </div>
                </div>
              )}

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-sm text-white font-medium">Verifying…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Camera toggle button */}
            {camState !== "active" ? (
              <button
                onClick={startCamera}
                disabled={camState === "requesting" || camState === "denied" || camState === "unavailable"}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
                  camState === "denied" || camState === "unavailable"
                    ? "bg-white/5 text-slate-500 cursor-not-allowed"
                    : camState === "requesting"
                    ? "bg-white/5 text-slate-400 cursor-wait"
                    : isCheckin
                    ? "bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20"
                    : "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/20"
                }`}
              >
                <Camera size={18} />
                {camState === "requesting" ? "Waiting for camera access…" : "Enable Camera Scanner"}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3.5 text-sm font-medium text-slate-400 hover:bg-white/5 transition"
              >
                <CameraOff size={16} /> Stop Camera
              </button>
            )}

            {/* Manual input toggle */}
            <button
              onClick={() => {
                setShowManual((v) => !v);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="flex w-full items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition py-1"
            >
              <Keyboard size={14} />
              {showManual ? "Hide manual input" : "Use manual / hardware scanner input"}
            </button>

            {showManual && (
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Type or scan ticket code…"
                  autoFocus
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || scanning}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    isCheckin
                      ? "bg-green-500 hover:bg-green-400 text-white disabled:opacity-40"
                      : "bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-40"
                  }`}
                >
                  Scan
                </button>
              </form>
            )}

            {/* ── Scan Result ── */}
            {result && (
              <div
                className={`rounded-2xl border p-5 transition-all ${
                  result.valid
                    ? "border-green-500/30 bg-green-500/10"
                    : result.eventEnded
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      result.valid
                        ? "bg-green-500/20"
                        : result.eventEnded
                        ? "bg-amber-500/20"
                        : "bg-red-500/20"
                    }`}
                  >
                    {result.valid ? (
                      <CheckCircle size={24} className="text-green-400" />
                    ) : result.eventEnded ? (
                      <AlertCircle size={24} className="text-amber-400" />
                    ) : (
                      <XCircle size={24} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-base font-bold leading-tight ${
                        result.valid
                          ? "text-green-400"
                          : result.eventEnded
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {result.message}
                    </p>

                    {result.ticket && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-slate-500 shrink-0" />
                          <span className="text-sm font-semibold text-white">{result.ticket.buyerName}</span>
                          {result.ticket.buyerPhone && (
                            <span className="text-xs text-slate-500">{result.ticket.buyerPhone}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {result.ticket.ticketTypeName && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Ticket size={12} className="text-slate-600" />
                              {result.ticket.ticketTypeName}
                            </div>
                          )}
                          {result.ticket.eventTitle && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Calendar size={12} className="text-slate-600" />
                              {result.ticket.eventTitle}
                            </div>
                          )}
                          {result.ticket.venueName && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <MapPin size={12} className="text-slate-600" />
                              {result.ticket.venueName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                          <Hash size={11} />
                          {result.ticket.code}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── Scan Log Tab ── */
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Today's Scans</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400 font-medium">{stats.checkins} check-ins</span>
                <span className="text-slate-600">·</span>
                <span className="text-orange-400 font-medium">{stats.checkouts} check-outs</span>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 mb-3">
                  <ScanLine size={24} className="text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">No scans yet</p>
                <p className="text-xs text-slate-600 mt-1">Scanned tickets will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        log.success
                          ? log.action === "check-in"
                            ? "bg-green-500/15"
                            : "bg-orange-500/15"
                          : "bg-red-500/15"
                      }`}
                    >
                      {log.success ? (
                        <CheckCircle
                          size={15}
                          className={log.action === "check-in" ? "text-green-400" : "text-orange-400"}
                        />
                      ) : (
                        <XCircle size={15} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{log.buyerName}</p>
                      {log.ticketType && (
                        <p className="text-xs text-slate-500 truncate">{log.ticketType}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                          log.action === "check-in"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-orange-500/15 text-orange-400"
                        }`}
                      >
                        {log.action}
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {log.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 4px; opacity: 0.8; }
          50% { top: calc(100% - 4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
