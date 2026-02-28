"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award as AwardIcon, Users, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import PublicNav from "@/components/PublicNav";
import NominationModal from "@/components/NominationModal";

interface Award {
  _id: string;
  name: string;
  organizationName: string;
  banner?: string;
  logo?: string;
  description?: string;
  nomination?: {
    enabled: boolean;
    type: 'free' | 'fixed' | 'category';
    fixedPrice?: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
  status: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
  price?: number;
}

export default function PublicNominationPage() {
  const params = useParams();
  const router = useRouter();
  const awardId = params.awardId as string;

  const [award, setAward] = useState<Award | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [nominationModalOpen, setNominationModalOpen] = useState(false);

  useEffect(() => {
    if (awardId) {
      fetchAwardAndCategories();
    }
  }, [awardId]);

  const fetchAwardAndCategories = async () => {
    try {
      setLoading(true);
      
      // Fetch award details
      const awardResponse = await fetch(`/api/public/awards/${awardId}`);
      const awardData = await awardResponse.json();
      
      if (!awardData.success) {
        toast.error("Award not found");
        router.push("/find-vote");
        return;
      }

      setAward(awardData.award);

      // Fetch categories
      const categoriesResponse = await fetch(`/api/public/categories?awardId=${awardId}`);
      const categoriesData = await categoriesResponse.json();
      
      if (categoriesData.success) {
        setCategories(categoriesData.categories);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load nomination page");
    } finally {
      setLoading(false);
    }
  };

  const isNominationOpen = () => {
    if (!award?.nomination?.enabled) return false;

    const now = new Date();
    
    if (award.nomination.startDate && award.nomination.endDate) {
      const startDate = new Date(award.nomination.startDate);
      const endDate = new Date(award.nomination.endDate);
      
      if (award.nomination.startTime) {
        const [hours, minutes] = award.nomination.startTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      if (award.nomination.endTime) {
        const [hours, minutes] = award.nomination.endTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      return now >= startDate && now <= endDate;
    }
    
    return false;
  };

  const handleCategorySelect = (category: Category) => {
    if (!isNominationOpen()) {
      toast.error("Nominations are not currently open");
      return;
    }
    setSelectedCategory(category);
    setNominationModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!award) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Award not found</h2>
          <p className="text-gray-600 mb-6">This award may have been removed or doesn't exist.</p>
          <Link
            href="/find-vote"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Browse Awards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero Section */}
      <div className="bg-linear-to-r from-green-600 to-green-700 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
            <AwardIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Public Nominations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {award.name}
          </h1>
          <p className="text-lg sm:text-xl text-green-100 mb-2">
            {award.organizationName}
          </p>
          {!isNominationOpen() && (
            <div className="mt-6 bg-red-500/20 border border-red-300 rounded-lg px-4 py-3 inline-block">
              <p className="text-sm font-medium">Nominations are currently closed</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <Link
            href="/find-vote"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Awards</span>
          </Link>
        </div>

        {award.banner && (
          <div className="mb-8 rounded-xl overflow-hidden h-64 relative">
            <Image
              src={award.banner}
              alt={award.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {award.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About This Award</h2>
            <p className="text-gray-700 leading-relaxed">{award.description}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Category to Nominate</h2>
          <p className="text-gray-600 mb-6">
            Choose the category you want to submit a nomination for
          </p>

          {categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No categories available for nomination
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => handleCategorySelect(category)}
                  disabled={!isNominationOpen()}
                  className={`text-left p-6 rounded-lg border-2 transition-all ${
                    isNominationOpen()
                      ? 'border-gray-200 hover:border-green-500 hover:shadow-md cursor-pointer'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    {category.price && category.price > 0 && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          GHS {category.price}
                        </div>
                        <div className="text-xs text-gray-600">Nomination Fee</div>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How Nominations Work
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Select a category and fill in the nomination details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Upload a photo and provide relevant information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Submit your nomination for organizer review</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Approved nominations will receive a unique nominee code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>You'll be notified via email once your nomination is approved</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Nomination Modal */}
      {award && selectedCategory && (
        <NominationModal
          isOpen={nominationModalOpen}
          onClose={() => {
            setNominationModalOpen(false);
            setSelectedCategory(null);
          }}
          awardId={award._id}
          categoryId={selectedCategory._id}
          categoryName={selectedCategory.name}
          awardName={award.name}
          nominationType={award.nomination?.type || 'free'}
          nominationFixedPrice={award.nomination?.fixedPrice}
          categoryPrice={selectedCategory.price}
        />
      )}
    </div>
  );
}
