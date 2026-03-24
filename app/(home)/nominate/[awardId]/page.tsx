"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import PublicNav from "@/components/PublicNav";
import NominationModal from "@/components/NominationModal";

interface Award {
  _id: string;
  name: string;
  organizationName: string;
  banner?: string;
  logo?: string;
  description?: string;
  nomination?: {
    enabled: boolean;
    type: "free" | "fixed" | "category";
    fixedPrice?: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
  status: string;
}

interface Category {
  _id: string;
  name: string;
  description?: string;
  price?: number;
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-14 bg-slate-100 border-b border-slate-200 animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 bg-slate-200 rounded w-32" />
          <div className="h-8 bg-slate-200 rounded w-72" />
          <div className="h-4 bg-slate-200 rounded w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  open,
  onSelect,
}: {
  category: Category;
  open: boolean;
  onSelect: (c: Category) => void;
}) {
  return (
    <button
      onClick={() => onSelect(category)}
      disabled={!open}
      className={`group w-full text-left rounded-xl border transition-all duration-150 p-5 ${
        open
          ? "border-slate-200 hover:border-green-500 hover:shadow-sm bg-white cursor-pointer"
          : "border-slate-100 bg-slate-50 cursor-not-allowed opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            open ? "bg-green-50 group-hover:bg-green-100" : "bg-slate-100"
          } transition-colors`}
        >
          <Users className={`w-4 h-4 ${open ? "text-green-600" : "text-slate-400"}`} />
        </div>

        {category.price && category.price > 0 ? (
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
            GHS {category.price}
          </span>
        ) : (
          <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg shrink-0">
            Free
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1">
            {category.name}
          </h3>
          {category.description && (
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
        {open && (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-500 shrink-0 mt-0.5 transition-colors" />
        )}
      </div>
    </button>
  );
}

// ─── steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  "Choose a category below",
  "Fill in the nominee's details and upload a photo",
  "Submit — our team reviews your nomination",
  "Approved nominees get a unique code",
  "You'll be notified by email once approved",
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PublicNominationPage() {
  const params = useParams();
  const router = useRouter();
  const awardId = params.awardId as string;

  const [award, setAward] = useState<Award | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [nominationModalOpen, setNominationModalOpen] = useState(false);

  useEffect(() => {
    if (awardId) fetchAwardAndCategories();
  }, [awardId]);

  async function fetchAwardAndCategories() {
    try {
      setLoading(true);
      const [awardRes, catRes] = await Promise.all([
        fetch(`/api/public/awards/${awardId}`),
        fetch(`/api/public/categories?awardId=${awardId}`),
      ]);

      const awardData = await awardRes.json();
      if (!awardData.success) {
        toast.error("Award not found");
        router.push("/find-vote");
        return;
      }
      setAward(awardData.award);

      const catData = await catRes.json();
      if (catData.success) setCategories(catData.categories);
    } catch {
      toast.error("Failed to load nomination page");
    } finally {
      setLoading(false);
    }
  }

  function isNominationOpen() {
    if (!award?.nomination?.enabled) return false;
    const now = new Date();
    if (award.nomination.startDate && award.nomination.endDate) {
      const start = new Date(award.nomination.startDate);
      const end   = new Date(award.nomination.endDate);
      if (award.nomination.startTime) {
        const [h, m] = award.nomination.startTime.split(":");
        start.setHours(+h, +m, 0, 0);
      }
      if (award.nomination.endTime) {
        const [h, m] = award.nomination.endTime.split(":");
        end.setHours(+h, +m, 0, 0);
      }
      return now >= start && now <= end;
    }
    return false;
  }

  function handleCategorySelect(category: Category) {
    if (!isNominationOpen()) {
      toast.error("Nominations are not currently open");
      return;
    }
    setSelectedCategory(category);
    setNominationModalOpen(true);
  }

  if (loading) return <PageSkeleton />;

  if (!award) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Award not found</h2>
          <p className="text-slate-400 text-sm mb-6">
            This award may have been removed or doesn't exist.
          </p>
          <Link
            href="/find-vote"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Awards
          </Link>
        </div>
      </div>
    );
  }

  const open = isNominationOpen();

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── breadcrumb + back ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href="/find-vote"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Awards
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-500 truncate">{award.name}</span>
        </div>

        {/* ── page header ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {/* Banner */}
          {award.banner && (
            <div className="relative h-44 sm:h-56 w-full">
              <Image
                src={award.banner}
                alt={award.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                {/* Org name */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  {award.organizationName}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                  {award.name}
                </h1>
                <p className="text-sm text-slate-500 mt-1">Nominations</p>
              </div>

              {/* Status badge */}
              {open ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full shrink-0">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  Nominations open
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full shrink-0">
                  Nominations closed
                </span>
              )}
            </div>

            {award.description && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                {award.description}
              </p>
            )}
          </div>
        </div>

        {/* ── closed notice ─────────────────────────────────────────────────── */}
        {!open && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            <span className="text-lg">⏳</span>
            <span>
              Nominations for this award are currently closed. Check back when they reopen.
            </span>
          </div>
        )}

        {/* ── categories ────────────────────────────────────────────────────── */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800">
              {open ? "Pick a category to nominate in" : "Available categories"}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"} available
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center">
              <p className="text-slate-400 text-sm">No categories available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <CategoryCard
                  key={cat._id}
                  category={cat}
                  open={open}
                  onSelect={handleCategorySelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── how it works ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
          <h2 className="text-sm font-bold text-slate-700 mb-5">How nominations work</h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-600 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>

      {/* ── footer ────────────────────────────────────────────────────────────── */}
      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} Pawavotes — Built for trust & transparency in Africa.
        </div>
      </footer>

      {/* ── modal ─────────────────────────────────────────────────────────────── */}
      {award && selectedCategory && (
        <NominationModal
          isOpen={nominationModalOpen}
          onClose={() => {
            setNominationModalOpen(false);
            setSelectedCategory(null);
          }}
          awardId={award._id}
          categoryId={selectedCategory._id}
          categoryName={selectedCategory.name}
          awardName={award.name}
          nominationType={award.nomination?.type || "free"}
          nominationFixedPrice={award.nomination?.fixedPrice}
          categoryPrice={selectedCategory.price}
        />
      )}
    </div>
  );
}
