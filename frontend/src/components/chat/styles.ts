"use client";

import styled from "styled-components";
import { Box, Typography, Paper } from "@mui/material";

// Chat Panel Styles
export const ChatPanelContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

export const ChatLoadingContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
`;

// Auto Analysis Card
export const AutoAnalysisCard = styled(Paper)`
  margin: 16px;
  margin-bottom: 8px;
  border: 1px solid hsl(var(--primary) / 0.2);
  background-color: hsl(var(--primary) / 0.05);
  border-radius: 8px;
`;

export const AutoAnalysisHeader = styled(Box)`
  padding: 16px;
  padding-bottom: 8px;
`;

export const AutoAnalysisTitle = styled(Box)`
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const AutoAnalysisContent = styled(Box)`
  padding: 16px;
  padding-top: 0;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const AnalysisSummary = styled(Typography)`
  font-weight: 500;
`;

export const AnalysisDetail = styled(Box)`
  font-size: 12px;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
`;

export const RecommendationsSection = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const RecommendationsTitle = styled(Typography)`
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
`;

export const RecommendationsList = styled.ul`
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  list-style-type: disc;
  list-style-position: inside;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
`;

// Suggestions
export const SuggestionsContainer = styled(Box)`
  padding: 12px 16px;
`;

export const SuggestionsHeader = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 8px;
`;

export const SuggestionsGrid = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// Messages
export const MessagesContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
`;

interface MessageRowProps {
  $isUser: boolean;
}

export const MessageRow = styled(Box)<MessageRowProps>`
  display: flex;
  gap: 12px;
  animation: messageIn 0.2s ease-out;
  justify-content: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};

  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

interface AvatarProps {
  $variant: "assistant" | "user";
}

export const MessageAvatar = styled(Box)<AvatarProps>`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $variant }) =>
    $variant === "assistant" ? "hsl(var(--primary) / 0.2)" : "hsl(var(--secondary))"};
`;

interface MessageBubbleProps {
  $isUser: boolean;
}

export const MessageBubble = styled(Box)<MessageBubbleProps>`
  max-width: 80%;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  background-color: ${({ $isUser }) =>
    $isUser ? "hsl(var(--primary))" : "hsl(var(--muted))"};
  color: ${({ $isUser }) => ($isUser ? "hsl(var(--primary-foreground))" : "inherit")};
`;

export const MessageContent = styled(Typography)`
  white-space: pre-wrap;
`;

export const LoadingMessage = styled(Box)`
  display: flex;
  gap: 12px;
  animation: messageIn 0.2s ease-out;
`;

export const LoadingBubble = styled(Box)`
  background-color: hsl(var(--muted));
  border-radius: 8px;
  padding: 8px 16px;
`;

export const LoadingContent = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const LoadingText = styled(Typography)`
  font-size: 14px;
  color: hsl(var(--muted-foreground));
`;

// Input Area
export const InputArea = styled(Box)`
  padding: 16px;
  border-top: 1px solid hsl(var(--border));
`;

export const ErrorMessage = styled(Typography)`
  font-size: 12px;
  color: hsl(var(--destructive));
  margin-bottom: 8px;
`;

export const InputRow = styled(Box)`
  display: flex;
  gap: 8px;
`;

// Chat Drawer Styles
export const DrawerHeaderRow = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const DrawerHeaderLeft = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DrawerContent = styled(Box)`
  flex: 1;
  overflow: hidden;
`;

export const DrawerEmptyState = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: hsl(var(--muted-foreground));
  padding: 16px;
`;

export const DrawerEmptyIcon = styled(Box)`
  opacity: 0.2;
`;

export const DrawerEmptyText = styled(Typography)`
  font-size: 14px;
  text-align: center;
`;

// Trigger Button
export const TriggerIndicator = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 8px;
  height: 8px;
  background-color: hsl(var(--primary));
  border-radius: 50%;
  animation: pulse 2s infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
