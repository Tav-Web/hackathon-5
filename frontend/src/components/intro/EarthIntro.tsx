"use client";

import { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { Rocket } from "lucide-react";

// Keyframes for animations
const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
`;

const zoomIn = keyframes`
  0% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  50% {
    transform: scale(3) translateY(10%);
    opacity: 1;
  }
  100% {
    transform: scale(20) translateY(30%);
    opacity: 0;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const twinkle = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 60px 20px rgba(59, 130, 246, 0.3),
                0 0 100px 40px rgba(59, 130, 246, 0.2),
                0 0 140px 60px rgba(59, 130, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 80px 30px rgba(59, 130, 246, 0.4),
                0 0 120px 50px rgba(59, 130, 246, 0.3),
                0 0 160px 70px rgba(59, 130, 246, 0.15);
  }
`;

const buttonPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 40px rgba(59, 130, 246, 0.6);
  }
`;

interface IntroContainerProps {
  $isExiting: boolean;
}

const IntroContainer = styled.div<IntroContainerProps>`
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
      animation: ${fadeOut} 1s ease-out forwards;
    `}
`;

const StarsContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
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

interface EarthContainerProps {
  $isZooming: boolean;
}

const EarthContainer = styled.div<EarthContainerProps>`
  position: relative;
  width: 280px;
  height: 280px;
  animation: ${float} 4s ease-in-out infinite;

  ${({ $isZooming }) =>
    $isZooming &&
    css`
      animation: ${zoomIn} 2.5s ease-in-out forwards;
    `}

  @media (max-width: 768px) {
    width: 200px;
    height: 200px;
  }
`;

const EarthGlow = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: ${pulseGlow} 3s ease-in-out infinite;
`;

const Earth = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%),
    linear-gradient(135deg,
      #1a5f2a 0%,
      #2d7a3e 15%,
      #1e6b8c 25%,
      #1565c0 35%,
      #0d47a1 45%,
      #1565c0 55%,
      #2d7a3e 65%,
      #1a5f2a 75%,
      #1565c0 85%,
      #0d47a1 100%
    );
  box-shadow:
    inset -30px -30px 60px rgba(0, 0, 0, 0.6),
    inset 10px 10px 40px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 100%;
    top: 0;
    left: 0;
    background:
      radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 25%),
      radial-gradient(ellipse at 70% 60%, rgba(255,255,255,0.2) 0%, transparent 30%),
      radial-gradient(ellipse at 40% 80%, rgba(255,255,255,0.15) 0%, transparent 20%);
    animation: ${rotate} 30s linear infinite;
  }

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    background: radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 0%, transparent 40%);
    border-radius: 50%;
  }
`;

const Atmosphere = styled.div`
  position: absolute;
  width: 110%;
  height: 110%;
  top: -5%;
  left: -5%;
  border-radius: 50%;
  background: radial-gradient(circle at center, transparent 45%, rgba(100, 180, 255, 0.15) 50%, transparent 55%);
  pointer-events: none;
`;

interface ContentProps {
  $show: boolean;
  $isZooming: boolean;
}

const ContentContainer = styled.div<ContentProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  margin-top: 40px;
  opacity: 0;

  ${({ $show, $isZooming }) =>
    $show &&
    !$isZooming &&
    css`
      animation: ${fadeIn} 1s ease-out forwards;
      animation-delay: 0.3s;
    `}

  ${({ $isZooming }) =>
    $isZooming &&
    css`
      animation: ${fadeOut} 0.5s ease-out forwards;
    `}
`;

const Title = styled.h1`
  font-size: 2.8rem;
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: 6px;
  text-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.8rem;
    letter-spacing: 3px;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  letter-spacing: 2px;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const StartButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 48px;
  margin-top: 20px;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 2px;
  color: white;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: ${buttonPulse} 2s ease-in-out infinite;

  &:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  }

  &:active {
    transform: scale(0.98);
  }

  svg {
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: translateX(4px);
  }

  @media (max-width: 768px) {
    padding: 14px 36px;
    font-size: 1rem;
  }
`;

const VersionText = styled.span`
  position: absolute;
  bottom: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 1px;
`;

// Generate random stars (seeded for consistency)
const generateStars = (count: number, seed: number) => {
  // Simple seeded random for consistent results
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: seededRandom(seed + i * 1) * 2 + 1,
    top: seededRandom(seed + i * 2) * 100,
    left: seededRandom(seed + i * 3) * 100,
    delay: seededRandom(seed + i * 4) * 3,
    duration: seededRandom(seed + i * 5) * 2 + 2,
  }));
};

// Pre-generate stars with a fixed seed for SSR compatibility
const STARS = generateStars(120, 42);

interface EarthIntroProps {
  onComplete: () => void;
}

export function EarthIntro({ onComplete }: EarthIntroProps) {
  const [showContent, setShowContent] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to render stars only on client (avoids hydration mismatch)
    setIsMounted(true);
    // Show content after Earth appears
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleStart = () => {
    setIsZooming(true);

    // Start exit animation after zoom
    setTimeout(() => {
      setIsExiting(true);
    }, 2000);

    // Complete and unmount
    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  return (
    <IntroContainer $isExiting={isExiting}>
      <StarsContainer>
        {/* Render stars only on client to avoid hydration mismatch */}
        {isMounted && STARS.map((star) => (
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

      <EarthContainer $isZooming={isZooming}>
        <EarthGlow />
        <Atmosphere />
        <Earth />
      </EarthContainer>

      <ContentContainer $show={showContent} $isZooming={isZooming}>
        <Title>CHANGE DETECTOR</Title>
        <Subtitle>Análise de Mudanças Ambientais por Satélite</Subtitle>
        <StartButton onClick={handleStart}>
          <Rocket size={20} />
          INICIAR EXPLORAÇÃO
        </StartButton>
      </ContentContainer>

      <VersionText>Powered by Google Earth Engine</VersionText>
    </IntroContainer>
  );
}
