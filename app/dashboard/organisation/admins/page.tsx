'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Mail, Edit, Trash2, CheckCircle, XCircle, Clock, Search, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ConfirmModal from "@/components/ConfirmModal";

interface Award {
  _id: string;
  name: string;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'inactive';
  assignedAwards: Award[];
  createdAt: string;
  invitationExpiry?: string;
}

const AdminsManagement = () => {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    assignedAwards: [] as string[],
  });
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  useEffect(() => {
    // Check user role
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      if (user.role === 'org-admin') {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
    }
    fetchAdmins();
    fetchAwards();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/organization/admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/awards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch awards');
      }

      const data = await response.json();
      setAwards(data.data);
    } catch (error: any) {
      console.error('Failed to load awards:', error);
    }
  };

  const handleOpenModal = (admin?: Admin) => {
    if (admin) {
      setEditingAdmin(admin);
      setFormData({
        name: admin.name,
        email: admin.email,
        assignedAwards: admin.assignedAwards.map(a => a._id),
      });
    } else {
      setEditingAdmin(null);
      setFormData({
        name: '',
        email: '',
        assignedAwards: [],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      assignedAwards: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingAdmin) {
        // Update admin
        const response = await fetch(`/api/organization/admins/${editingAdmin._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update admin');
        }

        toast.success('Admin updated successfully');
      } else {
        // Create and invite admin
        const response = await fetch('/api/organization/admins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to invite admin');
        }

        toast.success('Admin invited successfully! Invitation email sent.');
      }

      handleCloseModal();
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (adminId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Admin",
      message: "Are you sure you want to delete this admin?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/organization/admins/${adminId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to delete admin');
          }

          toast.success('Admin deleted successfully');
          fetchAdmins();
        } catch (error: any) {
          toast.error(error.message);
        }
      }
    });
  };

  const handleAwardToggle = (awardId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedAwards: prev.assignedAwards.includes(awardId)
        ? prev.assignedAwards.filter(id => id !== awardId)
        : [...prev.assignedAwards, awardId],
    }));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    const icons = {
      pending: <Clock size={14} />,
      active: <CheckCircle size={14} />,
      inactive: <XCircle size={14} />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Only organization owners can manage admins. You are logged in as an admin with limited permissions.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Admins</h1>
          <p className="text-gray-500 mt-1">Invite and manage administrators for your organization</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus size={20} />
          Invite Admin
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Awards
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invited On
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Mail className="mx-auto mb-2 text-gray-400" size={48} />
                    <p>No admins found</p>
                    <p className="text-sm mt-1">Invite your first admin to get started</p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{admin.name}</p>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(admin.status)}
                    </td>
                    <td className="px-6 py-4">
                      {admin.assignedAwards.length === 0 ? (
                        <span className="text-sm text-gray-500">No awards assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {admin.assignedAwards.slice(0, 2).map((award) => (
                            <span
                              key={award._id}
                              className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {award.name}
                            </span>
                          ))}
                          {admin.assignedAwards.length > 2 && (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{admin.assignedAwards.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(admin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-lg font-semibold">
                {editingAdmin ? 'Edit Admin' : 'Invite New Admin'}
              </h2>
              <p className="text-sm text-green-100">
                {editingAdmin ? 'Update admin details and award access' : 'Send an invitation to a new administrator'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter admin name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={!!editingAdmin}
                />
                {editingAdmin && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              {/* Assigned Awards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Awards
                </label>
                <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {awards.length === 0 ? (
                    <p className="text-sm text-gray-500">No awards available</p>
                  ) : (
                    <div className="space-y-2">
                      {awards.map((award) => (
                        <label key={award._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.assignedAwards.includes(award._id)}
                            onChange={() => handleAwardToggle(award._id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">{award.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Admin will only have access to selected awards
                </p>
              </div>

              {!editingAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> An invitation email will be sent with login credentials and an activation link. The invitation expires in 7 days.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {editingAdmin ? 'Update Admin' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
};

export default AdminsManagement;
