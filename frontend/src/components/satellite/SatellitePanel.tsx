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
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import { getSatelliteImagePreviewUrl, SatelliteSource } from "@/lib/api";

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

// Tradução de tipos de mudança
const translateChangeType = (type: string): string => {
  const translations: Record<string, string> = {
    urban_expansion: "Expansão Urbana",
    vegetation_growth: "Crescimento de Vegetação",
    vegetation_loss: "Perda de Vegetação",
    deforestation: "Desmatamento",
    construction: "Construção",
    demolition: "Demolição",
    soil_movement: "Movimentação de Solo",
    water_change: "Alteração Hídrica",
    debris: "Entulho",
    unknown: "Não Classificado",
  };
  return translations[type] || type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

interface SatellitePanelProps {
  onNewAnalysis?: () => void;
}

export function SatellitePanel({ onNewAnalysis }: SatellitePanelProps = {}) {
  const {
    status,
    progress,
    selectedBounds,
    setIsSelectingBounds,
    isSelectingBounds,
    setSelectedBounds,
    summary,
    changes,
    analyzeArea,
    images,
    reset,
    selectedChangeType,
    setSelectedChangeType,
  } = useAnalysis();

  const [dateBefore, setDateBefore] = useState("");
  const [dateAfter, setDateAfter] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [imageSource, setImageSource] = useState<SatelliteSource>("earth_engine");
  const [lastAnalyzedDates, setLastAnalyzedDates] = useState<{ before: string; after: string } | null>(null);

  // Get satellite images for preview
  const beforeImage = images.find((img) => img.type === "before" && img.satellite);
  const afterImage = images.find((img) => img.type === "after" && img.satellite);

  const isProcessing = status === "downloading" || status === "analyzing";
  const isCompleted = status === "completed";

  // Check if dates changed since last analysis
  const datesChangedSinceAnalysis = isCompleted && lastAnalyzedDates &&
    (lastAnalyzedDates.before !== dateBefore || lastAnalyzedDates.after !== dateAfter);

  // Can re-analyze if dates changed or source changed
  const canReanalyze = isCompleted && datesChangedSinceAnalysis;

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
      await analyzeArea(dateBefore, dateAfter, imageSource);
      setLastAnalyzedDates({ before: dateBefore, after: dateAfter });
      toast.success("Análise concluída com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao processar imagens da fonte selecionada. Tente novamente.");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const getStatusText = () => {
    if (status === "downloading") return "Baixando imagens de satélite...";
    if (status === "analyzing") return "Detectando alterações...";
    if (status === "completed") return "Análise concluída";
    return "Analisar Área";
  };

  // Check step completion status
  const isStep1Complete = !!imageSource;
  const isStep2Complete = !!selectedBounds;
  const isStep3Complete = !!dateBefore && !!dateAfter && new Date(dateBefore) < new Date(dateAfter);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-4">

      {/* ① Fonte de Satélite */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">①</span>
          <label className="text-sm font-medium text-white">Fonte de Satélite</label>
          {isStep1Complete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setImageSource("earth_engine")}
            disabled={isProcessing}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              imageSource === "earth_engine"
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            } disabled:opacity-50`}
          >
            Earth Engine
          </button>
          <button
            onClick={() => setImageSource("sentinel")}
            disabled={isProcessing}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              imageSource === "sentinel"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            } disabled:opacity-50`}
          >
            Sentinel Hub
          </button>
          <button
            onClick={() => setImageSource("planet")}
            disabled={isProcessing}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              imageSource === "planet"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
            } disabled:opacity-50`}
          >
            Planet ⭐
          </button>
        </div>
        <p className="text-xs text-muted-foreground opacity-70">
          {imageSource === "planet"
            ? "Planet oferece 3x mais resolução (requer API key)"
            : imageSource === "sentinel"
            ? "Sentinel Hub requer credenciais Copernicus"
            : "Earth Engine (10m) - sempre disponível"}
        </p>
      </div>

      {/* ② Área de Análise */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">②</span>
          <label className="text-sm font-medium text-white">Área de Análise</label>
          {isStep2Complete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
        <div className="flex gap-2">
          {isSelectingBounds ? (
            <button
              onClick={() => setIsSelectingBounds(false)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors border border-gray-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancelar Seleção
            </button>
          ) : (
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
          )}
          {selectedBounds && !isSelectingBounds && (
            <button
              onClick={() => setSelectedBounds(null)}
              disabled={isProcessing}
              className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 hover:text-white rounded-lg transition-colors border border-gray-700"
              title="Limpar seleção"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {selectedBounds && (
          <p className="text-xs text-green-400">
            ✓ Área selecionada - arraste o retângulo verde no mapa para nova seleção
          </p>
        )}
        {selectedBounds && (() => {
          // Longitude conversion varies with latitude: 1° lon = 111 * cos(lat) km
          const centerLat = (selectedBounds.min_lat + selectedBounds.max_lat) / 2;
          const cosLat = Math.cos((centerLat * Math.PI) / 180);
          const widthKm = (selectedBounds.max_lon - selectedBounds.min_lon) * 111 * cosLat;
          const heightKm = (selectedBounds.max_lat - selectedBounds.min_lat) * 111;
          // Resolution: Sentinel-2 = 10m/pixel (100px/km), Planet = 3m/pixel (~333px/km)
          const pxPerKm = imageSource === "planet" ? 333 : 100;
          const widthPx = Math.round(widthKm * pxPerKm);
          const heightPx = Math.round(heightKm * pxPerKm);
          const isVerySmall = widthPx < 50 || heightPx < 50;
          const isSmallArea = widthPx < 200 || heightPx < 200;

          return (
            <div className="text-xs text-gray-500 space-y-2">
              <div className="flex justify-between">
                <span>Área:</span>
                <span className="text-white">{widthKm.toFixed(2)}km x {heightKm.toFixed(2)}km</span>
              </div>
              <div className="flex justify-between">
                <span>Resolução {imageSource === "planet" ? "Planet" : imageSource === "earth_engine" ? "Earth Engine" : "Sentinel Hub"}:</span>
                <span className={`font-medium ${isVerySmall ? 'text-red-400' : isSmallArea ? 'text-yellow-400' : 'text-green-400'}`}>
                  {widthPx}x{heightPx} pixels
                </span>
              </div>
              {(imageSource === "sentinel" || imageSource === "earth_engine") && isVerySmall && (
                <div className="bg-purple-900/30 border border-purple-700 rounded p-2 mt-1">
                  <p className="text-purple-300 flex items-center gap-1 font-medium">
                    ⭐ Experimente Planet para mais detalhes!
                  </p>
                  <p className="text-purple-200/70 mt-1">
                    Com Planet ({Math.round(widthPx * 3.33)}x{Math.round(heightPx * 3.33)} pixels) você terá 3x mais resolução.
                  </p>
                </div>
              )}
              {imageSource === "planet" && isVerySmall && (
                <div className="bg-red-900/30 border border-red-700 rounded p-2 mt-1">
                  <p className="text-red-300 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Área ainda pequena
                  </p>
                  <p className="text-red-200/70 mt-1">
                    Mesmo com Planet, a área é muito pequena. Considere ampliar.
                  </p>
                </div>
              )}
              {!isVerySmall && isSmallArea && (imageSource === "sentinel" || imageSource === "earth_engine") && (
                <p className="text-purple-400 flex items-center gap-1">
                  ⭐ Planet daria {Math.round(widthPx * 3.33)}x{Math.round(heightPx * 3.33)} pixels
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

      {/* ③ Período */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">③</span>
          <label className="text-sm font-medium text-white">Período</label>
          {isStep3Complete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
        <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground opacity-70">
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
          <label className="text-xs font-medium text-muted-foreground opacity-70">
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
      </div>

      {/* ⑤ Resumo da Análise */}
      {summary && status === "completed" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-500 text-sm font-bold">⑤</span>
            <label className="text-sm font-medium text-white">Resumo da Análise</label>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-900 rounded p-2">
                <p className="text-muted-foreground opacity-70">Total de Mudanças</p>
                <p className="text-xl font-bold text-white">
                  {summary.total_changes}
                </p>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <p className="text-muted-foreground opacity-70">Área Afetada</p>
                <p className="text-xl font-bold text-white">
                  {summary.total_area?.toFixed(0) || 0}
                  <span className="text-xs text-muted-foreground"> m²</span>
                </p>
              </div>
            </div>

            {/* Tipos de mudanças detectadas - clicáveis para filtrar */}
            {summary.by_type && Object.keys(summary.by_type).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground opacity-70">Tipos Detectados:</p>
                  {selectedChangeType && (
                    <button
                      onClick={() => setSelectedChangeType(null)}
                      className="text-xs text-primary hover:underline"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {Object.entries(summary.by_type).map(([type, count]) => (
                    <button
                      key={type}
                      onClick={() => setSelectedChangeType(selectedChangeType === type ? null : type)}
                      className={`w-full flex items-center justify-between text-xs rounded px-2 py-1.5 transition-colors ${
                        selectedChangeType === type
                          ? "bg-primary/20 border border-primary"
                          : "bg-gray-900 hover:bg-gray-800 border border-transparent"
                      }`}
                    >
                      <span className={selectedChangeType === type ? "text-primary" : "text-gray-300"}>
                        {translateChangeType(type)}
                      </span>
                      <span className={`font-medium ${selectedChangeType === type ? "text-primary" : "text-white"}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground opacity-50">
                  Clique em um tipo para filtrar no mapa
                </p>
              </div>
            )}
          </div>
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

      {/* Botão Nova Análise */}
      {status === "completed" && (
        <button
          onClick={() => {
            reset();
            setDateBefore("");
            setDateAfter("");
            onNewAnalysis?.(); // Switch to map view
          }}
          className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-2 px-4 rounded-lg transition-colors text-sm border border-gray-700"
        >
          <RotateCcw className="h-4 w-4" />
          Nova Análise
        </button>
      )}

      <p className="text-xs text-muted-foreground opacity-60">
        {imageSource === "planet"
          ? "Imagens PlanetScope via Planet Labs Developer Trial"
          : imageSource === "earth_engine"
          ? "Imagens Sentinel-2 via Google Earth Engine"
          : "Imagens Sentinel-2 via Copernicus Data Space"}
      </p>

      </div>

      {/* ④ Botão de Ação Principal - Fixo no rodapé */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-card border-t border-gray-800 -mx-4 px-4 mt-auto">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">④</span>
          <label className="text-sm font-medium text-white">Executar Análise</label>
          {canReanalyze && (
            <span className="text-xs text-yellow-400 ml-auto">Datas alteradas</span>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isProcessing || !selectedBounds || !dateBefore || !dateAfter || (isCompleted && !canReanalyze)}
          className={`w-full flex items-center justify-center gap-2 text-white py-4 px-4 rounded-lg transition-colors font-medium text-base ${
            isCompleted && !canReanalyze
              ? "bg-green-600 cursor-default"
              : canReanalyze
              ? "bg-yellow-600 hover:bg-yellow-500"
              : "bg-primary hover:bg-primary/90 disabled:bg-gray-700 disabled:cursor-not-allowed"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {getStatusText()}
            </>
          ) : isCompleted && !canReanalyze ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Análise Concluída
            </>
          ) : canReanalyze ? (
            <>
              <RotateCcw className="h-5 w-5" />
              🔄 Reanalisar com Novas Datas
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Analisar Área Selecionada
            </>
          )}
        </button>

        {/* Barra de progresso */}
        {isProcessing && (
          <div className="space-y-1 mt-2">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}
      </div>

      {/* Modal de Preview das Imagens */}
      {showPreview && beforeImage && afterImage && selectedBounds && (() => {
        // Longitude conversion varies with latitude: 1° lon = 111 * cos(lat) km
        const centerLat = (selectedBounds.min_lat + selectedBounds.max_lat) / 2;
        const centerLon = (selectedBounds.min_lon + selectedBounds.max_lon) / 2;
        const cosLat = Math.cos((centerLat * Math.PI) / 180);
        const widthKm = (selectedBounds.max_lon - selectedBounds.min_lon) * 111 * cosLat;
        const heightKm = (selectedBounds.max_lat - selectedBounds.min_lat) * 111;
        // Resolution: Sentinel-2/Earth Engine = 10m/pixel (100px/km), Planet = 3m/pixel (~333px/km)
        const pxPerKm = imageSource === "planet" ? 333 : 100;
        const resolution = imageSource === "planet" ? "3m/pixel" : "10m/pixel";
        const sourceName = imageSource === "planet" ? "PlanetScope" : imageSource === "earth_engine" ? "Earth Engine" : "Sentinel Hub";
        const widthPx = Math.round(widthKm * pxPerKm);
        const heightPx = Math.round(heightKm * pxPerKm);

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
              <div className={`mx-4 mt-4 p-3 ${imageSource === "planet" ? "bg-purple-900/30 border-purple-700" : "bg-blue-900/30 border-blue-700"} border rounded-lg`}>
                <p className={`text-sm ${imageSource === "planet" ? "text-purple-200" : "text-blue-200"}`}>
                  <strong>Resolução {sourceName}:</strong> {widthPx}x{heightPx} pixels reais para área de {widthKm.toFixed(2)}km x {heightKm.toFixed(2)}km
                </p>
                <p className={`text-xs ${imageSource === "planet" ? "text-purple-300/70" : "text-blue-300/70"} mt-1`}>
                  {sourceName} tem resolução de {resolution}. {imageSource === "planet" ? "Alta resolução para detecção de mudanças finas." : "Para áreas pequenas, a imagem terá poucos pixels."}
                  {imageSource === "sentinel" && " O mapa base (abaixo) mostra a mesma área em alta resolução para referência."}
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
                    <h4 className="text-sm font-medium text-gray-300">ANTES ({sourceName})</h4>
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
                    <h4 className="text-sm font-medium text-gray-300">DEPOIS ({sourceName})</h4>
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
                    <p className={`${imageSource === "planet" ? "text-purple-300" : imageSource === "earth_engine" ? "text-green-300" : "text-white"}`}>
                      {imageSource === "planet" ? "Planet Labs" : imageSource === "earth_engine" ? "Google" : "Copernicus"} {sourceName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Resolução Nativa</p>
                    <p className={`${imageSource === "planet" ? "text-purple-300" : imageSource === "earth_engine" ? "text-green-300" : "text-white"}`}>{resolution}</p>
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
