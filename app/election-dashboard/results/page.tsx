"use client";

import { useEffect, useState, useCallback } from 'react';
import { Download, TrendingUp, Users, Award, BarChart3, Grid3x3, Table2, RefreshCw, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Candidate {
  _id: string;
  name: string;
  image?: string;
  voteCount: number;
  categoryId: {
    _id: string;
    name: string;
  };
}

interface Voter {
  _id: string;
  hasVoted: boolean;
}

interface Election {
  _id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
}

export default function ResultsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchResults(true);
      fetchVoters();
    }
  }, [selectedElection]);

  useEffect(() => {
    if (!selectedElection || !autoRefresh) return;

    const interval = setInterval(() => {
      fetchResults(false);
      fetchVoters();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedElection, autoRefresh]);

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

  const fetchResults = async (isInitialLoad = false) => {
    if (!selectedElection) return;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await fetch(`/api/elections/candidates?electionId=${selectedElection}`);

      if (response.ok) {
        const data = await response.json();
        setCandidates(data.data || []);
        setLastUpdated(new Date());
        
        if (isInitialLoad) {
          setInitialLoad(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      if (isInitialLoad) {
        toast.error('Failed to load results');
      }
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const fetchVoters = async () => {
    if (!selectedElection) return;

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
    }
  };

  const groupedCandidates = candidates.reduce((acc, candidate) => {
    const positionName = candidate.categoryId?.name || 'Unknown';
    if (!acc[positionName]) {
      acc[positionName] = [];
    }
    acc[positionName].push(candidate);
    return acc;
  }, {} as Record<string, Candidate[]>);

  Object.keys(groupedCandidates).forEach(position => {
    groupedCandidates[position].sort((a, b) => b.voteCount - a.voteCount);
  });

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.hasVoted).length;
  const turnoutRate = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  const downloadResults = () => {
    const csv = [
      'Position,Candidate,Votes,Percentage',
      ...Object.entries(groupedCandidates).flatMap(([position, positionCandidates]) => {
        const positionTotal = positionCandidates.reduce((sum, c) => sum + c.voteCount, 0);
        return positionCandidates.map(candidate => {
          const percentage = positionTotal > 0 ? ((candidate.voteCount / positionTotal) * 100).toFixed(2) : '0.00';
          return `${position},${candidate.name},${candidate.voteCount},${percentage}%`;
        });
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `election-results-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Results downloaded successfully!');
  };

  const manualRefresh = () => {
    fetchResults(false);
    fetchVoters();
    toast.success('Results refreshed!');
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Election Results</h1>
          <p className="text-gray-500 mt-1">
            View live results and analytics
            {autoRefresh && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
            {refreshing && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600">
                <RefreshCw size={12} className="animate-spin" />
                Updating...
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                viewMode === 'grid'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3x3 size={18} />
              <span className="text-sm font-medium">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition ${
                viewMode === 'table'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table2 size={18} />
              <span className="text-sm font-medium">Table</span>
            </button>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <RefreshCw size={18} className={refreshing && autoRefresh ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">
              {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
            </span>
          </button>

          <button
            onClick={manualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw size={18} />
            <span className="text-sm font-medium">Refresh</span>
          </button>

          <button
            onClick={downloadResults}
            disabled={candidates.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
        </div>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-linear-to-br from-blue-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-100">Total Votes</p>
                <BarChart3 className="text-green-200" size={24} />
              </div>
              <p className="text-4xl font-bold">{totalVotes}</p>
              <p className="text-xs text-green-200 mt-1">Cast votes</p>
            </div>

            <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-100">Total Voters</p>
                <Users className="text-blue-200" size={24} />
              </div>
              <p className="text-4xl font-bold">{totalVoters}</p>
              <p className="text-xs text-blue-200 mt-1">Registered voters</p>
            </div>

            <div className="bg-linear-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-100">Voted</p>
                <TrendingUp className="text-green-200" size={24} />
              </div>
              <p className="text-4xl font-bold">{votedCount}</p>
              <p className="text-xs text-green-200 mt-1">Voters participated</p>
            </div>

            <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-orange-100">Turnout Rate</p>
                <Award className="text-orange-200" size={24} />
              </div>
              <p className="text-4xl font-bold">{turnoutRate}%</p>
              <p className="text-xs text-orange-200 mt-1">Participation rate</p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-green-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No Results Yet
              </h3>
              <p className="text-gray-600">
                Results will appear here once voting begins
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-8">
              {Object.entries(groupedCandidates).map(([positionName, positionCandidates]) => {
                const positionTotal = positionCandidates.reduce((sum, c) => sum + c.voteCount, 0);

                return (
                  <div key={positionName} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">{positionName}</h2>
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        Total: {positionTotal} votes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {positionCandidates.map((candidate, index) => {
                        const percentage = positionTotal > 0 
                          ? ((candidate.voteCount / positionTotal) * 100).toFixed(1)
                          : '0.0';
                        const isWinner = index === 0 && candidate.voteCount > 0;

                        return (
                          <div
                            key={candidate._id}
                            className={`relative p-5 rounded-xl border-2 transition-all hover:shadow-lg ${
                              isWinner
                                ? 'border-green-500 bg-linear-to-br from-green-50 to-white'
                                : 'border-gray-200 bg-white hover:border-green-200'
                            }`}
                          >
                            {isWinner && (
                              <div className="absolute -top-3 -right-3">
                                <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                  <Award size={14} />
                                  Leading
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-4 mb-4">
                              {candidate.image ? (
                                <img
                                  src={candidate.image}
                                  alt={candidate.name}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-green-200"
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                  <User className="text-green-600" size={32} />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">
                                  {candidate.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  Rank #{index + 1}
                                </p>
                              </div>
                            </div>

                            {/* Vote Count */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold text-green-600">
                                  {candidate.voteCount}
                                </span>
                                <span className="text-lg font-semibold text-gray-600">
                                  {percentage}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">
                                {candidate.voteCount === 1 ? 'vote' : 'votes'}
                              </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-700 ease-out ${
                                  isWinner 
                                    ? 'bg-linear-to-r from-green-600 to-green-400' 
                                    : 'bg-linear-to-r from-gray-400 to-gray-300'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="space-y-8">
              {Object.entries(groupedCandidates).map(([positionName, positionCandidates]) => {
                const positionTotal = positionCandidates.reduce((sum, c) => sum + c.voteCount, 0);

                return (
                  <div key={positionName} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="bg-linear-to-r from-green-600 to-green-500 p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h2 className="text-xl md:text-2xl font-bold text-white">{positionName}</h2>
                        <span className="text-xs md:text-sm text-green-100 bg-green-700 px-3 py-1 rounded-full w-fit">
                          Total: {positionTotal} votes
                        </span>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block md:hidden">
                      {positionCandidates.map((candidate, index) => {
                        const percentage = positionTotal > 0 
                          ? ((candidate.voteCount / positionTotal) * 100).toFixed(1)
                          : '0.0';
                        const isWinner = index === 0 && candidate.voteCount > 0;

                        return (
                          <div 
                            key={candidate._id}
                            className={`p-4 border-b last:border-b-0 ${
                              isWinner ? 'bg-green-50' : 'bg-white'
                            }`}
                          >
                            {/* Rank Badge */}
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                isWinner 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                              {isWinner ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                                  <Award size={12} />
                                  Leading
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                                  Trailing
                                </span>
                              )}
                            </div>

                            {/* Candidate Info */}
                            <div className="flex items-center gap-3 mb-3">
                              {candidate.image ? (
                                <img
                                  src={candidate.image}
                                  alt={candidate.name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-green-200"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                  <User className="text-green-600" size={20} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{candidate.name}</p>
                              
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Votes</p>
                                <p className="text-xl font-bold text-green-600">{candidate.voteCount}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Percentage</p>
                                <p className="text-xl font-bold text-gray-700">{percentage}%</p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-700 ease-out ${
                                  isWinner 
                                    ? 'bg-linear-to-r from-green-600 to-green-400' 
                                    : 'bg-linear-to-r from-gray-400 to-gray-300'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-4 px-4 lg:px-6 text-sm font-semibold text-gray-600 whitespace-nowrap">Rank</th>
                            <th className="text-left py-4 px-4 lg:px-6 text-sm font-semibold text-gray-600 whitespace-nowrap">Candidate</th>
                            <th className="text-left py-4 px-4 lg:px-6 text-sm font-semibold text-gray-600 whitespace-nowrap">Votes</th>
                            <th className="text-left py-4 px-4 lg:px-6 text-sm font-semibold text-gray-600 whitespace-nowrap">Percentage</th>
                            <th className="text-left py-4 px-4 lg:px-6 text-sm font-semibold text-gray-600 whitespace-nowrap">Progress</th>
                            <th className="text-left py-4 px-4 lg:px-6 text-sm font-semibold text-gray-600 whitespace-nowrap">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positionCandidates.map((candidate, index) => {
                            const percentage = positionTotal > 0 
                              ? ((candidate.voteCount / positionTotal) * 100).toFixed(1)
                              : '0.0';
                            const isWinner = index === 0 && candidate.voteCount > 0;

                            return (
                              <tr 
                                key={candidate._id} 
                                className={`border-t transition-colors ${
                                  isWinner ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                                }`}
                              >
                                <td className="py-4 px-4 lg:px-6">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                                    isWinner 
                                      ? 'bg-green-600 text-white' 
                                      : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className="py-4 px-4 lg:px-6">
                                  <div className="flex items-center gap-3">
                                    {candidate.image ? (
                                      <img
                                        src={candidate.image}
                                        alt={candidate.name}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-green-200 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <User className="text-green-600" size={24} />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-900">{candidate.name}</p>
                                      
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 lg:px-6">
                                  <span className="text-xl lg:text-2xl font-bold text-green-600">
                                    {candidate.voteCount}
                                  </span>
                                </td>
                                <td className="py-4 px-4 lg:px-6">
                                  <span className="text-base lg:text-lg font-semibold text-gray-700">
                                    {percentage}%
                                  </span>
                                </td>
                                <td className="py-4 px-4 lg:px-6">
                                  <div className="w-full max-w-50">
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-700 ease-out ${
                                          isWinner 
                                            ? 'bg-linear-to-r from-green-600 to-green-400' 
                                            : 'bg-linear-to-r from-gray-400 to-gray-300'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 lg:px-6">
                                  {isWinner ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full whitespace-nowrap">
                                      <Award size={14} />
                                      Leading
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-600 text-sm font-medium rounded-full whitespace-nowrap">
                                      Trailing
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}