"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Login page doesn't need auth
    if (pathname === "/scanner/login") {
      setReady(true);
      return;
    }

    const token = localStorage.getItem("scannerToken");
    const ts = localStorage.getItem("scannerTokenTimestamp");
    if (!token || !ts || Date.now() - parseInt(ts) > 6 * 60 * 60 * 1000) {
      localStorage.removeItem("scannerToken");
      localStorage.removeItem("scannerUser");
      localStorage.removeItem("scannerTokenTimestamp");
      router.push("/scanner/login");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-green-400" />
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { background: "#1f2937", color: "#fff", borderRadius: "10px", fontSize: "14px" },
          success: { iconTheme: { primary: "#22c55e", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      {children}
    </>
  );
}
