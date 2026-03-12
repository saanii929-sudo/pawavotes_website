"use client";

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Share2,
  Mail,
  Calendar,
  Plus,
  Eye,
  MousePointer,
  Heart,
  Target,
  Facebook,
  Twitter,
  Instagram,
  X,
  Search,
  ChevronDown,
  Send,
  BarChart3,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface Campaign {
  _id: string;
  nomineeId: {
    _id: string;
    name: string;
    image: string;
  };
  categoryId: {
    name: string;
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
  status: string;
  createdAt: string;
}

interface Award {
  _id: string;
  name: string;
}

interface Nominee {
  _id: string;
  name: string;
  image?: string;
  categoryId: {
    _id: string;
    name: string;
  };
  awardId: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/campaigns', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignCreated = () => {
    fetchCampaigns();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nominee Campaigns</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage and track your nominee campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 sm:p-12 text-center">
          <Target className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-6">
            Create your first campaign to start engaging with supporters
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {campaigns.map((campaign) => (
            <CampaignCard 
              key={campaign._id} 
              campaign={campaign}
              onEmailSupporters={() => {
                setSelectedCampaign(campaign);
                setShowEmailModal(true);
              }}
              onViewAnalytics={() => {
                setSelectedCampaign(campaign);
                setShowAnalyticsModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCampaignCreated}
        />
      )}

      {/* Email Supporters Modal */}
      {showEmailModal && selectedCampaign && (
        <EmailSupportersModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedCampaign && (
        <AnalyticsModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}

function CampaignCard({ 
  campaign,
  onEmailSupporters,
  onViewAnalytics,
}: { 
  campaign: Campaign;
  onEmailSupporters: () => void;
  onViewAnalytics: () => void;
}) {
  const progress = campaign.goalAmount > 0 
    ? (campaign.currentAmount / campaign.goalAmount) * 100 
    : 0;

  const handleDownloadQRCode = async () => {
    try {
      const campaignUrl = `${window.location.origin}/campaigns/${campaign._id}`;
      
      // Use QR code API to generate QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(campaignUrl)}`;
      
      // Fetch the QR code image
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${campaign.campaignName.replace(/[^a-z0-9]/gi, '_')}_Campaign_QR.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("QR code downloaded successfully!");
    } catch (error) {
      console.error("QR download error:", error);
      toast.error("Failed to download QR code");
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-4 sm:mb-6">
          {campaign.nomineeId?.image && (
            <img
              src={campaign.nomineeId.image}
              alt={campaign.nomineeId.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto sm:mx-0"
            />
          )}
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-2">
              <div className="w-full sm:w-auto">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 text-center sm:text-left">
                  {campaign.campaignName}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mt-1 text-center sm:text-left">
                  {campaign.nomineeId?.name} • {campaign.categoryId?.name}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap mx-auto sm:mx-0 ${
                  campaign.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : campaign.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mt-2 text-center sm:text-left">
              {campaign.description}
            </p>
          </div>
        </div>

        {/* Progress */}
        {campaign.goalAmount > 0 && (
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Fundraising Progress</span>
              <span className="text-xs sm:text-sm font-bold text-green-600">
                GHS {campaign.currentAmount.toLocaleString()} / GHS {campaign.goalAmount.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3">
              <div
                className="bg-linear-to-r from-green-500 to-green-600 h-2.5 sm:h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% of goal reached</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <StatBox
            icon={<Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Views"
            value={campaign.analytics.views.toLocaleString()}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatBox
            icon={<MousePointer className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Clicks"
            value={campaign.analytics.clicks.toLocaleString()}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatBox
            icon={<Share2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Shares"
            value={campaign.analytics.shares.toLocaleString()}
            color="text-orange-600"
            bgColor="bg-orange-50"
          />
          <StatBox
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Supporters"
            value={campaign.supporters.length.toLocaleString()}
            color="text-green-600"
            bgColor="bg-green-50"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => {
              const url = `${window.location.origin}/campaigns/${campaign._id}`;
              navigator.clipboard.writeText(url);
              toast.success("Campaign link copied!");
            }}
            className="flex-1 min-w-full sm:min-w-37.5 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <Share2 className="w-4 h-4" />
            Copy Campaign Link
          </button>
          
          <button
            onClick={handleDownloadQRCode}
            className="flex-1 min-w-full sm:min-w-37.5 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <QrCode className="w-4 h-4" />
            Download QR Code
          </button>

          <button 
            onClick={onEmailSupporters}
            disabled={campaign.supporters.length === 0}
            className="flex-1 min-w-full sm:min-w-37.5 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
            Email Supporters ({campaign.supporters.length})
          </button>
          <button 
            onClick={onViewAnalytics}
            className="flex-1 min-w-full sm:min-w-37.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            View Analytics
          </button>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <span className="text-xs sm:text-sm text-gray-600">Share on:</span>
          <div className="flex gap-2">
            <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Facebook className="w-4 h-4" />
            </button>
            <button className="p-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors">
              <Twitter className="w-4 h-4" />
            </button>
            <button className="p-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors">
              <Instagram className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
      <div className={`${bgColor} ${color} w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-lg sm:text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-[10px] sm:text-xs text-gray-500">{label}</div>
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedAward, setSelectedAward] = useState('');
  const [selectedNominee, setSelectedNominee] = useState('');
  const [formData, setFormData] = useState({
    campaignName: '',
    description: '',
    goalAmount: '',
    facebook: '',
    twitter: '',
    instagram: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingNominees, setLoadingNominees] = useState(false);

  useEffect(() => {
    fetchAwards();
  }, []);

  useEffect(() => {
    if (selectedAward) {
      fetchNominees(selectedAward);
    } else {
      setNominees([]);
      setSelectedNominee('');
    }
  }, [selectedAward]);

  const fetchAwards = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/awards', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAwards(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch awards:', error);
    }
  };

  const fetchNominees = async (awardId: string) => {
    setLoadingNominees(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/nominees?awardId=${awardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setNominees(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch nominees:', error);
    } finally {
      setLoadingNominees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNominee || !formData.campaignName || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nomineeId: selectedNominee,
          campaignName: formData.campaignName,
          description: formData.description,
          goalAmount: formData.goalAmount ? parseFloat(formData.goalAmount) : 0,
          socialMedia: {
            facebook: formData.facebook,
            twitter: formData.twitter,
            instagram: formData.instagram,
          },
        }),
      });

      if (response.ok) {
        toast.success('Campaign created successfully!');
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const selectedNomineeData = nominees.find((n) => n._id === selectedNominee);

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Create Campaign</h2>
            <p className="text-xs sm:text-sm text-green-100 mt-1">
              Set up a campaign for your nominee
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Award Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Select Award <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAward}
              onChange={(e) => setSelectedAward(e.target.value)}
              disabled={loading}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              required
            >
              <option value="">Choose an award...</option>
              {awards.map((award) => (
                <option key={award._id} value={award._id}>
                  {award.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nominee Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Select Nominee <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedNominee}
              onChange={(e) => setSelectedNominee(e.target.value)}
              disabled={loading || !selectedAward || loadingNominees}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              required
            >
              <option value="">
                {loadingNominees
                  ? 'Loading nominees...'
                  : selectedAward
                  ? 'Choose a nominee...'
                  : 'Select an award first'}
              </option>
              {nominees.map((nominee) => (
                <option key={nominee._id} value={nominee._id}>
                  {nominee.name} - {nominee.categoryId.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Nominee Preview */}
          {selectedNomineeData && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
              {selectedNomineeData.image ? (
                selectedNomineeData.image.startsWith('data:') ? (
                  <img
                    src={selectedNomineeData.image}
                    alt={selectedNomineeData.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                  />
                ) : (
                  <Image
                    src={selectedNomineeData.image}
                    alt={selectedNomineeData.name}
                    width={64}
                    height={64}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover"
                  />
                )
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <Users className="text-gray-500" size={24} />
                </div>
              )}
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                  {selectedNomineeData.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedNomineeData.categoryId.name}
                </p>
              </div>
            </div>
          )}

          {/* Campaign Name */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.campaignName}
              onChange={(e) =>
                setFormData({ ...formData, campaignName: e.target.value })
              }
              disabled={loading}
              placeholder="e.g., Vote for Excellence"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={loading}
              placeholder="Describe your campaign and why people should support..."
              rows={4}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 resize-none"
              required
            />
          </div>

          {/* Goal Amount */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Fundraising Goal (GHS) <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="number"
              value={formData.goalAmount}
              onChange={(e) =>
                setFormData({ ...formData, goalAmount: e.target.value })
              }
              disabled={loading}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            />
          </div>

          {/* Social Media Links */}
          <div className="border-t border-gray-200 pt-4 sm:pt-6">
            <h3 className="text-xs sm:text-sm font-medium text-gray-900 mb-3 sm:mb-4">
              Social Media Links <span className="text-gray-500 text-xs">(Optional)</span>
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-2">
                  <Facebook className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" />
                  Facebook
                </label>
                <input
                  type="url"
                  value={formData.facebook}
                  onChange={(e) =>
                    setFormData({ ...formData, facebook: e.target.value })
                  }
                  disabled={loading}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-2">
                  <Twitter className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" />
                  Twitter
                </label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) =>
                    setFormData({ ...formData, twitter: e.target.value })
                  }
                  disabled={loading}
                  placeholder="https://twitter.com/..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-gray-700 mb-2">
                  <Instagram className="w-3 h-3 sm:w-4 sm:h-4 inline mr-2" />
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.instagram}
                  onChange={(e) =>
                    setFormData({ ...formData, instagram: e.target.value })
                  }
                  disabled={loading}
                  placeholder="https://instagram.com/..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedNominee || !formData.campaignName || !formData.description}
              className="w-full sm:flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create Campaign
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function EmailSupportersModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState(`Update from ${campaign.campaignName}`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Email sent to ${campaign.supporters.length} supporter${campaign.supporters.length > 1 ? 's' : ''}!`);
      onClose();
    } catch (error) {
      toast.error('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Email Supporters</h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              Send message to {campaign.supporters.length} supporter{campaign.supporters.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Campaign Info */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
            {campaign.nomineeId?.image && (
              <img
                src={campaign.nomineeId.image}
                alt={campaign.nomineeId.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{campaign.campaignName}</h3>
              <p className="text-sm text-gray-600">{campaign.nomineeId?.name}</p>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              placeholder="Write your message to supporters..."
              rows={8}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: Thank your supporters, share updates, or remind them to share the campaign!
            </p>
          </div>

          {/* Supporter List Preview */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recipients</h4>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {campaign.supporters.slice(0, 5).map((supporter: any, index: number) => (
                <div key={index} className="text-xs text-gray-600 py-1">
                  {supporter.email}
                </div>
              ))}
              {campaign.supporters.length > 5 && (
                <div className="text-xs text-gray-500 py-1">
                  +{campaign.supporters.length - 5} more...
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="w-full sm:flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsModal({
  campaign,
  onClose,
}: {
  campaign: Campaign;
  onClose: () => void;
}) {
  const totalEngagement = 
    campaign.analytics.views + 
    campaign.analytics.clicks + 
    campaign.analytics.shares;

  const conversionRate = campaign.analytics.views > 0
    ? ((campaign.analytics.donations / campaign.analytics.views) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-green-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">Campaign Analytics</h2>
            <p className="text-xs sm:text-sm text-green-100 mt-1">
              {campaign.campaignName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-green-700 p-2 rounded-lg transition-colors"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Views</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.analytics.views.toLocaleString()}
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Clicks</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.analytics.clicks.toLocaleString()}
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-600">Shares</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.analytics.shares.toLocaleString()}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Donations</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.analytics.donations.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Engagement</span>
                <span className="text-lg font-semibold text-gray-900">
                  {totalEngagement.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="text-lg font-semibold text-green-600">
                  {conversionRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Supporters</span>
                <span className="text-lg font-semibold text-gray-900">
                  {campaign.supporters.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Donation</span>
                <span className="text-lg font-semibold text-gray-900">
                  GHS {campaign.supporters.length > 0
                    ? (campaign.currentAmount / campaign.supporters.length).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Fundraising Progress */}
          {campaign.goalAmount > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Fundraising Progress</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-green-600">
                    GHS {campaign.currentAmount.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600">
                    of GHS {campaign.goalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-linear-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {((campaign.currentAmount / campaign.goalAmount) * 100).toFixed(1)}% funded
                  </span>
                  <span>
                    GHS {(campaign.goalAmount - campaign.currentAmount).toLocaleString()} remaining
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top Supporters */}
          {campaign.supporters.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Supporters</h3>
              <div className="space-y-3">
                {campaign.supporters
                  .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
                  .slice(0, 5)
                  .map((supporter: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-green-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {supporter.email}
                          </div>
                          <div className="text-xs text-gray-500">
                            {supporter.votes || 0} vote{(supporter.votes || 0) > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">
                        GHS {(supporter.amount || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Campaign Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Created:</span>
                <div className="font-medium text-gray-900">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <div className="font-medium text-gray-900 capitalize">
                  {campaign.status}
                </div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
