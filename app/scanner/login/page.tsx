"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, QrCode } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useEffect } from "react";

export default function ScannerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("scannerToken");
    const userData = localStorage.getItem("scannerUser");
    const ts = localStorage.getItem("scannerTokenTimestamp");
    if (token && userData && ts) {
      const sixHours = 6 * 60 * 60 * 1000;
      if (Date.now() - parseInt(ts) < sixHours) {
        router.push("/scanner/dashboard");
      } else {
        localStorage.removeItem("scannerToken");
        localStorage.removeItem("scannerUser");
        localStorage.removeItem("scannerTokenTimestamp");
      }
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("Logging in...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, userType: "scanner" }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("scannerToken", data.token);
        localStorage.setItem("scannerUser", JSON.stringify(data.user));
        localStorage.setItem("scannerTokenTimestamp", Date.now().toString());
        toast.dismiss(loadingToast);
        router.push("/scanner/dashboard");
      } else {
        toast.error(data.error || "Invalid credentials", { id: loadingToast });
      }
    } catch {
      toast.error("Network error. Please try again.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-screen w-full"
      >
        <Image src="/images/hero_image.jpg" alt="background" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur"
          >
            {/* Header */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <QrCode size={28} className="text-green-600" />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Scanner Login</h1>
                <p className="text-sm text-gray-500">Sign in to access the ticket scanner</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-11 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign In"}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              Credentials provided by your event organizer
            </p>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
