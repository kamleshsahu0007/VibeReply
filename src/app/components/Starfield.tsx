"use client";

import { useEffect, useRef } from "react";

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const STAR_COUNT = 150;
    const SPEED = 2.5;
    const stars: { x: number; y: number; z: number; px: number; py: number }[] = [];

    // Initialize stars
    for (let i = 0; i < STAR_COUNT; i++) {
      const z = Math.random() * width;
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const cx = width / 2;
      const cy = height / 2;
      stars.push({
        x,
        y,
        z,
        px: (x / z) * cx + cx,
        py: (y / z) * cy + cy,
      });
    }

    const animate = () => {
      // Draw trailing fade background to create velocity blur
      ctx.fillStyle = "rgba(2, 2, 10, 0.25)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < STAR_COUNT; i++) {
        const star = stars[i];
        
        // Move closer (decrease Z depth)
        star.z -= SPEED;

        // Reset star if it passes the screen
        if (star.z <= 0) {
          star.z = width;
          star.x = (Math.random() - 0.5) * width;
          star.y = (Math.random() - 0.5) * height;
          star.px = (star.x / star.z) * cx + cx;
          star.py = (star.y / star.z) * cy + cy;
          continue;
        }

        // Project 3D coordinates onto 2D viewport
        const x = (star.x / star.z) * cx + cx;
        const y = (star.y / star.z) * cy + cy;

        // Draw star trail line
        if (
          star.px > 0 &&
          star.px < width &&
          star.py > 0 &&
          star.py < height &&
          x > 0 &&
          x < width &&
          y > 0 &&
          y < height
        ) {
          ctx.beginPath();
          // Fade in star as it approaches the screen
          const opacity = Math.min(1, (1 - star.z / width) * 1.5);
          ctx.strokeStyle = `rgba(0, 242, 254, ${opacity})`;
          ctx.lineWidth = Math.min(2.5, (1 - star.z / width) * 3);
          ctx.moveTo(star.px, star.py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        // Cache coordinates for next frame trail calculation
        star.px = x;
        star.py = y;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -2,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
