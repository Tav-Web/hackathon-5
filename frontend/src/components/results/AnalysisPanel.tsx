"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Loader2, MapPin, TreeDeciduous, Building, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { compareImages, getAnalysisStatus, getChangesSummary, type GeoJSONFeatureCollection } from "@/lib/api";

const changeTypes = {
  construction: { label: "Construção", icon: Building, color: "text-red-500" },
  demolition: { label: "Demolição", icon: Trash2, color: "text-orange-500" },
  deforestation: { label: "Desmatamento", icon: TreeDeciduous, color: "text-red-600" },
  vegetation_growth: { label: "Vegetação", icon: TreeDeciduous, color: "text-green-500" },
  soil_movement: { label: "Solo", icon: MapPin, color: "text-amber-600" },
  debris: { label: "Entulho", icon: Trash2, color: "text-gray-500" },
  urban_expansion: { label: "Expansão Urbana", icon: Building, color: "text-purple-500" },
  unknown: { label: "Desconhecido", icon: MapPin, color: "text-blue-500" },
};

interface AnalysisResult {
  totalChanges: number;
  totalArea: number;
  byType: Record<string, number>;
}

interface AnalysisPanelProps {
  beforeImageId?: number;
  afterImageId?: number;
  onAnalysisComplete?: (result: GeoJSONFeatureCollection) => void;
}

export function AnalysisPanel({ beforeImageId, afterImageId, onAnalysisComplete }: AnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const canAnalyze = beforeImageId !== undefined && afterImageId !== undefined;

  const pollAnalysisStatus = useCallback(async (id: number) => {
    try {
      const status = await getAnalysisStatus(id);
      setProgress(status.progress);

      if (status.status === "completed") {
        const summary = await getChangesSummary(id);
        setResult({
          totalChanges: summary.total_changes,
          totalArea: summary.total_area,
          byType: summary.by_type,
        });
        setAnalyzing(false);
        toast.success("Análise concluída!");

        // Fetch full results for map
        if (onAnalysisComplete) {
          const { getChanges } = await import("@/lib/api");
          const changes = await getChanges(id);
          onAnalysisComplete(changes);
        }
      } else if (status.status === "failed") {
        setAnalyzing(false);
        toast.error(status.message || "Erro na análise");
      } else {
        // Continue polling
        setTimeout(() => pollAnalysisStatus(id), 2000);
      }
    } catch (error) {
      console.error("Error polling analysis status:", error);
      setAnalyzing(false);
      toast.error("Erro ao verificar status da análise");
    }
  }, [onAnalysisComplete]);

  const handleAnalyze = async () => {
    if (!beforeImageId || !afterImageId) {
      toast.error("Faça upload das duas imagens primeiro");
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    setResult(null);

    try {
      const analysis = await compareImages(beforeImageId, afterImageId);
      setAnalysisId(analysis.id);
      toast.info("Análise iniciada...");
      pollAnalysisStatus(analysis.id);
    } catch (error) {
      console.error("Error starting analysis:", error);
      setAnalyzing(false);
      toast.error("Erro ao iniciar análise");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Análise</h2>

      {/* Analysis button */}
      <button
        onClick={handleAnalyze}
        disabled={analyzing || !canAnalyze}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
      >
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando... {progress}%
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Detectar Mudanças
          </>
        )}
      </button>

      {!canAnalyze && (
        <p className="text-xs text-gray-500 text-center">
          Faça upload das imagens &quot;Antes&quot; e &quot;Depois&quot; para iniciar
        </p>
      )}

      {/* Progress bar */}
      {analyzing && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Resumo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.totalChanges}</p>
                <p className="text-xs text-gray-400">Mudanças</p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {result.totalArea > 1000
                    ? `${(result.totalArea / 1000).toFixed(1)}k`
                    : result.totalArea.toFixed(0)}
                </p>
                <p className="text-xs text-gray-400">Área (px²)</p>
              </div>
            </div>
          </div>

          {/* By type */}
          {Object.keys(result.byType).length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Por Tipo</h3>
              <div className="space-y-2">
                {Object.entries(result.byType).map(([type, count]) => {
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

          {/* Re-analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Analisar Novamente
          </button>

          {/* Legend */}
          <div className="text-xs text-gray-500">
            <p>Clique nas áreas no mapa para ver detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
