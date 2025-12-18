"use client";

import styled from "styled-components";
import { Box, Typography } from "@mui/material";

export const UploadContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const UploadTitle = styled(Typography)`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
`;

export const DropZone = styled(Box)`
  border: 2px dashed #374151;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: border-color 0.2s;

  &:hover {
    border-color: #4b5563;
  }
`;

export const DropZoneIcon = styled(Box)`
  margin: 0 auto;
  margin-bottom: 8px;
  color: #9ca3af;
`;

export const DropZoneText = styled(Typography)`
  font-size: 14px;
  color: #9ca3af;
`;

export const ImageSlotsGrid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const ImageSlot = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
`;

export const SlotLabel = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #d1d5db;
`;

export const ImagePreview = styled(Box)`
  position: relative;
  background-color: #1f2937;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
  min-width: 0;
`;

export const ImagePreviewIcon = styled(Box)<{ $color: string }>`
  color: ${({ $color }) => $color};
  margin-bottom: 4px;
`;

export const ImageFilename = styled(Typography)`
  font-size: 12px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  display: block;
`;

export const RemoveButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #9ca3af;

  &:hover {
    background-color: #374151;
  }
`;

export const UploadLabel = styled.label`
  display: block;
  cursor: pointer;
`;

export const UploadSlotButton = styled(Box)`
  background-color: #1f2937;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2d3748;
  }
`;

export const UploadSlotIcon = styled(Box)`
  margin: 0 auto;
  margin-bottom: 4px;
  color: #9ca3af;
`;

export const UploadSlotText = styled(Typography)`
  font-size: 12px;
  color: #9ca3af;
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const UploadingText = styled(Typography)`
  font-size: 14px;
  color: #60a5fa;
  text-align: center;
`;
