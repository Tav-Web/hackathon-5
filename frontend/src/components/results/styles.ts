"use client";

import styled from "styled-components";
import { Box, Paper, Typography, Button } from "@mui/material";

// Container principal
export const PanelContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Header
export const PanelTitle = styled(Typography)`
  font-size: 18px;
  font-weight: 600;
  color: #fafafa;
`;

// Botão de análise
export const AnalyzeButton = styled(Button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #3b82f6;
  color: #ffffff;
  padding: 12px 16px;
  border-radius: 8px;
  text-transform: none;
  font-size: 14px;
  font-weight: 500;

  &:hover {
    background-color: #2563eb;
  }

  &:disabled {
    background-color: #3f3f46;
    cursor: not-allowed;
  }
`;

// Helper text
export const HelperText = styled(Typography)`
  font-size: 12px;
  color: #71717a;
  text-align: center;
`;

// Error text
export const ErrorText = styled(Typography)`
  font-size: 12px;
  color: #ef4444;
  text-align: center;
`;

// Progress bar
export const ProgressBar = styled(Box)`
  width: 100%;
  height: 8px;
  background-color: #3f3f46;
  border-radius: 9999px;
  overflow: hidden;
`;

interface ProgressFillProps {
  $progress: number;
}

export const ProgressFill = styled(Box)<ProgressFillProps>`
  height: 100%;
  background-color: #2563eb;
  border-radius: 9999px;
  transition: width 0.3s ease;
  width: ${({ $progress }) => $progress}%;
`;

// Results container
export const ResultsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// Summary card
export const SummaryCard = styled(Paper)`
  background-color: #27272a;
  border-radius: 8px;
  padding: 16px;
`;

export const SummaryTitle = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #d4d4d8;
  margin-bottom: 12px;
`;

export const SummaryGrid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const SummaryItem = styled(Paper)`
  background-color: #171717;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
`;

export const SummaryValue = styled(Typography)`
  font-size: 24px;
  font-weight: 700;
  color: #fafafa;
`;

export const SummaryLabel = styled(Typography)`
  font-size: 12px;
  color: #a1a1aa;
`;

// By type card
export const ByTypeCard = styled(Paper)`
  background-color: #27272a;
  border-radius: 8px;
  padding: 16px;
`;

export const ByTypeTitle = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #d4d4d8;
  margin-bottom: 12px;
`;

export const TypesList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const TypeItem = styled(Paper)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #171717;
  border-radius: 8px;
  padding: 8px;
`;

export const TypeInfo = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface TypeIconWrapperProps {
  $color: string;
}

export const TypeIconWrapper = styled(Box)<TypeIconWrapperProps>`
  color: ${({ $color }) => $color};
`;

export const TypeName = styled(Typography)`
  font-size: 14px;
  color: #d4d4d8;
`;

export const TypeCount = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #fafafa;
`;

// Download button
export const DownloadButton = styled(Button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #16a34a;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  text-transform: none;
  font-size: 14px;

  &:hover {
    background-color: #15803d;
  }
`;

// Hint text
export const HintText = styled(Typography)`
  font-size: 12px;
  color: #a1a1aa;
  opacity: 0.7;
`;
