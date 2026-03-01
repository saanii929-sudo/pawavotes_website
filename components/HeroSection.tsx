"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Menu, X } from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const navContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const navItem: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] },
  },
};

const titleContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.5 } },
};

const letterVariant: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.85, rotateX: -40 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroText: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 1.2, ease: [0.42, 0, 0.58, 1] },
  },
};

const buttonVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 1.5, ease: [0.42, 0, 0.58, 1] },
  },
};

function Particle({
  x,
  delay,
  size,
}: {
  x: string;
  delay: number;
  size: number;
}) {
  return (
    <motion.div
      className="absolute bottom-0 rounded-full bg-green-400/20 pointer-events-none"
      style={{ left: x, width: size, height: size }}
      animate={{
        y: [0, -900],
        opacity: [0, 0.6, 0],
        scale: [1, 1.4, 0.8],
      }}
      transition={{
        duration: 8 + Math.random() * 6,
        delay,
        repeat: Infinity,
        ease: [0.42, 0, 0.58, 1],
      }}
    />
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute inset-x-0 h-0.5 bg-linear-to-r from-transparent via-green-400/70 to-transparent z-10 pointer-events-none"
      initial={{ top: "0%", opacity: 0 }}
      animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
      transition={{ duration: 1.6, delay: 0.2, ease: [0.42, 0, 0.58, 1] }}
    />
  );
}

const TITLE = "Pawavotes";

const particles = [
  { x: "8%", delay: 0, size: 6 },
  { x: "18%", delay: 1.5, size: 4 },
  { x: "30%", delay: 3, size: 8 },
  { x: "45%", delay: 0.7, size: 5 },
  { x: "60%", delay: 2.2, size: 7 },
  { x: "72%", delay: 1, size: 4 },
  { x: "85%", delay: 3.5, size: 6 },
  { x: "93%", delay: 0.3, size: 5 },
];

export default function HeroSection() {
  const [open, setOpen] = useState(false);

  function handleRedirectToContact() {
    window.location.href = "/contact-us";
  }
  function handleRedirectToFindVote() {
    window.location.href = "/find-vote";
  }

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="relative min-h-125 w-full overflow-hidden"
    >
      <Image
        src="/images/hero_image.jpg"
        alt="Pawavotes background"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none z-1" />

      <ScanLine />

      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
      <motion.nav
        variants={navContainer}
        initial="hidden"
        animate="visible"
        className="absolute top-0 z-20 flex w-full items-center justify-between px-4 py-5 sm:px-6 md:px-16"
      >
        <motion.div variants={navItem}>
          <Image
            src="/images/logo.png"
            alt="Pawavotes"
            width={100}
            height={100}
          />
        </motion.div>
        <ul className="hidden items-center gap-16 text-lg text-white md:flex">
          {["Home", "Ticketing", "Events"].map((label, i) => (
            <motion.li
              key={label}
              variants={navItem}
              className="relative cursor-pointer group"
            >
              <span className="hover:text-green-300 transition-colors duration-200">
                {label === "Home" ? (
                  <a href="/">{label}</a>
                ) : label === "Events" ? (
                  <a href="/find-vote">{label}</a>
                ) : label === "Ticketing" ? (
                  <span className="cursor-default opacity-70">{label}</span>
                ) : (
                  label
                )}
              </span>
              {/* Underline hover bar - only show for clickable items */}
              {label !== "Ticketing" && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-green-400 transition-all duration-300 group-hover:w-full" />
              )}
            </motion.li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <motion.button
          variants={navItem}
          onClick={handleRedirectToContact}
          whileHover={{ scale: 1.06, backgroundColor: "#16a34a" }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="hidden cursor-pointer rounded bg-green-600 px-5 py-3 text-sm font-semibold text-white md:block"
        >
          Contact Us
        </motion.button>
        <motion.button
          variants={navItem}
          onClick={() => setOpen(true)}
          className="text-white md:hidden"
          whileTap={{ scale: 0.9 }}
        >
          <Menu size={28} />
        </motion.button>
      </motion.nav>
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
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-green-900 p-6 text-white"
            >
              <div className="flex items-center justify-between mb-10 px-2">
                <span className="text-xl font-bold">Menu</span>
                <motion.button
                  onClick={() => setOpen(false)}
                  whileTap={{ rotate: 90, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={26} />
                </motion.button>
              </div>

              <ul className="space-y-6 text-lg">
                {[
                  { label: "Home", href: "/" },
                  { label: "Ticketing", href: null },
                  { label: "Events", href: "/find-vote" },
                ].map(({ label, href }, i) => (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
                    className={`transition-colors ${href ? 'hover:text-green-300' : 'opacity-70 cursor-default'}`}
                  >
                    {href ? <a href={href}>{label}</a> : <span>{label}</span>}
                  </motion.li>
                ))}
              </ul>

              <motion.button
                onClick={handleRedirectToContact}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="mt-10 w-50 rounded bg-green-600 py-3 font-semibold"
              >
                Contact Us
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative z-10 flex pt-40 pb-20 sm:pb-35 items-center justify-center perspective-midrange">
        <motion.h1
          variants={titleContainer}
          initial="hidden"
          animate="visible"
          aria-label={TITLE}
          className="px-4 text-center text-[14vw] sm:text-[12vw] md:text-[12vw] font-extrabold leading-none select-none"
          style={{ transformStyle: "preserve-3d" }}
        >
          {TITLE.split("").map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariant}
              className="inline-block text-white relative"
              whileHover={{
                scale: 1.15,
                color: "#4ade80",
                textShadow: "0 0 30px rgba(74,222,128,0.8)",
                transition: { duration: 0.15 },
              }}
            >
              {char}
            </motion.span>
          ))}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ backgroundPosition: "-200% center" }}
            animate={{ backgroundPosition: "200% center" }}
            transition={{ duration: 2.2, delay: 1.1, ease: [0.42, 0, 0.58, 1] }}
            style={{
              background:
                "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              mixBlendMode: "overlay",
            }}
          />
        </motion.h1>
      </div>

      <motion.div
        variants={heroText}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-6xl px-6"
      >
        <motion.p
          className="max-w-xl text-base sm:text-lg md:text-2xl text-white/80"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.7 }}
        >
          Pawavotes enables secure public voting and verifiable institutional
          elections with audit-ready results.
        </motion.p>

        <motion.button
          variants={buttonVariant}
          initial="hidden"
          animate="visible"
          onClick={handleRedirectToFindVote}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 24px rgba(74,222,128,0.55)",
            backgroundColor: "#16a34a",
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="mt-8 cursor-pointer mb-10 rounded bg-green-600 px-6 py-4 text-lg font-semibold text-white relative overflow-hidden"
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
            }}
          />
          Vote Now
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
