"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function isChristmasSeason(): boolean {
  const now   = new Date();
  const month = now.getMonth() + 1; // 1-based
  const day   = now.getDate();
  // Dec 1 → Dec 31
  return month === 12 && day >= 1 && day <= 31;
}

interface Flake {
  x: number; y: number;
  r: number; speed: number;
  drift: number; phase: number;
  opacity: number;
}

function SnowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setSize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();
    window.addEventListener("resize", setSize);

    const COUNT = 120;
    const flakes: Flake[] = Array.from({ length: COUNT }, () => ({
      x:       Math.random() * W,
      y:       Math.random() * H,
      r:       Math.random() * 3.5 + 0.8,
      speed:   Math.random() * 0.6 + 0.25,
      drift:   Math.random() * 0.4 - 0.2,
      phase:   Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.55 + 0.25,
    }));

    let raf: number;
    let t = 0;

    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      for (const f of flakes) {
        f.y += f.speed;
        f.x += f.drift + Math.sin(t * 0.7 + f.phase) * 0.15;
        if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; }
        if (f.x > W + 10) f.x = -10;
        if (f.x < -10)    f.x = W + 10;

        const pulse = 0.75 + 0.25 * Math.sin(t * 1.4 + f.phase);

        // Glow
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3.5);
        g.addColorStop(0, `rgba(255,255,255,${f.opacity * pulse * 0.5})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.opacity * pulse})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setSize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3 }}
      aria-hidden
    />
  );
}

function SantaHat3D() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none select-none"
      style={{
        position: "absolute",
        top: "-2.2em",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 20,
        filter: "drop-shadow(0 8px 24px rgba(180,0,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
        perspective: 600,
      }}
      initial={{ opacity: 0, y: -30, rotateX: -20 }}
      animate={{ opacity: 1, y: 0,  rotateX: 0 }}
      transition={{ delay: 0.6, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{
          y:       [0, -10, 0],
          rotateY: ["-12deg", "12deg", "-12deg"],
          rotateZ: ["-3deg", "3deg", "-3deg"],
        }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 240"
          width="110"
          height="132"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="hatBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#c0001a" />
              <stop offset="45%"  stopColor="#e8001f" />
              <stop offset="100%" stopColor="#8a0010" />
            </linearGradient>
            <linearGradient id="hatLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#ff3348" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff3348" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="furGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d8d8d8" />
            </linearGradient>
            <radialGradient id="pompomGrad" cx="38%" cy="32%" r="58%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="60%"  stopColor="#e8e8e8" />
              <stop offset="100%" stopColor="#b0b0b0" />
            </radialGradient>
            <filter id="hatShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <ellipse cx="100" cy="226" rx="58" ry="8" fill="rgba(0,0,0,0.22)" />

          <polygon
            points="100,10 30,195 170,195"
            fill="url(#hatBody)"
            stroke="#6e0010"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          <polygon
            points="100,10 30,195 98,195"
            fill="url(#hatLight)"
          />

          <polygon
            points="100,10 150,195 170,195"
            fill="rgba(0,0,0,0.18)"
          />

          <path
            d="M100,10 Q115,42 108,72"
            stroke="#ff5065"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity="0.55"
          />

          <rect
            x="22" y="189" width="156" height="36"
            rx="18" ry="18"
            fill="url(#furGrad)"
            stroke="#c8c8c8"
            strokeWidth="1"
          />
          <ellipse cx="100" cy="191" rx="68" ry="8" fill="rgba(255,255,255,0.6)" />

          {[38,58,78,98,118,138,158].map((cx, i) => (
            <circle key={i} cx={cx} cy={207} r={5}
              fill="white" stroke="#ddd" strokeWidth="0.5" opacity="0.8" />
          ))}

          <circle cx="104" cy="24" r="22" fill="rgba(0,0,0,0.20)" />

          <circle cx="100" cy="20" r="22" fill="url(#pompomGrad)" />

          <ellipse cx="92" cy="11" rx="9" ry="7"
            fill="rgba(255,255,255,0.7)"
            transform="rotate(-20 92 11)"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

function MerryChristmasBanner() {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center pointer-events-none select-none"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      transition={{ delay: 1.0, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="flex items-center gap-3 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <span className="text-lg">❄️</span>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <span className="text-lg">🎄</span>
        <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        <span className="text-lg">❄️</span>
      </motion.div>
      <div className="relative">
        <motion.p
          className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-widest uppercase text-center"
          style={{
            background: "linear-gradient(135deg, #fff 0%, #ffd700 40%, #ff4444 70%, #fff 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "none",
            filter: "drop-shadow(0 2px 12px rgba(255,200,0,0.5))",
          }}
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          Merry Christmas
        </motion.p>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "150%" }}
          transition={{ duration: 2.4, delay: 1.6, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)",
            mixBlendMode: "overlay",
          }}
        />
      </div>
      <motion.p
        className="text-xs sm:text-sm text-white/60 tracking-[0.3em] uppercase mt-1 font-light"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7, duration: 0.6 }}
      >
        from PawaVotes
      </motion.p>
    </motion.div>
  );
}

export default function ChristmasOverlay() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isChristmasSeason());
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="xmas-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 4 }}
          aria-hidden
        >
          <SnowCanvas />
          <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ top: "14%", zIndex: 5 }}
          >
            <div className="relative flex justify-center w-full mb-1">
              <SantaHat3D />
            </div>
            <MerryChristmasBanner />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,0,0,0.07) 0%, transparent 70%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
