"use client";

import { motion } from "framer-motion";
import { Shield, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

const TermsOfService = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-100 hover:text-white mb-6 transition-colors"
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
              <FileText size={40} />
              <h1 className="text-4xl md:text-5xl font-bold">Terms of Service</h1>
            </div>
            <p className="text-green-100 text-lg">
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
            <p className="text-gray-700 leading-relaxed">
              Welcome to Pawavotes. These Terms of Service ("Terms") govern your access to and use of the Pawavotes platform, 
              including our website, mobile applications, and services (collectively, the "Service"). By accessing or using 
              our Service, you agree to be bound by these Terms.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              By creating an account or using our Service, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use 
              the Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes via 
              email or through the Service. Your continued use of the Service after such modifications constitutes your 
              acceptance of the updated Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Eligibility</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You must be at least 18 years old to use our Service. By using the Service, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>You are at least 18 years of age</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You will provide accurate and complete information when creating an account</li>
              <li>You will maintain the security of your account credentials</li>
            </ul>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Account Registration</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              To access certain features of the Service, you may be required to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security and confidentiality of your password</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
          </section>

          {/* Use of Service */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Use of Service</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">5.1 Permitted Use</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You may use the Service for lawful purposes only, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Creating and managing voting events and awards</li>
              <li>Participating in public voting and institutional elections</li>
              <li>Nominating candidates for awards and recognition</li>
              <li>Viewing results and analytics (where permitted)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">5.2 Prohibited Activities</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              You agree not to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>Manipulate voting results through fraudulent means</li>
              <li>Create multiple accounts to circumvent voting restrictions</li>
              <li>Use automated systems or bots to cast votes</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Upload or transmit viruses, malware, or malicious code</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          {/* Voting and Payments */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Voting and Payments</h2>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-4">6.1 Voting Process</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Votes cast through the Service are final and cannot be changed or refunded once submitted. You acknowledge 
              that voting is subject to the rules and restrictions set by the event organizer.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mb-3 mt-6">6.2 Payment Terms</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              For paid voting services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>All payments are processed securely through our payment partners (Paystack)</li>
              <li>Prices are displayed in Ghana Cedis (GHS) unless otherwise stated</li>
              <li>Payments are non-refundable once votes are successfully cast</li>
              <li>Service fees apply as disclosed at the time of purchase</li>
              <li>You are responsible for any applicable taxes</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              The Service and its original content, features, and functionality are owned by Pawavotes and are protected 
              by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You may not copy, modify, distribute, sell, or lease any part of our Service without our prior written 
              permission. You also may not reverse engineer or attempt to extract the source code of the Service.
            </p>
          </section>

          {/* User Content */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. User Content</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              You retain ownership of any content you submit to the Service, including nominations, images, and descriptions. 
              By submitting content, you grant Pawavotes a worldwide, non-exclusive, royalty-free license to use, reproduce, 
              and display such content in connection with the Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              You represent and warrant that you own or have the necessary rights to submit your content and that your 
              content does not violate any third-party rights or applicable laws.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
              INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND 
              NON-INFRINGEMENT.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We do not warrant that the Service will be uninterrupted, secure, or error-free. We do not guarantee the 
              accuracy or reliability of any information obtained through the Service.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, PAWAVOTES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, 
              OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Termination</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or 
              liability, for any reason, including if you breach these Terms.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Upon termination, your right to use the Service will immediately cease. All provisions of these Terms that 
              by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, 
              and limitations of liability.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of Ghana, without regard to its 
              conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved in the 
              courts of Ghana.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2 text-gray-700">
              <p><strong>Email:</strong> pawavotes@gmail.com</p>
              <p><strong>Phone:</strong> +233 55 273 2025 / +233 54 319 4406</p>
              <p><strong>Address:</strong> Asafo, O.A Street, Kumasi, Ghana</p>
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
              <Link href="/privacy" className="hover:text-green-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-green-600 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
