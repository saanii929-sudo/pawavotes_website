"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Vote, CheckCircle, Calendar, Clock, Award } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ElectionHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [voterData, setVoterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('voterToken');
    const storedData = localStorage.getItem('voterData');

    if (!token && !storedToken) {
      router.push('/election/login');
      return;
    }

    if (storedData) {
      const data = JSON.parse(storedData);
      setVoterData(data);
      setLoading(false);
    } else {
      router.push('/election/login');
    }
  }, [token, router]);

  const handleVoteNow = () => {
    if (voterData?.hasVoted) {
      toast.error('You have already voted!');
      return;
    }

    const electionStatus = voterData?.election?.status;
    
    if (electionStatus === 'upcoming') {
      toast.error('Voting has not started yet');
      return;
    }

    if (electionStatus === 'ended') {
      toast.error('Voting has ended');
      return;
    }

    router.push(`/election/vote?token=${token || localStorage.getItem('voterToken')}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('voterToken');
    localStorage.removeItem('voterData');
    router.push('/election/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!voterData) {
    return null;
  }

  const election = voterData.election;
  const now = new Date();
  const startDate = new Date(election.startDate);
  const endDate = new Date(election.endDate);
  const isActive = election.status === 'active';
  const hasEnded = election.status === 'ended';
  const isUpcoming = election.status === 'upcoming';

  return (
    <>
      <Toaster position="top-center" />
      
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Vote className="text-green-600" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Election Portal</h1>
                  <p className="text-sm text-gray-500">Welcome, {voterData.name}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="bg-linear-to-r from-green-600 to-indigo-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-6">
              <Award size={20} />
              <span className="text-sm font-medium">Official Election</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {election.title}
            </h1>
            
            {election.description && (
              <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
                {election.description}
              </p>
            )}
            <div className="mb-8">
              {voterData.hasVoted ? (
                <div className="inline-flex items-center gap-2 bg-green-500 px-6 py-3 rounded-full">
                  <CheckCircle size={24} />
                  <span className="font-semibold">You have voted!</span>
                </div>
              ) : isActive ? (
                <div className="inline-flex items-center gap-2 bg-green-500 px-6 py-3 rounded-full animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full" />
                  <span className="font-semibold">Voting is LIVE</span>
                </div>
              ) : isUpcoming ? (
                <div className="inline-flex items-center gap-2 bg-yellow-500 px-6 py-3 rounded-full">
                  <Clock size={24} />
                  <span className="font-semibold">Voting Starts Soon</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-gray-500 px-6 py-3 rounded-full">
                  <span className="font-semibold">Voting Has Ended</span>
                </div>
              )}
            </div>
            {isActive && !voterData.hasVoted && (
              <button
                onClick={handleVoteNow}
                className="inline-flex items-center gap-3 bg-white text-green-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-50 transition shadow-lg"
              >
                <Vote size={24} />
                Cast Your Vote Now
              </button>
            )}

            {voterData.hasVoted && (
              <div className="mt-6">
                <p className="text-green-100">
                  Thank you for participating in this election!
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!voterData.hasVoted && isActive && (
            <div className="mt-8 bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="font-bold text-gray-900 mb-4">How to Vote</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Click Vote Now</p>
                    <p className="text-sm text-gray-600">Access the voting page</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Review Candidates</p>
                    <p className="text-sm text-gray-600">See all positions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Make Selection</p>
                    <p className="text-sm text-gray-600">Choose your candidates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Submit Vote</p>
                    <p className="text-sm text-gray-600">Confirm your choices</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
