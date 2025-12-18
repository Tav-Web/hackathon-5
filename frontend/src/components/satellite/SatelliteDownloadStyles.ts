"use client";

import styled from "styled-components";
import { Box, Typography, Button as MuiButton } from "@mui/material";

export const DownloadContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const HeaderRow = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const HeaderTitle = styled(Typography)`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
`;

export const SectionContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SectionLabel = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #d1d5db;
`;

export const AreaButton = styled(MuiButton)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #1f2937;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #374151;
  text-transform: none;
  font-size: 14px;

  &:hover {
    background-color: #374151;
  }
`;

export const AreaInfo = styled(Typography)`
  font-size: 12px;
  color: #6b7280;
`;

export const DatesGrid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const DateSection = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const DateLabel = styled(Typography)`
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
`;

export const DateInputWrapper = styled(Box)`
  position: relative;
`;

export const DateIconWrapper = styled(Box)`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

export const DateInput = styled.input`
  width: 100%;
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 8px 8px 8px 32px;
  font-size: 14px;
  color: #ffffff;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
`;

interface DownloadButtonProps {
  $disabled?: boolean;
}

export const DownloadActionButton = styled(MuiButton)<DownloadButtonProps>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: ${({ $disabled }) => ($disabled ? "#374151" : "#16a34a")};
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  text-transform: none;
  font-size: 14px;
  cursor: ${({ $disabled }) => ($disabled ? "not-allowed" : "pointer")};

  &:hover {
    background-color: ${({ $disabled }) => ($disabled ? "#374151" : "#15803d")};
  }

  &:disabled {
    background-color: #374151;
    color: #9ca3af;
  }
`;

export const FooterNote = styled(Typography)`
  font-size: 12px;
  color: #6b7280;
`;

export const SourceSelect = styled.select`
  width: 100%;
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #ffffff;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  option {
    background-color: #1f2937;
    color: #ffffff;
  }
`;

export const SourceOption = styled.option`
  padding: 8px;
`;

export const ResolutionBadge = styled.span<{ $highRes?: boolean }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
  background-color: ${({ $highRes }) => ($highRes ? "#166534" : "#1e40af")};
  color: #ffffff;
`;

export const SourceInfo = styled(Typography)`
  font-size: 11px;
  color: #9ca3af;
  margin-top: 4px;
`;
