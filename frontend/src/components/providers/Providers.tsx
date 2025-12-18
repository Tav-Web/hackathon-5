"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AnalysisProvider } from "@/context/AnalysisContext";
import { StyledComponentsRegistry } from "./StyledComponentsRegistry";
import { theme } from "@/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AnalysisProvider>{children}</AnalysisProvider>
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
