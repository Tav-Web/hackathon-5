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
import { getSatelliteImagePreviewUrl } from "@/lib/api";

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

  // Get before/after images for comparison (from satellite download context)
  const context = useAnalysis();
  const beforeImageUrl = context.images.find(img => img.type === "before")?.id
    ? getSatelliteImagePreviewUrl(context.images.find(img => img.type === "before")!.id)
    : null;
  const afterImageUrl = context.images.find(img => img.type === "after")?.id
    ? getSatelliteImagePreviewUrl(context.images.find(img => img.type === "after")!.id)
    : null;

  const canShowComparison = beforeImageUrl && afterImageUrl;

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
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 border-r flex flex-col bg-card">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)} className="flex flex-col h-full">
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
            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="satellite" className="mt-0 space-y-4">
                <SatellitePanel />
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
          {/* View Mode Toggle */}
          {canShowComparison && (
            <div className="bg-card border-b p-2 flex items-center justify-center gap-2">
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
                />
                {/* Selection Instruction */}
                {isSelectingBounds && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg z-10">
                    Clique e arraste para selecionar a área de análise
                  </div>
                )}
              </>
            ) : canShowComparison && beforeImageUrl && afterImageUrl ? (
              <ImageComparisonSlider
                beforeImage={beforeImageUrl}
                afterImage={afterImageUrl}
                beforeLabel="Antes"
                afterLabel="Depois"
                className="w-full h-full"
              />
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
