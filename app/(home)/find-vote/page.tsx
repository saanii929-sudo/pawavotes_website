"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Users, Heart, ChevronLeft, X, Clipboard, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";
import AwardCountdown from "@/components/AwardCountdown";
import CompactCountdown from "@/components/CompactCountdown";
import PublicNav from "@/components/PublicNav";
import NominationModal from "@/components/NominationModal";
import VotingModal from "@/components/VotingModal";

interface Award {
  _id: string;
  name: string;
  code?: string;
  organizationName: string;
  status: string;
  categories: number;
  settings?: { showResults: boolean; allowPublicVoting: boolean };
  banner?: string;
  logo?: string;
  totalVotes?: number;
  startDate?: string;
  endDate?: string;
  votingStartDate?: string;
  votingEndDate?: string;
  votingStartTime?: string;
  votingEndTime?: string;
  nomination?: {
    enabled: boolean;
    type: 'free' | 'fixed' | 'category';
    fixedPrice?: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
  pricing?: {
    type: 'paid' | 'social';
    votingCost?: number;
    socialOptions?: {
      bulkVoting?: boolean;
    };
  };
  activeStage?: Stage; // Add active stage to award
}

interface Stage {
  _id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  stageType: 'nomination' | 'voting' | 'results';
  status: 'upcoming' | 'active' | 'completed';
  order: number;
  awardId: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  nomineeCount?: number;
  voteCount?: number;
}

interface Nominee {
  _id: string;
  name: string;
  nomineeCode?: string;
  categoryId: string;
  categoryName?: string;
  image?: string;
  bio?: string;
  voteCount?: number;
}

// Separate search input component to prevent focus loss
const SearchInput = React.memo(({ 
  value, 
  onChange, 
  onClear, 
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onClear: () => void; 
  placeholder: string;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  return (
    <div className="mb-4 sm:mb-6 relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10 text-sm sm:text-base"
        suppressHydrationWarning
      />
      {value ? (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      ) : (
        <Search
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={18}
        />
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

// Nominee search input component
const NomineeSearchInput = React.memo(({ 
  value, 
  onChange, 
  onClear 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onClear: () => void; 
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  return (
    <div className="mb-6 relative">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by nominee name or code..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
        suppressHydrationWarning
      />
      {value ? (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      ) : (
        <Search
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={20}
        />
      )}
    </div>
  );
});

NomineeSearchInput.displayName = 'NomineeSearchInput';

const PublicVotingPlatform = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentScreen, setCurrentScreen] = useState<
    "events" | "eventDetail" | "categoryNominees" | "results"
  >("events");
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [nominationModalOpen, setNominationModalOpen] = useState(false);
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState<Nominee | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [nomineeSearchQuery, setNomineeSearchQuery] = useState("");
  const [activeStage, setActiveStage] = useState<Stage | null>(null);

  const maxVotes = useMemo(() => 
    Math.max(...nominees.map((n) => n.voteCount || 0), 1),
    [nominees]
  );

  // Check if nominations are open
  const isNominationOpen = () => {
    if (!selectedAward?.nomination?.enabled) return false;

    const now = new Date();
    
    if (selectedAward.nomination.startDate && selectedAward.nomination.endDate) {
      const startDate = new Date(selectedAward.nomination.startDate);
      const endDate = new Date(selectedAward.nomination.endDate);
      
      // Add time if available
      if (selectedAward.nomination.startTime) {
        const [hours, minutes] = selectedAward.nomination.startTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      if (selectedAward.nomination.endTime) {
        const [hours, minutes] = selectedAward.nomination.endTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      return now >= startDate && now <= endDate;
    }
    
    return false;
  };

  // Check if voting is open
  const isVotingOpen = () => {
    if (!selectedAward?.settings?.allowPublicVoting) return false;

    const now = new Date();
    
    // If award has an active stage, use stage datetime
    if (activeStage) {
      const stageStart = new Date(activeStage.startDate);
      const stageEnd = new Date(activeStage.endDate);
      
      // Add time if available
      if (activeStage.startTime) {
        const [hours, minutes] = activeStage.startTime.split(':');
        stageStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      if (activeStage.endTime) {
        const [hours, minutes] = activeStage.endTime.split(':');
        stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      return now >= stageStart && now <= stageEnd;
    }
    
    // Fallback to award's voting period if no active stage
    if (selectedAward.votingStartDate && selectedAward.votingEndDate) {
      const startDate = new Date(selectedAward.votingStartDate);
      const endDate = new Date(selectedAward.votingEndDate);
      
      // Add time if available
      if (selectedAward.votingStartTime) {
        const [hours, minutes] = selectedAward.votingStartTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      if (selectedAward.votingEndTime) {
        const [hours, minutes] = selectedAward.votingEndTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      return now >= startDate && now <= endDate;
    }
    
    return false;
  };

  // Check if award is closed (stage ended or voting period ended)
  const isAwardClosed = () => {
    if (!selectedAward) return false;

    const now = new Date();
    
    // If award has an active stage, check if stage has ended
    if (activeStage) {
      const stageEnd = new Date(activeStage.endDate);
      
      if (activeStage.endTime) {
        const [hours, minutes] = activeStage.endTime.split(':');
        stageEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      // If stage has ended, award is closed
      if (now > stageEnd) {
        return true;
      }
    }
    
    // Check if voting period has ended
    if (selectedAward.votingEndDate) {
      const endDate = new Date(selectedAward.votingEndDate);
      
      if (selectedAward.votingEndTime) {
        const [hours, minutes] = selectedAward.votingEndTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      return now > endDate;
    }
    
    return false;
  };

  const handleNomineeClick = (nominee: Nominee) => {
    if (isAwardClosed()) {
      toast.error('This award is closed. Voting has ended.');
      return;
    }
    
    if (isVotingOpen()) {
      setSelectedNominee(nominee);
      setVotingModalOpen(true);
    } else {
      toast.error("Voting is not currently open for this award");
    }
  };

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const url = search 
        ? `/api/public/awards?search=${encodeURIComponent(search)}`
        : '/api/public/awards';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        // Fetch active stages for all awards
        const awardsWithStages = await Promise.all(
          data.awards.map(async (award: Award) => {
            try {
              const stagesResponse = await fetch(`/api/stages?awardId=${award._id}`);
              const stagesData = await stagesResponse.json();
              
              if (stagesData.success && stagesData.data) {
                const activeStage = stagesData.data.find((stage: Stage) => stage.status === 'active');
                return { ...award, activeStage: activeStage || undefined };
              }
            } catch (error) {
              console.error(`Error fetching stages for award ${award._id}:`, error);
            }
            return award;
          })
        );
        
        setAwards(awardsWithStages);
      } else {
        toast.error('Failed to fetch awards');
      }
    } catch (error) {
      console.error('Error fetching awards:', error);
      toast.error('Failed to fetch awards');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search for awards
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchAwards(searchQuery);
      } else {
        fetchAwards();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, fetchAwards]);

  const fetchCategories = useCallback(async (awardId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/categories?awardId=${awardId}`);
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.categories);
      } else {
        toast.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveStage = useCallback(async (awardId: string) => {
    try {
      console.log('Fetching active stage for award:', awardId);
      const response = await fetch(`/api/stages?awardId=${awardId}`);
      const data = await response.json();
      
      console.log('Stages API response:', data);
      
      if (data.success && data.data) {
        // Find the active stage
        const active = data.data.find((stage: Stage) => stage.status === 'active');
        console.log('Active stage found:', active);
        setActiveStage(active || null);
      } else {
        console.log('No stages data in response');
        setActiveStage(null);
      }
    } catch (error) {
      console.error('Error fetching active stage:', error);
      // Don't show error toast, just fall back to award datetime
      setActiveStage(null);
    }
  }, []);

  const fetchNominees = useCallback(async (categoryId: string) => {
    try {
      setLoading(true);
      
      console.log('Fetching nominees for category:', categoryId);
      console.log('Active stage:', activeStage);
      
      // If there's an active stage, fetch contestants for that stage and category
      if (activeStage) {
        console.log('Fetching contestants for stage:', activeStage._id);
        const response = await fetch(`/api/stages/${activeStage._id}/contestants?categoryId=${categoryId}`);
        const data = await response.json();
        
        console.log('Contestants API response:', data);
        
        if (data.success && data.data && data.data.length > 0) {
          console.log('Found contestants:', data.data.length);
          // Get the nominee IDs from contestants
          const nomineeIds = data.data.map((contestant: any) => contestant.nomineeId);
          console.log('Contestant nominee IDs:', nomineeIds);
          
          // Fetch full nominee data with vote counts
          const nomineesResponse = await fetch(`/api/public/nominees?categoryId=${categoryId}`);
          const nomineesData = await nomineesResponse.json();
          
          if (nomineesData.success) {
            // Filter to only show nominees that are contestants in this stage
            const stageNominees = nomineesData.nominees.filter((nominee: any) => 
              nomineeIds.includes(nominee._id.toString())
            );
            console.log('Filtered stage nominees:', stageNominees.length);
            setNominees(stageNominees);
          } else {
            // Fallback to contestant data without vote counts
            const stageNominees = data.data.map((contestant: any) => ({
              _id: contestant.nomineeId,
              name: contestant.nomineeName,
              categoryId: contestant.categoryId,
              categoryName: contestant.categoryName,
              image: contestant.nomineeImage,
              voteCount: 0,
            }));
            console.log('Using contestant data as fallback:', stageNominees.length);
            setNominees(stageNominees);
          }
          setLoading(false);
          return;
        } else {
          console.log('No contestants found for this stage, showing all nominees');
        }
        // If no contestants found for this stage, fall through to show all nominees
      }
      
      // Fallback: fetch all nominees for the category (for awards without stages or stages without contestants)
      console.log('Fetching all nominees (no active stage or no contestants)');
      const response = await fetch(`/api/public/nominees?categoryId=${categoryId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('All nominees fetched:', data.nominees.length);
        setNominees(data.nominees);
      } else {
        toast.error('Failed to fetch nominees');
      }
    } catch (error) {
      console.error('Error fetching nominees:', error);
      toast.error('Failed to fetch nominees');
    } finally {
      setLoading(false);
    }
  }, [activeStage]);
  
  const handleClearAwardSearch = useCallback(() => {
    setSearchQuery("");
    fetchAwards(); // Fetch all awards when clearing search
  }, [fetchAwards]);

  const handleClearCategorySearch = useCallback(() => {
    setCategorySearchQuery("");
  }, []);

  const handleClearNomineeSearch = useCallback(() => {
    setNomineeSearchQuery("");
  }, []);

  // Filter categories based on search
  const filteredCategories = useMemo(() => 
    categories.filter(category =>
      category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    ),
    [categories, categorySearchQuery]
  );

  // Filter nominees based on search (by name or nominee code)
  const filteredNominees = useMemo(() => 
    nominees.filter(nominee =>
      nominee.name.toLowerCase().includes(nomineeSearchQuery.toLowerCase()) ||
      (nominee.nomineeCode && nominee.nomineeCode.toLowerCase().includes(nomineeSearchQuery.toLowerCase()))
    ),
    [nominees, nomineeSearchQuery]
  );

  const EventCard = ({
    award,
    onClick,
  }: {
    award: Award;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {award.banner ? (
        <div className="h-48 relative">
          <Image
            src={award.banner}
            alt={award.name}
            fill
            className="object-cover"
          />
          <div className="absolute top-4 right-4">
            <CompactCountdown
              votingStartDate={award.votingStartDate}
              votingEndDate={award.votingEndDate}
              votingStartTime={award.votingStartTime}
              votingEndTime={award.votingEndTime}
              stageStartDate={award.activeStage?.startDate}
              stageEndDate={award.activeStage?.endDate}
              stageStartTime={award.activeStage?.startTime}
              stageEndTime={award.activeStage?.endTime}
            />
          </div>
        </div>
      ) : (
        <div className="h-48 bg-linear-to-r from-green-900 to-green-700 flex items-center justify-center relative">
          <div className="text-white text-center p-6">
            <div className="text-2xl font-bold">{award.name}</div>
          </div>
          <div className="absolute top-4 right-4">
            <CompactCountdown
              votingStartDate={award.votingStartDate}
              votingEndDate={award.votingEndDate}
              votingStartTime={award.votingStartTime}
              votingEndTime={award.votingEndTime}
              stageStartDate={award.activeStage?.startDate}
              stageEndDate={award.activeStage?.endDate}
              stageStartTime={award.activeStage?.startTime}
              stageEndTime={award.activeStage?.endTime}
            />
          </div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <p className="text-xs text-green-600 font-medium flex-1">
            {award.organizationName}
          </p>
          {award.code && (
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
              {award.code}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-3 truncate">{award.name}</h3>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar size={14} />
            <span>{award.votingStartDate ? new Date(award.votingStartDate).toLocaleDateString() : 'TBA'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Helper: determine award status badge
  const getAwardStatusBadge = () => {
    if (isAwardClosed()) {
      return { text: "Voting Has Ended", className: "bg-red-500 text-white" };
    }
    if (isVotingOpen()) {
      return { text: "Active", className: "bg-green-500 text-white" };
    }
    return { text: "Voting Has Not Started", className: "bg-orange-400 text-white" };
  };

  // View 3: Event Detail
  const EventDetailView = () => {
    const badge = getAwardStatusBadge();
    const votingOpen = isVotingOpen();
    const awardClosed = isAwardClosed();
    const dateLabel = selectedAward?.votingStartDate
      ? new Date(selectedAward.votingStartDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "TBA";

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <button
            onClick={() => { setCurrentScreen("events"); setCategorySearchQuery(""); }}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-5 text-sm"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          {/* Award Header: Info left + Banner right */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex-1">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium mb-4 ${badge.className}`}>
                {badge.text}
              </span>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
                {selectedAward?.organizationName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {selectedAward?.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{dateLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>{selectedAward?.totalVotes || 0}+ Votes</span>
                </div>
              </div>
              {(awardClosed || votingOpen) && selectedAward?.settings?.showResults && (
                <button
                  onClick={() => router.push(`/leaderboard?awardId=${selectedAward._id}`)}
                  className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium transition-colors"
                >
                  View Result
                </button>
              )}
            </div>

            {/* Banner Image */}
            <div className="w-full lg:w-64 xl:w-72 shrink-0">
              {selectedAward?.banner ? (
                <div className="rounded-xl overflow-hidden h-52 relative">
                  <Image src={selectedAward.banner} alt={selectedAward.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="bg-linear-to-r from-green-900 to-green-700 rounded-xl h-52 flex items-center justify-center">
                  <div className="text-white text-center font-bold text-xl p-4">{selectedAward?.name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Category heading + Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-green-600 uppercase tracking-wide">Categories</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by category..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full sm:w-60 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm pr-8 bg-white"
                suppressHydrationWarning
              />
              {categorySearchQuery ? (
                <button onClick={handleClearCategorySearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              ) : (
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              )}
            </div>
          </div>

          {/* Categories Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {categorySearchQuery ? "No categories found matching your search" : "No categories found"}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category._id}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentScreen("categoryNominees");
                    setNomineeSearchQuery("");
                    fetchNominees(category._id);
                  }}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  {/* Card image — use award banner or gradient fallback */}
                  <div className="h-44 relative overflow-hidden">
                    {selectedAward?.banner ? (
                      <Image
                        src={selectedAward.banner}
                        alt={category.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-linear-to-br from-green-900 to-green-700" />
                    )}
                    {/* Dark overlay for readability */}
                    <div className="absolute inset-0 bg-black/20" />
                    {/* Price badge */}
                    {category.price && (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                        <div className="text-sm font-bold text-gray-900 leading-none">{category.price}</div>
                        <div className="text-[10px] text-gray-500">GHC</div>
                     
                      </div>
                    )}
                  </div>

                  {/* Card footer */}
                  <div className="py-6 px-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-xs font-semibold text-gray-800 leading-tight uppercase line-clamp-2 flex-1">
                        {category.name}
                      </h3>
                      <div className="shrink-0 w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={11} />
                      <span>{category.nomineeCount || 0} Nominees</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const CategoryNomineesView = () => {
    const badge = getAwardStatusBadge();
    const votingOpen = isVotingOpen();
    const awardClosed = isAwardClosed();
    const dateLabel = selectedAward?.votingStartDate
      ? new Date(selectedAward.votingStartDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "TBA";

    const handleShare = (e: React.MouseEvent, nominee: Nominee) => {
      e.stopPropagation();
      if (navigator.share) {
        navigator.share({ title: nominee.name, text: `Vote for ${nominee.name} - Code: ${nominee.nomineeCode || ""}` });
      } else {
        navigator.clipboard?.writeText(nominee.nomineeCode || nominee.name);
        toast.success("Copied to clipboard!");
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <button
            onClick={() => { setCurrentScreen("eventDetail"); setNomineeSearchQuery(""); }}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-5 text-sm"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          {/* Award Header: Info left + Banner right */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex-1">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium mb-4 ${badge.className}`}>
                {badge.text}
              </span>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
                {selectedAward?.organizationName}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {selectedAward?.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{dateLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>{selectedAward?.totalVotes || 0}+ Votes</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(awardClosed || votingOpen) && selectedAward?.settings?.showResults && (
                  <button
                    onClick={() => router.push(`/leaderboard?awardId=${selectedAward._id}`)}
                    className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium transition-colors"
                  >
                    View Result
                  </button>
                )}
                {isNominationOpen() && (
                  <button
                    onClick={() => setNominationModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-medium transition-colors"
                  >
                    <Users size={14} />
                    Nominate Yourself
                  </button>
                )}
              </div>
            </div>

            {/* Banner Image */}
            <div className="w-full lg:w-64 xl:w-72 shrink-0">
              {selectedAward?.banner ? (
                <div className="rounded-xl overflow-hidden h-52 relative">
                  <Image src={selectedAward.banner} alt={selectedAward.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="bg-linear-to-r from-green-900 to-green-700 rounded-xl h-52 flex items-center justify-center">
                  <div className="text-white text-center font-bold text-xl p-4">{selectedAward?.name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Category heading + Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-medium text-green-600 uppercase tracking-wide">
              {selectedCategory?.name}
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by nominees...."
                value={nomineeSearchQuery}
                onChange={(e) => setNomineeSearchQuery(e.target.value)}
                className="w-full sm:w-60 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm pr-8 bg-white"
                suppressHydrationWarning
              />
              {nomineeSearchQuery ? (
                <button onClick={handleClearNomineeSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              ) : (
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              )}
            </div>
          </div>

          {/* Countdown when voting is active */}
          {votingOpen && (
            <div className="mb-6">
              <p className="text-sm font-bold mb-6 text-gray-600">Voting ends in</p>
              <AwardCountdown
                votingStartDate={selectedAward?.votingStartDate}
                votingEndDate={selectedAward?.votingEndDate}
                votingStartTime={selectedAward?.votingStartTime}
                votingEndTime={selectedAward?.votingEndTime}
                stageStartDate={activeStage?.startDate}
                stageEndDate={activeStage?.endDate}
                stageStartTime={activeStage?.startTime}
                stageEndTime={activeStage?.endTime}
              />
            </div>
          )}

          {/* Nominees Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredNominees.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {nomineeSearchQuery ? "No nominees found matching your search" : "No nominees found"}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-16">
              {filteredNominees.map((nominee) => (
                <div
                  key={nominee._id}
                  onClick={() => handleNomineeClick(nominee)}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
                >
                  {/* Image — portrait ratio, face-optimized */}
                  <div className="relative aspect-square overflow-hidden bg-linear-to-br from-gray-100 to-gray-200">
                    {nominee.image ? (
                      nominee.image.startsWith("data:") ? (
                        <img
                          src={nominee.image}
                          alt={nominee.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <Image
                          src={nominee.image}
                          alt={nominee.name}
                          fill
                          className="object-cover object-top"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-end justify-end pb-3">
                        <svg viewBox="0 0 100 120" className="w-full h-full absolute inset-0 text-gray-300" fill="currentColor">
                          <circle cx="50" cy="38" r="22" />
                          <path d="M10 110 Q10 75 50 75 Q90 75 90 110Z" />
                        </svg>
                      </div>
                    )}
                    {/* Gradient fade at bottom for text legibility */}
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-linear-to-t from-black/40 to-transparent pointer-events-none" />
                    {/* Hover vote overlay */}
                    {votingOpen && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 shadow-lg">
                          <Heart size={14} />
                          Vote Now
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3 space-y-2">
                    {/* Category name + Trophy icon on same row */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] text-gray-400 uppercase font-medium leading-tight flex-1">
                        {nominee.categoryName || selectedCategory?.name}
                      </p>
                      <div className="shrink-0 w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                        </svg>
                      </div>
                    </div>

                    {/* Nominee name */}
                    <h3 className="font-bold text-sm text-gray-900 leading-snug">
                      {nominee.name}
                    </h3>

                    {/* Code Button + Share */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNomineeClick(nominee); }}
                        className="flex-1 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-2.5 py-3 rounded-lg text-xs font-semibold transition-colors min-w-0"
                      >
                        <Clipboard size={12} className="shrink-0" />
                        <span className="truncate">Nominee Code: {nominee.nomineeCode || "N/A"}</span>
                      </button>
                      <button
                        onClick={(e) => handleShare(e, nominee)}
                        className="shrink-0 w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:text-green-600 hover:border-green-300 transition-colors bg-white"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nomination Modal */}
        {selectedAward && selectedCategory && (
          <NominationModal
            isOpen={nominationModalOpen}
            onClose={() => setNominationModalOpen(false)}
            awardId={selectedAward._id}
            categoryId={selectedCategory._id}
            categoryName={selectedCategory.name}
            awardName={selectedAward.name}
            nominationType={selectedAward.nomination?.type || "free"}
            nominationFixedPrice={selectedAward.nomination?.fixedPrice}
            categoryPrice={selectedCategory.price}
          />
        )}

        {/* Voting Modal */}
        {selectedAward && selectedCategory && selectedNominee && (
          <VotingModal
            isOpen={votingModalOpen}
            onClose={() => { setVotingModalOpen(false); setSelectedNominee(null); }}
            nominee={{
              _id: selectedNominee._id,
              name: selectedNominee.name,
              image: selectedNominee.image,
              categoryName: selectedCategory.name,
            }}
            awardId={selectedAward._id}
            categoryId={selectedCategory._id}
            votingCost={selectedAward.pricing?.votingCost || 0.5}
            allowBulkVoting={selectedAward.pricing?.socialOptions?.bulkVoting || false}
          />
        )}
      </div>
    );
  };

  const ResultsView = () => (
    <div className="min-h-screen bg-gray-50  overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <PublicNav />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <button
          onClick={() => {
            setCurrentScreen("categoryNominees");
            setNomineeSearchQuery("");
          }}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <p className="text-[10px] sm:text-xs text-green-600 font-medium mb-2">
              {selectedAward?.organizationName} • {selectedAward?.name}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {selectedCategory?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-6 sm:mb-8">
              <div className="flex items-center gap-1">
                <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
                <span>{selectedAward?.votingStartDate ? new Date(selectedAward.votingStartDate).toLocaleDateString() : 'TBA'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={12} className="sm:w-3.5 sm:h-3.5" />
                <span>{selectedCategory?.voteCount || 0}+ Votes</span>
              </div>
            </div>

            <h2 className="text-lg font-bold text-green-600 mb-6">RESULTS</h2>

            {/* Results List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredNominees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No results available
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNominees.map((nominee, index) => (
                  <div 
                    key={nominee._id} 
                    onClick={() => handleNomineeClick(nominee)}
                    className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                  >
                    <div className="text-xl font-bold text-gray-400 w-8">
                      {index + 1}.
                    </div>
                    {nominee.image ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 relative">
                        {nominee.image.startsWith('data:') ? (
                          <img
                            src={nominee.image}
                            alt={nominee.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image
                            src={nominee.image}
                            alt={nominee.name}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden shrink-0">
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="text-gray-500" size={24} />
                        </div>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{nominee.name}</p>
                      <div className="relative mt-1">
                        <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full transition-all"
                            style={{
                              width: `${((nominee.voteCount || 0) / maxVotes) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-600 min-w-20 text-right">
                      {(nominee.voteCount || 0).toLocaleString()} Votes
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Event Image */}
          <div className="lg:col-span-1">
            {selectedAward?.banner ? (
              <div className="rounded-lg overflow-hidden h-48 sticky top-8">
                <Image
                  src={selectedAward.banner}
                  alt={selectedAward.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-linear-to-r from-green-900 to-green-700 rounded-lg p-6 h-48 flex items-center justify-center sticky top-8">
                <div className="text-white text-center">
                  <div className="text-2xl font-bold">{selectedAward?.name}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {currentScreen === "events" && (
        <div key="events-screen">
          {/* Hero Section */}
          <div className="bg-white py-8 sm:py-12 md:py-16">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-3 sm:mb-4">
                Find an Ongoing Vote
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                Enter an award or nominee code, or explore live voting events
                below.
              </p>
              <div className="max-w-2xl mx-auto relative">
                <input
                  type="text"
                  placeholder="Search by award name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-12 text-sm sm:text-base"
                />
                {searchQuery ? (
                  <button
                    onClick={handleClearAwardSearch}
                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                ) : (
                  <Search
                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {searchQuery ? 'Search Results' : 'Ongoing Events'}
              </h2>
              {searchQuery && !loading && (
                <p className="text-sm text-gray-600">
                  {awards.length} {awards.length === 1 ? 'result' : 'results'} found
                </p>
              )}
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="text-gray-600 mt-4">Searching...</p>
              </div>
            ) : awards.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? `No awards found matching "${searchQuery}"` : 'No ongoing events found'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {awards.map((award) => (
                  <EventCard
                    key={award._id}
                    award={award}
                    onClick={() => {
                      setSelectedAward(award);
                      setCurrentScreen("eventDetail");
                      setCategorySearchQuery("");
                      fetchCategories(award._id);
                      // Set active stage from award if available, otherwise fetch it
                      if (award.activeStage) {
                        setActiveStage(award.activeStage);
                      } else {
                        fetchActiveStage(award._id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {currentScreen === "eventDetail" && EventDetailView()}
      {currentScreen === "categoryNominees" && CategoryNomineesView()}
      {currentScreen === "results" && ResultsView()}
    </div>
  );
};

export default PublicVotingPlatform;
