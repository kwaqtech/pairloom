/**
 * SKY CANVAS — Background particle effects
 * Modes: 'hearts' | 'clouds' | 'fireflies' | 'petals'
 * GPU-safe: uses requestAnimationFrame, only animates transform & opacity.
 * Fixed position, pointer-events: none — never triggers repaints on scroll.
 */

import store from './state.js';

const canvas = document.getElementById('sky-canvas');
const ctx    = canvas ? canvas.getContext('2d') : null;

let rafId     = null;
let particles = [];
let mode      = 'hearts';
const W = () => canvas.width;
const H = () => canvas.height;

// ── RESIZE ──
function resize() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

// ── PARTICLE FACTORIES ──
const factories = {
  hearts: () => ({
    x: Math.random() * W(),
    y: H() + 20,
    size: 8 + Math.random() * 16,
    speed: 0.4 + Math.random() * 0.7,
    drift: (Math.random() - 0.5) * 0.5,
    opacity: 0.15 + Math.random() * 0.35,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.015 + Math.random() * 0.02,
    hue: Math.random() > 0.5 ? '244,143,177' : '147,200,238',
  }),

  clouds: () => ({
    x: -200,
    y: Math.random() * (H() * 0.5),
    w: 120 + Math.random() * 200,
    h: 50 + Math.random() * 80,
    speed: 0.15 + Math.random() * 0.3,
    opacity: 0.08 + Math.random() * 0.15,
  }),

  fireflies: () => ({
    x: Math.random() * W(),
    y: Math.random() * H(),
    r: 1.5 + Math.random() * 2,
    opacity: 0,
    maxOpacity: 0.3 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.008 + Math.random() * 0.015,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.3,
  }),

  petals: () => ({
    x: Math.random() * W(),
    y: -20,
    size: 6 + Math.random() * 10,
    speed: 0.5 + Math.random() * 0.8,
    drift: (Math.random() - 0.5) * 0.6,
    opacity: 0.2 + Math.random() * 0.3,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    hue: Math.random() > 0.6 ? '244,143,177' : '255,200,200',
  }),
};

// ── SPAWN RATE (max count) ──
const MAX_PARTICLES = { hearts: 30, clouds: 10, fireflies: 50, petals: 35 };

function spawnParticle() {
  if (!factories[mode]) return;
  if (particles.length < (MAX_PARTICLES[mode] || 30)) {
    particles.push(factories[mode]());
  }
}

// ── DRAW HEART ──
function drawHeart(x, y, size, color, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle   = `rgba(${color}, ${opacity})`;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x, y - size * 0.3, x - size * 0.5, y - size * 0.8, x - size * 0.5, y - size * 0.4);
  ctx.bezierCurveTo(x - size * 0.5, y - size * 0.9, x, y - size * 0.9, x, y - size * 0.5);
  ctx.bezierCurveTo(x, y - size * 0.9, x + size * 0.5, y - size * 0.9, x + size * 0.5, y - size * 0.4);
  ctx.bezierCurveTo(x + size * 0.5, y - size * 0.8, x, y - size * 0.3, x, y);
  ctx.fill();
  ctx.restore();
}

// ── DRAW CLOUD ──
function drawCloud(p) {
  ctx.save();
  ctx.globalAlpha  = p.opacity;
  ctx.fillStyle    = 'rgba(255, 255, 255, 1)';
  ctx.shadowColor  = 'rgba(147, 200, 238, 0.3)';
  ctx.shadowBlur   = 20;

  const cx = p.x + p.w * 0.5;
  const cy = p.y + p.h * 0.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, p.w * 0.5, p.h * 0.3, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - p.w * 0.2, cy - p.h * 0.15, p.w * 0.25, p.h * 0.35, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + p.w * 0.1, cy - p.h * 0.1, p.w * 0.2, p.h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── DRAW PETAL ──
function drawPetal(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = `rgba(${p.hue}, 1)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size * 0.4, p.size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── UPDATE & DRAW ──
function update() {
  if (!ctx) { rafId = requestAnimationFrame(update); return; }
  ctx.clearRect(0, 0, W(), H());

  // Occasional spawn
  if (Math.random() < 0.04) spawnParticle();

  particles = particles.filter(p => {
    switch (mode) {
      case 'hearts': {
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.8 + p.drift;
        p.y -= p.speed;
        drawHeart(p.x, p.y, p.size, p.hue, p.opacity);
        return p.y > -p.size * 2;
      }
      case 'clouds': {
        p.x += p.speed;
        drawCloud(p);
        return p.x < W() + 250;
      }
      case 'fireflies': {
        p.phase += p.speed;
        p.opacity = Math.max(0, Math.min(p.maxOpacity, Math.sin(p.phase) * p.maxOpacity));
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > W()) p.dx *= -1;
        if (p.y < 0 || p.y > H()) p.dy *= -1;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, 'rgba(255, 240, 180, 1)');
        grad.addColorStop(1, 'rgba(255, 240, 180, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      }
      case 'petals': {
        p.y += p.speed;
        p.x += Math.sin(p.y * 0.02) * 0.8 + p.drift;
        p.rot += p.rotSpeed;
        drawPetal(p);
        return p.y < H() + 30;
      }
    }
    return false;
  });

  rafId = requestAnimationFrame(update);
}

// ── SWITCH MODE ──
export function setEffect(newMode) {
  mode = newMode;
  particles = [];
  // Pre-populate clouds / fireflies
  if (mode === 'clouds') {
    for (let i = 0; i < 5; i++) {
      const p = factories.clouds();
      p.x = Math.random() * W();
      particles.push(p);
    }
  }
  if (mode === 'fireflies') {
    for (let i = 0; i < 30; i++) particles.push(factories.fireflies());
  }
}

// ── INIT ──
export function initSkyCanvas() {
  if (!canvas) return;
  resize();
  window.addEventListener('resize', resize, { passive: true });

  mode = store.get('bgEffect') || 'hearts';
  setEffect(mode);
  update();

  store.on('bgEffect', (val) => setEffect(val || 'hearts'));
  store.on('*', (key) => {
    if (key === 'import' || key === 'reset') setEffect(store.get('bgEffect') || 'hearts');
  });
}

export function destroySkyCanvas() {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('resize', resize);
}
