"use client";

import { Play, Loader2, MapPin, TreeDeciduous, Building, Trash2, FileText, Droplets } from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import { generatePDFReport } from "@/lib/pdfReport";

// Tipos de mudança com ícones, cores e labels traduzidos
const changeTypes = {
  construction: { label: "Construção", icon: Building, color: "text-red-500" },
  demolition: { label: "Demolição", icon: Trash2, color: "text-orange-500" },
  deforestation: { label: "Desmatamento", icon: TreeDeciduous, color: "text-red-600" },
  vegetation_growth: { label: "Crescimento de Vegetação", icon: TreeDeciduous, color: "text-green-500" },
  vegetation_loss: { label: "Perda de Vegetação", icon: TreeDeciduous, color: "text-red-600" },
  soil_movement: { label: "Movimentação de Solo", icon: MapPin, color: "text-amber-600" },
  debris: { label: "Entulho", icon: Trash2, color: "text-gray-500" },
  urban_expansion: { label: "Expansão Urbana", icon: Building, color: "text-purple-500" },
  water_change: { label: "Alteração Hídrica", icon: Droplets, color: "text-blue-500" },
  unknown: { label: "Não Classificado", icon: MapPin, color: "text-blue-500" },
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
    <div className="space-y-4">
      {/* Only show header and button for manual upload mode */}
      {!isSatelliteMode && (
        <>
          <h2 className="text-lg font-semibold text-white">Análise</h2>

          {/* Botão de análise */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !hasImages}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors font-medium"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detectando alterações... {progress}%
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                🔍 Analisar Área
              </>
            )}
          </button>

          {!hasImages && (
            <p className="text-xs text-gray-500 text-center">
              Envie as imagens &quot;antes&quot; e &quot;depois&quot; para iniciar
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          {/* Progress bar */}
          {analyzing && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </>
      )}

      {/* Resultados */}
      {summary && (
        <div className="space-y-4">
          {/* Resumo da Análise */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Resumo da Análise</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-2xl font-bold text-white">{summary.total_changes}</p>
                <p className="text-xs text-gray-400">Mudanças</p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {summary.total_area > 1000
                    ? `${(summary.total_area / 1000).toFixed(1)}k`
                    : summary.total_area.toFixed(0)}
                </p>
                <p className="text-xs text-gray-400">Área (m²)</p>
              </div>
            </div>
          </div>

          {/* Por tipo */}
          {Object.keys(summary.by_type).length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Por Tipo</h3>
              <div className="space-y-2">
                {Object.entries(summary.by_type).map(([type, count]) => {
                  const typeInfo = changeTypes[type as keyof typeof changeTypes] || changeTypes.unknown;
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between bg-gray-900 rounded p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                        <span className="text-sm text-gray-300">{typeInfo.label}</span>
                      </div>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão de download PDF */}
          <button
            onClick={handleDownloadPDF}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Baixar Relatório da Análise
          </button>

          {/* Dica de interação */}
          <div className="text-xs text-muted-foreground opacity-70">
            <p>Clique nas áreas no mapa para ver detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
