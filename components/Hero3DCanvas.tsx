"use client";

import { useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Vec3 { x: number; y: number; z: number }

interface Node3D {
  pos: Vec3;
  vel: Vec3;
  radius: number;
  opacity: number;
  pulseOffset: number;
  pulseSpeed: number;
  color: [number, number, number];
  trail: { x: number; y: number }[];
}

interface FloatParticle {
  x: number;
  y: number;
  vy: number;           // always negative — rises upward
  vx: number;           // gentle sideways drift
  size: number;
  opacity: number;
  pulseOffset: number;
  color: [number, number, number];
}

interface ShootingStar {
  x: number; y: number;
  vx: number; vy: number;
  len: number;
  opacity: number;
  life: number; maxLife: number;
  width: number;
  headR: number;
  twinkle: number;
  color: [number, number, number];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function randSign() { return Math.random() > 0.5 ? 1 : -1; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

function project(pos: Vec3, fov: number, cx: number, cy: number) {
  const dz = fov - pos.z;
  if (dz <= 0.1) return { sx: 0, sy: 0, scale: 0, behind: true };
  const scale = fov / dz;
  return { sx: cx + pos.x * scale, sy: cy + pos.y * scale, scale, behind: false };
}

// ─── Brand palette ────────────────────────────────────────────────────────────
// Strictly on-brand: greens + white. No cyan, no arbitrary mints.
const BRAND_GREEN:   [number, number, number] = [22,  163, 74];   // green-600  #16a34a
const LIGHT_GREEN:   [number, number, number] = [74,  222, 128];  // green-400  #4ade80
const MID_GREEN:     [number, number, number] = [34,  197, 94];   // green-500  #22c55e
const PALE_GREEN:    [number, number, number] = [134, 239, 172];  // green-300  #86efac
const WHITE:         [number, number, number] = [255, 255, 255];
const DEEP_GREEN:    [number, number, number] = [0,   103, 38];   // #006726 (brand deep green)

const PALETTE: [number, number, number][] = [
  BRAND_GREEN, LIGHT_GREEN, MID_GREEN, PALE_GREEN, WHITE, DEEP_GREEN,
];

// ─── Builders ─────────────────────────────────────────────────────────────────
function buildNodes(count: number, spread: number): Node3D[] {
  return Array.from({ length: count }, () => ({
    pos: {
      x: rand(-spread, spread),
      y: rand(-spread, spread),
      z: rand(-spread * 0.5, spread * 0.5),
    },
    vel: {
      x: rand(0.05, 0.18) * randSign(),
      y: rand(0.05, 0.18) * randSign(),
      z: rand(0.02, 0.08) * randSign(),
    },
    radius: rand(1.5, 4.5),
    opacity: rand(0.45, 0.9),
    pulseOffset: Math.random() * TAU,
    pulseSpeed: rand(0.012, 0.025),
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    trail: [],
  }));
}

function buildFloatParticles(count: number, W: number, H: number): FloatParticle[] {
  return Array.from({ length: count }, () => ({
    x: rand(0, W),
    y: rand(-H, H),           // scatter vertically so they don't all start at bottom
    vy: rand(-0.35, -0.10),   // always upward
    vx: rand(-0.08, 0.08),    // gentle sideways wobble
    size: rand(1.5, 4.5),
    opacity: rand(0.25, 0.65),
    pulseOffset: Math.random() * TAU,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  }));
}

function buildShootingStar(W: number, H: number): ShootingStar {
  const angle  = rand(-0.28, 0.28);          // degrees off straight-up
  const speed  = rand(7, 18);
  // weight towards greens and white — no off-brand colours
  const color  = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x:       rand(-40, W + 40),
    y:       H + rand(0, 30),               // spawn below canvas
    vx:      Math.sin(angle) * speed,
    vy:      -(Math.cos(angle) * speed),    // upward
    len:     rand(55, 160),
    width:   rand(0.7, 2.4),
    headR:   rand(3, 8),
    opacity: rand(0.55, 0.95),
    life:    0,
    maxLife: rand(45, 85),
    twinkle: Math.random() * TAU,
    color,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Hero3DCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.offsetWidth  || window.innerWidth;
    let H = canvas.offsetHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Scene constants
    const FOV          = 480;
    const CONNECT_DIST = 160;
    const TRAIL_MAX    = 8;
    const NODE_COUNT   = 75;
    const PARTICLE_CNT = 55;

    // Scene objects
    let nodes     = buildNodes(NODE_COUNT, 300);
    let particles = buildFloatParticles(PARTICLE_CNT, W, H);
    let stars: ShootingStar[] = Array.from({ length: 28 }, () => {
      const s = buildShootingStar(W, H);
      // stagger lifetimes so they don't all pop at once
      const skip = Math.floor(rand(0, s.maxLife * 0.8));
      s.life = skip;
      s.x   += s.vx * skip;
      s.y   += s.vy * skip;
      return s;
    });

    const resize = () => {
      W = canvas.offsetWidth  || window.innerWidth;
      H = canvas.offsetHeight || window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = buildFloatParticles(PARTICLE_CNT, W, H);
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse parallax — smooth lerp
    let tmx = 0, tmy = 0, mx = 0, my = 0;
    const onMouse = (e: MouseEvent) => {
      tmx = (e.clientX / W - 0.5) * 2;
      tmy = (e.clientY / H - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    // ── Draw helpers ──────────────────────────────────────────────────────────

    /** Glowing dot with soft outer halo + specular highlight */
    function glowDot(
      x: number, y: number,
      r: number, glowR: number,
      col: [number, number, number], op: number,
    ) {
      if (op < 0.01 || r <= 0 || !isFinite(x) || !isFinite(y)) return;
      const safeOp = clamp(op, 0, 1);

      // Outer halo
      const halo = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      halo.addColorStop(0,   `rgba(${col[0]},${col[1]},${col[2]},${safeOp * 0.28})`);
      halo.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},${safeOp * 0.08})`);
      halo.addColorStop(1,   `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, TAU);
      ctx.fillStyle = halo;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${safeOp})`;
      ctx.fill();

      // Specular
      if (r > 2) {
        ctx.beginPath();
        ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.30, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${safeOp * 0.5})`;
        ctx.fill();
      }
    }

    /** Gradient connection line between two nodes */
    function drawConnection(
      ax: number, ay: number, colA: [number, number, number],
      bx: number, by: number, colB: [number, number, number],
      alpha: number, lw: number,
    ) {
      if (!isFinite(ax) || !isFinite(ay) || !isFinite(bx) || !isFinite(by)) return;
      const safeAlpha = clamp(alpha, 0, 1);
      if (safeAlpha < 0.01) return;

      const grd = ctx.createLinearGradient(ax, ay, bx, by);
      grd.addColorStop(0,   `rgba(${colA[0]},${colA[1]},${colA[2]},${safeAlpha})`);
      grd.addColorStop(0.5, `rgba(74,222,128,${safeAlpha * 0.9})`);
      grd.addColorStop(1,   `rgba(${colB[0]},${colB[1]},${colB[2]},${safeAlpha})`);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = grd;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    let rafId: number;
    let t        = 0;
    let nextStar = rand(0.04, 0.15);

    function tick() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Smooth mouse
      mx = lerp(mx, tmx, 0.055);
      my = lerp(my, tmy, 0.055);

      const cx = W / 2, cy = H / 2;

      // ── 1. Subtle radial green glow anchored to canvas centre ─────────────
      // This bridges the canvas to the hero's vignette naturally
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.55);
      centerGlow.addColorStop(0,   "rgba(22,163,74,0.06)");
      centerGlow.addColorStop(0.5, "rgba(22,163,74,0.03)");
      centerGlow.addColorStop(1,   "rgba(22,163,74,0)");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, W, H);

      // ── 2. Floating rising particles ─────────────────────────────────────
      for (const p of particles) {
        p.x  += p.vx + Math.sin(t * 0.8 + p.pulseOffset) * 0.08;
        p.y  += p.vy;
        // Wrap: when a particle exits the top, reset it to the bottom
        if (p.y < -20) {
          p.y = H + 20;
          p.x = rand(0, W);
        }

        const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + p.pulseOffset);
        const alpha = clamp(p.opacity * pulse, 0, 1);
        const glowR = p.size * 5;

        glowDot(p.x, p.y, p.size, glowR, p.color, alpha);
      }

      // ── 3. 3-D floating node network ─────────────────────────────────────
      const BOUND = 320;
      const proj: { sx: number; sy: number; scale: number; node: Node3D }[] = [];

      for (const nd of nodes) {
        nd.pos.x += nd.vel.x;
        nd.pos.y += nd.vel.y;
        nd.pos.z += nd.vel.z;
        if (Math.abs(nd.pos.x) > BOUND) nd.vel.x *= -1;
        if (Math.abs(nd.pos.y) > BOUND) nd.vel.y *= -1;
        if (Math.abs(nd.pos.z) > BOUND) nd.vel.z *= -1;

        const pr = project(nd.pos, FOV, cx + mx * 38, cy + my * 28);
        if (!pr.behind && pr.scale > 0) {
          nd.trail.push({ x: pr.sx, y: pr.sy });
          if (nd.trail.length > TRAIL_MAX) nd.trail.shift();
          proj.push({ ...pr, node: nd });
        }
      }

      // Sort back-to-front so nearer nodes draw on top
      proj.sort((a, b) => a.node.pos.z - b.node.pos.z);

      // Connection lines
      ctx.lineCap = "round";
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const a = proj[i], b = proj[j];
          const dx = a.node.pos.x - b.node.pos.x;
          const dy = a.node.pos.y - b.node.pos.y;
          const dz = a.node.pos.z - b.node.pos.z;
          const d3 = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d3 > CONNECT_DIST) continue;

          const fade   = 1 - d3 / CONNECT_DIST;
          const avgSc  = (a.scale + b.scale) * 0.5;
          const alpha  = fade * fade * 0.42 * clamp(avgSc * 1.4, 0, 1);
          const lw     = lerp(0.3, 1.4, fade * avgSc);

          drawConnection(
            a.sx, a.sy, a.node.color,
            b.sx, b.sy, b.node.color,
            alpha, lw,
          );
        }
      }

      // Node dots + motion trails
      for (const { sx, sy, scale, node } of proj) {
        // Subtle trail
        if (node.trail.length > 2) {
          for (let ti = 1; ti < node.trail.length; ti++) {
            const ta = node.trail[ti - 1], tb = node.trail[ti];
            if (!isFinite(ta.x) || !isFinite(tb.x)) continue;
            const trAlpha = (ti / node.trail.length) * 0.12 * clamp(scale, 0, 1);
            const trWidth = node.radius * scale * 0.55 * (ti / node.trail.length);
            ctx.beginPath();
            ctx.moveTo(ta.x, ta.y);
            ctx.lineTo(tb.x, tb.y);
            ctx.strokeStyle = `rgba(${node.color[0]},${node.color[1]},${node.color[2]},${clamp(trAlpha, 0, 1)})`;
            ctx.lineWidth = trWidth;
            ctx.stroke();
          }
        }

        const pulse = 0.65 + 0.35 * Math.sin(t * node.pulseSpeed * 60 + node.pulseOffset);
        const op    = clamp(node.opacity * pulse * clamp(scale * 1.4, 0, 1), 0, 1);
        const r     = Math.max(node.radius * scale, 0.5);
        const gr    = Math.max(r * 5, 4);

        glowDot(sx, sy, r, gr, node.color, op);
      }

      // ── 4. Shooting stars (bottom → top) ──────────────────────────────────
      nextStar -= 0.016;
      if (nextStar <= 0) {
        stars.push(buildShootingStar(W, H));
        nextStar = rand(0.04, 0.18);
      }
      // Cull finished or off-screen stars
      stars = stars.filter(s => s.life < s.maxLife && s.y > -120);

      for (const s of stars) {
        s.x   += s.vx;
        s.y   += s.vy;
        s.life++;

        const prog     = clamp(s.life / (s.maxLife || 1), 0, 1);
        const flicker  = 0.88 + 0.12 * Math.sin(t * 18 + (isFinite(s.twinkle) ? s.twinkle : 0));
        const sinProg  = Math.sin(prog * Math.PI);
        const envelope = isFinite(sinProg) ? Math.pow(Math.abs(sinProg), 0.6) : 0;
        const rawAlpha = (isFinite(s.opacity) ? s.opacity : 0) * envelope * flicker;
        const alpha    = clamp(isFinite(rawAlpha) ? rawAlpha : 0, 0, 1);

        if (alpha < 0.02) continue;

        // Direction unit vector
        const spd  = Math.hypot(s.vx, s.vy) || 1;
        const nx   = s.vx / spd;
        const ny   = s.vy / spd;

        const tailLen = s.len * easeInOut(prog);
        const tailX   = s.x - nx * tailLen;
        const tailY   = s.y - ny * tailLen;
        if (!isFinite(tailX) || !isFinite(tailY)) continue;
        // Skip degenerate (zero-length) gradients
        if (Math.abs(s.x - tailX) < 0.5 && Math.abs(s.y - tailY) < 0.5) continue;

        // Outer glow trail
        const glow = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        glow.addColorStop(0,   `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`);
        glow.addColorStop(0.6, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${clamp(alpha * 0.18, 0, 1)})`);
        glow.addColorStop(1,   `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${clamp(alpha * 0.32, 0, 1)})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = glow;
        ctx.lineWidth   = s.width * 4;
        ctx.lineCap     = "round";
        ctx.stroke();

        // Core bright trail
        const core = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        core.addColorStop(0,    `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`);
        core.addColorStop(0.55, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${clamp(alpha * 0.65, 0, 1)})`);
        core.addColorStop(1,    `rgba(255,255,255,${clamp(alpha, 0, 1)})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = core;
        ctx.lineWidth   = s.width;
        ctx.lineCap     = "round";
        ctx.stroke();

        // Head glow (3 layers)
        for (let layer = 0; layer < 3; layer++) {
          const lr  = s.headR * (1 + layer * 1.4);
          const la  = clamp(alpha * ([0.9, 0.32, 0.10][layer] ?? 0), 0, 1);
          if (lr <= 0 || la < 0.005) continue;
          const hg  = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, lr);
          hg.addColorStop(0,   `rgba(255,255,255,${la})`);
          hg.addColorStop(0.4, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${clamp(la * 0.55, 0, 1)})`);
          hg.addColorStop(1,   `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`);
          ctx.beginPath();
          ctx.arc(s.x, s.y, lr, 0, TAU);
          ctx.fillStyle = hg;
          ctx.fill();
        }

        // Cross-sparkle on large heads
        if (s.headR > 5) {
          const armLen = s.headR * 2.2 * (1 - prog * 0.4);
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.strokeStyle = `rgba(255,255,255,${clamp(alpha * 0.65, 0, 1)})`;
          ctx.lineWidth   = 0.8;
          ctx.lineCap     = "round";
          for (let arm = 0; arm < 4; arm++) {
            const aAngle = (arm / 4) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(Math.cos(aAngle) * armLen * 0.12, Math.sin(aAngle) * armLen * 0.12);
            ctx.lineTo(Math.cos(aAngle) * armLen,        Math.sin(aAngle) * armLen);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // ── 5. Subtle horizontal scan line (every ~9 s) ───────────────────────
      // Matches the hero's horizontal motion language without overpowering it
      const sc = t % 9;
      if (sc < 1.4) {
        const prog  = sc / 1.4;
        const scanY = prog * H;
        const sa    = Math.sin(prog * Math.PI) * 0.22;
        const sg    = ctx.createLinearGradient(0, scanY, W, scanY);
        sg.addColorStop(0,    "rgba(74,222,128,0)");
        sg.addColorStop(0.2,  `rgba(74,222,128,${sa})`);
        sg.addColorStop(0.8,  `rgba(74,222,128,${sa})`);
        sg.addColorStop(1,    "rgba(74,222,128,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(0, scanY - 1, W, 1.5);
      }

      rafId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 2 }}
      aria-hidden
    />
  );
}
