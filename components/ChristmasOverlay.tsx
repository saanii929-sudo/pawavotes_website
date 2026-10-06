"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

function isChristmasSeason(): boolean {
  const d = new Date();
  return d.getMonth() === 9 && d.getDate() >= 1; // Dec 1 – 31
}

interface Flake { x: number; y: number; r: number; speed: number; drift: number; phase: number; opacity: number }

function SnowCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);
    const flakes: Flake[] = Array.from({ length: 110 }, () => ({
      x: Math.random() * (W || window.innerWidth),
      y: Math.random() * (H || window.innerHeight),
      r: Math.random() * 3 + 0.7,
      speed: Math.random() * 0.55 + 0.2,
      drift: Math.random() * 0.35 - 0.17,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.5 + 0.22,
    }));
    let raf: number, t = 0;
    const tick = () => {
      t += 0.016; ctx.clearRect(0, 0, W, H);
      for (const f of flakes) {
        f.y += f.speed; f.x += f.drift + Math.sin(t * 0.7 + f.phase) * 0.12;
        if (f.y > H + 8) { f.y = -8; f.x = Math.random() * W; }
        if (f.x > W + 8) f.x = -8; if (f.x < -8) f.x = W + 8;
        const pulse = 0.75 + 0.25 * Math.sin(t * 1.4 + f.phase);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3.5);
        g.addColorStop(0, `rgba(255,255,255,${f.opacity * pulse * 0.45})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.opacity * pulse})`; ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 3 }} aria-hidden />;
}

function drawSanta(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, scale: number, flip: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1); // mirror when walking left
  ctx.scale(scale, scale);

  // ── leg animation: two legs alternate ──
  const legSwing = Math.sin(frame * 0.28) * 7; // degrees-ish offset

  // shadow
  ctx.save();
  ctx.translate(0, 42);
  ctx.scale(1, 0.28);
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fill();
  ctx.restore();

  // ── Legs (drawn behind body) ──
  // Left leg
  ctx.save();
  ctx.translate(-5, 24);
  ctx.rotate((legSwing * Math.PI) / 180);
  ctx.beginPath(); ctx.roundRect(-4, 0, 8, 18, 3);
  ctx.fillStyle = "#1a237e"; ctx.fill(); // dark blue trousers
  // Boot
  ctx.beginPath(); ctx.ellipse(0, 19, 6, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2c1000"; ctx.fill();
  ctx.restore();

  // Right leg
  ctx.save();
  ctx.translate(5, 24);
  ctx.rotate((-legSwing * Math.PI) / 180);
  ctx.beginPath(); ctx.roundRect(-4, 0, 8, 18, 3);
  ctx.fillStyle = "#1a237e"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 19, 6, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2c1000"; ctx.fill();
  ctx.restore();

  // ── Body ──
  // Red coat
  ctx.beginPath(); ctx.roundRect(-12, 4, 24, 24, 5);
  ctx.fillStyle = "#cc0000"; ctx.fill();
  // White fur trim at bottom of coat
  ctx.beginPath(); ctx.roundRect(-12, 24, 24, 5, [0, 0, 4, 4]);
  ctx.fillStyle = "#f0f0f0"; ctx.fill();
  // Belt
  ctx.beginPath(); ctx.rect(-12, 18, 24, 4);
  ctx.fillStyle = "#1a1a1a"; ctx.fill();
  // Belt buckle
  ctx.beginPath(); ctx.rect(-4, 18, 8, 4);
  ctx.fillStyle = "#ffd700"; ctx.fill();

  // ── White coat trim (front) ──
  ctx.beginPath(); ctx.roundRect(-3, 4, 6, 20, 2);
  ctx.fillStyle = "#f0f0f0"; ctx.fill();

  // ── Arm with sack (right side = appears on left when not flipped) ──
  // Upper arm
  ctx.save();
  ctx.translate(-13, 8);
  ctx.rotate((Math.sin(frame * 0.28) * 8 * Math.PI) / 180);
  ctx.beginPath(); ctx.roundRect(-4, 0, 8, 13, 3);
  ctx.fillStyle = "#cc0000"; ctx.fill();
  // Glove
  ctx.beginPath(); ctx.ellipse(0, 14, 5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2c5c2c"; ctx.fill(); // dark green glove
  ctx.restore();

  // Other arm (holding sack on this side)
  ctx.save();
  ctx.translate(13, 6);
  ctx.rotate((-Math.sin(frame * 0.28) * 6 * Math.PI) / 180);
  ctx.beginPath(); ctx.roundRect(-4, 0, 8, 11, 3);
  ctx.fillStyle = "#cc0000"; ctx.fill();
  // Glove
  ctx.beginPath(); ctx.ellipse(0, 12, 5, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2c5c2c"; ctx.fill();
  // Sack
  ctx.beginPath(); ctx.ellipse(4, 4, 10, 12, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "#8B4513"; ctx.fill();
  ctx.strokeStyle = "#5a2d0c"; ctx.lineWidth = 1; ctx.stroke();
  // Sack tie
  ctx.beginPath(); ctx.arc(4, -5, 3, 0, Math.PI * 2);
  ctx.strokeStyle = "#5a2d0c"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  // ── Head ──
  // Skin
  ctx.beginPath(); ctx.ellipse(0, -6, 10, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fcd6a4"; ctx.fill();
  ctx.strokeStyle = "#e8b87a"; ctx.lineWidth = 0.5; ctx.stroke();

  // Rosy cheeks
  ctx.beginPath(); ctx.ellipse(-6, -3, 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,100,80,0.4)"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, -3, 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,100,80,0.4)"; ctx.fill();

  // White beard
  ctx.beginPath();
  ctx.moveTo(-9, -2);
  ctx.quadraticCurveTo(-11, 6, -6, 10);
  ctx.quadraticCurveTo(0, 14, 6, 10);
  ctx.quadraticCurveTo(11, 6, 9, -2);
  ctx.fillStyle = "#f5f5f5"; ctx.fill();

  // Moustache
  ctx.beginPath();
  ctx.moveTo(-7, 2);
  ctx.quadraticCurveTo(-3, 5, 0, 2);
  ctx.quadraticCurveTo(3, 5, 7, 2);
  ctx.strokeStyle = "#f0f0f0"; ctx.lineWidth = 2.5;
  ctx.lineCap = "round"; ctx.stroke();

  // Eyes
  ctx.beginPath(); ctx.arc(-4, -8, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a"; ctx.fill();
  ctx.beginPath(); ctx.arc(4, -8, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a"; ctx.fill();
  // Eye shine
  ctx.beginPath(); ctx.arc(-3.4, -8.6, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
  ctx.beginPath(); ctx.arc(4.6, -8.6, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();

  // ── Santa Hat ──
  // Fur brim
  ctx.beginPath(); ctx.roundRect(-11, -17, 22, 7, 3);
  ctx.fillStyle = "#f0f0f0"; ctx.fill();

  // Hat body (cone — slanted right)
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.lineTo(3, -42); // tip leans right
  ctx.lineTo(12, -16);
  ctx.closePath();
  // Red gradient
  const hg = ctx.createLinearGradient(-10, -42, 12, -16);
  hg.addColorStop(0, "#e8001f");
  hg.addColorStop(0.5, "#cc0000");
  hg.addColorStop(1, "#8a0010");
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = "#6e0010"; ctx.lineWidth = 0.5; ctx.stroke();

  // Hat highlight
  ctx.beginPath();
  ctx.moveTo(-7, -16);
  ctx.lineTo(0, -40);
  ctx.lineTo(2, -16);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,60,70,0.22)"; ctx.fill();

  // Pompom
  const bobY = Math.sin(frame * 0.18) * 2;
  const pg = ctx.createRadialGradient(4, -44 + bobY, 0, 4, -44 + bobY, 7);
  pg.addColorStop(0, "#ffffff");
  pg.addColorStop(0.6, "#e8e8e8");
  pg.addColorStop(1, "#bbbbbb");
  ctx.beginPath(); ctx.arc(4, -44 + bobY, 7, 0, Math.PI * 2);
  ctx.fillStyle = pg; ctx.fill();
  // Pompom specular
  ctx.beginPath(); ctx.ellipse(2, -47 + bobY, 3, 2, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fill();

  ctx.restore();
}

function WalkingSantaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 60;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener("resize", resize);

    const SPEED   = 1.2;   // px per frame
    const SCALE   = 0.85;  // sprite scale
    const SANTA_H = 80;    // approx sprite height at scale=1 for baseline
    const baseY   = H - 2; // walk on the bottom of the strip

    let x     = -50;       // start off-screen left
    let frame = 0;
    let raf: number;

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      x += SPEED;
      // Loop: once Santa fully exits the right, restart from left
      if (x > W + 60) x = -60;
      drawSanta(ctx, x, baseY, frame, SCALE, false);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute bottom-0 left-0 w-full pointer-events-none"
      style={{ height: 80, zIndex: 6 }}
      aria-hidden
    />
  );
}

function SantaHatOnP() {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      // The title h1 has aria-label="Pawavotes"; the first span child is "P"
      const h1 = document.querySelector<HTMLElement>('[aria-label="Pawavotes"]');
      if (!h1) return;
      const firstSpan = h1.querySelector<HTMLElement>("span");
      if (!firstSpan) return;
      const r = firstSpan.getBoundingClientRect();
      const section = h1.closest("section") ?? document.documentElement;
      const sr = section.getBoundingClientRect();
      setPos({
        top:  r.top - sr.top - r.height * 0.04,  // sit above the P
        left: r.left - sr.left + r.width * 0.01,   // centred on the P
      });
    };
    // Measure after fonts/layout settle
    const t1 = setTimeout(measure, 200);
    const t2 = setTimeout(measure, 800);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", measure); };
  }, []);

  if (!pos) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none select-none absolute"
      style={{
        top:    pos.top,
        left:   pos.left,
        zIndex: 15,
        transform: "translateX(-50%)",
        filter: "drop-shadow(0 4px 10px rgba(150,0,0,0.55)) drop-shadow(0 1px 3px rgba(0,0,0,0.4))",
      }}
      initial={{ opacity: 0, y: -16, scale: 0.6 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      transition={{ delay: 0.7, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ y: [0, -5, 0], rotateZ: ["-4deg", "4deg", "-4deg"] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Hat sized to feel like it belongs on the big title letter */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" width="48" height="54" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="sh-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#e8001f" />
              <stop offset="50%"  stopColor="#cc0000" />
              <stop offset="100%" stopColor="#8a0010" />
            </linearGradient>
            <radialGradient id="sh-pom" cx="36%" cy="30%" r="58%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="65%"  stopColor="#e0e0e0" />
              <stop offset="100%" stopColor="#aaaaaa" />
            </radialGradient>
          </defs>

          {/* Hat cone — tip leans right for character */}
          <polygon points="40,4 12,72 68,72" fill="url(#sh-body)" stroke="#6e0010" strokeWidth="1" strokeLinejoin="round" />
          {/* Left-face highlight */}
          <polygon points="40,4 12,72 39,72" fill="rgba(255,60,70,0.2)" />
          {/* Right shadow rib */}
          <polygon points="40,4 58,72 68,72" fill="rgba(0,0,0,0.15)" />
          {/* Hat crease line */}
          <path d="M40,4 Q48,22 44,40" stroke="#ff4455" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />

          {/* White fur brim */}
          <rect x="7" y="68" width="66" height="16" rx="8" fill="white" stroke="#d0d0d0" strokeWidth="0.8" />
          {/* Brim top sheen */}
          <ellipse cx="40" cy="70" rx="28" ry="4" fill="rgba(255,255,255,0.6)" />
          {/* Fur texture dots */}
          {[18,28,38,48,58].map((cx, i) => (
            <circle key={i} cx={cx} cy={76} r={2.5} fill="white" stroke="#ddd" strokeWidth="0.4" opacity="0.85" />
          ))}

          {/* Pompom */}
          <circle cx="47" cy="12" r="10" fill="rgba(0,0,0,0.18)" />
          <circle cx="44" cy="10" r="10" fill="url(#sh-pom)" />
          <ellipse cx="40" cy="5" rx="4" ry="3" fill="rgba(255,255,255,0.65)" transform="rotate(-15 40 5)" />
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
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 1.0, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="flex items-center gap-3 mb-2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <span className="text-base">❄️</span>
        <div className="h-px w-14 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <span className="text-base">🎄</span>
        <div className="h-px w-14 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <span className="text-base">❄️</span>
      </motion.div>

      <div className="relative overflow-hidden">
        <motion.p
          className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-widest uppercase text-center"
          style={{
            background: "linear-gradient(135deg, #fff 0%, #ffd700 38%, #ff5533 68%, #fff 100%)",
            backgroundSize: "200% 100%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 10px rgba(255,190,0,0.5))",
          }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        >
          Merry Christmas
        </motion.p>
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-110%" }}
          animate={{ x: "160%" }}
          transition={{ duration: 2.2, delay: 1.6, repeat: Infinity, repeatDelay: 4.5, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)",
            mixBlendMode: "overlay",
          }}
        />
      </div>

      <motion.p
        className="text-[10px] sm:text-xs text-white/55 tracking-[0.28em] uppercase mt-1 font-light"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: 1.7, duration: 0.6 }}
      >
        from PawaVotes
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
export default function ChristmasOverlay() {
  const [active, setActive] = useState(false);
  useEffect(() => { setActive(isChristmasSeason()); }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="xmas"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 4 }}
          aria-hidden
        >
          {/* Snow */}
          <SnowCanvas />

          {/* Greeting — sits in the upper portion of the hero */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ top: "12%", zIndex: 5 }}
          >
            <MerryChristmasBanner />
          </div>

          {/* Hat on the "P" */}
          <SantaHatOnP />

          {/* Walking Santa along the bottom */}
          <WalkingSantaCanvas />

          {/* Subtle warm tint at very top */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(160,0,0,0.06) 0%, transparent 70%)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
