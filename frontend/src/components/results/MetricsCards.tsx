"use client";

import { ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  SpectralIndices,
  ClassificationResult,
  AlertLevel,
} from "@/types/gee";
import { indexColors, changeTypeLabels } from "@/types/gee";
import {
  IndexCardContainer,
  IndexCardHeader,
  IndexLabel,
  IndexValue,
  IndexDescription,
  BadgeWrapper,
  MetricsCardWrapper,
  MetricsHeader,
  MetricsTitle,
  MetricsContent,
  DeltaCardsGrid,
  ClassificationBox,
  ClassificationContent,
  ClassificationIcon,
  ClassificationBody,
  ClassificationHeader,
  ClassificationTitle,
  ClassificationDescription,
} from "./MetricsStyles";

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
  positiveIsBad: boolean;
}

const indexInfo: IndexInfo[] = [
  {
    key: "ndvi",
    label: "NDVI",
    color: indexColors.ndvi,
    description: "Vegetação",
    positiveIsBad: false,
  },
  {
    key: "ndbi",
    label: "NDBI",
    color: indexColors.ndbi,
    description: "Construção",
    positiveIsBad: true,
  },
  {
    key: "bsi",
    label: "BSI",
    color: indexColors.bsi,
    description: "Solo Exposto",
    positiveIsBad: true,
  },
  {
    key: "nbr",
    label: "NBR",
    color: indexColors.nbr,
    description: "Queimada",
    positiveIsBad: false,
  },
];

function getAlertColor(level: AlertLevel): string {
  switch (level) {
    case "critical":
      return "color: rgb(248, 113, 113); background-color: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);";
    case "warning":
      return "color: rgb(250, 204, 21); background-color: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.3);";
    case "success":
      return "color: rgb(74, 222, 128); background-color: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3);";
    default:
      return "color: rgb(96, 165, 250); background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3);";
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
    <ArrowUp className={`h-4 w-4 ${colorClass}`} />
  ) : (
    <ArrowDown className={`h-4 w-4 ${colorClass}`} />
  );
}

function IndexCard({ info, value }: { info: IndexInfo; value: number | null }) {
  if (value === null) return null;

  const absValue = Math.abs(value);
  const severity = absValue > 0.2 ? "high" : absValue > 0.1 ? "medium" : "low";

  return (
    <IndexCardContainer>
      <IndexCardHeader>
        <IndexLabel $color={info.color}>Δ{info.label}</IndexLabel>
        <DeltaArrow value={value} positiveIsBad={info.positiveIsBad} />
      </IndexCardHeader>
      <IndexValue>
        {value > 0 ? "+" : ""}
        {value.toFixed(3)}
      </IndexValue>
      <IndexDescription>{info.description}</IndexDescription>
      {severity === "high" && (
        <BadgeWrapper>
          <Badge variant="destructive" className="text-xs">
            Mudança significativa
          </Badge>
        </BadgeWrapper>
      )}
    </IndexCardContainer>
  );
}

export function MetricsCards({ deltas, classification }: MetricsCardsProps) {
  return (
    <MetricsCardWrapper elevation={0}>
      <MetricsHeader>
        <MetricsTitle>
          <AlertTriangle className="h-4 w-4" />
          Variações Detectadas
        </MetricsTitle>
      </MetricsHeader>
      <MetricsContent>
        {/* Delta Cards Grid */}
        <DeltaCardsGrid>
          {indexInfo.map((info) => (
            <IndexCard
              key={info.key}
              info={info}
              value={deltas[info.key]}
            />
          ))}
        </DeltaCardsGrid>

        {/* Classification Result */}
        {classification && (
          <ClassificationBox $alertColor={getAlertColor(classification.alertLevel)}>
            <ClassificationContent>
              <ClassificationIcon>
                <AlertTriangle className="h-5 w-5" />
              </ClassificationIcon>
              <ClassificationBody>
                <ClassificationHeader>
                  <ClassificationTitle>
                    {changeTypeLabels[classification.changeType]}
                  </ClassificationTitle>
                  <Badge variant="outline" className="text-xs">
                    {(classification.confidence * 100).toFixed(0)}% confiança
                  </Badge>
                </ClassificationHeader>
                <ClassificationDescription>
                  {classification.description}
                </ClassificationDescription>
              </ClassificationBody>
            </ClassificationContent>
          </ClassificationBox>
        )}
      </MetricsContent>
    </MetricsCardWrapper>
  );
}
