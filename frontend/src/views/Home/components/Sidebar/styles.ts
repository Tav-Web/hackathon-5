"use client";

import styled from "styled-components";
import { Box } from "@mui/material";

export const Container = styled.aside`
  width: 394px;
  border-right: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--card));
  overflow: hidden;
`;

export const TabsContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

export const TabsContentArea = styled(Box)`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
`;

export const TabContentWrapper = styled(Box)`
  margin-top: 0;

  & > * + * {
    margin-top: 16px;
  }
`;
