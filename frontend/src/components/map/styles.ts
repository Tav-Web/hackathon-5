"use client";

import styled from "styled-components";
import { Box, Paper, Typography, IconButton } from "@mui/material";

// Container principal do mapa
export const MapContainer = styled(Box)`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
`;

// Container do Leaflet map
export const LeafletContainer = styled.div`
  width: 100%;
  height: 100%;
`;

// Container de busca
export const SearchContainer = styled(Box)`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1000;
  width: 320px;
`;

export const SearchInnerContainer = styled(Box)`
  position: relative;
`;

export const SearchInputWrapper = styled(Paper)`
  display: flex;
  align-items: center;
  background-color: rgba(23, 23, 23, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #3f3f46;
  border-radius: 8px;
  overflow: hidden;
  padding: 0 8px;

  &:hover {
    border-color: #52525b;
  }

  &:focus-within {
    border-color: #3b82f6;
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: #fafafa;
  font-size: 14px;
  padding: 10px 12px;
  outline: none;

  &::placeholder {
    color: #71717a;
  }
`;

export const SearchIconWrapper = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: #a1a1aa;
`;

export const ClearButton = styled(IconButton)`
  color: #a1a1aa;
  padding: 4px;

  &:hover {
    color: #fafafa;
    background-color: transparent;
  }
`;

// Dropdown de resultados
export const SearchResultsDropdown = styled(Paper)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: rgba(23, 23, 23, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #3f3f46;
  border-radius: 8px;
  max-height: 288px;
  overflow-y: auto;
`;

export const SearchResultItem = styled.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #27272a;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: rgba(39, 39, 42, 0.5);
  }
`;

export const ResultIcon = styled(Box)`
  color: #3b82f6;
  margin-top: 2px;
  flex-shrink: 0;
`;

export const ResultContent = styled(Box)`
  flex: 1;
  min-width: 0;
`;

export const ResultName = styled(Typography)`
  color: #fafafa;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ResultMeta = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

export const ResultBadge = styled.span`
  font-size: 11px;
  color: rgba(59, 130, 246, 0.8);
  background-color: rgba(59, 130, 246, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
`;

export const ResultDetail = styled(Typography)`
  font-size: 11px;
  color: #71717a;
`;

// No results message
export const NoResultsMessage = styled(Paper)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background-color: rgba(23, 23, 23, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 12px;
`;

export const NoResultsText = styled(Typography)`
  font-size: 14px;
  color: #a1a1aa;
  text-align: center;
`;

// Search hint
export const SearchHint = styled(Typography)`
  font-size: 11px;
  color: #71717a;
  margin-top: 6px;
  margin-left: 4px;
`;

// Click outside overlay
export const ClickOutsideOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 999;
`;

// Loading overlay
export const LoadingOverlay = styled(Box)`
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
`;

export const LoadingCard = styled(Paper)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background-color: #171717;
  border-radius: 8px;
`;

export const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const LoadingText = styled(Typography)`
  color: #fafafa;
  font-weight: 500;
`;

// Legenda
export const LegendContainer = styled(Box)`
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  pointer-events: auto;
`;

export const LegendCard = styled(Paper)`
  background-color: rgba(23, 23, 23, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 12px;
  max-width: 200px;
`;

export const LegendTitle = styled(Typography)`
  font-size: 12px;
  font-weight: 600;
  color: #fafafa;
  margin-bottom: 8px;
`;

export const LegendItems = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const LegendItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

export const LegendCheckbox = styled.input.attrs({ type: "checkbox" })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

interface LegendColorProps {
  $color: string;
  $visible: boolean;
}

export const LegendColor = styled.span<LegendColorProps>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
  opacity: ${({ $visible }) => ($visible ? 1 : 0.3)};
  background-color: ${({ $visible, $color }) => ($visible ? $color : "transparent")};
  border: 2px solid ${({ $color }) => $color};
`;

interface LegendLabelProps {
  $visible: boolean;
}

export const LegendLabel = styled(Typography)<LegendLabelProps>`
  font-size: 11px;
  transition: opacity 0.15s ease;
  opacity: ${({ $visible }) => ($visible ? 1 : 0.5)};
  color: ${({ $visible }) => ($visible ? "#e4e4e7" : "#71717a")};
`;
