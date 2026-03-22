"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  LogOut,
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Clock,
  User,
  Ticket,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

type Action = "check-in" | "check-out";

interface ScanResult {
  valid: boolean;
  action?: Action;
  eventEnded?: boolean;
  isCheckedIn?: boolean;
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
  code: string;
  buyerName: string;
  action: Action;
  success: boolean;
  message: string;
  time: Date;
}

export default function ScannerDashboard() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  const [user, setUser] = useState<any>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [action, setAction] = useState<Action>("check-in");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("scannerUser");
    if (userData) setUser(JSON.parse(userData));
    setHasBarcodeDetector("BarcodeDetector" in window);
  }, []);

  const handleLogout = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    localStorage.removeItem("scannerToken");
    localStorage.removeItem("scannerUser");
    localStorage.removeItem("scannerTokenTimestamp");
    router.push("/scanner/login");
  };

  const processCode = useCallback(
    async (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;

      // Debounce: same code within 3 seconds = skip
      const now = Date.now();
      if (trimmed === lastScannedRef.current && now - lastScanTimeRef.current < 3000) return;
      lastScannedRef.current = trimmed;
      lastScanTimeRef.current = now;

      setScanning(true);
      setResult(null);

      try {
        const token = localStorage.getItem("scannerToken");
        const res = await fetch("/api/tickets/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: trimmed, action }),
        });
        const data: ScanResult = await res.json();
        setResult(data);

        const log: ScanLog = {
          id: Date.now().toString(),
          code: trimmed,
          buyerName: data.ticket?.buyerName || "Unknown",
          action,
          success: data.valid === true,
          message: data.message || (res.ok ? "Success" : "Failed"),
          time: new Date(),
        };
        setLogs((prev) => [log, ...prev].slice(0, 50));

        if (data.valid) {
          toast.success(data.message || "Success");
        } else {
          toast.error(data.message || "Invalid ticket");
        }
      } catch {
        toast.error("Network error");
      } finally {
        setScanning(false);
        setManualCode("");
      }
    },
    [action]
  );

  // ── Camera scanning using BarcodeDetector ──
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      startScanLoop();
    } catch {
      toast.error("Could not access camera. Use manual input instead.");
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startScanLoop = () => {
    if (!hasBarcodeDetector) return;

    // @ts-ignore — BarcodeDetector not in older TS defs
    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          await processCode(barcodes[0].rawValue);
        }
      } catch {
        /* ignore detect errors */
      }
      scanLoopRef.current = requestAnimationFrame(tick);
    };
    scanLoopRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCode(manualCode);
  };

  const resultBg = result
    ? result.valid
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200"
    : "";

  const resultIcon = result ? (
    result.valid ? (
      <CheckCircle size={40} className="text-green-500" />
    ) : result.eventEnded ? (
      <AlertCircle size={40} className="text-amber-500" />
    ) : (
      <XCircle size={40} className="text-red-500" />
    )
  ) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <QrCode size={22} className="text-green-400" />
          <span className="font-semibold text-white">Ticket Scanner</span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden text-sm text-gray-400 sm:block">
              {user.name || user.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Action Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
          <div>
            <p className="text-sm font-medium text-gray-300">Mode</p>
            <p className="text-lg font-bold capitalize text-white">{action}</p>
          </div>
          <button
            onClick={() => setAction((a) => (a === "check-in" ? "check-out" : "check-in"))}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              action === "check-in"
                ? "bg-green-600 text-white hover:bg-green-500"
                : "bg-orange-600 text-white hover:bg-orange-500"
            }`}
          >
            {action === "check-in" ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
            Switch to {action === "check-in" ? "Check-Out" : "Check-In"}
          </button>
        </div>

        {/* Camera */}
        <div className="rounded-xl bg-gray-800 overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${cameraOn ? "" : "hidden"}`}
              muted
              playsInline
            />
            {!cameraOn && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-600">
                <Camera size={48} />
                <span className="text-sm">Camera off</span>
              </div>
            )}
            {/* Scan overlay */}
            {cameraOn && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-52 w-52 rounded-2xl border-2 border-green-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
              </div>
            )}
          </div>
          <div className="flex gap-2 p-3">
            {!cameraOn ? (
              <button
                onClick={startCamera}
                disabled={!hasBarcodeDetector}
                title={!hasBarcodeDetector ? "BarcodeDetector not supported in this browser. Use manual input." : ""}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Camera size={16} />
                {hasBarcodeDetector ? "Start Camera" : "Camera (unsupported — use manual)"}
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 py-2.5 text-sm font-medium text-white hover:bg-gray-600"
              >
                <CameraOff size={16} />
                Stop Camera
              </button>
            )}
          </div>
        </div>

        {/* Manual Input */}
        <div className="rounded-xl bg-gray-800 p-4">
          <p className="mb-2 text-sm font-medium text-gray-400">Manual / Hardware Scanner</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Scan or type ticket code…"
              autoFocus
              className="flex-1 rounded-lg bg-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || scanning}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {scanning ? <RefreshCw size={16} className="animate-spin" /> : "Scan"}
            </button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-4 ${resultBg}`}>
            <div className="flex items-start gap-3">
              {resultIcon}
              <div className="flex-1">
                <p
                  className={`text-base font-bold ${
                    result.valid ? "text-green-700" : result.eventEnded ? "text-amber-700" : "text-red-700"
                  }`}
                >
                  {result.message}
                </p>
                {result.ticket && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <User size={14} />
                      <span>{result.ticket.buyerName}</span>
                      {result.ticket.buyerPhone && (
                        <span className="text-gray-500">• {result.ticket.buyerPhone}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Ticket size={14} />
                      <span>{result.ticket.ticketTypeName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <QrCode size={14} />
                      <span className="font-mono text-xs">{result.ticket.code}</span>
                    </div>
                    {result.ticket.eventTitle && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={14} />
                        <span>{result.ticket.eventTitle}</span>
                        {result.ticket.eventDate && <span>• {result.ticket.eventDate}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scan Log */}
        {logs.length > 0 && (
          <div className="rounded-xl bg-gray-800 p-4">
            <p className="mb-3 text-sm font-medium text-gray-400">Recent Scans</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-gray-700/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {log.success ? (
                      <CheckCircle size={14} className="shrink-0 text-green-400" />
                    ) : (
                      <XCircle size={14} className="shrink-0 text-red-400" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{log.buyerName}</p>
                      <p className="truncate font-mono text-xs text-gray-500">{log.code}</p>
                    </div>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        log.action === "check-in"
                          ? "bg-green-900/60 text-green-300"
                          : "bg-orange-900/60 text-orange-300"
                      }`}
                    >
                      {log.action}
                    </span>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {log.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
