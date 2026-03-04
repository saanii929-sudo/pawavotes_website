"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Calendar,
  Users,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

interface Election {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "ended";
  settings: {
    showLiveResults: boolean;
    allowRevote: boolean;
    requireAllCategories: boolean;
  };
  createdAt: string;
}

export default function ElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    showLiveResults: true,
    allowRevote: false,
    requireAllCategories: false,
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
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/elections", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch elections:", error);
      toast.error("Failed to load elections");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const url = editingElection 
        ? `/api/elections/${editingElection._id}`
        : "/api/elections";
      const method = editingElection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate,
          settings: {
            showLiveResults: formData.showLiveResults,
            allowRevote: formData.allowRevote,
            requireAllCategories: formData.requireAllCategories,
          },
        }),
      });

      if (response.ok) {
        toast.success(editingElection ? "Election updated successfully!" : "Election created successfully!");
        setShowModal(false);
        setEditingElection(null);
        resetForm();
        fetchElections();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${editingElection ? 'update' : 'create'} election`);
      }
    } catch (error) {
      console.error("Submit election error:", error);
      toast.error(`Failed to ${editingElection ? 'update' : 'create'} election`);
    }
  };

  const handleEdit = (election: Election) => {
    setEditingElection(election);
    setFormData({
      title: election.title,
      description: election.description || "",
      startDate: new Date(election.startDate).toISOString().slice(0, 16),
      endDate: new Date(election.endDate).toISOString().slice(0, 16),
      showLiveResults: election.settings.showLiveResults,
      allowRevote: election.settings.allowRevote,
      requireAllCategories: election.settings.requireAllCategories,
    });
    setShowModal(true);
  };

  const handleDelete = async (electionId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Election",
      message: "Are you sure you want to delete this election? This action cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`/api/elections/${electionId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            toast.success("Election deleted successfully!");
            fetchElections();
          } else {
            const data = await response.json();
            toast.error(data.error || "Failed to delete election");
          }
        } catch (error) {
          console.error("Delete election error:", error);
          toast.error("Failed to delete election");
        }
      }
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      showLiveResults: true,
      allowRevote: false,
      requireAllCategories: false,
    });
  };

  const getStatusBadge = (election: Election) => {
    const now = new Date();
    const start = new Date(election.startDate);
    const end = new Date(election.endDate);

    if (election.status === "ended" || now > end) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
          Ended
        </span>
      );
    } else if (election.status === "active" || (now >= start && now <= end)) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
          Active
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
          Draft
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Elections</h1>
          <p className="text-gray-500 mt-1">Create and manage your elections</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={18} />
          Create Election
        </button>
      </div>

      {/* Elections Grid */}
      {elections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="text-green-600" size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Elections Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first election to get started
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Plus size={20} />
            Create Election
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.map((election) => (
            <div
              key={election._id}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {election.title}
                </h3>
                {getStatusBadge(election)}
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {election.description || "No description"}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} />
                  <span>
                    {new Date(election.startDate).toLocaleDateString()} -{" "}
                    {new Date(election.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(election)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition text-sm"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(election._id)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="">
              <div className="bg-green-600 p-4 flex items-center gap-2 rounded-t-lg text-white ">
                <h2 className="text-2xl font-bold">{editingElection ? 'Edit Election' : 'Create Election'}</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Election Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Student Union Elections 2026"
                    className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of the election"
                    rows={3}
                    className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-sm font-medium text-gray-700">
                    Election Settings
                  </p>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.showLiveResults}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          showLiveResults: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      Show live results to voters
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.allowRevote}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowRevote: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      Allow voters to change their vote
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.requireAllCategories}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requireAllCategories: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      Require voting in all categories
                    </span>
                  </label>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingElection(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingElection ? 'Update Election' : 'Create Election'}
                  </button>
                </div>
              </form>
            </div>
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
}
