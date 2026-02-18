"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Calendar, Users, Heart, ChevronLeft, X } from "lucide-react";
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
  categoryId: string;
  categoryName?: string;
  image?: string;
  bio?: string;
  voteCount?: number;
}

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

  const maxVotes = Math.max(...nominees.map((n) => n.voteCount || 0), 1);

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

  const handleNomineeClick = (nominee: Nominee) => {
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
  }, [searchQuery]);

  const fetchAwards = async (search?: string) => {
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
  };

  const fetchCategories = async (awardId: string) => {
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
  };

  const fetchActiveStage = async (awardId: string) => {
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
  };

  const fetchNominees = async (categoryId: string) => {
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
  };

  const handleSearchAwards = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchAwards(searchQuery);
    } else {
      fetchAwards(); // Fetch all if search is empty
    }
  };

  const handleClearAwardSearch = () => {
    setSearchQuery("");
    fetchAwards(); // Fetch all awards when clearing search
  };

  const handleClearCategorySearch = () => {
    setCategorySearchQuery("");
  };

  const handleClearNomineeSearch = () => {
    setNomineeSearchQuery("");
  };

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  // Filter nominees based on search
  const filteredNominees = nominees.filter(nominee =>
    nominee.name.toLowerCase().includes(nomineeSearchQuery.toLowerCase())
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
          <div className="flex items-center gap-1">
            <Users size={14} className="text-green-600" />
            <span className="text-green-600">{award.totalVotes || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // View 3: Event Detail
  const EventDetailView = () => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            setCurrentScreen("events");
            setCategorySearchQuery("");
          }}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>

        {/* Countdown Component */}
        <div className="mb-6 sm:mb-8">
          <AwardCountdown
            startDate={selectedAward?.startDate}
            endDate={selectedAward?.endDate}
            votingStartDate={selectedAward?.votingStartDate}
            votingEndDate={selectedAward?.votingEndDate}
            votingStartTime={selectedAward?.votingStartTime}
            votingEndTime={selectedAward?.votingEndTime}
            status={selectedAward?.status}
            stageStartDate={activeStage?.startDate}
            stageEndDate={activeStage?.endDate}
            stageStartTime={activeStage?.startTime}
            stageEndTime={activeStage?.endTime}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <p className="text-xs sm:text-sm text-green-600 font-medium mb-2">
              {selectedAward?.organizationName}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              {selectedAward?.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-6 sm:mb-8">
              <div className="flex items-center gap-1">
                <Calendar size={14} className="sm:w-4 sm:h-4" />
                <span>{selectedAward?.votingStartDate ? new Date(selectedAward.votingStartDate).toLocaleDateString() : 'TBA'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} className="sm:w-4 sm:h-4" />
                <span>{selectedAward?.totalVotes || 0}+ Votes</span>
              </div>
            </div>

            {/* View Results Button */}
            {selectedAward?.settings?.showResults && (
              <div className="mb-6">
                <button
                  onClick={() => router.push(`/leaderboard?awardId=${selectedAward._id}`)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base transition-colors flex items-center gap-2 font-medium"
                >
                  <ChevronLeft size={18} className="rotate-180" />
                  View Results
                </button>
              </div>
            )}

            {/* Search Categories */}
            <div className="mb-4 sm:mb-6 relative">
              <input
                type="text"
                placeholder="Search by category..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10 text-sm sm:text-base"
              />
              {categorySearchQuery ? (
                <button
                  onClick={handleClearCategorySearch}
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

            {/* Categories Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {categorySearchQuery ? 'No categories found matching your search' : 'No categories found'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCategories.map((category) => (
                  <div
                    key={category._id}
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentScreen("categoryNominees");
                      setNomineeSearchQuery("");
                      fetchNominees(category._id);
                    }}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="h-40 bg-linear-to-r from-green-900 to-green-700 flex items-center justify-center relative">
                      <div className="text-white text-center p-4">
                        <div className="text-xl font-bold">{category.name}</div>
                      </div>
                      {category.price && (
                        <div className="absolute top-4 right-4 bg-white rounded-lg px-3 py-2">
                          <div className="text-xl font-bold text-gray-900">{category.price}</div>
                          <div className="text-xs text-gray-600">GHC</div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Users size={14} />
                        <span>{category.nomineeCount || 0} Nominees</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Event Image */}
          <div className="lg:col-span-1">
            {selectedAward?.banner ? (
              <div className="rounded-lg overflow-hidden h-64 sticky top-8">
                <Image
                  src={selectedAward.banner}
                  alt={selectedAward.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-linear-to-r from-green-900 to-green-700 rounded-lg p-8 h-64 flex items-center justify-center sticky top-8">
                <div className="text-white text-center">
                  <div className="text-3xl font-bold mb-2">{selectedAward?.name}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const CategoryNomineesView = ({
    status = "open",
  }: {
    status?: "open" | "voting" | "closed";
  }) => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button
          onClick={() => {
            setCurrentScreen("eventDetail");
            setNomineeSearchQuery("");
          }}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>

        {/* Countdown Component */}
        <div className="mb-6 sm:mb-8">
          <AwardCountdown
            startDate={selectedAward?.startDate}
            endDate={selectedAward?.endDate}
            votingStartDate={selectedAward?.votingStartDate}
            votingEndDate={selectedAward?.votingEndDate}
            votingStartTime={selectedAward?.votingStartTime}
            votingEndTime={selectedAward?.votingEndTime}
            status={selectedAward?.status}
            stageStartDate={activeStage?.startDate}
            stageEndDate={activeStage?.endDate}
            stageStartTime={activeStage?.startTime}
            stageEndTime={activeStage?.endTime}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="mb-4">
              {status === "voting" && (
                <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Voting Has Ended
                </span>
              )}
              {status === "closed" && (
                <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  ACTIVE
                </span>
              )}
            </div>

            <p className="text-xs text-green-600 font-medium mb-2">
              {selectedAward?.organizationName} • {selectedAward?.name}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedAward?.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{selectedAward?.votingStartDate ? new Date(selectedAward.votingStartDate).toLocaleDateString() : 'TBA'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{selectedAward?.totalVotes || 0}+ Votes</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
              {selectedAward?.settings?.showResults && (
                <button
                  onClick={() => router.push(`/leaderboard?awardId=${selectedAward._id}`)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={16} className="rotate-180" />
                  View Results
                </button>
              )}
              
              {isNominationOpen() && (
                <button
                  onClick={() => setNominationModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Users size={16} />
                  Nominate Yourself
                </button>
              )}
            </div>

            <h2 className="text-lg font-bold text-green-600 mb-6">
              {selectedCategory?.name}
            </h2>

            {/* Search */}
            <div className="mb-6 relative">
              <input
                type="text"
                placeholder="Search by nominee..."
                value={nomineeSearchQuery}
                onChange={(e) => setNomineeSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
              />
              {nomineeSearchQuery ? (
                <button
                  onClick={handleClearNomineeSearch}
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

            {/* Nominees Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredNominees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {nomineeSearchQuery ? 'No nominees found matching your search' : 'No nominees found'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredNominees.map((nominee) => (
                  <div
                    key={nominee._id}
                    onClick={() => handleNomineeClick(nominee)}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    {nominee.image ? (
                      <div className="h-40 relative">
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
                        {isVotingOpen() && (
                          <div className="absolute inset-0 bg-black/20 bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                              <Heart size={16} />
                              Vote Now
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-40 bg-linear-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                          <Users className="text-gray-400" size={32} />
                        </div>
                        {isVotingOpen() && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                              <Heart size={16} />
                              Vote Now
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs text-gray-500 mb-1">
                        {nominee.categoryName}
                      </p>
                      <h3 className="font-medium text-sm text-gray-900 mb-2 truncate">
                        {nominee.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Users size={12} />
                          <span>{(nominee.voteCount || 0).toLocaleString()} Votes</span>
                        </div>
                        {isVotingOpen() && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNomineeClick(nominee);
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Heart size={16} />
                          </button>
                        )}
                      </div>
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

      {/* Nomination Modal */}
      {selectedAward && selectedCategory && (
        <NominationModal
          isOpen={nominationModalOpen}
          onClose={() => setNominationModalOpen(false)}
          awardId={selectedAward._id}
          categoryId={selectedCategory._id}
          categoryName={selectedCategory.name}
          awardName={selectedAward.name}
          nominationType={selectedAward.nomination?.type || 'free'}
          nominationFixedPrice={selectedAward.nomination?.fixedPrice}
          categoryPrice={selectedCategory.price}
        />
      )}

      {/* Voting Modal */}
      {selectedAward && selectedCategory && selectedNominee && (
        <VotingModal
          isOpen={votingModalOpen}
          onClose={() => {
            setVotingModalOpen(false);
            setSelectedNominee(null);
          }}
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
        <>
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
        </>
      )}
      {currentScreen === "eventDetail" && <EventDetailView />}
      {currentScreen === "categoryNominees" && <CategoryNomineesView />}
      {currentScreen === "results" && <ResultsView />}
    </div>
  );
};

export default PublicVotingPlatform;
