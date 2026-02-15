"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vote, CheckCircle, Users, TrendingUp, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
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
}

function VotingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [voterData, setVoterData] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<{ [categoryId: string]: string | null }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const storedData = localStorage.getItem('voterData');
    
    if (!token || !storedData) {
      router.push('/election/login');
      return;
    }

    const data = JSON.parse(storedData);
    
    if (data.hasVoted) {
      toast.error('You have already voted!');
      router.push(`/election?token=${token}`);
      return;
    }

    setVoterData(data);
    fetchElectionData(data.electionId);
  }, [token, router]);

  const fetchElectionData = async (electionId: string) => {
    try {
      const categoriesRes = await fetch(`/api/elections/categories?electionId=${electionId}`);
      const categoriesData = await categoriesRes.json();
      const candidatesRes = await fetch(`/api/elections/candidates?electionId=${electionId}`);
      const candidatesData = await candidatesRes.json();

      if (categoriesData.success && candidatesData.success) {
        setCategories(categoriesData.data);
        setCandidates(candidatesData.data);
      }
    } catch (error) {
      console.error('Failed to fetch election data:', error);
      toast.error('Failed to load election data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCandidate = (categoryId: string, candidateId: string) => {
    setSelectedVotes(prev => ({
      ...prev,
      [categoryId]: candidateId,
    }));
  };

  const handleSkipCandidate = (categoryId: string) => {
    setSelectedVotes(prev => ({
      ...prev,
      [categoryId]: null,
    }));
  };

  const handleNextStep = () => {
    if (currentStep < categories.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, show review
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
    
    // Check if user has made a selection (including skip/null)
    return currentCategory._id in selectedVotes;
  };

  const handleSubmitVote = async () => {
    // Check if all positions have been addressed (voted or skipped)
    const missingCategories = categories.filter(cat => !(cat._id in selectedVotes));
    
    if (missingCategories.length > 0) {
      toast.error(`Please complete all positions: ${missingCategories.map(c => c.name).join(', ')}`);
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);

    try {
      // Filter out null votes (skipped positions)
      const votes = Object.entries(selectedVotes)
        .filter(([_, candidateId]) => candidateId !== null)
        .map(([categoryId, candidateId]) => ({
          categoryId,
          candidateId: candidateId as string,
        }));

      const response = await fetch('/api/elections/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token?.toUpperCase(),
          votes,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Vote submitted successfully!');
        const updatedVoterData = { ...voterData, hasVoted: true };
        localStorage.setItem('voterData', JSON.stringify(updatedVoterData));
        setTimeout(() => {
          router.push(`/election?token=${token}`);
        }, 2000);
      } else {
        toast.error(data.error || 'Failed to submit vote');
        setSubmitting(false);
        setShowConfirm(false);
      }
    } catch (error) {
      console.error('Submit vote error:', error);
      toast.error('Failed to submit vote');
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const getCandidatesByCategory = (categoryId: string) => {
    return candidates.filter(c => c.categoryId._id === categoryId);
  };

  const getSelectedCandidate = (categoryId: string) => {
    const candidateId = selectedVotes[categoryId];
    return candidates.find(c => c._id === candidateId);
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
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-3">
                <Vote className="text-green-600" size={24} />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Cast Your Vote</h1>
                  <p className="text-xs text-gray-500">{voterData?.election?.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{voterData?.name}</p>
                <p className="text-xs text-gray-500 font-mono">{token}</p>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Position {currentStep + 1} of {categories.length}
              </span>
              <span className="text-sm text-gray-500">
                {Object.values(selectedVotes).filter(v => v !== null).length} voted, {Object.values(selectedVotes).filter(v => v === null).length} skipped
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / categories.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-900">
              <strong>Tip:</strong> You can vote for a candidate or skip this position if you don't want to vote. Use the navigation buttons to move between positions.
            </p>
          </div>

          {/* Current Position */}
          {categories[currentStep] && (() => {
            const category = categories[currentStep];
            const categoryCandidates = getCandidatesByCategory(category._id);
            const selectedCandidate = getSelectedCandidate(category._id);
            const isSkipped = selectedVotes[category._id] === null;
            const showLiveResults = voterData?.election?.settings?.showLiveResults;

            return (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                {/* Position Header */}
                <div className="bg-linear-to-r from-green-600 to-green-500 text-white p-6 rounded-t-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
                      {currentStep + 1}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{category.name}</h2>
                      {category.description && (
                        <p className="text-green-100 text-sm mt-1">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    {selectedCandidate && (
                      <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                        <CheckCircle size={18} />
                        <span className="text-sm font-medium">Candidate Selected</span>
                      </div>
                    )}
                    {isSkipped && (
                      <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                        <span className="text-sm font-medium">Position Skipped</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidates */}
                <div className="p-6">
                  {categoryCandidates.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="mx-auto text-gray-400 mb-4" size={48} />
                      <p className="text-gray-500">No candidates for this position</p>
                    </div>
                  ) : categoryCandidates.length === 1 ? (
                    // Single candidate - special layout
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-900">
                          <strong>Note:</strong> There is only one candidate for this position. You can vote for them or skip this position.
                        </p>
                      </div>
                      
                      {categoryCandidates.map((candidate) => {
                        const isSelected = selectedVotes[category._id] === candidate._id;

                        return (
                          <div
                            key={candidate._id}
                            className={`p-6 rounded-xl border-2 transition ${
                              isSelected
                                ? 'border-green-600 bg-green-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-4 mb-4">
                              {candidate.image ? (
                                <img
                                  src={candidate.image}
                                  alt={candidate.name}
                                  className="w-24 h-24 rounded-full object-cover border-4 border-green-200"
                                />
                              ) : (
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-200">
                                  <Users className="text-green-600" size={40} />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{candidate.name}</h3>
                                {showLiveResults && (
                                  <div className="flex items-center gap-2 text-green-600 mb-2">
                                    <TrendingUp size={18} />
                                    <span className="font-semibold">{candidate.voteCount} votes</span>
                                  </div>
                                )}
                                {candidate.bio && (
                                  <p className="text-gray-600 mb-3">{candidate.bio}</p>
                                )}
                              </div>
                            </div>
                            {candidate.manifesto && (
                              <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">Manifesto</h4>
                                <p className="text-sm text-gray-600">{candidate.manifesto}</p>
                              </div>
                            )}
                            
                            <div className="mt-4 flex gap-3">
                              <button
                                onClick={() => handleSelectCandidate(category._id, candidate._id)}
                                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition ${
                                  isSelected
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {isSelected ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <CheckCircle size={20} />
                                    Selected
                                  </span>
                                ) : (
                                  'Vote for this Candidate'
                                )}
                              </button>
                              {!isSkipped && !isSelected && (
                                <button
                                  onClick={() => handleSkipCandidate(category._id)}
                                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                                >
                                  Skip Position
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Multiple candidates - grid layout
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryCandidates.map((candidate) => {
                          const isSelected = selectedVotes[category._id] === candidate._id;

                          return (
                            <button
                              key={candidate._id}
                              onClick={() => handleSelectCandidate(category._id, candidate._id)}
                              className={`text-left p-5 rounded-xl border-2 transition ${
                                isSelected
                                  ? 'border-green-600 bg-green-50 shadow-lg'
                                  : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                {candidate.image ? (
                                  <img
                                    src={candidate.image}
                                    alt={candidate.name}
                                    className="w-16 h-16 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <Users className="text-green-600" size={28} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-gray-900 mb-1">{candidate.name}</h4>
                                  {showLiveResults && (
                                    <div className="flex items-center gap-1 text-sm text-green-600">
                                      <TrendingUp size={14} />
                                      <span className="font-medium">{candidate.voteCount} votes</span>
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckCircle className="text-green-600 shrink-0" size={24} />
                                )}
                              </div>
                              {candidate.bio && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{candidate.bio}</p>
                              )}
                              {candidate.manifesto && (
                                <p className="text-xs text-gray-500 line-clamp-2">{candidate.manifesto}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Skip button for multiple candidates */}
                      {!isSkipped && !selectedCandidate && (
                        <button
                          onClick={() => handleSkipCandidate(category._id)}
                          className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                        >
                          Skip this Position
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePreviousStep}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={20} />
                      Previous
                    </button>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        {selectedCandidate ? (
                          <span className="text-green-600 font-semibold">✓ Voted for {selectedCandidate.name}</span>
                        ) : isSkipped ? (
                          <span className="text-gray-500 font-semibold">Position skipped</span>
                        ) : (
                          <span className="text-gray-400">No selection made</span>
                        )}
                      </p>
                    </div>

                    <button
                      onClick={handleNextStep}
                      disabled={!canProceed()}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {currentStep === categories.length - 1 ? (
                        <>
                          <Vote size={20} />
                          Review & Submit
                        </>
                      ) : (
                        <>
                          Next
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Votes</h2>
              <p className="text-gray-600">
                Please review your selections before submitting. This action cannot be undone.
              </p>
            </div>

            {/* Vote Summary */}
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {categories.map((category) => {
                const candidateId = selectedVotes[category._id];
                const candidate = candidateId ? candidates.find(c => c._id === candidateId) : null;

                return (
                  <div key={category._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                        {candidate ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="text-green-600" size={16} />
                            <span className="text-green-600 font-medium">{candidate.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-sm">Position skipped</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-900">
                <strong>Summary:</strong> {Object.values(selectedVotes).filter(v => v !== null).length} votes cast, {Object.values(selectedVotes).filter(v => v === null).length} positions skipped
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-semibold"
              >
                Go Back
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-semibold"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VotingPageContent />
    </Suspense>
  );
}
