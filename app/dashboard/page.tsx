"use client";
import React, { useState, useEffect } from 'react';
import { Trophy, CreditCard, Users, TrendingUp, Award, Vote } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalAwards: number;
  totalPayments: number;
  totalAmount: number;
  totalVotes: number;
  totalNominees: number;
  totalCategories: number;
  recentPayments: Array<{
    _id: string;
    amount: number;
    createdAt: string;
  }>;
}

const DashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAwards: 0,
    totalPayments: 0,
    totalAmount: 0,
    totalVotes: 0,
    totalNominees: 0,
    totalCategories: 0,
    recentPayments: [],
  });
  const [loading, setLoading] = useState(true);
  const [votingVelocity, setVotingVelocity] = useState<Array<{ day: number; votes: number }>>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch awards
      const awardsResponse = await fetch("/api/awards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let totalAwards = 0;
      let totalCategories = 0;
      let totalNominees = 0;
      let totalVotes = 0;
      let allPayments: any[] = [];
      let allVotingPayments: any[] = [];
      
      if (awardsResponse.ok) {
        const awardsData = await awardsResponse.json();
        const awards = awardsData.data || [];
        totalAwards = awards.length;
        
        // Fetch data for ALL awards in parallel instead of sequentially
        const results = await Promise.all(
          awards.map(async (award: any) => {
            const headers = { Authorization: `Bearer ${token}` };
            
            // Fire all 4 requests for this award simultaneously
            const [categoriesRes, nomineesRes, paymentsRes, votesRes] = await Promise.all([
              fetch(`/api/categories?awardId=${award._id}`, { headers }),
              fetch(`/api/nominees?awardId=${award._id}`, { headers }),
              fetch(`/api/payments?awardId=${award._id}`),
              fetch(`/api/votes?awardId=${award._id}`, { headers }),
            ]);
            
            const [categoriesData, nomineesData, paymentsData, votesData] = await Promise.all([
              categoriesRes.ok ? categoriesRes.json() : { data: [] },
              nomineesRes.ok ? nomineesRes.json() : { data: [] },
              paymentsRes.ok ? paymentsRes.json() : { data: [] },
              votesRes.ok ? votesRes.json() : { data: [] },
            ]);
            
            const nominees = nomineesData.data || [];
            return {
              categories: (categoriesData.data || []).length,
              nominees: nominees.length,
              votes: nominees.reduce((sum: number, n: any) => sum + (n.voteCount || 0), 0),
              payments: paymentsData.data || [],
              votingPayments: votesData.data || [],
            };
          })
        );
        
        // Aggregate results
        for (const result of results) {
          totalCategories += result.categories;
          totalNominees += result.nominees;
          totalVotes += result.votes;
          allPayments = [...allPayments, ...result.payments];
          allVotingPayments = [...allVotingPayments, ...result.votingPayments];
        }
      }
      
      // Calculate total amount from both nomination and voting payments
      const nominationAmount = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const votingAmount = allVotingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = nominationAmount + votingAmount;

      // Combine all payments for velocity calculation
      const combinedPayments = [
        ...allPayments.map(p => ({ ...p, type: 'nomination' })),
        ...allVotingPayments.map(p => ({ ...p, type: 'voting', voteCount: p.numberOfVotes }))
      ];
      
      // Calculate voting velocity (last 7 days)
      const velocity = calculateVotingVelocity(combinedPayments);
      setVotingVelocity(velocity);
      
      setStats({
        totalAwards,
        totalPayments: allPayments.length + allVotingPayments.length,
        totalAmount,
        totalVotes,
        totalNominees,
        totalCategories,
        recentPayments: combinedPayments.slice(0, 10),
      });
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  const calculateVotingVelocity = (payments: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });
    
    return last7Days.map((date, index) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const dayVotes = payments
        .filter(p => {
          const paymentDate = new Date(p.createdAt);
          return paymentDate >= date && paymentDate < nextDay;
        })
        .reduce((sum, p) => sum + (p.voteCount || 0), 0);
      
      return { day: index, votes: dayVotes };
    });
  };

  // Chart rendering logic
  const width = 500;
  const height = 300;
  const padding = 40;
  const maxVotes = Math.max(...votingVelocity.map(d => d.votes), 100);

  const createPath = () => {
    if (votingVelocity.length === 0) return "";
    
    const xScale = (width - padding * 2) / (votingVelocity.length - 1);
    const yScale = (height - padding * 2) / maxVotes;

    const points = votingVelocity.map((point, index) => {
      const x = padding + index * xScale;
      const y = height - padding - point.votes * yScale;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const peakPoint = votingVelocity.reduce((max, point) => 
    point.votes > max.votes ? point : max, 
    { day: 0, votes: 0 }
  );
  
  const xScale = votingVelocity.length > 1 ? (width - padding * 2) / (votingVelocity.length - 1) : 0;
  const yScale = maxVotes > 0 ? (height - padding * 2) / maxVotes : 0;
  const peakX = padding + peakPoint.day * xScale;
  const peakY = height - padding - peakPoint.votes * yScale;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1 text-xs sm:text-sm md:text-base">
            Manage your public voting campaigns and track performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {/* Total Awards */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Trophy className="text-green-600" size={16} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">Total Awards Created</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalAwards}</p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard className="text-purple-600" size={16} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 wrap-break-word">
              GHS {stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Total Votes */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-pink-100 rounded-lg flex items-center justify-center shrink-0">
                <Users className="text-pink-600" size={16} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">Total Votes Cast</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
              {stats.totalVotes.toLocaleString()}
            </p>
          </div>

          {/* Total Nominees */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Award className="text-blue-600" size={16} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">Total Nominees</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalNominees}</p>
          </div>

          {/* Total Categories */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="text-orange-600" size={16} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">Total Categories</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalCategories}</p>
          </div>

          {/* Total Payments */}
          <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-cyan-100 rounded-lg flex items-center justify-center shrink-0">
                <Vote className="text-cyan-600" size={16} />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mb-1">Total Payments</p>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
          </div>
        </div>

        {/* Voting Velocity Chart */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
          <div className="mb-3 sm:mb-4 md:mb-6">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Voting Velocity</h2>
            <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 mt-1">
              Audience participation volume over the last 7-day cycle.
            </p>
          </div>

          {votingVelocity.length === 0 || maxVotes === 0 ? (
            <div className="text-center py-8 sm:py-12 md:py-20">
              <p className="text-gray-500 text-xs sm:text-sm md:text-base">No voting data available yet</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
              <div className="min-w-87.5 sm:min-w-100">
                <svg 
                  viewBox={`0 0 ${width} ${height}`} 
                  className="w-full h-auto"
                  style={{ maxHeight: '300px' }}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Y-axis labels */}
                  <text x="10" y="50" className="text-[10px] sm:text-xs fill-gray-500">
                    {Math.round(maxVotes)}
                  </text>
                  <text x="10" y="100" className="text-[10px] sm:text-xs fill-gray-500">
                    {Math.round(maxVotes * 0.75)}
                  </text>
                  <text x="10" y="150" className="text-[10px] sm:text-xs fill-gray-500">
                    {Math.round(maxVotes * 0.5)}
                  </text>
                  <text x="10" y="200" className="text-[10px] sm:text-xs fill-gray-500">
                    {Math.round(maxVotes * 0.25)}
                  </text>
                  <text x="20" y="250" className="text-[10px] sm:text-xs fill-gray-500">0</text>

                  {/* Grid lines */}
                  <line x1={padding} y1="40" x2={width - padding} y2="40" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1={padding} y1="90" x2={width - padding} y2="90" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1={padding} y1="140" x2={width - padding} y2="140" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1={padding} y1="190" x2={width - padding} y2="190" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1={padding} y1="240" x2={width - padding} y2="240" stroke="#f3f4f6" strokeWidth="1" />

                  {/* Line chart */}
                  <path
                    d={createPath()}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Peak point marker */}
                  {peakPoint.votes > 0 && (
                    <>
                      <circle
                        cx={peakX}
                        cy={peakY}
                        r="5"
                        fill="#10b981"
                        stroke="white"
                        strokeWidth="2"
                      />

                      <line
                        x1={peakX}
                        y1={peakY}
                        x2={peakX}
                        y2={height - padding}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />

                      <rect
                        x={peakX - 35}
                        y={peakY - 35}
                        width="70"
                        height="25"
                        fill="white"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        rx="4"
                      />
                      <text
                        x={peakX}
                        y={peakY - 17}
                        textAnchor="middle"
                        className="text-[10px] sm:text-xs fill-green-600 font-medium"
                      >
                        Votes: {peakPoint.votes}
                      </text>
                    </>
                  )}

                  {/* X-axis day labels */}
                  {votingVelocity.map((point, index) => {
                    const x = padding + index * xScale;
                    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const today = new Date();
                    const dayIndex = (today.getDay() - 6 + index + 7) % 7;
                    
                    return (
                      <text
                        key={index}
                        x={x}
                        y={height - 10}
                        textAnchor="middle"
                        className="text-[10px] sm:text-xs fill-gray-500"
                      >
                        {dayLabels[dayIndex]}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
