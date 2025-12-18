"use client";

import styled from "styled-components";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/button";

// ============ LAYOUT PRINCIPAL ============
export const MainContainer = styled.main`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--background));
  overflow: hidden;
`;

export const ContentWrapper = styled(Box)`
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
`;

// ============ HEADER ============
export const HeaderContainer = styled.header`
  background-color: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
  padding: 16px;
`;

export const HeaderContent = styled(Box)`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const HeaderLeft = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const HeaderIconWrapper = styled(Box)`
  color: hsl(var(--primary));
`;

export const HeaderTextWrapper = styled(Box)``;

export const HeaderTitle = styled(Typography)`
  font-size: 18px;
  font-weight: 700;
  color: hsl(var(--foreground));
`;

export const HeaderSubtitle = styled(Typography)`
  font-size: 12px;
  color: hsl(var(--muted-foreground));
`;

export const HeaderRight = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
`;

// ============ SIDEBAR ============
export const SidebarContainer = styled.aside`
  width: 384px;
  border-right: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--card));
  overflow: hidden;
`;

export const TabsWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

export const TabsContentWrapper = styled(Box)`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
`;

// ============ MAIN AREA ============
export const MainAreaContainer = styled(Box)`
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

export const MapContainer = styled(Box)`
  flex: 1;
  position: relative;
`;

export const SelectionInstruction = styled(Box)`
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
export const ComparisonContainer = styled(Box)`
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
  $color?: "green" | "blue" | "purple";
}

export const SourceButton = styled(Button)<SourceButtonProps>`
  font-size: 12px;
  ${({ $active, $color }) => {
    if ($active) {
      const colors = {
        green: "rgb(22, 163, 74)",
        blue: "rgb(37, 99, 235)",
        purple: "rgb(147, 51, 234)",
      };
      const hovers = {
        green: "rgb(21, 128, 61)",
        blue: "rgb(29, 78, 216)",
        purple: "rgb(126, 34, 206)",
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

export const CenteredMessage = styled(Box)`
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

// ============ BOTTOM PANEL ============
export const BottomPanelContainer = styled(Box)`
  border-top: 1px solid hsl(var(--border));
  background-color: hsl(var(--card));
`;

export const BottomPanelToggle = styled.button`
  width: 100%;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: hsl(var(--foreground));
  }
`;

export const BottomPanelContent = styled(Box)`
  padding: 16px;
  border-top: 1px solid hsl(var(--border));
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

// ============ MAP LOADING ============
export const MapLoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: hsl(var(--background));
`;

export const MapLoadingText = styled(Typography)`
  color: hsl(var(--muted-foreground));
`;
