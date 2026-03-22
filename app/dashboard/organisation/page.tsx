'use client';
import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle, Clock, ArrowRightLeft, Trophy, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/ImageUpload';

interface OrgMembership {
  organizationId: string;
  organizationName: string;
  assignedAwards: any[];
  status: 'active' | 'pending' | 'inactive';
}

// ─── Org-Admin View ────────────────────────────────────────────────────────────
function OrgAdminView() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string>('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentOrgId(user.organizationId || '');
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/my-organizations?all=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setMemberships(data.data);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (organizationId: string, action: 'accept' | 'decline') => {
    setResponding(organizationId + action);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/respond-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId, action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      toast.success(action === 'accept' ? 'Invitation accepted!' : 'Invitation declined');
      fetchMemberships();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setResponding(null);
    }
  };

  const handleSwitch = async (org: OrgMembership) => {
    if (org.organizationId === currentOrgId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/switch-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ organizationId: org.organizationId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to switch'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      toast.success(`Switched to ${org.organizationName}`);
      window.location.reload();
    } catch {
      toast.error('Failed to switch organization');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  const active = memberships.filter(m => m.status === 'active');
  const pending = memberships.filter(m => m.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Organizations</h1>
            <p className="text-gray-500 mt-1 text-sm">Organizations you are a member of or have been invited to.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/organisation/join')}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Join Organization
          </button>
        </div>

        {/* Pending Invitations */}
        {pending.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-yellow-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Pending Invitations ({pending.length})
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pending.map(org => (
                <div key={org.organizationId} className="bg-white rounded-xl border border-yellow-200 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                      <Building2 size={22} className="text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{org.organizationName}</h3>
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                        <Clock size={10} />
                        Pending invitation
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleRespond(org.organizationId, 'accept')}
                      disabled={!!responding}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {responding === org.organizationId + 'accept' ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleRespond(org.organizationId, 'decline')}
                      disabled={!!responding}
                      className="flex-1 border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {responding === org.organizationId + 'decline' ? 'Declining...' : 'Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Memberships */}
        {active.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={16} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Active Memberships ({active.length})
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {active.map(org => {
                const isCurrent = org.organizationId === currentOrgId;
                return (
                  <div
                    key={org.organizationId}
                    className={`bg-white rounded-xl border shadow-sm p-5 transition ${isCurrent ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Building2 size={22} className={isCurrent ? 'text-green-600' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{org.organizationName}</h3>
                          {isCurrent && (
                            <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Trophy size={11} />
                          <span>{org.assignedAwards.length} award{org.assignedAwards.length !== 1 ? 's' : ''} assigned</span>
                        </div>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle size={10} />
                          Active member
                        </span>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleSwitch(org)}
                        className="w-full mt-4 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                      >
                        <ArrowRightLeft size={14} />
                        Switch to this organization
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !loading && pending.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations yet</h3>
              <p className="text-gray-500 text-sm mb-6">You haven't joined any organization yet. Request to join one.</p>
              <button
                onClick={() => router.push('/dashboard/organisation/join')}
                className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                Join an Organization
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Organization Owner View ───────────────────────────────────────────────────
function OrganizationOwnerView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    description: '',
    website: '',
    logo: '',
    socialMedia: { facebook: '', instagram: '', twitter: '', tiktok: '' },
  });

  useEffect(() => { fetchOrganization(); }, []);

  const fetchOrganization = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/organization/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch organization data');
      const data = await res.json();
      setFormData({
        name: data.data.name || '',
        email: data.data.email || '',
        description: data.data.description || '',
        website: data.data.website || '',
        logo: data.data.logo || '',
        socialMedia: {
          facebook: data.data.socialMedia?.facebook || '',
          instagram: data.data.socialMedia?.instagram || '',
          twitter: data.data.socialMedia?.twitter || '',
          tiktok: data.data.socialMedia?.tiktok || '',
        },
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('socialMedia.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, socialMedia: { ...prev.socialMedia, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('Organization name is required'); return; }
    if (!formData.email.trim()) { toast.error('Organization email is required'); return; }
    if (!formData.description?.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update profile'); }
      const data = await res.json();
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.name = data.data.name;
        localStorage.setItem('user', JSON.stringify(user));
      }
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading organization data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Organization Profile</h1>
          <p className="text-gray-500 mt-1">Manage the primary identity and settings for your organization account.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm">
            <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
              <h2 className="text-lg font-semibold">Edit Organization</h2>
              <p className="text-sm text-green-100">Update your organization identity details.</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Profile Image</label>
                <ImageUpload
                  onUploadComplete={(url) => setFormData(prev => ({ ...prev, logo: url }))}
                  currentImage={formData.logo}
                  folder="organizations/logos"
                  maxSize={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Enter organization name" className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization Email <span className="text-red-500">*</span></label>
                <input type="email" name="email" value={formData.email} readOnly className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Describe your organization..." className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input type="url" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://" className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(['facebook', 'instagram', 'tiktok', 'twitter'] as const).map(platform => (
                  <div key={platform}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{platform === 'twitter' ? 'Twitter (X)' : platform}</label>
                    <input type="url" name={`socialMedia.${platform}`} value={(formData.socialMedia as any)[platform]} onChange={handleInputChange} placeholder={`https://${platform}.com/`} className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
              <button type="button" onClick={() => window.location.reload()} className="px-6 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export default function OrganizationPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setRole(user.role || 'organization');
  }, []);

  if (role === null) return null;
  if (role === 'org-admin') return <OrgAdminView />;
  return <OrganizationOwnerView />;
}
