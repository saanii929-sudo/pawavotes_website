"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronLeft,
  X,
  Info,
  Edit2,
  Trash2,
  MoreVertical,
  Users,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface Stage {
  _id: string;
  name: string;
  awardId: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  order: number;
  stageType: "nomination" | "voting" | "results";
  status: "upcoming" | "active" | "completed";
  qualificationRule?: "topN" | "threshold" | "manual";
  qualificationCount?: number;
  qualificationThreshold?: number;
  qualificationProcessed?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Award {
  _id: string;
  name: string;
  code: string;
  organizationName: string;
  status: string;
  categories: number;
  settings?: { showResults: boolean };
  banner?: string;
}

const StagingManager = () => {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState("list");
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStages, setLoadingStages] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    stageType: "nomination" as "nomination" | "voting" | "results",
    order: "1",
    qualificationRule: "manual" as "topN" | "threshold" | "manual",
    qualificationCount: "",
    qualificationThreshold: "",
  });

  useEffect(() => {
    fetchAwards();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchStages(selectedAward._id);
    }
  }, [selectedAward]);

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/awards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAwards(data.data);
      } else {
        toast.error("Failed to fetch awards");
      }
    } catch (error) {
      toast.error("Failed to fetch awards");
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async (awardId: string) => {
    setLoadingStages(true);
    try {
      const response = await fetch(`/api/stages?awardId=${awardId}`);
      if (response.ok) {
        const data = await response.json();
        setStages(data.data || []);
      } else {
        toast.error("Failed to fetch stages");
      }
    } catch (error) {
      console.error("Failed to fetch stages:", error);
      toast.error("Failed to fetch stages");
    } finally {
      setLoadingStages(false);
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("stages");
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime ||
      !selectedAward
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const isEditing = !!editingStageId;
    const loadingToast = toast.loading(
      isEditing ? "Updating stage..." : "Creating stage...",
    );

    try {
      const url = isEditing ? `/api/stages/${editingStageId}` : "/api/stages";
      const method = isEditing ? "PUT" : "POST";

      const body = {
        name: formData.name,
        description: formData.description || undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        stageType: formData.stageType,
        order: parseInt(formData.order),
        qualificationRule: formData.qualificationRule,
        qualificationCount:
          formData.qualificationRule === "topN" && formData.qualificationCount
            ? parseInt(formData.qualificationCount)
            : undefined,
        qualificationThreshold:
          formData.qualificationRule === "threshold" &&
          formData.qualificationThreshold
            ? parseInt(formData.qualificationThreshold)
            : undefined,
        ...(isEditing ? {} : { awardId: selectedAward._id }),
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(
          isEditing
            ? "Stage updated successfully!"
            : "Stage created successfully!",
          { id: loadingToast },
        );
        setFormData({
          name: "",
          description: "",
          startDate: "",
          endDate: "",
          startTime: "",
          endTime: "",
          stageType: "nomination",
          order: "1",
          qualificationRule: "manual",
          qualificationCount: "",
          qualificationThreshold: "",
        });
        setEditingStageId(null);
        setShowModal(false);
        fetchStages(selectedAward._id);
      } else {
        const data = await response.json();
        toast.error(
          data.message ||
            (isEditing ? "Failed to update stage" : "Failed to create stage"),
          { id: loadingToast },
        );
      }
    } catch (error) {
      toast.error(
        isEditing ? "Failed to update stage" : "Failed to create stage",
        { id: loadingToast },
      );
    }
  };

  const handleEditStage = (stage: Stage) => {
    setFormData({
      name: stage.name,
      description: stage.description || "",
      startDate: stage.startDate.split("T")[0],
      endDate: stage.endDate.split("T")[0],
      startTime: stage.startTime,
      endTime: stage.endTime,
      stageType: stage.stageType,
      order: stage.order.toString(),
      qualificationRule: stage.qualificationRule || "manual",
      qualificationCount: stage.qualificationCount?.toString() || "",
      qualificationThreshold: stage.qualificationThreshold?.toString() || "",
    });
    setEditingStageId(stage._id);
    setShowModal(true);
    setShowActionMenu(null);
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;

    const loadingToast = toast.loading("Deleting stage...");
    try {
      const response = await fetch(`/api/stages/${stageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Stage deleted successfully!", { id: loadingToast });
        if (selectedAward) {
          fetchStages(selectedAward._id);
        }
        setShowActionMenu(null);
      } else {
        toast.error("Failed to delete stage", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Failed to delete stage", { id: loadingToast });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStageTypeColor = (type: string) => {
    switch (type) {
      case "nomination":
        return "bg-purple-100 text-purple-800";
      case "voting":
        return "bg-orange-100 text-orange-800";
      case "results":
        return "bg-cyan-100 text-cyan-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="font-sans min-h-screen bg-gray-50">
      {currentScreen === "list" ? (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Stages
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select an award program to proceed with staging management.
              </p>
            </div>
            <button
              onClick={() => (window.location.href = "/dashboard/awards")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <Plus size={18} />
              Create New Award
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading awards...</p>
            </div>
          ) : awards.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-16 md:p-24 flex flex-col items-center justify-center">
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 text-center">
                No award created yet
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-6 text-center">
                Create an award to be able to add stages.
              </p>
              <button
                onClick={() => (window.location.href = "/dashboard/awards")}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
              >
                <Plus size={18} />
                Create New Award
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {awards.map((award) => (
                <div
                  key={award._id}
                  onClick={() => handleSelectAward(award)}
                  className="group overflow-hidden rounded-xl bg-white shadow transition cursor-pointer hover:shadow-lg"
                >
                  <div className="relative aspect-square h-48 sm:h-56 md:h-60 w-full overflow-hidden">
                    <Image
                      src={award.banner || "/images/events/event-1.png"}
                      alt={award.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-0 p-3 sm:p-4 left-0 right-0 flex justify-between items-center">
                      <div className="bg-white/80 py-1 px-2 rounded-full">
                        <p className="text-[9px] sm:text-[10px] text-black font-semibold">
                          Price (GHS 0.50)
                        </p>
                      </div>
                      <div
                        className={`${
                          award.status === "active"
                            ? "bg-green-600"
                            : award.status === "voting"
                              ? "bg-blue-600"
                              : "bg-yellow-600"
                        } py-1 px-2 rounded-full`}
                      >
                        <p className="text-[9px] sm:text-[10px] text-white font-semibold uppercase">
                          {award.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex-1">
                        {award.name}
                      </h3>
                      <p className="text-red-700 font-bold text-xs">
                        {award.code}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
                      {award.organizationName}
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">
                          Categories
                        </span>
                        <p className="font-semibold text-gray-900 text-sm">
                          {award.categories}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">
                          Show Results
                        </span>
                        <p className="font-semibold text-gray-900 text-sm text-end">
                          {award.settings?.showResults ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    <p className="text-green-600 text-[10px] sm:text-xs mt-3 flex items-start sm:items-center gap-1">
                      <Info size={12} className="shrink-0 mt-0.5 sm:mt-0" />
                      <span>10% service fee later applied for all awards.</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {currentScreen === "stages" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <button
            onClick={() => {
              setCurrentScreen("list");
              setSelectedAward(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Stages
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {selectedAward?.name}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <Plus size={18} />
              Add Stage
            </button>
          </div>

          {loadingStages ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <p className="text-gray-500">Loading stages...</p>
            </div>
          ) : stages.length === 0 ? (
            <div
              className="bg-white rounded-xl border border-gray-200 flex items-center justify-center"
              style={{ minHeight: "400px" }}
            >
              <div className="text-center flex flex-col items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-black mb-4">
                  You do not have any stages.
                </h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 cursor-pointer transition-colors font-medium"
                >
                  <Plus size={20} />
                  Add your first stage
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View - Hidden on mobile */}
              <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stage Name
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Start Date/Time
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date/Time
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stages.map((stage) => (
                        <tr key={stage._id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {stage.order}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {stage.name}
                            </div>
                            {stage.description && (
                              <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                                {stage.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageTypeColor(stage.stageType)}`}
                            >
                              {stage.stageType.charAt(0).toUpperCase() +
                                stage.stageType.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              {new Date(stage.startDate).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {stage.startTime}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              {new Date(stage.endDate).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {stage.endTime}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stage.status)}`}
                              >
                                {stage.status.charAt(0).toUpperCase() +
                                  stage.status.slice(1)}
                              </span>
                              {stage.qualificationProcessed && stage.status === "completed" && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                  <CheckCircle size={12} />
                                  Qualified
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="relative inline-block">
                              <button
                                onClick={() =>
                                  setShowActionMenu(
                                    showActionMenu === stage._id
                                      ? null
                                      : stage._id,
                                  )
                                }
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical
                                  size={18}
                                  className="text-gray-400"
                                />
                              </button>

                              {showActionMenu === stage._id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/awards/stages/${stage._id}/contestants`
                                      )
                                    }
                                    className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                                  >
                                    <Users size={14} />
                                    Manage Contestants
                                  </button>
                                  <button
                                    onClick={() => handleEditStage(stage)}
                                    className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStage(stage._id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View - Visible only on mobile */}
              <div className="md:hidden space-y-4">
                {stages.map((stage) => (
                  <div
                    key={stage._id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                            {stage.order}
                          </span>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {stage.name}
                          </h3>
                        </div>
                        {stage.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {stage.description}
                          </p>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowActionMenu(
                              showActionMenu === stage._id ? null : stage._id
                            )
                          }
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>

                        {showActionMenu === stage._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() =>
                                router.push(
                                  `/dashboard/awards/stages/${stage._id}/contestants`
                                )
                              }
                              className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                            >
                              <Users size={14} />
                              Manage Contestants
                            </button>
                            <button
                              onClick={() => handleEditStage(stage)}
                              className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage._id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Type</span>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageTypeColor(stage.stageType)}`}
                        >
                          {stage.stageType.charAt(0).toUpperCase() +
                            stage.stageType.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Status</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stage.status)}`}
                          >
                            {stage.status.charAt(0).toUpperCase() +
                              stage.status.slice(1)}
                          </span>
                          {stage.qualificationProcessed &&
                            stage.status === "completed" && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                <CheckCircle size={12} />
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-start justify-between text-xs">
                          <div>
                            <span className="text-gray-500 block mb-0.5">
                              Start
                            </span>
                            <span className="text-gray-900 font-medium">
                              {new Date(stage.startDate).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                            <span className="text-gray-400 ml-1">
                              {stage.startTime}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 block mb-0.5">
                              End
                            </span>
                            <span className="text-gray-900 font-medium">
                              {new Date(stage.endDate).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                            <span className="text-gray-400 ml-1">
                              {stage.endTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => {
              setShowModal(false);
              setFormData({
                name: "",
                description: "",
                startDate: "",
                endDate: "",
                startTime: "",
                endTime: "",
                stageType: "nomination",
                order: "1",
                qualificationRule: "manual",
                qualificationCount: "",
                qualificationThreshold: "",
              });
              setEditingStageId(null);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between sticky top-0 items-center p-4 bg-green-600">
                <h2 className="text-xl font-semibold text-white">
                  {editingStageId ? "Edit Stage" : "Add Stage"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      name: "",
                      description: "",
                      startDate: "",
                      endDate: "",
                      startTime: "",
                      endTime: "",
                      stageType: "nomination",
                      order: "1",
                      qualificationRule: "manual",
                      qualificationCount: "",
                      qualificationThreshold: "",
                    });
                    setEditingStageId(null);
                  }}
                  className="absolute top-4 right-4 text-white hover:text-white cursor-pointer transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stage Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="Enter stage name (e.g., Nomination Phase)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                      placeholder="Enter stage description..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stage Type <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={formData.stageType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            stageType: e.target.value as
                              | "nomination"
                              | "voting"
                              | "results",
                          })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      >
                        <option value="nomination">Nomination</option>
                        <option value="voting">Voting</option>
                        <option value="results">Results</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.order}
                        onChange={(e) =>
                          setFormData({ ...formData, order: e.target.value })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualification Rule
                    </label>
                    <select
                      value={formData.qualificationRule}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          qualificationRule: e.target.value as
                            | "topN"
                            | "threshold"
                            | "manual",
                          qualificationCount: "",
                          qualificationThreshold: "",
                        })
                      }
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    >
                      <option value="manual">Manual</option>
                      <option value="topN">Top N</option>
                      <option value="threshold">Threshold</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.qualificationRule === "manual" &&
                        "Manually select contestants to advance to the next stage"}
                      {formData.qualificationRule === "topN" &&
                        "Automatically advance the top N contestants by vote count"}
                      {formData.qualificationRule === "threshold" &&
                        "Automatically advance contestants who meet the minimum vote threshold"}
                    </p>
                  </div>

                  {formData.qualificationRule === "topN" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Contestants to Qualify{" "}
                        <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.qualificationCount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            qualificationCount: e.target.value,
                          })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="e.g., 10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The top N contestants with the highest votes will
                        automatically advance
                      </p>
                    </div>
                  )}

                  {formData.qualificationRule === "threshold" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Vote Threshold{" "}
                        <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.qualificationThreshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            qualificationThreshold: e.target.value,
                          })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="e.g., 100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        All contestants with votes equal to or above this
                        threshold will advance
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startTime: e.target.value,
                          })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setFormData({
                          name: "",
                          description: "",
                          startDate: "",
                          endDate: "",
                          startTime: "",
                          endTime: "",
                          stageType: "nomination",
                          order: "1",
                          qualificationRule: "manual",
                          qualificationCount: "",
                          qualificationThreshold: "",
                        });
                        setEditingStageId(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={
                        !formData.name ||
                        !formData.startDate ||
                        !formData.endDate ||
                        !formData.startTime ||
                        !formData.endTime
                      }
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {editingStageId ? "Update" : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StagingManager;
