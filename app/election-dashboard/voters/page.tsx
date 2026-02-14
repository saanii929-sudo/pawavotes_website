"use client";

import { useEffect, useState } from 'react';
import { Plus, Upload, Download, Users, Search, FileText, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Voter {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  voterId?: string;
  token: string;
  hasVoted: boolean;
  status: string;
  createdAt: string;
}

interface Election {
  _id: string;
  title: string;
}

export default function VotersPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [search, setSearch] = useState('');
  const [uploadResults, setUploadResults] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    voterId: '',
    department: '',
    class: '',
  });

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchVoters();
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

  const fetchVoters = async () => {
    if (!selectedElection) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/elections/voters?electionId=${selectedElection}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVoters(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch voters:', error);
      toast.error('Failed to load voters');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingVoter
        ? `/api/elections/voters/${editingVoter._id}`
        : '/api/elections/voters';
      const method = editingVoter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          electionId: selectedElection,
          ...formData,
          metadata: {
            department: formData.department,
            class: formData.class,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(editingVoter ? 'Voter updated successfully!' : 'Voter added successfully!');
        
        // Show credentials only for new voters
        if (!editingVoter && data.data.plainPassword) {
          alert(`Voter Credentials:\nToken: ${data.data.token}\nPassword: ${data.data.plainPassword}\n\nPlease save these credentials!`);
        }
        
        setShowAddModal(false);
        setEditingVoter(null);
        resetForm();
        fetchVoters();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${editingVoter ? 'update' : 'add'} voter`);
      }
    } catch (error) {
      console.error('Submit voter error:', error);
      toast.error(`Failed to ${editingVoter ? 'update' : 'add'} voter`);
    }
  };

  const handleEdit = (voter: Voter) => {
    setEditingVoter(voter);
    setFormData({
      name: voter.name,
      email: voter.email || '',
      phone: voter.phone || '',
      voterId: voter.voterId || '',
      department: '',
      class: '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (voterId: string) => {
    if (!confirm('Are you sure you want to delete this voter? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/elections/voters/${voterId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Voter deleted successfully!');
        fetchVoters();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete voter');
      }
    } catch (error) {
      console.error('Delete voter error:', error);
      toast.error('Failed to delete voter');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('CSV file must have at least a header and one data row');
          return;
        }

        // Parse CSV
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const voters = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const voter: any = {};

          headers.forEach((header, index) => {
            if (values[index]) {
              voter[header] = values[index];
            }
          });

          voters.push(voter);
        }

        // Upload voters
        const token = localStorage.getItem('token');
        const response = await fetch('/api/elections/voters/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            electionId: selectedElection,
            voters,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setUploadResults(data.data);
          toast.success(`Successfully uploaded ${data.data.successful} voters!`);
          fetchVoters();
        } else {
          const data = await response.json();
          toast.error(data.error || 'Failed to upload voters');
        }
      } catch (error) {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file');
      }
    };

    reader.readAsText(file);
  };

  const downloadCredentials = () => {
    if (!uploadResults || !uploadResults.voters) return;

    const csv = [
      'Name,Email,Token,Password',
      ...uploadResults.voters.map((v: any) => 
        `${v.name},${v.email || ''},${v.token},${v.password}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voter-credentials-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const csv = 'name,email,phone,voterId,department,class\nJohn Doe,john@example.com,+233244123456,STU001,Computer Science,Year 3';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voters-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      voterId: '',
      department: '',
      class: '',
    });
  };

  const filteredVoters = voters.filter(voter =>
    voter.name.toLowerCase().includes(search.toLowerCase()) ||
    voter.email?.toLowerCase().includes(search.toLowerCase()) ||
    voter.token.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Voters Management</h1>
        <p className="text-gray-500 mt-1">Add and manage voters for your elections</p>
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
          {/* Actions */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={18} />
              Add Voter
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Upload size={18} />
              Bulk Upload
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <Download size={18} />
              Download Template
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search voters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Voters Table */}
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
                  <span className="text-gray-500">Loading voters...</span>
                </div>
              </div>
            ) : filteredVoters.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Users className="text-gray-400" size={48} />
                  <span className="text-gray-500">No voters found</span>
                </div>
              </div>
            ) : (
              filteredVoters.map((voter) => (
                <div key={voter._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{voter.name}</h3>
                      <p className="text-sm text-gray-600 truncate mt-0.5">
                        {voter.email || <span className="text-gray-400 italic">No email</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleEdit(voter)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={voter.hasVoted}
                        title={voter.hasVoted ? "Cannot edit voter who has voted" : "Edit voter"}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(voter._id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={voter.hasVoted}
                        title={voter.hasVoted ? "Cannot delete voter who has voted" : "Delete voter"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Token:</span>
                      <code className="px-2 py-1 bg-gray-100 text-green-700 rounded text-xs font-mono">
                        {voter.token}
                      </code>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        voter.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {voter.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Voted:</span>
                      {voter.hasVoted ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs">
                          <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                          Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">Name</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">Email</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">Token</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">Voted</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
                          <span>Loading voters...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredVoters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="text-gray-400" size={48} />
                          <span>No voters found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVoters.map((voter) => (
                      <tr key={voter._id} className="hover:bg-green-50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900">{voter.name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-600">{voter.email || <span className="text-gray-400 italic">No email</span>}</span>
                        </td>
                        <td className="py-4 px-6">
                          <code className="px-2 py-1 bg-gray-100 text-green-700 rounded text-sm font-mono">{voter.token}</code>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                            voter.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {voter.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {voter.hasVoted ? (
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                              Voted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400">
                              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(voter)}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={voter.hasVoted}
                              title={voter.hasVoted ? "Cannot edit voter who has voted" : "Edit voter"}
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(voter._id)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={voter.hasVoted}
                              title={voter.hasVoted ? "Cannot delete voter who has voted" : "Delete voter"}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add Voter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingVoter ? 'Edit Voter' : 'Add Voter'}</h2>
              <form onSubmit={handleAddVoter} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Voter ID</label>
                    <input
                      type="text"
                      value={formData.voterId}
                      onChange={(e) => setFormData({ ...formData, voterId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Class/Year</label>
                    <input
                      type="text"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingVoter(null); resetForm(); }}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingVoter ? 'Update Voter' : 'Add Voter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Bulk Upload Voters</h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with voter information. The file should have the following columns:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <code className="text-sm">name, email, phone, voterId, department, class</code>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-2"
                >
                  <Download size={16} />
                  Download CSV Template
                </button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 mb-4">Click to upload or drag and drop</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                >
                  Choose CSV File
                </label>
              </div>

              {uploadResults && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium mb-2">
                    Upload Complete!
                  </p>
                  <p className="text-sm text-green-700 mb-4">
                    Successfully uploaded {uploadResults.successful} out of {uploadResults.total} voters
                  </p>
                  <button
                    onClick={downloadCredentials}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Download size={18} />
                    Download Credentials
                  </button>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-6">
                <button
                  onClick={() => { setShowBulkModal(false); setUploadResults(null); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
