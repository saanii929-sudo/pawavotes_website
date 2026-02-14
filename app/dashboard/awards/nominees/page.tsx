'use client';
import React, { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, X, Upload, ChevronDown, ChevronLeft, Info, Edit2, Trash2 } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface Award {
  _id: string;
  name: string;
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

interface Nominee {
  _id: string;
  name: string;
  nomineeCode?: string;
  categoryId: { _id: string; name: string };
  image?: string;
  bio?: string;
  email?: string;
  phone?: string;
  nominationStatus: string;
  nominationType: string;
  status: string;
  createdAt: string;
}

const AwardsManagementSystem = () => {
  const [currentScreen, setCurrentScreen] = useState("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingNominees, setLoadingNominees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    categoryId: "", 
    publish: false, 
    image: "", 
    bio: "" 
  });

  useEffect(() => { 
    fetchAwards(); 
  }, []);
  
  useEffect(() => { 
    if (selectedAward) { 
      fetchCategories(selectedAward._id); 
      fetchNominees(selectedAward._id); 
    } 
  }, [selectedAward, searchQuery, selectedCategoryFilter]);

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/awards", { 
        headers: { Authorization: `Bearer ${token}` } 
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

  const fetchCategories = async (awardId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/categories?awardId=${awardId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (response.ok) { 
        const data = await response.json(); 
        setCategories(data.data); 
      }
    } catch (error) { 
      console.error("Failed to fetch categories:", error); 
    }
  };

  const fetchNominees = async (awardId: string) => {
    setLoadingNominees(true);
    try {
      const token = localStorage.getItem("token");
      let url = `/api/nominees?awardId=${awardId}`;
      if (selectedCategoryFilter && selectedCategoryFilter !== "all") {
        url += `&categoryId=${selectedCategoryFilter}`;
      }
      if (searchQuery) {
        url += `&search=${searchQuery}`;
      }
      const response = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (response.ok) { 
        const data = await response.json(); 
        setNominees(data.data); 
      }
    } catch (error) { 
      console.error("Failed to fetch nominees:", error); 
    } finally { 
      setLoadingNominees(false); 
    }
  };

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("nominees");
  };

  const handleAddNominee = async () => {
    if (!formData.name || !formData.categoryId || !selectedAward) return;
    
    const isEditing = !!editingNomineeId;
    const loadingToast = toast.loading(isEditing ? "Updating nominee..." : "Creating nominee...");
    
    try {
      const token = localStorage.getItem("token");
      const url = isEditing ? `/api/nominees/${editingNomineeId}` : "/api/nominees";
      const method = isEditing ? "PUT" : "POST";
      
      const body = isEditing 
        ? { 
            name: formData.name, 
            categoryId: formData.categoryId, 
            image: formData.image || undefined, 
            bio: formData.bio || undefined, 
            status: formData.publish ? "published" : "draft" 
          }
        : { 
            name: formData.name, 
            awardId: selectedAward._id, 
            categoryId: formData.categoryId, 
            image: formData.image || undefined, 
            bio: formData.bio || undefined, 
            status: formData.publish ? "published" : "draft" 
          };
      
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        toast.success(
          isEditing ? "Nominee updated successfully!" : "Nominee created successfully!", 
          { id: loadingToast }
        );
        setFormData({ name: "", categoryId: "", publish: false, image: "", bio: "" });
        setEditingNomineeId(null);
        setShowAddModal(false);
        fetchNominees(selectedAward._id);
        fetchCategories(selectedAward._id);
      } else {
        const data = await response.json();
        toast.error(
          data.error || (isEditing ? "Failed to update nominee" : "Failed to create nominee"), 
          { id: loadingToast }
        );
      }
    } catch (error) { 
      toast.error(
        isEditing ? "Failed to update nominee" : "Failed to create nominee", 
        { id: loadingToast }
      ); 
    }
  };

  const handleEditNominee = (nominee: Nominee) => {
    setFormData({
      name: nominee.name,
      categoryId: nominee.categoryId._id,
      publish: nominee.status === "published",
      image: nominee.image || "",
      bio: nominee.bio || "",
    });
    setEditingNomineeId(nominee._id);
    setShowAddModal(true);
    setShowActionMenu(null);
  };

  const handleDeleteNominee = async (nomineeId: string) => {
    if (!confirm("Are you sure you want to delete this nominee?")) return;
    
    const loadingToast = toast.loading("Deleting nominee...");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/nominees/${nomineeId}`, { 
        method: "DELETE", 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (response.ok) {
        toast.success("Nominee deleted successfully!", { id: loadingToast });
        if (selectedAward) { 
          fetchNominees(selectedAward._id); 
          fetchCategories(selectedAward._id); 
        }
        setShowActionMenu(null);
      } else { 
        toast.error("Failed to delete nominee", { id: loadingToast }); 
      }
    } catch (error) { 
      toast.error("Failed to delete nominee", { id: loadingToast }); 
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) { 
      toast.error("Please upload a valid image file"); 
      return; 
    }
    
    const reader = new FileReader();
    reader.onloadend = () => { 
      setFormData((prev) => ({ ...prev, image: reader.result as string })); 
    };
    reader.readAsDataURL(file);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === "list" ? (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Manage Nominees</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Select an award program to view and manage its nominated candidates.
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/dashboard/awards'} 
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
                Create an award to be able to add nominees.
              </p>
              <button 
                onClick={() => window.location.href = '/dashboard/awards'} 
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
                      <div className={`${
                        award.status === 'active' ? 'bg-green-600' : 
                        award.status === 'voting' ? 'bg-blue-600' : 
                        'bg-yellow-600'
                      } py-1 px-2 rounded-full`}>
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
                        {(award as any).code || award._id.slice(-4).toUpperCase()}
                      </p>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
                      {award.organizationName}
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">Categories</span>
                        <p className="font-semibold text-gray-900 text-sm">{award.categories}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[10px] sm:text-xs">Show Results</span>
                        <p className="font-semibold text-gray-900 text-sm text-end">
                          {award.settings?.showResults ? 'Yes' : 'No'}
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

      {currentScreen === "nominees" && (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <button 
            onClick={() => { 
              setCurrentScreen("list"); 
              setSelectedAward(null); 
              setSearchQuery(""); 
              setSelectedCategoryFilter("all"); 
            }} 
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                Nominees: {selectedAward?.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Managing candidate profiles for this specific program.
              </p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base whitespace-nowrap"
            >
              <Plus size={18} />
              Add Nominees
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by nominee name..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="w-full text-sm text-black pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" 
                />
              </div>
              
              <div className="relative w-full sm:w-auto">
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
                  className="flex items-center justify-between gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 w-full sm:w-auto"
                >
                  <span className="text-xs sm:text-sm text-black truncate">
                    {selectedCategoryFilter === "all" 
                      ? "All categories" 
                      : categories.find(c => c._id === selectedCategoryFilter)?.name || "All categories"}
                  </span>
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute left-0 sm:right-0 mt-2 w-full sm:w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-60 overflow-y-auto">
                    <div className="p-2">
                      <div 
                        onClick={() => { 
                          setSelectedCategoryFilter("all"); 
                          setShowFilterDropdown(false); 
                        }} 
                        className="px-3 py-2.5 text-black hover:bg-gray-50 rounded cursor-pointer text-xs sm:text-sm"
                      >
                        All categories
                      </div>
                      {categories.map((category) => (
                        <div 
                          key={category._id} 
                          onClick={() => { 
                            setSelectedCategoryFilter(category._id); 
                            setShowFilterDropdown(false); 
                          }} 
                          className="px-3 py-2.5 text-black hover:bg-gray-50 rounded cursor-pointer text-xs sm:text-sm"
                        >
                          {category.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {loadingNominees ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-500">Loading nominees...</p>
                </div>
              ) : nominees.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500">No nominees found</p>
                </div>
              ) : (
                nominees.map((nominee) => (
                  <div key={nominee._id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    {/* Mobile View */}
                    <div className="flex lg:hidden flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-sm shrink-0">
                            {getInitials(nominee.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                                {nominee.name}
                              </h3>
                              {nominee.nomineeCode && (
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                  {nominee.nomineeCode}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {nominee.status === 'published' ? 'Published' : 'Draft'}
                            </div>
                            {nominee.nominationType === 'self' && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded inline-block mt-1">
                                Self-Nomination
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative shrink-0">
                          <button 
                            onClick={() => setShowActionMenu(showActionMenu === nominee._id ? null : nominee._id)} 
                            className="p-2 hover:bg-gray-100 rounded-lg"
                          >
                            <MoreVertical size={18} className="text-gray-400" />
                          </button>
                          
                          {showActionMenu === nominee._id && (
                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                              <button 
                                onClick={() => handleEditNominee(nominee)} 
                                className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteNominee(nominee._id)} 
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-gray-300 rounded-full shrink-0"></span>
                          <span className="text-xs text-gray-600 truncate">
                            {nominee.categoryId.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(nominee.createdAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden lg:flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold shrink-0">
                        {getInitials(nominee.name)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {nominee.name}
                          </h3>
                          {nominee.nomineeCode && (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                              {nominee.nomineeCode}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            <span className="w-4 h-4 bg-gray-300 rounded-full"></span>
                            {nominee.categoryId.name}
                          </span>
                          {nominee.nominationType === 'self' && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Self-Nomination
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-gray-900">
                          {nominee.status === 'published' ? 'Published' : 'Draft'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(nominee.createdAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      
                      <div className="relative shrink-0">
                        <button 
                          onClick={() => setShowActionMenu(showActionMenu === nominee._id ? null : nominee._id)} 
                          className="p-2 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>
                        
                        {showActionMenu === nominee._id && (
                          <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button 
                              onClick={() => handleEditNominee(nominee)} 
                              className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteNominee(nominee._id)} 
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Nominee Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
          onClick={() => {
            setShowAddModal(false);
            setFormData({ name: "", categoryId: "", publish: false, image: "", bio: "" });
            setEditingNomineeId(null);
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-green-600 text-white px-4 sm:px-6 py-4 rounded-t-lg sticky top-0 z-10">
              <h3 className="font-semibold text-base sm:text-lg">
                {editingNomineeId ? 'Edit Nominee' : 'Add New Nominee'}
              </h3>
              <p className="text-xs sm:text-sm text-green-100 mt-1">
                Specify candidate details and category assigned.
              </p>
            </div>
            
            <div className="p-4 sm:p-6">
              {/* Image Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {formData.image ? (
                    <Image 
                      src={formData.image} 
                      alt="Nominee" 
                      width={96} 
                      height={96} 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="text-gray-400" size={28} />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                    id="imageUpload" 
                  />
                </div>
                <label 
                  htmlFor="imageUpload" 
                  className="mt-2 text-xs sm:text-sm text-green-600 cursor-pointer hover:underline"
                >
                  Click to upload an image
                </label>
              </div>

              {/* Nominee Name */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Nominee Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="E.g. Michael" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full text-sm text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" 
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select 
                  value={formData.categoryId} 
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} 
                  className="w-full text-sm text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">Select a category...</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Publish Checkbox */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.publish} 
                    onChange={(e) => setFormData({ ...formData, publish: e.target.checked })} 
                    className="rounded text-green-600 shrink-0" 
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Publish Nominee</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => { 
                    setShowAddModal(false); 
                    setFormData({ name: "", categoryId: "", publish: false, image: "", bio: "" }); 
                    setEditingNomineeId(null);
                  }} 
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddNominee} 
                  disabled={!formData.name || !formData.categoryId} 
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  {editingNomineeId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AwardsManagementSystem;
