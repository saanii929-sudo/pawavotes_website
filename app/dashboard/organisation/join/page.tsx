'use client';
import React, { useState } from 'react';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const JoinOrganization = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ orgName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/organization/join-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ organizationEmail: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send request');
        return;
      }
      setSubmitted({ orgName: data.data.organizationName });
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-start justify-start">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Sent!</h2>
            <p className="text-gray-500 mb-1">
              Your join request has been sent to <span className="font-semibold text-gray-800">{submitted.orgName}</span>.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              You'll be notified once the organization reviews and approves your request.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setSubmitted(null); setEmail(''); }}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                Send another request
              </button>
              <button
                onClick={() => router.push('/dashboard/organisation')}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                My Organizations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full max-w-2xl">
        {/* Back link */}
        <button
          onClick={() => router.push('/dashboard/organisation')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
        >
          <ArrowLeft size={15} />
          Back to My Organizations
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Join an Organization</h1>
          <p className="text-gray-500 mt-2">
            Enter the organization's email address. The owner will review and approve your request.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-600 text-white px-6 py-4">
            <h2 className="text-lg font-semibold">Organization Email</h2>
            <p className="text-sm text-green-100">We'll send your join request directly to the organization owner.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Organization Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. hello@organization.com"
                    required
                    className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  The organization owner will be notified and must approve your request before you can access their dashboard.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/organisation')}
                className="px-8 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                ) : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;
