"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Upload,
  Award,
  ChevronRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

const AwardPage = () => {
  const [currentView, setCurrentView] = useState("list"); // list, create
  const [currentStep, setCurrentStep] = useState(1);
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('organization');
  const [serviceFeePercentage, setServiceFeePercentage] = useState<number>(10);

  // Fetch awards from database
  useEffect(() => {
    fetchAwards();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching current user...");
      
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("User data received:", data);
        const user = data.data;
        const orgName = user.organizationName || user.name || "";
        console.log("Organization name:", orgName);
        
        setFormData(prev => ({ ...prev, organization: orgName }));
        setUserRole(user.role || 'organization');
        setServiceFeePercentage(user.serviceFeePercentage || 10);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch user data:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/awards", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAwards(data.data);
      } else {
        toast.error("Failed to fetch awards");
      }
    } catch (error) {
      console.error("Failed to fetch awards:", error);
      toast.error("Failed to fetch awards");
    } finally {
      setLoading(false);
    }
  };
  const [formData, setFormData] = useState({
    eventImage: null,
    organization: "",
    awardName: "",
    votingStartDate: "",
    votingEndDate: "",
    votingStartTime: "00:00 AM",
    votingEndTime: "00:00 PM",
    activateNomination: false,
    nominationType: "free",
    nominationFixedPrice: "",
    nominationStartDate: "",
    nominationEndDate: "",
    nominationStartTime: "00:00 AM",
    nominationEndTime: "00:00 PM",
    categories: [],
    pricingType: "paid", // paid, social
    votingCost: "0.5",
    socialOptions: {
      normalVoting: false,
      bulkVoting: false,
      facebook: false,
      twitter: false,
    },
    votingFrequency: "",
    publishAward: false,
    showResults: false,
    awardPreferences: {
      publish: false,
      showResults: false,
    },
  });

  const steps = [
    {
      number: 1,
      title: "About Award",
      subtitle: "Let people know who is hosting the awards.",
    },
    {
      number: 2,
      title: "Nominations",
      subtitle: "Set nominations dates and prices.",
    },
    {
      number: 3,
      title: "Award Pricing",
      subtitle: "Setup the pricing scheme you want to use.",
    },
    {
      number: 4,
      title: "Award Preferences",
      subtitle:
        "We recommend you publish only when you are done setting up your categories and nominees.",
    },
  ];

  const handleCreateNew = () => {
    setEditingAwardId(null);
    const currentOrgName = formData.organization;
    setFormData({
      eventImage: null,
      organization: currentOrgName,
      awardName: "",
      votingStartDate: "",
      votingEndDate: "",
      votingStartTime: "00:00 AM",
      votingEndTime: "00:00 PM",
      activateNomination: false,
      nominationType: "free",
      nominationFixedPrice: "",
      nominationStartDate: "",
      nominationEndDate: "",
      nominationStartTime: "00:00 AM",
      nominationEndTime: "00:00 PM",
      categories: [],
      pricingType: "paid",
      votingCost: "0.5",
      socialOptions: {
        normalVoting: false,
        bulkVoting: false,
        facebook: false,
        twitter: false,
      },
      votingFrequency: "",
      publishAward: false,
      showResults: false,
      awardPreferences: {
        publish: false,
        showResults: false,
      },
    });
    setCurrentView("create");
    setCurrentStep(1);
  };

  const handleEditAward = async (awardId: string) => {
    const loadingToast = toast.loading("Loading award...");
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/awards/${awardId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { data: award } = await response.json();
        const imageToDisplay = award.banner || '/images/events/event-1.png';
        setFormData({
          eventImage: imageToDisplay,
          organization: award.organizationName,
          awardName: award.name,
          votingStartDate: award.votingStartDate ? new Date(award.votingStartDate).toISOString().split('T')[0] : "",
          votingEndDate: award.votingEndDate ? new Date(award.votingEndDate).toISOString().split('T')[0] : "",
          votingStartTime: award.votingStartTime || "00:00",
          votingEndTime: award.votingEndTime || "00:00",
          activateNomination: award.nomination?.enabled || false,
          nominationType: award.nomination?.type || "free",
          nominationFixedPrice: award.nomination?.fixedPrice?.toString() || "",
          nominationStartDate: award.nomination?.startDate ? new Date(award.nomination.startDate).toISOString().split('T')[0] : "",
          nominationEndDate: award.nomination?.endDate ? new Date(award.nomination.endDate).toISOString().split('T')[0] : "",
          nominationStartTime: award.nomination?.startTime || "00:00",
          nominationEndTime: award.nomination?.endTime || "00:00",
          categories: award.nomination?.categories || [],
          pricingType: award.pricing?.type || "paid",
          votingCost: award.pricing?.votingCost?.toString() || "0.5",
          socialOptions: award.pricing?.socialOptions || {
            normalVoting: false,
            bulkVoting: false,
            facebook: false,
            twitter: false,
          },
          votingFrequency: award.pricing?.votingFrequency?.toString() || "",
          publishAward: award.status === 'active',
          showResults: award.settings?.showResults || false,
          awardPreferences: {
            publish: award.status === 'active',
            showResults: award.settings?.showResults || false,
          },
        });
        
        setEditingAwardId(awardId);
        setCurrentView("create");
        setCurrentStep(1);
        toast.success("Award loaded successfully!", { id: loadingToast });
      } else {
        toast.error("Failed to load award", { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to load award:", error);
      toast.error("Failed to load award", { id: loadingToast });
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setCurrentView("list");
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleDiscardProgress = () => {
    setEditingAwardId(null);
    setCurrentView("list");
    setCurrentStep(1);
    setFormData({
      eventImage: null,
      organization: "",
      awardName: "",
      votingStartDate: "",
      votingEndDate: "",
      votingStartTime: "00:00 AM",
      votingEndTime: "00:00 PM",
      activateNomination: false,
      nominationType: "free",
      nominationFixedPrice: "",
      nominationStartDate: "",
      nominationEndDate: "",
      nominationStartTime: "00:00 AM",
      nominationEndTime: "00:00 PM",
      categories: [],
      pricingType: "paid",
      votingCost: "0.5",
      socialOptions: {
        normalVoting: false,
        bulkVoting: false,
        facebook: false,
        twitter: false,
      },
      votingFrequency: "",
      publishAward: false,
      showResults: false,
      awardPreferences: {
        publish: false,
        showResults: false,
      },
    });
  };

  const handleDone = async () => {
    const isEditing = !!editingAwardId;
    const loadingToast = toast.loading(isEditing ? "Updating award..." : "Creating award...");
    
    try {
      const token = localStorage.getItem("token");
      
      console.log("Form data before submission:", formData);
      console.log("Organization name:", formData.organization);
      const awardData = {
        name: formData.awardName,
        organizationName: formData.organization,
        description: `Award organized by ${formData.organization}`,
        startDate: formData.votingStartDate,
        endDate: formData.votingEndDate,
        votingStartDate: formData.votingStartDate,
        votingEndDate: formData.votingEndDate,
        votingStartTime: formData.votingStartTime,
        votingEndTime: formData.votingEndTime,
        status: formData.awardPreferences.publish ? 'active' : 'draft',
        banner: formData.eventImage || undefined,
        nomination: {
          enabled: formData.activateNomination,
          type: formData.nominationType,
          fixedPrice: formData.nominationType === 'fixed' ? parseFloat(formData.nominationFixedPrice) || 0 : undefined,
          startDate: formData.nominationStartDate || undefined,
          endDate: formData.nominationEndDate || undefined,
          startTime: formData.nominationStartTime || undefined,
          endTime: formData.nominationEndTime || undefined,
          categories: formData.nominationType === 'category' ? formData.categories : undefined,
        },
        pricing: {
          type: formData.pricingType,
          votingCost: formData.pricingType === 'paid' ? parseFloat(formData.votingCost) || 0.5 : undefined,
          votingFrequency: formData.pricingType === 'social' ? parseFloat(formData.votingFrequency) || undefined : undefined,
          socialOptions: formData.socialOptions,
        },
        settings: {
          allowPublicVoting: formData.pricingType === 'paid',
          requireEmailVerification: false,
          maxVotesPerUser: 1,
          showResults: formData.awardPreferences.showResults,
        },
      };

      const url = isEditing ? `/api/awards/${editingAwardId}` : "/api/awards";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(awardData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(isEditing ? "Award updated successfully!" : "Award created successfully!", { id: loadingToast });
        setEditingAwardId(null);
        setCurrentView("list");
        setCurrentStep(1);
        fetchAwards(); 
        setFormData({
          eventImage: null,
          organization: "",
          awardName: "",
          votingStartDate: "",
          votingEndDate: "",
          votingStartTime: "00:00 AM",
          votingEndTime: "00:00 PM",
          activateNomination: false,
          nominationType: "free",
          nominationFixedPrice: "",
          nominationStartDate: "",
          nominationEndDate: "",
          nominationStartTime: "00:00 AM",
          nominationEndTime: "00:00 PM",
          categories: [],
          pricingType: "paid",
          votingCost: "0.5",
          socialOptions: {
            normalVoting: false,
            bulkVoting: false,
            facebook: false,
            twitter: false,
          },
          votingFrequency: "",
          publishAward: false,
          showResults: false,
          awardPreferences: {
            publish: false,
            showResults: false,
          },
        });
      } else {
        toast.error(data.error || (isEditing ? "Failed to update award" : "Failed to create award"), { id: loadingToast });
      }
    } catch (error) {
      console.error("Failed to save award:", error);
      toast.error(isEditing ? "Failed to update award" : "Failed to create award", { id: loadingToast });
    }
  };

  return (
    <div className=" bg-gray-50">
      <AnimatePresence mode="wait">
        {currentView === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 md:p-8 max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Manage Awards
                </h1>
                <p className="text-gray-500">
                  Review and organize your categories and honors.
                </p>
              </div>
              {userRole !== 'org-admin' && (
                <button
                  onClick={handleCreateNew}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  <Plus size={20} />
                  Create New Award
                </button>
              )}
            </div>

            {/* Awards List or Empty State */}
            <div
              className={`${awards.length === 0 && !loading ? "bg-white rounded-xl border border-gray-200 p-8" : ""}`}
            >
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                  <p className="text-gray-500">Loading awards...</p>
                </div>
              ) : awards.length === 0 ? (
                <div className="text-center py-20">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {userRole === 'org-admin' ? 'No awards assigned to you' : 'No awards created yet'}
                  </h2>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    {userRole === 'org-admin' 
                      ? 'Contact your organization owner to get access to awards.'
                      : 'Define your award programs, categories, and nominees to begin the voting process.'}
                  </p>
                  {userRole !== 'org-admin' && (
                    <button
                      onClick={handleCreateNew}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors"
                    >
                      <Plus size={20} />
                      Create New Award
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                  {awards.map((award: any) => (
                    <div
                      key={award._id}
                      onClick={() => handleEditAward(award._id)}
                      className="group overflow-hidden rounded-xl bg-white shadow transition cursor-pointer hover:shadow-lg"
                    >
                      <div className="relative aspect-square h-60 w-full overflow-hidden">
                        <Image
                          src={award.banner || "/images/events/event-1.png"}
                          alt={award.name}
                          fill
                          className="object-cover  transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-0 p-4 left-0 right-0 flex justify-between items-center">
                          <div className="bg-[#FFFFFFCC] py-1 px-2 rounded-full text-xs">
                            <p className="text-[10px] text-black font-semibold">
                              Price (GHS {award.pricing?.votingCost?.toFixed(2) || '0.50'})
                            </p>
                          </div>
                          <div className={`${
                            award.status === 'active' ? 'bg-[#16A34A]' : 
                            award.status === 'voting' ? 'bg-blue-600' : 
                            'bg-yellow-600'
                          } py-1 px-2 rounded-full text-xs`}>
                            <p className="text-[10px] text-white font-semibold uppercase">
                              {award.status}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 px-3 py-2">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">
                              {award.name}
                            </h3>
                            <p className="text-red-700 font-bold text-xs">
                              {award.code}
                            </p>
                          </div>
                          <p className="text-[10px] text-gray-500 mb-4">
                            {award.organizationName}
                          </p>
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <span className="text-gray-500">Categories</span>
                              <p className="font-semibold text-gray-900">
                                {award.categories}
                              </p>
                            </div>
                            <div className="mt-2 sm:mt-0">
                              <span className="text-gray-500">
                                Show Results
                              </span>
                              <p className="font-semibold text-gray-900 text-end">
                                {award.settings?.showResults ? 'Yes' : 'No'}
                              </p>
                            </div>
                          </div>
                          <p className="text-green-600 text-xs mt-3 flex items-center gap-1 mb-2">
                            <Info size={14} />
                            {serviceFeePercentage}% service fee later applied for all awards.
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
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 md:p-8 max-w-5xl mx-auto"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {editingAwardId ? "Edit Award" : "Create New Award"}
                </h1>
                <p className="text-gray-500">
                  Provide the details for your event to proceed.
                </p>
              </div>
              <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold">
                Step {currentStep} of 4
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 mb-8">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={`h-1 flex-1 rounded ${
                    currentStep > index
                      ? "bg-green-600"
                      : currentStep === index + 1
                        ? "bg-green-600"
                        : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2 text-sm"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            {/* Step Content */}
            <div className="bg-white rounded-xl border border-gray-200 w-full max-w-3xl mx-auto">
              <StepContent
                step={currentStep}
                formData={formData}
                setFormData={setFormData}
                steps={steps}
                editingAwardId={editingAwardId}
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-between mt-6 w-full max-w-3xl mx-auto">
              <button
                onClick={handleDiscardProgress}
                className="border border-red-500 text-red-500 hover:bg-red-50 px-6 py-2 rounded-lg transition-colors"
              >
                Discard Progress
              </button>
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="bg-green-100 text-green-700 hover:bg-green-200 px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleDone}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg transition-colors"
                >
                  {editingAwardId ? "Update" : "Done"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StepContent = ({ step, formData, setFormData, steps, editingAwardId }: any) => {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    price: "",
    publish: false,
  });

  const currentStepInfo = steps[step - 1];

  // Fetch categories when step 2 is active and nomination type is category
  useEffect(() => {
    if (step === 2 && formData.nominationType === 'category' && editingAwardId) {
      fetchCategories();
    }
  }, [step, formData.nominationType, editingAwardId]);

  const fetchCategories = async () => {
    if (!editingAwardId) {
      setCategories([]);
      return;
    }

    setLoadingCategories(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categories?awardId=${editingAwardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      return;
    }

    if (!editingAwardId) {
      toast.error('Please save the award first before adding categories');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategory.name,
          awardId: editingAwardId,
          price: parseFloat(newCategory.price) || 0,
          isPublished: newCategory.publish,
        }),
      });

      if (response.ok) {
        toast.success('Category created successfully');
        setNewCategory({ name: "", price: "", publish: false });
        fetchCategories(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleUpdateCategoryPrice = async (categoryId: string, price: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          price: parseFloat(price) || 0,
        }),
      });

      if (response.ok) {
        toast.success('Category price updated');
        fetchCategories(); // Refresh the list
      } else {
        toast.error('Failed to update category price');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Failed to update category');
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev: any) => ({
        ...prev,
        eventImage: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-8">
      {/* Step Header */}
      {!showCategoryModal ? (
        <div className="bg-green-600 text-white p-4 rounded-lg mb-6 flex items-start gap-3">
          <div className="bg-white text-green-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">
            0{step}
          </div>
          <div>
            <h2 className="font-bold text-lg mb-1">{currentStepInfo.title}</h2>
            <p className="text-sm text-green-100">{currentStepInfo.subtitle}</p>
          </div>
        </div>
      ) : (
        <div className="bg-green-600 text-white p-4 rounded-t-xl mb-6 flex items-start gap-3">
          <div className="bg-white text-green-600 rounded-full w-8 h-8 flex items-center justify-center font-bold shrink-0">
            02
          </div>
          <div>
            <h2 className="font-bold text-lg mb-1">
              Nominations: Price per category
            </h2>
            <p className="text-sm text-green-100">
              Set nominations dates and prices.
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          {" "}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Event Banner Image <span className="text-red-500">*</span>
            </label>

            <label
              htmlFor="eventImage"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-green-500 hover:bg-green-50"
            >
              {formData.eventImage ? (
                <div className="relative h-40 w-full">
                  <Image
                    src={formData.eventImage}
                    alt="Event banner preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="rounded-md object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition hover:opacity-100">
                    <span className="text-sm font-medium text-white">
                      Click to change image
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 text-gray-400" size={28} />
                  <p className="text-sm text-gray-500">
                    Upload your award logo or banner image
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    PNG, JPG, JPEG (max 5MB)
                  </p>
                </>
              )}

              <input
                id="eventImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full text-black bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 cursor-not-allowed"
              value={formData.organization}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Award Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="E.g 2026 honourable party"
              className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              value={formData.awardName}
              onChange={(e) =>
                setFormData({ ...formData, awardName: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voting Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                placeholder="DD/MM/YYYY"
                className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                value={formData.votingStartDate}
                onChange={(e) =>
                  setFormData({ ...formData, votingStartDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voting End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                placeholder="DD/MM/YYYY"
                className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                value={formData.votingEndDate}
                onChange={(e) =>
                  setFormData({ ...formData, votingEndDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voting Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                placeholder="00:00 AM"
                className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                value={formData.votingStartTime}
                onChange={(e) =>
                  setFormData({ ...formData, votingStartTime: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voting End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                placeholder="00:00 PM"
                className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                value={formData.votingEndTime}
                onChange={(e) =>
                  setFormData({ ...formData, votingEndTime: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {!showCategoryModal ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Activate Nomination
                </label>
                <input
                  type="checkbox"
                  checked={formData.activateNomination}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      activateNomination: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-green-600"
                />
              </div>

              {formData.activateNomination && (
                <>
                  <p className="text-green-600 text-sm flex items-center gap-2">
                    <ChevronRight size={14} />
                    Manage the information you want to collect from nominees.
                  </p>

                  <div className="flex flex-col md:flex-row gap-2">
                    <button
                      onClick={() =>
                        setFormData({ ...formData, nominationType: "free" })
                      }
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        formData.nominationType === "free"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Free Nominations
                    </button>
                    <button
                      onClick={() =>
                        setFormData({ ...formData, nominationType: "fixed" })
                      }
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        formData.nominationType === "fixed"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Fixed Price
                    </button>
                    <button
                      onClick={() =>
                        setFormData({ ...formData, nominationType: "category" })
                      }
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        formData.nominationType === "category"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Price Per Category
                    </button>
                  </div>

                  {formData.nominationType === "fixed" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nomination Fixed Price{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="GHS"
                        className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        value={formData.nominationFixedPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nominationFixedPrice: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {formData.nominationType === "category" && (
                    <div>
                      <p className="text-green-600 text-sm mb-4 flex items-center gap-2">
                        <ChevronRight size={14} />
                        {editingAwardId ? 'Manage categories and set prices for each category.' : 'Please save the award first, then you can add categories.'}
                      </p>

                      {!editingAwardId ? (
                        <div className="text-center py-12 border border-yellow-200 bg-yellow-50 rounded-lg">
                          <h3 className="font-bold text-gray-900 mb-2">
                            Save Award First
                          </h3>
                          <p className="text-gray-600 text-sm mb-4">
                            You need to save the award before you can add categories. Click "Done" at the bottom to save this award.
                          </p>
                        </div>
                      ) : loadingCategories ? (
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                          <p className="text-gray-500 text-sm">Loading categories...</p>
                        </div>
                      ) : categories.length === 0 ? (
                        <div className="text-center py-12 border border-gray-200 rounded-lg">
                          <h3 className="font-bold text-gray-900 mb-2">
                            No categories created yet
                          </h3>
                          <p className="text-gray-500 text-sm mb-4">
                            Categories allow you to group nominees and manage
                            different pricing for nominations.
                          </p>
                          <button
                            onClick={() => setShowCategoryModal(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-green-700 transition-colors"
                          >
                            <Plus size={16} />
                            Create Category
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4">
                            <h4 className="text-green-600 font-semibold mb-3">
                              Categories ({categories.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              {categories.map((cat: any) => (
                                <div
                                  key={cat._id}
                                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-medium text-gray-900 text-sm">
                                      {cat.name}
                                    </p>
                                    {cat.isPublished && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                        Published
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <label className="text-xs text-gray-600 mb-1 block">
                                      Nomination Price
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600">GHS</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={cat.price || 0}
                                        onChange={(e) => handleUpdateCategoryPrice(cat._id, e.target.value)}
                                        className="flex-1 text-sm text-black border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                        placeholder="0.00"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => setShowCategoryModal(true)}
                              className="w-full bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors font-medium"
                            >
                              <Plus size={16} className="inline mr-2" />
                              Add More Categories
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(formData.nominationType === "free" ||
                    formData.nominationType === "fixed") && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nomination Start Date{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            placeholder="DD/MM/YYYY"
                            className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            value={formData.nominationStartDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nominationStartDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nomination End Date{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            placeholder="DD/MM/YYYY"
                            className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            value={formData.nominationEndDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nominationEndDate: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nomination Start Time{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            placeholder="00:00 AM"
                            className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            value={formData.nominationStartTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nominationStartTime: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nomination End Time{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="time"
                            placeholder="00:00 PM"
                            className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            value={formData.nominationEndTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nominationEndTime: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white rounded-xl ">
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, name: e.target.value })
                      }
                      className="w-full text-black border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="E.g. best student 2026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Nomination Price <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">GHS</span>
                      <input
                        type="number"
                        step="0.01"
                        value={newCategory.price}
                        onChange={(e) =>
                          setNewCategory({ ...newCategory, price: e.target.value })
                        }
                        className="flex-1 text-black border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCategory.publish}
                        onChange={(e) =>
                          setNewCategory({
                            ...newCategory,
                            publish: e.target.checked,
                          })
                        }
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                      />
                      <span className="text-gray-700">Publish Category</span>
                    </label>

                    <button
                      onClick={handleAddCategory}
                      disabled={!newCategory.name || !newCategory.price}
                      className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Category
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-green-600 font-semibold mb-4 text-lg">
                    Categories List
                  </h4>
                  {loadingCategories ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8">
                      No categories added yet. Add one above.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-64 overflow-y-auto">
                      {categories.map((cat: any) => (
                        <div key={cat._id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm mb-1">
                                {cat.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                Price: GHS {cat.price || '0.00'}
                              </p>
                            </div>
                            {cat.isPublished && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                Published
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      fetchCategories(); // Refresh when closing
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFormData({ ...formData, pricingType: "paid" })}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                formData.pricingType === "paid"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Paid Voting
            </button>
            <button
              onClick={() =>
                setFormData({ ...formData, pricingType: "social" })
              }
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                formData.pricingType === "social"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Social Voting
            </button>
          </div>

          {formData.pricingType === "paid" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Social Media Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.socialOptions.normalVoting}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialOptions: {
                            ...formData.socialOptions,
                            normalVoting: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Normal Voting</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.socialOptions.bulkVoting}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialOptions: {
                            ...formData.socialOptions,
                            bulkVoting: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Bulk Voting</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost per vote <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">GHS</span>
                  <input
                    type="text"
                    value={formData.votingCost}
                    onChange={(e) =>
                      setFormData({ ...formData, votingCost: e.target.value })
                    }
                    className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {formData.pricingType === "social" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Social Media Options
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.socialOptions.facebook}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialOptions: {
                            ...formData.socialOptions,
                            facebook: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Facebook</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.socialOptions.twitter}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          socialOptions: {
                            ...formData.socialOptions,
                            twitter: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Twitter</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voting Frequency <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Hours"
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  value={formData.votingFrequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      votingFrequency: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  How often one can vote: 1 vote every ( ) hours.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Award Preferences */}
      {step === 4 && (
        <div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Award Preferences
            </label>
            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.awardPreferences.publish}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      awardPreferences: {
                        ...formData.awardPreferences,
                        publish: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Publish</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.awardPreferences.showResults}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      awardPreferences: {
                        ...formData.awardPreferences,
                        showResults: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Show Results</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AwardPage;
