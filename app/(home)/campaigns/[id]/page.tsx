"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heart,
  Share2,
  Users,
  TrendingUp,
  Calendar,
  Award,
  Facebook,
  Twitter,
  Instagram,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import VotingModal from "@/components/VotingModal";

interface Campaign {
  _id: string;
  nomineeId: {
    _id: string;
    name: string;
    image: string;
    bio?: string;
  };
  categoryId: {
    _id: string;
    name: string;
  };
  awardId: {
    _id: string;
    name: string;
    organizationName: string;
    pricing?: {
      votingCost?: number;
    };
  };
  campaignName: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  supporters: any[];
  analytics: {
    views: number;
    clicks: number;
    shares: number;
    donations: number;
  };
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  status: string;
  createdAt: string;
}

export default function PublicCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
      trackView();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaign(data.campaign);
      } else {
        toast.error("Campaign not found");
        router.push("/find-vote");
      }
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await fetch(`/api/campaigns/${campaignId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view" }),
      });
    } catch (error) {
      console.error("Failed to track view:", error);
    }
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const text = `Support ${campaign?.nomineeId.name} - ${campaign?.campaignName}`;

    try {
      await fetch(`/api/campaigns/${campaignId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", platform }),
      });
    } catch (error) {
      console.error("Failed to track share:", error);
    }

    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVote = () => {
    setShowVotingModal(true);
  };

  const handleVoteSuccess = () => {
    fetchCampaign();
    setShowVotingModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
          <p className="text-gray-600 mb-6">This campaign may have been removed or doesn't exist.</p>
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

  const progress = campaign.goalAmount > 0 
    ? (campaign.currentAmount / campaign.goalAmount) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="Pawavotes"
                width={60}
                height={60}
              />
              <span className="text-xl font-semibold text-green-600">
                Pawavotes
              </span>
            </Link>
            <Link
              href="/find-vote"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Awards</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-linear-to-r from-green-600 to-green-700 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
            <Award className="w-4 h-4" />
            <span className="text-sm font-medium">{campaign.awardId.name}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            {campaign.campaignName}
          </h1>
          <p className="text-lg sm:text-xl text-green-100 mb-6">
            {campaign.categoryId.name}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleVote}
              className="bg-white text-green-600 hover:bg-green-50 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg flex items-center gap-2 transition-colors"
            >
              <Heart size={20} />
              Vote Now
            </button>
            <button
              onClick={handleCopyLink}
              className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {campaign.nomineeId.image ? (
                  campaign.nomineeId.image.startsWith("data:") ? (
                    <img
                      src={campaign.nomineeId.image}
                      alt={campaign.nomineeId.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-green-100"
                    />
                  ) : (
                    <Image
                      src={campaign.nomineeId.image}
                      alt={campaign.nomineeId.name}
                      width={128}
                      height={128}
                      className="rounded-full object-cover border-4 border-green-100"
                    />
                  )
                ) : (
                  <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="text-gray-400" size={48} />
                  </div>
                )}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {campaign.nomineeId.name}
                  </h2>
                  <p className="text-gray-600 mb-4">{campaign.categoryId.name}</p>
                  {campaign.nomineeId.bio && (
                    <p className="text-gray-700 leading-relaxed">{campaign.nomineeId.bio}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">About This Campaign</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {campaign.description}
              </p>
            </div>

            {/* Social Media Links */}
            {(campaign.socialMedia?.facebook || campaign.socialMedia?.twitter || campaign.socialMedia?.instagram) && (
              <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Connect With Us</h3>
                <div className="flex flex-wrap gap-3">
                  {campaign.socialMedia.facebook && (
                    <a
                      href={campaign.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Facebook size={18} />
                      Facebook
                    </a>
                  )}
                  {campaign.socialMedia.twitter && (
                    <a
                      href={campaign.socialMedia.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Twitter size={18} />
                      Twitter
                    </a>
                  )}
                  {campaign.socialMedia.instagram && (
                    <a
                      href={campaign.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Instagram size={18} />
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Fundraising Progress */}
            {campaign.goalAmount > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Fundraising Progress</h3>
                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-3xl font-bold text-green-600">
                      GHS {campaign.currentAmount.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600">
                      of GHS {campaign.goalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-linear-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{progress.toFixed(1)}% funded</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Supporters</span>
                    <span className="font-semibold text-gray-900">
                      {campaign.supporters.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Campaign Views</span>
                    <span className="font-semibold text-gray-900">
                      {campaign.analytics.views.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleVote}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Heart size={20} />
                  Support This Campaign
                </button>
              </div>
            )}

            {/* Share Campaign */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Share Campaign</h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleShare("facebook")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Facebook size={18} />
                  Share on Facebook
                </button>
                <button
                  onClick={() => handleShare("twitter")}
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Twitter size={18} />
                  Share on Twitter
                </button>
                <button
                  onClick={() => handleShare("whatsapp")}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 size={18} />
                  Share on WhatsApp
                </button>
              </div>
            </div>

            {/* Campaign Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Shares</span>
                  <span className="font-semibold text-gray-900">
                    {campaign.analytics.shares}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Clicks</span>
                  <span className="font-semibold text-gray-900">
                    {campaign.analytics.clicks}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Modal */}
      {showVotingModal && campaign && (
        <VotingModal
          isOpen={showVotingModal}
          onClose={() => setShowVotingModal(false)}
          onSuccess={handleVoteSuccess}
          nominee={{
            _id: campaign.nomineeId._id,
            name: campaign.nomineeId.name,
            image: campaign.nomineeId.image,
            categoryName: campaign.categoryId.name,
          }}
          awardId={campaign.awardId._id}
          categoryId={campaign.categoryId._id}
          votingCost={campaign.awardId.pricing?.votingCost || 0.5}
        />
      )}
    </div>
  );
}
