"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  RefreshCw,
  QrCode,
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Scanner {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: "active" | "inactive" | "suspended";
  assignedEvents: string[];
  assignedEventTitles: string[];
  createdAt: string;
}

interface Event {
  _id: string;
  title: string;
  status: string;
  startDate: string;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function ScannersPage() {
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editScanner, setEditScanner] = useState<Scanner | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [credentialInfo, setCredentialInfo] = useState<{ name: string; email: string; password: string } | null>(null);
  const [showCred, setShowCred] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: "", email: "", phone: "", assignedEvents: [] as string[] });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scanRes, evRes] = await Promise.all([
        fetch("/api/scanners", { headers: authHeaders() }),
        fetch("/api/events", { headers: authHeaders() }),
      ]);
      if (scanRes.ok) {
        const d = await scanRes.json();
        setScanners(d.scanners || []);
      }
      if (evRes.ok) {
        const d = await evRes.json();
        setEvents(d.data || d.events || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEditScanner(null);
    setForm({ name: "", email: "", phone: "", assignedEvents: [] });
    setShowModal(true);
  };

  const openEdit = (s: Scanner) => {
    setEditScanner(s);
    setForm({ name: s.name, email: s.email, phone: s.phone || "", assignedEvents: s.assignedEvents });
    setOpenMenu(null);
    setShowModal(true);
  };

  const toggleEvent = (id: string) => {
    setForm((f) => ({
      ...f,
      assignedEvents: f.assignedEvents.includes(id)
        ? f.assignedEvents.filter((e) => e !== id)
        : [...f.assignedEvents, id],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      if (editScanner) {
        // Update
        const res = await fetch(`/api/scanners/${editScanner._id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ name: form.name, phone: form.phone, assignedEvents: form.assignedEvents }),
        });
        const d = await res.json();
        if (!res.ok) { toast.error(d.error || "Failed to update"); return; }
        toast.success("Scanner updated");
        setShowModal(false);
        fetchAll();
      } else {
        // Create
        const res = await fetch("/api/scanners", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(form),
        });
        const d = await res.json();
        if (!res.ok) { toast.error(d.error || "Failed to create"); return; }
        setShowModal(false);
        setCredentialInfo({ name: d.scanner.name, email: d.scanner.email, password: d.plainPassword });
        setShowCred(false);
        setCopied(false);
        fetchAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scanner? They will lose access immediately.")) return;
    const res = await fetch(`/api/scanners/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { toast.success("Scanner deleted"); fetchAll(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setOpenMenu(null);
  };

  const handleToggleStatus = async (s: Scanner) => {
    const newStatus = s.status === "active" ? "suspended" : "active";
    const res = await fetch(`/api/scanners/${s._id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { toast.success(`Scanner ${newStatus}`); fetchAll(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setOpenMenu(null);
  };

  const handleResetPassword = async (s: Scanner) => {
    if (!confirm(`Reset password for ${s.name}?`)) return;
    const res = await fetch(`/api/scanners/${s._id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ resetPassword: true }),
    });
    const d = await res.json();
    if (res.ok && d.plainPassword) {
      setCredentialInfo({ name: s.name, email: s.email, password: d.plainPassword });
      setShowCred(false);
      setCopied(false);
    } else {
      toast.error(d.error || "Failed");
    }
    setOpenMenu(null);
  };

  const copyCredentials = () => {
    if (!credentialInfo) return;
    navigator.clipboard.writeText(
      `Scanner Login\nEmail: ${credentialInfo.email}\nPassword: ${credentialInfo.password}\nLogin: ${window.location.origin}/scanner/login`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = scanners.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      inactive: "bg-gray-100 text-gray-600",
      suspended: "bg-red-100 text-red-600",
    };
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${map[status] || map.inactive}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="py-6">
      {/* Credential Modal */}
      {credentialInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Scanner Credentials</h3>
              <button onClick={() => setCredentialInfo(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              Share these credentials with <strong>{credentialInfo.name}</strong>. The password will not be shown again.
            </p>
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Login URL</p>
                <p className="text-sm text-gray-800 font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/scanner/login</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-sm text-gray-800">{credentialInfo.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-800">
                    {showCred ? credentialInfo.password : "••••••••••"}
                  </p>
                  <button onClick={() => setShowCred(!showCred)} className="text-gray-400 hover:text-gray-600">
                    {showCred ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={copyCredentials}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-500"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy Credentials"}
              </button>
              <button
                onClick={() => setCredentialInfo(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editScanner ? "Edit Scanner" : "Add Scanner"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+233..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              {!editScanner && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="scanner@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Assign Events */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assign Events ({form.assignedEvents.length} selected)
                </label>
                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y">
                  {events.length === 0 && (
                    <p className="px-3 py-3 text-sm text-gray-400">No events found</p>
                  )}
                  {events.map((ev) => (
                    <label
                      key={ev._id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={form.assignedEvents.includes(ev._id)}
                        onChange={() => toggleEvent(ev._id)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{ev.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{ev.status}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  If no events are selected, the scanner can scan tickets for any event you manage.
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-60"
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : null}
                {editScanner ? "Save Changes" : "Create Scanner"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode size={24} className="text-green-600" />
            Ticket Scanners
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage people responsible for scanning tickets at your events
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-500"
        >
          <Plus size={18} />
          Add Scanner
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scanners…"
          className="w-full max-w-sm rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-green-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
          <UserCheck size={48} className="mb-3 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-600">No scanners yet</h3>
          <p className="text-sm text-gray-400 mt-1">Add your first scanner to get started</p>
          <button onClick={openCreate} className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500">
            Add Scanner
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s._id} className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {/* Menu */}
              <div className="absolute right-4 top-4">
                <button
                  onClick={() => setOpenMenu(openMenu === s._id ? null : s._id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <MoreVertical size={16} />
                </button>
                {openMenu === s._id && (
                  <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-gray-100 bg-white shadow-lg py-1">
                    <button onClick={() => openEdit(s)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Edit2 size={14} /> Edit
                    </button>
                    <button onClick={() => handleResetPassword(s)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <RefreshCw size={14} /> Reset Password
                    </button>
                    <button onClick={() => handleToggleStatus(s)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {s.status === "active" ? <><XCircle size={14} className="text-red-500" /> Suspend</> : <><CheckCircle size={14} className="text-green-500" /> Activate</>}
                    </button>
                    <button onClick={() => handleDelete(s._id)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 font-semibold text-sm shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {statusBadge(s.status)}
                {s.phone && <span className="text-xs text-gray-400">{s.phone}</span>}
              </div>

              {s.assignedEventTitles.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                    <Calendar size={12} /> Assigned Events
                  </p>
                  <div className="space-y-1">
                    {s.assignedEventTitles.slice(0, 3).map((title, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                        <span className="truncate">{title}</span>
                      </div>
                    ))}
                    {s.assignedEventTitles.length > 3 && (
                      <p className="text-xs text-gray-400">+{s.assignedEventTitles.length - 3} more</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <AlertCircle size={12} /> All events (no restriction)
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menus */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
