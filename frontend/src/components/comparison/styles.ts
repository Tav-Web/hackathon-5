"use client";

import styled from "styled-components";
import { Box } from "@mui/material";

// Container principal
export const SliderContainer = styled(Box)`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  user-select: none;
  cursor: ew-resize;
`;

// Image containers
export const ImageContainer = styled(Box)`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
`;

interface ClippedImageContainerProps {
  $position: number;
}

export const ClippedImageContainer = styled(Box)<ClippedImageContainerProps>`
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000000;
  clip-path: ${({ $position }) => `inset(0 ${100 - $position}% 0 0)`};
`;

export const SliderImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

// Slider handle
interface SliderHandleProps {
  $position: number;
}

export const SliderHandle = styled(Box)<SliderHandleProps>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.05s ease;
  left: ${({ $position }) => $position}%;
  transform: translateX(-50%);
`;

interface HandleGripProps {
  $isDragging: boolean;
}

export const HandleGrip = styled(Box)<HandleGripProps>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) ${({ $isDragging }) => ($isDragging ? "scale(1.1)" : "scale(1)")};
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
`;

export const GripIcon = styled(Box)`
  color: #52525b;
`;

// Labels
interface LabelContainerProps {
  $position: number;
  $side: "before" | "after";
  $visible: boolean;
}

export const LabelContainer = styled(Box)<LabelContainerProps>`
  position: absolute;
  top: 16px;
  z-index: 10;
  pointer-events: none;
  transition: all 75ms ease;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};

  ${({ $side, $position }) =>
    $side === "before"
      ? `left: ${Math.max(5, $position / 2)}%; transform: translateX(-50%);`
      : `left: ${Math.min(95, $position + (100 - $position) / 2)}%; transform: translateX(-50%);`}
`;

interface LabelBadgeProps {
  $variant: "before" | "after";
}

export const LabelBadge = styled(Box)<LabelBadgeProps>`
  padding: 8px 16px;
  backdrop-filter: blur(8px);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  ${({ $variant }) =>
    $variant === "before"
      ? `
        background-color: rgba(63, 63, 70, 0.95);
        border: 1px solid #52525b;
      `
      : `
        background-color: rgba(59, 130, 246, 0.95);
        border: 1px solid #3b82f6;
      `}
`;

// Side by side comparison
export const SideBySideContainer = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  height: 100%;
`;

export const SideBySideImage = styled(Box)`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
`;

export const SideBySideLabel = styled(Box)`
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
`;

export const SideBySideImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
