"use client";

import styled from "styled-components";
import { Box } from "@mui/material";

interface ContainerProps {
  $isOpen?: boolean;
}

export const Container = styled.aside<ContainerProps>`
  width: 394px;
  border-right: 1px solid hsl(var(--border));
  display: flex;
  flex-direction: column;
  background-color: hsl(var(--card));
  overflow: hidden;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 85%;
    max-width: 394px;
    z-index: 9998;
    transform: translateX(${({ $isOpen }) => ($isOpen ? "0" : "-100%")});
    transition: transform 0.3s ease-in-out;
    border-right: none;
    box-shadow: ${({ $isOpen }) => ($isOpen ? "4px 0 24px rgba(0, 0, 0, 0.3)" : "none")};
  }
`;

export const MobileOverlay = styled.div<{ $isOpen?: boolean }>`
  display: none;

  @media (max-width: 768px) {
    display: ${({ $isOpen }) => ($isOpen ? "block" : "none")};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9997;
  }
`;

export const MobileDrawerHeader = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid hsl(var(--border));
    background-color: hsl(var(--card));
  }
`;

export const MobileDrawerTitle = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: hsl(var(--foreground));
`;

export const MobileCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: transparent;
  border: none;
  color: hsl(var(--foreground));
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: hsl(var(--accent));
  }
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
