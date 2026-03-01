"use client";

import { motion } from "framer-motion";
import { Shield, Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

const PrivacyPolicy = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-r from-green-600 to-green-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Shield size={40} />
              <h1 className="text-4xl md:text-5xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-blue-100 text-lg">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-8 md:p-12 space-y-8"
        >
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              At Pawavotes, we are committed to protecting your privacy and ensuring the security of your personal 
              information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our voting platform and services.
            </p>
            <p className="text-gray-700 leading-relaxed">
              By using Pawavotes, you agree to the collection and use of information in accordance with this policy. 
              If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">2.1 Personal Information</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Name and contact information (email address, phone number)</li>
              <li>Organization details (for event organizers)</li>
              <li>Payment information (processed securely through Paystack)</li>
              <li>Profile information and photos (for nominees)</li>
              <li>Voter credentials and authentication data</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              When you access our Service, we automatically collect:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Device information (IP address, browser type, operating system)</li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Location data (approximate location based on IP address)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">2.3 Voting Information</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We collect information related to your voting activities:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Votes cast and voting preferences</li>
              <li>Voting timestamps and patterns</li>
              <li>Transaction records for paid votes</li>
              <li>Nomination submissions and supporting materials</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>To provide, maintain, and improve our voting services</li>
              <li>To process votes and ensure voting integrity</li>
              <li>To process payments and prevent fraud</li>
              <li>To send you notifications about voting events and results</li>
              <li>To communicate with you about your account and our services</li>
              <li>To analyze usage patterns and optimize user experience</li>
              <li>To comply with legal obligations and enforce our Terms of Service</li>
              <li>To detect and prevent security threats and fraudulent activities</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.1 With Event Organizers</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We share voting data and analytics with event organizers to help them manage their events and understand 
              voting patterns. This may include aggregate voting statistics and voter demographics.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.2 With Service Providers</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We work with third-party service providers who perform services on our behalf:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Payment processors (Paystack) for secure payment processing</li>
              <li>SMS providers for sending voter credentials and notifications</li>
              <li>Cloud hosting providers for data storage and processing</li>
              <li>Analytics providers to understand service usage</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">4.3 Legal Requirements</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may disclose your information if required by law or in response to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Legal processes or government requests</li>
              <li>Enforcement of our Terms of Service</li>
              <li>Protection of our rights, property, or safety</li>
              <li>Investigation of fraud or security issues</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Employee training on data protection practices</li>
              <li>Incident response procedures for data breaches</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive 
              to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We retain your personal information for as long as necessary to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide our services and fulfill the purposes described in this policy</li>
              <li>Comply with legal obligations and resolve disputes</li>
              <li>Maintain voting records for audit and verification purposes</li>
              <li>Enforce our agreements and protect our legal rights</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Voting records are typically retained for a minimum of 5 years to ensure transparency and accountability. 
              You may request deletion of your personal information, subject to legal and operational requirements.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
              <li><strong>Objection:</strong> Object to processing of your information for certain purposes</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
              <li><strong>Withdrawal:</strong> Withdraw consent for data processing where consent was given</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              To exercise these rights, please contact us using the information provided at the end of this policy.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Remember your preferences and settings</li>
              <li>Authenticate your identity and maintain sessions</li>
              <li>Analyze usage patterns and improve our services</li>
              <li>Provide personalized content and recommendations</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              You can control cookies through your browser settings. However, disabling cookies may limit your ability 
              to use certain features of our Service.
            </p>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service may contain links to third-party websites or services. We are not responsible for the privacy 
              practices of these third parties. We encourage you to review their privacy policies before providing any 
              personal information.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal 
              information from children. If you believe we have collected information from a child, please contact us 
              immediately so we can delete such information.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than Ghana. We ensure that such 
              transfers comply with applicable data protection laws and that appropriate safeguards are in place to 
              protect your information.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
              the new policy on this page and updating the "Last updated" date. We encourage you to review this policy 
              periodically for any changes.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className=" p-6 rounded-lg space-y-2 text-gray-700">
              <p><strong>Email:</strong> pawavotes@gmail.com</p>
              <p><strong>Phone:</strong> +233 55 273 2025 / +233 54 319 4406</p>
              <p><strong>Address:</strong> Asafo, O.A Street, Kumasi, Ghana</p>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <div className="flex items-start gap-3">
                <Lock className="text-blue-600 shrink-0 mt-1" size={20} />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Your Privacy Matters</p>
                  <p className="text-blue-800 text-sm">
                    We are committed to protecting your privacy and handling your data responsibly. 
                    If you have any concerns, please don't hesitate to reach out to us.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>© {new Date().getFullYear()} Pawavotes. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-blue-600 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
