"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Vote, Lock, Key, Mail, Eye, EyeOff} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};


export default function VoterLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if voter is already authenticated
  useEffect(() => {
    const voterToken = localStorage.getItem('voterToken');
    const voterData = localStorage.getItem('voterData');
    const tokenTimestamp = localStorage.getItem('voterTokenTimestamp');
    
    if (voterToken && voterData && tokenTimestamp) {
      try {
        const data = JSON.parse(voterData);
        const timestamp = parseInt(tokenTimestamp);
        const now = Date.now();
        const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        
        // Check if token is expired (older than 6 hours)
        if (now - timestamp > sixHours) {
          // Token expired, clear storage
          localStorage.removeItem('voterToken');
          localStorage.removeItem('voterData');
          localStorage.removeItem('voterTokenTimestamp');
          toast.error('Session expired. Please login again.');
        } else if (!data.hasVoted) {
          // Token still valid and hasn't voted, redirect
          router.push(`/election?token=${voterToken}`);
        }
      } catch (error) {
        // Invalid data, clear storage
        localStorage.removeItem('voterToken');
        localStorage.removeItem('voterData');
        localStorage.removeItem('voterTokenTimestamp');
      }
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading('Verifying credentials...');

    try {
      const response = await fetch('/api/elections/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.trim().toUpperCase(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Login successful!', { id: loadingToast, duration: 3000 });

        // Store voter data
        localStorage.setItem('voterToken', token.trim().toUpperCase());
        localStorage.setItem('voterData', JSON.stringify(data.data));
        localStorage.setItem('voterTokenTimestamp', Date.now().toString());

        // Redirect to election page with token
        setTimeout(() => {
          router.push(`/election?token=${token.trim().toUpperCase()}`);
        }, 500);
      } else {
        toast.error(data.error || 'Invalid credentials', {
          id: loadingToast,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error. Please try again.', {
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
              Voter Login
            </h1>
            <p className="mb-8 text-center text-gray-600">
              Enter your credentials to cast your vote
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Voter Token
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your 8-character token"
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
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
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your 6-digit password"
                    value={password}
                    minLength={6}
                    disabled={loading}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-11 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-500"
              >
                {loading ? 'Verifying...' : 'Login to Vote'}
              </motion.button>
            </form>
          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Powered by Pawavotes Election System
            </p>
          </div>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
