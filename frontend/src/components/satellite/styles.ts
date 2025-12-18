"use client";

import styled from "styled-components";
import { Box, Paper, Typography, Button, IconButton } from "@mui/material";

// Container principal
export const PanelContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

// Área de conteúdo rolável
export const ScrollableContent = styled(Box)`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;

  & > * + * {
    margin-top: 24px;
  }
`;

// Seções
export const Section = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

// Header de seção com número
export const SectionHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface StepNumberProps {
  $variant?: "default" | "success";
}

export const StepNumber = styled(Box)<StepNumberProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${({ $variant }) =>
    $variant === "success"
      ? "rgba(34, 197, 94, 0.2)"
      : "rgba(59, 130, 246, 0.2)"};
  color: ${({ $variant }) => ($variant === "success" ? "#22c55e" : "#3b82f6")};
  font-size: 14px;
  font-weight: 700;
`;

export const SectionLabel = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #fafafa;
`;

// Botões de fonte de satélite
export const SourceButtonGroup = styled(Box)`
  display: flex;
  gap: 4px;
`;

interface SourceButtonProps {
  $active?: boolean;
  $color?: "green" | "blue" | "purple";
}

export const SourceButton = styled(Button)<SourceButtonProps>`
  flex: 1;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: none;
  border-radius: 10px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  ${({ $active, $color }) => {
    if ($active) {
      const colors = {
        green: {
          bg: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
          shadow: "rgba(22, 163, 74, 0.4)",
          hover: "linear-gradient(135deg, #15803d 0%, #16a34a 100%)",
        },
        blue: {
          bg: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
          shadow: "rgba(59, 130, 246, 0.4)",
          hover: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
        },
        purple: {
          bg: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          shadow: "rgba(124, 58, 237, 0.4)",
          hover: "linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)",
        },
      };
      const c = colors[$color || "blue"];
      return `
        background: ${c.bg};
        color: #ffffff !important;
        box-shadow: 0 4px 12px ${c.shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.15);
        border: none;
        &:hover {
          background: ${c.hover};
          color: #ffffff !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px ${c.shadow};
        }
      `;
    }
    return `
      background: linear-gradient(135deg, #27272a 0%, #3f3f46 100%);
      color: #ffffff !important;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      &:hover {
        background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
        color: #ffffff !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
    `;
  }}

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    transform: none;
  }
`;

export const SourceDescription = styled(Typography)`
  font-size: 11px;
  color: #a1a1aa;
  opacity: 0.7;
`;

// Botões de área
export const AreaButtonGroup = styled(Box)`
  display: flex;
  gap: 8px;
`;

interface AreaButtonProps {
  $selected?: boolean;
}

export const AreaButton = styled(Button)<AreaButtonProps>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  text-transform: none;
  border-radius: 12px;
  transition: all 0.2s ease;

  ${({ $selected }) =>
    $selected
      ? `
        background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
        border: 1px solid rgba(34, 197, 94, 0.5);
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        &:hover {
          background: linear-gradient(135deg, #15803d 0%, #16a34a 100%);
          color: #ffffff !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(22, 163, 74, 0.4);
        }
      `
      : `
        background: linear-gradient(135deg, #27272a 0%, #3f3f46 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #ffffff !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        &:hover {
          background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.12);
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }
      `}

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    transform: none;
  }

  svg {
    opacity: 0.9;
  }
`;

export const ClearAreaButton = styled(IconButton)`
  padding: 10px;
  background: linear-gradient(135deg, #27272a 0%, #3f3f46 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #ffffff !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
    color: #ffffff !important;
    border-color: rgba(239, 68, 68, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    transform: none;
  }
`;

export const AreaSelectedText = styled(Typography)`
  font-size: 12px;
  color: #4ade80;
`;

// Info box de área
export const AreaInfoBox = styled(Box)`
  font-size: 11px;
  color: #71717a;

  & > * + * {
    margin-top: 8px;
  }
`;

export const AreaInfoRow = styled(Box)`
  display: flex;
  justify-content: space-between;
`;

export const AreaInfoLabel = styled.span`
  color: #71717a;
`;

export const AreaInfoValue = styled.span`
  color: #fafafa;
`;

interface ResolutionValueProps {
  $status?: "good" | "warning" | "error";
}

export const ResolutionValue = styled.span<ResolutionValueProps>`
  font-weight: 500;
  color: ${({ $status }) => {
    switch ($status) {
      case "error":
        return "#f87171";
      case "warning":
        return "#fbbf24";
      default:
        return "#4ade80";
    }
  }};
`;

// Alert boxes
interface AlertBoxProps {
  $variant?: "purple" | "red";
}

export const AlertBox = styled(Box)<AlertBoxProps>`
  background-color: ${({ $variant }) =>
    $variant === "red" ? "rgba(127, 29, 29, 0.3)" : "rgba(88, 28, 135, 0.3)"};
  border: 1px solid
    ${({ $variant }) => ($variant === "red" ? "#b91c1c" : "#7c3aed")};
  border-radius: 8px;
  padding: 8px;
  margin-top: 4px;
`;

export const AlertTitle = styled(Typography)<AlertBoxProps>`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $variant }) => ($variant === "red" ? "#fca5a5" : "#c4b5fd")};
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const AlertDescription = styled(Typography)<AlertBoxProps>`
  font-size: 11px;
  color: ${({ $variant }) =>
    $variant === "red"
      ? "rgba(254, 202, 202, 0.7)"
      : "rgba(196, 181, 253, 0.7)"};
  margin-top: 4px;
`;

export const PlanetSuggestion = styled(Typography)`
  font-size: 12px;
  color: #c4b5fd;
  display: flex;
  align-items: center;
  gap: 4px;
`;

// Coordenadas
export const CoordinatesText = styled(Typography)`
  font-size: 10px;
  color: #52525b;
`;

// Date inputs
export const DateInputsGrid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

export const DateInputWrapper = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const DateInputLabel = styled(Typography)`
  font-size: 11px;
  font-weight: 500;
  color: #a1a1aa;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const DateInputContainer = styled(Box)`
  position: relative;
`;

export const DateInputIcon = styled(Box)`
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #71717a;
  pointer-events: none;
  display: flex;
  align-items: center;
`;

export const DateInput = styled.input`
  width: 100%;
  background-color: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 8px 8px 8px 32px;
  font-size: 14px;
  color: #fafafa;

  &:disabled {
    opacity: 0.5;
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }
`;

// Summary section
export const SummaryCard = styled(Paper)`
  background-color: rgba(39, 39, 42, 0.5);
  border-radius: 8px;
  padding: 16px;
`;

export const SummaryGrid = styled(Box)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

export const SummaryItem = styled(Paper)`
  background-color: #171717;
  border-radius: 8px;
  padding: 8px;
`;

export const SummaryLabel = styled(Typography)`
  font-size: 11px;
  color: #a1a1aa;
  opacity: 0.7;
`;

export const SummaryValue = styled(Typography)`
  font-size: 20px;
  font-weight: 700;
  color: #fafafa;
`;

export const SummaryUnit = styled.span`
  font-size: 11px;
  color: #a1a1aa;
`;

// Change types
export const ChangeTypesContainer = styled(Box)`
  margin-top: 12px;

  & > * + * {
    margin-top: 8px;
  }
`;

export const ChangeTypesHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const ChangeTypesLabel = styled(Typography)`
  font-size: 11px;
  color: #a1a1aa;
  opacity: 0.7;
`;

export const ClearFilterButton = styled(Button)`
  font-size: 11px;
  text-transform: none;
  padding: 0;
  min-width: auto;
  color: #3b82f6;

  &:hover {
    text-decoration: underline;
    background: transparent;
  }
`;

export const ChangeTypesList = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

interface ChangeTypeButtonProps {
  $selected?: boolean;
}

export const ChangeTypeButton = styled.button<ChangeTypeButtonProps>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  border-radius: 4px;
  padding: 6px 8px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;

  ${({ $selected }) =>
    $selected
      ? `
        background-color: rgba(59, 130, 246, 0.2);
        border: 1px solid #3b82f6;
      `
      : `
        background-color: #171717;
        border: 1px solid transparent;
        &:hover {
          background-color: #27272a;
        }
      `}
`;

export const ChangeTypeName = styled.span<ChangeTypeButtonProps>`
  color: ${({ $selected }) => ($selected ? "#3b82f6" : "#d4d4d8")};
`;

export const ChangeTypeCount = styled.span<ChangeTypeButtonProps>`
  font-weight: 500;
  color: ${({ $selected }) => ($selected ? "#3b82f6" : "#fafafa")};
`;

export const ChangeTypesHint = styled(Typography)`
  font-size: 10px;
  color: #a1a1aa;
  opacity: 0.5;
`;

// Warning box
export const WarningBox = styled(Box)`
  background-color: rgba(113, 63, 18, 0.2);
  border: 1px solid #a16207;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

export const WarningContent = styled(Box)`
  font-size: 12px;
`;

export const WarningTitle = styled(Typography)`
  font-weight: 500;
  color: #fde047;
`;

export const WarningDescription = styled(Typography)`
  font-size: 12px;
  color: rgba(253, 224, 71, 0.7);
`;

// Action buttons
export const PreviewButton = styled(Button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
  color: #ffffff !important;
  padding: 12px 20px;
  border-radius: 12px;
  text-transform: none;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2),
    0 2px 4px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #52525b 0%, #71717a 100%);
    color: #ffffff !important;
    transform: translateY(-1px);
    box-shadow: 0 6px 12px -2px rgba(0, 0, 0, 0.25),
      0 3px 6px -2px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  }

  svg {
    opacity: 0.9;
  }
`;

export const NewAnalysisButton = styled(Button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px !important;
  background: linear-gradient(135deg, #27272a 0%, #3f3f46 100%);
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px 20px;
  border-radius: 12px;
  text-transform: none;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  svg {
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  &:hover svg {
    opacity: 1;
  }
`;

// Footer fixo
export const StickyFooter = styled(Box)`
  position: sticky;
  bottom: 0;
  padding: 16px 0 8px;
  background-color: #171717;
  border-top: 1px solid #27272a;
  margin: auto -16px 0;
  padding-left: 16px;
  padding-right: 16px;
`;

export const FooterHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

export const DatesChangedBadge = styled(Typography)`
  font-size: 11px;
  color: #fbbf24;
  margin-left: auto;
`;

interface MainActionButtonProps {
  $variant?: "default" | "completed" | "reanalyze";
}

export const MainActionButton = styled(Button)<MainActionButtonProps>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border-radius: 14px;
  text-transform: none;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff !important;
  letter-spacing: 0.3px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover::before {
    left: 100%;
  }

  ${({ $variant }) => {
    switch ($variant) {
      case "completed":
        return `
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%);
          box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          cursor: default;
          &:hover {
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%);
            transform: none;
          }
        `;
      case "reanalyze":
        return `
          background: linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%);
          box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          &:hover {
            background: linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(217, 119, 6, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          &:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(217, 119, 6, 0.4);
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%);
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          &:hover {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          &:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          }
          &:disabled {
            background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
            box-shadow: none;
            cursor: not-allowed;
            opacity: 0.7;
            &:hover {
              transform: none;
            }
          }
        `;
    }
  }}

  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
  }
`;

// Progress bar
export const ProgressContainer = styled(Box)`
  margin-top: 8px;

  & > * + * {
    margin-top: 4px;
  }
`;

export const ProgressBar = styled(Box)`
  width: 100%;
  height: 8px;
  background-color: #27272a;
  border-radius: 9999px;
  overflow: hidden;
`;

interface ProgressFillProps {
  $progress: number;
}

export const ProgressFill = styled(Box)<ProgressFillProps>`
  height: 100%;
  background-color: #3b82f6;
  border-radius: 9999px;
  transition: width 0.3s ease;
  width: ${({ $progress }) => $progress}%;
`;

export const ProgressText = styled(Typography)`
  font-size: 11px;
  color: #a1a1aa;
  text-align: center;
`;

// Source info
export const SourceInfoText = styled(Typography)`
  font-size: 11px;
  color: #a1a1aa;
  opacity: 0.6;
`;

// Modal de Preview
export const ModalOverlay = styled(Box)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.8);
  padding: 16px;
`;

export const ModalContainer = styled(Box)`
  background-color: #171717;
  border-radius: 12px;
  max-width: 72rem;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
`;

export const ModalHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #374151;
`;

export const ModalTitle = styled(Typography)`
  font-size: 24px !important;
  font-weight: 600;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ModalCloseButton = styled(IconButton)`
  padding: 8px;
  color: #9ca3af;

  &:hover {
    background-color: #374151;
  }
`;

interface ResolutionBannerProps {
  $source?: "planet" | "earth_engine" | "sentinel" | "nicfi";
}

const getBannerBgColor = (source?: string) => {
  switch (source) {
    case "planet":
      return "rgba(88, 28, 135, 0.3)"; // purple
    case "nicfi":
      return "rgba(6, 95, 70, 0.3)"; // emerald/forest green
    default:
      return "rgba(30, 58, 138, 0.3)"; // blue
  }
};

const getBannerBorderColor = (source?: string) => {
  switch (source) {
    case "planet":
      return "#7c3aed"; // purple
    case "nicfi":
      return "#10b981"; // emerald
    default:
      return "#1d4ed8"; // blue
  }
};

const getBannerTitleColor = (source?: string) => {
  switch (source) {
    case "planet":
      return "#e9d5ff"; // light purple
    case "nicfi":
      return "#a7f3d0"; // light emerald
    default:
      return "#bfdbfe"; // light blue
  }
};

const getBannerDescColor = (source?: string) => {
  switch (source) {
    case "planet":
      return "rgba(216, 180, 254, 0.7)";
    case "nicfi":
      return "rgba(167, 243, 208, 0.7)"; // light emerald
    default:
      return "rgba(147, 197, 253, 0.7)";
  }
};

export const ResolutionBanner = styled(Box)<ResolutionBannerProps>`
  margin: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: ${({ $source }) => getBannerBgColor($source)};
  border: 1px solid ${({ $source }) => getBannerBorderColor($source)};
`;

export const ResolutionBannerTitle = styled(Typography)<ResolutionBannerProps>`
  font-size: 14px;
  color: ${({ $source }) => getBannerTitleColor($source)};
`;

export const ResolutionBannerDescription = styled(
  Typography
)<ResolutionBannerProps>`
  font-size: 12px;
  color: ${({ $source }) => getBannerDescColor($source)};
  margin-top: 4px;
`;

export const ImagesGrid = styled(Box)`
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const ImageColumn = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ImageColumnHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const ImageColumnTitle = styled(Typography)`
  font-size: 14px;
  font-weight: 500;
  color: #d1d5db;
`;

export const ImageColumnSubtitle = styled(Typography)`
  font-size: 12px;
  color: #6b7280;
`;

export const ImageColumnMeta = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const ImageMetaLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

export const ImageMetaValue = styled.span`
  font-size: 12px;
  color: #d1d5db;
`;

export const ImageMetaHighlight = styled.span`
  font-size: 12px;
  color: #60a5fa;
`;

interface ImageContainerProps {
  $height?: number;
}

export const ImageContainer = styled(Box)<ImageContainerProps>`
  position: relative;
  background-color: #1f2937;
  border-radius: 8px;
  overflow: hidden;
  height: ${({ $height }) => $height || 220}px;
`;

export const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #111827;
`;

export const ImageOverlay = styled(Box)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 4px;
  text-align: center;
`;

export const ImageOverlayText = styled(Typography)`
  font-size: 12px;
  color: #d1d5db;
`;

export const GeometryOverlay = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

export const ModalFooter = styled(Box)`
  padding: 16px;
  border-top: 1px solid #374151;
  background-color: rgba(31, 41, 55, 0.5);
`;

export const FooterGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const FooterItem = styled(Box)``;

export const FooterItemLabel = styled(Typography)`
  font-size: 12px;
  color: #6b7280;
`;

interface FooterItemValueProps {
  $color?: "purple" | "green" | "white" | "red" | "yellow" | "default";
}

export const FooterItemValue = styled(Typography)<FooterItemValueProps>`
  font-size: 12px;
  font-weight: ${({ $color }) =>
    $color === "red" || $color === "yellow" || $color === "default"
      ? 500
      : 400};
  color: ${({ $color }) => {
    switch ($color) {
      case "purple":
        return "#d8b4fe";
      case "green":
        return "#86efac";
      case "red":
        return "#f87171";
      case "yellow":
        return "#fbbf24";
      default:
        return "#ffffff";
    }
  }};
`;

// Legend components
export const LegendContainer = styled(Box)`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #374151;
`;

export const LegendTitle = styled(Typography)`
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const LegendGrid = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
`;

export const LegendItem = styled(Box)`
  display: flex;
  align-items: center;
  gap: 6px;
`;

interface LegendColorProps {
  $color: string;
}

export const LegendColor = styled(Box)<LegendColorProps>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background-color: ${({ $color }) => $color};
  opacity: 0.8;
`;

export const LegendLabel = styled(Typography)`
  font-size: 11px;
  color: #d1d5db;
`;

// Change type item for sidebar
export const ChangeTypeItem = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background-color: rgba(55, 65, 81, 0.3);
  border-radius: 4px;
`;

export const ChangeTypeInfo = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ChangeTypeColorDot = styled(Box)<LegendColorProps>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
`;

export const SummaryChangeTypeName = styled(Typography)`
  font-size: 12px;
  color: #e5e7eb;
`;

export const SummaryChangeTypeCount = styled(Typography)`
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
`;
