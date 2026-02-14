"use client";
import { useState, useEffect } from "react";
import { X, Heart, Minus, Plus } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  nominee: {
    _id: string;
    name: string;
    image?: string;
    categoryName?: string;
  };
  awardId: string;
  categoryId: string;
  votingCost: number;
}

const VotingModal = ({
  isOpen,
  onClose,
  onSuccess,
  nominee,
  awardId,
  categoryId,
  votingCost,
}: VotingModalProps) => {
  const [numberOfVotes, setNumberOfVotes] = useState(1);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = numberOfVotes * votingCost;

  useEffect(() => {
    if (!isOpen) {
      setNumberOfVotes(1);
      setEmail("");
      setPhone("");
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleIncrement = () => {
    setNumberOfVotes((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (numberOfVotes > 1) {
      setNumberOfVotes((prev) => prev - 1);
    }
  };

  const handleVoteCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setNumberOfVotes(value);
    }
  };

  const initializePaystack = async () => {
    try {
      const response = await fetch("/api/public/votes/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          awardId,
          categoryId,
          nomineeId: nominee._id,
          email: email.toLowerCase(),
          phone,
          numberOfVotes,
          amount: totalAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize payment");
      }

      return data;
    } catch (error: any) {
      console.error("Initialize payment error:", error);
      throw error;
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch("/api/public/votes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment verification failed");
      }

      return data;
    } catch (error: any) {
      console.error("Verify payment error:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !phone) {
      toast.error("Please fill in all fields");
      return;
    }

    if (numberOfVotes < 1) {
      toast.error("Please select at least 1 vote");
      return;
    }

    setIsProcessing(true);

    try {
      const initData = await initializePaystack();
      if (!window.PaystackPop) {
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // @ts-ignore
      const handler = window.PaystackPop.setup({
        key: initData.paystackPublicKey,
        email: email.toLowerCase(),
        amount: totalAmount * 100,
        currency: "GHS",
        ref: initData.reference,
        metadata: {
          custom_fields: [
            {
              display_name: "Nominee",
              variable_name: "nominee_name",
              value: nominee.name,
            },
            {
              display_name: "Number of Votes",
              variable_name: "number_of_votes",
              value: numberOfVotes.toString(),
            },
          ],
        },
        callback: (response: any) => {
          (async () => {
            try {
              const verifyData = await verifyPayment(response.reference);
              toast.success(
                `Successfully voted ${numberOfVotes} time${numberOfVotes > 1 ? "s" : ""} for ${nominee.name}!`
              );
              if (onSuccess) {
                onSuccess();
              } else {
                onClose();
                window.location.reload();
              }
            } catch (error: any) {
              toast.error(error.message || "Failed to verify payment");
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        onClose: () => {
          setIsProcessing(false);
          toast.error("Payment cancelled");
        },
      });

      handler.openIframe();
    } catch (error: any) {
      toast.error(error.message || "Failed to process payment");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-scroll [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Header */}
        <div className="sticky top-0 bg-green-600 border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">Vote for Nominee</h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Nominee Info */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            {nominee.image ? (
              <div className="w-16 h-16 rounded-full overflow-hidden relative shrink-0">
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
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center shrink-0">
                <Heart className="text-gray-500" size={28} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{nominee.name}</h3>
              {nominee.categoryName && (
                <p className="text-sm text-gray-600">{nominee.categoryName}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Number of Votes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Votes
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={numberOfVotes <= 1 || isProcessing}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus size={18} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={numberOfVotes}
                  onChange={handleVoteCountChange}
                  disabled={isProcessing}
                  className="flex-1 text-center text-2xl font-bold border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={isProcessing}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                GHS {votingCost.toFixed(2)} per vote
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isProcessing}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isProcessing}
                required
                placeholder="0XX XXX XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
            </div>

            {/* Total Amount */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Number of Votes:</span>
                <span className="font-semibold text-gray-900">{numberOfVotes}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Price per Vote:</span>
                <span className="font-semibold text-gray-900">
                  GHS {votingCost.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-green-200 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">
                    GHS {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Heart size={18} />
                  Proceed to Payment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VotingModal;
