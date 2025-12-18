"use client";

import dynamic from "next/dynamic";
import { Map, SplitSquareVertical, Satellite, Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageComparisonSlider } from "@/components/comparison/ImageComparisonSlider";
import { Bounds, SatelliteSource, getSatelliteImagePreviewUrl, GeoJSONFeatureCollection } from "@/lib/api";
import {
  Container,
  TopBar,
  ViewModeButtons,
  MapWrapper,
  SelectionOverlay,
  ComparisonWrapper,
  SourceTabsBar,
  SourceButton,
  ComparisonContent,
  CenteredContainer,
  LoadingWrapper,
  LoadingText,
  ErrorWrapper,
  ErrorText,
  PlaceholderText,
  MapLoadingWrapper,
  MapLoadingText,
} from "./styles";

// Dynamic import for MapView (SSR disabled for Leaflet)
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <MapLoadingWrapper>
      <MapLoadingText>Carregando mapa...</MapLoadingText>
    </MapLoadingWrapper>
  ),
});

type ViewMode = "map" | "comparison";

interface UploadedImage {
  id: string;
  filename: string;
  type: "before" | "after";
  date?: string;
  requestedDate?: string;
  satellite?: boolean;
  source?: SatelliteSource;
}

interface SourceImageData {
  before?: UploadedImage;
  after?: UploadedImage;
  status: "idle" | "loading" | "loaded" | "error";
  error?: string;
}

type ImagesBySource = Record<SatelliteSource, SourceImageData>;

interface MainAreaProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  canShowComparison: boolean;
  // Map props
  changes: GeoJSONFeatureCollection | null;
  isSelectingBounds: boolean;
  selectedBounds: Bounds | null;
  onBoundsSelected: (bounds: Bounds) => void;
  isLoading: boolean;
  selectedChangeType: string | null;
  // Comparison props
  imagesBySource: ImagesBySource;
  activeComparisonSource: SatelliteSource;
  onSourceClick: (source: SatelliteSource) => void;
  lastAnalysisDates: { before: string; after: string } | null;
}

export function MainArea({
  viewMode,
  onViewModeChange,
  canShowComparison,
  changes,
  isSelectingBounds,
  selectedBounds,
  onBoundsSelected,
  isLoading,
  selectedChangeType,
  imagesBySource,
  activeComparisonSource,
  onSourceClick,
  lastAnalysisDates,
}: MainAreaProps) {
  const activeSourceData = imagesBySource[activeComparisonSource];
  const comparisonBefore = activeSourceData?.before;
  const comparisonAfter = activeSourceData?.after;

  const beforeImageUrl = comparisonBefore?.id
    ? getSatelliteImagePreviewUrl(comparisonBefore.id)
    : null;
  const afterImageUrl = comparisonAfter?.id
    ? getSatelliteImagePreviewUrl(comparisonAfter.id)
    : null;

  return (
    <Container>
      {/* Top Bar - View Mode Toggle */}
      {canShowComparison && (
        <TopBar>
          <ViewModeButtons>
            <Button
              variant={viewMode === "map" ? "default" : "outline"}
              size="sm"
              onClick={() => onViewModeChange("map")}
            >
              <Map className="h-4 w-4 mr-1" />
              Mapa
            </Button>
            <Button
              variant={viewMode === "comparison" ? "default" : "outline"}
              size="sm"
              onClick={() => onViewModeChange("comparison")}
            >
              <SplitSquareVertical className="h-4 w-4 mr-1" />
              Comparação
            </Button>
          </ViewModeButtons>
        </TopBar>
      )}

      {/* Map or Comparison View */}
      <MapWrapper>
        {viewMode === "map" ? (
          <>
            <MapView
              changes={changes}
              isSelectingBounds={isSelectingBounds}
              selectedBounds={selectedBounds}
              onBoundsSelected={onBoundsSelected}
              isLoading={isLoading}
              selectedChangeType={selectedChangeType}
            />
            {isSelectingBounds && (
              <SelectionOverlay>
                Clique e arraste para selecionar a área de análise
              </SelectionOverlay>
            )}
          </>
        ) : canShowComparison ? (
          <ComparisonWrapper>
            {/* Source Selection Tabs */}
            <SourceTabsBar>
              <SourceButton
                variant={activeComparisonSource === "earth_engine" ? "default" : "outline"}
                size="sm"
                onClick={() => onSourceClick("earth_engine")}
                disabled={imagesBySource.earth_engine.status === "loading"}
                $active={activeComparisonSource === "earth_engine"}
                $color="green"
              >
                {imagesBySource.earth_engine.status === "loading" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Satellite className="h-3 w-3 mr-1" />
                )}
                Earth Engine
                {imagesBySource.earth_engine.status === "loaded" && " ✓"}
              </SourceButton>
              <SourceButton
                variant={activeComparisonSource === "sentinel" ? "default" : "outline"}
                size="sm"
                onClick={() => onSourceClick("sentinel")}
                disabled={imagesBySource.sentinel.status === "loading" || !lastAnalysisDates}
                $active={activeComparisonSource === "sentinel"}
                $color="blue"
                title="Sentinel-2 via Sentinel Hub API"
              >
                {imagesBySource.sentinel.status === "loading" ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Radio className="h-3 w-3 mr-1" />
                )}
                Sentinel Hub
                {imagesBySource.sentinel.status === "loaded" && " ✓"}
                {imagesBySource.sentinel.status === "error" && " ✗"}
              </SourceButton>
            </SourceTabsBar>

            {/* Comparison Content */}
            <ComparisonContent>
              {activeSourceData.status === "loading" ? (
                <CenteredContainer>
                  <LoadingWrapper>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <LoadingText>Carregando imagens de {activeComparisonSource}...</LoadingText>
                  </LoadingWrapper>
                </CenteredContainer>
              ) : activeSourceData.status === "error" ? (
                <CenteredContainer>
                  <ErrorWrapper>
                    <ErrorText>{activeSourceData.error || "Erro ao carregar imagens"}</ErrorText>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSourceClick(activeComparisonSource)}
                    >
                      Tentar novamente
                    </Button>
                  </ErrorWrapper>
                </CenteredContainer>
              ) : beforeImageUrl && afterImageUrl ? (
                <>
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
                </>
              ) : (
                <CenteredContainer>
                  <PlaceholderText>Selecione uma fonte para ver a comparação</PlaceholderText>
                </CenteredContainer>
              )}
            </ComparisonContent>
          </ComparisonWrapper>
        ) : (
          <CenteredContainer>
            <PlaceholderText>Faça o download das imagens para ver a comparação</PlaceholderText>
          </CenteredContainer>
        )}
      </MapWrapper>
    </Container>
  );
}
