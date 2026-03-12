"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Heart, Home, ArrowLeft } from "lucide-react";
import PublicNav from "@/components/PublicNav";
import Image from "next/image";

const VoteSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const [voteDetails, setVoteDetails] = useState({
    nominee: "the nominee",
    votes: "1",
    amount: "0",
    type: "normal",
  });

  // Get vote details from URL params or localStorage and verify payment
  useEffect(() => {
    const nomineeParam = searchParams.get("nominee");
    const votesParam = searchParams.get("votes");
    const amountParam = searchParams.get("amount");
    const typeParam = searchParams.get("type");

    // If URL params exist, use them
    if (nomineeParam || votesParam || amountParam) {
      setVoteDetails({
        nominee: nomineeParam || "the nominee",
        votes: votesParam || "1",
        amount: amountParam || "0",
        type: typeParam || "normal",
      });
    } else {
      // Otherwise, try to get from localStorage
      try {
        const stored = localStorage.getItem('pendingVote');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Check if not too old (within 10 minutes)
          if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
            setVoteDetails({
              nominee: parsed.nominee,
              votes: parsed.votes.toString(),
              amount: parsed.amount.toString(),
              type: parsed.type,
            });
            
            // Verify the payment with the backend (fallback if webhook wasn't received)
            if (parsed.reference) {
              fetch('/api/public/votes/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: parsed.reference }),
              })
                .then(res => res.json())
                .then(data => {
                  console.log('Vote verification result:', data);
                })
                .catch(err => {
                  console.error('Vote verification error:', err);
                });
            }
          }
          // Clear localStorage after reading
          localStorage.removeItem('pendingVote');
        }
      } catch (error) {
        console.error('Error reading vote details:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      router.push("/find-vote");
    }
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 sm:px-8 sm:py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full mb-4 sm:mb-6">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Vote Successful!
            </h1>
            <p className="text-green-50 text-sm sm:text-base">
              Your vote has been recorded successfully
            </p>
          </div>

          {/* Vote Details */}
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="space-y-6">
              {/* Nominee Info */}
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Heart className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">You voted for</p>
                  <p className="text-lg font-semibold text-gray-900">{voteDetails.nominee}</p>
                </div>
              </div>

              {/* Vote Summary */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-600">Number of Votes</span>
                  <span className="font-semibold text-gray-900">{voteDetails.votes}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-semibold text-gray-900">GHS {parseFloat(voteDetails.amount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-600">Vote Type</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    voteDetails.type === "bulk" 
                      ? "bg-purple-100 text-purple-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {voteDetails.type === "bulk" ? "Bulk Package" : "Normal"}
                  </span>
                </div>
              </div>

              {/* Thank You Message */}
              <div className="text-center py-4">
                <p className="text-gray-600 mb-2">
                  Thank you for your support! Your vote helps make a difference.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting in <span className="font-semibold text-green-600">{countdown}</span> seconds...
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push("/find-vote")}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <ArrowLeft size={18} />
                  Vote Again
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <Home size={18} />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            You will receive a confirmation email shortly.
          </p>
        </div>
      </div>
    </div>
  );
};

const VoteSuccessPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VoteSuccessContent />
    </Suspense>
  );
};

export default VoteSuccessPage;
