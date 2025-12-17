"use client";

import { useState } from "react";
import {
  Satellite,
  Search,
  Loader2,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";

export function SatellitePanel() {
  const {
    status,
    progress,
    selectedBounds,
    setIsSelectingBounds,
    summary,
    changes,
    analyzeArea,
  } = useAnalysis();

  const [dateBefore, setDateBefore] = useState("");
  const [dateAfter, setDateAfter] = useState("");

  const isProcessing = status === "downloading" || status === "analyzing";

  const handleAnalyze = async () => {
    if (!selectedBounds) {
      toast.error("Selecione uma área no mapa primeiro");
      return;
    }

    if (!dateBefore || !dateAfter) {
      toast.error("Selecione as datas antes e depois");
      return;
    }

    if (new Date(dateBefore) >= new Date(dateAfter)) {
      toast.error("A data 'Antes' deve ser anterior à data 'Depois'");
      return;
    }

    try {
      await analyzeArea(dateBefore, dateAfter);
      toast.success("Análise concluída com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na análise");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const getStatusText = () => {
    if (status === "downloading") return "Baixando imagens de satélite...";
    if (status === "analyzing") return "Analisando mudanças...";
    return "Detectar Mudanças";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Satellite className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">
          Detector de Mudanças
        </h2>
      </div>

      {/* Seleção de área */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Área de Análise
        </label>
        <button
          onClick={() => setIsSelectingBounds(true)}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors border border-gray-700"
        >
          <MapPin className="h-4 w-4" />
          {selectedBounds
            ? `${selectedBounds.min_lat.toFixed(4)}, ${selectedBounds.min_lon.toFixed(4)}`
            : "Selecionar no Mapa"}
        </button>
        {selectedBounds && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              Área:{" "}
              {((selectedBounds.max_lon - selectedBounds.min_lon) * 111).toFixed(1)}
              km x{" "}
              {((selectedBounds.max_lat - selectedBounds.min_lat) * 111).toFixed(1)}
              km
            </p>
            <p className="text-gray-600">
              SW: {selectedBounds.min_lat.toFixed(6)}, {selectedBounds.min_lon.toFixed(6)}
              <br />
              NE: {selectedBounds.max_lat.toFixed(6)}, {selectedBounds.max_lon.toFixed(6)}
            </p>
          </div>
        )}
      </div>

      {/* Seleção de datas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">
            Data Antes
          </label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateBefore}
              onChange={(e) => setDateBefore(e.target.value)}
              max={today}
              disabled={isProcessing}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-8 pr-2 text-sm text-white disabled:opacity-50"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-400">
            Data Depois
          </label>
          <div className="relative">
            <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateAfter}
              onChange={(e) => setDateAfter(e.target.value)}
              max={today}
              disabled={isProcessing}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-8 pr-2 text-sm text-white disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Botão de análise */}
      <button
        onClick={handleAnalyze}
        disabled={isProcessing || !selectedBounds || !dateBefore || !dateAfter}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors font-medium"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {getStatusText()}
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            Detectar Mudanças
          </>
        )}
      </button>

      {/* Barra de progresso */}
      {isProcessing && (
        <div className="space-y-1">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">{progress}%</p>
        </div>
      )}

      {/* Resumo dos resultados */}
      {summary && status === "completed" && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-medium text-white">
              Relatório de Mudanças
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-900 rounded p-2">
              <p className="text-gray-400">Total de Mudanças</p>
              <p className="text-xl font-bold text-white">
                {summary.total_changes}
              </p>
            </div>
            <div className="bg-gray-900 rounded p-2">
              <p className="text-gray-400">Área Afetada</p>
              <p className="text-xl font-bold text-white">
                {summary.total_area?.toFixed(0) || 0}
                <span className="text-xs text-gray-500"> m²</span>
              </p>
            </div>
          </div>

          {/* Tipos de mudanças detectadas */}
          {summary.by_type && Object.keys(summary.by_type).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Tipos Detectados:</p>
              <div className="space-y-1">
                {Object.entries(summary.by_type).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between text-xs bg-gray-900 rounded px-2 py-1"
                  >
                    <span className="text-gray-300 capitalize">{type}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aviso se não houver mudanças */}
      {status === "completed" && changes && changes.features.length === 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
          <div className="text-xs text-yellow-200">
            <p className="font-medium">Nenhuma mudança detectada</p>
            <p className="text-yellow-300/70">
              Tente selecionar uma área maior ou um intervalo de datas diferente.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Análise baseada em imagens Sentinel-2 do Copernicus
      </p>
    </div>
  );
}
