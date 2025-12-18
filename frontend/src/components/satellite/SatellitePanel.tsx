"use client";

import { useState } from "react";
import {
  Satellite,
  Search,
  Loader2,
  MapPin,
  Calendar,
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

// Styled components
import {
  PanelContainer,
  ScrollableContent,
  Section,
  SectionHeader,
  StepNumber,
  SectionLabel,
  SourceButtonGroup,
  SourceButton,
  SourceDescription,
  AreaButtonGroup,
  AreaButton,
  ClearAreaButton,
  AreaSelectedText,
  AreaInfoBox,
  AreaInfoRow,
  AreaInfoLabel,
  AreaInfoValue,
  ResolutionValue,
  AlertBox,
  AlertTitle,
  AlertDescription,
  CoordinatesText,
  DateInputsGrid,
  DateInputWrapper,
  DateInputLabel,
  DateInputContainer,
  DateInputIcon,
  DateInput,
  SummaryCard,
  SummaryGrid,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  SummaryUnit,
  ChangeTypesContainer,
  ChangeTypesHeader,
  ChangeTypesLabel,
  ClearFilterButton,
  ChangeTypesList,
  ChangeTypeButton,
  ChangeTypeName,
  ChangeTypeCount,
  ChangeTypesHint,
  WarningBox,
  WarningContent,
  WarningTitle,
  WarningDescription,
  PreviewButton,
  NewAnalysisButton,
  StickyFooter,
  FooterHeader,
  DatesChangedBadge,
  MainActionButton,
  ProgressContainer,
  ProgressBar,
  ProgressFill,
  ProgressText,
  SourceInfoText,
  // Modal components
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
  ResolutionBanner,
  ResolutionBannerTitle,
  ResolutionBannerDescription,
  ImagesGrid,
  ImageColumn,
  ImageColumnHeader,
  ImageColumnTitle,
  ImageColumnSubtitle,
  ImageColumnMeta,
  ImageMetaLabel,
  ImageMetaValue,
  ImageMetaHighlight,
  ImageContainer,
  PreviewImage,
  ImageOverlay,
  ImageOverlayText,
  GeometryOverlay,
  ModalFooter,
  FooterGrid,
  FooterItem,
  FooterItemLabel,
  FooterItemValue,
  LegendContainer,
  LegendTitle,
  LegendGrid,
  LegendItem,
  LegendColor,
  LegendLabel,
  ChangeTypeInfo,
  ChangeTypeColorDot,
} from "./styles";

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
  return (
    translations[type] ||
    type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
};

// Colors for different change types (must match MapView.tsx)
const changeTypeColors: Record<string, string> = {
  construction: "#ef4444", // vermelho
  demolition: "#f97316", // laranja
  deforestation: "#dc2626", // vermelho escuro
  vegetation_growth: "#22c55e", // verde
  vegetation_loss: "#dc2626", // vermelho escuro
  soil_movement: "#a16207", // marrom
  debris: "#6b7280", // cinza
  urban_expansion: "#8b5cf6", // roxo
  water_change: "#3b82f6", // azul
  unknown: "#3b82f6", // azul
};

const getChangeTypeColor = (type: string): string => {
  return changeTypeColors[type] || "#3b82f6";
};

// Convert GeoJSON polygon coordinates to SVG path
function geoJsonToSvgPath(
  coordinates: number[][][],
  bounds: {
    min_lon: number;
    min_lat: number;
    max_lon: number;
    max_lat: number;
  },
  width: number,
  height: number
): string {
  const lonRange = bounds.max_lon - bounds.min_lon;
  const latRange = bounds.max_lat - bounds.min_lat;

  return coordinates
    .map((ring) => {
      const pathParts = ring.map((coord, i) => {
        const x = ((coord[0] - bounds.min_lon) / lonRange) * width;
        // SVG Y is inverted (0 at top)
        const y = ((bounds.max_lat - coord[1]) / latRange) * height;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      });
      return pathParts.join(" ") + " Z";
    })
    .join(" ");
}

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

  const [dateBefore, setDateBeforeState] = useState("");
  const [dateAfter, setDateAfter] = useState("");

  // Handler that clears dateAfter if dateBefore is set to a date after dateAfter
  const setDateBefore = (newDate: string) => {
    setDateBeforeState(newDate);
    // Clear dateAfter if it's now before or equal to dateBefore
    if (dateAfter && new Date(dateAfter) <= new Date(newDate)) {
      setDateAfter("");
    }
  };
  const [showPreview, setShowPreview] = useState(false);
  const [baseMapLoaded, setBaseMapLoaded] = useState(false);
  const [imageSource, setImageSource] =
    useState<SatelliteSource>("earth_engine");
  const [lastAnalyzedDates, setLastAnalyzedDates] = useState<{
    before: string;
    after: string;
  } | null>(null);

  // Reset baseMapLoaded when modal opens
  const handleOpenPreview = () => {
    setBaseMapLoaded(false);
    setShowPreview(true);
  };

  // Get satellite images for preview
  const beforeImage = images.find(
    (img) => img.type === "before" && img.satellite
  );
  const afterImage = images.find(
    (img) => img.type === "after" && img.satellite
  );

  const isProcessing = status === "downloading" || status === "analyzing";
  const isCompleted = status === "completed";

  // Check if dates changed since last analysis
  const datesChangedSinceAnalysis =
    isCompleted &&
    lastAnalyzedDates &&
    (lastAnalyzedDates.before !== dateBefore ||
      lastAnalyzedDates.after !== dateAfter);

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

    const minDateObj = new Date("2017-01-01");
    if (new Date(dateBefore) < minDateObj) {
      toast.error(
        "A data 'Antes' deve ser a partir de 2017 (dados de satélite disponíveis)"
      );
      return;
    }

    if (new Date(dateAfter) < minDateObj) {
      toast.error(
        "A data 'Depois' deve ser a partir de 2017 (dados de satélite disponíveis)"
      );
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
      toast.error(
        err instanceof Error
          ? err.message
          : "Falha ao processar imagens da fonte selecionada. Tente novamente."
      );
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const minDate = "2017-01-01"; // Sentinel-2 reliable data starts from 2017

  // Calculate minimum date for "after" field (must be after "before" date)
  const minDateAfter = dateBefore
    ? new Date(new Date(dateBefore).getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
    : minDate;

  const getStatusText = () => {
    if (status === "downloading") return "Baixando imagens de satélite...";
    if (status === "analyzing") return "Detectando alterações...";
    if (status === "completed") return "Análise concluída";
    return "Analisar Área";
  };

  // Check step completion status
  const isStep1Complete = !!imageSource;
  const isStep2Complete = !!selectedBounds;
  const isStep3Complete =
    !!dateBefore &&
    !!dateAfter &&
    new Date(dateBefore) >= new Date(minDate) &&
    new Date(dateAfter) >= new Date(minDate) &&
    new Date(dateBefore) < new Date(dateAfter);

  // Calculate area info
  const getAreaInfo = () => {
    if (!selectedBounds) return null;

    const centerLat = (selectedBounds.min_lat + selectedBounds.max_lat) / 2;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const widthKm =
      (selectedBounds.max_lon - selectedBounds.min_lon) * 111 * cosLat;
    const heightKm = (selectedBounds.max_lat - selectedBounds.min_lat) * 111;
    const pxPerKm = 100; // 10m/pixel for Sentinel-2 / Earth Engine
    const widthPx = Math.round(widthKm * pxPerKm);
    const heightPx = Math.round(heightKm * pxPerKm);
    const isVerySmall = widthPx < 50 || heightPx < 50;
    const isSmallArea = widthPx < 200 || heightPx < 200;

    return {
      widthKm,
      heightKm,
      widthPx,
      heightPx,
      isVerySmall,
      isSmallArea,
      pxPerKm,
    };
  };

  const areaInfo = getAreaInfo();

  return (
    <PanelContainer>
      {/* Scrollable content area */}
      <ScrollableContent>
        {/* ① Fonte de Satélite */}
        <Section>
          <SectionHeader>
            <StepNumber>①</StepNumber>
            <SectionLabel>Fonte de Satélite</SectionLabel>
            {isStep1Complete && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </SectionHeader>
          <SourceButtonGroup>
            <SourceButton
              onClick={() => setImageSource("earth_engine")}
              disabled={isProcessing}
              $active={imageSource === "earth_engine"}
              $color="green"
            >
              Earth Engine
            </SourceButton>
            <SourceButton
              onClick={() => setImageSource("sentinel")}
              disabled={isProcessing}
              $active={imageSource === "sentinel"}
              $color="blue"
            >
              Sentinel Hub
            </SourceButton>
          </SourceButtonGroup>
          <SourceDescription>
            {imageSource === "sentinel"
              ? "Sentinel Hub requer credenciais Copernicus"
              : "Earth Engine (10m) - sempre disponível"}
          </SourceDescription>
        </Section>

        {/* ② Área de Análise */}
        <Section>
          <SectionHeader>
            <StepNumber>②</StepNumber>
            <SectionLabel>Área de Análise</SectionLabel>
            {isStep2Complete && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </SectionHeader>
          <AreaButtonGroup>
            {isSelectingBounds ? (
              <AreaButton onClick={() => setIsSelectingBounds(false)}>
                <ArrowLeft className="h-4 w-4" />
                Cancelar Seleção
              </AreaButton>
            ) : (
              <AreaButton
                onClick={() => setIsSelectingBounds(true)}
                disabled={isProcessing}
                $selected={!!selectedBounds}
              >
                <MapPin className="h-4 w-4" />
                {selectedBounds ? "Nova Seleção" : "Selecionar no Mapa"}
              </AreaButton>
            )}
            {selectedBounds && !isSelectingBounds && (
              <ClearAreaButton
                onClick={() => setSelectedBounds(null)}
                disabled={isProcessing}
                title="Limpar seleção"
              >
                <X className="h-4 w-4" />
              </ClearAreaButton>
            )}
          </AreaButtonGroup>
          {selectedBounds && areaInfo && (
            <AreaInfoBox>
              <AreaInfoRow>
                <AreaInfoLabel>Área:</AreaInfoLabel>
                <AreaInfoValue>
                  {areaInfo.widthKm.toFixed(2)}km x{" "}
                  {areaInfo.heightKm.toFixed(2)}km
                </AreaInfoValue>
              </AreaInfoRow>
              <AreaInfoRow>
                <AreaInfoLabel>
                  Resolução{" "}
                  {imageSource === "earth_engine"
                    ? "Earth Engine"
                    : "Sentinel Hub"}
                  :
                </AreaInfoLabel>
                <ResolutionValue
                  $status={
                    areaInfo.isVerySmall
                      ? "error"
                      : areaInfo.isSmallArea
                      ? "warning"
                      : "good"
                  }
                >
                  {areaInfo.widthPx}x{areaInfo.heightPx} pixels
                </ResolutionValue>
              </AreaInfoRow>
              {areaInfo.isVerySmall && (
                <AlertBox $variant="red">
                  <AlertTitle $variant="red">
                    <AlertCircle className="h-3 w-3" />
                    Área muito pequena
                  </AlertTitle>
                  <AlertDescription $variant="red">
                    A área selecionada gerará uma imagem com poucos pixels.
                    Considere ampliar a seleção.
                  </AlertDescription>
                </AlertBox>
              )}
              <CoordinatesText>
                SW: {selectedBounds.min_lat.toFixed(5)},{" "}
                {selectedBounds.min_lon.toFixed(5)} | NE:{" "}
                {selectedBounds.max_lat.toFixed(5)},{" "}
                {selectedBounds.max_lon.toFixed(5)}
              </CoordinatesText>
            </AreaInfoBox>
          )}
        </Section>

        {/* ③ Período */}
        <Section>
          <SectionHeader>
            <StepNumber>③</StepNumber>
            <SectionLabel>Período</SectionLabel>
            {isStep3Complete && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </SectionHeader>
          <DateInputsGrid>
            <DateInputWrapper>
              <DateInputLabel>Data Antes (partir de 2017)</DateInputLabel>
              <DateInputContainer>
                <DateInputIcon>
                  <Calendar className="h-4 w-4" />
                </DateInputIcon>
                <DateInput
                  type="date"
                  value={dateBefore}
                  onChange={(e) => setDateBefore(e.target.value)}
                  min={minDate}
                  max={today}
                  disabled={isProcessing}
                />
              </DateInputContainer>
            </DateInputWrapper>
            <DateInputWrapper>
              <DateInputLabel>
                Data{" "}
                {dateBefore &&
                  `(após ${new Date(
                    dateBefore + "T00:00:00"
                  ).toLocaleDateString("pt-BR")})`}
              </DateInputLabel>
              <DateInputContainer>
                <DateInputIcon>
                  <Calendar className="h-4 w-4" />
                </DateInputIcon>
                <DateInput
                  type="date"
                  value={dateAfter}
                  onChange={(e) => setDateAfter(e.target.value)}
                  min={minDateAfter}
                  max={today}
                  disabled={isProcessing}
                />
              </DateInputContainer>
            </DateInputWrapper>
          </DateInputsGrid>
        </Section>

        {/* ⑤ Resumo da Análise */}
        {summary && status === "completed" && (
          <Section>
            <SectionHeader>
              <StepNumber $variant="success">⑤</StepNumber>
              <SectionLabel>Resumo da Análise</SectionLabel>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </SectionHeader>

            <SummaryCard elevation={0}>
              <SummaryGrid>
                <SummaryItem elevation={0}>
                  <SummaryLabel>Total de Mudanças</SummaryLabel>
                  <SummaryValue>{summary.total_changes}</SummaryValue>
                </SummaryItem>
                <SummaryItem elevation={0}>
                  <SummaryLabel>Área Afetada</SummaryLabel>
                  <SummaryValue>
                    {summary.total_area?.toFixed(0) || 0}
                    <SummaryUnit> m²</SummaryUnit>
                  </SummaryValue>
                </SummaryItem>
              </SummaryGrid>

              {/* Tipos de mudanças detectadas - clicáveis para filtrar */}
              {summary.by_type && Object.keys(summary.by_type).length > 0 && (
                <ChangeTypesContainer>
                  <ChangeTypesHeader>
                    <ChangeTypesLabel>Tipos Detectados:</ChangeTypesLabel>
                    {selectedChangeType && (
                      <ClearFilterButton
                        onClick={() => setSelectedChangeType(null)}
                      >
                        Limpar filtro
                      </ClearFilterButton>
                    )}
                  </ChangeTypesHeader>
                  <ChangeTypesList>
                    {Object.entries(summary.by_type).map(([type, count]) => (
                      <ChangeTypeButton
                        key={type}
                        onClick={() =>
                          setSelectedChangeType(
                            selectedChangeType === type ? null : type
                          )
                        }
                        $selected={selectedChangeType === type}
                      >
                        <ChangeTypeInfo>
                          <ChangeTypeColorDot
                            $color={getChangeTypeColor(type)}
                          />
                          <ChangeTypeName
                            $selected={selectedChangeType === type}
                          >
                            {translateChangeType(type)}
                          </ChangeTypeName>
                        </ChangeTypeInfo>
                        <ChangeTypeCount
                          $selected={selectedChangeType === type}
                        >
                          {count}
                        </ChangeTypeCount>
                      </ChangeTypeButton>
                    ))}
                  </ChangeTypesList>
                  <ChangeTypesHint>
                    Clique em um tipo para filtrar no mapa
                  </ChangeTypesHint>
                </ChangeTypesContainer>
              )}
            </SummaryCard>
          </Section>
        )}

        {/* Aviso se não houver mudanças */}
        {status === "completed" && changes && changes.features.length === 0 && (
          <WarningBox>
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
            <WarningContent>
              <WarningTitle>Nenhuma mudança detectada</WarningTitle>
              <WarningDescription>
                Tente selecionar uma área maior ou um intervalo de datas
                diferente.
              </WarningDescription>
            </WarningContent>
          </WarningBox>
        )}

        {/* Botão de preview das imagens */}
        {beforeImage && afterImage && (
          <PreviewButton onClick={handleOpenPreview}>
            <Eye className="h-4 w-4" />
            Ver Imagens de Satélite
          </PreviewButton>
        )}

        {/* Botão Nova Análise */}
        {status === "completed" && (
          <NewAnalysisButton
            onClick={() => {
              reset();
              setDateBefore("");
              setDateAfter("");
              onNewAnalysis?.();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Nova Análise
          </NewAnalysisButton>
        )}

        <SourceInfoText>
          {imageSource === "earth_engine"
            ? "Imagens Sentinel-2 via Google Earth Engine"
            : "Imagens Sentinel-2 via Copernicus Data Space"}
        </SourceInfoText>
      </ScrollableContent>

      {/* ④ Botão de Ação Principal - Fixo no rodapé */}
      <StickyFooter>
        <FooterHeader>
          <StepNumber>④</StepNumber>
          <SectionLabel>Executar Análise</SectionLabel>
          {canReanalyze && (
            <DatesChangedBadge>Datas alteradas</DatesChangedBadge>
          )}
        </FooterHeader>
        <MainActionButton
          onClick={handleAnalyze}
          disabled={
            isProcessing ||
            !selectedBounds ||
            !dateBefore ||
            !dateAfter ||
            (isCompleted && !canReanalyze)
          }
          $variant={
            isCompleted && !canReanalyze
              ? "completed"
              : canReanalyze
              ? "reanalyze"
              : "default"
          }
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
              Reanalisar com Novas Datas
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Analisar Área Selecionada
            </>
          )}
        </MainActionButton>

        {/* Barra de progresso */}
        {isProcessing && (
          <ProgressContainer>
            <ProgressBar>
              <ProgressFill $progress={progress} />
            </ProgressBar>
            <ProgressText>{progress}%</ProgressText>
          </ProgressContainer>
        )}
      </StickyFooter>

      {/* Modal de Preview das Imagens */}
      {showPreview &&
        beforeImage &&
        afterImage &&
        selectedBounds &&
        (() => {
          const centerLat =
            (selectedBounds.min_lat + selectedBounds.max_lat) / 2;
          const centerLon =
            (selectedBounds.min_lon + selectedBounds.max_lon) / 2;
          const cosLat = Math.cos((centerLat * Math.PI) / 180);
          const widthKm =
            (selectedBounds.max_lon - selectedBounds.min_lon) * 111 * cosLat;
          const heightKm =
            (selectedBounds.max_lat - selectedBounds.min_lat) * 111;
          const pxPerKm = 100; // 10m/pixel for Sentinel-2 / Earth Engine
          const resolution = "10m/pixel";
          const sourceName =
            imageSource === "earth_engine" ? "Earth Engine" : "Sentinel Hub";
          const widthPx = Math.round(widthKm * pxPerKm);
          const heightPx = Math.round(heightKm * pxPerKm);

          const aspectRatio = widthKm / heightKm;
          const maxSize = 800;
          const imgWidth =
            aspectRatio >= 1 ? maxSize : Math.round(maxSize * aspectRatio);
          const imgHeight =
            aspectRatio >= 1 ? Math.round(maxSize / aspectRatio) : maxSize;

          const bboxUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${selectedBounds.min_lon},${selectedBounds.min_lat},${selectedBounds.max_lon},${selectedBounds.max_lat}&bboxSR=4326&imageSR=4326&size=${imgWidth},${imgHeight}&format=png&f=image`;
          const containerHeight = 240;
          const getPixelColor = () =>
            widthPx < 50 ? "red" : widthPx < 200 ? "yellow" : "default";

          return (
            <ModalOverlay onClick={() => setShowPreview(false)}>
              <ModalContainer onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                  <ModalTitle>
                    <Satellite
                      className="size-8 "
                      style={{ color: "#60a5fa" }}
                    />
                    Comparação de Imagens de Satélite
                  </ModalTitle>
                  <ModalCloseButton onClick={() => setShowPreview(false)}>
                    <X className="h-5 w-5" />
                  </ModalCloseButton>
                </ModalHeader>

                <ResolutionBanner $source={imageSource}>
                  <ResolutionBannerTitle $source={imageSource}>
                    <strong>Resolução {sourceName}:</strong> {widthPx}x
                    {heightPx} pixels reais para área de {widthKm.toFixed(2)}km
                    x {heightKm.toFixed(2)}km
                  </ResolutionBannerTitle>
                  <ResolutionBannerDescription $source={imageSource}>
                    {sourceName} tem resolução de {resolution}. Para áreas
                    pequenas, a imagem terá poucos pixels.
                  </ResolutionBannerDescription>
                </ResolutionBanner>

                <ImagesGrid>
                  <ImageColumn>
                    <ImageColumnHeader>
                      <ImageColumnTitle>ÁREA SELECIONADA</ImageColumnTitle>
                      <ImageColumnSubtitle>
                        {changes && changes.features.length > 0
                          ? `Mapa Base + ${changes.features.length} mudança${
                              changes.features.length > 1 ? "s" : ""
                            }`
                          : "Mapa Base"}
                      </ImageColumnSubtitle>
                    </ImageColumnHeader>
                    <ImageContainer height={"100%"}>
                      <PreviewImage
                        src={bboxUrl}
                        alt="Área Selecionada"
                        onLoad={() => setBaseMapLoaded(true)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3EMapa não disponível%3C/text%3E%3C/svg%3E";
                          setBaseMapLoaded(true); // Still show geometries on error fallback
                        }}
                      />
                      {/* Geometry overlay for changes - only show after base map loads */}
                      {baseMapLoaded &&
                        changes &&
                        changes.features.length > 0 &&
                        selectedBounds && (
                          <GeometryOverlay
                            viewBox={`0 0 100 100`}
                            preserveAspectRatio="none"
                          >
                            {changes.features.map((feature, idx) => {
                              const coords = feature.geometry?.coordinates;
                              if (!coords || !Array.isArray(coords))
                                return null;
                              const changeType =
                                feature.properties?.type || "unknown";
                              const color = getChangeTypeColor(changeType);
                              const path = geoJsonToSvgPath(
                                coords,
                                selectedBounds,
                                100,
                                100
                              );
                              return (
                                <path
                                  key={feature.id || idx}
                                  d={path}
                                  fill={color}
                                  fillOpacity={0.4}
                                  stroke={color}
                                  strokeWidth={0.5}
                                />
                              );
                            })}
                          </GeometryOverlay>
                        )}
                      <ImageOverlay>
                        <ImageOverlayText>
                          {changes && changes.features.length > 0
                            ? `ESRI + ${changes.features.length} geometrias`
                            : "ESRI World Imagery"}
                        </ImageOverlayText>
                      </ImageOverlay>
                    </ImageContainer>
                  </ImageColumn>

                  <ImageColumn>
                    <ImageColumnMeta>
                      <ImageColumnTitle>ANTES ({sourceName})</ImageColumnTitle>
                      <ImageMetaLabel>
                        Solicitado:{" "}
                        <ImageMetaValue>
                          {formatDate(dateBefore)}
                        </ImageMetaValue>
                      </ImageMetaLabel>
                      <ImageMetaLabel>
                        Capturado:{" "}
                        <ImageMetaHighlight>
                          {formatDate(beforeImage.date)}
                        </ImageMetaHighlight>
                      </ImageMetaLabel>
                    </ImageColumnMeta>
                    <ImageContainer $height={containerHeight}>
                      <PreviewImage
                        src={getSatelliteImagePreviewUrl(beforeImage.id)}
                        alt="Imagem Antes"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <ImageOverlay>
                        <ImageOverlayText>
                          {widthPx}x{heightPx} px
                        </ImageOverlayText>
                      </ImageOverlay>
                    </ImageContainer>
                  </ImageColumn>

                  <ImageColumn>
                    <ImageColumnMeta>
                      <ImageColumnTitle>DEPOIS ({sourceName})</ImageColumnTitle>
                      <ImageMetaLabel>
                        Solicitado:{" "}
                        <ImageMetaValue>{formatDate(dateAfter)}</ImageMetaValue>
                      </ImageMetaLabel>
                      <ImageMetaLabel>
                        Capturado:{" "}
                        <ImageMetaHighlight>
                          {formatDate(afterImage.date)}
                        </ImageMetaHighlight>
                      </ImageMetaLabel>
                    </ImageColumnMeta>
                    <ImageContainer $height={containerHeight}>
                      <PreviewImage
                        src={getSatelliteImagePreviewUrl(afterImage.id)}
                        alt="Imagem Depois"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Ctext fill='%239CA3AF' font-family='system-ui' font-size='14' x='50%25' y='50%25' text-anchor='middle'%3EImagem não disponível%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <ImageOverlay>
                        <ImageOverlayText>
                          {widthPx}x{heightPx} px
                        </ImageOverlayText>
                      </ImageOverlay>
                    </ImageContainer>
                  </ImageColumn>
                </ImagesGrid>

                <ModalFooter>
                  <FooterGrid>
                    <FooterItem>
                      <FooterItemLabel>Fonte</FooterItemLabel>
                      <FooterItemValue
                        $color={
                          imageSource === "earth_engine" ? "green" : "white"
                        }
                      >
                        {imageSource === "earth_engine"
                          ? "Google"
                          : "Copernicus"}{" "}
                        {sourceName}
                      </FooterItemValue>
                    </FooterItem>
                    <FooterItem>
                      <FooterItemLabel>Resolução Nativa</FooterItemLabel>
                      <FooterItemValue
                        $color={
                          imageSource === "earth_engine" ? "green" : "white"
                        }
                      >
                        {resolution}
                      </FooterItemValue>
                    </FooterItem>
                    <FooterItem>
                      <FooterItemLabel>Pixels Reais</FooterItemLabel>
                      <FooterItemValue $color={getPixelColor()}>
                        {widthPx} x {heightPx}
                      </FooterItemValue>
                    </FooterItem>
                    <FooterItem>
                      <FooterItemLabel>Latitude</FooterItemLabel>
                      <FooterItemValue>{centerLat.toFixed(5)}°</FooterItemValue>
                    </FooterItem>
                    <FooterItem>
                      <FooterItemLabel>Longitude</FooterItemLabel>
                      <FooterItemValue>{centerLon.toFixed(5)}°</FooterItemValue>
                    </FooterItem>
                  </FooterGrid>
                  {/* Legend for change types */}
                  {changes && changes.features.length > 0 && (
                    <LegendContainer>
                      <LegendTitle>Legenda das Mudanças Detectadas</LegendTitle>
                      <LegendGrid>
                        {Object.entries(
                          changes.features.reduce((acc, feature) => {
                            const type = feature.properties?.type || "unknown";
                            acc[type] = (acc[type] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                          <LegendItem key={type}>
                            <LegendColor $color={getChangeTypeColor(type)} />
                            <LegendLabel>
                              {translateChangeType(type)} ({count})
                            </LegendLabel>
                          </LegendItem>
                        ))}
                      </LegendGrid>
                    </LegendContainer>
                  )}
                </ModalFooter>
              </ModalContainer>
            </ModalOverlay>
          );
        })()}
    </PanelContainer>
  );
}
