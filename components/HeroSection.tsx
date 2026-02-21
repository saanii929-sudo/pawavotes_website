"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function HeroSection() {
  const [open, setOpen] = useState(false);

  // FIXED: Remove the return statement
  function handleRedirectToContact() {
    window.location.href = "/contact-us";
  }

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="relative min-h-screen w-full"
    >
      {/* Background */}
      <Image
        src="/images/hero_image.jpg"
        alt="Pawavotes background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      {/* NAVBAR */}
      <motion.nav
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="absolute top-0 z-20 flex w-full items-center justify-between px-4 py-5 sm:px-6 md:px-16"
      >
        <Image src="/images/logo.png" alt="Pawavotes" width={120} height={120} />

        {/* Desktop Nav */}
        <ul className="hidden items-center gap-16 text-lg text-white md:flex">
          <li className="relative group cursor-pointer">
            <div className="flex items-center gap-1 hover:text-green-300">
              Product
              <svg
                className="h-4 w-4 transition-transform group-hover:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            <div className="invisible absolute left-0 top-full z-30 mt-3 w-44 rounded-xl bg-white py-2 text-gray-800 shadow-lg opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <a className="block px-4 py-2 hover:bg-green-50 hover:text-green-600">
                Public Voting
              </a>
              <a className="block px-4 py-2 hover:bg-green-50 hover:text-green-600">
                Institutional Voting
              </a>
            </div>
          </li>
          <li className="cursor-pointer hover:text-green-300">Ticketing</li>
          <li className="hover:text-green-300">
            <a href="/find-vote">Events</a>
          </li>
        </ul>

        {/* Desktop CTA - FIXED: Added parentheses to call the function */}
        <button
          onClick={handleRedirectToContact}
          className="hidden cursor-pointer rounded bg-green-600 px-5 py-3 text-sm font-semibold text-white md:block"
        >
          Contact Us
        </button>

        {/* Mobile Menu Button */}
        <button onClick={() => setOpen(true)} className="text-white md:hidden">
          <Menu size={28} />
        </button>
      </motion.nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4 }}
              className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-green-900 p-6 text-white"
            >
              <div className="flex items-center justify-between mb-10 px-2">
                <span className="text-xl font-bold">Menu</span>
                <button onClick={() => setOpen(false)}>
                  <X size={26} />
                </button>
              </div>

              <ul className="space-y-6 text-lg">
                <li className="hover:text-green-300">Product</li>
                <li className="hover:text-green-300">Ticketing</li>
                <li className="hover:text-green-300">
                  <a href="/find-vote">Events</a>
                </li>
              </ul>

              {/* FIXED: Added onClick handler to mobile button */}
              <button
                onClick={handleRedirectToContact}
                className="mt-10 w-50 rounded bg-green-600 py-3 font-semibold"
              >
                Contact Us
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO TITLE */}
      <div className="relative z-10 flex h-[70vh] items-center justify-center">
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="px-4 text-center text-[18vw] sm:text-[14vw] md:text-[12vw] font-extrabold leading-none text-white"
        >
          Pawavotes
        </motion.h1>
      </div>

      {/* HERO TEXT */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl px-6"
      >
        <p className="max-w-xl text-base sm:text-lg md:text-2xl text-white/80">
          Pawavotes enables secure public voting and verifiable institutional
          elections with audit-ready results.
        </p>
      </motion.div>
    </motion.section>
  );
}