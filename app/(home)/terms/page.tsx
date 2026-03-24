import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import { ChevronRight } from "lucide-react";

// ─── data ─────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "January 1, 2025";

const TOC = [
  "Introduction",
  "Acceptance of Terms",
  "Eligibility",
  "Account Registration",
  "Use of Service",
  "Voting and Payments",
  "Intellectual Property",
  "User Content",
  "Disclaimers",
  "Limitation of Liability",
  "Termination",
  "Governing Law",
  "Contact Us",
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      {/* ── page header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-slate-600 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600">Terms of Service</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-[220px_1fr] gap-10 items-start">

          {/* ── sidebar: table of contents ─────────────────────────────────── */}
          <aside className="hidden lg:block sticky top-24">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Contents
            </p>
            <nav className="space-y-1">
              {TOC.map((item, i) => (
                <a
                  key={item}
                  href={`#section-${i + 1}`}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 py-1 transition-colors"
                >
                  <span className="text-slate-300 text-xs w-5 shrink-0">{i + 1}.</span>
                  {item}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── main content ─────────────────────────────────────────────────── */}
          <article className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">

            {/* 1 */}
            <section id="section-1" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Welcome to Pawavotes. These Terms of Service ("Terms") govern your access to and use
                of the Pawavotes platform, including our website, mobile applications, and services
                (collectively, the "Service"). By accessing or using our Service, you agree to be
                bound by these Terms.
              </p>
            </section>

            {/* 2 */}
            <section id="section-2" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">2. Acceptance of Terms</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                By creating an account or using our Service, you acknowledge that you have read,
                understood, and agree to be bound by these Terms and our Privacy Policy. If you do
                not agree to these Terms, you may not access or use the Service.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of any
                material changes via email or through the Service. Your continued use of the Service
                after such modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            {/* 3 */}
            <section id="section-3" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">3. Eligibility</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                You must be at least 18 years old to use our Service. By using the Service, you
                represent and warrant that:
              </p>
              <ul className="space-y-2">
                {[
                  "You are at least 18 years of age",
                  "You have the legal capacity to enter into these Terms",
                  "You will provide accurate and complete information when creating an account",
                  "You will maintain the security of your account credentials",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 4 */}
            <section id="section-4" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">4. Account Registration</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                To access certain features of the Service, you may be required to create an account.
                You agree to:
              </p>
              <ul className="space-y-2">
                {[
                  "Provide accurate, current, and complete information during registration",
                  "Maintain and promptly update your account information",
                  "Maintain the security and confidentiality of your password",
                  "Notify us immediately of any unauthorized use of your account",
                  "Accept responsibility for all activities that occur under your account",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 5 */}
            <section id="section-5" className="px-6 sm:px-8 py-7 space-y-5">
              <h2 className="text-base font-bold text-slate-900">5. Use of Service</h2>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">5.1 Permitted Use</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  You may use the Service for lawful purposes only, including:
                </p>
                <ul className="space-y-2">
                  {[
                    "Creating and managing voting events and awards",
                    "Participating in public voting and institutional elections",
                    "Nominating candidates for awards and recognition",
                    "Viewing results and analytics (where permitted)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">5.2 Prohibited Activities</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">You agree not to:</p>
                <ul className="space-y-2">
                  {[
                    "Manipulate voting results through fraudulent means",
                    "Create multiple accounts to circumvent voting restrictions",
                    "Use automated systems or bots to cast votes",
                    "Interfere with or disrupt the Service or servers",
                    "Attempt to gain unauthorized access to any part of the Service",
                    "Upload or transmit viruses, malware, or malicious code",
                    "Harass, abuse, or harm other users",
                    "Violate any applicable laws or regulations",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-300 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 6 */}
            <section id="section-6" className="px-6 sm:px-8 py-7 space-y-5">
              <h2 className="text-base font-bold text-slate-900">6. Voting and Payments</h2>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">6.1 Voting Process</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Votes cast through the Service are final and cannot be changed or refunded once
                  submitted. You acknowledge that voting is subject to the rules and restrictions
                  set by the event organizer.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">6.2 Payment Terms</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  For paid voting services:
                </p>
                <ul className="space-y-2">
                  {[
                    "All payments are processed securely through our payment partners (Paystack)",
                    "Prices are displayed in Ghana Cedis (GHS) unless otherwise stated",
                    "Payments are non-refundable once votes are successfully cast",
                    "Service fees apply as disclosed at the time of purchase",
                    "You are responsible for any applicable taxes",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 7 */}
            <section id="section-7" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">7. Intellectual Property</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                The Service and its original content, features, and functionality are owned by
                Pawavotes and are protected by international copyright, trademark, patent, trade
                secret, and other intellectual property laws.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                You may not copy, modify, distribute, sell, or lease any part of our Service without
                our prior written permission. You also may not reverse engineer or attempt to extract
                the source code of the Service.
              </p>
            </section>

            {/* 8 */}
            <section id="section-8" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">8. User Content</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                You retain ownership of any content you submit to the Service, including
                nominations, images, and descriptions. By submitting content, you grant Pawavotes a
                worldwide, non-exclusive, royalty-free license to use, reproduce, and display such
                content in connection with the Service.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                You represent and warrant that you own or have the necessary rights to submit your
                content and that your content does not violate any third-party rights or applicable
                laws.
              </p>
            </section>

            {/* 9 */}
            <section id="section-9" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">9. Disclaimers</h2>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-amber-700 leading-relaxed">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                  EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                We do not warrant that the Service will be uninterrupted, secure, or error-free. We
                do not guarantee the accuracy or reliability of any information obtained through the
                Service.
              </p>
            </section>

            {/* 10 */}
            <section id="section-10" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">10. Limitation of Liability</h2>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, PAWAVOTES SHALL NOT BE LIABLE FOR ANY
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
                  PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA,
                  USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
                </p>
              </div>
            </section>

            {/* 11 */}
            <section id="section-11" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">11. Termination</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                We may terminate or suspend your account and access to the Service immediately,
                without prior notice or liability, for any reason, including if you breach these
                Terms.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Upon termination, your right to use the Service will immediately cease. All
                provisions of these Terms that by their nature should survive termination shall
                survive, including ownership provisions, warranty disclaimers, and limitations of
                liability.
              </p>
            </section>

            {/* 12 */}
            <section id="section-12" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">12. Governing Law</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Ghana,
                without regard to its conflict of law provisions. Any disputes arising from these
                Terms or the Service shall be resolved in the courts of Ghana.
              </p>
            </section>

            {/* 13 */}
            <section id="section-13" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">13. Contact Us</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                If you have any questions about these Terms, please reach out:
              </p>
              <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                {[
                  { label: "Email",   value: "pawavotes@gmail.com"                        },
                  { label: "Phone",   value: "+233 55 273 2025 / +233 54 319 4406"        },
                  { label: "Address", value: "Asafo, O.A Street, Kumasi, Ghana"           },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-400 w-16 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </section>

          </article>
        </div>
      </div>

      {/* ── footer ───────────────────────────────────────────────────────────── */}
      <footer className="mt-4 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Pawavotes. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link href="/terms"   className="hover:text-slate-700 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
