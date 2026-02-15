"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Search, DollarSign, TrendingUp, CreditCard, Smartphone, Calendar, User, Building2, FileText } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading withdrawals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl sm:rounded-2xl p-6 sm:p-8 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
              <DollarSign className="w-8 h-8" />
              Withdrawal Requests
            </h1>
            <p className="text-black text-sm sm:text-base">
              Manage organizer withdrawal requests and payouts
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-600 text-white backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border-l-4 border-blue-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <FileText className="text-white w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-1 font-medium">Total Requests</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border-l-4 border-orange-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Clock className="text-white w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-orange-600 mb-1 font-medium">Pending</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border-l-4 border-green-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <CheckCircle className="text-white w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-green-600 mb-1 font-medium">Successful</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.successful}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border-l-4 border-red-500 group hover:scale-105">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <XCircle className="text-white w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-red-600 mb-1 font-medium">Failed</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.failed}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 sm:p-6 border-l-4 border-purple-500 group hover:scale-105 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <DollarSign className="text-white w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-1 font-medium">Total Paid Out</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">GHS {stats.totalAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by reference, recipient, or initiator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'all' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'pending' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('successful')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'successful' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Successful ({stats.successful})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === 'failed' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Failed ({stats.failed})
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-hidden">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium">No withdrawal requests found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-scroll">
            <table className="w-full">
              <thead>
                <tr className=" text-black">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Recipient</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Initiated By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((transfer, index) => (
                  <tr 
                    key={transfer._id} 
                    className={`border-b hover:bg-orange-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <p className="font-semibold text-gray-900 text-xs">{transfer.recipientName}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          {transfer.transferType === 'bank' ? (
                            <>
                              <Building2 className="w-3 h-3 text-gray-400" />
                              <span>{transfer.recipientBank} • {transfer.recipientAccountNumber}</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3 h-3 text-gray-400" />
                              <span>Mobile Money • {transfer.recipientPhoneNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-gray-900 text-xs">{transfer.currency} {transfer.amount.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        transfer.transferType === 'bank' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {transfer.transferType === 'bank' ? (
                          <> Bank Transfer</>
                        ) : (
                          <p className="text-xs"> MoMo</p>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-medium">{transfer.initiatedBy}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(transfer.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          transfer.status === 'successful'
                            ? 'bg-green-100 text-green-700'
                            : transfer.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {transfer.status === 'successful' && <CheckCircle className="w-3 h-3" />}
                        {transfer.status === 'pending' && <Clock className="w-3 h-3" />}
                        {transfer.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {transfer.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTransferStatus(transfer._id, 'successful')}
                            className="px-4 py-2 cursor-pointer bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateTransferStatus(transfer._id, 'failed')}
                            className="px-4 py-2 cursor-pointer bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {filteredTransfers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium">No withdrawal requests found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredTransfers.map((transfer) => (
            <div 
              key={transfer._id} 
              className="bg-white rounded-xl shadow-md p-4 border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-mono text-sm text-gray-900 font-semibold truncate">{transfer.referenceId}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      transfer.status === 'successful'
                        ? 'bg-green-100 text-green-700'
                        : transfer.status === 'pending'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {transfer.status === 'successful' && <CheckCircle className="w-3 h-3" />}
                    {transfer.status === 'pending' && <Clock className="w-3 h-3" />}
                    {transfer.status === 'failed' && <XCircle className="w-3 h-3" />}
                    {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-linear-to-r from-orange-50 to-amber-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 mb-1">Amount</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <p className="text-2xl font-bold text-gray-900">{transfer.currency} {transfer.amount.toFixed(2)}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Recipient</p>
                    <p className="font-semibold text-gray-900 text-sm">{transfer.recipientName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  {transfer.transferType === 'bank' ? (
                    <>
                      <Building2 className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Bank Transfer</p>
                        <p className="text-sm text-gray-900">{transfer.recipientBank}</p>
                        <p className="text-xs text-gray-600">{transfer.recipientAccountNumber}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Mobile Money</p>
                        <p className="text-sm text-gray-900">{transfer.recipientPhoneNumber}</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Initiated by:</span>
                  <span className="text-gray-900 font-medium">{transfer.initiatedBy}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {new Date(transfer.createdAt).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {transfer.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 italic">{transfer.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {transfer.status === 'pending' && (
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => updateTransferStatus(transfer._id, 'successful')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => updateTransferStatus(transfer._id, 'failed')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WithdrawalsPage;
