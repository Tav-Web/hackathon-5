"use client";

import { Play, Loader2, MapPin, TreeDeciduous, Building, Trash2, FileText, Droplets } from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import { generatePDFReport } from "@/lib/pdfReport";

// Styled components
import {
  PanelContainer,
  PanelTitle,
  AnalyzeButton,
  HelperText,
  ErrorText,
  ProgressBar,
  ProgressFill,
  ResultsContainer,
  SummaryCard,
  SummaryTitle,
  SummaryGrid,
  SummaryItem,
  SummaryValue,
  SummaryLabel,
  ByTypeCard,
  ByTypeTitle,
  TypesList,
  TypeItem,
  TypeInfo,
  TypeIconWrapper,
  TypeName,
  TypeCount,
  DownloadButton,
  HintText,
} from "./styles";

// Tipos de mudança com ícones, cores e labels traduzidos
const changeTypes = {
  construction: { label: "Construção", icon: Building, color: "#ef4444" },
  demolition: { label: "Demolição", icon: Trash2, color: "#f97316" },
  deforestation: { label: "Desmatamento", icon: TreeDeciduous, color: "#dc2626" },
  vegetation_growth: { label: "Crescimento de Vegetação", icon: TreeDeciduous, color: "#22c55e" },
  vegetation_loss: { label: "Perda de Vegetação", icon: TreeDeciduous, color: "#dc2626" },
  soil_movement: { label: "Movimentação de Solo", icon: MapPin, color: "#a16207" },
  debris: { label: "Entulho", icon: Trash2, color: "#6b7280" },
  urban_expansion: { label: "Expansão Urbana", icon: Building, color: "#8b5cf6" },
  water_change: { label: "Alteração Hídrica", icon: Droplets, color: "#3b82f6" },
  unknown: { label: "Não Classificado", icon: MapPin, color: "#3b82f6" },
};

export function AnalysisPanel() {
  const { images, status, progress, summary, changes, startDetection, error, selectedBounds } = useAnalysis();
  const analyzing = status === "analyzing";
  const hasImages = images.length === 2;

  // Check if images are from satellite (hide controls since SatellitePanel handles that)
  const isSatelliteMode = images.some((img) => img.satellite);

  const handleAnalyze = async () => {
    try {
      await startDetection();
      toast.success("Análise concluída!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na análise");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading("Gerando relatório PDF...");
      const mapElement = document.querySelector("[data-map-container]") as HTMLElement | null;

      await generatePDFReport({
        images,
        changes,
        summary,
        bounds: selectedBounds,
        mapElement,
      });

      toast.dismiss();
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : "Erro ao gerar PDF");
    }
  };

  // Hide the entire panel if in satellite mode and no results yet
  if (isSatelliteMode && !summary) {
    return null;
  }

  return (
    <PanelContainer>
      {/* Only show header and button for manual upload mode */}
      {!isSatelliteMode && (
        <>
          <PanelTitle>Análise</PanelTitle>

          {/* Botão de análise */}
          <AnalyzeButton
            onClick={handleAnalyze}
            disabled={analyzing || !hasImages}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detectando alterações... {progress}%
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Analisar Área
              </>
            )}
          </AnalyzeButton>

          {!hasImages && (
            <HelperText>
              Envie as imagens &quot;antes&quot; e &quot;depois&quot; para iniciar
            </HelperText>
          )}

          {error && <ErrorText>{error}</ErrorText>}

          {/* Progress bar */}
          {analyzing && (
            <ProgressBar>
              <ProgressFill $progress={progress} />
            </ProgressBar>
          )}
        </>
      )}

      {/* Resultados */}
      {summary && (
        <ResultsContainer>
          {/* Resumo da Análise */}
          <SummaryCard elevation={0}>
            <SummaryTitle>Resumo da Análise</SummaryTitle>
            <SummaryGrid>
              <SummaryItem elevation={0}>
                <SummaryValue>{summary.total_changes}</SummaryValue>
                <SummaryLabel>Mudanças</SummaryLabel>
              </SummaryItem>
              <SummaryItem elevation={0}>
                <SummaryValue>
                  {summary.total_area > 1000
                    ? `${(summary.total_area / 1000).toFixed(1)}k`
                    : summary.total_area.toFixed(0)}
                </SummaryValue>
                <SummaryLabel>Área (m²)</SummaryLabel>
              </SummaryItem>
            </SummaryGrid>
          </SummaryCard>

          {/* Por tipo */}
          {Object.keys(summary.by_type).length > 0 && (
            <ByTypeCard elevation={0}>
              <ByTypeTitle>Por Tipo</ByTypeTitle>
              <TypesList>
                {Object.entries(summary.by_type).map(([type, count]) => {
                  const typeInfo = changeTypes[type as keyof typeof changeTypes] || changeTypes.unknown;
                  const Icon = typeInfo.icon;
                  return (
                    <TypeItem key={type} elevation={0}>
                      <TypeInfo>
                        <TypeIconWrapper $color={typeInfo.color}>
                          <Icon className="h-4 w-4" />
                        </TypeIconWrapper>
                        <TypeName>{typeInfo.label}</TypeName>
                      </TypeInfo>
                      <TypeCount>{count}</TypeCount>
                    </TypeItem>
                  );
                })}
              </TypesList>
            </ByTypeCard>
          )}

          {/* Botão de download PDF */}
          <DownloadButton onClick={handleDownloadPDF}>
            <FileText className="h-4 w-4" />
            Baixar Relatório da Análise
          </DownloadButton>

          {/* Dica de interação */}
          <HintText>Clique nas áreas no mapa para ver detalhes</HintText>
        </ResultsContainer>
      )}
    </PanelContainer>
  );
}
