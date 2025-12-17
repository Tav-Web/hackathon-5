"use client";

import { ReactNode } from "react";
import { AnalysisProvider } from "@/context/AnalysisContext";

export function Providers({ children }: { children: ReactNode }) {
  return <AnalysisProvider>{children}</AnalysisProvider>;
}
