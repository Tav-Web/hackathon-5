"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import { useGeeAnalysis } from "@/hooks/useGeeAnalysis";
import { useKeyboardShortcuts, useKeyboardEvent, KEYBOARD_EVENTS } from "@/hooks/useKeyboardShortcuts";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { SatelliteSource } from "@/lib/api";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MainArea } from "./components/MainArea";
import { BottomPanel } from "./components/BottomPanel";
import { MainContainer, ContentWrapper } from "./styles";

type MainTab = "satellite" | "upload";
type ViewMode = "map" | "comparison";

export function HomeView() {
  const {
    changes,
    selectedBounds,
    isSelectingBounds,
    setSelectedBounds,
    setIsSelectingBounds,
    analysisId: satelliteAnalysisId,
    status: satelliteStatus,
    selectedChangeType,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // GEE Analysis hook for advanced analysis
  const geeAnalysis = useGeeAnalysis({
    onComplete: () => {
      setIsChatOpen(true);
    },
  });

  // Determine which analysis ID to use for chat
  const chatAnalysisId = geeAnalysis.analysisId || (satelliteAnalysisId ? parseInt(satelliteAnalysisId) : null);
  const hasCompletedAnalysis = geeAnalysis.status === "completed" || satelliteStatus === "completed";

  // Check if any source has images loaded
  const hasAnySourceLoaded = Object.values(imagesBySource).some(s => s.status === "loaded");
  const canShowComparison = hasAnySourceLoaded;

  // Handler for source tab click
  const handleSourceClick = async (source: SatelliteSource) => {
    setActiveComparisonSource(source);

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

  useKeyboardEvent(
    KEYBOARD_EVENTS.CLOSE_OVERLAY,
    useCallback(() => {
      setIsChatOpen(false);
      setIsSidebarOpen(false);
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

  const handleBoundsSelected = useCallback((bounds: typeof selectedBounds) => {
    if (bounds) {
      setSelectedBounds(bounds);
      setIsSelectingBounds(false);
    }
  }, [setSelectedBounds, setIsSelectingBounds]);

  return (
    <MainContainer>
      <Header
        onOpenChat={() => setIsChatOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        hasCompletedAnalysis={hasCompletedAnalysis}
        chatDisabled={!chatAnalysisId}
      />

      <ContentWrapper>
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNewAnalysis={() => setViewMode("map")}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <MainArea
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          canShowComparison={canShowComparison}
          changes={changes}
          isSelectingBounds={isSelectingBounds}
          selectedBounds={selectedBounds}
          onBoundsSelected={handleBoundsSelected}
          isLoading={satelliteStatus === "downloading" || satelliteStatus === "analyzing"}
          selectedChangeType={selectedChangeType}
          imagesBySource={imagesBySource}
          activeComparisonSource={activeComparisonSource}
          onSourceClick={handleSourceClick}
          lastAnalysisDates={lastAnalysisDates}
        />
      </ContentWrapper>

      <BottomPanel
        result={geeAnalysis.result}
        isOpen={isBottomPanelOpen}
        onToggle={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        analysisId={chatAnalysisId}
        hasNewAnalysis={hasCompletedAnalysis}
      />
    </MainContainer>
  );
}

export default HomeView;
