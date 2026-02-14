"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { UserCheck, Shield, FileSearch, Plus, Minus } from "lucide-react";
import FAQSection from "@/components/FaqSection";
import HeroSection from "@/components/HeroSection";
import ChatbotWidget from "@/components/chatbot-widget";
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8 },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1 },
  },
};

export default function Home() {
  return (
    <main className="w-full bg-white text-gray-900">
      {/* HERO */}
      <HeroSection />

      {/* HOW IT WORKS */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="bg-[#006726] relative px-6 py-20 text-white md:px-16"
      >
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/brutalist-52.png"
            alt="Brutal 52"
            width={150}
            height={150}
            className="absolute top-0 left-0 text-white"
          />
          <Image
            src="/images/brutalist-94.png"
            alt="Brutal 94"
            width={150}
            height={150}
            className="absolute bottom-0 left-0"
          />
          <Image
            src="/images/brutalist-59.png"
            alt="Brutal 59"
            width={150}
            height={150}
            className="absolute top-0 right-0"
          />
          <Image
            src="/images/brutalist-100.png"
            alt="Brutal 100"
            width={150}
            height={150}
            className="absolute bottom-0 right-0"
          />
        </div>
        <h2 className="mb-3 text-center text-3xl font-bold">
          How Pawavotes Works
        </h2>
        <p className="mb-12 text-center text-white/80">
          A simple, secure process built for transparent digital voting.
        </p>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-green-600" />

          <div className="space-y-6">
            {[
              "Sign up and verify identity",
              "Verify voter eligibility",
              "Cast votes securely",
              "View results & reports",
            ].map((step, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 rounded-xl bg-green-600 p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-700 font-bold">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="font-medium">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="bg-white px-6 py-28 md:px-16">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-20 max-w-3xl text-center"
        >
          <h2 className="mb-4 text-3xl font-semibold text-green-600 md:text-4xl">
            Designed for Verifiable Elections
          </h2>
          <p className="text-lg text-gray-500">
            From voter validation to final results, every
            <br />
            step is provably secure.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-3">
          {/* Card 1 */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-3xl bg-white p-10 shadow-sm"
          >
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <UserCheck className="h-10 w-10 text-green-600" />
            </div>

            <h3 className="mb-4 text-xl font-semibold text-black">
              Voter Integrity
            </h3>

            <ul className="space-y-3 text-gray-600">
              <li className="list-disc list-inside">ID & email verification</li>
              <li className="list-disc list-inside">OTP authentication</li>
              <li className="list-disc list-inside">
                Duplicate vote prevention
              </li>
            </ul>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-3xl bg-white p-10 shadow-sm"
          >
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Shield className="h-10 w-10 text-green-600" />
            </div>

            <h3 className="mb-4 text-xl font-semibold text-black">
              Vote Protection
            </h3>

            <ul className="space-y-3 text-gray-600">
              <li className="list-disc list-inside">Encrypted ballots</li>
              <li className="list-disc list-inside">Secure storage</li>
              <li className="list-disc list-inside">Time-locked elections</li>
            </ul>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-3xl bg-white p-10 shadow-sm"
          >
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <FileSearch className="h-10 w-10 text-green-600" />
            </div>

            <h3 className="mb-4 text-xl font-semibold text-black">
              Transparency
            </h3>

            <ul className="space-y-3 text-gray-600">
              <li className="list-disc list-inside">Audit logs</li>
              <li className="list-disc list-inside">Turnout analytics</li>
              <li className="list-disc list-inside">Downloadable reports</li>
            </ul>
          </motion.div>
        </div>
      </section>
      {/* FAQ */}
      <FAQSection />

      <section className="w-full">
        {/* CTA Section */}
        <div className="relative bg-green-800 text-white py-28 overflow-hidden">
          {/* Decorative shapes */}

          <div className="absolute inset-0 opacity-20">
            <Image
              src="/images/brutalist-1.png"
              alt="Brutal 52"
              width={140}
              height={140}
              className="absolute top-0 left-80 text-white"
            />
            <Image
              src="/images/brutalist-43.png"
              alt="Brutal 43"
              width={140}
              height={140}
              className="absolute bottom-0 left-80"
            />
            <Image
              src="/images/brutalist-60.png"
              alt="Brutal 60"
              width={140}
              height={140}
              className="absolute bottom-35 left-0"
            />
            <Image
              src="/images/brutalist-23.png"
              alt="Brutal 23"
              width={140}
              height={140}
              className="absolute top-0 right-80"
            />
            <Image
              src="/images/brutalist-16.png"
              alt="Brutal 16"
              width={140}
              height={140}
              className="absolute bottom-0 right-80"
            />
            <Image
              src="/images/brutalist-59.png"
              alt="Brutal 59"
              width={140}
              height={140}
              className="absolute bottom-35 right-0"
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold mb-8"
            >
              Run transparent voting with confidence.
            </motion.h2>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center px-10 py-4 rounded-lg bg-green-600 hover:bg-green-500 transition font-semibold"
            >
              Contact Us
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white pt-20 pb-10">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/images/logo.png"
                  alt="Pawavotes"
                  width={50}
                  height={50}
                />
                <span className="text-xl font-bold ml-0 text-green-600">
                  Pawavotes
                </span>
              </div>
              <p className="text-gray-600 max-w-sm leading-relaxed">
                The most trusted digital voting platform for public awards and
                institutional elections in Africa.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-3 text-gray-600">
                <li>Public Voting</li>
                <li>Institutional Voting</li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-3 text-gray-600">
                <li>About Us</li>
                <li>Contact</li>
                <li>Privacy policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="mt-20 pt-6 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Pawavotes. All rights reserved. Built for trust and
            transparency in Africa.
          </div>
        </footer>
      </section>

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </main>
  );
}
