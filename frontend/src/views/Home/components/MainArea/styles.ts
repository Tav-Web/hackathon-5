"use client";

import styled from "styled-components";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";

export const Container = styled(Box)`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const TopBar = styled(Box)`
  background-color: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

export const ViewModeButtons = styled(Box)`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const MapWrapper = styled(Box)`
  flex: 1;
  position: relative;
`;

export const SelectionOverlay = styled(Box)`
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  font-size: 14px;
`;

// ============ COMPARISON VIEW ============
export const ComparisonWrapper = styled(Box)`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const SourceTabsBar = styled(Box)`
  background-color: hsla(var(--card), 0.8);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid hsl(var(--border));
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  z-index: 10;
`;

interface SourceButtonProps {
  $active?: boolean;
  $color?: "green" | "blue" | "purple" | "orange" | "cyan" | "emerald";
}

export const SourceButton = styled(Button)<SourceButtonProps>`
  font-size: 12px;
  color: #ffffff !important;
  ${({ $active, $color }) => {
    if ($active) {
      const colors: Record<string, string> = {
        green: "rgb(22, 163, 74)",
        blue: "rgb(37, 99, 235)",
        purple: "rgb(147, 51, 234)",
        orange: "rgb(234, 88, 12)",
        cyan: "rgb(6, 182, 212)",
        emerald: "rgb(16, 185, 129)",  // NICFI tropical forest green
      };
      const hovers: Record<string, string> = {
        green: "rgb(21, 128, 61)",
        blue: "rgb(29, 78, 216)",
        purple: "rgb(126, 34, 206)",
        orange: "rgb(194, 65, 12)",
        cyan: "rgb(8, 145, 178)",
        emerald: "rgb(5, 150, 105)",
      };
      return `
        background-color: ${colors[$color || "blue"]} !important;
        &:hover {
          background-color: ${hovers[$color || "blue"]} !important;
        }
      `;
    }
    return "";
  }}
`;

export const ComparisonContent = styled(Box)`
  flex: 1;
  position: relative;
`;

export const CenteredContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

export const LoadingWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

export const LoadingText = styled(Typography)`
  color: hsl(var(--muted-foreground));
`;

export const ErrorWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
`;

export const ErrorText = styled(Typography)`
  color: rgb(248, 113, 113);
`;

export const PlaceholderText = styled(Typography)`
  color: hsl(var(--muted-foreground));
`;

// ============ MAP LOADING ============
export const MapLoadingWrapper = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: hsl(var(--background));
`;

export const MapLoadingText = styled(Typography)`
  color: hsl(var(--muted-foreground));
`;

// ============ HIGH-RES SOURCE NOTE ============
export const HighResNote = styled(Box)`
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: #fbbf24;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
  max-width: 90%;
  z-index: 20;
`;
