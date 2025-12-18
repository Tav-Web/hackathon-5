"use client";

import styled from "styled-components";
import { Box, Typography } from "@mui/material";

export const Container = styled.header`
  background-color: hsl(var(--card));
  border-bottom: 1px solid hsl(var(--border));
  padding: 16px;
  width: 100%;
`;

export const Content = styled(Box)`
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const LeftSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const IconWrapper = styled(Box)`
  color: hsl(var(--primary));
  display: flex;
  align-items: center;
`;

export const TextWrapper = styled(Box)``;

export const Title = styled(Typography)`
  font-size: 24px !important;
  font-weight: 700;
  color: hsl(var(--foreground));
`;

export const Subtitle = styled(Typography)`
  font-size: 12px;
  color: hsl(var(--muted-foreground));
`;

export const RightSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
`;
