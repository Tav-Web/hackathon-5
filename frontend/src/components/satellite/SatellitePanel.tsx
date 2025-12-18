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
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import { getSatelliteImagePreviewUrl } from "@/lib/api";

// Format date to user's locale (pt-BR: dd/mm/yyyy)
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Data não informada";
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function SatellitePanel() {
  const {
    status,
    progress,
    selectedBounds,
    setIsSelectingBounds,
    summary,
    changes,
    analyzeArea,
    images,
  } = useAnalysis();

  const [dateBefore, setDateBefore] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Get satellite images for preview
  const beforeImage = images.find((img) => img.type === "before" && img.satellite);
  const afterImage = images.find((img) => img.type === "after" && img.satellite);

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
        <div className="flex gap-2">
          <button
            onClick={() => setIsSelectingBounds(true)}
            disabled={isProcessing}
            className={`flex-1 flex items-center justify-center gap-2 ${
              selectedBounds
                ? 'bg-green-800 hover:bg-green-700 border-green-600'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
            } disabled:opacity-50 text-white py-2 px-4 rounded-lg transition-colors border`}
          >
            <MapPin className="h-4 w-4" />
            {selectedBounds ? "Nova Seleção" : "Selecionar no Mapa"}
          </button>
        </div>
        {selectedBounds && (
          <p className="text-xs text-green-400">
            ✓ Área selecionada - arraste o retângulo verde no mapa para nova seleção
          </p>
        )}
        {selectedBounds && (() => {
          const widthKm = (selectedBounds.max_lon - selectedBounds.min_lon) * 111;
          const heightKm = (selectedBounds.max_lat - selectedBounds.min_lat) * 111;
          // Sentinel-2 has 10m resolution, so 1km = 100 pixels
          const widthPx = Math.round(widthKm * 100);
          const heightPx = Math.round(heightKm * 100);
          const isVerySmall = widthPx < 50 || heightPx < 50; // Less than 500m
          const isSmallArea = widthPx < 200 || heightPx < 200; // Less than 2km

          return (
            <div className="text-xs text-gray-500 space-y-2">
              <div className="flex justify-between">
                <span>Área:</span>
                <span className="text-white">{widthKm.toFixed(2)}km x {heightKm.toFixed(2)}km</span>
              </div>
              <div className="flex justify-between">
                <span>Resolução Sentinel-2:</span>
                <span className={`font-medium ${isVerySmall ? 'text-red-400' : isSmallArea ? 'text-yellow-400' : 'text-green-400'}`}>
                  {widthPx}x{heightPx} pixels
                </span>
              </div>
              {isVerySmall && (
                <div className="bg-red-900/30 border border-red-700 rounded p-2 mt-1">
                  <p className="text-red-300 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Área muito pequena!
                  </p>
                  <p className="text-red-200/70 mt-1">
                    Com apenas {widthPx}x{heightPx} pixels, a imagem ficará muito pixelada.
                    Recomendamos selecionar uma área de pelo menos 2km x 2km (200x200 pixels).
                  </p>
                </div>
              )}
              {!isVerySmall && isSmallArea && (
                <p className="text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Área pequena - considere ampliar para melhor qualidade
                </p>
              )}
              <p className="text-gray-600 text-[10px]">
                SW: {selectedBounds.min_lat.toFixed(5)}, {selectedBounds.min_lon.toFixed(5)} |
                NE: {selectedBounds.max_lat.toFixed(5)}, {selectedBounds.max_lon.toFixed(5)}
              </p>
            </div>
          );
        })()}
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

      {/* Botão de preview das imagens */}
      {beforeImage && afterImage && (
        <button
          onClick={() => setShowPreview(true)}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
        >
          <Eye className="h-4 w-4" />
          Ver Imagens de Satélite
        </button>
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
        Imagens Sentinel-2 via Copernicus Data Space
      </p>

      {/* Modal de Preview das Imagens */}
      {showPreview && beforeImage && afterImage && selectedBounds && (() => {
        const widthKm = (selectedBounds.max_lon - selectedBounds.min_lon) * 111;
        const heightKm = (selectedBounds.max_lat - selectedBounds.min_lat) * 111;
        const widthPx = Math.round(widthKm * 100);
        const heightPx = Math.round(heightKm * 100);
        const centerLat = (selectedBounds.min_lat + selectedBounds.max_lat) / 2;
        const centerLon = (selectedBounds.min_lon + selectedBounds.max_lon) / 2;

        // Calculate aspect ratio of selected area
        const aspectRatio = widthKm / heightKm;
        // Calculate image size maintaining aspect ratio (max 800px on larger side)
        const maxSize = 800;
        const imgWidth = aspectRatio >= 1 ? maxSize : Math.round(maxSize * aspectRatio);
        const imgHeight = aspectRatio >= 1 ? Math.round(maxSize / aspectRatio) : maxSize;

        // ESRI export with exact bounds and correct aspect ratio
        const bboxUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${selectedBounds.min_lon},${selectedBounds.min_lat},${selectedBounds.max_lon},${selectedBounds.max_lat}&bboxSR=4326&imageSR=4326&size=${imgWidth},${imgHeight}&format=png&f=image`;

        // Fixed height for uniform image containers
        const containerHeight = 220; // Fixed height in pixels for uniformity

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowPreview(false)}
          >
            <div
              className="bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Satellite className="h-5 w-5 text-blue-400" />
                  Comparação de Imagens de Satélite
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Resolution Info Banner */}
              <div className="mx-4 mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>Resolução Sentinel-2:</strong> {widthPx}x{heightPx} pixels reais para área de {widthKm.toFixed(2)}km x {heightKm.toFixed(2)}km
                </p>
                <p className="text-xs text-blue-300/70 mt-1">
                  Sentinel-2 tem resolução de 10m/pixel. Para áreas pequenas, a imagem terá poucos pixels.
                  O mapa base (abaixo) mostra a mesma área em alta resolução para referência.
                </p>
              </div>

              {/* Images Grid - 3 columns with exact aspect ratio */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Reference - Basemap of exact selected area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-300">ÁREA SELECIONADA</h4>
                    <span className="text-xs text-gray-500">Mapa Base</span>
                  </div>
                  <div
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                    style={{ height: `${containerHeight}px` }}
                  >
                    <img
                      src={bboxUrl}
                      alt="Área Selecionada"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3EMapa não disponível%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-gray-300 p-1 text-center">
                      ESRI World Imagery
                    </div>
                  </div>
                </div>

                {/* Before Image */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-medium text-gray-300">ANTES (Sentinel-2)</h4>
                    <div className="flex flex-col text-xs">
                      <span className="text-gray-500">Solicitado: <span className="text-gray-300">{formatDate(dateBefore)}</span></span>
                      <span className="text-gray-500">Capturado: <span className="text-blue-400">{formatDate(beforeImage.date)}</span></span>
                    </div>
                  </div>
                  <div
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                    style={{ height: `${containerHeight}px` }}
                  >
                    <img
                      src={getSatelliteImagePreviewUrl(beforeImage.id)}
                      alt="Imagem Antes"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-gray-300 p-1 text-center">
                      {widthPx}x{heightPx} px
                    </div>
                  </div>
                </div>

                {/* After Image */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-medium text-gray-300">DEPOIS (Sentinel-2)</h4>
                    <div className="flex flex-col text-xs">
                      <span className="text-gray-500">Solicitado: <span className="text-gray-300">{formatDate(dateAfter)}</span></span>
                      <span className="text-gray-500">Capturado: <span className="text-blue-400">{formatDate(afterImage.date)}</span></span>
                    </div>
                  </div>
                  <div
                    className="relative bg-gray-800 rounded-lg overflow-hidden"
                    style={{ height: `${containerHeight}px` }}
                  >
                    <img
                      src={getSatelliteImagePreviewUrl(afterImage.id)}
                      alt="Imagem Depois"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-xs text-gray-300 p-1 text-center">
                      {widthPx}x{heightPx} px
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Footer */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                  <div>
                    <p className="text-gray-500">Fonte</p>
                    <p className="text-white">Copernicus Sentinel-2</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Resolução Nativa</p>
                    <p className="text-white">10m/pixel</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pixels Reais</p>
                    <p className={`font-medium ${widthPx < 50 ? 'text-red-400' : widthPx < 200 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {widthPx} x {heightPx}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Latitude</p>
                    <p className="text-white">{centerLat.toFixed(5)}°</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Longitude</p>
                    <p className="text-white">{centerLon.toFixed(5)}°</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
