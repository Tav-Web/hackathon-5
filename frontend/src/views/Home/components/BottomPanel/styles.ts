"use client";

import styled from "styled-components";
import { Box } from "@mui/material";

export const Container = styled(Box)`
  border-top: 1px solid hsl(var(--border));
  background-color: hsl(var(--card));
`;

export const ToggleButton = styled.button`
  width: 100%;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: hsl(var(--muted-foreground));
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: hsl(var(--foreground));
  }
`;

export const ContentGrid = styled(Box)`
  padding: 16px;
  border-top: 1px solid hsl(var(--border));
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;
