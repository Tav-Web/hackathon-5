"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { MetricsCards } from "@/components/results/MetricsCards";
import { GeeAnalysisResponse } from "@/types/gee";
import { Container, ToggleButton, ContentGrid } from "./styles";

interface BottomPanelProps {
  result: GeeAnalysisResponse | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function BottomPanel({ result, isOpen, onToggle }: BottomPanelProps) {
  if (!result) return null;

  return (
    <Container>
      <ToggleButton onClick={onToggle}>
        {isOpen ? (
          <>
            <ChevronDown className="h-4 w-4" />
            Esconder Detalhes
          </>
        ) : (
          <>
            <ChevronUp className="h-4 w-4" />
            Ver Detalhes da Análise
          </>
        )}
      </ToggleButton>

      {isOpen && (
        <ContentGrid>
          {result.timeSeries && result.timeSeries.length > 0 && (
            <TimeSeriesChart data={result.timeSeries} height={250} />
          )}
          {result.deltas && (
            <MetricsCards
              deltas={result.deltas}
              classification={result.classification}
            />
          )}
        </ContentGrid>
      )}
    </Container>
  );
}
