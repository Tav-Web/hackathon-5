"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Map, SplitSquareVertical, ChevronDown, ChevronUp, Satellite, Upload } from "lucide-react";
import { ImageUpload } from "@/components/upload/ImageUpload";
import { AnalysisPanel } from "@/components/results/AnalysisPanel";
import { SatellitePanel } from "@/components/satellite/SatellitePanel";
import { useAnalysis } from "@/context/AnalysisContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChatDrawer, ChatDrawerTrigger } from "@/components/chat/ChatDrawer";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { MetricsCards } from "@/components/results/MetricsCards";
import { ImageComparisonSlider } from "@/components/comparison/ImageComparisonSlider";
import { useGeeAnalysis } from "@/hooks/useGeeAnalysis";
import { useKeyboardShortcuts, useKeyboardEvent, KEYBOARD_EVENTS } from "@/hooks/useKeyboardShortcuts";
import { getSatelliteImagePreviewUrl, SatelliteSource } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Carregar mapa dinamicamente (SSR disabled para Leaflet)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-background">
      <p className="text-muted-foreground">Carregando mapa...</p>
    </div>
  ),
});

type MainTab = "satellite" | "upload";
type ViewMode = "map" | "comparison";

export default function Home() {
  const {
    changes,
    selectedBounds,
    isSelectingBounds,
    setSelectedBounds,
    setIsSelectingBounds,
    analysisId: satelliteAnalysisId,
    status: satelliteStatus,
    selectedChangeType,
    // Multi-source comparison
    imagesBySource,
    activeComparisonSource,
    loadSourceImages,
    setActiveComparisonSource,
    lastAnalysisDates,
  } = useAnalysis();

  const [activeTab, setActiveTab] = useState<MainTab>("satellite");
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // GEE Analysis hook for advanced analysis
  const geeAnalysis = useGeeAnalysis({
    onComplete: () => {
      setIsChatOpen(true); // Open chat when analysis completes
    },
  });

  // Determine which analysis ID to use for chat
  const chatAnalysisId = geeAnalysis.analysisId || (satelliteAnalysisId ? parseInt(satelliteAnalysisId) : null);
  const hasCompletedAnalysis = geeAnalysis.status === "completed" || satelliteStatus === "completed";

  // Get before/after images for comparison based on active source
  const context = useAnalysis();
  const activeSourceData = imagesBySource[activeComparisonSource];
  const comparisonBefore = activeSourceData?.before;
  const comparisonAfter = activeSourceData?.after;

  const beforeImageUrl = comparisonBefore?.id
    ? getSatelliteImagePreviewUrl(comparisonBefore.id)
    : null;
  const afterImageUrl = comparisonAfter?.id
    ? getSatelliteImagePreviewUrl(comparisonAfter.id)
    : null;

  // Check if any source has images loaded
  const hasAnySourceLoaded = Object.values(imagesBySource).some(s => s.status === "loaded");
  const canShowComparison = hasAnySourceLoaded;

  // Handler for source tab click
  const handleSourceClick = async (source: SatelliteSource) => {
    setActiveComparisonSource(source);

    // If not loaded yet or had error, load/retry it
    const status = imagesBySource[source].status;
    if ((status === "idle" || status === "error") && lastAnalysisDates) {
      try {
        await loadSourceImages(source);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Erro ao carregar ${source}`);
      }
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Handle keyboard events
  useKeyboardEvent(
    KEYBOARD_EVENTS.CLOSE_OVERLAY,
    useCallback(() => {
      setIsChatOpen(false);
      setIsSelectingBounds(false);
    }, [setIsSelectingBounds])
  );

  useKeyboardEvent(
    KEYBOARD_EVENTS.TOGGLE_CHAT,
    useCallback(() => {
      if (chatAnalysisId) {
        setIsChatOpen((prev) => !prev);
      }
    }, [chatAnalysisId])
  );

  useKeyboardEvent(
    KEYBOARD_EVENTS.TOGGLE_VIEW_MODE,
    useCallback(() => {
      if (canShowComparison) {
        setViewMode((prev) => (prev === "map" ? "comparison" : "map"));
      }
    }, [canShowComparison])
  );

  return (
    <main className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Satellite className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">
                Detector de Mudanças
              </h1>
              <p className="text-xs text-muted-foreground">
                Análise de Imagens de Satélite
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              TAV Hack 2025
            </Badge>
            <ChatDrawerTrigger
              onClick={() => setIsChatOpen(true)}
              hasNewAnalysis={hasCompletedAnalysis}
              disabled={!chatAnalysisId}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-96 border-r flex flex-col bg-card overflow-hidden">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)} className="flex flex-col h-full min-h-0">
            <TabsList className="grid w-full grid-cols-2 m-2 mb-0">
              <TabsTrigger value="satellite" className="text-xs">
                <Satellite className="h-3 w-3 mr-1" />
                Satélite
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs">
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </TabsTrigger>
            </TabsList>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <TabsContent value="satellite" className="mt-0 space-y-4">
                <SatellitePanel onNewAnalysis={() => setViewMode("map")} />
                {/* AnalysisPanel renderizado dentro do SatellitePanel quando necessário */}
              </TabsContent>
              <TabsContent value="upload" className="mt-0 space-y-4">
                <ImageUpload />
                <AnalysisPanel />
              </TabsContent>
            </div>
          </Tabs>
        </aside>

        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar - View Mode Toggle only */}
          {canShowComparison && (
            <div className="bg-card border-b p-2 flex items-center justify-end">
              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === "map" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                >
                  <Map className="h-4 w-4 mr-1" />
                  Mapa
                </Button>
                <Button
                  variant={viewMode === "comparison" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("comparison")}
                >
                  <SplitSquareVertical className="h-4 w-4 mr-1" />
                  Comparação
                </Button>
              </div>
            </div>
          )}

          {/* Map or Comparison View */}
          <div className="flex-1 relative">
            {viewMode === "map" ? (
              <>
                <MapView
                  changes={changes}
                  isSelectingBounds={isSelectingBounds}
                  selectedBounds={selectedBounds}
                  onBoundsSelected={(bounds) => {
                    setSelectedBounds(bounds);
                    setIsSelectingBounds(false);
                  }}
                  isLoading={satelliteStatus === "downloading" || satelliteStatus === "analyzing"}
                  selectedChangeType={selectedChangeType}
                />
                {/* Selection Instruction */}
                {isSelectingBounds && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-[1000]">
                    Clique e arraste para selecionar a área de análise
                  </div>
                )}
              </>
            ) : canShowComparison ? (
              <div className="relative w-full h-full flex flex-col">
                {/* Source Selection Tabs - Only in comparison view */}
                <div className="bg-card/80 backdrop-blur-sm border-b p-2 flex items-center justify-center gap-1 z-10">
                  <Button
                    variant={activeComparisonSource === "earth_engine" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSourceClick("earth_engine")}
                    disabled={imagesBySource.earth_engine.status === "loading"}
                    className={`text-xs ${activeComparisonSource === "earth_engine" ? "bg-green-600 hover:bg-green-700" : ""}`}
                  >
                    {imagesBySource.earth_engine.status === "loading" ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Satellite className="h-3 w-3 mr-1" />
                    )}
                    Earth Engine
                    {imagesBySource.earth_engine.status === "loaded" && " ✓"}
                  </Button>
                  <Button
                    variant={activeComparisonSource === "sentinel" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSourceClick("sentinel")}
                    disabled={imagesBySource.sentinel.status === "loading" || !lastAnalysisDates}
                    className={`text-xs ${activeComparisonSource === "sentinel" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  >
                    {imagesBySource.sentinel.status === "loading" ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : null}
                    Sentinel Hub
                    {imagesBySource.sentinel.status === "loaded" && " ✓"}
                    {imagesBySource.sentinel.status === "error" && " ✗"}
                  </Button>
                  <Button
                    variant={activeComparisonSource === "planet" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSourceClick("planet")}
                    disabled={imagesBySource.planet.status === "loading" || !lastAnalysisDates}
                    className={`text-xs ${activeComparisonSource === "planet" ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                  >
                    {imagesBySource.planet.status === "loading" ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : null}
                    Planet
                    {imagesBySource.planet.status === "loaded" && " ✓"}
                    {imagesBySource.planet.status === "error" && " ✗"}
                  </Button>
                </div>

                {/* Comparison Content */}
                <div className="flex-1 relative">
                  {activeSourceData.status === "loading" ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Carregando imagens de {activeComparisonSource}...</p>
                      </div>
                    </div>
                  ) : activeSourceData.status === "error" ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <p className="text-red-400">{activeSourceData.error || "Erro ao carregar imagens"}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSourceClick(activeComparisonSource)}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    </div>
                  ) : beforeImageUrl && afterImageUrl ? (
                    <ImageComparisonSlider
                      beforeImage={beforeImageUrl}
                      afterImage={afterImageUrl}
                      beforeLabel={
                        comparisonBefore?.date
                          ? new Date(comparisonBefore.date + "T00:00:00").toLocaleDateString("pt-BR")
                          : "Antes"
                      }
                      afterLabel={
                        comparisonAfter?.date
                          ? new Date(comparisonAfter.date + "T00:00:00").toLocaleDateString("pt-BR")
                          : "Depois"
                      }
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Selecione uma fonte para ver a comparação</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Faça o download das imagens para ver a comparação</p>
              </div>
            )}
          </div>

          {/* Bottom Panel (Charts & Metrics) */}
          {geeAnalysis.result && (
            <div className="border-t bg-card">
              <button
                onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
                className="w-full p-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isBottomPanelOpen ? (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Esconder Detalhes
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ver Detalhes da Análise
                  </>
                )}
              </button>

              {isBottomPanelOpen && (
                <div className="p-4 border-t grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                  {geeAnalysis.result.timeSeries && geeAnalysis.result.timeSeries.length > 0 && (
                    <TimeSeriesChart data={geeAnalysis.result.timeSeries} height={250} />
                  )}
                  {geeAnalysis.result.deltas && (
                    <MetricsCards
                      deltas={geeAnalysis.result.deltas}
                      classification={geeAnalysis.result.classification}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        analysisId={chatAnalysisId}
        hasNewAnalysis={hasCompletedAnalysis}
      />
    </main>
  );
}
