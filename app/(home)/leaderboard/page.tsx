"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  Medal,
  Grid3x3,
  List,
  Download,
  Search,
  Crown,
  ArrowLeft,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Category {
  _id: string;
  name: string;
}

interface NomineeResult {
  _id: string;
  nomineeId: {
    _id: string;
    name: string;
    image: string;
  };
  categoryId: {
    _id: string;
    name: string;
  };
  totalVotes: number;
  totalAmount: number;
  voteCount: number;
  rank: number;
}

export default function LeaderboardPage() {
  const searchParams = useSearchParams();
  const awardId = searchParams.get("awardId");

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [results, setResults] = useState<NomineeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [awardName, setAwardName] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (awardId) {
      fetchAwardDetails();
      fetchCategories();
      fetchResults(true); // Initial load with loading state

      // Set up interval for real-time updates
      const interval = setInterval(() => {
        fetchResults(false); // Background updates without loading state
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [awardId, selectedCategory]);

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

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/public/categories?awardId=${awardId}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchResults = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }
    
    try {
      const url =
        selectedCategory === "all"
          ? `/api/public/nominees?awardId=${awardId}`
          : `/api/public/nominees?categoryId=${selectedCategory}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const resultsArray = (data.nominees || [])
          .map((nominee: any) => ({
            _id: nominee._id,
            nomineeId: {
              _id: nominee._id,
              name: nominee.name,
              image: nominee.image || "",
            },
            categoryId: {
              _id: nominee.categoryId,
              name: nominee.categoryName || "Unknown",
            },
            totalVotes: nominee.voteCount || 0,
            totalAmount: 0,
            voteCount: nominee.voteCount || 0,
            rank: 0,
          }))
          .sort((a: any, b: any) => b.totalVotes - a.totalVotes)
          .map((result: any, index: number) => ({
            ...result,
            rank: index + 1,
          }));

        setResults(resultsArray);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setIsUpdating(false);
      }
    }
  };

  const filteredResults = results.filter(
    (result) =>
      result.nomineeId?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      result.categoryId?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-7 h-7 text-gray-400" />;
      case 3:
        return <Medal className="w-7 h-7 text-orange-600" />;
      default:
        return (
          <span className="text-2xl font-bold text-gray-400">#{rank}</span>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-green-600 to-green-600";
      case 2:
        return "from-green-600 to-green-600";
      case 3:
        return "from-green-600 to-green-600";
      default:
        return "from-green-600 to-green-600";
    }
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">🏆 {awardName}</h1>
            <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Nominee
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-200 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-green-600">
                  {filteredResults.length}
                </span>{" "}
                results
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {isUpdating && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Updating...</span>
                  </div>
                )}
                {!isUpdating && isMounted && (
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No results yet
            </h3>
            <p className="text-gray-500">
              Votes will appear here once voting starts
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <GridView
            results={filteredResults}
            getRankIcon={getRankIcon}
            getRankColor={getRankColor}
          />
        ) : (
          <TableView results={filteredResults} getRankIcon={getRankIcon} />
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

function GridView({
  results,
  getRankIcon,
  getRankColor,
}: {
  results: NomineeResult[];
  getRankIcon: (rank: number) => React.ReactNode;
  getRankColor: (rank: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {results.map((result, index) => (
        <div
          key={result._id}
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className={`bg-linear-to-r ${getRankColor(result.rank)} p-6 text-center transition-all duration-500`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              {getRankIcon(result.rank)}
            </div>
            {result.rank <= 3 && (
              <span className="text-white font-bold text-lg">
                {result.rank === 1
                  ? "🥇 Champion"
                  : result.rank === 2
                    ? "🥈 Runner-up"
                    : "🥉 Third Place"}
              </span>
            )}
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              {result.nomineeId?.image && (
                <img
                  src={result.nomineeId.image}
                  alt={result.nomineeId.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg -mt-16 mb-4 transition-transform duration-300 hover:scale-110"
                />
              )}
              <h3 className="font-bold text-xl text-gray-900 mb-1">
                {result.nomineeId?.name || "Unknown"}
              </h3>
              <p className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {result.categoryId?.name || "N/A"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-green-50 to-green-100 rounded-lg transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Total Votes
                  </span>
                </div>
                <span className="text-2xl font-bold text-green-600 transition-all duration-500">
                  {result.totalVotes.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-linear-to-r from-purple-50 to-purple-100 rounded-lg transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Supporters
                  </span>
                </div>
                <span className="text-2xl font-bold text-purple-600 transition-all duration-500">
                  {result.voteCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({
  results,
  getRankIcon,
}: {
  results: NomineeResult[];
  getRankIcon: (rank: number) => React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-linear-to-r from-green-600 to-green-500 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase">
                Rank
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase">
                Nominee
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold uppercase">
                Category
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold uppercase">
                Total Votes
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold uppercase">
                Supporters
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.map((result, index) => (
              <tr
                key={result._id}
                className={`hover:bg-gray-50 transition-all duration-300 animate-fade-in ${
                  result.rank <= 3
                    ? "bg-yellow-50/50"
                    : index % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50/50"
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRankIcon(result.rank)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {result.nomineeId?.image && (
                      <img
                        src={result.nomineeId.image}
                        alt={result.nomineeId.name}
                        className="w-12 h-12 rounded-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    )}
                    <span className="font-semibold text-gray-900 text-lg">
                      {result.nomineeId?.name || "Unknown"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    {result.categoryId?.name || "N/A"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-2xl font-bold text-green-600 transition-all duration-500">
                    {result.totalVotes.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-lg font-semibold text-purple-600 transition-all duration-500">
                    {result.voteCount.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
