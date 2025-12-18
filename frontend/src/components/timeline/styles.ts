"use client";

import styled from "styled-components";
import { Box, Typography } from "@mui/material";

export const TimelineContainer = styled(Box)`
  background-color: #1f2937;
  border-radius: 8px;
  padding: 16px;
`;

export const TimelineEmptyContainer = styled(TimelineContainer)``;

export const TimelineHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
`;

export const TimelineHeaderText = styled(Typography)`
  font-size: 14px;
`;

export const TimelineEmptyText = styled(Typography)`
  font-size: 12px;
  color: #6b7280;
  margin-top: 8px;
`;

export const TimelineContentContainer = styled(TimelineContainer)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const TimelineHeaderRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const TimelineHeaderLeft = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d1d5db;
`;

export const TimelineHeaderTitle = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
`;

export const TimelinePercentage = styled(Typography)`
  font-size: 12px;
  color: #6b7280;
`;

export const LabelsRow = styled(Box)`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
`;

interface LabelProps {
  $active?: boolean;
  $color?: string;
}

export const TimelineLabel = styled(Typography)<LabelProps>`
  font-size: 12px;
  color: ${({ $active, $color }) => ($active ? $color : "#9ca3af")};
`;

export const SliderWrapper = styled(Box)`
  position: relative;
`;

interface SliderInputProps {
  $position: number;
}

export const SliderInput = styled.input<SliderInputProps>`
  width: 100%;
  height: 8px;
  border-radius: 8px;
  appearance: none;
  cursor: pointer;
  background: ${({ $position }) =>
    `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${$position}%, #22c55e ${$position}%, #22c55e 100%)`};

  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

export const ControlsRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export const ControlButton = styled.button`
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #9ca3af;
  transition: background-color 0.2s;

  &:hover {
    background-color: #374151;
  }
`;

export const PlayButton = styled.button`
  padding: 8px;
  background-color: #2563eb;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #ffffff;
  transition: background-color 0.2s;

  &:hover {
    background-color: #1d4ed8;
  }
`;

export const LegendRow = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
`;

export const LegendItem = styled(Box)`
  display: flex;
  align-items: center;
  gap: 4px;
`;

interface LegendColorProps {
  $color: string;
}

export const LegendColor = styled(Box)<LegendColorProps>`
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background-color: ${({ $color }) => $color};
`;

export const LegendText = styled(Typography)`
  font-size: 12px;
  color: #9ca3af;
`;

export const LegendDivider = styled(Box)`
  flex: 1;
  height: 1px;
  background-color: #374151;
`;
