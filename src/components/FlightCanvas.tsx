import React, { useEffect, useRef } from 'react';

interface FlightCanvasProps {
  multiplier: number;
  remainingSeconds: number;
  totalDuration: number;
  isTransitioning: boolean;
  animationsEnabled: boolean;
}

export const FlightCanvas: React.FC<FlightCanvasProps> = ({
  multiplier,
  remainingSeconds,
  totalDuration,
  isTransitioning,
  animationsEnabled,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background telemetry grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      for (let x = 20; x < width; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = 15; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Calculate progress along current cycle
      const progress = totalDuration > 0 
        ? Math.max(0.05, Math.min(0.95, 1 - remainingSeconds / totalDuration))
        : 0.5;

      // Trajectory curve
      const startX = 20;
      const startY = height - 20;
      
      const targetX = startX + (width - 60) * (isTransitioning ? 0.98 : progress);
      // Altitude curve: higher multipliers rise higher
      const maxRise = height * 0.72;
      const targetY = startY - maxRise * Math.pow(progress, 1.4);

      const controlX = startX + (targetX - startX) * 0.55;
      const controlY = startY;

      // Draw gradient under curve
      const areaGradient = ctx.createLinearGradient(0, targetY, 0, height);
      areaGradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
      areaGradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
      ctx.lineTo(targetX, startY);
      ctx.closePath();
      ctx.fillStyle = areaGradient;
      ctx.fill();

      // Draw primary flight curve line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = animationsEnabled ? 12 : 4;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw dashed trajectory forecast line ahead
      if (!isTransitioning && progress < 0.92) {
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        const forecastX = Math.min(width - 25, targetX + 45);
        const forecastY = Math.max(15, targetY - 22);
        ctx.lineTo(forecastX, forecastY);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Jet marker / plane at tip of trajectory
      ctx.save();
      ctx.translate(targetX, targetY);
      // Angle tangent calculation
      const angle = -Math.atan2(startY - targetY, targetX - controlX) * 0.65;
      ctx.rotate(angle);

      // Jet Glow
      if (animationsEnabled) {
        const pulse = 1 + Math.sin(time * 0.1) * 0.15;
        const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16 * pulse);
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        glowGrad.addColorStop(0.3, 'rgba(239, 68, 68, 0.8)');
        glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Jet icon path
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-7, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();

      // Jet thruster exhaust particle
      if (animationsEnabled) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(-12 - Math.random() * 4, 0);
        ctx.lineTo(-5, 2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // Floating telemetry altitude text
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`${(1.0 + (multiplier - 1.0) * progress).toFixed(2)}x ALT`, Math.max(10, targetX - 45), Math.max(20, targetY - 14));

      time++;
      if (animationsEnabled) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [multiplier, remainingSeconds, totalDuration, isTransitioning, animationsEnabled]);

  return (
    <div className="w-full h-36 relative overflow-hidden rounded-xl bg-zinc-950/80 border border-zinc-800/80">
      <canvas
        ref={canvasRef}
        width={380}
        height={144}
        className="w-full h-full block"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        HUD RADAR
      </div>
    </div>
  );
};
