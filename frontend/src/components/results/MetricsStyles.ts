"use client";

import styled from "styled-components";
import { Box, Typography, Paper } from "@mui/material";

export const IndexCardContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 8px;
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
`;

export const IndexCardHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

interface IndexLabelProps {
  $color: string;
}

export const IndexLabel = styled(Typography)<IndexLabelProps>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $color }) => $color};
`;

export const IndexValue = styled(Typography)`
  font-size: 20px;
  font-weight: 700;
`;

export const IndexDescription = styled(Typography)`
  font-size: 12px;
  color: hsl(var(--muted-foreground));
`;

export const BadgeWrapper = styled(Box)`
  margin-top: 8px;
`;

export const MetricsCardWrapper = styled(Paper)`
  background-color: hsl(var(--card));
  border-radius: 8px;
  overflow: hidden;
`;

export const MetricsHeader = styled(Box)`
  padding: 16px;
  padding-bottom: 8px;
`;

export const MetricsTitle = styled(Typography)`
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const MetricsContent = styled(Box)`
  padding: 16px;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const DeltaCardsGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

interface ClassificationBoxProps {
  $alertColor: string;
}

export const ClassificationBox = styled(Box)<ClassificationBoxProps>`
  padding: 16px;
  border-radius: 8px;
  border: 1px solid;
  ${({ $alertColor }) => $alertColor}
`;

export const ClassificationContent = styled(Box)`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

export const ClassificationIcon = styled(Box)`
  flex-shrink: 0;
  margin-top: 2px;
`;

export const ClassificationBody = styled(Box)`
  flex: 1;
  min-width: 0;
`;

export const ClassificationHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

export const ClassificationTitle = styled(Typography)`
  font-weight: 600;
`;

export const ClassificationDescription = styled(Typography)`
  font-size: 14px;
  opacity: 0.9;
`;
