import { useEffect, useRef } from 'react';

const METAL_TILE_SIZE = 100;
const GRID_OFFSET = 3;
const BASE_CLEAR_COLOR = '#000';

class MetallicOctagon {
  private baseX: number;
  private baseY: number;
  private x: number;
  private y: number;
  private wavePhase: number;
  private colorPhase: number;
  private rotation = 0;

  constructor(
    private readonly row: number,
    private readonly col: number,
    private readonly size: number,
    private readonly ctx: CanvasRenderingContext2D
  ) {
    this.baseX = col * size;
    this.baseY = row * size;
    this.x = this.baseX;
    this.y = this.baseY;
    this.wavePhase = (row * 0.5 + col * 0.4) * Math.PI;
    this.colorPhase = (row * 0.3 + col * 0.6) * Math.PI;
  }

  update(time: number) {
    const waveX = Math.sin(time + this.wavePhase) * 4;
    const waveY = Math.cos(time * 0.8 + this.wavePhase * 0.7) * 3;
    this.x = this.baseX + waveX;
    this.y = this.baseY + waveY;
    this.rotation = Math.sin(time * 0.5 + this.wavePhase) * 0.03;
  }

  private getColor(baseValue: number, time: number) {
    const wave = Math.sin(time + this.colorPhase) * 0.5 + 0.5;
    const minVal = baseValue - 15;
    const maxVal = baseValue + 15;
    const colorVal = Math.floor(minVal + (maxVal - minVal) * wave);
    return `rgb(${colorVal}, ${colorVal}, ${colorVal})`;
  }

  draw(time: number) {
    const ctx = this.ctx;
    const s = this.size;
    const third = s / 3;
    const half = s / 2;

    ctx.save();
    ctx.translate(this.x + half, this.y + half);
    ctx.rotate(this.rotation);
    ctx.translate(-half, -half);

    ctx.fillStyle = this.getColor(10, time * 0.5);
    ctx.fillRect(0, 0, s, s);

    const centerX = half;
    const centerY = half;

    ctx.fillStyle = this.getColor(60, time);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(third, third);
    ctx.lineTo(s - third, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(35, time * 0.9);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(s - third, third);
    ctx.lineTo(s - third, half);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(50, time * 1.1);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(s - third, half);
    ctx.lineTo(s - third, s - third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(40, time * 0.95);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(s - third, s - third);
    ctx.lineTo(half, s - third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(25, time * 1.05);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(half, s - third);
    ctx.lineTo(third, s - third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(20, time);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(third, s - third);
    ctx.lineTo(third, half);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(45, time * 1.15);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(third, half);
    ctx.lineTo(third, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(55, time * 0.85);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(third, third);
    ctx.lineTo(half, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(70, time * 1.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(third, 0);
    ctx.lineTo(0, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(15, time * 0.8);
    ctx.beginPath();
    ctx.moveTo(third, 0);
    ctx.lineTo(third, third);
    ctx.lineTo(0, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(70, time * 1.3);
    ctx.beginPath();
    ctx.moveTo(s - third, 0);
    ctx.lineTo(s, 0);
    ctx.lineTo(s - third, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(15, time * 0.7);
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(s, third);
    ctx.lineTo(s - third, third);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(70, time * 1.1);
    ctx.beginPath();
    ctx.moveTo(s - third, s - third);
    ctx.lineTo(s, s - third);
    ctx.lineTo(s - third, s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(15, time * 0.9);
    ctx.beginPath();
    ctx.moveTo(s, s - third);
    ctx.lineTo(s, s);
    ctx.lineTo(s - third, s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(70, time);
    ctx.beginPath();
    ctx.moveTo(0, s - third);
    ctx.lineTo(third, s - third);
    ctx.lineTo(0, s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.getColor(15, time * 1.1);
    ctx.beginPath();
    ctx.moveTo(third, s - third);
    ctx.lineTo(third, s);
    ctx.lineTo(0, s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(50, 50, 50, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, s, s);

    ctx.restore();
  }
}

export default function MetallicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let time = 0;
    let animationFrame = 0;
    let octagons: MetallicOctagon[] = [];

    const rebuildGrid = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      octagons = [];
      const rows = Math.ceil(height / METAL_TILE_SIZE) + GRID_OFFSET * 2;
      const cols = Math.ceil(width / METAL_TILE_SIZE) + GRID_OFFSET * 2;
      for (let row = -GRID_OFFSET; row < rows; row++) {
        for (let col = -GRID_OFFSET; col < cols; col++) {
          octagons.push(new MetallicOctagon(row, col, METAL_TILE_SIZE, ctx));
        }
      }
    };

    const drawFrame = () => {
      ctx.fillStyle = BASE_CLEAR_COLOR;
      ctx.fillRect(0, 0, width, height);
      time += 0.015;
      for (let i = 0; i < octagons.length; i++) {
        const piece = octagons[i];
        piece.update(time);
        piece.draw(time);
      }
      animationFrame = requestAnimationFrame(drawFrame);
    };

    rebuildGrid();
    animationFrame = requestAnimationFrame(drawFrame);

    const handleResize = () => {
      rebuildGrid();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="metallic-background-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="metallic-background-canvas" />
    </div>
  );
}
