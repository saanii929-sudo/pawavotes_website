"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, Lock } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Logging in...");

    try {
      // Try organization login first
      let response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          userType: "organization",
        }),
      });

      let data = await response.json();

      // If organization login fails, try org-admin login
      if (!response.ok) {
        response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            userType: "org-admin",
          }),
        });

        data = await response.json();
      }

      if (response.ok && data.success) {
        toast.success("Login successful! Redirecting...", {
          id: loadingToast,
        });

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        setTimeout(() => {
          router.push("/dashboard");
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
      <motion.section
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="relative min-h-screen w-full"
      >
        {/* Background */}
        <Image
          src="/images/hero_image.jpg"
          alt="Pawavotes background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />

        {/* Login Card */}
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="w-full relative max-w-md rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur"
          >
            {/* Logo */}
            <div className="mb-8 py-6 flex justify-center items-center">
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

            <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Welcome back
            </h1>
            <p className="mb-8 text-center text-gray-600">
              Sign in to continue to Pawavotes
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email address
                </label>
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

              {/* Password */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300" />
                  Remember me
                </label>
                <a
                  href="/forgot-password"
                  className="text-green-600 hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-500"
              >
                Sign In
              </motion.button>
            </form>
              {/* Sign up */}
              <p className="mt-4 text-center text-sm text-gray-600">
                Don&apos;t have an account?{" "}
                <a
                  href="/contact-us"
                  className="text-green-600 hover:underline"
                >
                  Contact us
                </a>
              </p>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
