"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { Satellite, Clock, Search } from "lucide-react";

// Keyframes
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(1deg); }
  75% { transform: translateY(5px) rotate(-1deg); }
`;

const pulseGlow = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.4))
            drop-shadow(0 0 40px rgba(59, 130, 246, 0.2));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(59, 130, 246, 0.6))
            drop-shadow(0 0 80px rgba(59, 130, 246, 0.4));
  }
`;

const particleFloat = keyframes`
  0% {
    transform: translateY(100%) rotate(0deg);
    opacity: 0;
  }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% {
    transform: translateY(-100vh) rotate(360deg);
    opacity: 0;
  }
`;


const orbitRing = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const signalPulse = keyframes`
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1); }
`;

const sandFall = keyframes`
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(80px); opacity: 0; }
`;

const scanLine = keyframes`
  0% { transform: translateY(-50px); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateY(50px); opacity: 0; }
`;

// Exit animation - simple and clean
type ExitPhase = "none" | "zooming";

// Styled Components
interface ContainerProps {
  $isExiting: boolean;
}

const Container = styled.div<ContainerProps>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(ellipse at center, #0a0a1a 0%, #000005 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;

  ${({ $isExiting }) =>
    $isExiting &&
    css`
      animation: ${fadeOut} 0.8s ease-out forwards;
    `}
`;

const StarsContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
`;

interface StarProps {
  $size: number;
  $top: number;
  $left: number;
  $delay: number;
  $duration: number;
}

const Star = styled.div<StarProps>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: white;
  border-radius: 50%;
  top: ${({ $top }) => $top}%;
  left: ${({ $left }) => $left}%;
  animation: ${twinkle} ${({ $duration }) => $duration}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

// Floating particles
const ParticlesContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
`;

interface ParticleProps {
  $x: number;
  $size: number;
  $duration: number;
  $delay: number;
  $color: string;
}

const Particle = styled.div<ParticleProps>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  bottom: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: ${({ $color }) => $color};
  border-radius: 50%;
  animation: ${particleFloat} ${({ $duration }) => $duration}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  opacity: 0;
`;

// Orbit rings around shape
const OrbitContainer = styled.div`
  position: absolute;
  width: 350px;
  height: 350px;
  pointer-events: none;
`;

const OrbitRing = styled.div<{ $size: number; $duration: number; $delay: number; $color: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  margin-top: ${({ $size }) => -$size / 2}px;
  margin-left: ${({ $size }) => -$size / 2}px;
  border: 1px solid ${({ $color }) => $color};
  border-radius: 50%;
  animation: ${orbitRing} ${({ $duration }) => $duration}s linear infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  opacity: 0.3;
  --rotation: ${({ $delay }) => $delay * 10}deg;
`;

const OrbitDot = styled.div<{ $color: string }>`
  position: absolute;
  top: -3px;
  left: 50%;
  margin-left: -3px;
  width: 6px;
  height: 6px;
  background: ${({ $color }) => $color};
  border-radius: 50%;
  box-shadow: 0 0 10px ${({ $color }) => $color};
`;

// MorphContainer styles (used with motion.div)
const morphContainerStyle = {
  position: "relative" as const,
  width: 300,
  height: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const SVGContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  animation: ${pulseGlow} 3s ease-in-out infinite;
`;

// Micro-interactions
const SignalPulse = styled.div<{ $x: number; $y: number; $delay: number }>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: ${({ $y }) => $y}%;
  width: 8px;
  height: 8px;
  background: #60a5fa;
  border-radius: 50%;
  animation: ${signalPulse} 1.5s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  box-shadow: 0 0 10px #3b82f6;
`;

const SandParticle = styled.div<{ $x: number; $delay: number }>`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: 35%;
  width: 3px;
  height: 3px;
  background: #fbbf24;
  border-radius: 50%;
  animation: ${sandFall} 2s ease-in infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

const ScanLineElement = styled.div`
  position: absolute;
  left: 20%;
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #22c55e, transparent);
  animation: ${scanLine} 2s ease-in-out infinite;
  box-shadow: 0 0 10px #22c55e;
`;

// Phase indicator
const PhaseIndicator = styled.div`
  position: absolute;
  bottom: -60px;
  display: flex;
  gap: 16px;
  align-items: center;
`;

interface PhaseDotProps {
  $active: boolean;
  $color: string;
}

const PhaseDot = styled.div<PhaseDotProps>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $active, $color }) => ($active ? $color : "rgba(255,255,255,0.2)")};
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform: ${({ $active }) => ($active ? "scale(1.4)" : "scale(1)")};
  box-shadow: ${({ $active, $color }) => ($active ? `0 0 20px ${$color}` : "none")};
`;

interface ContentProps {
  $show: boolean;
  $exitPhase: ExitPhase;
}

const ContentContainer = styled.div<ContentProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-top: 80px;
  opacity: 0;
  transition: all 0.4s ease-out;

  ${({ $show, $exitPhase }) =>
    $show &&
    $exitPhase === "none" &&
    css`
      animation: ${fadeIn} 1s ease-out forwards;
      animation-delay: 0.3s;
    `}

  ${({ $exitPhase }) =>
    $exitPhase === "zooming" &&
    css`
      opacity: 0;
      transform: translateY(-30px) scale(0.95);
    `}
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: 8px;
  text-shadow: 0 0 40px rgba(59, 130, 246, 0.6);

  @media (max-width: 768px) {
    font-size: 2rem;
    letter-spacing: 4px;
  }
`;

const Subtitle = styled.div`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  letter-spacing: 3px;
  text-align: center;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const StartButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 52px;
  margin-top: 15px;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 3px;
  color: white;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
    box-shadow: 0 0 50px rgba(59, 130, 246, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 768px) {
    padding: 14px 36px;
    font-size: 1rem;
  }
`;

// ============================================
// MORPHING SHAPES - Simple iconic forms that morph smoothly
// All shapes use similar bezier structure for smooth interpolation
// ============================================

// Shape 1: Globe/Earth - represents satellite imagery
// A circle with latitude/longitude suggestions
const GLOBE_PATH = `
  M 150 30
  C 216 30 270 84 270 150
  C 270 216 216 270 150 270
  C 84 270 30 216 30 150
  C 30 84 84 30 150 30
  Z
`;

// Shape 2: Hourglass/Time - represents temporal analysis
// Two triangles meeting at center
const TIME_PATH = `
  M 150 30
  C 220 30 220 80 150 150
  C 80 220 80 270 150 270
  C 220 270 220 220 150 150
  C 80 80 80 30 150 30
  Z
`;

// Shape 3: Lens/Eye - represents detection and analysis
// An eye/lens shape
const LENS_PATH = `
  M 150 30
  C 250 30 270 150 270 150
  C 270 150 250 270 150 270
  C 50 270 30 150 30 150
  C 30 150 50 30 150 30
  Z
`;

// Inner details for each shape
// Globe uses shutter/aperture pattern inspired by TimeLens logo
// 6 blades with topographic lines inside each blade
const GLOBE_DETAILS = {
  // Shutter blade paths - 6 blades rotated 60° each
  // Each blade is a wedge from center hexagon to outer circle
  blades: [
    // Blade 0 (top-right) - base blade, others are rotated copies
    {
      // Outer arc and inner edges forming the blade shape
      path: "M 150 95 L 195 65 A 120 120 0 0 1 230 105 L 175 120 Z",
      // Topographic lines inside this blade (organic curves like wood grain)
      topo: [
        "M 160 90 Q 185 75 210 95",
        "M 158 100 Q 180 88 200 100",
        "M 162 108 Q 178 98 192 108",
        "M 168 114 Q 180 108 188 115",
      ],
    },
  ],
  // Center hexagon (negative space) - vertices at 30° intervals
  hexagonCenter: 25, // radius of center hexagon
};

const TIME_DETAILS = {
  // Sand particles flowing
  particles: [
    { cx: 150, cy: 90, r: 4 },
    { cx: 140, cy: 105, r: 3 },
    { cx: 160, cy: 100, r: 3 },
    { cx: 150, cy: 210, r: 4 },
    { cx: 145, cy: 225, r: 3 },
    { cx: 155, cy: 220, r: 3 },
  ],
  // Center flow
  flow: "M 150 130 L 150 170",
};

const LENS_DETAILS = {
  // Pupil/iris
  pupil: { cx: 150, cy: 150, r: 45 },
  innerPupil: { cx: 150, cy: 150, r: 25 },
  // Reflection
  reflection: { cx: 130, cy: 130, r: 12 },
  // Scan lines
  scanLine: "M 80 150 L 220 150",
};

const SHAPES = {
  globe: {
    mainPath: GLOBE_PATH,
    color: "#3b82f6",
    accentColor: "#60a5fa",
    label: "Capturando imagens",
    icon: Satellite,
    details: GLOBE_DETAILS,
  },
  time: {
    mainPath: TIME_PATH,
    color: "#f59e0b",
    accentColor: "#fbbf24",
    label: "Analisando índices espectrais",
    icon: Clock,
    details: TIME_DETAILS,
  },
  lens: {
    mainPath: LENS_PATH,
    color: "#22c55e",
    accentColor: "#4ade80",
    label: "Detectando mudanças",
    icon: Search,
    details: LENS_DETAILS,
  },
};

const SHAPE_ORDER = ["globe", "time", "lens"] as const;
type ShapeType = (typeof SHAPE_ORDER)[number];

// Generate stars
const generateStars = (count: number, seed: number) => {
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: seededRandom(seed + i * 1) * 2.5 + 0.5,
    top: seededRandom(seed + i * 2) * 100,
    left: seededRandom(seed + i * 3) * 100,
    delay: seededRandom(seed + i * 4) * 4,
    duration: seededRandom(seed + i * 5) * 3 + 2,
  }));
};

// Generate particles
const generateParticles = (count: number, seed: number) => {
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899"];

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: seededRandom(seed + i * 1) * 100,
    size: seededRandom(seed + i * 2) * 5 + 2,
    duration: seededRandom(seed + i * 3) * 12 + 8,
    delay: seededRandom(seed + i * 4) * 12,
    color: colors[Math.floor(seededRandom(seed + i * 5) * colors.length)],
  }));
};

const STARS = generateStars(150, 42);
const PARTICLES = generateParticles(40, 123);

// Orbit configurations
const ORBITS = [
  { size: 380, duration: 20, delay: 0, color: "rgba(59, 130, 246, 0.4)" },
  { size: 420, duration: 25, delay: -5, color: "rgba(34, 197, 94, 0.3)" },
  { size: 460, duration: 30, delay: -10, color: "rgba(245, 158, 11, 0.2)" },
];

interface MorphingIntroProps {
  onComplete: () => void;
}

export function MorphingIntro({ onComplete }: MorphingIntroProps) {
  const [showContent, setShowContent] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentShape, setCurrentShape] = useState<ShapeType>("globe");
  const [shapeIndex, setShapeIndex] = useState(0);
  const [exitPhase, setExitPhase] = useState<ExitPhase>("none");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => setShowContent(true), 500);

    // Cycle through shapes
    intervalRef.current = setInterval(() => {
      setShapeIndex((prev) => {
        const next = (prev + 1) % SHAPE_ORDER.length;
        setCurrentShape(SHAPE_ORDER[next]);
        return next;
      });
    }, 4000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Smooth exit animation with framer-motion
    setExitPhase("zooming");

    // Fade container after zoom starts
    setTimeout(() => setIsExiting(true), 700);

    // Callback when animation completes
    setTimeout(() => onComplete(), 1100);
  }, [onComplete]);

  const currentShapeData = SHAPES[currentShape];
  const CurrentIcon = currentShapeData.icon;

  return (
    <Container $isExiting={isExiting}>
      <StarsContainer>
        {isMounted &&
          STARS.map((star) => (
            <Star
              key={star.id}
              $size={star.size}
              $top={star.top}
              $left={star.left}
              $delay={star.delay}
              $duration={star.duration}
            />
          ))}
      </StarsContainer>

      {/* Floating particles */}
      <ParticlesContainer>
        {isMounted &&
          PARTICLES.map((p) => (
            <Particle
              key={p.id}
              $x={p.x}
              $size={p.size}
              $duration={p.duration}
              $delay={p.delay}
              $color={p.color}
            />
          ))}
      </ParticlesContainer>

      {/* Orbit rings */}
      <OrbitContainer>
        {ORBITS.map((orbit, i) => (
          <OrbitRing
            key={i}
            $size={orbit.size}
            $duration={orbit.duration}
            $delay={orbit.delay}
            $color={orbit.color}
          >
            <OrbitDot $color={orbit.color} />
          </OrbitRing>
        ))}
      </OrbitContainer>

      <motion.div
        style={morphContainerStyle}
        initial={{
          scale: 1,
          opacity: 1,
          filter: "blur(0px) brightness(1)",
          y: 0,
        }}
        animate={
          exitPhase === "zooming"
            ? {
                scale: 8,
                opacity: 0,
                filter: "blur(12px) brightness(2.5)",
              }
            : {
                scale: 1,
                opacity: 1,
                filter: "blur(0px) brightness(1)",
                y: [0, -10, 5, 0],
              }
        }
        transition={
          exitPhase === "zooming"
            ? { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
            : { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <SVGContainer>
          <svg
            viewBox="0 0 300 300"
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
          >
            {/* Filters and gradients */}
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <motion.stop
                  offset="0%"
                  animate={{ stopColor: currentShapeData.color }}
                  transition={{ duration: 0.6 }}
                />
                <motion.stop
                  offset="100%"
                  animate={{
                    stopColor:
                      currentShape === "globe"
                        ? "#1d4ed8"
                        : currentShape === "time"
                        ? "#d97706"
                        : "#16a34a",
                  }}
                  transition={{ duration: 0.6 }}
                />
              </linearGradient>

              <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <motion.stop
                  offset="0%"
                  animate={{ stopColor: currentShapeData.accentColor }}
                  transition={{ duration: 0.6 }}
                />
                <motion.stop
                  offset="100%"
                  animate={{ stopColor: currentShapeData.color }}
                  transition={{ duration: 0.6 }}
                />
              </linearGradient>
            </defs>

            {/* Main shape - TRUE MORPHING between paths */}
            <motion.path
              animate={{ d: currentShapeData.mainPath }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              fill="url(#mainGradient)"
              fillOpacity={0.85}
            />

            {/* Stroke outline */}
            <motion.path
              animate={{ d: currentShapeData.mainPath }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              fill="none"
              stroke="url(#accentGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />

            {/* Shape-specific details with fade transitions */}
            <AnimatePresence mode="wait">
              {currentShape === "globe" && (
                <motion.g
                  key="globe-details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* TimeLens logo PNG - usando imagem direta */}
                  <motion.image
                    href="/logo.png"
                    x="45"
                    y="45"
                    width="210"
                    height="210"
                    style={{
                      filter: "invert(1) brightness(1.2)",
                      opacity: 0.35
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.35, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5 }}
                  />
                </motion.g>
              )}

              {currentShape === "time" && (
                <motion.g
                  key="time-details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Sand particles */}
                  {TIME_DETAILS.particles.map((p, i) => (
                    <motion.circle
                      key={i}
                      cx={p.cx}
                      cy={p.cy}
                      r={p.r}
                      fill="rgba(251, 191, 36, 0.7)"
                      animate={{
                        y: [0, p.cy < 150 ? 60 : -60, 0],
                        opacity: [0.7, 0.3, 0.7]
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                  {/* Center flow */}
                  <motion.path
                    d={TIME_DETAILS.flow}
                    stroke="rgba(251, 191, 36, 0.5)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </motion.g>
              )}

              {currentShape === "lens" && (
                <motion.g
                  key="lens-details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Outer iris */}
                  <motion.circle
                    cx={LENS_DETAILS.pupil.cx}
                    cy={LENS_DETAILS.pupil.cy}
                    r={LENS_DETAILS.pupil.r}
                    fill="none"
                    stroke="rgba(74, 222, 128, 0.5)"
                    strokeWidth={2}
                  />
                  {/* Inner pupil */}
                  <motion.circle
                    cx={LENS_DETAILS.innerPupil.cx}
                    cy={LENS_DETAILS.innerPupil.cy}
                    r={LENS_DETAILS.innerPupil.r}
                    fill="rgba(34, 197, 94, 0.4)"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  {/* Reflection */}
                  <motion.circle
                    cx={LENS_DETAILS.reflection.cx}
                    cy={LENS_DETAILS.reflection.cy}
                    r={LENS_DETAILS.reflection.r}
                    fill="rgba(255, 255, 255, 0.4)"
                  />
                  {/* Scan line */}
                  <motion.path
                    d={LENS_DETAILS.scanLine}
                    stroke="rgba(74, 222, 128, 0.6)"
                    strokeWidth={2}
                    animate={{
                      y: [-40, 40, -40],
                      opacity: [0.2, 0.8, 0.2]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.g>
              )}
            </AnimatePresence>

            {/* Center glow */}
            <motion.circle
              cx="150"
              cy="150"
              r="20"
              fill="rgba(255,255,255,0.1)"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.25, 0.1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>
        </SVGContainer>

        {/* Micro-interactions based on current shape */}
        {currentShape === "globe" && (
          <>
            <SignalPulse $x={20} $y={25} $delay={0} />
            <SignalPulse $x={80} $y={25} $delay={0.5} />
            <SignalPulse $x={50} $y={80} $delay={1} />
          </>
        )}

        {currentShape === "time" && (
          <>
            <SandParticle $x={47} $delay={0} />
            <SandParticle $x={50} $delay={0.4} />
            <SandParticle $x={53} $delay={0.8} />
          </>
        )}

        {currentShape === "lens" && <ScanLineElement />}

        {/* Phase indicator */}
        <PhaseIndicator>
          {SHAPE_ORDER.map((shape, index) => (
            <PhaseDot
              key={shape}
              $active={shapeIndex === index}
              $color={SHAPES[shape].color}
            />
          ))}
        </PhaseIndicator>
      </motion.div>

      <ContentContainer $show={showContent} $exitPhase={exitPhase}>
        <Title>TimeLens</Title>
        <Subtitle>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentShape}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ display: "flex", alignItems: "center", gap: "10px" }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <CurrentIcon size={20} style={{ color: currentShapeData.color }} />
              </motion.div>
              {currentShapeData.label}
            </motion.div>
          </AnimatePresence>
        </Subtitle>
        <StartButton
          onClick={handleStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Satellite size={20} />
          </motion.div>
          INICIAR EXPLORAÇÃO
        </StartButton>
      </ContentContainer>
    </Container>
  );
}
