"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Award, Home, ArrowLeft } from "lucide-react";
import PublicNav from "@/components/PublicNav";

const NominationSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const [nominationDetails, setNominationDetails] = useState({
    name: "Nominee",
    email: "",
    categoryName: "Category",
    awardName: "Award",
    amount: "0",
  });

  // Get nomination details from URL params or localStorage
  useEffect(() => {
    const nameParam = searchParams.get("name");
    const emailParam = searchParams.get("email");
    const categoryParam = searchParams.get("category");
    const awardParam = searchParams.get("award");
    const amountParam = searchParams.get("amount");

    // If URL params exist, use them
    if (nameParam || emailParam || amountParam) {
      setNominationDetails({
        name: nameParam || "Nominee",
        email: emailParam || "",
        categoryName: categoryParam || "Category",
        awardName: awardParam || "Award",
        amount: amountParam || "0",
      });
    } else {
      // Otherwise, try to get from localStorage
      try {
        const stored = localStorage.getItem('pendingNomination');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Check if not too old (within 10 minutes)
          if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
            setNominationDetails({
              name: parsed.name,
              email: parsed.email,
              categoryName: parsed.categoryName,
              awardName: parsed.awardName,
              amount: parsed.amount.toString(),
            });
            
            // Verify the payment with the backend (fallback if webhook wasn't received)
            if (parsed.reference) {
              fetch('/api/public/nominations/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: parsed.reference }),
              })
                .then(res => res.json())
                .then(data => {
                  console.log('Nomination verification result:', data);
                })
                .catch(err => {
                  console.error('Nomination verification error:', err);
                });
            }
          }
          // Clear localStorage after reading
          localStorage.removeItem('pendingNomination');
        }
      } catch (error) {
        console.error('Error reading nomination details:', error);
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
      router.push("/");
    }
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 sm:px-8 sm:py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full mb-4 sm:mb-6">
              <CheckCircle className="text-blue-600" size={48} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Nomination Successful!
            </h1>
            <p className="text-blue-50 text-sm sm:text-base">
              Your nomination has been submitted successfully
            </p>
          </div>

          {/* Nomination Details */}
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <div className="space-y-6">
              {/* Nominee Info */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Award className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nominee</p>
                  <p className="text-lg font-semibold text-gray-900">{nominationDetails.name}</p>
                </div>
              </div>

              {/* Nomination Summary */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-600">Award</span>
                  <span className="font-semibold text-gray-900 text-right">{nominationDetails.awardName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-600">Category</span>
                  <span className="font-semibold text-gray-900 text-right">{nominationDetails.categoryName}</span>
                </div>
                {nominationDetails.email && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-600">Email</span>
                    <span className="font-semibold text-gray-900 text-right break-all">{nominationDetails.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-600">Nomination Fee</span>
                  <span className="font-semibold text-gray-900">GHS {parseFloat(nominationDetails.amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-900 mb-1">Pending Approval</p>
                    <p className="text-sm text-yellow-800">
                      Your nomination is awaiting admin approval. You will be notified once it has been reviewed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Thank You Message */}
              <div className="text-center py-4">
                <p className="text-gray-600 mb-2">
                  Thank you for your nomination! We appreciate your participation.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting in <span className="font-semibold text-blue-600">{countdown}</span> seconds...
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push("/find-vote")}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ArrowLeft size={18} />
                  Browse Awards
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
            You will receive a confirmation email at <span className="font-medium">{nominationDetails.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const NominationSuccessPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <NominationSuccessContent />
    </Suspense>
  );
};

export default NominationSuccessPage;
