"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if superadmin is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tokenTimestamp = localStorage.getItem('tokenTimestamp');
    
    if (token && userData && tokenTimestamp) {
      try {
        const user = JSON.parse(userData);
        const timestamp = parseInt(tokenTimestamp);
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        
        // Check if token is expired (older than 6 hours)
        if (now - timestamp > sixHours) {
          // Token expired, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenTimestamp');
          toast.error('Session expired. Please login again.');
        } else if (user.role === 'superadmin') {
          // Token still valid, redirect
          router.push('/superadmin');
        }
      } catch (error) {
        // Invalid data, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenTimestamp');
      }
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const loginData = {
      email: email.trim(),
      password: password,
      userType: "superadmin",
    };

    const loadingToast = toast.loading("Logging in...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Login successful! Redirecting...", {
          id: loadingToast,
        });

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("tokenTimestamp", Date.now().toString());

        setTimeout(() => {
          router.push("/superadmin");
        }, 500);
      } else {
        toast.error(
          data.error || "Login failed. Please check your credentials.",
          {
            id: loadingToast,
            duration: 4000,
          },
        );
      }
    } catch (err: any) {
      toast.error("Network error. Please try again.", {
        id: loadingToast,
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "14px",
          },
          success: {
            iconTheme: {
              primary: "#16a34a",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#fff",
            },
          },
        }}
      />

      <div className="relative min-h-screen w-full">
        {/* Background */}
        <Image
          src="/images/hero_image.jpg"
          alt="Pawavotes background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur">
            <div className="mb-4 py-6 flex justify-center items-center">
              <Image
                src="/images/logo.png"
                alt="Pawavotes"
                width={70}
                height={70}
                className="absolute md:right-62 right-48"
              />{" "}
              <span className="text-xl font-semibold absolute md:right-40 right-25  text-green-600">
                Pawavotes
              </span>
            </div>
            <div className="text-center mb-6">
              {" "}
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#111827",
                }}
              >
                SuperAdmin Login
              </h1>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                Access the administration panel
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@pawavotes.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    color: "#111827",
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      color: "#111827",
                      backgroundColor: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      padding: "0",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: loading ? "#9ca3af" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <p
              style={{
                marginTop: "20px",
                fontSize: "12px",
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              Pawavotes SuperAdmin Panel © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
