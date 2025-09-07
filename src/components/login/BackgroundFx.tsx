"use client";
import React, { useRef, useEffect } from 'react';

declare global {
  interface Window {
    __LEE_LOAD_STATE?: {
      active: boolean;
      phase: 'idle' | 'vortex' | 'trace' | 'fade';
    };
    startTimeTrace?: number;
  }
}

export const BackgroundFx: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    let dpr = 1, width = 0, height = 0;
    function resize() {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      width = Math.floor(window.innerWidth * dpr);
      height = Math.floor(window.innerHeight * dpr);
      if (c) {
        c.width = width;
        c.height = height;
        c.style.width = window.innerWidth + 'px';
        c.style.height = window.innerHeight + 'px';
      }
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    const config = { pulseSpeed: 0.7, glowIntensity: 1.5, colorIntensity: 1.5 };
    const colors = { darkBlue: '#001a33', emerald: '#0d4d4d', darkEmerald: '#063333', gold: '#ffd700', darkGold: '#b8860b', brightGold: '#ffea80' };
    const meshSize = 40 * dpr, waveHeight = 30 * dpr;

    const particles = Array.from({ length: 200 }, () => ({
      x: Math.random() * width, y: Math.random() * height, size: (Math.random() * 3 + 1) * dpr,
      speedX: (Math.random() * 2 - 1) * dpr * 0.6, speedY: (Math.random() * 2 - 1) * dpr * 0.6,
      color: ['#001a33', '#0d4d4d', '#ffd700'][Math.floor(Math.random() * 3)],
      pulseOffset: Math.random() * Math.PI * 2
    }));

    function mix(a: string, b: string, r: number) {
      const r1 = parseInt(a.slice(1, 3), 16), g1 = parseInt(a.slice(3, 5), 16), b1 = parseInt(a.slice(5, 7), 16);
      const r2 = parseInt(b.slice(1, 3), 16), g2 = parseInt(b.slice(3, 5), 16), b2 = parseInt(b.slice(5, 7), 16);
      const R = Math.round(r1 * (1 - r) + r2 * r), G = Math.round(g1 * (1 - r) + g2 * r), B = Math.round(b1 * (1 - r) + b2 * r);
      return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
    }

    if (!window.__LEE_LOAD_STATE) {
      window.__LEE_LOAD_STATE = { active: false, phase: 'idle' };
    }
    
    let animationFrameId: number;

    function animate(time: number) {
      const LS = window.__LEE_LOAD_STATE!;
      const t = time * 0.0005;
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1.5 * dpr;

      for (let y = 0; y < height; y += meshSize) {
        ctx.beginPath();
        for (let x = 0; x < width; x += 5 * dpr) {
          const wave = Math.sin(x * 0.01 + t) * waveHeight + Math.sin(y * 0.005 + t * 1.5) * waveHeight * 0.5;
          const yy = y + wave;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        const pulse = Math.sin(t * 2 * config.pulseSpeed + y * 0.01) * 0.5 + 0.5;
        const grad = ctx.createLinearGradient(0, y, width, y);
        grad.addColorStop(0, colors.darkBlue);
        grad.addColorStop(0.3, mix(colors.emerald, colors.gold, pulse));
        grad.addColorStop(0.5, mix(colors.gold, colors.brightGold, pulse * config.colorIntensity));
        grad.addColorStop(0.7, mix(colors.brightGold, colors.emerald, pulse));
        grad.addColorStop(1, colors.darkBlue);
        ctx.strokeStyle = grad; ctx.stroke();
      }

      for (const p of particles) {
        p.x += p.speedX; p.y += p.speedY;
        if (p.x > width || p.x < 0) p.speedX *= -1;
        if (p.y > height || p.y < 0) p.speedY *= -1;
        const ps = p.size * (0.8 + 0.5 * Math.sin(t * 3 + p.pulseOffset));
        ctx.beginPath(); ctx.arc(p.x, p.y, ps, 0, Math.PI * 2); ctx.fillStyle = p.color;
        ctx.globalAlpha = LS.active ? 0.85 : 1; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, ps * 2, 0, Math.PI * 2); ctx.fillStyle = p.color + "40";
        ctx.globalAlpha = 1; ctx.fill();
      }

      if (LS.active && LS.phase === 'trace') {
        const started = window.startTimeTrace || (window.startTimeTrace = performance.now());
        const p = Math.min(1, (performance.now() - started) / 1600);
        const margin = 80 * dpr, bw = width - margin * 2, bh = height - margin * 2;
        ctx.save(); ctx.lineWidth = 2 * dpr; ctx.strokeStyle = 'rgba(255,215,0,0.85)';
        ctx.strokeRect(margin, margin, bw * p, bh * p);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animate(0);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} id="bgFX" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, display: 'block', background: '#030806' }} />;
};
