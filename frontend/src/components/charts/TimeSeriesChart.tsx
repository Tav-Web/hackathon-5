"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import type { TimeSeriesPoint } from "@/types/gee";
import { indexColors, indexLabels } from "@/types/gee";
import {
  ChartCard,
  ChartHeader,
  ChartTitle,
  ChartContent,
  EmptyChartContent,
  IndexToggles,
  ChartNote,
  ChartNoteText,
  TooltipContainer,
  TooltipDate,
  TooltipRow,
  TooltipDot,
  TooltipLabel,
  TooltipValue,
} from "./styles";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  height?: number;
}

type IndexKey = "ndvi" | "ndbi" | "bsi" | "nbr";

const indexConfig: { key: IndexKey; color: string; label: string }[] = [
  { key: "ndvi", color: indexColors.ndvi, label: indexLabels.ndvi },
  { key: "ndbi", color: indexColors.ndbi, label: indexLabels.ndbi },
  { key: "bsi", color: indexColors.bsi, label: indexLabels.bsi },
  { key: "nbr", color: indexColors.nbr, label: indexLabels.nbr },
];

export function TimeSeriesChart({ data, height = 300 }: TimeSeriesChartProps) {
  const [visibleIndices, setVisibleIndices] = useState<Set<IndexKey>>(
    new Set(["ndvi", "ndbi"])
  );

  const toggleIndex = (index: IndexKey) => {
    setVisibleIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (next.size > 1) {
          next.delete(index);
        }
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <TooltipContainer>
          <TooltipDate>{formatDate(label)}</TooltipDate>
          {payload.map((entry: any, index: number) => (
            <TooltipRow key={index} $color={entry.color}>
              <TooltipDot $color={entry.color} />
              <TooltipLabel>{entry.name}:</TooltipLabel>
              <TooltipValue>
                {entry.value !== null ? entry.value.toFixed(3) : "N/A"}
              </TooltipValue>
            </TooltipRow>
          ))}
        </TooltipContainer>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <ChartCard elevation={0}>
        <ChartHeader>
          <ChartTitle>
            <TrendingUp className="h-4 w-4" />
            Série Temporal
          </ChartTitle>
        </ChartHeader>
        <ChartContent>
          <EmptyChartContent>
            Nenhum dado de série temporal disponível
          </EmptyChartContent>
        </ChartContent>
      </ChartCard>
    );
  }

  return (
    <ChartCard elevation={0}>
      <ChartHeader>
        <ChartTitle>
          <TrendingUp className="h-4 w-4" />
          Série Temporal dos Índices
        </ChartTitle>
      </ChartHeader>
      <ChartContent>
        {/* Index toggles */}
        <IndexToggles>
          {indexConfig.map(({ key, color, label }) => (
            <Button
              key={key}
              variant={visibleIndices.has(key) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleIndex(key)}
              className="text-xs h-7"
              style={{
                backgroundColor: visibleIndices.has(key) ? color : undefined,
                borderColor: color,
                color: visibleIndices.has(key) ? "white" : color,
              }}
            >
              {label.split(" ")[0]}
            </Button>
          ))}
        </IndexToggles>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              domain={[-1, 1]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => (
                <span className="text-foreground">{value}</span>
              )}
            />
            {indexConfig.map(({ key, color, label }) =>
              visibleIndices.has(key) ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Legend explanation */}
        <ChartNote>
          <ChartNoteText>
            Valores variam de -1 a 1. Mudanças bruscas indicam alterações na cobertura do solo.
          </ChartNoteText>
        </ChartNote>
      </ChartContent>
    </ChartCard>
  );
}
