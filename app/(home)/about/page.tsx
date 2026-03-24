import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/PublicNav";
import {
  Shield,
  Heart,
  Users,
  Zap,
  Target,
  Eye,
  CheckCircle,
  Globe,
  ChevronRight,
} from "lucide-react";

// ─── data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { number: "50K+",  label: "Votes cast"     },
  { number: "100+",  label: "Events hosted"  },
  { number: "99.9%", label: "Uptime"         },
  { number: "24/7",  label: "Support"        },
];

const VALUES = [
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "We build trust through complete transparency in every vote cast and every result published.",
  },
  {
    icon: Heart,
    title: "Integrity First",
    description: "Our commitment to electoral integrity drives every decision we make and every feature we build.",
  },
  {
    icon: Users,
    title: "Community Focused",
    description: "We serve communities across Africa, ensuring every voice is heard and every vote counts.",
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "We continuously innovate to make voting more accessible, secure, and efficient for everyone.",
  },
];

const FEATURES = [
  "Secure & encrypted voting system",
  "Real-time results and analytics",
  "USSD voting for accessibility",
  "Multi-stage competition support",
  "Fraud detection & prevention",
  "Audit-ready reporting",
];

const PILLARS = [
  {
    icon: Globe,
    title: "Pan-African Reach",
    description: "Serving communities across Ghana and expanding throughout Africa.",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "End-to-end encryption protecting every vote and every voter.",
  },
  {
    icon: Users,
    title: "24/7 Support",
    description: "A dedicated team ready to assist organizers and voters anytime.",
  },
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      {/* ── page header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-3">
            About Pawavotes
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight max-w-xl mb-4">
            Building trust in Africa's democratic processes
          </h1>
          <p className="text-slate-500 text-base max-w-2xl leading-relaxed mb-8">
            Pawavotes is Africa's most trusted digital voting platform — built for public awards,
            institutional elections, and community decisions. We combine modern technology with
            local accessibility to make every vote count.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Get started <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/find-vote"
              className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Explore events
            </Link>
          </div>
        </div>
      </div>

      {/* ── stats strip ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 sm:divide-x sm:divide-slate-100">
            {STATS.map((s) => (
              <div key={s.label} className="sm:px-8 first:pl-0 last:pr-0 text-center sm:text-left">
                <p className="text-3xl font-black text-slate-900 leading-none">{s.number}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">

        {/* ── mission & vision ─────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-7">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-5">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Our Mission</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              To democratize access to secure, transparent, and verifiable voting systems across
              Africa — ensuring every voice is heard and every vote counts. We're committed to
              building trust in democratic processes through technology.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-7">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-5">
              <Eye className="w-5 h-5 text-slate-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Our Vision</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              To become Africa's leading digital voting platform — setting the standard for
              electoral integrity and transparency. We envision a future where every election,
              award, and community decision is powered by trust and technology.
            </p>
          </div>
        </div>

        {/* ── values ───────────────────────────────────────────────────────── */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Our core values</h2>
            <p className="text-sm text-slate-400 mt-1">The principles that guide everything we do</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="bg-white rounded-xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center mb-4">
                  <v.icon className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-2">{v.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── what we offer ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Left: feature list */}
            <div className="p-7 sm:p-10">
              <h2 className="text-xl font-bold text-slate-900 mb-2">What we offer</h2>
              <p className="text-sm text-slate-400 mb-7 leading-relaxed">
                A comprehensive voting platform designed for the African context — combining
                cutting-edge technology with local accessibility.
              </p>
              <ul className="space-y-3">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-2 mt-8 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Talk to us <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: pillars */}
            <div className="bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-7 sm:p-10 space-y-5">
              {PILLARS.map((p) => (
                <div key={p.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <p.icon className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm mb-1">{p.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 px-7 py-10 sm:px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Ready to get started?</h2>
            <p className="text-sm text-slate-400">
              Join hundreds of organisations using Pawavotes for their voting needs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Contact us <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/find-vote"
              className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:border-slate-300 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Explore events
            </Link>
          </div>
        </div>
      </div>

      {/* ── footer ───────────────────────────────────────────────────────────── */}
      <footer className="mt-4 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Pawavotes" width={28} height={28} />
            <span className="font-bold text-slate-800 text-sm">Pawavotes</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} Pawavotes — Built for trust & transparency in Africa.
          </p>
          <div className="flex gap-5 text-xs text-slate-400">
            <Link href="/privacy"    className="hover:text-slate-700 transition-colors">Privacy</Link>
            <Link href="/terms"      className="hover:text-slate-700 transition-colors">Terms</Link>
            <Link href="/contact-us" className="hover:text-slate-700 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
