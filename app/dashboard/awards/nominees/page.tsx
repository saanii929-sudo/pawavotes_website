'use client';
import React, { useState, useEffect } from "react";
import { Plus, Search, MoreVertical, X, Upload, ChevronDown, ChevronLeft, Info, Edit2, Trash2, Download, Link as LinkIcon, Copy, QrCode } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import ImageUpload from '@/components/ImageUpload';
import ConfirmModal from "@/components/ConfirmModal";

interface Award {
  _id: string;
  name: string;
  code: string;
  organizationName: string;
  status: string;
  categories: number;
  settings?: { 
    showResults?: boolean;
    nominationLinkGenerated?: boolean;
  };
  banner?: string;
  pricing?: {
    votingCost: number;
  };
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
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [nominationLinkGenerated, setNominationLinkGenerated] = useState(false);
  const [nominationLink, setNominationLink] = useState("");
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);
  const [loadingNominees, setLoadingNominees] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [editingNomineeId, setEditingNomineeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    categoryIds: [] as string[], 
    publish: false, 
    image: "", 
    bio: "",
    email: "",
    phone: ""
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
    fetchAwards();
    fetchServiceFee(); 
  }, []);
  
  useEffect(() => { 
    if (selectedAward) { 
      fetchCategories(selectedAward._id); 
      fetchNominees(selectedAward._id);
      // Check if nomination link was already generated for this award
      console.log('Selected Award Settings:', selectedAward.settings);
      console.log('Nomination Link Generated:', selectedAward.settings?.nominationLinkGenerated);
      if (selectedAward.settings?.nominationLinkGenerated) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/nominate/${selectedAward._id}`;
        setNominationLink(link);
        setNominationLinkGenerated(true);
      } else {
        setNominationLinkGenerated(false);
        setNominationLink("");
      }
    } 
  }, [selectedAward, searchQuery, selectedCategoryFilter]);


  
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

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/awards", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (response.ok) { 
        const data = await response.json(); 
        console.log('Fetched awards:', data.data);
        console.log('First award settings:', data.data[0]?.settings);
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

  const groupedNominees = React.useMemo(() => {
    console.log('Raw nominees count:', nominees.length);
    
    const grouped = nominees.reduce((acc: any[], nominee: Nominee) => {
      const normalizedName = nominee.name.trim().toLowerCase();
      
      const existing = acc.find(item => 
        item.name.trim().toLowerCase() === normalizedName
      );
      
      if (existing) {
        // Check if this category is already added (avoid duplicates)
        const categoryExists = existing.categories.some((cat: any) => cat.nomineeId === nominee._id);
        if (!categoryExists) {
          existing.categories.push({
            id: nominee.categoryId._id,
            name: nominee.categoryId.name,
            nomineeCode: nominee.nomineeCode,
            nomineeId: nominee._id,
            status: nominee.status,
            nominationStatus: nominee.nominationStatus
          });
        }
      } else {
        acc.push({
          name: nominee.name,
          image: nominee.image,
          bio: nominee.bio,
          email: nominee.email,
          phone: nominee.phone,
          nominationType: nominee.nominationType,
          createdAt: nominee.createdAt,
          categories: [{
            id: nominee.categoryId._id,
            name: nominee.categoryId.name,
            nomineeCode: nominee.nomineeCode,
            nomineeId: nominee._id,
            status: nominee.status,
            nominationStatus: nominee.nominationStatus
          }]
        });
      }
      return acc;
    }, []);
    
    return grouped;
  }, [nominees]);

  const handleSelectAward = (award: Award) => {
    setSelectedAward(award);
    setCurrentScreen("nominees");
  };

  const handleAddNominee = async () => {
    if (!formData.name || formData.categoryIds.length === 0 || !selectedAward) return;
    
    const isEditing = !!editingNomineeId;
    const loadingToast = toast.loading(
      isEditing 
        ? "Updating nominee..." 
        : `Creating nominee for ${formData.categoryIds.length} ${formData.categoryIds.length === 1 ? 'category' : 'categories'}...`
    );
    
    try {
      const token = localStorage.getItem("token");
      
      if (isEditing) {
        // For editing, update single nominee
        const response = await fetch(`/api/nominees/${editingNomineeId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json", 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            name: formData.name,
            categoryId: formData.categoryIds[0], // When editing, use first category
            image: formData.image || undefined,
            bio: formData.bio || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            status: formData.publish ? "published" : "draft"
          }),
        });
        
        if (response.ok) {
          toast.success("Nominee updated successfully!", { id: loadingToast });
          setFormData({ name: "", categoryIds: [], publish: false, image: "", bio: "", email: "", phone: "" });
          setEditingNomineeId(null);
          setShowAddModal(false);
          fetchNominees(selectedAward._id);
          fetchCategories(selectedAward._id);
        } else {
          const data = await response.json();
          toast.error(data.error || "Failed to update nominee", { id: loadingToast });
        }
      } else {
        // For creating, create nominees sequentially to avoid race condition
        let successCount = 0;
        let failCount = 0;
        
        for (const categoryId of formData.categoryIds) {
          try {
            const response = await fetch("/api/nominees", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json", 
                Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({
                name: formData.name,
                awardId: selectedAward._id,
                categoryId,
                image: formData.image || undefined,
                bio: formData.bio || undefined,
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                status: formData.publish ? "published" : "draft"
              }),
            });
            
            if (response.ok) {
              successCount++;
            } else {
              failCount++;
              console.error('Failed to create nominee for category:', categoryId);
            }
          } catch (error) {
            failCount++;
            console.error('Error creating nominee for category:', categoryId, error);
          }
        }
        
        if (successCount > 0) {
          toast.success(
            failCount > 0
              ? `Created ${successCount} nominee(s), ${failCount} failed`
              : `Nominee created successfully for ${successCount} ${successCount === 1 ? 'category' : 'categories'}!`,
            { id: loadingToast }
          );
          setFormData({ name: "", categoryIds: [], publish: false, image: "", bio: "", email: "", phone: "" });
          setEditingNomineeId(null);
          setShowAddModal(false);
          fetchNominees(selectedAward._id);
          fetchCategories(selectedAward._id);
        } else {
          toast.error(`Failed to create nominees for all categories`, { id: loadingToast });
        }
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
      categoryIds: [nominee.categoryId._id],
      publish: nominee.status === "published",
      image: nominee.image || "",
      bio: nominee.bio || "",
      email: nominee.email || "",
      phone: nominee.phone || ""
    });
    setEditingNomineeId(nominee._id);
    setShowAddModal(true);
    setShowActionMenu(null);
  };

  const handleDeleteNominee = async (nomineeId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Nominee",
      message: "Are you sure you want to delete this nominee?",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        
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
      }
    });
  };

  const handleDownloadNominees = async () => {
    if (!selectedAward) return;
    
    setDownloadingZip(true);
    const loadingToast = toast.loading("Preparing nominees download...");
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/nominees/download?awardId=${selectedAward._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedAward.name.replace(/[^a-z0-9]/gi, '_')}_nominees.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Nominees downloaded successfully!", { id: loadingToast });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to download nominees", { id: loadingToast });
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download nominees", { id: loadingToast });
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleGenerateNominationLink = async () => {
    if (!selectedAward) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/awards/${selectedAward._id}/generate-nomination-link`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Generate link API response:', data);

      if (data.success) {
        setNominationLink(data.nominationLink);
        setNominationLinkGenerated(true);
        
        // Update the local award object to reflect the change
        const updatedSettings = {
          showResults: selectedAward.settings?.showResults ?? false,
          nominationLinkGenerated: true
        };
        
        setSelectedAward({
          ...selectedAward,
          settings: updatedSettings
        });
        
        // Also update the awards list to persist the change
        setAwards(awards.map(award => 
          award._id === selectedAward._id 
            ? { 
                ...award, 
                settings: {
                  showResults: award.settings?.showResults ?? false,
                  nominationLinkGenerated: true
                }
              }
            : award
        ));
        
        toast.success("Nomination link generated!", { duration: 4000 });
      } else {
        toast.error(data.error || "Failed to generate nomination link", { duration: 4000 });
      }
    } catch (error) {
      console.error("Generate link error:", error);
      toast.error("Failed to generate nomination link", { duration: 4000 });
    }
  };

  const handleCopyNominationLink = async () => {
    try {
      await navigator.clipboard.writeText(nominationLink);
      toast.success("Nomination link copied to clipboard!", { duration: 3000 });
    } catch (error) {
      toast.error("Failed to copy link", { duration: 3000 });
    }
  };

  const handleDownloadQRCode = async () => {
    try {
      if (!nominationLink || !selectedAward) return;

      // Use QR code API to generate QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(nominationLink)}`;
      
      // Fetch the QR code image
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedAward.name.replace(/[^a-z0-9]/gi, '_')}_Nomination_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("QR code downloaded successfully!", { duration: 3000 });
    } catch (error) {
      console.error("QR download error:", error);
      toast.error("Failed to download QR code", { duration: 3000 });
    }
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
                          Price (GHS {award.pricing?.votingCost?.toFixed(2) || '0.50'})
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
                      <span>{serviceFeePercentage}% service fee later applied for all awards.</span>
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

              <button 
                onClick={handleDownloadNominees}
                disabled={downloadingZip || nominees.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                title="Download all nominees with images"
              >
                {downloadingZip ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs sm:text-sm">Preparing...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span className="text-xs sm:text-sm">Download</span>
                  </>
                )}
              </button>

              {!nominationLinkGenerated ? (
                <button 
                  onClick={handleGenerateNominationLink}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  title="Generate public nomination link"
                >
                  <LinkIcon size={18} />
                  <span className="text-xs sm:text-sm">Generate Link</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={handleCopyNominationLink}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
                    title="Copy nomination link to clipboard"
                  >
                    <Copy size={18} />
                    <span className="text-xs sm:text-sm">Copy Link</span>
                  </button>
                  
                  <button 
                    onClick={handleDownloadQRCode}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
                    title="Download QR code for nomination link"
                  >
                    <QrCode size={18} />
                    <span className="text-xs sm:text-sm">Download QR</span>
                  </button>
                </>
              )}
            </div>

            <div className="divide-y divide-gray-200">
              {loadingNominees ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-500">Loading nominees...</p>
                </div>
              ) : groupedNominees.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-gray-500">No nominees found</p>
                </div>
              ) : (
                groupedNominees.map((nominee, index) => (
                  <div key={`${nominee.name}-${index}`} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors relative">
                    {/* Mobile View */}
                    <div className="flex lg:hidden flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {nominee.image ? (
                            <img src={nominee.image} alt={nominee.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold text-xs shrink-0">
                              {getInitials(nominee.name)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-gray-900 wrap-break-word">
                              {nominee.name}
                            </h3>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {nominee.categories.length} {nominee.categories.length === 1 ? 'Category' : 'Categories'}
                            </div>
                            {nominee.nominationType === 'self' && (
                              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-1">
                                Self-Nomination
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative shrink-0">
                          <button 
                            onClick={() => setShowActionMenu(showActionMenu === `${nominee.name}-${index}` ? null : `${nominee.name}-${index}`)} 
                            className="p-1.5 hover:bg-gray-100 rounded-lg"
                          >
                            <MoreVertical size={16} className="text-gray-400" />
                          </button>
                          
                          {showActionMenu === `${nominee.name}-${index}` && (
                            <div className={`absolute ${index >= groupedNominees.length - 2 ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50`}>
                              <button 
                                onClick={() => handleEditNominee({
                                  _id: nominee.categories[0].nomineeId,
                                  name: nominee.name,
                                  categoryId: { _id: nominee.categories[0].id, name: nominee.categories[0].name },
                                  image: nominee.image,
                                  bio: nominee.bio,
                                  email: nominee.email,
                                  phone: nominee.phone,
                                  status: nominee.categories[0].status,
                                  nominationStatus: nominee.categories[0].nominationStatus,
                                  nominationType: nominee.nominationType,
                                  createdAt: nominee.createdAt
                                } as Nominee)} 
                                className="w-full text-black px-3 py-2 text-left text-xs hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                              >
                                <Edit2 size={12} />
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Delete All Nominations",
                                    message: `Delete all ${nominee.categories.length} nomination(s) for ${nominee.name}?`,
                                    type: "danger",
                                    onConfirm: () => {
                                      setConfirmModal({ ...confirmModal, isOpen: false });
                                      nominee.categories.forEach((cat: any) => handleDeleteNominee(cat.nomineeId));
                                    }
                                  });
                                }} 
                                className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                              >
                                <Trash2 size={12} />
                                Delete All
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        {nominee.categories.map((cat: any, catIndex: number) => (
                          <div key={catIndex} className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></span>
                              <span className="text-xs text-gray-700 truncate">{cat.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                              {cat.nomineeCode}
                            </span>
                          </div>
                        ))}
                        <div className="text-[10px] text-gray-500 mt-1">
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
                      {nominee.image ? (
                        <img src={nominee.image} alt={nominee.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-semibold shrink-0">
                          {getInitials(nominee.name)}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {nominee.name}
                          </h3>
                          {nominee.nominationType === 'self' && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              Self-Nomination
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {nominee.categories.map((cat: any, catIndex: number) => (
                            <div key={catIndex} className="inline-flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                              <span className="font-medium">{cat.name}</span>
                              <span className="text-red-600 font-bold">({cat.nomineeCode})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(nominee.createdAt).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => setShowActionMenu(showActionMenu === `${nominee.name}-${index}` ? null : `${nominee.name}-${index}`)} 
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical size={20} className="text-gray-500" />
                          </button>
                          
                          {showActionMenu === `${nominee.name}-${index}` && (
                            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                              <button 
                                onClick={() => handleEditNominee({
                                  _id: nominee.categories[0].nomineeId,
                                  name: nominee.name,
                                  categoryId: { _id: nominee.categories[0].id, name: nominee.categories[0].name },
                                  image: nominee.image,
                                  bio: nominee.bio,
                                  email: nominee.email,
                                  phone: nominee.phone,
                                  status: nominee.categories[0].status,
                                  nominationStatus: nominee.categories[0].nominationStatus,
                                  nominationType: nominee.nominationType,
                                  createdAt: nominee.createdAt
                                } as Nominee)} 
                                className="w-full text-black px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg flex items-center gap-2"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                              <button 
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Delete All Nominations",
                                    message: `Delete all ${nominee.categories.length} nomination(s) for ${nominee.name}?`,
                                    type: "danger",
                                    onConfirm: () => {
                                      setConfirmModal({ ...confirmModal, isOpen: false });
                                      nominee.categories.forEach((cat: any) => handleDeleteNominee(cat.nomineeId));
                                    }
                                  });
                                }} 
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete All
                              </button>
                            </div>
                          )}
                        </div>
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
            setFormData({ name: "", categoryIds: [], publish: false, image: "", bio: "", email: "", phone: "" });
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Nominee Image
                </label>
                <ImageUpload
                  onUploadComplete={(url) => setFormData({ ...formData, image: url })}
                  currentImage={formData.image}
                  folder="awards/nominees"
                  maxSize={5}
                />
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

              {/* Categories */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {editingNomineeId ? 'Category' : 'Categories'} <span className="text-red-500">*</span>
                </label>
                {editingNomineeId ? (
                  <select 
                    value={formData.categoryIds[0] || ""} 
                    onChange={(e) => setFormData({ ...formData, categoryIds: [e.target.value] })} 
                    className="w-full text-sm text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {categories.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">No categories available</p>
                    ) : (
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <label key={category._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.categoryIds.includes(category._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, categoryIds: [...formData.categoryIds, category._id] });
                                } else {
                                  setFormData({ ...formData, categoryIds: formData.categoryIds.filter(id => id !== category._id) });
                                }
                              }}
                              className="rounded text-green-600 shrink-0"
                            />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!editingNomineeId && formData.categoryIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.categoryIds.length} {formData.categoryIds.length === 1 ? 'category' : 'categories'} selected
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input 
                  type="email" 
                  placeholder="nominee@example.com" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  className="w-full text-sm text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" 
                />
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input 
                  type="tel" 
                  placeholder="0XX XXX XXXX" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  className="w-full text-sm text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" 
                />
              </div>

              {/* Bio */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Biography
                </label>
                <textarea 
                  placeholder="Tell us about this nominee..." 
                  value={formData.bio} 
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                  rows={4}
                  className="w-full text-sm text-black border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none" 
                />
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
                    setFormData({ name: "", categoryIds: [], publish: false, image: "", bio: "", email: "", phone: "" }); 
                    setEditingNomineeId(null);
                  }} 
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddNominee} 
                  disabled={!formData.name || formData.categoryIds.length === 0} 
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  {editingNomineeId ? 'Update' : 'Add'}
                </button>
              </div>
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
};

export default AwardsManagementSystem;
