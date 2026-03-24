"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ArrowLeft, Users, RefreshCw, LayoutGrid, List } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Category {
  _id: string;
  name: string;
}

interface Stage {
  _id: string;
  name: string;
  status: "upcoming" | "active" | "completed";
  order: number;
  startDate: string;
  endDate: string;
}

interface NomineeResult {
  _id: string;
  nomineeId: { _id: string; name: string; image: string };
  categoryId: { _id: string; name: string };
  totalVotes: number;
  totalAmount: number;
  voteCount: number;
  rank: number;
}
function ordinal(n: number) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `#${n}`;
}

const TOP3_COLORS = {
  1: { rank: "text-green-600", bar: "bg-green-600", border: "border-l-green-600" },
  2: { rank: "text-slate-400",  bar: "bg-slate-400",  border: "border-l-slate-400"  },
  3: { rank: "text-orange-600", bar: "bg-orange-500", border: "border-l-orange-500" },
} as const;

function Avatar({ src, name, size = "md" }: { src: string; name: string; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "w-9 h-9 text-xs", md: "w-12 h-12 text-sm", lg: "w-16 h-16 text-base" }[size];
  if (src) {
    return <img src={src} alt={name} className={`${cls} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0`}>
      {name?.[0] || "?"}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0">
      <div className="w-8 h-4 bg-slate-200 rounded" />
      <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-2/5" />
        <div className="h-3 bg-slate-200 rounded w-1/4" />
      </div>
      <div className="h-5 w-20 bg-slate-200 rounded" />
    </div>
  );
}

function FeaturedCard({ result, maxVotes }: { result: NomineeResult; maxVotes: number }) {
  const pct = maxVotes > 0 ? Math.round((result.totalVotes / maxVotes) * 100) : 0;
  const cfg = TOP3_COLORS[result.rank as 1 | 2 | 3];
  const isFirst = result.rank === 1;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center p-5 gap-3 ${
        isFirst ? "ring-1 ring-green-600" : ""
      }`}
    >
      {/* Rank label */}
      <span className={`text-sm font-bold tracking-wide ${cfg.rank}`}>
        {ordinal(result.rank)} Place
      </span>

      {/* Avatar */}
      <Avatar
        src={result.nomineeId?.image}
        name={result.nomineeId?.name}
        size="lg"
      />

      {/* Name */}
      <div>
        <p className="font-bold text-slate-900 text-base leading-snug">
          {result.nomineeId?.name || "Unknown"}
        </p>
        <span className="inline-block mt-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {result.categoryId?.name || "—"}
        </span>
      </div>

      {/* Vote count */}
      <p className="text-2xl font-black text-slate-800 leading-none">
        {result.totalVotes.toLocaleString()}
        <span className="text-xs font-normal text-slate-400 ml-1">votes</span>
      </p>

      {/* Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ${cfg.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400">{pct}%</span>
    </div>
  );
}

// ─── ranked row (rank 4+) ────────────────────────────────────────────────────

function RankRow({ result, maxVotes }: { result: NomineeResult; maxVotes: number }) {
  const pct = maxVotes > 0 ? Math.round((result.totalVotes / maxVotes) * 100) : 0;

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
      {/* Rank number */}
      <span className="w-7 text-right text-sm font-semibold text-slate-400 shrink-0">
        {result.rank}
      </span>

      <Avatar src={result.nomineeId?.image} name={result.nomineeId?.name} size="sm" />

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-slate-800 truncate">
            {result.nomineeId?.name || "Unknown"}
          </span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
            {result.categoryId?.name || "—"}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1">
          <div
            className="bg-green-500 h-1 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Votes */}
      <div className="text-right shrink-0">
        <span className="text-sm font-bold text-slate-800">
          {result.totalVotes.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400 ml-1 hidden sm:inline">votes</span>
      </div>
    </div>
  );
}

// ─── list row for top-3 (used in full list view) ─────────────────────────────

function Top3Row({ result, maxVotes }: { result: NomineeResult; maxVotes: number }) {
  const pct = maxVotes > 0 ? Math.round((result.totalVotes / maxVotes) * 100) : 0;
  const cfg = TOP3_COLORS[result.rank as 1 | 2 | 3];

  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 border-l-4 ${cfg.border} bg-white`}
    >
      {/* Rank */}
      <span className={`w-10 text-sm font-bold shrink-0 ${cfg.rank}`}>
        {ordinal(result.rank)}
      </span>

      <Avatar src={result.nomineeId?.image} name={result.nomineeId?.name} size="md" />

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-bold text-slate-900 truncate">
            {result.nomineeId?.name || "Unknown"}
          </span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
            {result.categoryId?.name || "—"}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${cfg.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Votes */}
      <div className="text-right shrink-0">
        <p className="text-base font-black text-slate-800">
          {result.totalVotes.toLocaleString()}
        </p>
        <p className="text-xs text-slate-400">{pct}%</p>
      </div>
    </div>
  );
}

// ─── grid card ────────────────────────────────────────────────────────────────

function GridCard({ result, maxVotes }: { result: NomineeResult; maxVotes: number }) {
  const pct = maxVotes > 0 ? Math.round((result.totalVotes / maxVotes) * 100) : 0;
  const isTop3 = result.rank <= 3;
  const cfg = isTop3 ? TOP3_COLORS[result.rank as 1 | 2 | 3] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      {/* Rank + category row */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-bold ${cfg ? cfg.rank : "text-slate-400"}`}>
          {ordinal(result.rank)} {result.rank <= 3 ? "Place" : ""}
        </span>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-30">
          {result.categoryId?.name || "—"}
        </span>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <Avatar src={result.nomineeId?.image} name={result.nomineeId?.name} size="md" />
        <p className="font-bold text-slate-800 text-sm leading-snug truncate">
          {result.nomineeId?.name || "Unknown"}
        </p>
      </div>

      {/* Votes */}
      <div>
        <p className="text-xl font-black text-slate-800">
          {result.totalVotes.toLocaleString()}
          <span className="text-xs font-normal text-slate-400 ml-1">votes</span>
        </p>
        {result.voteCount > 0 && (
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Users className="w-3 h-3" />
            {result.voteCount.toLocaleString()} supporters
          </p>
        )}
      </div>

      {/* Bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ${cfg ? cfg.bar : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const awardId = searchParams.get("awardId");

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [categories, setCategories] = useState<Category[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStage, setSelectedStage] = useState("current");
  const [results, setResults] = useState<NomineeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [awardName, setAwardName] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!awardId) return;
    fetchAwardDetails();
    fetchCategories();
    fetchStages();
    fetchResults(true);
    const interval = setInterval(() => fetchResults(false), 5000);
    return () => clearInterval(interval);
  }, [awardId, selectedCategory, selectedStage]);

  async function fetchAwardDetails() {
    try {
      const res = await fetch(`/api/public/awards?search=${awardId}`);
      if (res.ok) {
        const data = await res.json();
        const award = data.awards?.find((a: any) => a._id === awardId);
        if (award) setAwardName(award.name);
      }
    } catch {}
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/public/categories?awardId=${awardId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {}
  }

  async function fetchStages() {
    try {
      const res = await fetch(`/api/stages?awardId=${awardId}`);
      if (res.ok) {
        const data = await res.json();
        const list: Stage[] = data.data || [];
        setStages(list);
        const active = list.find((s) => s.status === "active");
        if (active && selectedStage === "current") setSelectedStage(active._id);
      }
    } catch {}
  }

  async function fetchResults(showLoading = false) {
    showLoading ? setLoading(true) : setIsUpdating(true);
    try {
      let url = `/api/leaderboard/${awardId}?`;
      if (selectedStage && selectedStage !== "current" && selectedStage !== "all") {
        url += `stageId=${selectedStage}&`;
      }
      if (selectedCategory !== "all") url += `categoryId=${selectedCategory}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.data || []).map((item: any, i: number) => ({
          _id: item.nomineeId || item._id,
          nomineeId: {
            _id: item.nomineeId || item._id,
            name: item.nomineeName || item.name,
            image: item.nomineeImage || item.image || "",
          },
          categoryId: {
            _id: item.categoryId || "",
            name: item.categoryName || "Unknown",
          },
          totalVotes: item.voteCount || 0,
          totalAmount: 0,
          voteCount: item.supporterCount || 0,
          rank: i + 1,
        }));
        setResults(mapped);
        setLastUpdated(new Date());
      }
    } catch {}
    finally {
      showLoading ? setLoading(false) : setIsUpdating(false);
    }
  }

  const filtered = results.filter(
    (r) =>
      r.nomineeId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.categoryId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = filtered.slice(0, 3);
  const rest  = filtered.slice(3);
  const maxVotes = filtered[0]?.totalVotes || 1;

  const activeStage = stages.find((s) => s._id === selectedStage && s.status === "active");
  const isLive = !selectedStage || selectedStage === "all" || selectedStage === "current" || !!activeStage;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── nav ────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/images/logo.png" alt="Pawavotes" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-green-600 text-base hidden sm:block">Pawavotes</span>
          </Link>

          <div className="flex items-center gap-3">
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Live
              </span>
            )}
            <Link href="/find-vote" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Awards</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── title ─────────────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {awardName || "Leaderboard"}
          </h1>
          <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
            <span>{filtered.length} nominees</span>
            {isMounted && (
              <span className="flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${isUpdating ? "animate-spin text-green-500" : ""}`} />
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {stages.length > 0 && (
              <Link
                href={`/leaderboard/history?awardId=${awardId}`}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Stage history →
              </Link>
            )}
          </div>
        </div>

        {/* ── filters ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div className={`grid grid-cols-1 ${stages.length > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
            {stages.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Stages</option>
                  {stages.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}{s.status === "active" ? " · Active" : s.status === "completed" ? " · Ended" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search nominee..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* view toggle */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{filtered.length}</span> result{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1.5 ${
                  viewMode === "list" ? "bg-white shadow-sm text-green-600 font-medium" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1.5 ${
                  viewMode === "grid" ? "bg-white shadow-sm text-green-600 font-medium" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Grid
              </button>
            </div>
          </div>
        </div>

        {/* ── results ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
            <p className="text-4xl mb-3">🏁</p>
            <h3 className="font-bold text-slate-700 mb-1">No results yet</h3>
            <p className="text-sm text-slate-400">Votes will appear here once voting starts</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <GridCard key={r._id} result={r} maxVotes={maxVotes} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top 3 featured cards — only when not searching */}
            {!searchQuery && top3.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Top 3
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {top3.map((r) => (
                    <FeaturedCard key={r._id} result={r} maxVotes={maxVotes} />
                  ))}
                </div>
              </div>
            )}

            {/* The rest as a ranked list */}
            {(rest.length > 0 || searchQuery) && (
              <div>
                {!searchQuery && rest.length > 0 && (
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    All Rankings
                  </p>
                )}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* When searching, show all; otherwise top-3 already shown above, show rest */}
                  {(searchQuery ? filtered : filtered).map((r) => {
                    if (!searchQuery && r.rank <= 3) return null;
                    return r.rank <= 3
                      ? <Top3Row key={r._id} result={r} maxVotes={maxVotes} />
                      : <RankRow key={r._id} result={r} maxVotes={maxVotes} />;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── footer ────────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Pawavotes — Built for trust & transparency in Africa.
        </div>
      </footer>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <div className="h-14 bg-white border-b border-slate-200" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-3">
            <div className="h-8 bg-slate-200 rounded w-56 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          </div>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
