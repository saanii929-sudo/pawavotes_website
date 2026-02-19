"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Vote,
  CheckCircle,
  Users,
  TrendingUp,
  ArrowLeft,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
interface Category {
  _id: string;
  name: string;
  description?: string;
  maxSelections: number;
}

interface Candidate {
  _id: string;
  name: string;
  image?: string;
  bio?: string;
  manifesto?: string;
  voteCount: number;
  categoryId: {
    _id: string;
    name: string;
  };
  ballotNumber?: number;
}

function VotingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [voterData, setVoterData] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<{
    [categoryId: string]: string | null;
  }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const storedData = localStorage.getItem("voterData");

    if (!token || !storedData) {
      router.push("/election/login");
      return;
    }

    const data = JSON.parse(storedData);

    if (data.hasVoted) {
      toast.error("You have already voted!");
      router.push(`/election?token=${token}`);
      return;
    }

    setVoterData(data);
    fetchElectionData(data.electionId);
  }, [token, router]);

  const fetchElectionData = async (electionId: string) => {
    try {
      const categoriesRes = await fetch(
        `/api/elections/categories?electionId=${electionId}`,
      );
      const categoriesData = await categoriesRes.json();
      const candidatesRes = await fetch(
        `/api/elections/candidates?electionId=${electionId}`,
      );
      const candidatesData = await candidatesRes.json();

      if (categoriesData.success && candidatesData.success) {
        setCategories(categoriesData.data);
        setCandidates(candidatesData.data);
      }
    } catch (error) {
      console.error("Failed to fetch election data:", error);
      toast.error("Failed to load election data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (categoryId: string, candidateId: string) => {
    setSelectedVotes((prev) => ({
      ...prev,
      [categoryId]: candidateId,
    }));
  };

  const handleSkipCandidate = (categoryId: string) => {
    setSelectedVotes((prev) => ({
      ...prev,
      [categoryId]: null,
    }));
    toast.success("Position skipped");
  };

  const handleNextStep = () => {
    if (currentStep < categories.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitVote();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const currentCategory = categories[currentStep];
    if (!currentCategory) return false;
    return currentCategory._id in selectedVotes;
  };

  const handleSubmitVote = async () => {
    const missingCategories = categories.filter(
      (cat) => !(cat._id in selectedVotes),
    );

    if (missingCategories.length > 0) {
      toast.error(
        `Please complete all positions: ${missingCategories.map((c) => c.name).join(", ")}`,
      );
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);

    try {
      const votes = Object.entries(selectedVotes)
        .filter(([_, candidateId]) => candidateId !== null)
        .map(([categoryId, candidateId]) => ({
          categoryId,
          candidateId: candidateId as string,
        }));

      const response = await fetch("/api/elections/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token?.toUpperCase(),
          votes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Vote submitted successfully! Logging out...");
        localStorage.removeItem("voterData");
        localStorage.removeItem("voterToken");
        setTimeout(() => {
          router.push("/election/login");
        }, 2000);
      } else {
        toast.error(data.error || "Failed to submit vote");
        setSubmitting(false);
        setShowConfirm(false);
      }
    } catch (error) {
      console.error("Submit vote error:", error);
      toast.error("Failed to submit vote");
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const getCandidatesByCategory = (categoryId: string) => {
    return candidates
      .filter((c) => c.categoryId._id === categoryId)
      .sort((a, b) => (a.ballotNumber || 0) - (b.ballotNumber || 0));
  };

  const getSelectedCandidate = (categoryId: string) => {
    const candidateId = selectedVotes[categoryId];
    return candidates.find((c) => c._id === candidateId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading ballot...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white sticky top-0 z-40 shadow-sm">
          <div className="max-w-8xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 flex-shrink-0"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Back</span>
              </button>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center min-w-0">
                <Vote className="text-green-600 flex-shrink-0" size={20} />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                    Cast Your Vote
                  </h1>
                  <p className="text-xs text-gray-500 truncate hidden sm:block">
                    {voterData?.election?.title}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[100px] sm:max-w-none">
                  {voterData?.name}
                </p>
                <p className="text-xs text-gray-500 font-mono hidden sm:block">{token}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Position {currentStep + 1} of {categories.length}
              </span>
              <span className="text-sm text-gray-500">
                {Object.values(selectedVotes).filter((v) => v !== null).length}{" "}
                voted
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / categories.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-900">
              <strong>Tip:</strong> You can only vote once for each position.
              Use the navigation buttons to move between positions.
            </p>
          </div>
          {categories[currentStep] &&
            (() => {
              const category = categories[currentStep];
              const categoryCandidates = getCandidatesByCategory(category._id);
              const selectedCandidate = getSelectedCandidate(category._id);
              const isSkipped = selectedVotes[category._id] === null;
              const showLiveResults =
                voterData?.election?.settings?.showLiveResults;

              return (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="bg-linear-to-r from-green-600 to-green-500 text-white p-6 rounded-t-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                        {currentStep + 1}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{category.name}</h2>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    {categoryCandidates.length === 0 ? (
                      <div className="text-center py-12">
                        <Users
                          className="mx-auto text-gray-400 mb-4"
                          size={48}
                        />
                        <p className="text-gray-500">
                          No candidates for this position
                        </p>
                      </div>
                    ) : categoryCandidates.length === 1 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {categoryCandidates.map((candidate) => {
                            const isSelected =
                              selectedVotes[category._id] === candidate._id;

                            return (
                              <React.Fragment key={candidate._id}>
                                <button
                                  onClick={() =>
                                    handleSelectCandidate(
                                      category._id,
                                      candidate._id,
                                    )
                                  }
                                  className={`group text-left p-6 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${
                                    isSelected
                                      ? "border-green-600 bg-gradient-to-br from-green-50 to-green-100 shadow-lg scale-[1.02]"
                                      : "border-gray-200 hover:border-green-400 hover:bg-gray-50 hover:shadow-md"
                                  }`}
                                >
                                  <div className={`absolute top-4 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center border-2 transition-all ${
                                    isSelected 
                                      ? "bg-green-600 border-green-700" 
                                      : "bg-white border-green-600"
                                  }`}>
                                    <span className={`text-base font-bold ${
                                      isSelected ? "text-white" : "text-green-600"
                                    }`}>{candidate.ballotNumber}</span>
                                  </div>

                                  <div className="flex flex-col items-center text-center gap-4 mb-4">
                                    {candidate.image ? (
                                      <img
                                        src={candidate.image}
                                        alt={candidate.name}
                                        className={`w-24 h-24 rounded-full object-cover border-4 transition-all ${
                                          isSelected 
                                            ? "border-green-600 shadow-xl" 
                                            : "border-gray-200 group-hover:border-green-400"
                                        }`}
                                      />
                                    ) : (
                                      <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${
                                        isSelected 
                                          ? "bg-green-600 border-green-700 shadow-xl" 
                                          : "bg-green-100 border-gray-200 group-hover:border-green-400"
                                      }`}>
                                        <Users
                                          className={isSelected ? "text-white" : "text-green-600"}
                                          size={36}
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-bold text-lg mb-2 ${
                                        isSelected ? "text-green-900" : "text-gray-900"
                                      }`}>
                                        {candidate.name}
                                      </h4>
                                      {showLiveResults && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-white px-3 py-1 rounded-full">
                                          <TrendingUp size={14} />
                                          <span className="font-semibold">
                                            {candidate.voteCount} votes
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {isSelected && (
                                    <div className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg font-semibold">
                                      <CheckCircle size={20} />
                                      <span>Selected</span>
                                    </div>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleSkipCandidate(category._id)}
                                  className={`group text-left p-6 rounded-2xl border-2 transition-all duration-200 flex items-center justify-center ${
                                    isSkipped
                                      ? "border-green-600 shadow-lg scale-[1.02]"
                                      : "border-gray-200 hover:border-green-600 hover:bg-gray-50 hover:shadow-md"
                                  }`}
                                >
                                  <div className="flex flex-col items-center gap-4">
                                    <div className={`w-30 h-30 rounded-full flex items-center justify-center border-4 transition-all ${
                                      isSkipped 
                                        ? " border-green-600 shadow-xl" 
                                        : "bg-gray-100 border-gray-300 group-hover:border-green-600"
                                    }`}>
                                    <h4 className={`font-bold text-6xl ${
                                      isSkipped ? "text-green-900" : "text-gray-400"
                                    }`}>
                                      NO
                                    </h4>
                                    </div>
                                    {isSkipped && (
                                      <div className="flex items-center justify-center gap-2 bg-green-500 text-white py-2 px-4 rounded-lg font-semibold">
                                        <CheckCircle size={20} />
                                        <span>Skipped</span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {categoryCandidates.map((candidate) => {
                            const isSelected =
                              selectedVotes[category._id] === candidate._id;

                            return (
                              <button
                                key={candidate._id}
                                onClick={() =>
                                  handleSelectCandidate(
                                    category._id,
                                    candidate._id,
                                  )
                                }
                                className={`group text-left p-6 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${
                                  isSelected
                                    ? "border-green-600 bg-gradient-to-br from-green-50 to-green-100 shadow-lg scale-[1.02]"
                                    : "border-gray-200 hover:border-green-400 hover:bg-gray-50 hover:shadow-md"
                                }`}
                              >
                                {/* Ballot Number Badge */}
                                <div className={`absolute top-4 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center border-2 transition-all ${
                                  isSelected 
                                    ? "bg-green-600 border-green-700" 
                                    : "bg-white border-green-600"
                                }`}>
                                  <span className={`text-base font-bold ${
                                    isSelected ? "text-white" : "text-green-600"
                                  }`}>{candidate.ballotNumber}</span>
                                </div>

                                <div className="flex flex-col items-center text-center gap-4 mb-4">
                                  {candidate.image ? (
                                    <img
                                      src={candidate.image}
                                      alt={candidate.name}
                                      className={`w-24 h-24 rounded-full object-cover border-4 transition-all ${
                                        isSelected 
                                          ? "border-green-600 shadow-xl" 
                                          : "border-gray-200 group-hover:border-green-400"
                                      }`}
                                    />
                                  ) : (
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all ${
                                      isSelected 
                                        ? "bg-green-600 border-green-700 shadow-xl" 
                                        : "bg-green-100 border-gray-200 group-hover:border-green-400"
                                    }`}>
                                      <Users
                                        className={isSelected ? "text-white" : "text-green-600"}
                                        size={36}
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`font-bold text-lg mb-2 ${
                                      isSelected ? "text-green-900" : "text-gray-900"
                                    }`}>
                                      {candidate.name}
                                    </h4>
                                    {showLiveResults && (
                                      <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-white px-3 py-1 rounded-full">
                                        <TrendingUp size={14} />
                                        <span className="font-semibold">
                                          {candidate.voteCount} votes
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <div className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg font-semibold">
                                    <CheckCircle size={20} />
                                    <span>Selected</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 rounded-b-xl">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <button
                        onClick={handlePreviousStep}
                        disabled={currentStep === 0}
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        <ChevronLeft size={20} />
                        <span>Previous</span>
                      </button>

                      <button
                        onClick={handleNextStep}
                        disabled={!canProceed()}
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        {currentStep === categories.length - 1 ? (
                          <>
                            <Vote size={20} />
                            <span>Review & Submit</span>
                          </>
                        ) : (
                          <>
                            <span>Next</span>
                            <ChevronRight size={20} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Vote className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Review Your Votes
              </h2>
              <p className="text-gray-600">
                Please review your selections before submitting. This action
                cannot be undone.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-semibold text-sm sm:text-base"
              >
                Go Back
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-semibold text-sm sm:text-base"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function VotingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <VotingPageContent />
    </Suspense>
  );
}
