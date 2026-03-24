import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import { ChevronRight } from "lucide-react";

// ─── data ─────────────────────────────────────────────────────────────────────

const LAST_UPDATED = "January 1, 2025";

const TOC = [
  "Introduction",
  "Information We Collect",
  "How We Use Your Information",
  "Information Sharing and Disclosure",
  "Data Security",
  "Data Retention",
  "Your Privacy Rights",
  "Cookies and Tracking Technologies",
  "Third-Party Links",
  "Children's Privacy",
  "International Data Transfers",
  "Changes to This Privacy Policy",
  "Contact Us",
];

function Bullet({ children, red }: { children: React.ReactNode; red?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-600">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${red ? "bg-red-300" : "bg-slate-300"}`} />
      {children}
    </li>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />

      {/* ── page header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
            <Link href="/" className="hover:text-slate-600 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600">Privacy Policy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-[220px_1fr] gap-10 items-start">

          {/* ── sidebar ──────────────────────────────────────────────────────── */}
          <aside className="hidden lg:block sticky top-24">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contents</p>
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
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                At Pawavotes, we are committed to protecting your privacy and ensuring the security of
                your personal information. This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our voting platform and services.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                By using Pawavotes, you agree to the collection and use of information in accordance
                with this policy. If you do not agree with our policies and practices, please do not
                use our Service.
              </p>
            </section>

            {/* 2 */}
            <section id="section-2" className="px-6 sm:px-8 py-7 space-y-5">
              <h2 className="text-base font-bold text-slate-900">2. Information We Collect</h2>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">2.1 Personal Information</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="space-y-2">
                  {[
                    "Name and contact information (email address, phone number)",
                    "Organisation details (for event organisers)",
                    "Payment information (processed securely through Paystack)",
                    "Profile information and photos (for nominees)",
                    "Voter credentials and authentication data",
                  ].map((item) => <Bullet key={item}>{item}</Bullet>)}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">2.2 Automatically Collected Information</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  When you access our Service, we automatically collect:
                </p>
                <ul className="space-y-2">
                  {[
                    "Device information (IP address, browser type, operating system)",
                    "Usage data (pages visited, time spent, features used)",
                    "Location data (approximate location based on IP address)",
                    "Cookies and similar tracking technologies",
                  ].map((item) => <Bullet key={item}>{item}</Bullet>)}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">2.3 Voting Information</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  We collect information related to your voting activities:
                </p>
                <ul className="space-y-2">
                  {[
                    "Votes cast and voting preferences",
                    "Voting timestamps and patterns",
                    "Transaction records for paid votes",
                    "Nomination submissions and supporting materials",
                  ].map((item) => <Bullet key={item}>{item}</Bullet>)}
                </ul>
              </div>
            </section>

            {/* 3 */}
            <section id="section-3" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="space-y-2">
                {[
                  "To provide, maintain, and improve our voting services",
                  "To process votes and ensure voting integrity",
                  "To process payments and prevent fraud",
                  "To send you notifications about voting events and results",
                  "To communicate with you about your account and our services",
                  "To analyse usage patterns and optimise user experience",
                  "To comply with legal obligations and enforce our Terms of Service",
                  "To detect and prevent security threats and fraudulent activities",
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
            </section>

            {/* 4 */}
            <section id="section-4" className="px-6 sm:px-8 py-7 space-y-5">
              <h2 className="text-base font-bold text-slate-900">4. Information Sharing and Disclosure</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                We may share your information in the following circumstances:
              </p>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">4.1 With Event Organisers</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We share voting data and analytics with event organisers to help them manage their
                  events and understand voting patterns. This may include aggregate voting statistics
                  and voter demographics.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">4.2 With Service Providers</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  We work with third-party service providers who perform services on our behalf:
                </p>
                <ul className="space-y-2">
                  {[
                    "Payment processors (Paystack) for secure payment processing",
                    "SMS providers for sending voter credentials and notifications",
                    "Cloud hosting providers for data storage and processing",
                    "Analytics providers to understand service usage",
                  ].map((item) => <Bullet key={item}>{item}</Bullet>)}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">4.3 Legal Requirements</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  We may disclose your information if required by law or in response to:
                </p>
                <ul className="space-y-2">
                  {[
                    "Legal processes or government requests",
                    "Enforcement of our Terms of Service",
                    "Protection of our rights, property, or safety",
                    "Investigation of fraud or security issues",
                  ].map((item) => <Bullet key={item}>{item}</Bullet>)}
                </ul>
              </div>
            </section>

            {/* 5 */}
            <section id="section-5" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">5. Data Security</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                We implement appropriate technical and organisational measures to protect your personal
                information:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  "Encryption of data in transit and at rest",
                  "Secure authentication and access controls",
                  "Regular security audits and vulnerability assessments",
                  "Employee training on data protection practices",
                  "Incident response procedures for data breaches",
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
              <p className="text-sm text-slate-600 leading-relaxed">
                However, no method of transmission over the Internet or electronic storage is 100%
                secure. While we strive to protect your information, we cannot guarantee absolute
                security.
              </p>
            </section>

            {/* 6 */}
            <section id="section-6" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">6. Data Retention</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  "Provide our services and fulfil the purposes described in this policy",
                  "Comply with legal obligations and resolve disputes",
                  "Maintain voting records for audit and verification purposes",
                  "Enforce our agreements and protect our legal rights",
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
              <p className="text-sm text-slate-600 leading-relaxed">
                Voting records are typically retained for a minimum of 5 years to ensure transparency
                and accountability. You may request deletion of your personal information, subject to
                legal and operational requirements.
              </p>
            </section>

            {/* 7 */}
            <section id="section-7" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">7. Your Privacy Rights</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  { label: "Access",      desc: "Request a copy of the personal information we hold about you" },
                  { label: "Correction",  desc: "Request correction of inaccurate or incomplete information" },
                  { label: "Deletion",    desc: "Request deletion of your personal information (subject to legal requirements)" },
                  { label: "Objection",   desc: "Object to processing of your information for certain purposes" },
                  { label: "Portability", desc: "Request transfer of your data to another service provider" },
                  { label: "Withdrawal",  desc: "Withdraw consent for data processing where consent was given" },
                ].map(({ label, desc }) => (
                  <li key={label} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    <span><span className="font-semibold text-slate-700">{label}:</span> {desc}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-600 leading-relaxed">
                To exercise these rights, please contact us using the information provided at the end
                of this policy.
              </p>
            </section>

            {/* 8 */}
            <section id="section-8" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">8. Cookies and Tracking Technologies</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="space-y-2 mb-4">
                {[
                  "Remember your preferences and settings",
                  "Authenticate your identity and maintain sessions",
                  "Analyse usage patterns and improve our services",
                  "Provide personalised content and recommendations",
                ].map((item) => <Bullet key={item}>{item}</Bullet>)}
              </ul>
              <p className="text-sm text-slate-600 leading-relaxed">
                You can control cookies through your browser settings. However, disabling cookies may
                limit your ability to use certain features of our Service.
              </p>
            </section>

            {/* 9 */}
            <section id="section-9" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">9. Third-Party Links</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our Service may contain links to third-party websites or services. We are not
                responsible for the privacy practices of these third parties. We encourage you to
                review their privacy policies before providing any personal information.
              </p>
            </section>

            {/* 10 */}
            <section id="section-10" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">10. Children's Privacy</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our Service is not intended for individuals under the age of 18. We do not knowingly
                collect personal information from children. If you believe we have collected
                information from a child, please contact us immediately so we can delete such
                information.
              </p>
            </section>

            {/* 11 */}
            <section id="section-11" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">11. International Data Transfers</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your information may be transferred to and processed in countries other than Ghana. We
                ensure that such transfers comply with applicable data protection laws and that
                appropriate safeguards are in place to protect your information.
              </p>
            </section>

            {/* 12 */}
            <section id="section-12" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">12. Changes to This Privacy Policy</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any
                material changes by posting the new policy on this page and updating the "Last
                updated" date. We encourage you to review this policy periodically for any changes.
              </p>
            </section>

            {/* 13 */}
            <section id="section-13" className="px-6 sm:px-8 py-7">
              <h2 className="text-base font-bold text-slate-900 mb-3">13. Contact Us</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our
                data practices, please contact us:
              </p>
              <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 mb-5">
                {[
                  { label: "Email",   value: "pawavotes@gmail.com"                   },
                  { label: "Phone",   value: "+233 55 273 2025 / +233 54 319 4406"   },
                  { label: "Address", value: "Asafo, O.A Street, Kumasi, Ghana"      },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-4 px-4 py-3">
                    <span className="text-xs font-semibold text-slate-400 w-16 shrink-0 pt-0.5">{label}</span>
                    <span className="text-sm text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                <p className="text-sm text-green-800 leading-relaxed">
                  <span className="font-semibold">Your privacy matters.</span> We are committed to
                  protecting your data responsibly. If you have any concerns, please don't hesitate
                  to reach out.
                </p>
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
