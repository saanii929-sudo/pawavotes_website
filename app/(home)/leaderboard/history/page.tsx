"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  Medal,
  Download,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Stage {
  _id: string;
  name: string;
  status: "upcoming" | "active" | "completed";
  order: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

interface StageResult {
  nomineeId: string;
  nomineeName: string;
  nomineeImage?: string;
  categoryId: string;
  categoryName: string;
  voteCount: number;
  rank: number;
  qualified: boolean;
  lastVoteAt?: string;
}

function HistoryContent() {
  const searchParams = useSearchParams();
  const awardId = searchParams.get("awardId");

  const [stages, setStages] = useState<Stage[]>([]);
  const [stageResults, setStageResults] = useState<Record<string, StageResult[]>>({});
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [awardName, setAwardName] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (awardId) {
      fetchAwardDetails();
      fetchStages();
    }
  }, [awardId]);

  const fetchAwardDetails = async () => {
    try {
      const response = await fetch(`/api/public/awards?search=${awardId}`);
      if (response.ok) {
        const data = await response.json();
        const award = data.awards?.find((a: any) => a._id === awardId);
        if (award) {
          setAwardName(award.name);
        }
      }
    } catch (error) {
      console.error("Failed to fetch award:", error);
    }
  };

  const fetchStages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stages?awardId=${awardId}`);
      if (response.ok) {
        const data = await response.json();
        const completedStages = (data.data || [])
          .filter((s: Stage) => s.status === "completed")
          .sort((a: Stage, b: Stage) => a.order - b.order);
        
        setStages(completedStages);
        
        // Auto-expand the first stage
        if (completedStages.length > 0) {
          setExpandedStages(new Set([completedStages[0]._id]));
          fetchStageResults(completedStages[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStageResults = async (stageId: string) => {
    if (stageResults[stageId]) return; // Already fetched

    try {
      const response = await fetch(`/api/stages/${stageId}/results`);
      if (response.ok) {
        const data = await response.json();
        setStageResults((prev) => ({
          ...prev,
          [stageId]: data.data?.rankings || [],
        }));
      }
    } catch (error) {
      console.error("Failed to fetch stage results:", error);
    }
  };

  const toggleStage = (stageId: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
      fetchStageResults(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const handleExportResults = async (stageId: string, stageName: string) => {
    try {
      const response = await fetch(`/api/stages/${stageId}/results/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${stageName.replace(/\s+/g, "_")}_Results.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export results:", error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              href={`/leaderboard?awardId=${awardId}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Leaderboard</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Stage History
          </h1>
          <p className="text-xl text-gray-600">{awardName}</p>
          <p className="text-sm text-gray-500 mt-2">
            View final results from all completed stages
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : stages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No completed stages yet
            </h3>
            <p className="text-gray-500 mb-6">
              Stage results will appear here once stages are completed
            </p>
            <Link
              href={`/leaderboard?awardId=${awardId}`}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              View Current Leaderboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {stages.map((stage, index) => {
              const isExpanded = expandedStages.has(stage._id);
              const results = stageResults[stage._id] || [];
              const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
              const qualifiedCount = results.filter((r) => r.qualified).length;

              return (
                <div
                  key={stage._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Stage Header */}
                  <div
                    onClick={() => toggleStage(stage._id)}
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 font-bold text-lg">
                          {stage.order}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-gray-900">
                              {stage.name}
                            </h3>
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                              <CheckCircle size={14} />
                              Completed
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(stage.startDate)} - {formatDate(stage.endDate)}
                            </div>
                            {results.length > 0 && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Users size={14} />
                                  {results.length} contestants
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp size={14} />
                                  {totalVotes.toLocaleString()} total votes
                                </div>
                                {qualifiedCount > 0 && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle size={14} />
                                    {qualifiedCount} qualified
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportResults(stage._id, stage.name);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Download size={16} />
                          Export
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stage Results */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {results.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          No results available for this stage
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Rank
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Nominee
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Category
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Total Votes
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {results.map((result, idx) => (
                                <tr
                                  key={result.nomineeId}
                                  className={`hover:bg-gray-50 transition-colors ${
                                    result.rank <= 3 ? "bg-yellow-50/30" : ""
                                  }`}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      {getRankIcon(result.rank)}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      {result.nomineeImage && (
                                        <img
                                          src={result.nomineeImage}
                                          alt={result.nomineeName}
                                          className="w-10 h-10 rounded-full object-cover"
                                        />
                                      )}
                                      <span className="font-semibold text-gray-900">
                                        {result.nomineeName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                      {result.categoryName}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-xl font-bold text-green-600">
                                      {result.voteCount.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    {result.qualified ? (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        <CheckCircle size={14} />
                                        Qualified
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
                                        Eliminated
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Pawavotes. All rights reserved. Built
            for trust and transparency in Africa.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
