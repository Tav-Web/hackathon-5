"use client";

import { ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  SpectralIndices,
  ClassificationResult,
  AlertLevel,
} from "@/types/gee";
import { indexColors, changeTypeLabels } from "@/types/gee";
import { cn } from "@/lib/utils";

interface MetricsCardsProps {
  deltas: SpectralIndices;
  classification?: ClassificationResult;
}

type IndexKey = "ndvi" | "ndbi" | "bsi" | "nbr";

interface IndexInfo {
  key: IndexKey;
  label: string;
  color: string;
  description: string;
  positiveIsBad: boolean; // If true, positive delta is concerning
}

const indexInfo: IndexInfo[] = [
  {
    key: "ndvi",
    label: "NDVI",
    color: indexColors.ndvi,
    description: "Vegetação",
    positiveIsBad: false, // More vegetation is good
  },
  {
    key: "ndbi",
    label: "NDBI",
    color: indexColors.ndbi,
    description: "Construção",
    positiveIsBad: true, // More construction may be concerning
  },
  {
    key: "bsi",
    label: "BSI",
    color: indexColors.bsi,
    description: "Solo Exposto",
    positiveIsBad: true, // More bare soil may be concerning
  },
  {
    key: "nbr",
    label: "NBR",
    color: indexColors.nbr,
    description: "Queimada",
    positiveIsBad: false, // Negative NBR indicates fire
  },
];

function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case "critical":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "warning":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "success":
      return "text-green-400 bg-green-500/10 border-green-500/30";
    default:
      return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  }
}

function DeltaArrow({ value, positiveIsBad }: { value: number; positiveIsBad: boolean }) {
  if (Math.abs(value) < 0.05) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  const isUp = value > 0;
  const isBad = positiveIsBad ? isUp : !isUp;

  const colorClass = isBad ? "text-red-400" : "text-green-400";

  return isUp ? (
    <ArrowUp className={cn("h-4 w-4", colorClass)} />
  ) : (
    <ArrowDown className={cn("h-4 w-4", colorClass)} />
  );
}

function IndexCard({ info, value }: { info: IndexInfo; value: number | null }) {
  if (value === null) return null;

  const absValue = Math.abs(value);
  const severity = absValue > 0.2 ? "high" : absValue > 0.1 ? "medium" : "low";

  return (
    <div className="flex flex-col p-3 rounded-lg bg-card border">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-medium"
          style={{ color: info.color }}
        >
          Δ{info.label}
        </span>
        <DeltaArrow value={value} positiveIsBad={info.positiveIsBad} />
      </div>
      <span className="text-xl font-bold">
        {value > 0 ? "+" : ""}
        {value.toFixed(3)}
      </span>
      <span className="text-xs text-muted-foreground">{info.description}</span>
      {severity === "high" && (
        <div className="mt-2">
          <Badge variant="destructive" className="text-xs">
            Mudança significativa
          </Badge>
        </div>
      )}
    </div>
  );
}

export function MetricsCards({ deltas, classification }: MetricsCardsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Variações Detectadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delta Cards Grid */}
        <div className="grid grid-cols-2 gap-2">
          {indexInfo.map((info) => (
            <IndexCard
              key={info.key}
              info={info}
              value={deltas[info.key]}
            />
          ))}
        </div>

        {/* Classification Result */}
        {classification && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              getAlertColor(classification.alertLevel)
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">
                    {changeTypeLabels[classification.changeType]}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {(classification.confidence * 100).toFixed(0)}% confiança
                  </Badge>
                </div>
                <p className="text-sm opacity-90">
                  {classification.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
