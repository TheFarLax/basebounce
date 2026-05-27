import React, { useEffect, useRef } from 'react';
import { useAudio } from '../hooks/useAudio';

interface GameCanvasProps {
  gameState: 'HOME' | 'PLAYING' | 'GAMEOVER';
  onGameOver: (score: number) => void;
  onScoreChange: (score: number) => void;
  score: number;
}

// Fixed logical coordinate system for cross-device physics consistency
const LOGICAL_WIDTH = 360;
const LOGICAL_HEIGHT = 640;

interface Obstacle {
  x: number;
  width: number;
  gapY: number;      // Center position of the gap
  gapHeight: number; // Height of the passage gap
  passed: boolean;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

interface BgParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onGameOver,
  onScoreChange,
  score,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { playBounce, playScore, playGameOver } = useAudio();

  // Physics States (using refs to avoid React re-render overhead in the 60fps loop)
  const playerRef = useRef({
    y: LOGICAL_HEIGHT / 2,
    vy: 0,
    radius: 12,
    gravity: 0.16,
    bounceImpulse: -3.8,
    maxFallSpeed: 5.0,
    glowIntensity: 0,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bgParticlesRef = useRef<BgParticle[]>([]);
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const scoreRef = useRef<number>(0);
  const gameFrameRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);
  const speedScaleRef = useRef<number>(1);
  const hasStartedRef = useRef<boolean>(false);

  // Synchronize score prop with our high-performance ref
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const onGameOverRef = useRef(onGameOver);
  const onScoreChangeRef = useRef(onScoreChange);

  // Synchronize callbacks to avoid rebuilding/restarting the rendering loop
  useEffect(() => {
    onGameOverRef.current = onGameOver;
    onScoreChangeRef.current = onScoreChange;
  }, [onGameOver, onScoreChange]);

  // Create initial stars/particles in background
  useEffect(() => {
    const bgList: BgParticle[] = [];
    for (let i = 0; i < 20; i++) {
      bgList.push({
        x: Math.random() * LOGICAL_WIDTH,
        y: Math.random() * LOGICAL_HEIGHT,
        radius: Math.random() * 2 + 1,
        speed: Math.random() * 0.15 + 0.05,
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
    bgParticlesRef.current = bgList;
  }, []);

  // Handle Resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const parentWidth = rect.width;
      const parentHeight = rect.height;

      // We maintain the 9:16 aspect ratio in container bounds
      const containerAspect = parentWidth / parentHeight;
      const targetAspect = LOGICAL_WIDTH / LOGICAL_HEIGHT;

      let displayWidth = parentWidth;
      let displayHeight = parentHeight;

      if (containerAspect > targetAspect) {
        // Parent is wider than 9:16 - lock height and adjust width
        displayHeight = parentHeight;
        displayWidth = parentHeight * targetAspect;
      } else {
        // Parent is taller than 9:16 - lock width and adjust height
        displayWidth = parentWidth;
        displayHeight = parentWidth / targetAspect;
      }

      // Set canvas pixel dimensions to match display bounding box multiplied by devicePixelRatio for razor sharp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Jump Action Trigger
  const triggerJump = () => {
    if (gameState !== 'PLAYING') return;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
    }

    // Apply impulse
    playerRef.current.vy = playerRef.current.bounceImpulse;
    playerRef.current.glowIntensity = 1.0; // Flash glow on tap
    playBounce();

    // Spawn tiny tap particles
    const player = playerRef.current;
    for (let i = 0; i < 6; i++) {
      particlesRef.current.push({
        x: LOGICAL_WIDTH * 0.25,
        y: player.y,
        vx: (Math.random() - 0.5) * 3 - 1,
        vy: (Math.random() - 0.5) * 3,
        radius: Math.random() * 3 + 2,
        color: i % 2 === 0 ? '#0052FF' : '#3375FF',
        alpha: 0.8,
        decay: Math.random() * 0.03 + 0.02,
      });
    }
  };

  // Keyboard, Click, and Touch Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Avoid firing if they click an overlay button
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      triggerJump();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
      e.preventDefault(); // Stop double taps zooming on mobile
      triggerJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameState]);

  // Main Loop logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === 'PLAYING') {
      // Reset game elements
      playerRef.current.y = LOGICAL_HEIGHT / 2;
      playerRef.current.vy = 0;
      obstaclesRef.current = [];
      particlesRef.current = [];
      trailRef.current = [];
      speedScaleRef.current = 1.0;
      gameFrameRef.current = 0;
      hasStartedRef.current = false;
    }

    const updateAndRender = () => {
      const dpr = window.devicePixelRatio || 1;
      const actualWidth = canvas.width / dpr;
      const actualHeight = canvas.height / dpr;
      const scaleX = actualWidth / LOGICAL_WIDTH;
      const scaleY = actualHeight / LOGICAL_HEIGHT;

      // 1. Clear with subtle radial wash
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr * scaleX, dpr * scaleY);

      // --- GAMEPLAY LOGIC ---
      if (gameState === 'PLAYING') {
        gameFrameRef.current++;

        const player = playerRef.current;

        if (!hasStartedRef.current) {
          // Floating idle hover effect
          player.y = LOGICAL_HEIGHT / 2 + Math.sin(gameFrameRef.current * 0.08) * 12;
          player.vy = 0;

          // Render gorgeous tapping instruction hints directly inside the playing screen
          ctx.save();
          ctx.font = '900 13px "Outfit", "Inter", sans-serif';
          ctx.fillStyle = '#0052FF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Subtle pulse animation
          const pulseScale = 1.0 + Math.sin(gameFrameRef.current * 0.08) * 0.05;
          ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.72);
          ctx.scale(pulseScale, pulseScale);
          ctx.fillText('TAP SCREEN OR SPACEBAR TO START', 0, 0);
          ctx.restore();
        } else {
          // Speed ramp up slowly based on score
          speedScaleRef.current = 1.0 + Math.min(scoreRef.current * 0.015, 0.6);

          // Update player physics
          player.vy += player.gravity;
          if (player.vy > player.maxFallSpeed) player.vy = player.maxFallSpeed;
          player.y += player.vy;

          // Decaying glow
          if (player.glowIntensity > 0) {
            player.glowIntensity -= 0.05;
          }

          // Ceiling & floor collision
          if (player.y - player.radius <= 0) {
            player.y = player.radius;
            player.vy = 0.5; // Bump back down gently
          }
          if (player.y + player.radius >= LOGICAL_HEIGHT) {
            // Crashed on floor!
            console.warn("GAME_OVER_TRIGGERED: Ground Collision!", {
              playerY: player.y,
              playerRadius: player.radius,
              logicalHeight: LOGICAL_HEIGHT
            });
            playGameOver();
            onGameOverRef.current(scoreRef.current);
            return;
          }

          // Add player coordinate to trail
          trailRef.current.push({ x: LOGICAL_WIDTH * 0.25, y: player.y });
          if (trailRef.current.length > 12) {
            trailRef.current.shift();
          }

          // Spawn obstacles (every 160 frames ~ 2.6 seconds)
          const spawnInterval = Math.max(130, 160 - Math.floor(scoreRef.current * 0.8));
          if (gameFrameRef.current % spawnInterval === 0) {
            // Dynamic gap heights (gets narrower as score increases)
            const baseGapHeight = 150;
            const minGapHeight = 115;
            const gapHeight = Math.max(minGapHeight, baseGapHeight - scoreRef.current * 0.8);

            // Center must be within bounds [80, LOGICAL_HEIGHT - 80]
            const minCenter = 100 + gapHeight / 2;
            const maxCenter = LOGICAL_HEIGHT - 100 - gapHeight / 2;
            const gapY = Math.random() * (maxCenter - minCenter) + minCenter;

            obstaclesRef.current.push({
              x: LOGICAL_WIDTH,
              width: 48,
              gapY,
              gapHeight,
              passed: false,
              speed: 1.5 * speedScaleRef.current,
            });
          }

          // Update obstacles
          const obstacles = obstaclesRef.current;
          for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= obs.speed;

            // Check if player passed obstacle successfully
            if (!obs.passed && obs.x + obs.width < LOGICAL_WIDTH * 0.25) {
              obs.passed = true;
              const newScore = scoreRef.current + 1;
              onScoreChangeRef.current(newScore);
              playScore();

              // Emit green pass particles
              for (let p = 0; p < 8; p++) {
                particlesRef.current.push({
                  x: LOGICAL_WIDTH * 0.25 + 10,
                  y: player.y + (Math.random() - 0.5) * 15,
                  vx: Math.random() * 2 + 1,
                  vy: (Math.random() - 0.5) * 2,
                  radius: Math.random() * 2 + 2,
                  color: '#34D399', // Emerald particle
                  alpha: 0.9,
                  decay: 0.04,
                });
              }
            }

            // AABB Circle Collision check with rounded pillars
            const px = LOGICAL_WIDTH * 0.25;
            const py = player.y;
            const r = player.radius - 1; // Subtle grace margin for better gameplay feel

            // Top Pillar bounds: Box from (obs.x, 0) to (obs.x + obs.width, obs.gapY - obs.gapHeight/2)
            const topBottomY = obs.gapY - obs.gapHeight / 2;
            // Bottom Pillar bounds: Box from (obs.x, obs.gapY + obs.gapHeight/2) to (obs.x + obs.width, LOGICAL_HEIGHT)
            const bottomTopY = obs.gapY + obs.gapHeight / 2;

            const collidesTop = checkCircleBoxCollision(px, py, r, obs.x, 0, obs.width, topBottomY);
            const collidesBottom = checkCircleBoxCollision(px, py, r, obs.x, bottomTopY, obs.width, LOGICAL_HEIGHT - bottomTopY);

            if (collidesTop || collidesBottom) {
              // Collision! Spawn failure particles
              console.warn("GAME_OVER_TRIGGERED: Pillar Collision!", {
                collidesTop,
                collidesBottom,
                playerX: px,
                playerY: py,
                playerRadius: r,
                obstacle: obs
              });
              playGameOver();
              for (let f = 0; f < 15; f++) {
                particlesRef.current.push({
                  x: px,
                  y: py,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  radius: Math.random() * 4 + 3,
                  color: '#EF4444', // Red impact particles
                  alpha: 1.0,
                  decay: 0.03,
                });
              }
              onGameOverRef.current(scoreRef.current);
              return;
            }

            // Remove off-screen obstacles
            if (obs.x + obs.width < -10) {
              obstacles.splice(i, 1);
            }
          }
        }
      }

      // --- RENDERING ---

      // 1. Draw Ambient Background Parallax Particles
      bgParticlesRef.current.forEach((star) => {
        if (gameState === 'PLAYING') {
          star.x -= star.speed * speedScaleRef.current;
          if (star.x < 0) {
            star.x = LOGICAL_WIDTH;
            star.y = Math.random() * LOGICAL_HEIGHT;
          }
        }
        ctx.fillStyle = `rgba(0, 82, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Obstacles
      obstaclesRef.current.forEach((obs) => {
        const topHeight = obs.gapY - obs.gapHeight / 2;
        const bottomTop = obs.gapY + obs.gapHeight / 2;
        const bottomHeight = LOGICAL_HEIGHT - bottomTop;

        // Glassmorphic styling for pillars
        const drawPillar = (x: number, y: number, w: number, h: number, isTop: boolean) => {
          ctx.save();
          
          // Draw elegant rounded pillar path
          ctx.beginPath();
          const radius = 8; // rounded caps
          if (isTop) {
            // Top pillar: round only the bottom corners
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + h - radius);
            ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
            ctx.arcTo(x, y + h, x, y + h - radius, radius);
            ctx.closePath();
          } else {
            // Bottom pillar: round only the top corners
            ctx.moveTo(x, y + radius);
            ctx.arcTo(x, y, x + radius, y, radius);
            ctx.arcTo(x + w, y, x + w, y + radius, radius);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
          }

          // Create soft gradient fill
          const grad = ctx.createLinearGradient(x, y, x + w, y);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
          grad.addColorStop(1, 'rgba(240, 244, 255, 0.85)');
          ctx.fillStyle = grad;
          ctx.fill();

          // Stroke with a delicate Base blue outline
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(0, 82, 255, 0.12)';
          ctx.stroke();

          // Accent ring cap
          ctx.fillStyle = 'rgba(0, 82, 255, 0.08)';
          ctx.beginPath();
          if (isTop) {
            ctx.arc(x + w/2, y + h - 8, 10, 0, Math.PI, false);
          } else {
            ctx.arc(x + w/2, y + 8, 10, 0, Math.PI, true);
          }
          ctx.fill();

          ctx.restore();
        };

        drawPillar(obs.x, 0, obs.width, topHeight, true);
        drawPillar(obs.x, bottomTop, obs.width, bottomHeight, false);
      });

      // 3. Draw Player Trail Ribbon
      if (trailRef.current.length > 1) {
        ctx.save();
        for (let i = 0; i < trailRef.current.length - 1; i++) {
          const pt1 = trailRef.current[i];
          const pt2 = trailRef.current[i + 1];
          const alpha = (i / trailRef.current.length) * 0.28;
          const radius = playerRef.current.radius * (0.3 + (i / trailRef.current.length) * 0.7);

          ctx.beginPath();
          ctx.strokeStyle = `rgba(0, 82, 255, ${alpha})`;
          ctx.lineWidth = radius * 2;
          ctx.lineCap = 'round';
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 4. Draw Player Orb
      const player = playerRef.current;
      const px = LOGICAL_WIDTH * 0.25;
      const py = player.y;

      ctx.save();
      // Outer drop shadow
      ctx.shadowColor = 'rgba(0, 82, 255, 0.35)';
      ctx.shadowBlur = 10 + player.glowIntensity * 12;

      // Base blue gradient core
      const ballGrad = ctx.createRadialGradient(
        px - 3, py - 3, 2,
        px, py, player.radius
      );
      ballGrad.addColorStop(0, '#FFFFFF'); // Highlight gleam
      ballGrad.addColorStop(0.2, '#6699FF');
      ballGrad.addColorStop(0.8, '#0052FF'); // Pure Base Blue
      ballGrad.addColorStop(1, '#003BB3');

      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(px, py, player.radius, 0, Math.PI * 2);
      ctx.fill();

      // Delicate bright rim stroke
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // 5. Draw Dynamic Particle Trails
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0; // Reset alpha

      ctx.restore(); // Restore scale dpr

      // Loop
      requestRef.current = requestAnimationFrame(updateAndRender);
    };

    requestRef.current = requestAnimationFrame(updateAndRender);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [gameState]);

  // Clean collision detector helper
  const checkCircleBoxCollision = (
    cx: number, cy: number, radius: number, // circle
    rx: number, ry: number, rw: number, rh: number // box
  ): boolean => {
    // Find closest point on the box to the circle center
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));

    // Calculate distance vector
    const dx = cx - closestX;
    const dy = cy - closestY;

    // Euclidean distance squared
    const distanceSq = dx * dx + dy * dy;
    return distanceSq < radius * radius;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-blue-50/20"
    >
      <canvas
        ref={canvasRef}
        className="block shadow-premium rounded-3xl border border-white/50 backdrop-blur-sm aspect-[9/16] bg-transparent max-h-[85vh] cursor-pointer"
      />
    </div>
  );
};
