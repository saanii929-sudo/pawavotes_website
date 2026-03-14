'use client';
import React, { useState } from 'react';
import { Mail } from 'lucide-react';

const JoinOrganization = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCancel = () => {
    setEmail('');
    // Navigate back or close modal
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Join an Organization</h1>
          <p className="text-gray-500 mt-2">Enter the organization email address and click on the submit button.</p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Green Header */}
          <div className="bg-green-600 text-white px-6 py-4">
            <h2 className="text-lg font-semibold">Organization Email</h2>
            <p className="text-sm text-green-100">Enter the organization email address.</p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Organization Email Address */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Organization Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Mail className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E.g. Hello@gmail.com"
                    required
                    className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-8 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinOrganization;