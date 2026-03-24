"use client";

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Share2,
  Mail,
  Plus,
  Eye,
  MousePointer,
  Heart,
  X,
  Send,
  QrCode,
  Copy,
  Check,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface Campaign {
  _id: string;
  nomineeId: { _id: string; name: string; image: string };
  categoryId: { name: string };
  campaignName: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  supporters: any[];
  analytics: { views: number; clicks: number; shares: number; donations: number };
  status: string;
  createdAt: string;
}

interface Award { _id: string; name: string }

interface Nominee {
  _id: string;
  name: string;
  image?: string;
  categoryId: { _id: string; name: string };
  awardId: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function statusStyle(status: string) {
  if (status === 'active')  return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'paused')  return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-1/3" />
        </div>
        <div className="h-5 w-16 bg-slate-200 rounded-full" />
      </div>
      <div className="h-3 bg-slate-200 rounded w-full" />
      <div className="h-3 bg-slate-200 rounded w-4/5" />
      <div className="flex gap-4">
        {[1,2,3,4].map(i => <div key={i} className="flex-1 h-10 bg-slate-100 rounded-lg" />)}
      </div>
    </div>
  );
}

// ─── modal shell ─────────────────────────────────────────────────────────────

function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = 'md',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl w-full max-h-[92vh] overflow-y-auto shadow-xl ${size === 'lg' ? 'max-w-3xl' : 'max-w-xl'}`}>
        {/* header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  optional,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {optional && <span className="text-slate-400 font-normal ml-1 normal-case">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-slate-800 placeholder:text-slate-300 disabled:opacity-50 disabled:bg-slate-50";

// ─── campaign card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign,
  onEmailSupporters,
  onViewAnalytics,
}: {
  campaign: Campaign;
  onEmailSupporters: () => void;
  onViewAnalytics: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const progress = campaign.goalAmount > 0
    ? Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)
    : 0;

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/campaigns/${campaign._id}`);
    setCopied(true);
    toast.success('Campaign link copied!');
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadQR() {
    try {
      const url = `${window.location.origin}/campaigns/${campaign._id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `${campaign.campaignName.replace(/[^a-z0-9]/gi, '_')}_QR.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
      toast.success('QR code downloaded!');
    } catch {
      toast.error('Failed to download QR code');
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
      <div className="p-5">

        {/* top row: avatar + name + status */}
        <div className="flex items-start gap-3 mb-3">
          {campaign.nomineeId?.image ? (
            <img
              src={campaign.nomineeId.image}
              alt={campaign.nomineeId.name}
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-sm font-bold text-slate-400">
              {campaign.nomineeId?.name?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
              {campaign.campaignName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {campaign.nomineeId?.name} · {campaign.categoryId?.name}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize shrink-0 ${statusStyle(campaign.status)}`}>
            {campaign.status}
          </span>
        </div>

        {/* description */}
        {campaign.description && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
            {campaign.description}
          </p>
        )}

        {/* fundraising progress */}
        {campaign.goalAmount > 0 && (
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">
                GHS {campaign.currentAmount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">
                of GHS {campaign.goalAmount.toLocaleString()} · {progress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* stats */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          {[
            { icon: <Eye className="w-3.5 h-3.5" />, label: 'Views',      value: campaign.analytics.views },
            { icon: <MousePointer className="w-3.5 h-3.5" />, label: 'Clicks', value: campaign.analytics.clicks },
            { icon: <Share2 className="w-3.5 h-3.5" />, label: 'Shares',   value: campaign.analytics.shares },
            { icon: <Users className="w-3.5 h-3.5" />, label: 'Supporters', value: campaign.supporters.length },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-lg py-2 px-1">
              <div className="flex justify-center text-slate-400 mb-1">{s.icon}</div>
              <p className="text-sm font-bold text-slate-800 leading-none">{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button
            onClick={downloadQR}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Code
          </button>
          <button
            onClick={onEmailSupporters}
            disabled={campaign.supporters.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mail className="w-3.5 h-3.5" />
            Email ({campaign.supporters.length})
          </button>
          <button
            onClick={onViewAnalytics}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── create campaign modal ────────────────────────────────────────────────────

function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedAward, setSelectedAward] = useState('');
  const [selectedNominee, setSelectedNominee] = useState('');
  const [formData, setFormData] = useState({
    campaignName: '', description: '', goalAmount: '',
    facebook: '', twitter: '', instagram: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingNominees, setLoadingNominees] = useState(false);

  useEffect(() => { fetchAwards(); }, []);

  useEffect(() => {
    if (selectedAward) fetchNominees(selectedAward);
    else { setNominees([]); setSelectedNominee(''); }
  }, [selectedAward]);

  async function fetchAwards() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/awards', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setAwards(d.data || []); }
    } catch {}
  }

  async function fetchNominees(awardId: string) {
    setLoadingNominees(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/nominees?awardId=${awardId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setNominees(d.data || []); }
    } catch {}
    finally { setLoadingNominees(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedNominee || !formData.campaignName || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nomineeId: selectedNominee,
          campaignName: formData.campaignName,
          description: formData.description,
          goalAmount: formData.goalAmount ? parseFloat(formData.goalAmount) : 0,
          socialMedia: { facebook: formData.facebook, twitter: formData.twitter, instagram: formData.instagram },
        }),
      });
      if (res.ok) { toast.success('Campaign created!'); onSuccess(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed to create campaign'); }
    } catch { toast.error('Failed to create campaign'); }
    finally { setLoading(false); }
  }

  const selectedNomineeData = nominees.find(n => n._id === selectedNominee);
  const canSubmit = !loading && !!selectedNominee && !!formData.campaignName && !!formData.description;

  return (
    <Modal title="Create Campaign" subtitle="Set up a campaign page for a nominee" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Award */}
        <Field label="Award" required>
          <select
            value={selectedAward}
            onChange={e => setSelectedAward(e.target.value)}
            disabled={loading}
            className={inputCls}
            required
          >
            <option value="">Select an award…</option>
            {awards.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </Field>

        {/* Nominee */}
        <Field label="Nominee" required>
          <select
            value={selectedNominee}
            onChange={e => setSelectedNominee(e.target.value)}
            disabled={loading || !selectedAward || loadingNominees}
            className={inputCls}
            required
          >
            <option value="">
              {loadingNominees ? 'Loading…' : selectedAward ? 'Select a nominee…' : 'Select an award first'}
            </option>
            {nominees.map(n => (
              <option key={n._id} value={n._id}>{n.name} — {n.categoryId.name}</option>
            ))}
          </select>
        </Field>

        {/* Nominee preview */}
        {selectedNomineeData && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
            {selectedNomineeData.image ? (
              selectedNomineeData.image.startsWith('data:') ? (
                <img src={selectedNomineeData.image} alt={selectedNomineeData.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <Image src={selectedNomineeData.image} alt={selectedNomineeData.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                {selectedNomineeData.name[0]}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectedNomineeData.name}</p>
              <p className="text-xs text-slate-400">{selectedNomineeData.categoryId.name}</p>
            </div>
          </div>
        )}

        {/* Campaign name */}
        <Field label="Campaign Name" required>
          <input
            type="text"
            value={formData.campaignName}
            onChange={e => setFormData({ ...formData, campaignName: e.target.value })}
            disabled={loading}
            placeholder="e.g. Vote for Excellence"
            className={inputCls}
            required
          />
        </Field>

        {/* Description */}
        <Field label="Description" required>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            disabled={loading}
            placeholder="Tell people why they should support this nominee…"
            rows={4}
            className={`${inputCls} resize-none`}
            required
          />
        </Field>

        {/* Goal */}
        <Field label="Fundraising Goal (GHS)" optional>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">GHS</span>
            <input
              type="number"
              value={formData.goalAmount}
              onChange={e => setFormData({ ...formData, goalAmount: e.target.value })}
              disabled={loading}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={`${inputCls} pl-12`}
            />
          </div>
        </Field>

        {/* Social media */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Social Media Links <span className="font-normal normal-case text-slate-400">(optional)</span>
          </p>
          {[
            { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/…' },
            { key: 'twitter',  label: 'Twitter / X', placeholder: 'https://twitter.com/…' },
            { key: 'instagram',label: 'Instagram',  placeholder: 'https://instagram.com/…' },
          ].map(s => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-500 w-20 shrink-0">{s.label}</span>
              <input
                type="url"
                value={(formData as any)[s.key]}
                onChange={e => setFormData({ ...formData, [s.key]: e.target.value })}
                disabled={loading}
                placeholder={s.placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
            ) : (
              <><Plus className="w-4 h-4" /> Create Campaign</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── email supporters modal ───────────────────────────────────────────────────

function EmailSupportersModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [subject, setSubject] = useState(`Update from ${campaign.campaignName}`);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) { toast.error('Please write a message'); return; }
    setSending(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast.success(`Sent to ${campaign.supporters.length} supporter${campaign.supporters.length !== 1 ? 's' : ''}!`);
      onClose();
    } catch { toast.error('Failed to send emails'); }
    finally { setSending(false); }
  }

  return (
    <Modal
      title="Email Supporters"
      subtitle={`${campaign.supporters.length} recipient${campaign.supporters.length !== 1 ? 's' : ''} · ${campaign.campaignName}`}
      onClose={onClose}
    >
      <div className="p-6 space-y-5">

        {/* Campaign info */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
          {campaign.nomineeId?.image && (
            <img src={campaign.nomineeId.image} alt={campaign.nomineeId.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{campaign.campaignName}</p>
            <p className="text-xs text-slate-400">{campaign.nomineeId?.name}</p>
          </div>
        </div>

        {/* Subject */}
        <Field label="Subject">
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={sending}
            className={inputCls}
          />
        </Field>

        {/* Message */}
        <Field label="Message">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={sending}
            placeholder="Write your message to supporters…"
            rows={7}
            className={`${inputCls} resize-none`}
          />
          <p className="text-xs text-slate-400 mt-1">
            Thank supporters, share updates, or ask them to spread the word.
          </p>
        </Field>

        {/* Recipients */}
        {campaign.supporters.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recipients</p>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-28 overflow-y-auto space-y-1">
              {campaign.supporters.slice(0, 5).map((s: any, i: number) => (
                <p key={i} className="text-xs text-slate-500">{s.email}</p>
              ))}
              {campaign.supporters.length > 5 && (
                <p className="text-xs text-slate-400">+{campaign.supporters.length - 5} more</p>
              )}
            </div>
          </div>
        )}

        {/* actions */}
        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
            ) : (
              <><Send className="w-4 h-4" /> Send Email</>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── analytics modal ──────────────────────────────────────────────────────────

function AnalyticsModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const totalEngagement = campaign.analytics.views + campaign.analytics.clicks + campaign.analytics.shares;
  const conversionRate = campaign.analytics.views > 0
    ? ((campaign.analytics.donations / campaign.analytics.views) * 100).toFixed(2)
    : '0.00';
  const avgDonation = campaign.supporters.length > 0
    ? (campaign.currentAmount / campaign.supporters.length).toFixed(2)
    : '0.00';
  const progress = campaign.goalAmount > 0
    ? Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)
    : 0;

  return (
    <Modal title="Analytics" subtitle={campaign.campaignName} onClose={onClose} size="lg">
      <div className="p-6 space-y-6">

        {/* top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Eye className="w-4 h-4" />, label: 'Views',      value: campaign.analytics.views,     color: 'text-blue-600',   bg: 'bg-blue-50' },
            { icon: <MousePointer className="w-4 h-4" />, label: 'Clicks',  value: campaign.analytics.clicks,   color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: <Share2 className="w-4 h-4" />, label: 'Shares',   value: campaign.analytics.shares,   color: 'text-orange-500', bg: 'bg-orange-50' },
            { icon: <Heart className="w-4 h-4" />, label: 'Donations', value: campaign.analytics.donations, color: 'text-green-600',  bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <p className="text-2xl font-black text-slate-800">{s.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* performance */}
        <div className="bg-white border border-slate-100 rounded-xl p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Performance</p>
          <div className="space-y-3">
            {[
              { label: 'Total Engagement', value: totalEngagement.toLocaleString() },
              { label: 'Conversion Rate',  value: `${conversionRate}%` },
              { label: 'Total Supporters', value: campaign.supporters.length.toLocaleString() },
              { label: 'Avg. Donation',    value: `GHS ${avgDonation}` },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{r.label}</span>
                <span className="text-sm font-bold text-slate-800">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* fundraising */}
        {campaign.goalAmount > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fundraising</p>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-black text-slate-800">GHS {campaign.currentAmount.toLocaleString()}</span>
              <span className="text-sm text-slate-400">of GHS {campaign.goalAmount.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{progress.toFixed(1)}% funded</span>
              <span>GHS {(campaign.goalAmount - campaign.currentAmount).toLocaleString()} remaining</span>
            </div>
          </div>
        )}

        {/* top supporters */}
        {campaign.supporters.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Top Supporters</p>
            <div className="space-y-2">
              {campaign.supporters
                .sort((a: any, b: any) => (b.amount || 0) - (a.amount || 0))
                .slice(0, 5)
                .map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{s.email}</p>
                        <p className="text-xs text-slate-400">{s.votes || 0} vote{(s.votes || 0) !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-600">GHS {(s.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* meta + close */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex gap-4 text-xs text-slate-400">
            <span>Created {new Date(campaign.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="capitalize">{campaign.status}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/campaigns', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setCampaigns(d.campaigns || []); }
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage and share your nominee campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 py-16 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700 mb-1">No campaigns yet</h3>
          <p className="text-sm text-slate-400 mb-6">
            Create a campaign to start sharing your nominee's page
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map(c => (
            <CampaignCard
              key={c._id}
              campaign={c}
              onEmailSupporters={() => { setSelectedCampaign(c); setShowEmailModal(true); }}
              onViewAnalytics={() => { setSelectedCampaign(c); setShowAnalyticsModal(true); }}
            />
          ))}
        </div>
      )}

      {/* modals */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { fetchCampaigns(); setShowCreateModal(false); }}
        />
      )}
      {showEmailModal && selectedCampaign && (
        <EmailSupportersModal
          campaign={selectedCampaign}
          onClose={() => { setShowEmailModal(false); setSelectedCampaign(null); }}
        />
      )}
      {showAnalyticsModal && selectedCampaign && (
        <AnalyticsModal
          campaign={selectedCampaign}
          onClose={() => { setShowAnalyticsModal(false); setSelectedCampaign(null); }}
        />
      )}
    </div>
  );
}
