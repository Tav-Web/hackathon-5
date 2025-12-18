"use client";

import styled from "styled-components";
import { Box, Typography, Paper } from "@mui/material";

export const ChartCard = styled(Paper)`
  background-color: hsl(var(--card));
  border-radius: 8px;
  overflow: hidden;
`;

export const ChartHeader = styled(Box)`
  padding: 16px;
  padding-bottom: 8px;
`;

export const ChartTitle = styled(Typography)`
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ChartContent = styled(Box)`
  padding: 16px;
  padding-top: 0;
`;

export const EmptyChartContent = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: hsl(var(--muted-foreground));
  font-size: 14px;
`;

export const IndexToggles = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

export const ChartNote = styled(Box)`
  margin-top: 12px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
`;

export const ChartNoteText = styled(Typography)`
  font-size: 12px;
`;

// Tooltip styles
export const TooltipContainer = styled(Box)`
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

export const TooltipDate = styled(Typography)`
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
`;

interface TooltipRowProps {
  $color: string;
}

export const TooltipRow = styled(Box)<TooltipRowProps>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: ${({ $color }) => $color};
`;

export const TooltipDot = styled(Box)<TooltipRowProps>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
`;

export const TooltipLabel = styled(Typography)`
  font-weight: 500;
  font-size: 12px;
`;

export const TooltipValue = styled(Typography)`
  font-size: 12px;
`;
