"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Transfer {
  _id: string;
  referenceId: string;
  awardId: string;
  organizationId: string;
  amount: number;
  platformFee: number;
  totalRevenue: number;
  currency: string;
  recipientName: string;
  recipientBank?: string;
  recipientAccountNumber?: string;
  recipientPhoneNumber?: string;
  transferType: 'bank' | 'mobile_money';
  status: 'successful' | 'pending' | 'failed';
  initiatedBy: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const WithdrawalsPage = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'successful' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/superadmin/withdrawals", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTransfers(data.data || []);
      } else {
        toast.error("Failed to fetch withdrawals");
      }
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
      toast.error("Failed to fetch withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const updateTransferStatus = async (transferId: string, status: 'successful' | 'failed') => {
    const loadingToast = toast.loading(`Updating status to ${status}...`);
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/superadmin/withdrawals/${transferId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(`Withdrawal marked as ${status}!`, { id: loadingToast });
        fetchTransfers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update status', { id: loadingToast });
      }
    } catch (error) {
      toast.error('Failed to update status', { id: loadingToast });
    }
  };

  const filteredTransfers = transfers.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch = searchQuery === '' || 
      t.referenceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.initiatedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: transfers.length,
    pending: transfers.filter(t => t.status === 'pending').length,
    successful: transfers.filter(t => t.status === 'successful').length,
    failed: transfers.filter(t => t.status === 'failed').length,
    totalAmount: transfers.filter(t => t.status === 'successful').reduce((sum, t) => sum + t.amount, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-500">Loading withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Withdrawal Requests</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Manage organizer withdrawal requests
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-600 mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-orange-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-green-600 mb-1">Successful</p>
            <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-red-600 mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs text-gray-600 mb-1">Total Paid Out</p>
            <p className="text-lg font-bold text-gray-900">GHS {stats.totalAmount.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by reference, recipient, or initiator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'pending' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('successful')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'successful' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Successful
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Failed
              </button>
            </div>
          </div>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredTransfers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initiated By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-gray-900">{transfer.referenceId}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{transfer.recipientName}</p>
                          <p className="text-xs text-gray-500">
                            {transfer.transferType === 'bank'
                              ? `${transfer.recipientBank} • ${transfer.recipientAccountNumber}`
                              : `Mobile Money • ${transfer.recipientPhoneNumber}`}
                          </p>
                          {transfer.notes && <p className="text-xs text-gray-500">{transfer.notes}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-gray-900">{transfer.currency} {transfer.amount.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 capitalize">{transfer.transferType.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-900">{transfer.initiatedBy}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-600">
                          {new Date(transfer.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transfer.status === 'successful'
                              ? 'bg-green-100 text-green-700'
                              : transfer.status === 'pending'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transfer.status === 'successful' && <CheckCircle size={12} />}
                          {transfer.status === 'pending' && <Clock size={12} />}
                          {transfer.status === 'failed' && <XCircle size={12} />}
                          {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {transfer.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateTransferStatus(transfer._id, 'successful')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => updateTransferStatus(transfer._id, 'failed')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawalsPage;
