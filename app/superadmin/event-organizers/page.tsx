"use client";

import { useEffect, useState } from "react";
import {
  Plus, Search, Edit2, Trash2, CalendarDays,
  Mail, Phone, CheckCircle, XCircle, AlertCircle, Eye, EyeOff, Copy, Check,
} from "lucide-react";
import toast from "react-hot-toast";

interface EventOrganizer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-green-100 text-green-700" },
  inactive:  { label: "Inactive",  cls: "bg-gray-100 text-gray-600"  },
  suspended: { label: "Suspended", cls: "bg-red-100 text-red-700"    },
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  deliveryMethod: "email" as "email" | "sms" | "both",
};

export default function EventOrganizersPage() {
  const [organizers, setOrganizers] = useState<EventOrganizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventOrganizer | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  useEffect(() => { fetchOrganizers(); }, [search]);

  const fetchOrganizers = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/superadmin/event-organizers?search=${search}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setOrganizers(data.data);
        setPagination(data.pagination);
      }
    } catch {
      toast.error("Failed to load event organizers");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM });
    setCreatedCreds(null);
    setShowModal(true);
  };

  const openEdit = (org: EventOrganizer) => {
    setEditing(org);
    setFormData({ name: org.name, email: org.email, phone: org.phone || "", deliveryMethod: "email" });
    setCreatedCreds(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const url = editing
        ? `/api/superadmin/event-organizers/${editing._id}`
        : "/api/superadmin/event-organizers";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(editing ? "Event organizer updated" : "Event organizer created");
        fetchOrganizers();
        if (!editing && data.data?.generatedPassword) {
          setCreatedCreds({ email: data.data.email, password: data.data.generatedPassword });
        } else {
          setShowModal(false);
        }
      } else {
        toast.error(data.error || "Operation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/superadmin/event-organizers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Status updated to ${status}`);
        fetchOrganizers();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete event organizer "${name}"? This cannot be undone.`)) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/superadmin/event-organizers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Event organizer deleted");
        fetchOrganizers();
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const copyPassword = (pw: string) => {
    navigator.clipboard.writeText(pw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-green-600" />
            Event Organizers
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage accounts that can create and assign events to org-admins
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Organizer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : organizers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No event organizers yet.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-green-600 hover:underline">
              Add your first organizer
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Phone</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Created</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {organizers.map((org) => {
                const badge = STATUS_BADGE[org.status] || STATUS_BADGE.inactive;
                return (
                  <tr key={org._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{org.name}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{org.email}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {org.phone
                        ? <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{org.phone}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                        {org.status === "active" ? <CheckCircle className="w-3 h-3" /> : org.status === "suspended" ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(org)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {org.status !== "suspended" ? (
                          <button
                            onClick={() => handleStatusChange(org._id, "suspended")}
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Suspend"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(org._id, "active")}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(org._id, org.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{pagination.total} organizer{pagination.total !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchOrganizers(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === pagination.page ? "bg-green-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Credentials display after creation */}
            {createdCreds ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Organizer Created</h3>
                    <p className="text-xs text-gray-500">Share these credentials securely</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="font-mono text-gray-900">{createdCreds.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-900">
                        {showPassword ? createdCreds.password : "••••••••••••"}
                      </span>
                      <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyPassword(createdCreds.password)} className="text-gray-400 hover:text-green-600">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  This password will not be shown again. Copy it before closing.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editing ? "Edit Event Organizer" : "Add Event Organizer"}
                  </h3>
                  <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    disabled={!!editing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="organizer@example.com"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+233 24 000 0000"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                {!editing && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Credential Delivery *</label>
                    <select
                      value={formData.deliveryMethod}
                      onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value as any })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <option value="email">Email only</option>
                      <option value="sms">SMS only</option>
                      <option value="both">Email + SMS</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 text-sm font-medium border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    {submitting ? "Saving…" : editing ? "Save Changes" : "Create Organizer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
