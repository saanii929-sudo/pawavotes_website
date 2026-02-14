"use client";

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, User, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Candidate {
  _id: string;
  name: string;
  image?: string;
  bio?: string;
  manifesto?: string;
  order: number;
  voteCount: number;
  categoryId: {
    _id: string;
    name: string;
  };
}

interface Position {
  _id: string;
  name: string;
}

interface Election {
  _id: string;
  title: string;
}

export default function CandidatesPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    image: '',
    bio: '',
    manifesto: '',
    order: 0,
  });

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchPositions();
      fetchCandidates();
    }
  }, [selectedElection]);

  const fetchElections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/elections', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setElections(data.data || []);
        if (data.data.length > 0) {
          setSelectedElection(data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    }
  };

  const fetchPositions = async () => {
    if (!selectedElection) return;

    try {
      const response = await fetch(`/api/elections/categories?electionId=${selectedElection}`);

      if (response.ok) {
        const data = await response.json();
        setPositions(data.data || []);
        if (data.data.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: data.data[0]._id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const fetchCandidates = async () => {
    if (!selectedElection) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/elections/candidates?electionId=${selectedElection}`);

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoryId) {
      toast.error('Please select a position');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingCandidate
        ? `/api/elections/candidates/${editingCandidate._id}`
        : '/api/elections/candidates';
      const method = editingCandidate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          electionId: selectedElection,
          ...formData,
        }),
      });

      if (response.ok) {
        toast.success(editingCandidate ? 'Candidate updated successfully!' : 'Candidate added successfully!');
        setShowModal(false);
        setEditingCandidate(null);
        resetForm();
        fetchCandidates();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${editingCandidate ? 'update' : 'add'} candidate`);
      }
    } catch (error) {
      console.error('Submit candidate error:', error);
      toast.error(`Failed to ${editingCandidate ? 'update' : 'add'} candidate`);
    }
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      categoryId: candidate.categoryId._id,
      name: candidate.name,
      image: candidate.image || '',
      bio: candidate.bio || '',
      manifesto: candidate.manifesto || '',
      order: candidate.order,
    });
    setImagePreview(candidate.image || '');
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setImagePreview(base64);
      setFormData({ ...formData, image: base64 });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImagePreview('');
    setFormData({ ...formData, image: '' });
  };

  const handleDelete = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/elections/candidates/${candidateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Candidate deleted successfully!');
        fetchCandidates();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete candidate');
      }
    } catch (error) {
      console.error('Delete candidate error:', error);
      toast.error('Failed to delete candidate');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryId: positions.length > 0 ? positions[0]._id : '',
      name: '',
      image: '',
      bio: '',
      manifesto: '',
      order: 0,
    });
    setImagePreview('');
  };

  const groupedCandidates = candidates.reduce((acc, candidate) => {
    const positionName = candidate.categoryId?.name || 'Unknown';
    if (!acc[positionName]) {
      acc[positionName] = [];
    }
    acc[positionName].push(candidate);
    return acc;
  }, {} as Record<string, Candidate[]>);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Candidates Management</h1>
        <p className="text-gray-500 mt-1">Add and manage candidates for each position</p>
      </div>

      {/* Election Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Election</label>
        <select
          value={selectedElection}
          onChange={(e) => setSelectedElection(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {elections.map((election) => (
            <option key={election._id} value={election._id}>
              {election.title}
            </option>
          ))}
        </select>
      </div>

      {selectedElection && (
        <>
          {positions.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">
                Please create positions first before adding candidates.
              </p>
            </div>
          ) : (
            <>
              {/* Add Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <Plus size={18} />
                  Add Candidate
                </button>
              </div>

              {/* Candidates List */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : candidates.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="text-green-600" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No Candidates Yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add candidates for each position
                  </p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Plus size={20} />
                    Add Candidate
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedCandidates).map(([positionName, positionCandidates]) => (
                    <div key={positionName}>
                      <h2 className="text-xl font-bold text-gray-900 mb-4">{positionName}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-4 gap-6">
                        {positionCandidates.map((candidate) => (
                          <div
                            key={candidate._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
                          >
                            {candidate.image ? (
                              <img
                                src={candidate.image}
                                alt={candidate.name}
                                className="w-full h-48 object-cover"
                              />
                            ) : (
                              <div className="w-full h-48 bg-purple-100 flex items-center justify-center">
                                <User className="text-green-400" size={64} />
                              </div>
                            )}
                            
                            <div className="p-4">
                              <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {candidate.name}
                              </h3>
                              
                              {candidate.bio && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {candidate.bio}
                                </p>
                              )}

                              <div className="flex items-center justify-between pt-3 border-t">
                                <span className="text-sm text-gray-500">
                                  Votes: {candidate.voteCount}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEdit(candidate)}
                                    className="p-2 text-green-600 hover:bg-purple-50 rounded-lg transition"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(candidate._id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Add Candidate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 p-4 rounded-t-lg">
              <h2 className="text-2xl font-bold text-white">{editingCandidate ? 'Edit Candidate' : 'Add Candidate'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Position *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">Select a position</option>
                  {positions.map((position) => (
                    <option key={position._id} value={position._id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name of the candidate"
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Candidate Image</label>
                
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="candidate-image-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="candidate-image-upload"
                      className="cursor-pointer"
                    >
                      {uploadingImage ? (
                        <div className="flex flex-col items-center">
                          <Loader2 size={32} className="text-green-600 animate-spin mb-2" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload size={32} className="text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to upload candidate image</p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief biography of the candidate"
                  rows={3}
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Manifesto</label>
                <textarea
                  value={formData.manifesto}
                  onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
                  placeholder="Candidate's manifesto and promises"
                  rows={4}
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="w-full text-black border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCandidate(null); resetForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
