"use client";
import React, { useRef, useEffect } from 'react';

export const BackgroundFx: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
        
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    let config = {
        pulseSpeed: 1,
        glowIntensity: 1.5,
        colorIntensity: 1.5
    };
    
    const colors = {
        darkBlue: '#001a33',
        emerald: '#0d4d4d',
        darkEmerald: '#063333',
        gold: '#ffd700',
        darkGold: '#b8860b',
        brightGold: '#ffea80'
    };
    
    const meshSize = 40;
    const waveHeight = 30;
    const particles: any[] = [];
    const particleCount = 200;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 3 + 1,
            speedX: Math.random() * 2 - 1,
            speedY: Math.random() * 2 - 1,
            color: i % 3 === 0 ? colors.darkBlue : (i % 3 === 1 ? colors.emerald : colors.gold),
            pulseOffset: Math.random() * Math.PI * 2
        });
    }
    
    function animate(time: number) {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        
        const t = time * 0.001;
        
        ctx.lineWidth = 1.5;
        
        for (let y = 0; y < height; y += meshSize) {
            ctx.beginPath();
            
            for (let x = 0; x < width; x += 5) {
                const wave = Math.sin(x * 0.01 + t) * waveHeight + 
                             Math.sin(y * 0.005 + t * 1.5) * waveHeight * 0.5;
                
                const waveY = y + wave;
                
                if (x === 0) {
                    ctx.moveTo(x, waveY);
                } else {
                    ctx.lineTo(x, waveY);
                }
            }
            
            const pulse = Math.sin(t * 2 * config.pulseSpeed + y * 0.01) * 0.5 + 0.5;
            const gradient = ctx.createLinearGradient(0, y, width, y);
            
            gradient.addColorStop(0, colors.darkBlue);
            gradient.addColorStop(0.3, mixColors(colors.emerald, colors.gold, pulse));
            gradient.addColorStop(0.5, mixColors(colors.gold, colors.brightGold, pulse * config.colorIntensity));
            gradient.addColorStop(0.7, mixColors(colors.brightGold, colors.emerald, pulse));
            gradient.addColorStop(1, colors.darkBlue);
            
            ctx.strokeStyle = gradient;
            ctx.stroke();
            
            ctx.beginPath();
            
            for (let x = 0; x < width; x += 5) {
                const wave = Math.sin(x * 0.01 + t) * waveHeight + 
                             Math.sin(y * 0.005 + t * 1.5) * waveHeight * 0.5;
                
                const waveY = y + wave;
                
                if (x === 0) {
                    ctx.moveTo(x, waveY);
                } else {
                    ctx.lineTo(x, waveY);
                }
            }
            
            ctx.lineWidth = 8 * config.glowIntensity;
            ctx.strokeStyle = `rgba(0, 200, 150, ${0.1 * config.glowIntensity})`;
            ctx.stroke();
        }
        
        for (let x = 0; x < width; x += meshSize) {
            ctx.beginPath();
            
            for (let y = 0; y < height; y += 5) {
                const wave = Math.sin(y * 0.01 + t * 1.2) * waveHeight + 
                             Math.sin(x * 0.005 + t) * waveHeight * 0.5;
                
                const waveX = x + wave;
                
                if (y === 0) {
                    ctx.moveTo(waveX, y);
                } else {
                    ctx.lineTo(waveX, y);
                }
            }
            
            const pulse = Math.sin(t * 2 * config.pulseSpeed + x * 0.01) * 0.5 + 0.5;
            const gradient = ctx.createLinearGradient(x, 0, x, height);
            
            gradient.addColorStop(0, colors.darkBlue);
            gradient.addColorStop(0.3, mixColors(colors.emerald, colors.gold, pulse));
            gradient.addColorStop(0.5, mixColors(colors.gold, colors.brightGold, pulse * config.colorIntensity));
            gradient.addColorStop(0.7, mixColors(colors.brightGold, colors.emerald, pulse));
            gradient.addColorStop(1, colors.darkBlue);
            
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = gradient;
            ctx.stroke();
            
            ctx.beginPath();
            
            for (let y = 0; y < height; y += 5) {
                const wave = Math.sin(y * 0.01 + t * 1.2) * waveHeight + 
                             Math.sin(x * 0.005 + t) * waveHeight * 0.5;
                
                const waveX = x + wave;
                
                if (y === 0) {
                    ctx.moveTo(waveX, y);
                } else {
                    ctx.lineTo(waveX, y);
                }
            }
            
            ctx.lineWidth = 8 * config.glowIntensity;
            ctx.strokeStyle = `rgba(0, 200, 150, ${0.1 * config.glowIntensity})`;
            ctx.stroke();
        }
        
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            if (p.x > width) p.x = 0;
            if (p.x < 0) p.x = width;
            if (p.y > height) p.y = 0;
            if (p.y < 0) p.y = height;
            
            p.x += Math.sin(t + p.y * 0.01) * 0.5;
            p.y += Math.cos(t + p.x * 0.01) * 0.5;
            
            const pulseSize = p.size * (0.8 + 0.5 * Math.sin(t * 3 + p.pulseOffset));
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulseSize * 2, 0, Math.PI * 2);
            ctx.fillStyle = `${p.color}40`;
            ctx.fill();
        });
        
        requestAnimationFrame(animate);
    }
    
    function mixColors(color1: string, color2: string, ratio: number) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        if(canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }
    };

    window.addEventListener('resize', handleResize);
    
    animate(0);

    return () => {
        window.removeEventListener('resize', handleResize);
    }
  }, []);

  return <canvas ref={canvasRef} id="canvas" className="fixed top-0 left-0 -z-10"></canvas>;
};
    
