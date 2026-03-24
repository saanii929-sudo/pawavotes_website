"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Share2, Users, Calendar, ArrowLeft, Copy, Check, Heart } from "lucide-react";

// Simple SVG brand icons (lucide deprecated theirs)
function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function IconTwitter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4l16 16M4 20 20 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
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
    votingStartDate?: string;
    votingEndDate?: string;
    votingStartTime?: string;
    votingEndTime?: string;
    status?: string;
    pricing?: { votingCost?: number };
    settings?: { allowPublicVoting?: boolean };
  };
  campaignName: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  supporters: any[];
  analytics: { views: number; clicks: number; shares: number; donations: number };
  socialMedia?: { facebook?: string; twitter?: string; instagram?: string };
  status: string;
  createdAt: string;
}

// ─── loading skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="h-14 bg-slate-100 border-b border-slate-200" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-4 bg-slate-200 rounded w-40 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-slate-100 h-56" />
            <div className="rounded-2xl bg-slate-100 h-40" />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-100 h-64" />
            <div className="rounded-2xl bg-slate-100 h-40" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── stat item ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-black text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

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

  async function fetchCampaign() {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
      } else {
        toast.error("Campaign not found");
        router.push("/find-vote");
      }
    } catch {
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }

  async function trackView() {
    try {
      await fetch(`/api/campaigns/${campaignId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "view" }),
      });
    } catch {}
  }

  async function handleShare(platform: string) {
    const url = window.location.href;
    const text = `Support ${campaign?.nomineeId.name} — ${campaign?.campaignName}`;

    try {
      await fetch(`/api/campaigns/${campaignId}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "share", platform }),
      });
    } catch {}

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
    };

    if (urls[platform]) window.open(urls[platform], "_blank", "width=600,height=400");
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function isVotingOpen() {
    if (!campaign?.awardId?.settings?.allowPublicVoting) return false;
    const now = new Date();
    if (campaign.awardId.votingStartDate && campaign.awardId.votingEndDate) {
      const start = new Date(campaign.awardId.votingStartDate);
      const end   = new Date(campaign.awardId.votingEndDate);
      if (campaign.awardId.votingStartTime) {
        const [h, m] = campaign.awardId.votingStartTime.split(":");
        start.setHours(+h, +m, 0, 0);
      }
      if (campaign.awardId.votingEndTime) {
        const [h, m] = campaign.awardId.votingEndTime.split(":");
        end.setHours(+h, +m, 0, 0);
      }
      return now >= start && now <= end;
    }
    return false;
  }

  function hasVotingEnded() {
    if (!campaign?.awardId?.votingEndDate) return false;
    const end = new Date(campaign.awardId.votingEndDate);
    if (campaign.awardId.votingEndTime) {
      const [h, m] = campaign.awardId.votingEndTime.split(":");
      end.setHours(+h, +m, 0, 0);
    }
    return new Date() > end;
  }

  function handleVote() {
    if (!isVotingOpen()) {
      toast.error(hasVotingEnded() ? "Voting has ended" : "Voting is not open yet");
      return;
    }
    setShowVotingModal(true);
  }

  if (loading) return <PageSkeleton />;

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Campaign not found</h2>
          <p className="text-slate-500 text-sm mb-6">
            This campaign may have been removed or doesn't exist.
          </p>
          <Link
            href="/find-vote"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Awards
          </Link>
        </div>
      </div>
    );
  }

  const progress = campaign.goalAmount > 0
    ? Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)
    : 0;

  const votingOpen  = isVotingOpen();
  const votingEnded = hasVotingEnded();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── nav ───────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="Pawavotes" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-green-600 hidden sm:block">Pawavotes</span>
          </Link>
          <Link
            href="/find-vote"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Awards</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── breadcrumb ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6 flex-wrap">
          <span>{campaign.awardId.organizationName}</span>
          <span>·</span>
          <span className="text-green-600 font-medium">{campaign.awardId.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* ── left column ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Nominee card */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 items-start">

                  {/* Photo */}
                  <div className="shrink-0 mx-auto sm:mx-0">
                    {campaign.nomineeId.image ? (
                      campaign.nomineeId.image.startsWith("data:") ? (
                        <img
                          src={campaign.nomineeId.image}
                          alt={campaign.nomineeId.name}
                          className="w-28 h-28 rounded-2xl object-cover"
                        />
                      ) : (
                        <Image
                          src={campaign.nomineeId.image}
                          alt={campaign.nomineeId.name}
                          width={112}
                          height={112}
                          className="rounded-2xl object-cover w-28 h-28"
                        />
                      )
                    ) : (
                      <div className="w-28 h-28 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl font-black text-slate-300">
                        {campaign.nomineeId.name?.[0] || "?"}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center sm:text-left">
                    <span className="inline-block text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full mb-2">
                      {campaign.categoryId.name}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-1">
                      {campaign.nomineeId.name}
                    </h1>
                    <p className="text-sm text-slate-400 mb-3">{campaign.campaignName}</p>
                    {campaign.nomineeId.bio && (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {campaign.nomineeId.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            {campaign.description && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
                <h2 className="text-base font-bold text-slate-800 mb-3">About this campaign</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {campaign.description}
                </p>
              </div>
            )}

            {/* Social media */}
            {(campaign.socialMedia?.facebook || campaign.socialMedia?.twitter || campaign.socialMedia?.instagram) && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-base font-bold text-slate-800 mb-3">Follow on social media</h2>
                <div className="flex flex-wrap gap-2">
                  {campaign.socialMedia.facebook && (
                    <a
                      href={campaign.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <IconFacebook className="w-4 h-4" />
                      Facebook
                    </a>
                  )}
                  {campaign.socialMedia.twitter && (
                    <a
                      href={campaign.socialMedia.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 hover:border-sky-300 hover:text-sky-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <IconTwitter className="w-4 h-4" />
                      Twitter
                    </a>
                  )}
                  {campaign.socialMedia.instagram && (
                    <a
                      href={campaign.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-200 hover:border-pink-300 hover:text-pink-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <IconInstagram className="w-4 h-4" />
                      Instagram
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── right sidebar ─────────────────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-20">

            {/* Vote CTA card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">

              {/* Voting status badge */}
              <div className="mb-4">
                {votingOpen ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                    </span>
                    Voting is open
                  </span>
                ) : votingEnded ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    Voting ended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    Voting not started
                  </span>
                )}
              </div>

              {/* Fundraising progress */}
              {campaign.goalAmount > 0 && (
                <div className="mb-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-black text-slate-900">
                      GHS {campaign.currentAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400">
                      of GHS {campaign.goalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{progress.toFixed(0)}% funded</p>
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-6 mb-5 pb-5 border-b border-slate-100">
                <Stat label="Supporters" value={campaign.supporters.length.toLocaleString()} />
                <Stat label="Views" value={campaign.analytics.views.toLocaleString()} />
                <Stat label="Shares" value={campaign.analytics.shares.toLocaleString()} />
              </div>

              {/* CTA */}
              {votingOpen ? (
                <button
                  onClick={handleVote}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  Vote for {campaign.nomineeId.name.split(" ")[0]}
                </button>
              ) : (
                <div className="w-full text-center py-3 rounded-xl text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200">
                  {votingEnded ? "Voting has ended" : "Voting opens soon"}
                </div>
              )}
            </div>

            {/* Share card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-bold text-slate-700 mb-3">Share this campaign</h2>
              <div className="space-y-2">
                <button
                  onClick={() => handleShare("facebook")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-sm font-medium text-slate-600 hover:text-blue-700 transition-all"
                >
                  <IconFacebook className="w-4 h-4 shrink-0" />
                  Share on Facebook
                </button>
                <button
                  onClick={() => handleShare("twitter")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-sky-200 hover:bg-sky-50 text-sm font-medium text-slate-600 hover:text-sky-700 transition-all"
                >
                  <IconTwitter className="w-4 h-4 shrink-0" />
                  Share on Twitter
                </button>
                <button
                  onClick={() => handleShare("whatsapp")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-green-200 hover:bg-green-50 text-sm font-medium text-slate-600 hover:text-green-700 transition-all"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  Share on WhatsApp
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-600 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>

            {/* Meta */}
            <p className="text-xs text-slate-400 text-center px-2">
              Created {new Date(campaign.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </main>

      {/* ── footer ────────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Pawavotes — Built for trust & transparency in Africa.
        </div>
      </footer>

      {/* ── voting modal ───────────────────────────────────────────────────────── */}
      {showVotingModal && campaign && (
        <VotingModal
          isOpen={showVotingModal}
          onClose={() => setShowVotingModal(false)}
          onSuccess={() => { fetchCampaign(); setShowVotingModal(false); }}
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
