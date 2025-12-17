"use client";

import { useState } from "react";
import { Play, Loader2, MapPin, TreeDeciduous, Building, Trash2 } from "lucide-react";
import { toast } from "sonner";

// Tipos de mudança com ícones e cores
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

export function AnalysisPanel() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // TODO: Integrar com API real
      // Simulação de análise
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setResult({
        totalChanges: 12,
        totalArea: 45678.5,
        byType: {
          construction: 3,
          deforestation: 2,
          vegetation_growth: 4,
          debris: 2,
          unknown: 1,
        },
      });

      toast.success("Análise concluída!");
    } catch {
      toast.error("Erro na análise");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Análise</h2>

      {/* Botão de análise */}
      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
      >
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Detectar Mudanças
          </>
        )}
      </button>

      {/* Resultados */}
      {result && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Resumo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.totalChanges}</p>
                <p className="text-xs text-gray-400">Mudanças</p>
              </div>
              <div className="bg-gray-900 rounded p-3 text-center">
                <p className="text-2xl font-bold text-white">
                  {(result.totalArea / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-gray-400">Área (px²)</p>
              </div>
            </div>
          </div>

          {/* Por tipo */}
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

          {/* Legenda */}
          <div className="text-xs text-gray-500">
            <p>Clique nas áreas no mapa para ver detalhes</p>
          </div>
        </div>
      )}
    </div>
  );
}
