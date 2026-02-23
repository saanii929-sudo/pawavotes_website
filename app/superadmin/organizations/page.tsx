"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, Globe, Calendar, Award, Vote, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    website: "",
    description: "",
    eventType: "awards",
    status: "active",
    deliveryMethod: "email",
  });
  const [creationResult, setCreationResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [search]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = `/api/superadmin/organizations?search=${search}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");

    console.log('Submitting organization with data:', formData);

    try {
      const url = editingOrg
        ? `/api/superadmin/organizations/${editingOrg._id}`
        : "/api/superadmin/organizations";

      const response = await fetch(url, {
        method: editingOrg ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (response.ok) {
        if (!editingOrg && data.data?.generatedPassword) {
          // Show result modal for new organizations with generated password
          setCreationResult(data);
          setShowResultModal(true);
        } else {
          alert('Organization saved successfully!');
        }
        setShowModal(false);
        setEditingOrg(null);
        resetForm();
        fetchOrganizations();
      } else {
        console.error('Error response:', data);
        alert(data.error || "Failed to save organization");
      }
    } catch (error) {
      console.error("Failed to save organization:", error);
      alert("Failed to save organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`/api/superadmin/organizations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchOrganizations();
      }
    } catch (error) {
      console.error("Failed to delete organization:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      website: "",
      description: "",
      eventType: "awards",
      status: "active",
      deliveryMethod: "email",
    });
  };

  const openEditModal = (org: any) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      email: org.email,
      password: "",
      phone: org.phone || "",
      address: org.address || "",
      website: org.website || "",
      description: org.description || "",
      eventType: org.eventType || "awards",
      status: org.status,
      deliveryMethod: "email", // Not needed for edit
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingOrg(null);
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className=" rounded-xl sm:rounded-2xl p-6 sm:p-8 text-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              Organizations
            </h1>
            <p className="text-black text-sm sm:text-base">
              Manage all organizations on the platform
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl font-semibold w-full sm:w-auto"
          >
            <Plus size={20} />
            Add Organization
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className=" text-black">
                <th className="text-left py-4 px-6 text-sm font-semibold">Organization</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Contact</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Type</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Created</th>
                <th className="text-left py-4 px-6 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.length > 0 ? (
                organizations.map((org, index) => (
                  <tr 
                    key={org._id} 
                    className={`border-b hover:bg-green-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{org.name}</p>
                          {org.website && (
                            <a 
                              href={org.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{org.email}</span>
                        </div>
                        {org.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{org.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
                          org.eventType === "election"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {org.eventType === "election" ? (
                          <><Vote className="w-3 h-3" /> Election</>
                        ) : (
                          <><Award className="w-3 h-3" /> Awards</>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
                          org.status === "active"
                            ? "bg-green-100 text-green-700"
                            : org.status === "inactive"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {org.status === "active" ? (
                          <><CheckCircle className="w-3 h-3" /> Active</>
                        ) : org.status === "inactive" ? (
                          <><XCircle className="w-3 h-3" /> Inactive</>
                        ) : (
                          <><AlertCircle className="w-3 h-3" /> Suspended</>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(org.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(org)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(org._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No organizations found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {organizations.length > 0 ? (
          organizations.map((org) => (
            <div 
              key={org._id} 
              className="bg-white rounded-xl shadow-md p-4 border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{org.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        org.eventType === "election"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {org.eventType === "election" ? (
                        <><Vote className="w-3 h-3" /> Election</>
                      ) : (
                        <><Award className="w-3 h-3" /> Awards</>
                      )}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                        org.status === "active"
                          ? "bg-green-100 text-green-700"
                          : org.status === "inactive"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {org.status === "active" ? (
                        <><CheckCircle className="w-3 h-3" /> Active</>
                      ) : org.status === "inactive" ? (
                        <><XCircle className="w-3 h-3" /> Inactive</>
                      ) : (
                        <><AlertCircle className="w-3 h-3" /> Suspended</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{org.email}</span>
                </div>
                {org.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{org.phone}</span>
                  </div>
                )}
                {org.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                    <a 
                      href={org.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm truncate"
                    >
                      {org.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Created {new Date(org.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => openEditModal(org)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(org._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors font-medium"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 font-medium">No organizations found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-linear-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Building2 className="w-7 h-7" />
                {editingOrg ? "Edit Organization" : "Add New Organization"}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {editingOrg ? "Update organization details" : "Create a new organization account"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Enter organization name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event Type *
                    </label>
                    <select
                      value={formData.eventType}
                      onChange={(e) =>
                        setFormData({ ...formData, eventType: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="awards">Awards & Entertainment</option>
                      <option value="election">Institutional Elections</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
                      <span className="text-green-600 font-bold">•</span>
                      {formData.eventType === "awards" 
                        ? "For awards, competitions, and entertainment voting"
                        : "For school, university, and organizational elections"}
                    </p>
                  </div>

                  {!editingOrg && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Credential Delivery Method *
                      </label>
                      <select
                        value={formData.deliveryMethod}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryMethod: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      >
                        <option value="email">Email Only</option>
                        <option value="sms">SMS Only</option>
                        <option value="both">Both Email & SMS</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1">
                        <span className="text-green-600 font-bold">•</span>
                        {formData.deliveryMethod === "email" 
                          ? "Credentials will be sent via email"
                          : formData.deliveryMethod === "sms"
                          ? "Credentials will be sent via SMS (phone required)"
                          : "Credentials will be sent via both email and SMS (phone required)"}
                      </p>
                    </div>
                  )}

                  {editingOrg && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password {!editingOrg && "*"}
                      </label>
                      <input
                        type="password"
                        required={!editingOrg}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        placeholder={editingOrg ? "Leave blank to keep current" : "Enter password"}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number {!editingOrg && (formData.deliveryMethod === "sms" || formData.deliveryMethod === "both") && (
                        <span className="text-red-600">*</span>
                      )}
                    </label>
                    <input
                      type="tel"
                      required={!editingOrg && (formData.deliveryMethod === "sms" || formData.deliveryMethod === "both")}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        !editingOrg && (formData.deliveryMethod === "sms" || formData.deliveryMethod === "both")
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200"
                      }`}
                      placeholder="+233 234 567 890"
                    />
                    {!editingOrg && (formData.deliveryMethod === "sms" || formData.deliveryMethod === "both") && (
                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Phone number is required for SMS delivery
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Enter full address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                    placeholder="Brief description about the organization..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingOrg(null);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{editingOrg ? "Updating..." : "Creating..."}</span>
                    </>
                  ) : (
                    <span>{editingOrg ? "Update Organization" : "Create Organization"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
