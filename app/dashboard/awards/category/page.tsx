"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Award,
  MoreVertical,
  ChevronLeft,
  Edit2,
  Trash2,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";

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

interface Category {
  _id: string;
  name: string;
}

const ManageCategoriesApp = () => {
  const [currentView, setCurrentView] = useState("list");
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", publish: false });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {}, type: "warning" });

  useEffect(() => {
    fetchAwards();
    fetchServiceFee();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchCategories(selectedAward._id);
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

  const fetchServiceFee = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setServiceFeePercentage(data.data.serviceFeePercentage || 10);
      }
    } catch (error) {
      console.error("Failed to fetch service fee");
    }
  };

  const fetchCategories = async (awardId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/categories?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleViewCategories = (award: Award) => {
    setSelectedAward(award);
    setCurrentView("categories");
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !selectedAward) return;

    const loadingToast = toast.loading(
      editingCategory ? "Updating category..." : "Creating category...",
    );

    try {
      const token = localStorage.getItem("token");
      const url = editingCategory
        ? `/api/categories/${editingCategory._id}`
        : "/api/categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategory.name,
          awardId: selectedAward._id,
          isPublished: newCategory.publish,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          editingCategory
            ? "Category updated successfully!"
            : "Category created successfully!",
          { id: loadingToast },
        );
        setNewCategory({ name: "", publish: false });
        setEditingCategory(null);
        setShowCategoryModal(false);
        fetchCategories(selectedAward._id);
        fetchAwards();
      } else {
        toast.error(
          data.error ||
            `Failed to ${editingCategory ? "update" : "create"} category`,
          { id: loadingToast },
        );
      }
    } catch (error) {
      console.error(
        `Failed to ${editingCategory ? "update" : "create"} category:`,
        error,
      );
      toast.error(
        `Failed to ${editingCategory ? "update" : "create"} category`,
        { id: loadingToast },
      );
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setNewCategory({ name: category.name, publish: category.isPublished });
    setShowCategoryModal(true);
    setShowActionMenu(null);
  };

  const handleDeleteCategory = async (categoryId: Category) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Category",
      message: "Are you sure you want to delete this category?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        const loadingToast = toast.loading("Deleting category...");

        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`/api/categories/${categoryId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            toast.success("Category deleted successfully!", { id: loadingToast });
            fetchCategories(selectedAward!._id);
            fetchAwards();
            setShowActionMenu(null);
          } else {
            toast.error("Failed to delete category", { id: loadingToast });
          }
        } catch (error) {
          console.error("Failed to delete category:", error);
          toast.error("Failed to delete category", { id: loadingToast });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AnimatePresence mode="wait">
        {currentView === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                  Manage Categories
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Select an award program to view and manage its specific
                  categories.
                </p>
              </div>
              <button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap">
                <Plus size={18} />
                Create New Award
              </button>
            </div>

            {/* Awards List or Empty State */}
            <div
              className={`${awards.length === 0 ? "bg-white rounded-xl border border-gray-200" : ""}`}
            >
              {loading ? (
                <>
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                    <p className="text-gray-500">Loading awards...</p>
                  </div>
                </>
              ) : awards.length === 0 ? (
                <div className="text-center py-16 sm:py-24 px-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    No award created yet
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-6 max-w-md mx-auto">
                    Create an award to be able to add categories or nominees
                  </p>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg inline-flex items-center gap-2 transition-colors text-sm font-medium">
                    <Plus size={18} />
                    Create New Award
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {awards.map((award: any) => (
                    <div
                      key={award._id}
                      onClick={() => handleViewCategories(award)}
                      className="group overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="relative aspect-square sm:h-48 md:h-56 lg:h-60 w-full overflow-hidden">
                        <img
                          src={award.banner || "/images/events/event-1.png"}
                          alt={award.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-0 p-3 sm:p-4 left-0 right-0 flex justify-between items-center">
                          <div className="bg-[#FFFFFFCC] py-1 px-2 rounded-full text-xs">
                            <p className="text-[9px] sm:text-[10px] text-black font-semibold">
                              Price (GHS{" "}
                              {award.pricing?.votingCost?.toFixed(2) || "0.50"})
                            </p>
                          </div>
                          <div
                            className={`${
                              award.status === "active"
                                ? "bg-[#16A34A]"
                                : award.status === "voting"
                                  ? "bg-blue-600"
                                  : "bg-yellow-600"
                            } py-1 px-2 rounded-full text-xs`}
                          >
                            <p className="text-[9px] sm:text-[10px] text-white font-semibold uppercase">
                              {award.status}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:gap-4">
                        <div className="flex-1 px-3 py-2 sm:px-4 sm:py-3">
                          <div className="flex justify-between items-center">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                              {award.name}
                            </h3>
                            <p className="text-red-700 font-bold text-xs">
                              {award.code}
                            </p>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-gray-500 mb-3 sm:mb-4">
                            {award.organizationName}
                          </p>
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="text-gray-500 text-[10px] sm:text-xs">
                                Categories
                              </span>
                              <p className="font-semibold text-gray-900 text-xs sm:text-sm">
                                {award.categories}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500 text-[10px] sm:text-xs">
                                Show Results
                              </span>
                              <p className="font-semibold text-gray-900 text-end text-xs sm:text-sm">
                                {award.settings?.showResults ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>
                          <p className="text-green-600 text-[10px] sm:text-xs mt-2 sm:mt-3 flex items-start sm:items-center gap-1 mb-2">
                            <Info
                              size={12}
                              className="mt-0.5 sm:mt-0 shrink-0"
                            />
                            <span>
                              {serviceFeePercentage}% service fee later applied
                              for all awards.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto"
          >
            {/* Header */}
            <button
              onClick={() => setCurrentView("list")}
              className="text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 flex items-center gap-1 text-sm"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2 wrap-break-words">
                  Categories: {selectedAward?.name}
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Managing competitive segments for this specific program.
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                >
                  <Plus size={18} />
                  <span className="hidden xs:inline">Create Category</span>
                  <span className="xs:hidden">Create</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowActionMenu(
                        showActionMenu === "main" ? null : "main",
                      )
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical size={20} className="text-gray-600" />
                  </button>
                  {showActionMenu === "main" && (
                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2">
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
              {categories.length === 0 && !loadingCategories ? (
                <div className="text-center py-16 sm:py-24 px-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    No categories created yet
                  </h2>
                  <p className="text-gray-500 text-xs sm:text-sm mb-6 max-w-md mx-auto">
                    Categories allow you to group nominees and manage different
                    sets of voting rules.
                  </p>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg inline-flex items-center gap-2 transition-colors text-sm font-medium"
                  >
                    <Plus size={18} />
                    Create Category
                  </button>
                </div>
              ) : loadingCategories ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-500">Loading categories...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {categories.map((category: any, index: number) => (
                    <div
                      key={category._id}
                      className="p-3 sm:p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Award
                            size={16}
                            className="sm:w-5 sm:h-5 text-green-600"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 wrap-break-words">
                            {category.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-1 text-xs sm:text-sm text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  category.isPublished
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {category.isPublished ? "Published" : "Draft"}
                              </span>
                            </span>
                            <span className="text-[10px] sm:text-xs">
                              {new Date(category.createdAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                            <span className="text-[10px] sm:text-xs">
                              {category.nomineeCount} Entries
                            </span>
                          </div>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(
                                showActionMenu === category._id
                                  ? null
                                  : category._id,
                              );
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <MoreVertical size={18} className="text-gray-600" />
                          </button>
                          {showActionMenu === category._id && (
                            <div
                              className={`absolute ${index >= categories.length - 2 ? "bottom-full mb-2" : "top-full mt-2"} right-0 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10`}
                            >
                              <button
                                onClick={() => handleEditCategory(category)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteCategory(category._id)
                                }
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setShowCategoryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-lg z-50 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="bg-green-600 text-white px-4 sm:px-6 py-4 sm:py-5">
                  <h3 className="font-bold text-base sm:text-lg mb-1">
                    {editingCategory ? "Edit Category" : "Add New Category"}
                  </h3>
                  <p className="text-xs sm:text-sm text-green-50">
                    {editingCategory
                      ? "Update the category details below."
                      : "Define a sub-division for one of your award programs."}
                  </p>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="E.g. best student 2026"
                      value={newCategory.name}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, name: e.target.value })
                      }
                      className="w-full text-sm sm:text-base text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="publishCategory"
                      checked={newCategory.publish}
                      onChange={(e) =>
                        setNewCategory({
                          ...newCategory,
                          publish: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                    <label
                      htmlFor="publishCategory"
                      className="text-xs sm:text-sm text-gray-700 cursor-pointer select-none"
                    >
                      Publish Category
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setNewCategory({ name: "", publish: false });
                      setEditingCategory(null);
                    }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategory.name}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {editingCategory ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
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

export default ManageCategoriesApp;
