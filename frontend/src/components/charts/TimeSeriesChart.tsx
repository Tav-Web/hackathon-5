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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import type { TimeSeriesPoint } from "@/types/gee";
import { indexColors, indexLabels } from "@/types/gee";

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
        // Don't allow hiding all indices
        if (next.size > 1) {
          next.delete(index);
        }
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs"
              style={{ color: entry.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium">{entry.name}:</span>
              <span>
                {entry.value !== null ? entry.value.toFixed(3) : "N/A"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Série Temporal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Nenhum dado de série temporal disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Série Temporal dos Índices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Index toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
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
        </div>

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
        <div className="mt-3 text-xs text-muted-foreground">
          <p>
            Valores variam de -1 a 1. Mudanças bruscas indicam alterações na cobertura do solo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
