"use client";
import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authFetch } from "@/lib/authFetch";

const SettingsPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch =
    newPassword && confirmPassword && newPassword !== confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            Account Settings
          </h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm">
            Manage your account security and preferences.
          </p>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5 sm:mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <Lock className="text-green-600" size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Change Password
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Update your account password to keep it secure.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-red-500 mt-1">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className={`w-full pr-10 pl-4 py-2.5 border rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${
                    passwordsMismatch
                      ? "border-red-300 bg-red-50"
                      : passwordsMatch
                        ? "border-green-300 bg-green-50"
                        : "border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  Passwords match
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  loading ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword ||
                  !!passwordsMismatch
                }
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
